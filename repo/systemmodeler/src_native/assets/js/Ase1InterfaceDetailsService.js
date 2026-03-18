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
 * Interfaces Details panel service
 *
 * @module js/Ase1InterfaceDetailsService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import interfaceDefSvc from 'js/interfaceDefinitionTableService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var processSelection = function( selection ) {
    var interfaceDetailsCtx;
    if( selection && selection.length === 1 ) {
        var selected = selection[ 0 ];
        var isConnectionSelected = false;
        var isPortSelected = false;
        var clientScopeUri = null;
        var targetModelObjectUid = selected.uid;
        if( selected.modelType.typeHierarchyArray.indexOf( 'Awb0Connection' ) > -1 ) {
            isConnectionSelected = true;
            clientScopeUri = "Ase1InteractionConnTable";
            setAttrContextForInteractionTable();
        } else if( selected.modelType.typeHierarchyArray.indexOf( 'Awb0Interface' ) > -1 ) {
            isPortSelected = true;
            clientScopeUri = "Ase1InterfacePortTable";
        }

        interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
        if( interfaceDetailsCtx ) {
            interfaceDetailsCtx.isConnectionSelected = isConnectionSelected;
            interfaceDetailsCtx.isPortSelected = isPortSelected;
            interfaceDetailsCtx.clientScopeURI = clientScopeUri;
            interfaceDetailsCtx.targetModelObjectUid = targetModelObjectUid;
            interfaceDetailsCtx.targetModelObject = selected;
            interfaceDetailsCtx.selectedConnection = selected;
            appCtxSvc.updateCtx( "interfaceDetails", interfaceDetailsCtx );
        } else {
            interfaceDetailsCtx = {
                isConnectionSelected: isConnectionSelected,
                isPortSelected: isPortSelected,
                clientScopeURI: clientScopeUri,
                targetModelObjectUid: targetModelObjectUid,
                targetModelObject: selected,
                selectedConnection: selected
            };
            appCtxSvc.registerCtx( "interfaceDetails", interfaceDetailsCtx );
        }
    } else {
        interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
        if( interfaceDetailsCtx ) {
            interfaceDetailsCtx.isPortSelected = false;
            interfaceDetailsCtx.isConnectionSelected = false;
            interfaceDetailsCtx.targetModelObject = null;
            interfaceDetailsCtx.selectedConnection = null;
            interfaceDetailsCtx.clientScopeURI = "";
            interfaceDetailsCtx.targetModelObjectUid = "";
            appCtxSvc.updateCtx( "interfaceDetails", interfaceDetailsCtx );
        }
    }
};

var setAttrContextForInteractionTable = function() {
    var attrContext = appCtxSvc.getCtx( 'Att1ShowMappedAttribute' );
    if( attrContext ) {

        attrContext.clientScopeURI = "InteractionAttributeMappingTable";
        attrContext.clientName = "AWClient";
        attrContext.productContextUids = null;
        attrContext.rootElementUids = null;
        attrContext.openedObjectUid = null;
        attrContext.mappingCommand = null;
        appCtxSvc.updateCtx( "Att1ShowMappedAttribute", attrContext );
    } else {
        attrContext = {
            clientScopeURI: "InteractionAttributeMappingTable",
            clientName: "AWClient"
        };
        appCtxSvc.registerCtx( "Att1ShowMappedAttribute", attrContext );
    }
};

/**
 * On Interface Details panel load
 */
export let onInterfaceDetailsPanelReveal = function() {
    var mselected = appCtxSvc.getCtx( "mselected" );
    processSelection( mselected );
};

/**
 * Process selection on graph
 *
 * @param {Array} selections selections
 */
export let processSelectionChangeEvent = function( data ) {

    if( !data.eventData.selections ) {
        return;
    }
    var selections = data.eventData.selections;

    var interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
    var editingInterfaceDetailsTable = interfaceDetailsCtx.startEditOfInterfaceDefinition;
    if( editingInterfaceDetailsTable ) {
        if( !data.dataProvider ) {
            var dataProvider = {
                "json": {
                    "editContext": 'INTERFACE_DEFINATION_CONTEXT'
                }
            };
            data.dataProvider = dataProvider;
        }
        interfaceDefSvc.showInterfaceDefinitionTable( data.dataProvider ).then( function() {
            processSelection( selections );
        } );
    } else {
        processSelection( selections );
        if( interfaceDetailsCtx.isConnectionSelected ) {
            var eventDataConnection = {
                connectionSelection: selections
            };
            eventBus.publish( "GraphConnectionSelectionChangeEvent", eventDataConnection );
        } else if( interfaceDetailsCtx.isPortSelected ) {
            var eventDataPort = {
                portSelection: selections
            };
            eventBus.publish( "GraphPortSelectionChangeEvent", eventDataPort );
        }
    }

};

export default exports = {
    onInterfaceDetailsPanelReveal,
    processSelectionChangeEvent
};
app.factory( 'Ase1InterfaceDetailsService', () => exports );
