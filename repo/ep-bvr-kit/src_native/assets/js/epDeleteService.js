// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This service helps delete the data pass on method.
 *
 * @module js/epDeleteService
 */
import app from 'app';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import localeService from 'js/localeService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';

'use strict';

/**
 * This method deletes the selected objects
 *
 * @param {Object} selectedObjects - uids of the selected
 * @param {Object} connectToObject - connectToObject
 */
function performDelete( selectedObjects, connectToObject ) {
    const saveInputWriter = saveInputWriterService.get();
    const relatedSrcObjects = [];
    const relatedObjects = [];

    selectedObjects.forEach( selectedObject => {
        if ( selectedObject !== null && selectedObject !== undefined ) {
            const addDeleteObj = {
                id: selectedObject.uid,
                Type: selectedObject.type
            };
            if ( connectToObject ) {
                addDeleteObj.connectTo = connectToObject.uid;
                relatedObjects.push( connectToObject );
            }
            saveInputWriter.addDeleteObject( addDeleteObj );
            relatedObjects.push( selectedObject );
        }
    } );
    saveInputWriter.addRelatedObjects( relatedObjects );
    epSaveService.saveChanges( saveInputWriter, true, relatedSrcObjects );
}

/**
 * This methods delete the selected elements
 *
 * @param {Object} objectsToDelete - uids of the objects to delete
 * @param {Object} connectToObject - connectToObject,
 * @param {Object} relatedDataset - Object
 */
export const deleteObjects = function( objectsToDelete, connectToObject, relatedDataset ) {
    // show the confirmation message
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/epDeleteMessages' );
    const deleteConfirmationMessage = relatedDataset ? getLocalizedMessage( resource, [ relatedDataset ] ) :
        getLocalizedMessage( resource, objectsToDelete );
    mfgNotificationUtils.displayConfirmationMessage( deleteConfirmationMessage, resource.delete, resource.discard ).then(
        () => {
            performDelete( objectsToDelete, connectToObject );
        }
    );
};

/**
 * Get the message for given key from given resource file, replace the parameter and return the localized string
 *
 * @param {String} localTextBundle - The message bundles localized files
 * @param {String} objectsToDelete - The objects to delete
 * @returns {String} localizedValue - The localized message string
 */
function getLocalizedMessage( localTextBundle, objectsToDelete ) {
    return objectsToDelete && objectsToDelete.length === 1 ? localTextBundle.DeleteSingleMessage.format( objectsToDelete[0].props.object_string.uiValues[0] )
        : localTextBundle.DeleteMultipleMessage.format( objectsToDelete.length );
}

let exports = {};
export default exports = {
    deleteObjects
};
