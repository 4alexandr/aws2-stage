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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Att1AttrMappingTableEditService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import policySvc from 'soa/kernel/propertyPolicyService';
import editHandlerSvc from 'js/editHandlerService';
import 'js/eventBus';
import 'lodash';

var exports = {};

var _mappingTableContextName = 'Att1ShowMappedAttribute';
var _isMappingTableEditing = 'isMappingTableEditing';
var _mappingTableDefinitionCtx = null;
var _attrEditHandler = null;

/**
 * @param {Object} dataProvider the data provider Object
 * @param {Object} eventData the event data object
 */
export let updateEditState = function( dataProvider, eventData ) {
    if( dataProvider && eventData.dataSource && eventData.dataSource.name === dataProvider.name ) {
        if( eventData.state === 'starting' ||  eventData.state === 'partialSave' && eventData.failureUids.length > 0  ) {
            appCtxSvc.updateCtx( _isMappingTableEditing, true );
        } else {
            appCtxSvc.updateCtx( _isMappingTableEditing, false );
        }
    }
};

/**
 *
 */
function _ensureAttrEditHandler() {
    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
    if( mapContext ) {
        _mappingTableDefinitionCtx = mapContext.tableContextName;
        _attrEditHandler = mapContext.attrEditHandler;
    }
}

/**
 * Start edit mapping table
 */
export let startEditAttributeMappingTable = function() {
    _ensureAttrEditHandler();
    editHandlerSvc.setActiveEditHandlerContext( _mappingTableDefinitionCtx );
    _attrEditHandler.startEdit();
};

/**
 * Start edit attribute table
 *
 * @param {String} tableContextName the table context name
 */
export let startEditAttributeTable = function( tableContextName ) {
    var mapContext = appCtxSvc.getCtx( tableContextName );
    if( mapContext ) {
        _mappingTableDefinitionCtx = tableContextName;
    }
    _attrEditHandler = editHandlerSvc.getEditHandler( _mappingTableDefinitionCtx );
    editHandlerSvc.setActiveEditHandlerContext( _mappingTableDefinitionCtx );
    _attrEditHandler.startEdit();
};

/**
 * Cancel edit mapping table
 */
export let cancelEditAttributeMappingTable = function() {
    _attrEditHandler.cancelEdits();
};

/**
 * Save edit mapping table
 */
export let saveEditAttributeMappingTable = function() {
    //ensure the required objects are loaded
    var policyId = policySvc.register( {
        types: [ {
            name: 'Att0MeasurableAttribute',
            properties: [ {
                name: 'att1InContext'
            } ]
        } ]
    } );
    _attrEditHandler.saveEdits();
    if( policyId ) {
        policySvc.unregister( policyId );
    }
};

/**
 * Att1AttrMappingTableEditService factory
 */

export default exports = {
    updateEditState,
    startEditAttributeMappingTable,
    startEditAttributeTable,
    cancelEditAttributeMappingTable,
    saveEditAttributeMappingTable
};
app.factory( 'Att1AttrMappingTableEditService', () => exports );
