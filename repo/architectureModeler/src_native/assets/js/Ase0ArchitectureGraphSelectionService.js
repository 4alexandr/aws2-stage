// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0ArchitectureGraphSelectionService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import cmm from 'soa/kernel/clientMetaModel';
import dms from 'soa/dataManagementService';
import portService from 'js/Ase0ArchitecturePortService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphLegendSvc from 'js/graphLegendService';

import cdm from 'soa/kernel/clientDataModel';

var exports = {};

var _timeoutPromise;
var _hoveredItem;

/**
 * Binding class name for node
 */
export let NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';

/**
 * Binding class name for text inside the tile
 */
export let TEXT_HOVERED_CLASS = 'relation_TEXT_hovered_style_svg';

/**
 * Function to set hover styling of elements in diagram
 *
 * @param {*} hoveredItem item hovered
 * @param {*} unHoveredItem unhovered item
 */
export let setDiagramHover = function (hoveredItem, unHoveredItem) {
    if (_timeoutPromise) {
        AwTimeoutService.instance.cancel(_timeoutPromise);
        _timeoutPromise = null;
    }
    var selectedEdges = [];
    var selectedPorts = [];
    var nodesToCheck = [];
    var graph = appCtxSvc.getCtx('graph');
    var graphModel = graph.graphModel;
    var activeCtx = appCtxSvc.getCtx('activeArchDgmCtx');
    var currentCtx = appCtxSvc.getCtx(activeCtx);
    if (currentCtx && currentCtx.diagram.selection) {
        selectedEdges = currentCtx.diagram.selection.edgeModels;
        selectedPorts = currentCtx.diagram.selection.portModels;
    }
    if (unHoveredItem) {
        if (unHoveredItem.getItemType() === 'Edge') {
            if (!selectedEdges || selectedEdges.indexOf(unHoveredItem.modelObject) < 0) {
                resetEdgeStyle(unHoveredItem, graph);
                var srcNode = unHoveredItem.getSourceNode();
                var tarNode = unHoveredItem.getTargetNode();
                nodesToCheck.push(srcNode);
                nodesToCheck.push(tarNode);
            }
        } else if (unHoveredItem.getItemType() === 'Node') {
            nodesToCheck.push(unHoveredItem);
        } else if (unHoveredItem.getItemType() === 'Port') {
            if (!selectedPorts || selectedPorts.indexOf(unHoveredItem.modelObject) < 0) {
                resetPortStyle(unHoveredItem, graph);
            }
        }
        _.forEach(nodesToCheck, function (node) {
            var nodeEdgeSelected = false;
            if (selectedEdges && selectedEdges.length > 0) {
                _.forEach(graphModel.graphControl.getSelected('Edge'), function (edge) {
                    srcNode = edge.getSourceNode();
                    tarNode = edge.getTargetNode();
                    if (node && node.modelObject && node.modelObject.uid) {
                        if (srcNode && srcNode.modelObject && srcNode.modelObject.uid === node.modelObject.uid ||
                            tarNode && tarNode.modelObject && tarNode.modelObject.uid === node.modelObject.uid) {
                            nodeEdgeSelected = true;
                            return false;
                        }
                    }
                });
            }
            if (!nodeEdgeSelected) {
                setNodeHoverProperty(node, null);
            }
        });
    }
    if (hoveredItem) {
        setHoverStyle(hoveredItem);
    }
};

var checkIfConnectionSelection = function (graphControl) {
    var selectedEdges = graphControl.getSelected('Edge');
    var connectionSelected = false;
    if (selectedEdges && selectedEdges.length > 0) {
        _.forEach(selectedEdges, function (element) {
            if (cmm.isInstanceOf('Awb0Connection', element.modelObject.modelType)) {
                connectionSelected = true;
            }
        });
    }
    return connectionSelected;
};

export let setDiagramSelection = function (selected, unselected, syncPwa, publishSelectionEvent) {
    var selectedNodes = [];
    var selectedPorts = [];
    var selectedEdges = [];
    var selectedAnnotations = [];
    var isSublocationSelectionChange = false;
    var pwaSelections = [];

    if (appCtxSvc.ctx.occmgmtContext.pwaSelectionModel) {
        var selectionUids = appCtxSvc.ctx.occmgmtContext.pwaSelectionModel.getSelection();
        if (selectionUids.length > 0) {
            _.forEach(selectionUids, function (uid) {
                var objectSelected = cdm.getObject(uid);
                if (objectSelected) {
                    pwaSelections.push(objectSelected);
                }
            });
        }
    }

    var graph = appCtxSvc.getCtx('graph');
    var activeCtx = appCtxSvc.getCtx('activeArchDgmCtx');
    var currentCtx = appCtxSvc.getCtx(activeCtx);

    var graphControl = graph.graphModel.graphControl;

    _.forEach(graphControl.getSelected('Node'), function (selectedNode) {
        selectedNodes.push(selectedNode.modelObject);
    });

    _.forEach(graphControl.getSelected('Port'), function (selectedPort) {
        selectedPorts.push(selectedPort.modelObject);
    });

    _.forEach(graphControl.getSelected('Edge'), function (selectedEdge) {
        selectedEdges.push(selectedEdge.modelObject);
    });

    _.forEach(graphControl.getSelected('Boundary'), function (selectedBoundary) {
        selectedAnnotations.push(selectedBoundary);
    });

    var multiselectMode = checkIfMultiselectMode(graphControl);
    isSublocationSelectionChange = checkIfTracelinkSelected(graphControl);

    var aceShowConnectionMode = false;
    var aceShowPortMode = false;
    if (appCtxSvc.ctx.aceActiveContext.context.persistentRequestPref) {
        aceShowConnectionMode = appCtxSvc.ctx.aceActiveContext.context.persistentRequestPref.includeConnections;
        aceShowPortMode = appCtxSvc.ctx.aceActiveContext.context.persistentRequestPref.includeInterfaces;
    }
    if (!aceShowPortMode && !isSublocationSelectionChange) {
        isSublocationSelectionChange = checkIfPortSelected(graphControl);
    }

    if (!aceShowConnectionMode && !isSublocationSelectionChange) {
        isSublocationSelectionChange = checkIfConnectionSelection(graphControl);
    }

    var elementToFocus = [];
    var elementToDeselect = [];
    var topElement = appCtxSvc.ctx.occmgmtContext.topElement;
    var currentView = _.get(appCtxSvc, 'ctx.ViewModeContext.ViewModeContext', undefined);

    if (unselected && unselected.length > 0) {
        _.forEach(unselected, function (element) {
            var modelObject = element.modelObject;
            if (element.getItemType() === 'Port') {
                resetPortStyle(element, graph);
            } else if (element.getItemType() === 'Edge') {
                resetEdgeStyle(element, graph);
                var srcNode = element.getSourceNode();
                var tarNode = element.getTargetNode();
                if (srcNode && tarNode) {
                    setNodeHoverProperty(srcNode, null);
                    setNodeHoverProperty(tarNode, null);
                }
            } else if (element.getItemType() === 'Boundary' && element.style.styleClass.indexOf('aw-widgets-cellListItemNodeSelected') >= 0) {
                var style = _.clone(element.style, true);
                style.styleClass = style.styleClass.replace(' aw-widgets-cellListItemNodeSelected', '');
                graphControl.graph.setBoundaryStyle(element, style);
            }
            if (modelObject && cmm.isInstanceOf('Awb0Element', modelObject.modelType)) {
                if ((!aceShowConnectionMode && cmm.isInstanceOf('Awb0Connection', modelObject.modelType)) || (!aceShowPortMode && cmm.isInstanceOf('Awb0Interface', modelObject.modelType))) {
                    isSublocationSelectionChange = true;
                } else {
                    if (_.includes(pwaSelections, modelObject)) {
                        elementToDeselect.push(modelObject);
                    }
                }
            } else if (modelObject && (!selected || selected.length === 0)) {
                isSublocationSelectionChange = true;
            }
        });
    }

    if (selected && selected.length > 0) {
        _.forEach(selected, function (element) {
            var modelObject;
            modelObject = element.modelObject;
            if (element.getItemType() === 'Port') {
                setHoverPortStyle(element, graph);
            } else if (element.getItemType() === 'Edge') {
                setHoverEdgeStyle(element, graph);
            } else if (element.getItemType() === 'Boundary' && element.style.styleClass.indexOf('aw-widgets-cellListItemNodeSelected') < 0) {
                var style = _.clone(element.style, true);
                style.styleClass += ' aw-widgets-cellListItemNodeSelected';
                graphControl.graph.setBoundaryStyle(element, style);
            }

            if (modelObject && cmm.isInstanceOf('Awb0Element', modelObject.modelType) && !_.includes(pwaSelections, modelObject)) {
                if ((aceShowConnectionMode || !cmm.isInstanceOf('Awb0Connection', modelObject.modelType)) && (aceShowPortMode || !cmm.isInstanceOf('Awb0Interface', modelObject.modelType))) {
                    elementToFocus.push(modelObject);
                }
            }
        });
    } else {
        if (isSublocationSelectionChange) {
            firePrimarySelectionChangeEvent([topElement], isSublocationSelectionChange);
        }
        if (elementToDeselect.length > 0 && pwaSelections.length > 0) {
            _.forEach(pwaSelections, function (element) {
                if (!_.includes(elementToDeselect, element)) {
                    elementToFocus.push(element);
                }
            });
        }
    }

    if (multiselectMode && !isSublocationSelectionChange) {
        addElemntToArray(selectedNodes, elementToFocus);
        _.forEach(selectedEdges, function (element) {
            if (aceShowConnectionMode && cmm.isInstanceOf('Awb0ConditionalElement', element.modelType) && elementToFocus.indexOf(element) < 0) {
                elementToFocus.push(element);
            }
        });
    }

    var graphSelections = [];
    var isPortModifiable = false;

    graphSelections = graphSelections.concat(selectedNodes, selectedPorts, selectedEdges);
    var uids = _.map(graphSelections, 'uid');

    // if the publishSelectionEvent parameter was not specified, assume it is true
    if (publishSelectionEvent === undefined || publishSelectionEvent === null) {
        publishSelectionEvent = true;
    }

    // Ensure Properties Loaded
    var propsToLoad = ['awb0Parent', 'ase0InterfaceName', 'is_modifiable'];
    if (uids && uids.length > 0) {
        if (uids.length === 1 && selectedEdges.length === 1 && selectedEdges[0].modelType.typeHierarchyArray.indexOf('FND_TraceLink') > -1 && (publishSelectionEvent ||
            isSublocationSelectionChange)) {
            fireAceDeselectEvent(elementToDeselect, syncPwa);
            firePrimarySelectionChangeEvent(graphSelections, isSublocationSelectionChange);
        } else {
            dms.getProperties(uids, propsToLoad).then(function () {
                if (syncPwa) {
                    fireAceSelectEvent(elementToFocus);
                    fireAceDeselectEvent(elementToDeselect, true);
                }
                if (graphSelections && graphSelections.length > 0) {
                    _.forEach(graphSelections, function (selectedGraphElement) {
                        if (selectedGraphElement.modelType.typeHierarchyArray.indexOf('Awb0Interface') > -1 && selectedGraphElement.props.is_modifiable && selectedGraphElement.props.is_modifiable.dbValues && selectedGraphElement.props.is_modifiable.dbValues.length > 0 &&
                            selectedGraphElement.props.is_modifiable.dbValues[0] === '1') {
                            isPortModifiable = true;
                            return false;
                        }
                    });
                    if (currentCtx) {
                        _.set(currentCtx, 'isPortModifiable', isPortModifiable);
                    } else {
                        var jso = {
                            isPortModifiable: isPortModifiable
                        };
                        appCtxSvc.registerCtx(currentCtx, jso);
                    }
                }
                if (publishSelectionEvent || isSublocationSelectionChange) {
                    firePrimarySelectionChangeEvent(graphSelections, isSublocationSelectionChange);
                }
            });
        }
    } else {
        fireAceDeselectEvent(elementToDeselect, syncPwa);
    }

    var selectionObjects = {
        nodeModels: selectedNodes,
        edgeModels: selectedEdges,
        portModels: selectedPorts,
        annotations: selectedAnnotations
    };

    if (currentCtx) {
        _.set(currentCtx, 'diagram.selection', selectionObjects);
    } else {
        var jso = {
            diagram: {
                selection: selectionObjects
            }
        };
        appCtxSvc.registerCtx(currentCtx, jso);
    }

    // evaluate show port condition
    portService.evaluateShowPortsCondition();

    // Set Selected node Command Visibility
    updateCommandVisibilityConditions();
    //if is in Diagramiing context and Diagram Is Dirty
    if (currentCtx.diagram.hasPendingChangesInDiagram) {
        _.set(appCtxSvc, 'ctx.architectureCtx.diagram.leaveConfirmBySelectionChange', true);
    }
};

export let syncSelectionsInGraph = function (graphModel) {
    var pwaSelections = [];
    var selectedNodes = [];
    var selectedEdges = [];
    var currentSelections = [];
    var graphSelections = [];
    var selectedPorts = [];

    var elementsToDeselect = [];
    var isSublocationSelectionChange;

    var openedElement = appCtxSvc.ctx.occmgmtContext.openedElement;
    var activeCtx = appCtxSvc.getCtx('activeArchDgmCtx');
    var cuttentCtx = appCtxSvc.getCtx(activeCtx);
    var currentView = _.get(appCtxSvc, 'ctx.ViewModeContext.ViewModeContext', undefined);
    isSublocationSelectionChange = checkIfTracelinkSelected(graphModel.graphControl);

    if (appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected.length > 0) {
        pwaSelections = appCtxSvc.ctx.mselected;
    }

    _.forEach(pwaSelections, function (selection) {
        if (graphModel) {
            if (graphModel.nodeMap && graphModel.nodeMap[selection.uid]) {
                addElemntToArray(selection, selectedNodes);
            } else if (graphModel.edgeMap && graphModel.edgeMap[selection.uid]) {
                addElemntToArray(selection, selectedEdges);
            } else if (graphModel.portMap && graphModel.portMap[selection.uid]) {
                addElemntToArray(selection, selectedPorts);
            }
        }
    });

    currentSelections = selectedNodes.concat(selectedEdges);
    currentSelections = currentSelections.concat(selectedPorts);

    // Set Selected node Command Visibility
    updateCommandVisibilityConditions();

    if (cuttentCtx && cuttentCtx.diagram && cuttentCtx.diagram.selection) {
        var previousSelections = [];
        addElemntToArray(cuttentCtx.diagram.selection.nodeModels, previousSelections);

        _.forEach(cuttentCtx.diagram.selection.edgeModels, function (modelObject) {
            if (cmm.isInstanceOf('Awb0ConditionalElement', modelObject.modelType)) {
                previousSelections.push(modelObject);
            } else {
                graphSelections.push(modelObject);
            }
        });

        graphSelections.push.apply(graphSelections, cuttentCtx.diagram.selection.portModels);

        if (compareArrays(pwaSelections, previousSelections.concat(graphSelections))) {
            return;
        }
        if (previousSelections.length === 0 && pwaSelections.length === 1 && pwaSelections[0] === openedElement && currentView !== 'TreeSummaryView') {
            firePrimarySelectionChangeEvent([], isSublocationSelectionChange);
            return;
        }

        elementsToDeselect.push.apply(elementsToDeselect, previousSelections.concat(graphSelections));

        elementsToDeselect = elementsToDeselect.filter(function (element) {
            return currentSelections.indexOf(element) < 0;
        });

        cuttentCtx.diagram.selection = {
            nodeModels: selectedNodes,
            edgeModels: selectedEdges,
            portModels: selectedPorts
        };
    } else if (cuttentCtx) {
        if (cuttentCtx.diagram) {
            cuttentCtx.diagram.selection = {
                nodeModels: selectedNodes,
                edgeModels: selectedEdges,
                portModels: selectedPorts
            };
        } else {
            cuttentCtx.diagram = {
                selection: {
                    nodeModels: selectedNodes,
                    edgeModels: selectedEdges,
                    portModels: selectedPorts
                }
            };
        }
    } else {
        var jso = {
            diagram: {
                selection: {
                    nodeModels: selectedNodes,
                    edgeModels: selectedEdges,
                    portModels: selectedPorts
                }
            }

        };
        appCtxSvc.registerCtx(activeCtx, jso);
    }
    setGraphSelection(elementsToDeselect, currentSelections, graphModel);

    if (selectedNodes.length > 0) {
        portService.evaluateShowPortsCondition();
    }
};

var setGraphSelection = function (elementsToDeselect, elementsToSelect, graphModel) {
    var graphControl = graphModel.graphControl;
    var deSelectGraphItems = [];
    var selectGraphItems = [];

    if (elementsToDeselect.length > 0) {
        _.forEach(elementsToDeselect, function (element) {
            var item;
            if (graphModel.nodeMap[element.uid]) {
                item = graphModel.nodeMap[element.uid];
                if (graphControl.isSelected(item)) {
                    deSelectGraphItems.push(item);
                }
            } else if (graphModel.edgeMap[element.uid]) {
                item = graphModel.edgeMap[element.uid];
                if (graphControl.isSelected(item)) {
                    deSelectGraphItems.push(item);
                }
            } else if (graphModel.portMap[element.uid]) {
                item = graphModel.portMap[element.uid];
                if (graphControl.isSelected(item)) {
                    deSelectGraphItems.push(item);
                }
            }
        });
    }

    if (elementsToSelect.length > 0) {
        _.forEach(elementsToSelect, function (element) {
            var item;
            if (graphModel.nodeMap[element.uid]) {
                item = graphModel.nodeMap[element.uid];
                if (!graphControl.isSelected(item)) {
                    selectGraphItems.push(item);
                }
            } else if (graphModel.edgeMap[element.uid]) {
                item = graphModel.edgeMap[element.uid];
                if (!graphControl.isSelected(item)) {
                    selectGraphItems.push(item);
                }
            } else if (graphModel.portMap[element.uid]) {
                item = graphModel.portMap[element.uid];
                if (!graphControl.isSelected(item)) {
                    selectGraphItems.push(item);
                }
            }
        });
    }

    var publishEventOnDeselect = false;
    var publishEventOnSelect = true;
    if (deSelectGraphItems.length > 0 && selectGraphItems.length === 0) {
        publishEventOnDeselect = true;
        publishEventOnSelect = false;
    }

    if (deSelectGraphItems.length > 0) {
        graphControl.setSelected(deSelectGraphItems, false, publishEventOnDeselect);
    }

    if (selectGraphItems.length > 0) {
        graphControl.setSelected(selectGraphItems, true, publishEventOnSelect);
    }
};

var fireAceDeselectEvent = function (elementToDeselect, syncPwa) {
    if (syncPwa && elementToDeselect.length > 0) {
        eventBus.publish('aceElementsDeSelectedEvent', {
            elementsToDeselect: elementToDeselect
        });
    }
};

var fireAceSelectEvent = function (elementToFocus) {
    if (elementToFocus.length > 0) {
        var aceMultiSelectMode = false;
        if (elementToFocus.length > 1) {
            aceMultiSelectMode = true;
        }
        eventBus.publish('aceElementsSelectedEvent', {
            elementsToSelect: elementToFocus,
            multiSelect: aceMultiSelectMode
        });
    }
};
var firePrimarySelectionChangeEvent = function (secondaryWorkAreaSelection, isSublocationSelectionChange) {
    if (isSublocationSelectionChange) {
        // Firing this event for SubLocationContentSelectionChangeEvent
        eventBus.publish('AM.SubLocationContentSelectionChangeEvent', {
            selections: secondaryWorkAreaSelection
        });
    }

    // Firing this event for contributing split panels to listen
    eventBus.publish('AM.PrimarySelectionChangeEvent', {
        selections: secondaryWorkAreaSelection
    });
};

var checkIfMultiselectMode = function (graphControl) {
    var selections = graphControl.getSelected();
    if (selections && selections.length > 1) {
        return true;
    }
    return false;
};
var checkIfTracelinkSelected = function (graphControl) {
    if (graphControl) {

        var selectedEdges = graphControl.getSelected('Edge');
        var tracelinkSelected = false;


        if (selectedEdges && selectedEdges.length > 0) {
            _.forEach(selectedEdges, function (element) {
                if (!cmm.isInstanceOf('Awb0ConditionalElement', element.modelObject.modelType)) {
                    tracelinkSelected = true;
                }
            });
        }
        return tracelinkSelected;
    }
};
var checkIfPortSelected = function (graphControl) {
    if (graphControl) {
        var selectedPorts = graphControl.getSelected('Port');
        var portSelected = false;
        if (selectedPorts && selectedPorts.length > 0) {
            portSelected = true;
        }
        return portSelected;
    }
};
/**
 * Function to copmare two Arrays
 * @param {Array} arr1 first array for comparison
 * @param {Array} arr2 second array for comparison
 *
 * @returns {boolean} are arrays equal
 */
function compareArrays(arr1, arr2) {
    if (!(arr1 && arr2)) {
        return false;
    }
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (var i = arr1.length; i--;) {
        if (arr2.indexOf(arr1[i]) === -1) {
            return false;
        }
    }

    return true;
}

/**
 * Function to set style in diagram on hover
 *
 * @param {*} hoveredItem item hovered
 */
var setHoverStyle = function (hoveredItem) {
    _hoveredItem = hoveredItem;
    _timeoutPromise = AwTimeoutService.instance(function () {
        _timeoutPromise = null;
        var _graph = appCtxSvc.getCtx('graph');
        if (_hoveredItem.getItemType() === 'Edge') {
            setHoverEdgeStyle(_hoveredItem, _graph);
        } else if (_hoveredItem.getItemType() === 'Node') {
            setNodeHoverProperty(_hoveredItem, 'aw-widgets-cellListItemNodeHovered');
        } else if (_hoveredItem.getItemType() === 'Port') {
            setHoverPortStyle(_hoveredItem, _graph);
        }
        _hoveredItem = null;
    }, 325);
};

/**
 * Function to reset style of edge in diagram on unhover/deselection
 *
 * @param {*} unHoveredItem unhovered item
 * @param {*} graph graph
 */
var resetEdgeStyle = function (unHoveredItem, graph) {
    var graphModel = null;
    var activeLegendView = null;
    if (graph) {
        if (graph.legendState) {
            activeLegendView = graph.legendState.activeView;
        }
        graphModel = graph.graphModel;
    }
    var edgeCategory = unHoveredItem.category;
    if (!edgeCategory || edgeCategory.localeCompare('') === 0) {
        return;
    }

    //get edge style from graph legend
    var edgeStyle = _.clone(graphLegendSvc.getStyleFromLegend('relations', edgeCategory, activeLegendView));
    var unHoveredEdgeStyle = unHoveredItem.style;

    if (edgeStyle && edgeStyle.sourceArrow && !unHoveredEdgeStyle.sourceArrow) {
        delete edgeStyle.sourceArrow;
    }
    if (edgeStyle && edgeStyle.targetArrow && !unHoveredEdgeStyle.targetArrow) {
        delete edgeStyle.targetArrow;
    }

    if (unHoveredEdgeStyle && edgeStyle) {
        unHoveredEdgeStyle = edgeStyle;
        if (graphModel) {
            graphModel.graphControl.graph.setEdgeStyle(unHoveredItem, unHoveredEdgeStyle);
        }
    }
};

/**
 * Function to reset style of port in diagram on unhover/deselection
 *
 * @param {*} unHoveredItem unhovered item
 * @param {*} graph graph
 */
var resetPortStyle = function (unHoveredItem, graph) {
    var activeLegendView = null;
    var graphModel = null;
    if (graph) {
        if (graph.legendState) {
            activeLegendView = graph.legendState.activeView;
        }
        graphModel = graph.graphModel;
    }
    var portCategory = unHoveredItem.category;
    if (!portCategory || portCategory.localeCompare('') === 0) {
        return;
    }
    //get edge style from graph legend
    var portStyle = graphLegendSvc.getStyleFromLegend('ports', portCategory, activeLegendView);
    var unHoveredPortStyle = unHoveredItem.style;
    if (unHoveredPortStyle) {
        if (portStyle) {
            unHoveredPortStyle.fillColor = portStyle.fillColor;
        }
        if (graphModel) {
            graphModel.graphControl.graph.setPortStyle(unHoveredItem, unHoveredPortStyle);
        }
    }
};

/**
 * Function to set edge style in diagram on hover/selection
 *
 * @param {*} hoveredItem hovered item
 * @param {*} graph graph
 */
var setHoverEdgeStyle = function (hoveredItem, graph) {
    var activeLegendView = null;
    var graphModel = null;
    if (graph) {
        if (graph.legendState) {
            activeLegendView = graph.legendState.activeView;
        }
        graphModel = graph.graphModel;
    }
    var edgeStyle;
    var edgeThicknessOnHover;
    var edgeCategory = hoveredItem.category;
    //get edge style from graph legend
    if (edgeCategory && edgeCategory.localeCompare('') !== 0) {
        edgeStyle = _.clone(graphLegendSvc.getStyleFromLegend('relations', edgeCategory, activeLegendView));

        if (edgeStyle && edgeStyle.sourceArrow && !hoveredItem.style.sourceArrow) {
            delete edgeStyle.sourceArrow;
        }
        if (edgeStyle && edgeStyle.targetArrow && !hoveredItem.style.targetArrow) {
            delete edgeStyle.targetArrow;
        }
    }
    if (edgeStyle) {
        edgeThicknessOnHover = edgeStyle.thickness * edgeStyle.thicknessMultiplier;
    }
    var hoveredEdgeStyle = hoveredItem.style;
    if (hoveredEdgeStyle) {
        hoveredEdgeStyle = _.clone(hoveredEdgeStyle);
        var edgeThickness = hoveredEdgeStyle.thickness;
        if (edgeThickness !== edgeThicknessOnHover) {
            hoveredEdgeStyle.thickness = edgeThicknessOnHover;
        }
        if (graphModel) {
            graphModel.graphControl.graph.setEdgeStyle(hoveredItem, hoveredEdgeStyle);
        }
    }
    var srcNode = hoveredItem.getSourceNode();
    var tarNode = hoveredItem.getTargetNode();
    if (srcNode && tarNode) {
        setNodeHoverProperty(srcNode, 'aw-widgets-cellListItemNodeHovered');
        setNodeHoverProperty(tarNode, 'aw-widgets-cellListItemNodeHovered');
    }
};

/**
 * Function to set port style in diagram on hover/selection
 *
 * @param {*} hoveredItem hovered item
 * @param {*} graph graph
 */
var setHoverPortStyle = function (hoveredItem, graph) {
    var graphModel = null;
    if (graph) {
        graphModel = graph.graphModel;
    }
    var hoveredPortStyle = hoveredItem.style;
    if (hoveredPortStyle) {
        hoveredPortStyle = _.clone(hoveredPortStyle);
        if (graphModel) {
            graphModel.graphControl.graph.setPortStyle(hoveredItem, hoveredPortStyle);
        }
    }
};

/*
 * Function to apply the css to source and target nodes on selection of edge in diagram
 */
var setNodeHoverProperty = function (node, hoveredClass) {
    if (node) {
        var bindData = node.getAppObj();
        if (hoveredClass) {
            if (bindData[exports.NODE_HOVERED_CLASS] !== hoveredClass &&
                bindData[exports.TEXT_HOVERED_CLASS] !== hoveredClass) {
                bindData[exports.NODE_HOVERED_CLASS] = hoveredClass;
                bindData[exports.TEXT_HOVERED_CLASS] = hoveredClass;
            }
        } else {
            bindData[exports.NODE_HOVERED_CLASS] = 'aw-graph-noeditable-area';
            bindData[exports.TEXT_HOVERED_CLASS] = '';
        }
        if (node.getSVG()) {
            node.getSVG().bindNewValues(exports.NODE_HOVERED_CLASS);
            node.getSVG().bindNewValues(exports.TEXT_HOVERED_CLASS);
        }
    }
};

var addElemntToArray = function (elementToAdd, array) {
    if (elementToAdd && elementToAdd instanceof Array) {
        if (array.length > 0) {
            _.forEach(elementToAdd, function (element) {
                var index = array.indexOf(element);

                if (index < 0) {
                    array.push(element);
                }
            });
        } else {
            array.push.apply(array, elementToAdd);
        }
    } else {
        if (array && array.length > 0) {
            var index = array.indexOf(elementToAdd);

            if (index < 0) {
                array.push(elementToAdd);
            }
        } else {
            array.push(elementToAdd);
        }
    }
};
/*******************************************************************************************************************
 * this function is helper in the visibility condition of "selectedOnly and ConverToParent
 */
function updateCommandVisibilityConditions() {
    var isVisibleSelectedOnlyCmd = false;
    var activeCtx = appCtxSvc.getCtx('activeArchDgmCtx');
    var currentCtx = appCtxSvc.getCtx(activeCtx);
    var graphContext = appCtxSvc.getCtx('graph');
    var graphControl = graphContext.graphModel.graphControl;
    if (graphControl) {
        var groupGraph = graphContext.graphModel.graphControl.groupGraph;
        var selectedNodes = graphControl.getSelected('Node');
        var isGroupSelectedNode = false;
        var parentVisibilityCommand = '';
        var showLabels = false;
        var selectedEdges = graphControl.getSelected('Edge');
        var selectedPorts = graphControl.getSelected('Port');
        var isRoot = true;

        if (selectedNodes && selectedNodes.length > 0) {
            if (selectedNodes.length === 1) {
                var parent = groupGraph.getParent(selectedNodes[0]);
                if (parent) {
                    var grandParent = groupGraph.getParent(parent);
                    if (!grandParent) {
                        parentVisibilityCommand = 'Hide';
                    }
                } else {
                    parentVisibilityCommand = 'Show';
                }
                if (currentCtx && currentCtx.diagram) {
                    currentCtx.diagram.parentVisibilityCommand = parentVisibilityCommand;
                }
            }

            isVisibleSelectedOnlyCmd = true;
            // when there is only one node in graph then SelctedOnly Command should not be visible
            if (graphControl && graphControl.graph.getNodes().length === 1) {
                isVisibleSelectedOnlyCmd = false;
            }
            // check if the single selected node is Group node
            if (groupGraph && groupGraph.isGroup(selectedNodes[0])) {
                isGroupSelectedNode = true;
            }
            _.forEach(selectedNodes, function (nodeItem) {
                if (!nodeItem.isRoot()) {
                    isRoot = false;
                    return false;
                }
            });
            if (currentCtx && currentCtx.diagram) {
                currentCtx.diagram.anchorState = isRoot;
                currentCtx.diagram.isGroupSelectedNode = isGroupSelectedNode;
                currentCtx.diagram.isVisibleSelectedOnlyCmd = isVisibleSelectedOnlyCmd;
            }
        } else {
            if (currentCtx && currentCtx.diagram) {
                currentCtx.diagram.anchorState = false;
            }
        }

        // Update the show/hide label command state
        var selectedTracelinks = [];
        if (selectedEdges && selectedEdges.length > 0) {
            _.forEach(selectedEdges, function (edgeItem) {
                var label = edgeItem.getLabel();
                if (!label || !label.isVisible()) {
                    showLabels = true;
                }

                if (edgeItem.modelObject && cmm.isInstanceOf('FND_TraceLink', edgeItem.modelObject.modelType)) {
                    selectedTracelinks.push(edgeItem.modelObject);
                }
            });
        }

        if (selectedPorts && selectedPorts.length > 0) {
            _.forEach(selectedPorts, function (portItem) {
                var label = portItem.getLabel();
                if (!label || !label.isVisible()) {
                    showLabels = true;
                    return false;
                }
            });
        }

        if (currentCtx && currentCtx.diagram) {
            currentCtx.diagram.selectedTracelinkCount = selectedTracelinks.length;
        }

        if (selectedEdges && selectedEdges.length > 0 || selectedPorts && selectedPorts.length > 0) {
            currentCtx.showLabels = showLabels;
        } else {
            currentCtx.showLabels = true;
            var labelCategories;
            if (currentCtx && currentCtx.diagram) {
                labelCategories = currentCtx.diagram.labelCategories;
            }
            _.forEach(labelCategories, function (labelCategory) {
                if (labelCategory.categoryState) {
                    currentCtx.showLabels = false;
                }
            });
        }
        updateReconnectCmdCondition(selectedNodes, selectedPorts, selectedEdges);
    }
}

/*******************************************************************************************************************
 * this function will update reconnect connection flag
 *
 * @param {*} selectedNodes selectedNodes
 * @param {*} selectedPorts selectedPorts
 * @param {*} selectedEdges selectedEdges
 */
function updateReconnectCmdCondition(selectedNodes, selectedPorts, selectedEdges) {
    var activeCtx = appCtxSvc.getCtx('activeArchDgmCtx');
    if (activeCtx === 'architectureCtx') {
        var architectureCtx = appCtxSvc.getCtx('architectureCtx');
        var graphContext = appCtxSvc.getCtx('graph');
        var doShowReconnectCmd = false;
        var isDangledConnectionAlreadySelected = false;

        var selNodes = [];
        var selPorts = [];
        var selEdges = [];

        if (selectedNodes) {
            selNodes = selectedNodes;
        }
        if (selectedPorts) {
            selPorts = selectedPorts;
        }
        if (selectedEdges) {
            selEdges = selectedEdges;
        }
        // set flag doShowReconnectCmd
        if (appCtxSvc.ctx.mselected.length > 0) {
            _.forEach(appCtxSvc.ctx.mselected, function (mselected) {
                // Check if selection is of type connection.
                if (mselected.type === 'Awb0Connection') {
                    // check if connection is disconnected or dangling
                    var props = mselected.props;
                    if (props) {
                        if (props.ase0ConnectedState.dbValues[0] === 'ase0Disconnected' || props.ase0ConnectedState.dbValues[0] === 'ase0Dangling') {
                            isDangledConnectionAlreadySelected = true;
                            return false;
                        }
                    }
                }
            });

            if (isDangledConnectionAlreadySelected) {
                if (appCtxSvc.ctx.mselected.length === 1) {
                    doShowReconnectCmd = true;
                }
                if (architectureCtx && architectureCtx.diagram) {
                    architectureCtx.diagram.doShowReconnectCmd = doShowReconnectCmd;
                }

                return;
            }
        }

        var graphModel = graphContext.graphModel;
        if (selNodes.length > 0 && selPorts.length === 0 && selEdges.length === 0) { // Only Nodes selected
            _.forEach(selNodes, function (selectedNode) {
                var modelObject = selectedNode.modelObject;
                if (modelObject) {
                    var nodeData = graphModel.nodeMap[modelObject.uid];
                    if (nodeData && nodeData.hasDanglingConnection) {
                        doShowReconnectCmd = true;
                        return false;
                    }
                }
            });
        }

        if (selNodes.length === 0 && selPorts.length > 0 && selEdges.length === 0) { // Only Ports selected
            _.forEach(selPorts, function (selectedPort) {
                var modelObject = selectedPort.modelObject;
                if (modelObject) {
                    var portData = graphModel.portMap[modelObject.uid];
                    if (portData && portData.hasDanglingConnection) {
                        doShowReconnectCmd = true;
                        return false;
                    }
                }
            });
        }
        if (architectureCtx && architectureCtx.diagram) {
            architectureCtx.diagram.doShowReconnectCmd = doShowReconnectCmd;
        }
    }
}

export default exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    setDiagramHover,
    setDiagramSelection,
    syncSelectionsInGraph
};
app.factory('Ase0ArchitectureGraphSelectionService', () => exports);
