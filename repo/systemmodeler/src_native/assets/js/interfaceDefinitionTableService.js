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
 *
 * @module js/interfaceDefinitionTableService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import editHandlerSvc from 'js/editHandlerService';
import appCtxSvc from 'js/appCtxService';
import selectionService from 'js/selection.service';
import commandsMapService from 'js/commandsMapService';
import viewModelObjectService from 'js/viewModelObjectService';
import commandSvc from 'js/command.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'jquery';
import 'angular';

var exports = {};

var _interfaceDefinitionCtx;

var _isInterfaceTableEditing = 'isInterfaceTableEditing';

var _isInterfaceTableEditable = 'isInterfaceTableEditable';

var _isAttributeTableEditing = 'isAttributeTableEditing';

export let handleTableSelection = function( dataprovider, selection ) {
    if( dataprovider ) {
        if( selection && selection.length > 0 ) {
            // Get current selected object
            var _parentSelection1 = selectionService.getSelection();
            var idUid;
            var currentSelected = null;
            if( dataprovider.name === 'attributeDataProvider' ) {
                var currentSelection = _parentSelection1.selected;
                var parentSelection = _parentSelection1.parent;

                if( currentSelection.length > 0 ) {
                    if( commandsMapService.isInstanceOf( 'Seg0Implements', currentSelection[ 0 ].modelType ) ) {
                        idUid = currentSelection[ 0 ].props.secondary_object.dbValue;
                        currentSelected = viewModelObjectService.createViewModelObject( idUid, 'EDIT' );
                    } else {
                        currentSelected = currentSelection[ 0 ];
                    }

                    if( parentSelection !== undefined ) {
                        if( commandsMapService.isInstanceOf( 'Seg0Implements', parentSelection.modelType ) ) {
                            idUid = parentSelection.props.secondary_object.dbValue;
                            currentSelected = viewModelObjectService.createViewModelObject( idUid, 'EDIT' );
                        } else {
                            currentSelected = parentSelection;
                        }
                    }
                }
                selectionService.updateSelection( selection, currentSelected );
            } else {
                var currentIDSelection = [];
                for( var index = 0; index < selection.length; index++ ) {
                    if( commandsMapService.isInstanceOf( 'Seg0Implements', selection[ index ].modelType ) ) {
                        idUid = selection[ index ].props.secondary_object.dbValue;
                        currentIDSelection.push( viewModelObjectService.createViewModelObject( idUid, 'EDIT' ) );
                    }
                }
                selectionService.updateSelection( currentIDSelection );
            }
        } else {
            var parent;
            if( dataprovider.name === 'interfaceDefinitionDataProvider' ) {
                var interfaceDetailsCtx = appCtxSvc.getCtx( 'interfaceDetails' );
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
};

export let clearTableSelection = function( tableGridId ) {
    if( tableGridId === 'interfaceDefinitionTable' ) {
        eventBus.publish( 'gwt.SplitPanelDeSelectEvent' );
    } else {
        var _parentSelection2 = selectionService.getSelection();
        var parent = _parentSelection2.parent;
        if( parent ) {
            selectionService.updateSelection( parent );
        }
    }
};

export let processSplitPanelDeSelectEvent = function() {
    var interfaceDetailsCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    var parent = interfaceDetailsCtx.targetModelObject;
    if( parent ) {
        selectionService.updateSelection( parent );
    }
};

var updateStateForInterfaceDefinition = function() {
    var context = appCtxSvc.getCtx( 'interfaceDetails' );
    if( context.targetModelObjectUid.length > 0 ) {
        context.showInterfaceDefinitionTable = true;
    } else {
        context.showInterfaceDefinitionTable = false;
    }
};

export let removeEventChangeOperation = function() {
    var relationInputs = [];

    var interfaceDetailsCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        var primaryObj = {
            uid: interfaceDetailsCtx.targetModelObject.props.awb0UnderlyingObject.dbValues[ 0 ]

        };
        for( var index = 0; index < selection.length; index++ ) {
            relationInputs.push( {
                primaryObject: primaryObj,
                secondaryObject: selection[ index ],
                relationType: 'Seg0Implements'
            } );
        }
    }

    return relationInputs;
};

/**
 * Depending on diagram selection update the interface Definition table . If on selection change before that if edit
 * is in progress then show the leave confirmation message
 * @param {Object} dataprovider interface definition dataprovider
 *
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let showInterfaceDefinitionTable = function( dataprovider ) {
    var deferred = AwPromiseService.instance.defer();
    if( dataprovider ) {
        _interfaceDefinitionCtx = dataprovider.json.editContext;
        var editHandler = editHandlerSvc.getEditHandler( _interfaceDefinitionCtx );
        if( editHandler && editHandler.editInProgress() ) {
            editHandler.leaveConfirmation().then( function() {
                updateStateForInterfaceDefinition();
                deferred.resolve();
            } );
        } else {
            updateStateForInterfaceDefinition();
            deferred.resolve();
        }
    }
    return deferred.promise;
};

/*
 * @param {object} dataprovider - the data provider Object @param {object} eventData - the event data object
 */
export let updateEditState = function( dataProvider, eventData ) {
    if( dataProvider && eventData.dataSource && eventData.dataSource.name === dataProvider.name ) {
        if( eventData.state === 'starting' ) {
            appCtxSvc.updateCtx( _isInterfaceTableEditing, true );
        } else {
            appCtxSvc.updateCtx( _isInterfaceTableEditing, false );
        }
        eventBus.publish( 'plTable.editStateChange', eventData );
    }
};

/**
 * Initialize the app context variable
 *
 * @param {object} dataprovider - the data provider Object
 */
export let initialiseContext = function( dataprovider ) {
    if( dataprovider && dataprovider.json ) {
        _interfaceDefinitionCtx = dataprovider.json.editContext;
        var editHandler = editHandlerSvc.getEditHandler( _interfaceDefinitionCtx );
        appCtxSvc.registerCtx( _isInterfaceTableEditing, editHandler.editInProgress() );

        appCtxSvc.registerCtx( _isInterfaceTableEditable, editHandler.canStartEdit() );
    }
    appCtxSvc.registerCtx( _isAttributeTableEditing, false );
    var context = appCtxSvc.getCtx( 'interfaceDetails' );
    if( context.attributePanelOpened || context.attributePanelOpened === true ) {
        context.attributePanelOpened = false;
        commandSvc.executeCommand( 'Att1MeasurementMgmt' );
    }
};

/**
 * Start edit interface Definition table
 */
export let startEditInterfaceDefinitionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interfaceDefinitionCtx );
    editHandlerSvc.setActiveEditHandlerContext( _interfaceDefinitionCtx );
    editHandler.startEdit();
};

/**
 * Cancel edit interface table
 */
export let cancelEditInterfaceDefinitionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interfaceDefinitionCtx );
    editHandler.cancelEdits();
};

/**
 * Save edit interface Definition table
 */
export let saveEditInterfaceDefinitionTable = function() {
    var editHandler = editHandlerSvc.getEditHandler( _interfaceDefinitionCtx );
    editHandler.saveEdits();
};

/**
 * Update port and its parent node in graph
 * @param {Array} updatedModelObjects the array of ModelObjects of updated objects
 */
export let updateNodeAndPortInGraph = function( updatedModelObjects ) {
    var portModel = _.get( appCtxSvc, 'ctx.interfaceDetails.targetModelObject', null );

    if( updatedModelObjects && updatedModelObjects.length > 0 && portModel !== null &&
        _.get( appCtxSvc, 'ctx.interfaceDetails.isPortSelected', false ) ) {
        var objectsToUpdateInGraph = [];

        _.forEach( updatedModelObjects, function( updatedModelObject ) {
            if( updatedModelObject.uid === portModel.props.awb0UnderlyingObject.dbValues[ 0 ] ) {
                var portMap = _.get( appCtxSvc, 'ctx.graph.graphModel.portMap', null );

                objectsToUpdateInGraph.push( portModel );
                if( portMap !== null ) {
                    var curPort = portMap[ portModel.uid ];
                    var curPortOwner = curPort.getOwner();
                    objectsToUpdateInGraph.push( curPortOwner.modelObject );
                }
            }
        } );
        if( objectsToUpdateInGraph.length > 0 ) {
            // make a manageDiagram2 call
            var eventDataRefresh = {
                userAction: 'UpdateDiagram',
                elementsToUpdate: objectsToUpdateInGraph,
                diagramElements: [],
                eventName: 'AMUpdateDiagramEvent'
            };

            eventBus.publish( 'AMManageDiagramEvent', eventDataRefresh );
        }
    }
};

export default exports = {
    handleTableSelection,
    clearTableSelection,
    processSplitPanelDeSelectEvent,
    removeEventChangeOperation,
    showInterfaceDefinitionTable,
    updateEditState,
    initialiseContext,
    startEditInterfaceDefinitionTable,
    cancelEditInterfaceDefinitionTable,
    saveEditInterfaceDefinitionTable,
    updateNodeAndPortInGraph
};
/**
 * @member interfaceDefinitionTableService
 * @memberof NgServices
 *
 * @param {Object} $q - Queue service
 * @param {Object} editHandlerSvc editHandlerService
 * @param {Object} appCtxSvc appCtxService
 * @param {Object} selectionService selectionService
 * @param {Object} commandsMapService commandsMapService
 * @param {Object} viewModelObjectService viewModelObjectService
 * @param {Object} commandSvc commandService
 *
 * @return {Object} service exports exports
 */
app.factory( 'interfaceDefinitionTableService', () => exports );
