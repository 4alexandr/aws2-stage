//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * Ase0RemoveFromDiagramService Removes nodes from diagram
 *
 * @module js/Ase0RemoveFromDiagramService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import architectureLayoutService from 'js/Ase0ArchitectureLayoutService';
import utilSvc from 'js/Ase0ArchitectureUtilService';
import cmm from 'soa/kernel/clientMetaModel';
import archNodeService from 'js/Ase0ArchitectureNodeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import fadeNodeAnimation from 'js/fadeNodeAnimation';
import templateService from 'js/Ase0ArchitectureGraphTemplateService';

var exports = {};

var FADE_TIMER = 2000;
var nodeAnimationMap = {};

/**
 * Check if Toggle off element is anchor
 * @param {Object} eventData data required to toggle off node
 * @param {Object} data view model data
 */
export let isToggleOffElementAnchor = function( eventData, data ) {
    data.selectedAnchorNodes = [];
    data.nodeContainsAnchor = false;
    data.nodeExpandedOrHasRelation = false;
    data.msgCount = 0;
    var msgCount = 0;
    if( eventData && eventData.elementsToRemove && eventData.elementsToRemove.length > 0 ) {
        var graphModel = appCtxService.ctx.graph.graphModel;
        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;
        var visibleNodes = graph.getVisibleNodes();
        if( visibleNodes.length === 1 ) {
            return;
        }

        _.forEach( eventData.elementsToRemove, function( element ) {
            var elementToRemove = graphModel.nodeMap[ element.uid ];
            if( elementToRemove ) {
                if( elementToRemove.isRoot() ) {
                    data.selectedAnchorNodes.push( elementToRemove );
                    data.nodeExpandedOrHasRelation = isNodeHasVisibleRelations( elementToRemove ) || isNodeExpanded( elementToRemove, graphModel );
                } else {
                    if( cmm && !cmm.isInstanceOf( 'Awb0Connection', elementToRemove.modelObject.modelType ) ) {
                        isNodeContainsAnchor( elementToRemove, data, graphModel );
                    }
                }
            }
            if( data.nodeExpandedOrHasRelation || data.nodeContainsAnchor ) {
                ++msgCount;
            }
        } );
    }
    data.msgCount = msgCount;
};

var isNodeContainsAnchor = function( selectedNode, data, graphModel ) {
    if( selectedNode ) {
        traverse( selectedNode, data, graphModel );
    }
};

/**
 * traverse all childs
 * @param {Object} node graph item
 * @param {Object} data graph item
 * @param {Object} graphModel graph model
 */
function traverse( node, data, graphModel ) {
    if( graphModel && node ) {
        var groupGraph = graphModel.graphControl.groupGraph;
        if( groupGraph.isGroup( node ) && groupGraph.isExpanded( node ) ) {
            var childrens = groupGraph.getChildNodes( node );
            if( childrens ) {
                _.forEach( childrens, function( child ) {
                    if( child.isRoot() ) {
                        data.nodeContainsAnchor = true;
                        return false;
                    } else if( groupGraph.isGroup( child ) && groupGraph.isExpanded( child ) ) {
                        traverse( child, data );
                    }
                } );
            }
        }
    }
}

var isNodeHasVisibleRelations = function( selectedNode ) {
    if( selectedNode ) {
        var edges = selectedNode.getEdges();
        var visibleEdges = _.find( edges, function( edge ) {
            return edge.isVisible();
        } );
        if( visibleEdges ) {
            return true;
        }
    }
    return false;
};

var isNodeExpanded = function( selectedNode, graphModel ) {
    if( selectedNode && graphModel ) {
        var groupGraph = graphModel.graphControl.groupGraph;
        if( groupGraph && groupGraph.isGroup( selectedNode ) && groupGraph.isExpanded( selectedNode ) ) {
            return true;
        }
    }
    return false;
};

/**
 * Toggle off element from ace
 *
 * @param {Object} data required to get primary object excluded list.
 *@param {Object} eventData data required to toggle off node
 */
export let toggleOffVisibility = function( data, eventData ) {
    //User is trying to toggle off in diagram
    var elementsToRemove = [];
    elementsToRemove = _.clone( eventData.elementsToRemove );

    if( elementsToRemove && elementsToRemove.length > 0 ) {
        // Set this flag to check if Item is removed not deleted from Diagram.
        if( !data.isItemRemovedFromDiagram ) {
            data.isItemRemovedFromDiagram = true;
        }

        if( eventData.isFadeRequired ) {
            startAnimation( elementsToRemove );
        } else {
            removeObjectsFromDiagram( elementsToRemove );
        }
    }
};

/**
 * API to remove items from graph.
 *
 * @param {Object} elements elements to remove from diagram
 */
export let removeElementsFromDiagram = function( elements ) {
    removeObjectsFromDiagram( elements );
};

var processEdgesForRemoval = function( edges, itemsToRemove ) {
    var affectedNodeList = [];
    if( edges && edges.length > 0 ) {
        _.forEach( edges, function( edge ) {
            var srcNode = edge.getSourceNode();
            if( srcNode && srcNode.isVisible() && _.indexOf( itemsToRemove, srcNode ) === -1 ) {
                affectedNodeList.push( srcNode );
            }
            var tarNode = edge.getTargetNode();
            if( tarNode && tarNode.isVisible() && _.indexOf( itemsToRemove, tarNode ) === -1 ) {
                affectedNodeList.push( tarNode );
            }
        } );
    }
    return affectedNodeList;
};

/**
 * It will remove Graph Items from Diagram.
 *
 * @param {Object} elements elements to remove from diagram
 */
var removeObjectsFromDiagram = function( elements ) {
    if( !elements || elements.length < 1 ) {
        return;
    }

    var graphModel = appCtxService.ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;

    // First Remove From Graph
    var itemsToRemove = [];
    var nodesToRemove = [];
    var edgesToRemove = [];
    var nodesToCheckForNormal = [];

    architectureLayoutService.clearGraphItemLists();
    _.forEach( elements, function( element ) {
        var elementToRemove;
        elementToRemove = graphModel.nodeMap[ element.uid ];
        if( elementToRemove ) {
            itemsToRemove.push( elementToRemove );
            nodesToRemove.push( elementToRemove );
            var parent = graphControl.groupGraph.getParent( elementToRemove );
            if( parent ) {
                architectureLayoutService.addNodeToFitAncestors( parent );
                nodesToCheckForNormal.push( parent );
            }
        } else {
            elementToRemove = graphModel.portMap[ element.uid ];
            if( elementToRemove ) {
                itemsToRemove.push( elementToRemove );
            } else {
                var isTracelink = false;
                var tracelinksToRemove = [];
                isTracelink = cmm.isInstanceOf( 'FND_TraceLink', element.modelType );
                if( isTracelink ) {
                    var keys = Object.keys( graphModel.edgeMap );
                    _.forEach( keys, function( key ) {
                        if( key.indexOf( element.uid ) !== -1 ) {
                            var edgeObj = graphModel.edgeMap[ key ];
                            if( edgeObj ) {
                                tracelinksToRemove.push( edgeObj );
                            }
                        }
                    } );
                    if( tracelinksToRemove.length > 0 ) {
                        _.forEach( tracelinksToRemove, function( traceLink ) {
                            itemsToRemove.push( traceLink );
                            edgesToRemove.push( traceLink );
                        } );
                    }
                } else {
                    elementToRemove = graphModel.edgeMap[ element.uid ];
                }
                if( elementToRemove ) {
                    itemsToRemove.push( elementToRemove );
                    edgesToRemove.push( elementToRemove );
                    var sourceItem = elementToRemove.getSourcePort();
                    var targetItem = elementToRemove.getTargetPort();

                    if( sourceItem && sourceItem.getConnections().length === 1 ) {
                        itemsToRemove.push( sourceItem );
                    }
                    if( targetItem && targetItem.getConnections().length === 1 ) {
                        itemsToRemove.push( targetItem );
                    }
                }
            }
        }
    } );

    if( itemsToRemove.length > 0 ) {
        itemsToRemove = _.uniq( itemsToRemove );
        var unConnectedItems = utilSvc.getUnconnectedItems( graphModel, nodesToRemove, edgesToRemove );
        if( unConnectedItems && unConnectedItems.length > 0 ) {
            _.forEach( unConnectedItems, function( unConnectedItem ) {
                itemsToRemove.push( unConnectedItem );
            } );
        }

        var affectedNodeList = [];
        var edgesToBeRemoved = [];
        itemsToRemove = _.uniq( itemsToRemove );
        _.forEach( itemsToRemove, function( itemToRemove ) {
            if( itemToRemove.getItemType() === 'Node' ) {
                var parentNode = graphControl.groupGraph.getParent( itemToRemove );
                if( parentNode && parentNode.isVisible() && _.indexOf( itemsToRemove, parentNode ) === -1 ) {
                    affectedNodeList.push( parentNode );
                }
                var edges = archNodeService.getVisibleEdgesAtNode( itemToRemove, 'BOTH' );
                edgesToBeRemoved = edgesToBeRemoved.concat( edges );
                var children = archNodeService.getAllLevelChildNodes( itemToRemove );
                if( children && children.length > 0 ) {
                    _.forEach( children, function( childNode ) {
                        var childEdges = archNodeService.getVisibleEdgesAtNode( childNode, 'BOTH' );
                        if( childEdges && childEdges.length > 0 ) {
                            edgesToBeRemoved = edgesToBeRemoved.concat( childEdges );
                        }
                    } );
                }
            } else if( itemToRemove.getItemType() === 'Edge' ) {
                edgesToBeRemoved.push( itemToRemove );
            } else if( itemToRemove.getItemType() === 'Port' && itemToRemove.modelObject ) {
                var portEdges = itemToRemove.getEdges( 'BOTH' );
                edgesToBeRemoved = edgesToBeRemoved.concat( portEdges );
            }
        } );

        // Calculate affected nodes on removal of edges from diagram
        affectedNodeList = affectedNodeList.concat( processEdgesForRemoval( edgesToBeRemoved, itemsToRemove ) );

        var removedItems = graph.removeItems( itemsToRemove, true );

        // Remove nodesToRemove from nodesToCheckForNormal
        nodesToCheckForNormal = _.difference( nodesToCheckForNormal, removedItems.nodes );
        // Remove nodesToRemove from NodesToFitAncestors
        _.forEach( removedItems.nodes, function( node ) {
            architectureLayoutService.removeNodeToFitAncestors( node );
            architectureLayoutService.addNodeToBeRemoved( node );
        } );

        architectureLayoutService.addEdgeToBeRemoved( removedItems.edges );
        architectureLayoutService.addPortToBeRemoved( removedItems.ports );

        _.forEach( nodesToCheckForNormal, function( node ) {
            // Check if it has no children and add to nodes to convert to normal node.
            var children = groupGraph.getChildNodes( node );
            if( !children || children.length === 0 ) {
                var nodeObject = node.modelObject;
                if( graphModel && nodeObject ) {
                    //update group node to normal node
                    var props = templateService.getBindPropertyNames( nodeObject );
                    var nodeStyle = templateService.getNodeTemplate( graphModel.nodeTemplates,
                        props, false );
                    var bindData = {
                        HEADER_HEIGHT: 0
                    };
                    graph.setNodeStyle( node, nodeStyle, bindData );
                    groupGraph.setExpanded( node, false );
                    groupGraph.setAsLeaf( node );
                    graph.setBounds( node, node.getResizeMinimumSize() );
                    architectureLayoutService.addNodeToBecomeNormal( node );
                }
            }
        } );

        if( removedItems.nodes && removedItems.nodes.length > 0 && affectedNodeList.length > 0 ) {
            _.forEach( removedItems.nodes, function( node ) {
                var index = affectedNodeList.indexOf( node );
                if( index !== -1 ) {
                    affectedNodeList.splice( index, 1 );
                }
            } );
        }

        if( affectedNodeList && affectedNodeList.length > 0 ) {
            affectedNodeList = _.uniq( affectedNodeList );
            //fire graph node degree update event
            eventBus.publish( 'AMDiagram.updateGraphNodeDegree', {
                affectedNodeList: affectedNodeList
            } );
        }
    }

    architectureLayoutService.applyGraphLayout( graphModel, true /* Not used if later 2 are false */, false, false );
};

/**
 *  Start node animation
 *
 * @param {Object} elementsToRemove array of elements to be removed
 */
var startAnimation = function( elementsToRemove ) {
    var graphModel = appCtxService.ctx.graph.graphModel;
    if( elementsToRemove.length > 0 ) {
        _.forEach( elementsToRemove, function( element ) {
            var node;
            if( graphModel.nodeMap[ element.uid ] ) {
                node = graphModel.nodeMap[ element.uid ];
                if( !nodeAnimationMap[ element.uid ] ) {
                    var nodeAnimationHandler = fadeNodeAnimation.fadeNode( node, FADE_TIMER, function finishCallback() {
                        if( nodeAnimationMap[ element.uid ] ) {
                            delete nodeAnimationMap[ element.uid ];
                            removeObjectsFromDiagram( [ element ] );
                        }
                    } );
                    nodeAnimationMap[ element.uid ] = nodeAnimationHandler;
                } else {
                    var nodeAnimationHandler1 = nodeAnimationMap[ element.uid ];
                    delete nodeAnimationMap[ element.uid ];
                    nodeAnimationHandler1.cancel( function cancelCallback() {
                        // do nothing
                    } );
                }
            }
        } );
    }
};

/**
 * Register Ase0RemoveFromDiagramService
 *
 * @member Ase0RemoveFromDiagramService
 * @param {object} appCtxService context service
 * @param {object} architectureLayoutService architecture layout service
 * @param {object} utilSvc architecture util service
 * @param {object} cmm soa client meta model
 * @param {object} archNodeService node service
 * @returns {object} Ase0RemoveFromDiagramService handler service
 *
 */

export default exports = {
    isToggleOffElementAnchor,
    toggleOffVisibility,
    removeElementsFromDiagram
};
app.factory( 'Ase0RemoveFromDiagramService', () => exports );
