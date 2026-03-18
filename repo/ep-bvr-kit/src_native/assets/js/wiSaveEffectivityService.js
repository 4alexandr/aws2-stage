// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/wiSaveEffectivityService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import epSaveService from 'js/epSaveService';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import saveInputWriterService from 'js/saveInputWriterService';
import wiEffectivityContainer from 'js/wiEffectivityContainer';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import _ from 'lodash';

'use strict';

const instrMessagePath = '/i18n/InstructionsEffectivityMessages';
/**
 *
 *
 */
function saveEffectivity(event) {
    const rowObjectToEffectivityArray = wiEffectivityContainer.getUpdatedEffectivityData();
    const currentEndItem = wiEffectivityContainer.getEndItem();
    const saveInputWriter = saveInputWriterService.get();
    let relatedObjects = [];
    const currentEndItemObj = cdm.getObject(currentEndItem);
    let currentContextObjects = [];

    _.forEach(rowObjectToEffectivityArray, function(rowData) {
        if (rowData.isDirty) {
            currentContextObjects.push(rowData.object);
            let effectivityString = rowData.effectivityString;

            let occurrenceEffectivityObj = {};
            if (rowData.effectivityObj && rowData.effectivityObj.uid) {
                occurrenceEffectivityObj = {
                    objectUID: rowData.object.uid,
                    actionType: "Edit",
                    unitObjectID: rowData.effectivityObj.uid,
                    unit: effectivityString,
                    endItem: currentEndItem,
                    endItemRev: ""
                };
            } else {
                occurrenceEffectivityObj = {
                    objectUID: rowData.object.uid,
                    actionType: "Create",
                    unitObjectID: "",
                    unit: effectivityString,
                    endItem: currentEndItem,
                    endItemRev: ""
                };
            }

            saveInputWriter.saveOccurrenceEffectivity(occurrenceEffectivityObj);
            relatedObjects.push(rowData.object);
            relatedObjects.push(currentEndItemObj);
            if (rowData.effectivityObj && rowData.effectivityObj.uid) {
                relatedObjects.push(rowData.effectivityObj);
            }
        }
    });

    epSaveService.saveChanges(saveInputWriter, true, relatedObjects).then(function(response) {
        const eventData = {
            updatedSelectedObjects: currentContextObjects,
            viewModelObjects: response.ServiceData.modelObjects
        };
        eventBus.publish("wi.UpdateEndItemToObjectMap", eventData);
        if (event && event.eventType === "wi.endItemSelectionChangeEvent") {
            eventBus.publish(event.eventType, event.eventData);
        }
        appCtxService.updatePartialCtx(wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, false);
    });
}

function handleUnsavedEffectivity (event) {
    const resource = localeService.getLoadedText(app.getBaseUrlPath() + instrMessagePath);

    const buttonsName = {
        confirm: resource.discard,
        cancel: resource.save
    };

    return mfgNotificationUtils.displayConfirmationMessage(resource.leaveConfirmation, resource.discard,resource.save).then(
        function(response) {
            //on discard
            if (event && event.eventType === "wi.endItemSelectionChangeEvent") {
                eventBus.publish(event.eventType, event.eventData);
            }
        },
        function() {
            // on Save
            exports.saveEffectivity(event);
        });
}
function removeEffectivity(data) {
    const saveInputWriter = saveInputWriterService.get();
    let relatedObjects = [];
    let currentContextObjects = [];

    const resource = localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    const epCtx = appCtxService.getCtx("wiEditor");
    if (epCtx.selectedObjectData.selectedObject && epCtx.selectedObjectData.selectedObject.uid) {
        currentContextObjects.push(epCtx.selectedObjectData.selectedObject);
        relatedObjects.push(epCtx.selectedObjectData.selectedObject);
    }

    const occurrenceEffectivityObj = {
        objectUID: epCtx.selectedObjectData.selectedObject.uid,
        unitObjectID: data.vmo.uid,
        actionType: "Remove",
        unit: "",
        endItem: "",
        endItemRev: ""

    };
    saveInputWriter.saveOccurrenceEffectivity(occurrenceEffectivityObj);

    relatedObjects.push(cdm.getObject(data.vmo.uid));

    epSaveService.saveChanges(saveInputWriter, true, relatedObjects).then(function(response) {
        eventBus.publish("updateEffectivityPopup", {
            toRemoveObjects: [data.vmo]
        });
        messagingService.showInfo( resource.removedEffectivity );
    } );
}

const exports = {
    handleUnsavedEffectivity,
    saveEffectivity,
    removeEffectivity
};

export default exports;
