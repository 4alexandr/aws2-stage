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
 * @module js/attributesTableService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import editHandlerSvc from 'js/editHandlerService';
import appCtxSvc from 'js/appCtxService';
import selectionService from 'js/selection.service';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/command.service';

var exports = {};

var _attributeTableCtx;

var _isAttributeTableEditing = 'isAttributeTableEditing';

var _isAttributeTableEditable = 'isAttributeTableEditable';

/**
 * Override default edit handler
 *
 * @param {object} dataprovider - the data provider Object
 */
export let initializeContext = function( dataprovider ) {
    if( dataprovider && dataprovider.json ) {
        _attributeTableCtx = dataprovider.json.editContext;
        var editHandler = editHandlerSvc.getEditHandler( _attributeTableCtx );
        appCtxSvc.registerCtx( _isAttributeTableEditable, editHandler.canStartEdit() );
    } else {
        appCtxSvc.registerCtx( _isAttributeTableEditable, false );
    }
    appCtxSvc.registerCtx( _isAttributeTableEditing, false );

};

/**
 * Update edit state for attribute table and update the commands on the table
 *
 * @param {object} dataprovider - the data provider Object
 * @param {object} eventData - the eventdata object of editHandlerStateChange
 */

export let updateState = function( dataProvider, eventData ) {
    if( dataProvider && eventData.dataSource && eventData.dataSource.name === dataProvider.name ) {
        if( eventData.state === 'starting' ) {
            appCtxSvc.updateCtx( _isAttributeTableEditing, true );
        } else {
            appCtxSvc.updateCtx( _isAttributeTableEditing, false );
        }
        eventBus.publish( 'plTable.editStateChange', eventData );
    }
};

/**
 * Start edit attribute table
 */
export let startEditAttributeTable = function() {

    var editHandler = editHandlerSvc.getEditHandler( _attributeTableCtx );
    editHandlerSvc.setActiveEditHandlerContext( _attributeTableCtx );
    editHandler.startEdit();

};

/**
 * Cancel edit attribute table
 */
export let CancelEditAttributeTable = function() {

    var editHandler = editHandlerSvc.getEditHandler( _attributeTableCtx );
    editHandler.cancelEdits();

};

/**
 * Save edit attribute table
 */
export let saveEditAttributeTable = function() {

    var editHandler = editHandlerSvc.getEditHandler( _attributeTableCtx );
    editHandler.saveEdits();

};

export let removeEventChangeOperation = function() {

    var relationInputs = [];

    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        var primaryObj = selectionService.getSelection().parent;
        relationInputs.push( {
            measurableAttributes: selection,
            parentObj: primaryObj
        } );
    }

    return relationInputs;
};

/**
 * Loading Measurable attribute type
 */
var _loadAttributeType = function() {
    var attrTypes = [];
    var typeNames = [ 'Att0MeasurableAttribute', 'Att0MeasurableAttributeDbl' ];

    _.forEach( typeNames, function( typeName ) {
        var type = cmm.getType( typeName );
        if( !type ) {
            attrTypes.push( typeName );
        }
    } );

    if( attrTypes.length > 0 ) {
        soaSvc.ensureModelTypesLoaded( attrTypes );
    }
};

var _updateTargetUids = function( selectedIDObjects ) {
    var context = appCtxSvc.getCtx( 'interfaceDetails' );
    var targetUids = "";
    var objects = [];
    if( selectedIDObjects ) {
        objects = selectedIDObjects;

    }

    if( objects && objects.length === 1 ) {
        _.forEach( objects, function( object ) {
            if( targetUids.length > 0 ) {
                targetUids = targetUids.concat( " " );
            }
            targetUids = targetUids.concat( object.uid );
        } );
    }
    context.showAttributesTable = targetUids.length > 0;
    context.targetUids = targetUids;
    if( targetUids.length > 0 ) {
        _loadAttributeType();

    }
    return targetUids;

};

/**
 * Set the target uids as on selection of interface Definition table need to update attribute table. If edit state
 * is on for previous attribute table then show the leave confirmation message and update the table
 *
 * @param {object} data
 * @param {object} interfaceDefinitionDataProvider - data provider object for interface Definition table
 */

export let getAttributeTargetUids = function( selectedIDObjects ) {

    var deferred = AwPromiseService.instance.defer();
    var editHandler = null;
    var targetUids = [];

    if( _attributeTableCtx ) {
        editHandler = editHandlerSvc.getEditHandler( _attributeTableCtx );
    }

    if( editHandler !== null && editHandler.editInProgress() ) {
        editHandler.leaveConfirmation().then( function() {
            targetUids = _updateTargetUids( selectedIDObjects );

            var output = {
                "target": targetUids
            };
            editHandler.cancelEdits();
            deferred.resolve( output );
        } );
    } else {
        targetUids = _updateTargetUids( selectedIDObjects );
        var output = {
            "target": targetUids
        };
        deferred.resolve( output );
    }

    return deferred.promise;
};

export default exports = {
    initializeContext,
    updateState,
    startEditAttributeTable,
    CancelEditAttributeTable,
    saveEditAttributeTable,
    removeEventChangeOperation,
    getAttributeTargetUids
};
/**
 * @member attributeTableService
 * @memberof NgServices
 *
 * @param {Object} $q - Queue service
 * @param {Object} editHandlerSvc editHandlerService
 * @param {Object} appCtxSvc appCtxService
 * @param {Object} selectionService selectionService
 * @param {Object} soaSvc soa_kernel_soaService
 * @param {Object} cmm soa_kernel_clientMetaModel
 * @param {Object} commandSvc commandService
 *
 * @return {Object} service exports exports
 */
app.factory( 'attributesTableService', () => exports );
