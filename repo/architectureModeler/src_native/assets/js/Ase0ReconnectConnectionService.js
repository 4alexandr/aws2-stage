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
 * Ase0ReconnectConnectionService Reconnect Connection In diagram
 *
 * @module js/Ase0ReconnectConnectionService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import archGraphLegendManager from 'js/Ase0ArchitectureGraphLegendManager';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Deletes nodes/ports/edges
 *
 * @param {Object} data data object.
 */
export let reconnectConnection = function( data ) {

    // First Check if Reconnect Command is Avtive or not
    var context = appCtxService.getCtx( 'architectureCtx' );
    if( context.diagram.isReconnectCmdActive ) {
        context.diagram.isReconnectCmdActive = false;
        resetReconnectData( data );
        return;
    }
    context.diagram.isReconnectCmdActive = true;

    var m_selObjects = appCtxService.ctx.mselected;
    if( m_selObjects ) {
        // valid only for single selection.
        var selectedObj = m_selObjects[ 0 ];
        var primaryObjects = [];
        if( selectedObj && m_selObjects.length === 1 ) { // Single select
            // Check if it is of type Connection
            var isConnection = cmm.isInstanceOf( 'Awb0Connection', selectedObj.modelType );
            // getEndElements
            if( isConnection ) {
                primaryObjects.push( selectedObj );
                var eventData = {
                    userAction: 'Connection.GetEndElements',
                    primaryObjects: primaryObjects
                };
                eventBus.publish( "AMManageDiagramEvent", eventData );
            }

            var isPort = cmm.isInstanceOf( 'Awb0Interface', selectedObj.modelType );
            var isNode = cmm.isInstanceOf( 'Ase0LogicalElement', selectedObj.modelType );
            if( isPort || isNode ) {
                preReconnectProcessing( data, selectedObj, isNode );
            }
        } else { // Multiselect

            // Get all nodes on graph and send them to server, so that server can use them to build paths
            var graphModel = appCtxService.ctx.graph.graphModel;
            var graphControl = graphModel.graphControl;
            var graph = graphControl.graph;
            var visibleObjects = [];

            var allNodeModels = graph.getVisibleNodes();
            _.forEach( allNodeModels, function( nodeModel ) {
                if( nodeModel.modelObject ) {
                    visibleObjects.push( nodeModel.modelObject );
                }
            } );

            var allPortModels = graph.getVisiblePorts();
            _.forEach( allPortModels, function( portModel ) {
                if( portModel.modelObject ) {
                    visibleObjects.push( portModel.modelObject );
                }
            } );

            var eventData1 = {
                userAction: 'Connection.Reconnect',
                primaryObjects: m_selObjects,
                visibleObjects: visibleObjects,
                eventName: "AMGraphEvent.reconnectCompleted"
            };
            eventBus.publish( "AMManageDiagramEvent", eventData1 );
        }
    }
};

export let reconnectRelation = function( data, selectedConnection, sourceObject, targetObject, visibleObjects ) {

    var graphModel = appCtxService.ctx.graph.graphModel;

    var existingPortEndObjects = data.reconnect.existingPortEndObjects;
    var existingNodeEndObjects = data.reconnect.existingNodeEndObjects;

    var isSource = false;
    var isTarget = false;

    var sourceObj = sourceObject;
    var targetObj = targetObject;

    if( existingPortEndObjects ) {
        var index = _.indexOf( existingPortEndObjects, sourceObj );
        if( index !== -1 ) {
            isSource = true;
        }

        var indx = _.indexOf( existingPortEndObjects, targetObj );
        if( indx !== -1 ) {
            isTarget = true;
        }
    }

    if( existingNodeEndObjects ) {
        var index1 = _.indexOf( existingNodeEndObjects, sourceObj );
        if( index1 !== -1 ) {
            isSource = true;
        }

        var indx1 = _.indexOf( existingNodeEndObjects, targetObj );
        if( indx1 !== -1 ) {
            isTarget = true;
        }
    }

    if( cmm.isInstanceOf( 'Awb0Interface', sourceObject.modelType ) ) {
        var parentObject = getParentOccurrence( sourceObject );
        var idx = _.indexOf( existingNodeEndObjects, parentObject );
        if( idx !== -1 ) {
            isSource = true;
        }
    }

    if( cmm.isInstanceOf( 'Awb0Interface', targetObject.modelType ) ) {
        var parentObject1 = getParentOccurrence( targetObject );
        var idx1 = _.indexOf( existingNodeEndObjects, parentObject1 );
        if( idx1 !== -1 ) {
            isTarget = true;
        }
    }

    if( isSource ) {
        if( existingPortEndObjects && existingPortEndObjects.length > 0 ) {
            sourceObj = existingPortEndObjects[ 0 ];
        }
    }

    if( isTarget ) {
        if( existingPortEndObjects && existingPortEndObjects.length > 0 ) {
            targetObj = existingPortEndObjects[ 0 ];
        }
    }

    var primaryObjects = [];
    if( selectedConnection ) {
        primaryObjects.push( selectedConnection );
    }
    if( sourceObj ) {
        primaryObjects.push( sourceObj );
    }
    if( targetObj ) {
        primaryObjects.push( targetObj );
    }

    graphModel.config.inputMode = data.reconnect.previousInputMode;

    var eventData = {
        userAction: 'Connection.Reconnect',
        primaryObjects: primaryObjects,
        visibleObjects: visibleObjects,
        eventName: "AMGraphEvent.reconnectCompleted"
    };
    eventBus.publish( "AMManageDiagramEvent", eventData );
};

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

var preReconnectProcessing = function( data, selectedObj, isNode ) {

    // clear Reconnect Data
    data.reconnect.selectedConnection = null;
    data.reconnect.previousInputMode = null;
    data.reconnect.isGraphInRelationCreationMode = false;
    data.reconnect.existingPortEndObjects = [];
    data.reconnect.existingNodeEndObjects = [];

    var graphContext = appCtxService.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    var activeLegendView = null;
    if( graphContext && graphContext.legendState ) {
        activeLegendView = graphContext.legendState.activeView;
    }

    if( selectedObj ) {

        var connectionTypeName = null;
        if( isNode ) {
            var node = graphModel.nodeMap[ selectedObj.uid ];
            if( node ) {
                connectionTypeName = node.connectionType;
            }
        } else {
            var port = graphModel.portMap[ selectedObj.uid ];
            if( port ) {
                connectionTypeName = port.connectionType;
            }
        }

        var scopeFilter;
        var selCategory = archGraphLegendManager.getCategoryType( connectionTypeName, scopeFilter, activeLegendView );
        if( !selCategory || ( selCategory && selCategory.localeCompare( "" ) === 0 ) ) {
            return;
        }

        if( isNode ) {
            data.reconnect.existingNodeEndObjects.push( selectedObj );
        } else {
            data.reconnect.existingPortEndObjects.push( selectedObj );
        }

        // set Graph in relation creation mode
        data.reconnect.selectedConnection = null;
        data.reconnect.isGraphInRelationCreationMode = true;
        data.reconnect.previousInputMode = graphModel.config.inputMode;
        var edgeCreationMode = "edgeCreationMode";
        graphModel.config.inputMode = edgeCreationMode;
    }

};

export let processEndElements = function( data, graphData ) {

    // clear Reconnect Data
    data.reconnect.selectedConnection = null;
    data.reconnect.previousInputMode = null;
    data.reconnect.isGraphInRelationCreationMode = false;
    data.reconnect.existingPortEndObjects = [];
    data.reconnect.existingNodeEndObjects = [];

    var graphModel = appCtxService.ctx.graph.graphModel;
    var m_selObjects = appCtxService.ctx.mselected;

    var activeLegendView = null;
    var graphContext = appCtxService.getCtx( "graph" );
    if( graphContext && graphContext.legendState ) {
        activeLegendView = graphContext.legendState.activeView;
    }

    var selectedObj = m_selObjects[ 0 ];
    if( selectedObj ) {
        var underlyingObjProp = selectedObj.props.awb0UnderlyingObject;
        var propVal = underlyingObjProp.dbValues[ 0 ];
        var underlyingObject = cdm.getObject( propVal );
        if( underlyingObject ) {

            var connectionTypeName = underlyingObject.type;
            var scopeFilter;
            var selCategory = archGraphLegendManager.getCategoryType( connectionTypeName, scopeFilter, activeLegendView );
            if( !selCategory || ( selCategory && selCategory.localeCompare( "" ) === 0 ) ) {
                return;
            }

            if( graphData && graphData.output && graphData.output.length > 0 ) {

                var nodeData = graphData.output[ 0 ].nodeData;
                if( nodeData && nodeData.length > 0 ) {
                    var nodeObject = nodeData[ 0 ].node;
                    if( nodeObject ) {
                        // add it to data
                        data.reconnect.existingNodeEndObjects.push( nodeObject );
                    }
                }
                var portData = graphData.output[ 0 ].portData;
                if( portData && portData.length > 0 ) {
                    var portObject = portData[ 0 ].port;
                    if( portObject ) {
                        // add it to data
                        data.reconnect.existingPortEndObjects.push( portObject );
                    }
                }
            }

            // set Graph in relation creation mode
            data.reconnect.selectedConnection = selectedObj;
            data.reconnect.isGraphInRelationCreationMode = true;
            data.reconnect.previousInputMode = graphModel.config.inputMode;
            var edgeCreationMode = "edgeCreationMode";
            graphModel.config.inputMode = edgeCreationMode;
        }
    }
};

var resetReconnectData = function( data ) {
    var graphModel = appCtxService.ctx.graph.graphModel;
    if( data.reconnect.previousInputMode ) {
        graphModel.config.inputMode = data.reconnect.previousInputMode;
    }

    // clear Reconnect Data
    data.reconnect.selectedConnection = null;
    data.reconnect.previousInputMode = null;
    data.reconnect.isGraphInRelationCreationMode = false;
    data.reconnect.existingPortEndObjects = [];
    data.reconnect.existingNodeEndObjects = [];
};

/**
 * Register Ase0ReconnectConnectionService
 *
 * @member Ase0ReconnectConnectionService
 *
 * @param {Object} appCtxService appCtxService
 * @param {Object} cmm soa_kernel_clientMetaModel
 * @param {Object} cdm soa_kernel_clientDataModel
 * @param {Object} archGraphLegendManager Ase0ArchitectureGraphLegendManager
 * @return {Object} service exports exports
 */

export default exports = {
    reconnectConnection,
    reconnectRelation,
    processEndElements
};
app.factory( 'Ase0ReconnectConnectionService', () => exports );
