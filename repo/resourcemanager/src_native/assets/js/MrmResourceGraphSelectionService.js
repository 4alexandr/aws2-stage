//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/MrmResourceGraphSelectionService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import selectionService from 'js/selection.service';
import RBService from 'js/Rv1RelationBrowserService';
import drawEdgeService from 'js/MrmResourceGraphDrawEdge';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import graphPaths from 'js/graphPathsService';
import mrmResourceGraphUtils from 'js/MrmResourceGraphUtils';

var exports = {};

var NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';
var TEXT_HOVERED_CLASS = 'relation_text_hovered_style_svg';
var NODE_DEFAULT_CLASS = 'aw-graph-noeditable-area';

var _firstSelectedNode = null; // This is to maintain the first selected node to support finding the path between two selected nodes.  See graphMultiSelect() below.
var _previouslySelectedItems = []; // This is to support the selection algorithm in graphSelectionChanged() below.  It holds the items in the selected state the previous time graphSelectionChanged() was called.

/** -------------------------------------------------------------------
 * Keep track of the first node selected.  It is used for helping with the
 * behavior of shift-click path selection, etc.
 *
 * @param {Object} graphModel - The graph model object.
 */
function setFirstSelection( graphModel ) {
    var selectedNodes = graphModel.graphControl.getSelected( 'Node' );
    if( selectedNodes.length === 0 ) {
        _firstSelectedNode = null;
    } else if( selectedNodes.length === 1 ) {
        _firstSelectedNode = selectedNodes[ 0 ];
    }
}

/** -------------------------------------------------------------------
 * Update the AW selection service so it knows about the element(s) selected.
 * The AW selection service keeps the model object so it can be used elsewhere
 * to show data from the selected object.
 * If more than one node is selected, the last selected node of the graph is used.
 *
 * @param {Object} graphModel - The graph model object
 * @param {Object} eventData - The list of nodes and edges currently selected in the graph
 */
function updateAWSelectionService( graphModel, selectedItems, selectionModel ) {
    if( selectionModel ) {
        if( selectedItems.length >= 1 ) {
            var selectedNodesUids = [];
            _.forEach( selectedItems, function( selectedObject ) {
                if( selectedObject.getItemType() === 'Node' ) {
                    var selectedNodeUid = selectedObject.appData.nodeObject.uid;
                    if( !selectedNodesUids.includes( selectedNodeUid ) ) {
                        selectedNodesUids.push( selectedNodeUid );
                    }
                }
            } );
            if( selectedNodesUids.length <= 0 ) {
                selectedNodesUids.push( graphModel.resourceRootId );
            }

            selectionModel.setSelection( selectedNodesUids );
        } else if( graphModel.numSelected === 0 ) { // User has deselected everything.
            selectionModel.setSelection( graphModel.resourceRootId );
        }
    }
}

/** -------------------------------------------------------------------
 * Handle the awGraph.selectionChanged event.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - data pertinent to the selectionChanged event.  @see setSelected() in graphControlFactory.js
 */
export let graphSelectionChanged = function( graphModel, eventData, selectionModel ) {
    try {
        var selectedItems = graphModel.graphControl.getSelected();
        graphModel.numSelected = selectedItems.length;

        var theOccmgmtContext = appCtxSvc.ctx.aceActiveContext.context;
        theOccmgmtContext.isRootOrSubAssemblyNodeInSelection = isRootOrSubAssemblyNodeInSelection(selectedItems);

        // Unset the hover style from all nodes and edges that are, or were, selected.  Otherwise, nodes that get
        // unselected could still have the hover style.
        setHoverStyles( graphModel, _.union( selectedItems, eventData.unSelected ), false );

        setFirstSelection( graphModel );
        updateAWSelectionService( graphModel, selectedItems, selectionModel );

        // Handle edges: Highlighting and selection of their source and target nodes.
        // --
        // --!! The selected state returned by getSelected() appears to be accurate and includes all newly selected items and excludes
        // --!! all newly unselected items present in eventData.
        // Don't do any programmatic selection or unselection of edges - only src and target nodes.
        // 1) Based on edges currently selected, determine if there are any more nodes that should be selected, and select those.
        // 2) Based on edges newly unselected, determine if there are any more nodes that should be unselected.
        // Set the edge style (sets to hovered) for all selected edges.  Unset this style for all newly unselected edges.
        // The lists from 1) and 2) may contain more than needed.  E.g., don't remove nodes if they are also listed in the nodes-to-be-added.
        // + There is one special case.  After a single edge and its nodes are selected, clicking one of the already selected nodes should
        //   result in only that node being selected.  stillSelectedNodes below helps resolve this.  Otherwise, it might be necessary to
        //   have reference counting on nodes connected to multiple edges to know whether they should be turned off or on.
        // --
        // Separate out nodes vs edges before hand to simplify the code following.
        var currentSelectedItems = _.partition( selectedItems, function( o ) { return typeof o.appData.edgeObject !== 'undefined'; } );
        var currentSelectedEdges = currentSelectedItems[ 0 ];
        var currentSelectedNodes = currentSelectedItems[ 1 ];
        var newlyUnselectedItems = _.partition( eventData.unSelected, function( o ) { return typeof o.appData.edgeObject !== 'undefined'; } );
        var newlyUnselectedEdges = newlyUnselectedItems[ 0 ];
        var newlyUnselectedNodes = newlyUnselectedItems[ 1 ];

        var addTheseNodes = [];
        if( currentSelectedEdges.length > 0 ) {
            for( var idx = 0; idx < currentSelectedEdges.length; idx++ ) {
                drawEdgeService.setEdgeStyle( graphModel, currentSelectedEdges[ idx ], true ); // Just the edge style.  _Node_ selected-style is set via binding in the HTML
                addTheseNodes.push( currentSelectedEdges[ idx ].getSourceNode(), currentSelectedEdges[ idx ].getTargetNode() );
            }
            addTheseNodes = _.uniq( addTheseNodes );
        }
        var removeTheseNodes = [];
        if( newlyUnselectedEdges.length > 0 ) {
            for( var jdx = 0; jdx < newlyUnselectedEdges.length; jdx++ ) {
                drawEdgeService.setEdgeStyle( graphModel, newlyUnselectedEdges[ jdx ], false ); // Just the edge style.  _Node_ selected-style is set via binding in the HTML
                removeTheseNodes.push( newlyUnselectedEdges[ jdx ].getSourceNode(), newlyUnselectedEdges[ jdx ].getTargetNode() );
            }
            removeTheseNodes = _.uniq( removeTheseNodes );
        }

        var stillSelectedNodes = _.intersection( _previouslySelectedItems, currentSelectedNodes );

        _.pullAll( removeTheseNodes, addTheseNodes ); // Pull out nodes that should still be selected because they have a selected edge still connecting them.
        _.pullAll( removeTheseNodes, newlyUnselectedNodes ); // Pull out nodes that are already unselected in the graph.
        if( stillSelectedNodes.length === 1 ) {
            _.pullAll( removeTheseNodes, stillSelectedNodes ); // See explanation above (+).
        }
        _.pullAll( addTheseNodes, currentSelectedNodes ); // Pull out nodes that are already selected in the graph.

        if( removeTheseNodes.length > 0 ) {
            graphModel.graphControl.setSelected( removeTheseNodes, false );
        }
        if( addTheseNodes.length ) {
            graphModel.graphControl.setSelected( addTheseNodes, true );
        }

        _previouslySelectedItems = selectedItems;

        mrmResourceGraphUtils.showHideAddCommandsOnSelection(graphModel);
    } catch ( ex ) {
        logger.error( ex );
    }
};

/**
 * @return true if current selection contains a top component or sub component from sub assembly.
 */
function isRootOrSubAssemblyNodeInSelection(selectedItems) {
    var rootOrSubAssemblyNodeInSelection = false;
    if (selectedItems.length >= 1) {
        if (appCtxSvc.ctx.aceActiveContext.context.topElement) {
            var topElementUID = appCtxSvc.ctx.aceActiveContext.context.topElement.uid;
            _.forEach(selectedItems, function (selectedObject) {
                if (selectedObject.getItemType() === 'Node') {
                    var selectedNode = selectedObject.appData.nodeObject;
                    if (topElementUID === selectedNode.uid || topElementUID !== selectedNode.props.awb0Parent.dbValues[0]) {
                        rootOrSubAssemblyNodeInSelection = true;
                        return;
                    }
                }
            });
        }
    }

    return rootOrSubAssemblyNodeInSelection;
}

/** -------------------------------------------------------------------
 * Find and select all nodes in the paths through the graph from one node to another, parent to child.
 */
function graphFindPath( graphModel, selectedElements, firstNode, lastNode ) {
    RBService.licenseCheck().then( function() {
        // Set the unhovered style on all selected elements and then unselect all.
        setHoverStyles( graphModel, selectedElements, false );
        graphModel.graphControl.setSelected( null, false );

        // Passing null in getPaths to use the default supplied "getNextLevelEdges" method.  It
        // only traces through outbound edges, so since the order of the selected nodes depends
        // on the order of selection, one way may fail, in which case we try the other order.
        // The return value is an array of path arrays.  No need to process if we're only working
        // with a node and its child.
        var paths = graphPaths.getPaths( firstNode, lastNode, null );
        if( !paths || paths.length === 0 ) {
            paths = graphPaths.getPaths( lastNode, firstNode, null );
        }
        var allNodesInPath = [];
        if( paths ) {
            for( var i = 0; i < paths.length; ++i ) {
                var nodeList = paths[ i ].filter( function( elm ) { return  typeof elm.getItemType === 'function'  &&  elm.getItemType() === 'Node'; } );
                allNodesInPath = _.union( allNodesInPath, nodeList );
            }
        }
        if( allNodesInPath.length > 1 ) {
            graphModel.graphControl.setSelected( allNodesInPath, true );
        } else {
            graphModel.graphControl.setSelected( [ firstNode ], true );
        }
    } );
}

/** -------------------------------------------------------------------
 * Handle multi-selection, both for shift and cntrl keys down.  Ctrl key multi-select
 * is handled by the GC, so here, just weed it out for shift select find-all-in-path behavior.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - data pertinent to the event
 */
export let graphMultiSelect = function( graphModel, eventData ) {
    if( !graphModel || !eventData || eventData.isCtrlKeyDown ) {
        return;
    }

    try {
        var selectedElements = graphModel.graphControl.getSelected();
        var selectedNodes = selectedElements.filter( function( elem ) { return elem.getItemType() === 'Node'; } );

        if( _firstSelectedNode && selectedNodes && selectedNodes.length >= 2 ) {
            var lastNode = selectedNodes[ selectedNodes.length - 1 ];
            graphFindPath( graphModel, selectedElements, _firstSelectedNode, lastNode );
        }
    } catch ( ex ) {
        logger.debug( ex );
    }
};

/** -------------------------------------------------------------------
 * Set the hovered style of a node.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} nodes - the graph nodes on which to apply a style
 * @param {String} isHovered - true if the node is being hovered over
 *
 * Applying a node style, as is done here, is a two step process.  First, update the relevant properties kept by
 * the node.  Then call updateNodeBinding to apply properties to the SVG/DOM.
 * Node (fill, stroke, etc.) and text styling will be specified in the single node-hovered styling class in graphModel.hoverStyle.node.
 */
function setNodeHoverStyle( graphModel, nodes, isHovered ) {
    for( var i = 0; i < nodes.length; i++ ) {
        var node = nodes[ i ];
        if( node ) {
            var bindingData = {};

            if( isHovered ) {
                bindingData[ NODE_HOVERED_CLASS ] = graphModel.hoverStyle.node;
                bindingData[ TEXT_HOVERED_CLASS ] = graphModel.hoverStyle.node;
            } else {
                bindingData[ NODE_HOVERED_CLASS ] = NODE_DEFAULT_CLASS;
                bindingData[ TEXT_HOVERED_CLASS ] = '';
            }

            graphModel.graphControl.graph.updateNodeBinding( node, bindingData );
        }
    }
}

/** -------------------------------------------------------------------
 * Set the style of an edge and the associated nodes to hovered, or standard depending on parameter isHovered.
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Object} edge - The edge on which to set the style.
 * @param {String} isHovered - true if the edge is being hovered over.
 */
function setEdgeHoverStyle( graphModel, edge, isHovered ) {
    if( !edge.style ) {
        return;
    }

    drawEdgeService.setEdgeStyle( graphModel, edge, isHovered );
    setNodeHoverStyle( graphModel, [ edge.getSourceNode(), edge.getTargetNode() ], isHovered );
}

/** -------------------------------------------------------------------
 * Set the hover style for multiple nodes and edges.
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Array<Object>} elements - The array of nodes and edges on which to set the style.
 * @param {boolean} isHovered - true if the element is being hovered over.
 */
function setHoverStyles( graphModel, elements, isHovered ) {
    if( !elements || elements.length === 0 ) {
        return;
    }
    var edges = elements.filter( function( elem ) { return elem && elem.getItemType() === 'Edge'; } );
    var nodes = elements.filter( function( elem ) { return elem && elem.getItemType() === 'Node'; } );
    for( var i = 0; i < edges.length; i++ ) {
        nodes.push( edges[ i ].getSourceNode() );
        nodes.push( edges[ i ].getTargetNode() );
        drawEdgeService.setEdgeStyle( graphModel, edges[ i ], isHovered );
    }
    nodes = _.uniq( nodes );
    setNodeHoverStyle( graphModel, nodes, isHovered );
}

/**
 * Checks if multiple nodes are selected.
 *
 * @param {Object} graphModel - The graph model object.
 */
function isMultipleNodeSelected(graphModel) {
    var selectedElements = graphModel.graphControl.getSelected();
    var selectedNodes = selectedElements.filter(function (elem) { return elem.getItemType() === 'Node'; });

    if (selectedNodes && selectedNodes.length > 1) {
        return true;
    }
    return false;
}

/** -------------------------------------------------------------------
 * Graph hover-changed handler
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - contains the hovered and/or unhovered items from the graph
 */
export let graphHoverChanged = function (graphModel, eventData) {
    try {
        if (!graphModel || !eventData) {
            return;
        }
        var unHoveredItem = eventData.unHoveredItem;
        var hoveredItem = eventData.hoveredItem;

        if (unHoveredItem) {
            if (!unHoveredItem.isSelected() || isMultipleNodeSelected(graphModel)) {
                if (unHoveredItem.getItemType() === 'Edge') {
                    setEdgeHoverStyle(graphModel, unHoveredItem, false);
                } else if (unHoveredItem.getItemType() === 'Node') {
                    setNodeHoverStyle(graphModel, [unHoveredItem], false);
                    mrmResourceGraphUtils.showHideAddCommandsOnMouseHovered(graphModel, hoveredItem, false);
                }
            }
        }

        if (hoveredItem) {
            if (!hoveredItem.isSelected() || isMultipleNodeSelected(graphModel)) {
                if (hoveredItem.getItemType() === 'Edge') {
                    setEdgeHoverStyle(graphModel, hoveredItem, true);
                } else if (hoveredItem.getItemType() === 'Node') {
                    setNodeHoverStyle(graphModel, [hoveredItem], true);
                    mrmResourceGraphUtils.showHideAddCommandsOnMouseHovered(graphModel, hoveredItem, true);
                }
            }
        }

    } catch (ex) {
        logger.debug(ex);
    }
};

/** -------------------------------------------------------------------
 * MrmResourceGraphSelectionService factory
 */

export default exports = {
    graphSelectionChanged,
    graphMultiSelect,
    graphHoverChanged
};
app.factory( 'MrmResourceGraphSelectionService', () => exports );
