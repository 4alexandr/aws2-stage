// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/CadBomOccurrenceAlignmentUtil
 */

import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import _ from 'lodash';
import CadBomAlignmentUtil from 'js/CadBomAlignmentUtil';
import cbaConstants from 'js/cbaConstants';
import dataManagementService from 'soa/dataManagementService';

let exports = {};

/**
 * Update state from URL parameters
 *
 * @param {Object} paramsToBeStoredOnUrl The object containing URL parametrers
 */
export let addParametersOnUrl = function( paramsToBeStoredOnUrl ) {
    _.forEach( paramsToBeStoredOnUrl, function( value, name ) {
        AwStateService.instance.params[ name ] = value;
    } );
    AwStateService.instance.go( AwStateService.instance.current.name, AwStateService.instance.params );
};

/**
 * Checks if either Source or Target row has been selected from UI
 * @param {String} path - appCtx path that need to be updated
 * @param {String} value - Value to be set for appCtx path
 */
export let updateCBAContextOnRowSelection = function( path, value ) {
    let isTrue = value === 'true';
    appCtxSvc.updatePartialCtx( path, isTrue );
};

/**
 * Update model object in context
 * @param {object} data - data
 */
export let updateModelObjectInContext = function( data ) {
    if( data && data.selection ) {
        let modelObject = cdmSvc.getObject( data.selection.uid );
        appCtxSvc.updatePartialCtx( data.source + '.modelObject', modelObject );
        appCtxSvc.updatePartialCtx( data.source + '.currentState.uid', modelObject.uid );

        if( data.source === cbaConstants.CBA_SRC_CONTEXT ) {
            appCtxSvc.updatePartialCtx( 'cbaContext.srcStructure', modelObject );
        } else if( data.source === cbaConstants.CBA_TRG_CONTEXT ) {
            appCtxSvc.updatePartialCtx( 'cbaContext.trgStructure', modelObject );
        }
    }
};

/**
 * Load properties for objects
 * @param {String} objects - list of object Uids to load given properties
 * @param {String} properties - List of properties to load
 * 
 * @returns {Promise} After properties load return promise.
 */
export let loadProperties = function( objects, properties ) {
    if( objects && objects.length && properties && properties.length ) {
        let deferred = AwPromiseService.instance.defer();
        let uidsToload = [];
        _.forEach( objects, function( object ) {
            for( let index = 0; index < properties.length; index++ ) {
                const property = properties[ index ];
                if( !( object.props && object.props[ property ] ) ) {
                    uidsToload.push( object.uid );
                    break;
                }
            }
        } );
        if( uidsToload.length ) {
            dataManagementService.getProperties( uidsToload, properties ).then( function() {
                deferred.resolve( null );
            } );
            return deferred.promise;
        }
    }
    return AwPromiseService.instance.resolve( null );
};

/**
 * @param {Object} sourceObject The source object
 * @param {Object} targetObject The target object
 * @param {Object} invalidTypes List of invalid type of object to open in CBA
 * @returns {String} The error message text
 */
export let getErrorMessage = function( sourceObject, targetObject, invalidTypes ) {
    return AwPromiseService.instance.all( {
        uiMessages: localeService.getTextPromise( 'CadBomAlignmentMessages' )
    } ).then( function( localizedText ) {
        let deferred = AwPromiseService.instance.defer();
        let errorText;
        if( invalidTypes ) {
            let promise = loadProperties( invalidTypes, [ 'object_name' ] );
            promise.then( function() {
                let object = invalidTypes[ 0 ];
                let objNameProp = CadBomAlignmentUtil.getPropertyValueFromObject( object, 'props.object_name' );
                let objectName = objNameProp && objNameProp.dbValues.length ? objNameProp.dbValues[ 0 ] : '';

                if( !appCtxSvc.ctx.panelContext ) {
                    if( !sourceObject && !targetObject || invalidTypes.length === 0 ) {
                        errorText = localizedText.uiMessages.InvalidObjectsForAlignment;
                    } else if( !sourceObject ) {
                        errorText = localizedText.uiMessages.InvalidDesignForAlignment.format( objectName );
                    } else if( !targetObject ) {
                        errorText = localizedText.uiMessages.InvalidPartForAlignment.format( objectName );
                    }
                } else {
                    if( !sourceObject ) {
                        errorText = localizedText.uiMessages.InvalidDesignDBOMForAlignment.format( objectName );
                    } else {
                        errorText = localizedText.uiMessages.InvalidPartEBOMForAlignment.format( objectName );
                    }
                }
                deferred.resolve( errorText );
            } );
        } else {
            deferred.resolve( errorText );
        }
        return deferred.promise;
    } );
};

/**
 * Get loaded VMO uid for the given underlying object uids
 *
 * @param {List} underlyingObjUids - List of uids of underlying objects
 * @param {string} contextKey - context key from which loaded VMO to fetch, 
 * if not specified VMO will be fetched from both source and taget context.
 * @returns {List} - List of VMO uids
 */
export let getLoadedVMO = function( underlyingObjUids, contextKey ) {
    let outputVMOs = [];
    let contexts = [];

    if( contextKey ) {
        contexts[ 0 ] = contextKey;
    } else {
        contexts = appCtxSvc.ctx.splitView.viewKeys;
    }

    _.forEach( contexts, function( context ) {
        let loadedVMOs = appCtxSvc.ctx[ context ].vmc.loadedVMObjects;

        _.forEach( loadedVMOs, function( vmo ) {
            let awb0UnderlyingObject = CadBomAlignmentUtil.getPropertyValueFromObject( vmo, 'props.awb0UnderlyingObject' );
            if( awb0UnderlyingObject ) {
                let underlyingObjUid = awb0UnderlyingObject.dbValues[ 0 ];
                if( underlyingObjUids.includes( underlyingObjUid ) ) {
                    outputVMOs.push( vmo.uid );
                }
            }
        } );
    } );
    return outputVMOs;
};

/**
 * Register Split Mode
 */
export let registerSplitViewMode = function() {
    appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_MODE, true );
    appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_VIEWKEYS, [ cbaConstants.CBA_SRC_CONTEXT, cbaConstants.CBA_TRG_CONTEXT ] );
};

/**
 * Un-Register Split Mode
 */
export let unRegisterSplitViewMode = function() {
    let cbaViewKeys = appCtxSvc.getCtx( cbaConstants.CTX_PATH_SPLIT_VIEW_VIEWKEYS );
    _.forEach( cbaViewKeys, function( cbaViewKey ) {
        appCtxSvc.unRegisterCtx( cbaViewKey );
    } );
    appCtxSvc.unRegisterCtx( cbaConstants.CTX_PATH_SPLIT_VIEW );
};

/**
 * CAD-BOM Occurrence Alignment Util
 */
export default exports = {
    addParametersOnUrl,
    updateCBAContextOnRowSelection,
    updateModelObjectInContext,
    loadProperties,
    getErrorMessage,
    getLoadedVMO,
    registerSplitViewMode,
    unRegisterSplitViewMode
};
app.factory( 'CadBomOccurrenceAlignmentUtil', () => exports );
