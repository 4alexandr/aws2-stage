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
 * This service helps create and attach a dataset to an object.
 *
 * @module js/epAttachmentsService
 */
import _ from 'lodash';
import epSaveService from 'js/epSaveService';
import saveInputWriterService from 'js/saveInputWriterService';
import { constants as epSaveConstants } from 'js/epSaveConstants';
import eventBus from 'js/eventBus';

'use strict';

/**
 * Create and attach the dataset.
 * @param {*} connectedObject - object to connect to
 * @param {*} type - type of dataset
 * @param {*} relationType - relation type
 * @param {*} objectName - object name
 * @param {*} objectDesc - object description
 */
export const createAttachmentObjectAndAttach = function (connectedToObject, type, relationType, objectName, objectDesc) {
    const newObjectUid = "new_object_id" + Math.random().toString();
    const objectsToCreateEntry = {
        Object: {
            nameToValuesMap: {
                id: [newObjectUid],
                connectTo: [connectedToObject.uid],
                Type: [type],
                RelationType: [relationType]
            }
        },
        ItemProps: {
            nameToValuesMap: {
                object_name: [objectName]
            }
        }
    };
    if (objectDesc) {
        objectsToCreateEntry.ItemProps.nameToValuesMap.object_desc = [objectDesc];
    }
    let saveInputWriter = saveInputWriterService.get();
    saveInputWriter.addEntryToSection(epSaveConstants.OBJECTS_TO_CREATE, objectsToCreateEntry);
    epSaveService.saveChanges(saveInputWriter, true, [connectedToObject]).then( (responseObj) => {
        const saveEvents = responseObj.saveEvents;
        //No save events in case the saveChanges fails
        if (saveEvents === undefined) {
            eventBus.publish('progress.end');
            eventBus.publish('epAttachFile.closePopupWindow');
        }
    }); 
};

let exports = {};
export default exports = {
    createAttachmentObjectAndAttach
};
