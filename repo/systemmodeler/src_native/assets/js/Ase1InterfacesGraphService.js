//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Interfaces tab graph service
 *
 * @module js/Ase1InterfacesGraphService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import layoutService from 'js/Ase1IntefacesGraphLayoutService';
import interfacesGraphLegendManager from 'js/Ase1InterfacesGraphLegendManager';
import nodeService from 'js/Ase1IntefacesGraphNodeService';
import edgeService from 'js/Ase1InterfacesGraphEdgeService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';

var exports = {};

var _timeoutPromise;

var _hoveredItem;

/**
 * Default padding distance for boundary
 */
var DEFAULT_PADDING = 35;

/**
 * Default label margin
 */
var DEFAULT_MARGIN = 8;

/**
 * Binding class name for node
 */
export let NODE_HOVERED_CLASS = "relation_node_hovered_style_svg";

/**
 * Node default style class
 */
var NODE_STYLE_CLASS = "aw-widgets-cellListItemNode";

/**
 * Node selected style class
 */
var NODE_SELECTED_STYLE_CLASS = "aw-widgets-cellListItemNodeSelected";

var systemContainsIn = function( modelObject, systems ) {
    var isValidSystem = false;
    if( !modelObject || !systems || systems.length === 0 ) { return false; }

    var matchSystem = _.find( systems, function( system ) {
        return ( system.nodeObject.uid === modelObject.uid );
    } );
    if( matchSystem ) {
        isValidSystem = true;
    }
    return isValidSystem;
};

var removePreviousGraphItems = function() {
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    if( !graphModel || !graphModel.edgeMap || !graphModel.nodeMap || Object.keys( graphModel.edgeMap ).length < 0 ) {
        return;
    }
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    var visibleExternalSystems = interfacesCtx.visibleExternalSystems;
    var nodeMap = {};

    var nodesToRemove = [];

    _.forEach( graphModel.nodeMap, function( value, key ) {
        var isVisibleSystem = systemContainsIn( value.modelObject, visibleExternalSystems );
        if( isVisibleSystem ) {
            nodeMap[ key ] = value;
        } else {
            nodesToRemove.push( value );
        }
    } );

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    var boundaries = graph.getBoundaries();
    if( boundaries ) {
        graph.removeBoundaries( boundaries );
    }

    if( Object.keys( graphModel.nodeMap ).length > 0 ) {
        graphModel.nodeMap = nodeMap;
    }
    if( nodesToRemove.length > 0 ) {
        graph.removeNodes( nodesToRemove );
    }
    graphContext.graphModel.edgeMap = {};
    appCtxSvc.updateCtx( "graph", graphContext );

};

/**
 * Clearing previous graph selections before updating graph
 */
export let clearGraphSelection = function() {
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;

    graphModel.graphControl.setSelected( null, false );
};

/**
 * Update Interfaces tab graph to show contents
 */
export let updateGraphView = function() {
    var activeLegendView;
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    if( interfacesCtx && interfacesCtx.systemOfInterest ) {
        var graphContext = appCtxSvc.getCtx( "graph" );
        var graphModel = graphContext.graphModel;
        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;
        var interfacesViewModeCtx = appCtxSvc.getCtx( "interfacesViewModeCtx" );
        if( interfacesViewModeCtx && interfacesViewModeCtx.activeLegendView ) {
            activeLegendView = interfacesViewModeCtx.activeLegendView;
        }

        removePreviousGraphItems();

        // Process node data for external nodes
        if( interfacesCtx.visibleExternalSystems && interfacesCtx.visibleExternalSystems.length > 0 ) {
            nodeService.processNodeData( interfacesCtx.visibleExternalSystems, false, activeLegendView );
        }

        // Process node data for internal systems or system in view
        if( interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 ) {
            nodeService.processNodeData( interfacesCtx.internalSystems, false, activeLegendView );
            // To do : add code for annotation drawing
        } else if( interfacesCtx.systemInView && interfacesCtx.systemInView.nodeObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid ) {
            nodeService.processNodeData( [ interfacesCtx.systemInView ], true, activeLegendView, interfacesCtx );
        }

        // Process edge data to draw edges
        var addedEdges = [];
        if( interfacesCtx.edges && interfacesCtx.edges.length > 0 ) {
            addedEdges = edgeService.processEdgeData( graphModel, interfacesCtx.edges, activeLegendView );
        }

        //apply graph filters and notify item added event
        graph.updateOnItemsAdded( addedEdges );
        graph.showLabels( true );
        layoutService.activateColumnLayout( addedEdges );
        drawBoundary( interfacesCtx.systemOfInterest );
        if( interfacesCtx.systemInView && interfacesCtx.systemInView.nodeObject.uid !== interfacesCtx.systemOfInterest.nodeObject.uid ) {
            drawBoundary( interfacesCtx.systemInView );
        }
        adjustBoundarySize();
    }
};

/**
 * Adding boundary annotation for internal systems
 * @param {Object} system - System of Interest/System in View
 */
var drawBoundary = function( system ) {
    var activeLegendView;
    var height = 0;
    var width = 0;
    var x = 0;
    var y = 0;
    var labelConfiguration = {
        margin: [ 5, 10, 2, 2 ],
        style: 'aw-widgets-cellListCellTitle',
        textAlignment: graphConstants.TextAlignment.LEFT
    };
    var interfacesViewModeCtx = appCtxSvc.getCtx( "interfacesViewModeCtx" );
    if( interfacesViewModeCtx && interfacesViewModeCtx.activeLegendView ) {
        activeLegendView = interfacesViewModeCtx.activeLegendView;
    }
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    if( interfacesCtx && interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 ) {
        var size = interfacesCtx.internalSystems.length;
        var internalSystems = interfacesCtx.internalSystems;
        var topNodeObject = internalSystems[ 0 ].nodeObject;
        var bottomNodeObject = internalSystems[ size - 1 ].nodeObject;
        if( topNodeObject ) {
            var topGraphNode = graphModel.nodeMap[ topNodeObject.uid ];
            var topNodeRect = null;
            if( topGraphNode ) {
                topNodeRect = graph.getBounds( topGraphNode );
                x = topNodeRect.x - DEFAULT_PADDING;
                y = topNodeRect.y;
            }
            if( bottomNodeObject ) {
                var bottomGraphNode = graphModel.nodeMap[ bottomNodeObject.uid ];
                if( bottomGraphNode ) {
                    var bottomNodeRect = graph.getBounds( bottomGraphNode );
                    if( bottomNodeRect && topNodeRect ) {
                        height = bottomNodeRect.y - topNodeRect.y + bottomNodeRect.height + DEFAULT_PADDING;
                    }
                    if( topNodeRect ) {
                        width = topNodeRect.width + DEFAULT_PADDING * 2;
                    }
                }
            }
        }
        if( height !== 0 || width !== 0 ) {
            var rect = {
                x: x,
                y: y,
                width: width,
                height: height
            };
            var boundaryCategory = interfacesGraphLegendManager.getCategoryType( "SystemInView", activeLegendView );
            var boundaryStyle = graphLegendSvc.getStyleFromLegend( 'annotations', boundaryCategory,
                activeLegendView );
            if( interfacesCtx.systemInView && interfacesCtx.systemOfInterest &&
                interfacesCtx.systemInView.nodeObject.uid !== interfacesCtx.systemOfInterest.nodeObject.uid &&
                system.nodeObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid ) {
                boundaryCategory = interfacesGraphLegendManager.getCategoryType( "SystemOfInterest", activeLegendView );
                boundaryStyle = graphLegendSvc.getStyleFromLegend( 'annotations', boundaryCategory,
                    activeLegendView );
            }
            var boundary = graph.createBoundary( rect, boundaryStyle );
            graph.setLabel( boundary, system.nodeLabel, labelConfiguration );
            boundary.modelObject = system.nodeObject;
        }
    }
};

/**
 * Adjusting size of boundary as per height of label on boundary
 */
var adjustBoundarySize = function() {
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var outerBoundary;
    var innerBoundaryRect;
    var boundaries = graph.getBoundaries();
    if( boundaries ) {
        _.forEach( boundaries, function( boundary ) {
            var boundaryRect = graph.getBounds( boundary );
            var labelHeight = boundary.getLabel().getHeightValue();
            boundaryRect.y = boundaryRect.y - labelHeight - DEFAULT_MARGIN;
            boundaryRect.height = boundaryRect.height + labelHeight + DEFAULT_MARGIN;
            if( boundary.modelObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid && interfacesCtx.systemInView && interfacesCtx.systemOfInterest &&
                interfacesCtx.systemInView.nodeObject.uid !== interfacesCtx.systemOfInterest.nodeObject.uid ) {
                outerBoundary = boundary;
            } else {
                innerBoundaryRect = boundaryRect;
                graph.setBounds( boundary, boundaryRect );
            }
        } );
        if( outerBoundary && innerBoundaryRect ) {
            var outerBoundaryRect = graph.getBounds( outerBoundary );
            outerBoundaryRect.y = innerBoundaryRect.y - DEFAULT_PADDING;
            outerBoundaryRect.height = innerBoundaryRect.height + DEFAULT_PADDING * 2;
            outerBoundaryRect.width = innerBoundaryRect.width + DEFAULT_PADDING * 2;
            outerBoundaryRect.x = innerBoundaryRect.x - DEFAULT_PADDING;
            graph.setBounds( outerBoundary, outerBoundaryRect );
        }
    }
    // Fit the graph
    graphControl.fitGraph();
};

/**
 * Process graph object double click event
 * @param {Object} graphItem - double clicked graph item
 */
export let graphObjectDoubleClicked = function( graphItem ) {
    if( graphItem ) {
        var eventData = {};
        if( graphItem.getItemType() === 'Node' && graphItem.modelObject ) {
            eventData = {
                doubleClickedObject: graphItem.modelObject
            };
        } else if( graphItem.getItemType() === 'Label' ) {
            var node = graphItem.getOwner();
            if( node && node.modelObject ) {
                eventData = {
                    doubleClickedObject: node.modelObject
                };
            }
        }
        eventBus.publish( "Ase1InterfacesPage.objectDoubleClicked", eventData );
    }
};

/**
 * Setting selection fro Interfaces tab
 * @param {Object} selected - Selected graph items
 * @param {Object} unselected - De selected graph items
 */
export let setDiagramSelection = function( selected, unselected ) {

    var activeLegendView;
    var eventData = null;
    var label = null;
    var soiLabelStyleClass = "aw-widgets-cellListItemNodeSelected aw-systemmodeler-circleNodeLabelBackground";
    var resetSoiLabelStyleClass = "aw-widgets-cellListItemNode aw-systemmodeler-circleNodeLabelBackground";
    var boundarySelectedStyle = {
        styleClass: NODE_SELECTED_STYLE_CLASS
    };
    var resetBoundaryStyle = {
        styleClass: "aw-systemmodeler-boundaryStyle"
    };
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    if( interfacesCtx && interfacesCtx.systemOfInterest ) {
        var graphContext = appCtxSvc.getCtx( "graph" );
        var graphModel = graphContext.graphModel;
        var graphControl = graphModel.graphControl;
        var systemOfInterest = interfacesCtx.systemOfInterest;
        var interfacesViewModeCtx = appCtxSvc.getCtx( "interfacesViewModeCtx" );
        if( interfacesViewModeCtx && interfacesViewModeCtx.activeLegendView ) {
            activeLegendView = interfacesViewModeCtx.activeLegendView;
        }

        if( unselected && unselected.length > 0 ) {
            _.forEach( unselected, function( element ) {
                if( element.getItemType() === 'Node' ) {
                    setNodeHoverProperty( element, NODE_STYLE_CLASS );
                    if( element.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                        label = element.getLabel();
                        label.setStyle( null, resetSoiLabelStyleClass );
                    }
                } else if( element.getItemType() === 'Label' ) {
                    var node = element.getOwner();
                    if( node.modelObject ) {
                        setNodeHoverProperty( node, NODE_STYLE_CLASS );
                        if( node.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                            element.setStyle( null, resetSoiLabelStyleClass );
                        }
                    } else {
                        setNodeHoverProperty( node, resetBoundaryStyle );
                    }
                } else if( element.getItemType() === 'Edge' ) {
                    resetEdgeStyle( element, graphModel, activeLegendView );
                    var srcNode = element.getSourceNode();
                    var tarNode = element.getTargetNode();
                    if( srcNode && tarNode ) {
                        setNodeHoverProperty( srcNode, NODE_STYLE_CLASS );
                        setNodeHoverProperty( tarNode, NODE_STYLE_CLASS );
                        if( srcNode.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                            label = srcNode.getLabel();
                            label.setStyle( null, resetSoiLabelStyleClass );
                        } else if( tarNode.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                            label = tarNode.getLabel();
                            label.setStyle( null, resetSoiLabelStyleClass );
                        }
                    }
                } else if( element.getItemType() === 'Boundary' ) {
                    graphControl.graph.setBoundaryStyle( element, resetBoundaryStyle );
                }
            } );
        }

        if( selected && selected.length > 0 ) {
            _.forEach( selected, function( element ) {
                if( element.getItemType() === 'Node' ) {
                    setNodeHoverProperty( element, NODE_SELECTED_STYLE_CLASS );
                    if( element.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                        var label = element.getLabel();
                        label.setStyle( null, soiLabelStyleClass );
                    }
                } else if( element.getItemType() === 'Edge' ) {
                    setHoverEdgeStyle( element, graphModel, systemOfInterest, activeLegendView );
                } else if( element.getItemType() === 'Label' ) {
                    var node = element.getOwner();
                    setNodeHoverProperty( node, NODE_SELECTED_STYLE_CLASS );
                    if( node.modelObject ) {
                        if( node.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                            element.setStyle( null, soiLabelStyleClass );
                        }
                    }
                } else if( element.getItemType() === 'Boundary' ) {
                    graphControl.graph.setBoundaryStyle( element, boundarySelectedStyle );
                }
            } );
        }
        // get ALL the selected Graph Elements and publish the selectionChanged event.
        var allSelectedGraphModelObjects = [];
        var allSelectedGraphElements = graphModel.graphControl.getSelected();
        _.forEach( allSelectedGraphElements, function( element ) {
            if( element.getItemType() === 'Node' || element.getItemType() === 'Edge' ) {
                allSelectedGraphModelObjects.push( element.modelObject );
            } else if( element.getItemType() === 'Label' ) {
                if( element.getOwner().modelObject ) {
                    allSelectedGraphModelObjects.push( element.getOwner().modelObject );
                    var boundary = element.getOwner();
                    if( boundary.modelObject ) {
                        if( boundary.modelObject.uid === interfacesCtx.systemInView.nodeObject.uid ) {
                            allSelectedGraphModelObjects.push( interfacesCtx.systemInView.nodeObject );
                        } else if( boundary.modelObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid ) {
                            allSelectedGraphModelObjects.push( interfacesCtx.systemOfInterest.nodeObject );
                        }
                    }
                }
            } else if( element.getItemType() === 'Boundary' ) {
                if( element.modelObject ) {
                    if( element.modelObject.uid === interfacesCtx.systemInView.nodeObject.uid ) {
                        allSelectedGraphModelObjects.push( interfacesCtx.systemInView.nodeObject );
                    } else if( element.modelObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid ) {
                        allSelectedGraphModelObjects.push( interfacesCtx.systemOfInterest.nodeObject );
                    }
                }
            }
        } );
        eventData = {
            selection: allSelectedGraphModelObjects
        };

        eventBus.publish( "Ase1InterfacesPage.selectionChanged", eventData );
    }
};

/**
 * Function to set hover styling of elements in diagram
 *
 * @param {Object} hoveredItem - Hovered Graph Item
 * @param {Object} unHoveredItem - Unhovered Graph Item
 */
export let setDiagramHover = function( hoveredItem, unHoveredItem ) {
    if( _timeoutPromise ) {
        AwTimeoutService.instance.cancel( _timeoutPromise );
        _timeoutPromise = null;
    }
    var activeLegendView;
    var selectedEdges = [];
    var nodesToCheck = [];
    var labelsToCheck = [];
    var resetSoiLabelStyleClass = "aw-widgets-cellListItemNode aw-systemmodeler-circleNodeLabelBackground";
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    if( interfacesCtx && interfacesCtx.systemOfInterest ) {
        var systemOfInterest = interfacesCtx.systemOfInterest;
        var graphContext = appCtxSvc.getCtx( "graph" );
        var graphModel = graphContext.graphModel;
        var graphControl = graphModel.graphControl;
        var graph = graphModel.graphControl.graph;
        var interfacesViewModeCtx = appCtxSvc.getCtx( "interfacesViewModeCtx" );
        if( interfacesViewModeCtx && interfacesViewModeCtx.activeLegendView ) {
            activeLegendView = interfacesViewModeCtx.activeLegendView;
        }
        var edgesSelected = graphModel.graphControl.getSelected( "Edge" );
        if( edgesSelected && edgesSelected.length > 0 ) {
            _.forEach( edgesSelected, function( edgeSelected ) {
                selectedEdges.push( edgeSelected.modelObject );
            } );
        }
        if( unHoveredItem ) {
            if( unHoveredItem.getItemType() === 'Edge' ) {
                if( !selectedEdges || selectedEdges.indexOf( unHoveredItem.modelObject ) < 0 ) {
                    resetEdgeStyle( unHoveredItem, graphModel, activeLegendView );
                    var srcNode = unHoveredItem.getSourceNode();
                    var tarNode = unHoveredItem.getTargetNode();
                    nodesToCheck.push( srcNode );
                    nodesToCheck.push( tarNode );
                }
            } else if( unHoveredItem.getItemType() === 'Node' ) {
                nodesToCheck.push( unHoveredItem );
            } else if( unHoveredItem.getItemType() === 'Label' ) {
                labelsToCheck.push( unHoveredItem );
            }
            _.forEach( nodesToCheck, function( node ) {
                var nodeEdgeSelected = false;
                if( selectedEdges && selectedEdges.length > 0 ) {
                    _.forEach( selectedEdges, function( edge ) {
                        var selEdge = graphModel.edgeMap[ edge.uid ];
                        srcNode = selEdge.getSourceNode();
                        tarNode = selEdge.getTargetNode();
                        if( ( srcNode.modelObject.uid === node.modelObject.uid ) ||
                            ( tarNode.modelObject.uid === node.modelObject.uid ) ) {
                            nodeEdgeSelected = true;
                            return false;
                        }
                    } );
                }
                if( !nodeEdgeSelected ) {
                    if( !graphControl.isSelected( node ) ) {
                        var nodeLabel = node.getLabel();
                        if( !graphControl.isSelected( nodeLabel ) ) {
                            setNodeHoverProperty( node, NODE_STYLE_CLASS );
                            if( node.modelObject && node.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                                if( node.getLabel() ) {
                                    graph.update( function() {
                                        node.getLabel().setStyle( null, resetSoiLabelStyleClass );
                                    } );
                                }
                            }
                        }
                    }
                }
            } );
            _.forEach( labelsToCheck, function( selectedLabel ) {
                var labelEdgeSelected = false;
                var selectedNode = selectedLabel.getOwner();
                if( selectedEdges && selectedEdges.length > 0 ) {
                    _.forEach( selectedEdges, function( edge ) {
                        var selEdge = graphModel.edgeMap[ edge.uid ];
                        srcNode = selEdge.getSourceNode();
                        tarNode = selEdge.getTargetNode();
                        if( ( srcNode && srcNode.modelObject.uid === selectedNode.modelObject.uid ) ||
                            ( tarNode && tarNode.modelObject.uid === selectedNode.modelObject.uid ) ) {
                            labelEdgeSelected = true;
                            return false;
                        } else if( graphControl.isSelected( selectedLabel ) ) {
                            labelEdgeSelected = false;
                            return false;
                        }
                    } );
                }
                if( !labelEdgeSelected ) {
                    if( !graphControl.isSelected( selectedLabel ) ) {
                        var selNode = selectedLabel.getOwner();
                        if( selNode.modelObject && selNode.getItemType() === 'Node' ) {
                            if( !graphControl.isSelected( selNode ) ) {
                                setNodeHoverProperty( selNode, NODE_STYLE_CLASS );
                                if( selNode.modelObject && ( selNode.modelObject.uid === systemOfInterest.nodeObject.uid ) ) {
                                    graph.update( function() {
                                        selectedLabel.setStyle( null, resetSoiLabelStyleClass );
                                    } );
                                }
                            }
                        }
                    }
                }
            } );
        }
        if( hoveredItem ) {
            setHoverStyle( hoveredItem, graphModel, systemOfInterest, activeLegendView );
        }
    }
};

/**
 * Function to set style in diagram on hover
 *
 * @param {Object} hoveredItem - Hovered Graph Item
 * @param {Object} graphModel - Graph Model
 * @param {Object} systemOfInterest - System of Interest
 * @param {Object} activeLegendView - Legend View
 */
var setHoverStyle = function( hoveredItem, graphModel, systemOfInterest, activeLegendView ) {
    _hoveredItem = hoveredItem;
    var graph = graphModel.graphControl.graph;
    var soiLabelStyleClass = "aw-widgets-cellListItemNodeSelected aw-systemmodeler-circleNodeLabelBackground";

    _timeoutPromise = AwTimeoutService.instance( function() {
        _timeoutPromise = null;
        if( _hoveredItem.getItemType() === 'Label' ) {
            var node = _hoveredItem.getOwner();
            if( node.modelObject ) {
                _hoveredItem = node;
            }
        }

        if( _hoveredItem.getItemType() === 'Edge' ) {
            setHoverEdgeStyle( _hoveredItem, graphModel, systemOfInterest, activeLegendView );
        } else if( _hoveredItem.getItemType() === 'Node' ) {
            if( _hoveredItem.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                if( graph ) {
                    graph.update( function() {
                        var label = _hoveredItem.getLabel();
                        label.setStyle( null, soiLabelStyleClass );
                    } );
                }
            } else {
                setNodeHoverProperty( _hoveredItem, NODE_SELECTED_STYLE_CLASS );
            }
        }
        _hoveredItem = null;
    }, 325 );
};

/**
 * Function to set edge style in diagram on hover/selection
 *
 * @param {Object} hoveredItem - Hovered Graph Item
 * @param {Object} graphModel - Graph Model
 * @param {Object} systemOfInterest - System of Interest
 * @param {Object} activeLegendView - Legend View
 */
var setHoverEdgeStyle = function( hoveredItem, graphModel, systemOfInterest, activeLegendView ) {
    var soiLabelStyleClass = "aw-widgets-cellListItemNodeSelected aw-systemmodeler-circleNodeLabelBackground";
    var label = null;
    var graph = graphModel.graphControl.graph;
    if( graph ) {
        var edgeStyle;
        var edgeCategory = interfacesGraphLegendManager.getCategoryType( "Connectivity", activeLegendView );
        //get edge style from graph legend
        edgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory,
            activeLegendView );
        var hoveredEdgeStyle = hoveredItem.style;
        var edgeThicknessOnHover = ( edgeStyle.thickness ) * ( edgeStyle.thicknessMultiplier );
        if( hoveredEdgeStyle ) {
            hoveredEdgeStyle = _.clone( hoveredEdgeStyle );
            var edgeThickness = hoveredEdgeStyle.thickness;
            if( edgeThickness !== edgeThicknessOnHover ) {
                hoveredEdgeStyle.thickness = edgeThicknessOnHover;
            }
            graph.setEdgeStyle( hoveredItem, hoveredEdgeStyle );
        }
        var srcNode = hoveredItem.getSourceNode();
        var tarNode = hoveredItem.getTargetNode();
        if( srcNode && tarNode ) {
            setNodeHoverProperty( srcNode, NODE_SELECTED_STYLE_CLASS );
            setNodeHoverProperty( tarNode, NODE_SELECTED_STYLE_CLASS );
            if( srcNode.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                label = srcNode.getLabel();
                label.setStyle( null, soiLabelStyleClass );
            } else if( tarNode.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                label = tarNode.getLabel();
                label.setStyle( null, soiLabelStyleClass );
            }
        }
    }
};

/*
 * Function to apply the css to source and target nodes on selection of edge in diagram
 */
var setNodeHoverProperty = function( node, hoveredClass ) {
    if( node ) {
        var bindData = node.getAppObj();
        if( hoveredClass ) {

            bindData[ exports.NODE_HOVERED_CLASS ] = hoveredClass;

        } else {
            bindData[ exports.NODE_HOVERED_CLASS ] = NODE_STYLE_CLASS;
        }
        if( node.getSVG() ) {
            node.getSVG().bindNewValues( exports.NODE_HOVERED_CLASS );
        }
    }
};

/**
 * Function to reset style of edge in diagram on unhover/deselection
 *
 * @param {Object} unHoveredItem - Unhovered Graph Item
 * @param {Object} graphModel - Graph Model
 * @param {Object} activeLegendView - Legend View
 */
var resetEdgeStyle = function( unHoveredItem, graphModel, activeLegendView ) {
    var graph = graphModel.graphControl.graph;
    if( graph ) {
        var edgeStyle;
        var edgeCategory = interfacesGraphLegendManager.getCategoryType( "Connectivity", activeLegendView );
        //get edge style from graph legend
        edgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory,
            activeLegendView );
        var unHoveredEdgeStyle = unHoveredItem.style;
        if( unHoveredEdgeStyle ) {
            unHoveredEdgeStyle = edgeStyle;
            graph.setEdgeStyle( unHoveredItem, unHoveredEdgeStyle );
        }
    }
};

/**
 * clears the graph
 */
export let clearGraphView = function() {
    var graph;
    var graphContext = appCtxSvc.getCtx( "graph" );
    if( graphContext && graphContext.graphModel && graphContext.graphModel.graphControl ) {
        graph = graphContext.graphModel.graphControl.graph;
    }
    if( graph ) {
        graphContext.graphModel.nodeMap = {};
        graphContext.graphModel.edgeMap = {};
        appCtxSvc.updateCtx( "graph", graphContext );
        graph.update( function() {
            graph.clear();
        } );
    }
};

/**
 * Updating Boundary annotation for internal systems if required
 */
var updateBoundary = function() {
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var boundaries = graph.getBoundaries();
    if( boundaries ) {
        graph.removeBoundaries( boundaries );
    }
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    if( interfacesCtx && interfacesCtx.systemInView ) {
        drawBoundary( interfacesCtx.systemInView );
        if( interfacesCtx.systemInView.nodeObject.uid !== interfacesCtx.systemOfInterest.nodeObject.uid ) {
            drawBoundary( interfacesCtx.systemOfInterest );
        }
    }
    adjustBoundarySize();
};

/**
 * Function to update the label name in Graph after updating the revision name in infopanel
 * @param {Object} eventData - Event Data
 */
export let updateFromInfoPanel = function( eventData ) {
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    if( interfacesCtx && interfacesCtx.systemInView ) {
        var systemInView = interfacesCtx.systemInView;
    }
    if( interfacesCtx && interfacesCtx.systemOfInterest ) {
        var systemOfInterest = interfacesCtx.systemOfInterest;
    }
    var context = appCtxSvc.getCtx( 'interfacesLabelCtx' );
    var labelProp = context.selectedLabelProperty;
    var labelNames = labelProp.split( "." );
    var label = labelNames[ 1 ];
    var displayName = "";
    var nodes = [];
    var labelConfiguration = {
        margin: [ 10, 10, 2, 2 ],
        style: 'aw-widgets-cellListCellTitle',
        textAlignment: graphConstants.TextAlignment.LEFT
    };
    var graphContext = appCtxSvc.getCtx( "graph" );
    _.forEach( eventData.updatedObjects, function( modelObj ) {
        if( graphContext && graphContext.graphModel && graphContext.graphModel.nodeMap && graphContext.graphModel.nodeMap[ modelObj.uid ] ) {
            var node = graphContext.graphModel.nodeMap[ modelObj.uid ];
            if( node.modelObject.props[ label ] ) {
                displayName = node.modelObject.props[ label ].uiValues[ 0 ];
                if( graphContext.graphModel.graphControl ) {
                    var graph = graphContext.graphModel.graphControl.graph;
                    if( graph ) {
                        var originHeight = node.getHeightValue();
                        graph.setLabel( node, displayName );
                        var changedHeight = node.getHeightValue();
                        if( interfacesCtx && interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 ) {
                            var internalSystems = interfacesCtx.internalSystems;
                            _.forEach( internalSystems, function( intSys ) {
                                var graphNode = graphContext.graphModel.nodeMap[ intSys.nodeObject.uid ];
                                if( graphNode && graphNode.modelObject.uid === node.modelObject.uid && originHeight !== changedHeight ) {
                                    nodes.push( node );
                                }
                            } );
                        }
                    }
                }
            }
        }
    } );
    if( nodes.length > 0 ) {
        updateBoundary();
    } else {
        var intGraph = graphContext.graphModel.graphControl.graph;
        if( intGraph ) {
            var boundaries = intGraph.getBoundaries();
            if( boundaries && boundaries.length > 0 ) {
                if( systemInView ) {
                    _.forEach( eventData.updatedObjects, function( modelObj ) {
                        if( modelObj.uid === systemInView.nodeObject.uid ) {
                            _.forEach( boundaries, function( boundary ) {
                                var text = boundary.getLabel().getText();
                                if( modelObj.props[ label ] ) {
                                    displayName = modelObj.props[ label ].uiValues[ 0 ];
                                    if( boundary.modelObject.uid === systemInView.nodeObject.uid ) {
                                        if( text !== displayName ) {
                                            var originalHeight = boundary.getLabel().getHeightValue();
                                            intGraph.setLabel( boundary, displayName, labelConfiguration );
                                            var changedHeight = boundary.getLabel().getHeightValue();
                                            if( originalHeight !== changedHeight ) {
                                                adjustBoundarySize();
                                            }
                                        }
                                    }
                                }
                            } );
                        } else if( modelObj.uid === systemOfInterest.nodeObject.uid ) {
                            _.forEach( boundaries, function( boundary ) {
                                var text = boundary.getLabel().getText();
                                if( modelObj.props[ label ] ) {
                                    displayName = modelObj.props[ label ].uiValues[ 0 ];
                                    if( boundary.modelObject.uid === systemOfInterest.nodeObject.uid ) {
                                        if( text !== displayName ) {
                                            var originalHeight = boundary.getLabel().getHeightValue();
                                            intGraph.setLabel( boundary, displayName, labelConfiguration );
                                            var changedHeight = boundary.getLabel().getHeightValue();
                                            if( originalHeight !== changedHeight ) {
                                                adjustBoundarySize();
                                            }
                                        }
                                    }
                                }
                            } );
                        }
                    } );
                }
            }
        }
    }
};

export default exports = {
    NODE_HOVERED_CLASS,
    clearGraphSelection,
    updateGraphView,
    graphObjectDoubleClicked,
    setDiagramSelection,
    setDiagramHover,
    clearGraphView,
    updateFromInfoPanel
};
app.factory( 'Ase1InterfacesGraphService', () => exports );
