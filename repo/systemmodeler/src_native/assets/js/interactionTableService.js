// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/interactionTableService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import editHandlerSvc from 'js/editHandlerService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import selectionService from 'js/selection.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'jquery';
import 'angular';

var _interactionEditCtx;

var _isInteractionTableEditing = 'isInteractionTableEditing';

var _isInteractionTableEditable = 'isInteractionTableEditable';

var _isAttributeTableEditing = 'isAttributeTableEditing';

var exports = {};

export let handleTableSelection = function( dataprovider, selection ) {
    if( dataprovider ) {
        var context = appCtxSvc.getCtx( 'interfaceDetails' );
        if( selection.length > 0 ) {
            // Currently Interaction table does not have support for multi-select, hence processing only first selection
            var selectedInteractionUid = selection[ 0 ].props.ase1Interaction.dbValue;
            var selectedInteraction = viewModelObjectService
                .createViewModelObject( selectedInteractionUid, "EDIT" );

            context.selectedInteractionObject = selectedInteraction;

            if( selectedInteraction ) {
                selectionService.updateSelection( selectedInteraction,
                    appCtxSvc.ctx.interfaceDetails.selectedConnection );
            }
        } else {
            context.selectedInteractionObject = null;
            var parent;
            if( dataprovider.name === 'interactionDataProvider' ) {
                var interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
                parent = interfaceDetailsCtx.targetModelObject;
                if( parent ) {
                    selectionService.updateSelection( parent );

                }
            } else {
                var _parentSelection2 = selectionService.getSelection();
                parent = _parentSelection2.parent;
                if( parent ) {
                    selectionService.updateSelection( parent );

                }
            }
        }
    }
    exports.updateAttributeMappingTableFuntion( dataprovider, selection );
};

export let processSplitPanelDeSelectEvent = function() {
    var interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
    var parent = interfaceDetailsCtx.targetModelObject;
    if( parent ) {
        selectionService.updateSelection( parent );

    }
};

export let updateAttributeMappingTableFuntion = function( dataprovider, selection ) {
    if( dataprovider ) {
        var parentUids = '';
        var connectionInfo = '';
        var interactionSelected = false;

        var attrContext = appCtxSvc.getCtx( 'Att1ShowMappedAttribute' );
        if( !selection || selection.length === 0 ) {
            if( attrContext && attrContext.interactionSelected ) {
                attrContext.interactionSelected = false;
                attrContext.parentUids = parentUids;
                attrContext.connectionInfo = connectionInfo;
                attrContext.clientScopeURI = "InteractionAttributeMappingTable";
                attrContext.clientName = "AWClient";
                attrContext.selectedConnection = null;
                attrContext.selectedInteractionObject = null;
                attrContext.productContextUids = null;
                attrContext.rootElementUids = null;
                attrContext.openedObjectUid = null;
                attrContext.mappingCommand = null;
                eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
            }

        } else {
            _.forEach( selection, function( interactionProxy ) {
                interactionSelected = true;
                parentUids = parentUids + interactionProxy.props.ase1Interaction.dbValue + ' ';
                var connectionElementUid = interactionProxy.props.ase1ConnectionElement.dbValue;

                var connectionElement = viewModelObjectService
                    .createViewModelObject( connectionElementUid, "EDIT" );
                if( connectionElement && connectionElement.props.awb0UnderlyingObject ) {
                    var nullString = 'null';
                    if( interactionProxy.props.ase1FromInterfaceDef.dbValue ) {
                        connectionInfo = interactionProxy.props.ase1FromInterfaceDef.dbValue;
                    } else {
                        connectionInfo = nullString;
                    }
                    connectionInfo += ' ';

                    if( connectionElement.props.awb0UnderlyingObject.dbValue ) {
                        connectionInfo += connectionElement.props.awb0UnderlyingObject.dbValue;
                    } else {
                        connectionInfo += nullString;
                    }
                    connectionInfo += ' ';

                    if( interactionProxy.props.ase1ToInterfaceDef.dbValue ) {
                        connectionInfo += interactionProxy.props.ase1ToInterfaceDef.dbValue;
                    } else {
                        connectionInfo += nullString;
                    }
                    connectionInfo += '  ';
                }
            } );

            if( attrContext ) {
                attrContext.parentUids = parentUids;
                attrContext.connectionInfo = connectionInfo;
                attrContext.interactionSelected = interactionSelected;
                attrContext.clientScopeURI = "InteractionAttributeMappingTable";
                attrContext.clientName = "AWClient";
                attrContext.selectedConnection = appCtxSvc.ctx.interfaceDetails.selectedConnection;
                attrContext.selectedInteractionObject = appCtxSvc.ctx.interfaceDetails.selectedInteractionObject;
                attrContext.productContextUids = null;
                attrContext.rootElementUids = null;
                attrContext.openedObjectUid = null;
                attrContext.mappingCommand = null;
                appCtxSvc.updateCtx( "Att1ShowMappedAttribute", attrContext );
            } else {
                attrContext = {
                    parentUids: parentUids,
                    connectionInfo: connectionInfo,
                    interactionSelected: interactionSelected,
                    clientScopeURI: "InteractionAttributeMappingTable",
                    selectedConnection: appCtxSvc.ctx.interfaceDetails.selectedConnection,
                    selectedInteractionObject: appCtxSvc.ctx.interfaceDetails.selectedInteractionObject,
                    clientName: "AWClient"
                };
                appCtxSvc.registerCtx( "Att1ShowMappedAttribute", attrContext );
            }
            eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
        }

    }
};

/* Create input data for delete operation */
export let deleteEventChangeOperation = function() {

    var objects = [];
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        for( var index = 0; index < selection.length; index++ ) {
            objects.push( {
                uid: selection[ index ].uid,
                type: ""
            } );
        }
    }
    return objects;

};

/**
 * Start edit interaction table
 */
export let startEditInteractionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interactionEditCtx );
    editHandlerSvc.setActiveEditHandlerContext( _interactionEditCtx );
    editHandler.startEdit();
};

/**
 * Cancel edit interaction table
 */
export let cancelEditInteractionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interactionEditCtx );
    editHandler.cancelEdits();
};

/**
 * Save edit interaction table
 */
export let saveEditInteractionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interactionEditCtx );
    editHandler.saveEdits();
};

/*
 * @param {object} dataprovider - the data provider Object @param {object} eventData - the event data object
 */
export let updateEditState = function( dataProvider, eventData ) {
    if( dataProvider && eventData.dataSource && eventData.dataSource.name === dataProvider.name ) {
        if( eventData.state === 'starting' ) {
            appCtxSvc.updateCtx( _isInteractionTableEditing, true );
        } else {
            appCtxSvc.updateCtx( _isInteractionTableEditing, false );
        }
        eventBus.publish( 'plTable.editStateChange', eventData );
    }
};

var updateStateForInteraction = function() {
    var context = appCtxSvc.getCtx( 'interfaceDetails' );
    if( context.targetModelObjectUid.length > 0 && !context.isPortSelected ) {
        context.showInteractionTable = true;
    } else {
        context.showInteractionTable = false;
    }
};

/**
 * Initialize the app context variable
 *
 * @param {object} dataprovider - the data provider Object
 */
export let initialiseContext = function( dataprovider ) {
    if( dataprovider && dataprovider.json ) {
        _interactionEditCtx = dataprovider.json.editContext;
        editHandlerSvc.getEditHandler( _interactionEditCtx );
        appCtxSvc.registerCtx( _isInteractionTableEditing, false );
        appCtxSvc.registerCtx( _isInteractionTableEditable, true );

    }
    appCtxSvc.registerCtx( _isAttributeTableEditing, false );
    var context = appCtxSvc.getCtx( 'interfaceDetails' );
    if( context && context.attributePanelOpened && context.attributePanelOpened === true ) {
        context.attributePanelOpened = false;
    }
};

/**
 * Depending on diagram selection update the interaction table . If on selection change before that if edit is in
 * progress then show the leave confirmation message
 *
 * @param {Object} dataprovider interaction dataprovider
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let showInteractionTable = function( dataprovider ) {
    var deferred = AwPromiseService.instance.defer();
    if( dataprovider ) {
        _interactionEditCtx = dataprovider.json.editContext;
        var editHandler = editHandlerSvc.getEditHandler( _interactionEditCtx );
        if( editHandler && editHandler.editInProgress() ) {
            editHandler.leaveConfirmation().then( function() {
                updateStateForInteraction();
                deferred.resolve();
            } );
        } else {
            updateStateForInteraction();
            deferred.resolve();
        }
    }
    return deferred.promise;
};

export default exports = {
    handleTableSelection,
    processSplitPanelDeSelectEvent,
    updateAttributeMappingTableFuntion,
    deleteEventChangeOperation,
    startEditInteractionTable,
    cancelEditInteractionTable,
    saveEditInteractionTable,
    updateEditState,
    initialiseContext,
    showInteractionTable
};
/**
 * @member interactionTableService
 * @memberof NgServices
 *
 * @param {Object} $q - Queue service
 * @param {Object} editHandlerSvc editHandlerService
 * @param {Object} appCtxSvc appCtxService
 * @param {Object} viewModelObjectService viewModelObjectService
 * @param {Object} selectionService selectionService
 *
 * @return {Object} service exports exports
 */
app.factory( 'interactionTableService', () => exports );
