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
 * @module js/mbmSaveService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import mbmSaveUtils from 'js/mbmSaveUtils';
import _ from 'lodash';
import epSaveService from 'js/epSaveService';
import saveInputWriterService from 'js/saveInputWriterService';
import messagingService from 'js/messagingService';
import mbmCompareUtils from 'js/mbmCompareUtils';
import { constants as epSaveConstants } from 'js/epSaveConstants';

var exports = {};

/**
 * performs save SOA call 
 * @param {String} option the operation to be performed ie. add, remove
 * @param {Array} sourceObjects array of source objects
 * @param {Object} targetObject target object
 * @param {String} sourceContextKey context key of source
 * @param {String} targetContextKey context key of target 
 * @param {String} performCheck  performCheck flag
 * @return {Object} soa response  
 */
export let saveChanges = function( option, sourceObjects, targetObject, sourceContextKey, targetContextKey, performCheck, sortPropertyName, sortOrder ) {
    let saveInput = getSaveInput( option, sourceObjects, targetObject, sourceContextKey, targetContextKey, performCheck, sortPropertyName, sortOrder );
    return epSaveService.performSaveChangesCall( saveInput ).then( function( response ) {
        return {
            newElements: mbmSaveUtils.getNewElements( response ),
            childElements: mbmSaveUtils.getChildren( response ),
            source: mbmSaveUtils.getSource( response ),
            target: mbmSaveUtils.getTarget( response ),
            removedObjects: mbmSaveUtils.getRemovedElements(response),
            serviceData: response.ServiceData
        };

    }, function( error ) {
        mbmCompareUtils.setModificationInProgress( false );
        var err = messagingService.getSOAErrorMessage( error );
        messagingService.showError( err );
        return err;
    } );
};
/**
 * Get save SOA input 
 * @param {String} option the operation to be performed ie. add, remove
 * @param {Array} sourceObjects array of source objects
 * @param {Object} targetObject target object
 * @param {String} sourceContextKey context key of source
 * @param {String} targetContextKey context key of target 
 * @param {String} performCheck  performCheck flag
 * @param {Array} sortPropertyName array sort property names
 * @param {Array} sortOrder array of sort Order
 * @return {Object} soa input
 */
export let getSaveInput = function( option, sourceObjects, targetObject, sourceContextKey, targetContextKey, performCheck, sortPropertyName, sortOrder ) {
    let relatedObjects = [];
    _.forEach( sourceObjects, function( sourceObject ) {
        relatedObjects.push( sourceObject );
    } );
    relatedObjects.push( targetObject );

    let saveInputWriter = saveInputWriterService.get();
    let targetObjectIds = [];
    targetObjectIds.push( targetObject.uid );
    let sourceObjectIds = [];
    _.forEach( sourceObjects, function( sourceObject ) {
        sourceObjectIds.push( sourceObject.uid );
    } );
    let ebomScope = appCtxService.getCtx( sourceContextKey ).topElement.uid;
    let mbomScope = appCtxService.getCtx( targetContextKey ).topElement.uid;
    let ObjectsToModifyEntry;
    if( option === 'Add' || option === 'Move' ) {
        ObjectsToModifyEntry = mbmSaveUtils.getEntryForAdd( targetObjectIds, sourceObjectIds, sortPropertyName, sortOrder,option );
        saveInputWriter.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, ObjectsToModifyEntry );
    }

    let ebomPci = appCtxService.getCtx( sourceContextKey + '.productContextInfo' ).uid;
    let mbomPci = appCtxService.getCtx( targetContextKey + '.productContextInfo' ).uid;

    let sessionEntry = mbmSaveUtils.getEntryForSessionSection( performCheck, [ ebomPci ], [ mbomPci ], [ ebomScope ], [ mbomScope ] );
    saveInputWriter.addEntryToSection( epSaveConstants.SESSION, sessionEntry );
    saveInputWriter.addRelatedObjects( relatedObjects );
    return saveInputWriterService.getSaveInput( saveInputWriter );
};

export default exports = {
    saveChanges,
    getSaveInput
};
app.factory( 'mbmSaveService', () => exports );
