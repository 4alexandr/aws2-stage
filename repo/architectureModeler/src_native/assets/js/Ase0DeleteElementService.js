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
 * Ase0DeleteElementService Deletes nodes/ports/edges from diagram
 *
 * @module js/Ase0DeleteElementService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import toolTipHandler from 'js/Ase0ArchitectureGraphTooltipHandler';
import architectureLayoutService from 'js/Ase0ArchitectureLayoutService';
import utilSvc from 'js/Ase0ArchitectureUtilService';
import dataCacheSvc from 'js/Ase0ArchitectureDataCache';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import templateService from 'js/Ase0ArchitectureGraphTemplateService';

var exports = {};

/**
 * Deletes nodes/ports/edges
 *
 * @param {Object} data required to get primary object excluded list.
 */
export let deleteElement = function( data ) {
    // clear m_selObjects
    var m_selObjects = appCtxService.ctx.mselected;
    var elementsToBeProcessedForRemoval = [];
    var newListOfElementsToBeProcessedForRemoval = [];
    var elementsToBeDeleted = [];

    if( m_selObjects && m_selObjects.length > 0 ) {
        elementsToBeProcessedForRemoval.push.apply( elementsToBeProcessedForRemoval, m_selObjects );
        if( elementsToBeProcessedForRemoval && elementsToBeProcessedForRemoval.length > 0 ) {
            if( hasUserMadeSelectionsAcrossLevelsInStructure( elementsToBeProcessedForRemoval ) ) {
                newListOfElementsToBeProcessedForRemoval = filterOutElementsIfParentIsAlreadyPresentInSelectionsList(
                    elementsToBeProcessedForRemoval );
            }
        }
    }

    if( newListOfElementsToBeProcessedForRemoval && newListOfElementsToBeProcessedForRemoval.length > 0 ) {
        elementsToBeDeleted.push.apply( elementsToBeDeleted, newListOfElementsToBeProcessedForRemoval );
    } else {
        elementsToBeDeleted.push.apply( elementsToBeDeleted, m_selObjects );
    }

    cacheDataBeforeDelete( data, elementsToBeDeleted );

    // Get all visible elements on Graph
    var visibleObjects = getAllNodesOnGraph();

    var m_addRootNode = false;

    // check if diagram becomes empty after remove
    if( visibleObjects && visibleObjects.length > 0 ) {
        if( elementsToBeDeleted.length > 0 ) {
            _.forEach( elementsToBeDeleted, function( element ) {
                if( _.indexOf( visibleObjects, element ) !== -1 ) {
                    m_addRootNode = isDiagramBecomeEmptyAfterRemove( elementsToBeDeleted );
                    return false;
                }
            } );
        }
    }

    var m_rootNode;
    if( m_addRootNode ) {
        var occMgmnt = appCtxService.getCtx( "occmgmtContext" );
        var openedObject = occMgmnt.openedElement;
        m_rootNode = getRootElement( openedObject );
    }

    // Call SOA TO Delete Element
    callAddAndDeleteElementSOA( visibleObjects, elementsToBeDeleted, m_rootNode );
};

/**
 * Get display Properties for delete traceLink
 *
 * @param {Array} selectedEdges selected traceLink
 * @return {Object} root element
 */
export let populateRemoveTraceLinkInformation = function( selectedEdges ) {
    var selectedTracelinks = [];
    var edgeMap = appCtxService.ctx.graph.graphModel.edgeMap;
    if( selectedEdges && selectedEdges.length > 0 ) {
        _.forEach( selectedEdges, function( element ) {
            var edgeUid = element.uid;
            if( element.modelType ) {
                if( cmm.isInstanceOf( 'FND_TraceLink', element.modelType ) ) {
                    var keys = Object.keys( edgeMap );
                    _.forEach( keys, function( key ) {
                        if( key.indexOf( edgeUid ) !== -1 ) {
                            var edgeObj = edgeMap[ key ];
                            if( edgeObj ) {
                                selectedTracelinks.push( edgeObj );
                            }
                        }
                    } );
                }
            }
        } );
    }

    var label = "";
    if( selectedTracelinks.length === 1 ) {
        var selectedTracelink = selectedTracelinks[ 0 ];
        var graphModel = appCtxService.ctx.graph.graphModel;
        label = toolTipHandler.getTooltip( selectedTracelink, graphModel );
    }

    var outPutData = {
        selectedTraceLinks: selectedTracelinks,
        label: label
    };

    return outPutData;
};

/**
 * Get root object of the product using opened element
 *
 * @param {Object} openedObject open object
 * @return {Object} root element
 */
var getRootElement = function( openedObject ) {
    var parent = openedObject;
    var root;
    while( parent ) {
        root = parent;
        parent = getParentOccurrence( parent );
    }
    return root;
};

/**
 * It checks whether diagram going to become empty after removing elements.Return true if diagram become empty else
 * return false
 *
 * @param {Array} elementsToBeDeleted objects to be deleted
 * @return {boolean} true/false
 */
var isDiagramBecomeEmptyAfterRemove = function( elementsToBeDeleted ) {
    var graphModel = appCtxService.ctx.graph.graphModel;
    var isDiagEmpty = false;
    var listAnchorUids = graphModel.rootNodeList;

    if( elementsToBeDeleted.length > 0 ) {
        _.forEach( elementsToBeDeleted, function( element ) {
            var index = _.indexOf( listAnchorUids, element.uid );
            if( index !== -1 ) {
                _.pullAt( listAnchorUids, index );
            }
        } );
    }

    var anchorUids = listAnchorUids;
    _.forEach( anchorUids, function( uid ) {
        var node = graphModel.nodeMap[ uid ];
        var iModelObject = null;
        if( node ) {
            iModelObject = node.modelObject;
        }
        var objectsListInHeirachy = [];
        if( iModelObject && iModelObject !== null ) {
            objectsListInHeirachy = getObjectHierarchy( iModelObject );
        }

        _.forEach( elementsToBeDeleted, function( element ) {
            var index = _.indexOf( objectsListInHeirachy, element );
            if( index !== -1 ) {
                _.pullAt( listAnchorUids, index );
                return false;
            }
        } );
    } );

    if( listAnchorUids && listAnchorUids.length === 0 ) {
        isDiagEmpty = true;
    }

    return isDiagEmpty;
};

/**
 * It return the list of visible objects present in graph.
 *
 * @return {Array} list of visible Objects on graph
 */
var getAllNodesOnGraph = function() {

    // Get all nodes on graph and send them to server, so that server can use them to build paths
    var graphModel = appCtxService.ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var visibleObjects = [];

    var allNodeModels = graph.getVisibleNodes();
    _.forEach( allNodeModels, function( nodeModel ) {
        visibleObjects.push( nodeModel.modelObject );
    } );

    var allPortModels = graph.getVisiblePorts();
    _.forEach( allPortModels, function( portModel ) {
        visibleObjects.push( portModel.modelObject );
    } );

    var allEdgeModels = graph.getVisibleEdges();
    _.forEach( allEdgeModels, function( edgeModel ) {
        visibleObjects.push( edgeModel.modelObject );
    } );

    return visibleObjects;
};

/**
 * Maintains a cache of objects to be deleted.
 * @param {Object} data data object.
 * @param {Array} elementsToBeDeleted objects to be deleted
 */
var cacheDataBeforeDelete = function( data, elementsToBeDeleted ) {

    var graphModel = appCtxService.ctx.graph.graphModel;
    var removeElementUids = [];
    var deletedPortUids = [];
    var deletedTracelinkUids = [];

    _.forEach( elementsToBeDeleted, function( element ) {
        removeElementUids.push( element.uid );

        var port = graphModel.portMap[ element.uid ];
        if( port && port.getItemType() === "Port" ) {
            deletedPortUids.push( element.uid );
        }
        if( cmm.isInstanceOf( 'FND_TraceLink', element.modelType ) ) {
            deletedTracelinkUids.push( element.uid );
        }
    } );

    data.removeElementUids = removeElementUids;
    data.deletedPortUids = deletedPortUids;
    data.deletedTracelinkUids = deletedTracelinkUids;
};

var processForEdgesRemoval = function( edges, nodesToRemove ) {
    var affectedNodeList = [];
    if( edges && edges.length > 0 ) {
        _.forEach( edges, function( edge ) {
            if( edge.modelObject && edge.category && edge.category.localeCompare( "Structure" ) !== 0 ) {
                var edgeType = edge.edgeType;
                var srcNode = edge.getSourceNode();
                var tarNode = edge.getTargetNode();
                var srcPort = edge.getSourcePort();
                var tarPort = edge.getTargetPort();
                var srcCategoryToRemove = "";
                var tarCategoryToRemove = "";
                var srcNodeType = null;
                var tarNodeType = null;
                var isSourcePortDirectionOutput = false;
                var isTargetPortDirectionInput = false;
                var isValidSrcPort = false;
                var isValidTarPort = false;

                if( srcNode ) {
                    if( _.indexOf( nodesToRemove, srcNode ) === -1 ) {
                        affectedNodeList.push( srcNode );
                    }
                    srcNodeType = srcNode.nodeType;
                }
                if( tarNode ) {
                    if( _.indexOf( nodesToRemove, tarNode ) === -1 ) {
                        affectedNodeList.push( tarNode );
                    }
                    tarNodeType = tarNode.nodeType;
                }

                if( edgeType && srcNodeType ) {
                    srcCategoryToRemove = edgeType + ";" + srcNodeType;
                }
                if( edgeType && tarNodeType ) {
                    tarCategoryToRemove = edgeType + ";" + tarNodeType;
                }

                if( srcPort && srcPort.modelObject ) {
                    isValidSrcPort = true;
                }

                if( tarPort && tarPort.modelObject ) {
                    isValidTarPort = true;
                }

                if( isValidSrcPort ) {
                    isSourcePortDirectionOutput = srcPort.modelObject.props.awb0Direction && srcPort.modelObject.props.awb0Direction.dbValues[ 0 ] === "fnd0Output";
                }
                if( isValidTarPort ) {
                    isTargetPortDirectionInput = tarPort.modelObject.props.awb0Direction && tarPort.modelObject.props.awb0Direction.dbValues[ 0 ] === "fnd0Input";
                }

                if( !isValidSrcPort && !isValidTarPort ) {

                    if( srcNode ) {
                        srcNode.outgoingRelations.splice( srcNode.outgoingRelations.indexOf( srcCategoryToRemove ), 1 );
                    }
                    if( tarNode ) {
                        tarNode.incomingRelations.splice( tarNode.incomingRelations.indexOf( tarCategoryToRemove ), 1 );
                    }

                } else {

                    if( !isSourcePortDirectionOutput ) {
                        if( srcNode ) {
                            srcNode.incomingRelations.splice( srcNode.incomingRelations.indexOf( srcCategoryToRemove ), 1 );
                        }
                        if( tarNode ) {
                            tarNode.incomingRelations.splice( tarNode.incomingRelations.indexOf( tarCategoryToRemove ), 1 );
                        }
                    } else if( !isTargetPortDirectionInput ) {
                        if( tarNode ) {
                            tarNode.outgoingRelations.splice( tarNode.outgoingRelations.indexOf( tarCategoryToRemove ), 1 );
                        }
                        if( srcNode ) {
                            srcNode.outgoingRelations.splice( srcNode.outgoingRelations.indexOf( srcCategoryToRemove ), 1 );
                        }
                    } else {
                        if( srcNode ) {
                            srcNode.outgoingRelations.splice( srcNode.outgoingRelations.indexOf( srcCategoryToRemove ), 1 );
                        }
                        if( tarNode ) {
                            tarNode.incomingRelations.splice( tarNode.incomingRelations.indexOf( tarCategoryToRemove ), 1 );
                        }

                    }

                }

            }
        } );
    }
    return affectedNodeList;
};

/**
 * Once objects are deleted from server , it removes objects from graph.
 * @param {Object} graphData Graph Data
 * @param {Object} data data object.
 */
export let performDeleteOperationCompleted = function( graphData, data ) {

    var graphModel = appCtxService.ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;
    var doUpdateAceList = false;

    var removeElementUids = data.removeElementUids;
    var deletedTracelinkUids = data.deletedTracelinkUids;

    if( graphData.output.length === 0 ) {
        return;
    }

    var isConnectionDeleted = ( removeElementUids.length - graphData.output[ 0 ].edgeData.length ) > 0;

    var removedObjects = [];

    _.forEach( removeElementUids, function( removedElementUID ) {
        var removedObject = appCtxService.ctx.mselected.filter( function( selected ) {
            return selected.uid === removedElementUID;
        } );
        removedObjects.push.apply( removedObjects, removedObject );
    } );

    //Get underlying object and store them in clipboard
    if( removedObjects.length > 0 ) {
        var contextObjs = [];
        _.forEach( removedObjects, function( obj ) {
            if( obj.props.awb0UnderlyingObject ) {
                if( cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[ 0 ] ) !== null ) {
                    contextObjs.push( obj.props.awb0UnderlyingObject.dbValues[ 0 ] );
                }
            }
        } );
        if( contextObjs.length > 0 ) {
            ClipboardService.instance.setContents( contextObjs );
        }
    }

    // clear data cache
    data.removeElementUids = [];
    data.deletedTracelinkUids = [];

    // if any error
    if( graphData.ServiceData.partialErrors && graphData.output.length === 0 ) {
        return;
    }

    var tracelinkUidsToDelete = [];

    if( graphData ) {

        _.forEach( graphData.output, function( output ) {

            _.forEach( output.nodeData, function( nodeInformation ) {
                var nodeUid = nodeInformation.node.uid;
                var nodeInfo = nodeInformation.nodeInfo;
                if( nodeInfo ) {
                    var node = graphModel.nodeMap[ nodeUid ];
                    if( node ) {
                        var connectionTypes = nodeInfo.danglingConnectionTypes;
                        var updatedNodeInfoMap = {
                            danglingConnectionTypes: connectionTypes
                        };
                        if( connectionTypes && connectionTypes.length > 0 ) {
                            node.hasDanglingConnection = true;
                            node.connectionType = connectionTypes[ 0 ];
                        } else {
                            node.hasDanglingConnection = false;
                            node.connectionType = null;
                        }
                        // update node Data cache
                        graphModel.nodeMap[ nodeUid ] = node;
                        dataCacheSvc.updateNodeDataInfoMap( nodeUid, updatedNodeInfoMap );
                    }
                }
            } );

            _.forEach( output.portData, function( portInformation ) {
                var portUid = portInformation.port.uid;
                var portInfo = portInformation.portInfo;
                if( portInfo ) {
                    var port = graphModel.portMap[ portUid ];
                    if( port ) {
                        var connectionTypes = portInfo.danglingConnectionTypes;
                        var updatedPortInfoMap = {
                            danglingConnectionTypes: connectionTypes
                        };
                        var portStyle = port.style;
                        if( connectionTypes && connectionTypes.length > 0 ) {
                            // set Style for port
                            if( portStyle ) {
                                portStyle.borderColor = "(255,0,0)";
                                portStyle.thickness = 2;
                                graphModel.graphControl.graph.setPortStyle( port, portStyle );
                            }
                            port.hasDanglingConnection = true;
                            port.connectionType = connectionTypes[ 0 ];
                        } else {
                            if( portStyle ) { // set to default
                                portStyle.borderColor = "(0,0,0)";
                                portStyle.thickness = 1;
                                graphModel.graphControl.graph.setPortStyle( port, portStyle );
                            }
                            port.hasDanglingConnection = false;
                            port.connectionType = null;
                        }
                        // update port Data cache
                        graphModel.portMap[ portUid ] = port;
                        dataCacheSvc.updatePortDataInfoMap( portUid, updatedPortInfoMap );
                    }
                }
            } );
        } );

        if( graphData.ServiceData && graphData.ServiceData.deleted ) {
            _.forEach( graphData.ServiceData.deleted, function( deletedUid ) {

                var index;
                if( deletedTracelinkUids && deletedTracelinkUids.length > 0 ) {
                    index = _.indexOf( deletedTracelinkUids, deletedUid );
                    if( index !== -1 ) {
                        _.pullAt( removeElementUids, index );
                        tracelinkUidsToDelete.push( deletedUid );
                    }
                }

            } );
        }
    }

    var elementsToRemoveFromAce = [];
    var itemsToRemove = [];
    var portsToRemove = [];
    var nodesToCheckForNormal = [];
    var nodesToRemove = [];
    var edgesToRemove = [];
    var affectedNodeList = [];
    var nodeMap = graphModel.nodeMap;

    architectureLayoutService.clearGraphItemLists();

    var aceShowConnectionMode = false;
    if( appCtxService.ctx.aceActiveContext.context.persistentRequestPref){
        aceShowConnectionMode=appCtxService.ctx.aceActiveContext.context.persistentRequestPref.includeConnections;
    }

    // Remove From Graph
    if( removeElementUids && removeElementUids.length > 0 ) {

        _.forEach( removeElementUids, function( uid ) {

            // For node
            var node = graphModel.nodeMap[ uid ];
            if( node ) {
                itemsToRemove.push( node );
                nodesToRemove.push( node );
                elementsToRemoveFromAce.push( node.modelObject );
                var parent = graphControl.groupGraph.getParent( node );
                if( parent ) {
                    architectureLayoutService.addNodeToFitAncestors( parent );
                    nodesToCheckForNormal.push( parent );
                }
            }

            // For Connection
            var edge = graphModel.edgeMap[ uid ];
            if( edge ) {
                itemsToRemove.push( edge );
                edgesToRemove.push( edge );
                if( aceShowConnectionMode && isConnectionDeleted ) {
                    elementsToRemoveFromAce.push( edge.modelObject );
                }
            } else {
                // check if it is connection.
                var object = cdm.getObject( uid );
                var isConnection = cmm.isInstanceOf( 'Awb0Connection', object.modelType );
                if( isConnection && isConnectionDeleted ) {
                    elementsToRemoveFromAce.push( object );
                    doUpdateAceList = true;
                }
            }

            // For Port
            var port = graphModel.portMap[ uid ];
            if( port ) {
                itemsToRemove.push( port );
                portsToRemove.push( port );
                architectureLayoutService.addPortToBeRemoved( [ port ] );
            }
        } );
    }

    if( tracelinkUidsToDelete && tracelinkUidsToDelete.length > 0 ) {
        var keys = Object.keys( graphModel.edgeMap );
        _.forEach( tracelinkUidsToDelete, function( uid ) {
            _.forEach( keys, function( key ) {
                if( key.indexOf( uid ) !== -1 ) {
                    var edgeObj = graphModel.edgeMap[ key ];
                    if( edgeObj ) {
                        itemsToRemove.push( edgeObj );
                        edgesToRemove.push( edgeObj );
                    }
                }
            } );
        } );
    }

    var edgesToBeRemoved = [];

    if( nodesToRemove.length > 0 ) {
        // update node degree as well
        _.forEach( nodesToRemove, function( node ) {
            var parent = graphControl.groupGraph.getParent( node );
            if( parent ) {
                // Decrease child degree for parent node
                if( _.indexOf( itemsToRemove, parent ) === -1 ) {
                    --parent.numChildren;
                    affectedNodeList.push( parent );
                }
            }
            var edges = node.getEdges();
            edgesToBeRemoved = edgesToBeRemoved.concat( edges );

            // update the nodeMap with removed elements, to be used to update ArchitectureCtx
            delete nodeMap[ node.modelObject.uid ];
        } );
    }

    if( edgesToRemove.length > 0 ) {
        // update node degree as well
        _.forEach( edgesToRemove, function( edge ) {
            if( edge.modelObject && edge.category && edge.category.localeCompare( "Structure" ) !== 0 ) {
                var isConn = cmm.isInstanceOf( 'Awb0Connection', edge.modelObject.modelType );
                if( isConn ) {
                    var parentNode = graphControl.groupGraph.getParent( edge );
                    var parentUid = edge.modelObject.props.awb0Parent.dbValues[ 0 ];
                    if( parentNode && _.indexOf( itemsToRemove, parentNode ) === -1 && parentUid !== parentNode.modelObject.uid ) {

                        // Decrease child degree of parent node and add it in affected node list to update
                        --parentNode.numChildren;
                        affectedNodeList.push( parentNode );
                    }
                }
                edgesToBeRemoved.push( edge );
            }
        } );
    }

    if( portsToRemove.length > 0 ) {
        // update node degree as well
        _.forEach( portsToRemove, function( port ) {
            var portObj = port.modelObject;
            if( portObj ) {
                var nodeUid = portObj.props.awb0Parent.dbValues[ 0 ];
                if( nodeUid ) {
                    // find in node map
                    var node = graphModel.nodeMap[ nodeUid ];
                    if( node ) {
                        var portDegree = node.portDegree;
                        if( portDegree && portDegree.length > 0 ) {
                            portDegree.shift();
                            node.portDegree = portDegree;
                        }
                    }
                    graphModel.nodeMap[ nodeUid ] = node;
                }

                var portEdges = port.getEdges();
                edgesToBeRemoved = edgesToBeRemoved.concat( portEdges );
            }
        } );
    }

    // Calculate affected nodes on removal of edges from diagram
    affectedNodeList = affectedNodeList.concat( processForEdgesRemoval( edgesToBeRemoved, nodesToRemove, graphControl ) );

    if( itemsToRemove.length > 0 ) {
        var unConnectedItems = utilSvc.getUnconnectedItems( graphModel, nodesToRemove, edgesToRemove );
        if( unConnectedItems && unConnectedItems.length > 0 ) {
            _.forEach( unConnectedItems, function( unConnectedItem ) {
                itemsToRemove.push( unConnectedItem );
            } );
        }

        var removedItems = graph.removeItems( itemsToRemove );

        doUpdateAceList = ( removedItems.nodes.length > 0 || isConnectionDeleted );
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
            // Check if it has no children and add nodes to convert to normal node.
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
    }

    if( affectedNodeList && affectedNodeList.length > 0 ) {
        affectedNodeList = _.uniq( affectedNodeList );
        //fire graph node degree change event
        eventBus.publish( "AMDiagram.updateGraphNodeDegree", {
            affectedNodeList: affectedNodeList
        } );
    }

    architectureLayoutService.applyGraphLayout( graphModel, true /* Not used if later 2 are false */ , false, false );

    // for updating Ace List
    if( doUpdateAceList ) {
        updateAceList( elementsToRemoveFromAce );
    }

    //Update the architectureCtx with current visibleNodes
    var architectureCtx = appCtxService.getCtx( "architectureCtx" );
    if( architectureCtx && architectureCtx.archPageData ) {
        architectureCtx.archPageData.nodes = _.map( nodeMap, 'modelObject' );
    }
    appCtxService.updateCtx( "architectureCtx", architectureCtx );

    // fire visibility state changed event
    eventBus.publish( 'occMgmt.visibilityStateChanged', {} );
};

/**
 * Update Ace List
 *
 * @param {Object} elementToDeselect elementToDeselect
 */
var updateAceList = function( elementToDeselect ) {

    if( elementToDeselect.length > 0 ) {
        eventBus.publish( "aceElementsDeSelectedEvent", {
            elementsToDeselect: elementToDeselect
        } );
    }

    // Reset Ace List
    eventBus.publish( "acePwa.reset" );
};

/**
 * Check if user has made any selections across levels in structures.
 *
 * @param {Array} selectedElements selectedElements
 * @return {boolean} hasUserMadeSelectionsAcrossLevelsInStructure
 */
var hasUserMadeSelectionsAcrossLevelsInStructure = function( selectedElements ) {

    var parentsOfSelectedElements = [];
    _.forEach( selectedElements, function( selectedElement ) {
        var parentOcc = getParentOccurrence( selectedElement );
        if( parentOcc ) {
            parentsOfSelectedElements.push( parentOcc );
        }
    } );

    return parentsOfSelectedElements.length > 1;
};

/**
 * It filters out elements if parent ss already present in selections List.
 *
 * @param {Array} elementsToBeProcessedForRemoval elementsToBeProcessedForRemoval
 */
var filterOutElementsIfParentIsAlreadyPresentInSelectionsList = function( elementsToBeProcessedForRemoval ) {

    var newListOfElementsToBeProcessedForRemoval = [];
    _.forEach( elementsToBeProcessedForRemoval, function( elementToProcessForRemoval ) {
        newListOfElementsToBeProcessedForRemoval.push( elementToProcessForRemoval );
        var hierarchy = getObjectHierarchy( elementToProcessForRemoval );
        _.forEach( hierarchy, function( modelObj ) {
            if( newListOfElementsToBeProcessedForRemoval.indexOf( modelObj ) !== -1 ) {
                var index = newListOfElementsToBeProcessedForRemoval.indexOf( elementToProcessForRemoval );
                newListOfElementsToBeProcessedForRemoval.splice( index, 1 );
                return false;
            }
        } );
    } );
};

/**
 * Get parent Occurrence.
 *
 * @param {Object} occurrence occurrence
 * @returns {Object} parent object
 */
var getParentOccurrence = function( occurrence ) {
    var parent = null;
    if( occurrence ) {
        // check if awb0Parent property exists
        var parentProp = occurrence.props.awb0Parent;
        if( parentProp ) {
            var propVal = parentProp.dbValues[ 0 ];
            var nodeObject = cdm.getObject( propVal );
            if( nodeObject ) {
                parent = nodeObject;
            }
        }
    }
    return parent;
};

/**
 * Get Object hierarchy.
 *
 * @param {Object} modelObject modelObject
 * @returns {Object} parent object
 */
var getObjectHierarchy = function( modelObject ) {

    var occStack = [];
    var parent = modelObject;
    while( parent ) {
        // Push current parent on stack
        occStack.push( parent );
        parent = getParentOccurrence( parent );
    }
    return parent;
};

/**
 * Fires AMManageDiagramEvent event to call manageDiagram2 SOA for deleting  objects.
 *
 * @param {Array} visibleObjects objects which are visible in graph
 * @param {Array} elementsToBeDeleted elements To Be Deleted
 * @param {Object} m_rootNode root node
 */
var callAddAndDeleteElementSOA = function( visibleObjects, elementsToBeDeleted, m_rootNode ) {

    if( elementsToBeDeleted && elementsToBeDeleted.length > 0 ) {

        var eventData = [];

        var deleteData = {
            userAction: 'DeleteElement',
            visibleObjects: visibleObjects,
            elementsToDelete: elementsToBeDeleted
        };

        eventData.push( deleteData );

        if( m_rootNode ) {
            // Fire add to diagram if diagram becomes empty after remove
            var elementsToAdd = [];
            var anchorElements = [];
            anchorElements.push( m_rootNode.uid );
            elementsToAdd.push( m_rootNode );
            var addData = {
                userAction: 'AddToDiagram',
                elementsToAdd: elementsToAdd,
                anchorElements: anchorElements,
                skipVisibleObjects: true
            };

            eventData.push( addData );
        }

        eventBus.publish( "AMManageDiagramEvent", eventData );
    }
};

export let populateMsgRelatedConditions = function( data ) {
    var selectedElements = appCtxService.ctx.mselected;
    data.isNodeHasVisibleRelation = isNodeHasVisibleRelations( selectedElements );
    data.isNodeExpanded = isNodeExpanded( selectedElements );
    data.selectedAnchorNodes = selectedAnchors( selectedElements );
    data.isHeterogeneousSelection = isHeterogeneousSelection();
    data.isOnlySinglePortSelected = isOnlySinglePortSelected( selectedElements );
    data.isOnlyConnectionSelected = isOnlyConnectionSelected( selectedElements );
    data.isConnectionsValidToDisconnect = isConnectionsValidToDisconnect( selectedElements );
    return selectedElements;

};
var isHeterogeneousSelection = function() {

    var objectTypes = [];
    if( appCtxService.ctx.architectureCtx.diagram.selection.nodeModels && appCtxService.ctx.architectureCtx.diagram.selection.nodeModels.length > 0 ) {
        var selectedNodes = appCtxService.ctx.architectureCtx.diagram.selection.nodeModels;
        _.forEach( selectedNodes, function( selectedNode ) {
            var selectedNodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ selectedNode.uid ];
            if( !( _.includes( objectTypes, selectedNodeItem.getItemType() ) ) ) {
                objectTypes.push( selectedNodeItem.getItemType() );
            }
        } );

    }
    if( appCtxService.ctx.architectureCtx.diagram.selection.edgeModels && appCtxService.ctx.architectureCtx.diagram.selection.edgeModels.length > 0 ) {
        _.forEach( appCtxService.ctx.graph.graphModel.graphControl.getSelected( "Edge" ), function( edgeItem ) {
            if( !( _.includes( objectTypes, edgeItem.getItemType() ) ) ) {
                objectTypes.push( edgeItem.getItemType() );
            }
        } );
    }
    if( appCtxService.ctx.architectureCtx.diagram.selection.portModels && appCtxService.ctx.architectureCtx.diagram.selection.portModels.length > 0 ) {
        var selectedPorts = appCtxService.ctx.architectureCtx.diagram.selection.portModels;
        _.forEach( selectedPorts, function( selectedPort ) {
            var selectedPortItem = appCtxService.ctx.graph.graphModel.portMap[ selectedPort.uid ];
            if( !( _.includes( objectTypes, selectedPortItem.getItemType() ) ) ) {
                objectTypes.push( selectedPortItem.getItemType() );
            }
        } );
    }
    return objectTypes.length > 1;
};
var isNodeHasVisibleRelations = function( selectedNodes ) {
    var anyNodeHasVisibleEdges = false;
    _.forEach( selectedNodes, function( selectedNode ) {
        var nodeUid = selectedNode.uid;
        var nodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ nodeUid ];
        if( nodeItem ) {
            var edges = nodeItem.getEdges();
            var visibleEdges = _.find( edges, function( edge ) {
                return edge.isVisible();
            } );
            if( visibleEdges ) {
                anyNodeHasVisibleEdges = true;
                return false;
            }
        }
    } );
    return anyNodeHasVisibleEdges;
};
var isNodeExpanded = function( selectedNodes ) {
    var groupGraph = appCtxService.ctx.graph.graphModel.graphControl.groupGraph;
    var expanded = false;
    _.forEach( selectedNodes, function( selectedNode ) {
        var nodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ selectedNode.uid ];
        if( nodeItem ) {
            if( groupGraph.isGroup( nodeItem ) && groupGraph.isExpanded( nodeItem ) ) {
                expanded = true;
                return false;
            }
        }
    } );
    return expanded;
};
var selectedAnchors = function( selectedNodes ) {
    var selectedAnchors = [];
    _.forEach( selectedNodes, function( selectedNode ) {
        var nodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ selectedNode.uid ];
        if( nodeItem ) {
            if( nodeItem.isRoot() ) {
                selectedAnchors.push( selectedNode );
            }
        }
    } );
    return selectedAnchors;

};
var isOnlySinglePortSelected = function( selectedElements ) {
    var isOnlySinglePortSelected = false;
    if( selectedElements && selectedElements.length === 1 ) {
        if( cmm.isInstanceOf( 'Awb0Interface', selectedElements[ 0 ].modelType ) ) {
            isOnlySinglePortSelected = true;
        }
    }
    return isOnlySinglePortSelected;
};
var isOnlyConnectionSelected = function( selectedElements ) {
    var isOnlyConnectionSelected = false;
    var nonConnectionObjectSelected = false;
    _.forEach( selectedElements, function( element ) {
        var isConnection = cmm.isInstanceOf( 'Awb0Connection', element.modelType );
        if( !isConnection ) {
            nonConnectionObjectSelected = true;
            return false;
        }
    } );

    if( !nonConnectionObjectSelected ) {
        isOnlyConnectionSelected = true;
    }

    return isOnlyConnectionSelected;
};
var isConnectionsValidToDisconnect = function( selectedElements ) {
    var isValidConnectionToDisconnect = false;
    _.forEach( selectedElements, function( element ) {
        var isConnection = cmm.isInstanceOf( 'Awb0Connection', element.modelType );
        if( isConnection ) {
            var connectedState = element.props.ase0ConnectedState.dbValues[ 0 ];
            if( connectedState === 'ase0Connected' ) {
                isValidConnectionToDisconnect = true;
            }
        }
    } );
    return isValidConnectionToDisconnect;
};

/**
 * Register Ase0DeleteElementService
 *
 * @member Ase0DeleteElementService
 *
 * @param {Object} appCtxService appCtxService
 * @param {Object} clipboardSvc clipboardSvc
 * @param {Object} cmm soa_kernel_clientMetaModel
 * @param {Object} cdm soa_kernel_clientDataModel
 * @param {Object} toolTipHandler Ase0ArchitectureGraphTooltipHandler
 * @param {Object} architectureLayoutService Ase0ArchitectureLayoutService
 * @param {Object} utilSvc Ase0ArchitectureUtilService
 * @param {Object} dataCacheSvc Ase0ArchitectureDataCache
 * @return {Object} service exports exports
 */

export default exports = {
    deleteElement,
    populateRemoveTraceLinkInformation,
    performDeleteOperationCompleted,
    populateMsgRelatedConditions
};
app.factory( 'Ase0DeleteElementService', () => exports );
