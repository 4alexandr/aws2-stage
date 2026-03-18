// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0GraphModificationEventHandler
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import dataCacheSvc from 'js/Ase0ArchitectureDataCache';
import cmm from 'soa/kernel/clientMetaModel';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

export let handleGraphItemsMoved = function( items, graphModel ) {
    var movedNodes = [];
    var movedPorts = [];
    var movedLabels = [];
    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                movedNodes.push( element );
            } else if( element.getItemType() === 'Port' ) {
                movedPorts.push( element );
            } else if( element.getItemType() === 'Label' ) {
                movedLabels.push( element );
            }
        } );
        var layout;
        if( graphModel.graphControl ) {
            layout = graphModel.graphControl.layout;
        }
        if( layout && layout.isActive() && ( movedNodes.length > 0 || movedPorts.length > 0 ) ) {
            layout.applyUpdate( function() {
                _.forEach( movedNodes, function( node ) {
                    layout.moveNode( node );
                } );

                if( layout.type === 'IncUpdateLayout' ) {
                    _.forEach( movedPorts, function( port ) {
                        layout.movePort( port );
                    } );
                }
            } );
        }
        if( movedNodes.length > 0 || movedPorts.length > 0 || movedLabels.length > 0 ) {
            logger.info( 'fire Diagram Modified Event' );
            eventBus.publish( "AMDiagram.Modified", {} );
        }
    }
};

export let handleGraphItemsAdded = function( graphModel, addedBoundaries ) {
    var graph;
    var isDiagramEmpty = true;
    var architectureCtx = appCtxSvc.getCtx( "architectureCtx" );
    if( graphModel && graphModel.graphControl ) {
        graph = graphModel.graphControl.graph;
    }
    if( graph ) {
        var allVisibleGraphItems = [];
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisibleNodes() );
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisibleEdges() );
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisiblePorts() );
        isDiagramEmpty = allVisibleGraphItems.length === 0;
    }
    if( architectureCtx ) {
        if( architectureCtx.diagram ) {
            architectureCtx.diagram.isEmpty = isDiagramEmpty;
        } else {
            architectureCtx.diagram = {
                isEmpty: isDiagramEmpty
            };
        }
        appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
    } else {
        architectureCtx = {
            diagram: {
                isEmpty: isDiagramEmpty
            }
        };
        appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
    }

    if( addedBoundaries && addedBoundaries.length > 0 ) {
        _.set( appCtxSvc, 'ctx.architectureCtx.diagram.hasPendingChanges', true );
        eventBus.publish( "StartSaveAutoBookmarkEvent" );
    }

    //fire Diagram Model Change Event;
    eventBus.publish( "AMDiagram.ModelChange", {} );
};

export let handleGraphItemsRemoved = function( data, graphModel, removedNodes, removedEdges, removedPorts ) {
    var graph;
    var isDiagramEmpty = true;
    var architectureCtx = appCtxSvc.getCtx( "architectureCtx" );
    var elementsToBeRemoved = [];
    if( graphModel && graphModel.graphControl ) {

        // update cache
        var nodesToBeRemoved = [];
        if( removedNodes && removedNodes.length > 0 ) {
            _.forEach( removedNodes, function( node ) {
                var nodeObj = node.modelObject;
                if( graphModel.nodeMap ) {
                    if( nodeObj ) {
                        nodesToBeRemoved.push( nodeObj.uid );
                        if( node.isRoot() ) {
                            var nodeUid = nodeObj.uid;
                            //To keep root node list updated with current changes, remove node from root node list
                            var rootNodeList = appCtxSvc.ctx.graph.graphModel.rootNodeList;
                            var index = rootNodeList.indexOf( nodeUid );
                            if( index > -1 ) {
                                rootNodeList.splice( index, 1 );
                            }
                        }
                        // Remove entry from NodeMap
                        delete appCtxSvc.ctx.graph.graphModel.nodeMap[ nodeObj.uid ];
                        // update elements to be removed
                        elementsToBeRemoved.push( nodeObj );
                    }
                }
            } );

            dataCacheSvc.removeNodeCache( nodesToBeRemoved );
        }

        var edgesToBeRemoved = [];
        if( removedEdges && removedEdges.length > 0 ) {
            _.forEach( removedEdges, function( edge ) {
                var edgeObj = edge.modelObject;
                if( graphModel.edgeMap ) {
                    if( edgeObj ) {
                        edgesToBeRemoved.push( edgeObj.uid );
                        var isConnection = false;
                        isConnection = cmm.isInstanceOf( 'Awb0Connection', edgeObj.modelType );
                        if( !isConnection ) {
                            var edgeUid = edge.appData.edgeUid;
                            if( edgeUid && appCtxSvc.ctx.graph.graphModel.edgeMap[ edgeUid ] ) {
                                delete appCtxSvc.ctx.graph.graphModel.edgeMap[ edgeUid ];
                            }
                        } else {
                            // Remove entry from EdgeMap
                            delete appCtxSvc.ctx.graph.graphModel.edgeMap[ edgeObj.uid ];
                        }
                        // update elements to be removed
                        elementsToBeRemoved.push( edgeObj );
                    }
                }
            } );
            dataCacheSvc.removeEdgeCache( edgesToBeRemoved );
        }

        var portsToBeRemoved = [];
        if( removedPorts && removedPorts.length > 0 ) {
            _.forEach( removedPorts, function( port ) {
                var portObj = port.modelObject;
                if( graphModel.portMap ) {
                    if( portObj ) {
                        portsToBeRemoved.push( portObj.uid );
                        // Remove entry from PortMap
                        delete appCtxSvc.ctx.graph.graphModel.portMap[ portObj.uid ];
                        // update elements to be removed
                        elementsToBeRemoved.push( portObj );
                    }
                }
            } );
            dataCacheSvc.removePortCache( portsToBeRemoved );
        }

        // Fires AMManageDiagramEvent event to call manageDiagram2 SOA for removing  objects from diagram.
        if( elementsToBeRemoved && elementsToBeRemoved.length > 0 && data.isItemRemovedFromDiagram ) {

            var eventData1 = {
                userAction: 'RemoveFromDiagram',
                elementsToRemove: elementsToBeRemoved
            };
            eventBus.publish( "AMManageDiagramEvent", eventData1 );
        }

        graph = graphModel.graphControl.graph;
    }
    if( graph ) {
        var allVisibleGraphItems = [];
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisibleNodes() );
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisibleEdges() );
        allVisibleGraphItems.push.apply( allVisibleGraphItems, graph.getVisiblePorts() );
        isDiagramEmpty = allVisibleGraphItems.length === 0;
    }
    if( architectureCtx ) {
        if( architectureCtx.diagram ) {
            architectureCtx.diagram.isEmpty = isDiagramEmpty;
        } else {
            architectureCtx.diagram = {
                isEmpty: isDiagramEmpty
            };
        }
        appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
    } else {
        architectureCtx = {
            diagram: {
                isEmpty: isDiagramEmpty
            }
        };
        appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
    }

    if( !data.isItemRemovedFromDiagram ) {
        var graphSelections = _.filter( graphModel.graphControl.getSelected(), function( selectedItem ) {
            if( selectedItem.getItemType() !== "Boundary" ) {
                return selectedItem.modelObject;
            }
        } );

        // Updating selections on some/all graph items removed
        if( graphSelections && graphSelections.length > 0 ) {
            var graphSelectionObjects = _.map( graphSelections, 'modelObject' );
            eventBus.publish( "AM.SubLocationContentSelectionChangeEvent", {
                selections: graphSelectionObjects
            } );
        } else {
            architectureCtx.diagram.selection = {
                nodeModels: [],
                edgeModels: [],
                portModels: []
            };
            appCtxSvc.updateCtx( "architectureCtx", architectureCtx );

            eventBus.publish( "AM.SubLocationContentSelectionChangeEvent", {
                selections: []
            } );
        }
    } else {
        // Unset ItemRemovedFromDiagram Flag
        data.isItemRemovedFromDiagram = false;
    }

    //fire Diagram Model Change Event;
    eventBus.publish( "AMDiagram.ModelChange", {} );
};

export default exports = {
    handleGraphItemsMoved,
    handleGraphItemsAdded,
    handleGraphItemsRemoved
};
app.factory( 'Ase0GraphModificationEventHandler', () => exports );
