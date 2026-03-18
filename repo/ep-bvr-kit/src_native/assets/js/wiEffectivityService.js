// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for wi effectivity.
 *
 * @module js/wiEffectivityService
 */

import app from 'app';
import _ from 'lodash';
import localeSvc from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';
import TypeUtils from 'js/utils/mfeTypeUtils';
import { constants as epBvrConstants } from 'js/epBvrConstants';

'use strict';

const instrMessagePath = '/i18n/InstructionsEffectivityMessages';

/**
 * function for asking confirmation message before deleting the effectivity obj
 * @param {Object} effectivityObj - effectivity Object
 * @param {Object} selectedObject - selectedObject obj in wi editor
 */
export function handleRemoveEffectivity( effectivityObj, selectedObject ) {
    const resource = localeSvc.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    return mfgNotificationUtils.displayConfirmationMessage( resource.removeEffectivityConfirmation, resource.discard, resource.remove).then(
        function( response ) {
            //on discard
        },
        function() {
            // on Remove
            removeEffectivity( effectivityObj, selectedObject ).then(function(){
                eventBus.publish("wi.updateEffectivityList", {
                    toRemoveObjects: [effectivityObj]
                });
            });
        } );
}

/**
 * delete selected effectivity object under a op/process
 * @param {Object} effectivityObj - vmo of effectivity Object
 * @param {Object} selectedObject - selectedObject obj in wi editor
 */
function removeEffectivity(effectivityObj, selectedObject){
    const saveInputWriter = saveInputWriterService.get();
    let relatedObjects = [];

    const resource = localeSvc.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    const occurrenceEffectivityObj = {
        objectUID: selectedObject.uid,
        unitObjectID: effectivityObj.uid,
        actionType: "Remove",
        unit: "",
        endItem: "",
        endItemRev: ""

    };
    saveInputWriter.saveOccurrenceEffectivity(occurrenceEffectivityObj);

    relatedObjects.push(selectedObject);
    relatedObjects.push(cdm.getObject(effectivityObj.uid));

    return epSaveService.saveChanges(saveInputWriter, true, relatedObjects).then(function() {
        messagingService.showInfo( resource.removedEffectivity );
    } );
}

/**
 * @param {Object} selectedObject 
 * @param {Object} effectivityObj
 * @param {String} units 
 * @param {Object} selectedEndItems
 */
export function createEffectivity(selectedObject, effectivityObj, units, selectedEndItems){
    const resource = localeSvc.getLoadedText( app.getBaseUrlPath() + instrMessagePath );
    const saveInputWriter = saveInputWriterService.get();
    let endItemObj = selectedEndItems[0] ? cdm.getObject(selectedEndItems[0].uid) : cdm.getObject(effectivityObj.props.end_item.dbValues[0]);
    if(TypeUtils.isOfType( endItemObj, epBvrConstants.ITEM_REVISION )){
        endItemObj = cdm.getObject( endItemObj.props.items_tag.dbValues[ 0 ] );
    }

    let relatedObjects = [];
    let occurrenceEffectivityObj = {
        objectUID: selectedObject.uid,
        unit: units,
        endItem: endItemObj.uid
    };
    if (effectivityObj && effectivityObj.uid) {
        occurrenceEffectivityObj.actionType = "Edit";
        occurrenceEffectivityObj.unitObjectID = effectivityObj.uid;
    } else {
        occurrenceEffectivityObj.actionType = "Create";
        occurrenceEffectivityObj.unitObjectID = "";
    }

    saveInputWriter.saveOccurrenceEffectivity(occurrenceEffectivityObj);
    relatedObjects.push(selectedObject);
    relatedObjects.push(endItemObj);
    effectivityObj && relatedObjects.push(effectivityObj);

    epSaveService.saveChanges(saveInputWriter, true, relatedObjects).then(function(response) {
        eventBus.publish("aw.closePopup");
        const message = effectivityObj ? resource.modified : resource.created;
        response.ServiceData && messagingService.showInfo( resource.addedEffectivity
            .format( message, selectedObject.props.object_string.dbValues[ 0 ] ) );
    } );
}

let exports;
export default exports = {
    handleRemoveEffectivity,
    createEffectivity
};
