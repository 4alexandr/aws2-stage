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
 * @module js/wiSetEffectivityService
 */

import _ from 'lodash';
import app from 'app';
import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import { constants as epLoadConstants } from 'js/epLoadConstants';
import popupService from 'js/popupService';
import localeSvc from 'js/localeService';

'use strict';

const instrMessagePath = '/i18n/InstructionsEffectivityMessages';

/**
 * loads all unit effectivities of selected operation/process
 * @param {Object} selectedObject - selected object in wi editor 
 */
export function loadEffectivities( selectedObject ) {
    let effectivityObjs = [];
    const effectivityInfoloadInputs = epLoadInputHelper.getLoadTypeInputs(epLoadConstants.EFFECTIVITY_INFO,
        selectedObject.uid);
    return epLoadService.loadObject(effectivityInfoloadInputs, false).then(function (output) {
        if (output.relatedObjectsMap && output.relatedObjectsMap[selectedObject.uid]) {
            effectivityObjs = output.relatedObjectsMap[selectedObject.uid].additionalPropertiesMap2.Effectivity.map( (effectivityObjUid) => {
                return output.ServiceData.modelObjects[effectivityObjUid];
            });
        }
        return {
            effectivityObjs : effectivityObjs,
            selectedObject : selectedObject
        };
    });
}

/**
 * updates the dataProvider with updated effectivity list
 * @param {Array} effectivityObjs : effectivity objects list
 * @param {Array} removedEffectivityObjs - effectivity objects 
 * @param {Object} dataProvider dataProvider
 */
export function updateEffectivityList(effectivityObjs, removedEffectivityObjs, dataProvider){
    const index = effectivityObjs.findIndex( effObj =>  effObj.uid === removedEffectivityObjs[0].uid );
    if (index >= 0) {
        effectivityObjs.splice(index, 1);
        dataProvider.update(effectivityObjs, effectivityObjs.length);
    }
}

/**
 * function to open popup for adding or editing effectivity
 * @param {Object} selectedObject : selected object in wi-editor
 * @param {Array} effectivityObjs : effectivity objects list
 * @param {Object} effectivityVmo : when we are editing the effectivity
 */
export function addOrEditEffectivity(selectedObject, effectivityObjs, effectivityVmo){
    const effectivityObj = effectivityVmo ? effectivityObjs.find( element => element.uid === effectivityVmo.uid) : null;
    showCreateEffectivityPopup(selectedObject, effectivityObj);
}

/**
 * function to open popup for adding or editing effectivity
 * @param {Object} selectedObject : selected object in wi-editor
 * @param {Object} effectivityObj : when we are editing the effectivity
 */
function showCreateEffectivityPopup(selectedObject, effectivityObj){
    const resource = localeSvc.getLoadedText( app.getBaseUrlPath() + instrMessagePath );
    const popupParams = {
        "declView": "wiCreateEffectivity",
        "locals": {
            "anchor": "closePopupAnchor",
            "caption": resource.occurrenceEffectivityTitle
        },
        "options": {
            "height": "auto",
            "width": 450,
            "clickOutsideToClose": false,
            "draggable": false
        },
        "subPanelContext": {
            selectedObject: selectedObject,
            effectivityObj: effectivityObj
        }
    };
    popupService.show( popupParams );
}

let exports;
export default exports = {
    loadEffectivities,
    updateEffectivityList,
    addOrEditEffectivity
};
