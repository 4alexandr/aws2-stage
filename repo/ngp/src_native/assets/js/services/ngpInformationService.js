// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import _ from 'lodash';
import app from 'app';
import ngpSoaSvc from 'js/services/ngpSoaService';
import vmoSvc from 'js/viewModelObjectService';
import ngpVMOPropSvc from 'js/services/ngpViewModelPropertyService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import localeService from 'js/localeService';
import ngpPropConstants from 'js/constants/ngpPropertyConstants';
import ngpConstants from 'js/constants/ngpModelConstants';
import ngpRelationService from 'js/services/ngpRelationService';

/**
 * NGP Model Views Service
 *
 * @module js/services/ngpInformationService
 */
'use strict';
let agUidToRel = {};
/**
 *
 * @param {modelObject} context - the context modelObject
 * @return {promise} a promise object
 */
export function getAttachmentsAgsAndForms(context) {
    const soaInput = {
        input: [context]
    };
    return ngpSoaSvc.executeSoa('Internal-ManufacturingCore-2017-05-DataManagement', 'getAttachments', soaInput).then(
        (response) => {
            const attachments = [];
            const attributeGroups = [];
            const forms = [];
            agUidToRel = {};
            if (response && response.responseData && response.responseData[0]) {
                const { attachmentDatasetInfo, attributeGroupRelationInfo, sourceObjectForms } = response.responseData[0];
                if (attachmentDatasetInfo && attachmentDatasetInfo[0]) {
                    attachmentDatasetInfo[0].forEach((dataset) => {
                        const vmo = vmoSvc.constructViewModelObject(dataset);
                        ngpVMOPropSvc.setIconURL(vmo);
                        attachments.push(vmo);
                    });
                }

                if (attributeGroupRelationInfo && attributeGroupRelationInfo[0]) {
                    attributeGroupRelationInfo[0].forEach((ag, index) => {
                        const vmo = vmoSvc.constructViewModelObject(ag);
                        ngpVMOPropSvc.setIconURL(vmo);
                        attributeGroups.push(vmo);
                        agUidToRel[ag.uid] = attributeGroupRelationInfo[1][index].type;
                    });
                }

                if (sourceObjectForms) {
                    sourceObjectForms.forEach((form) => {
                        const vmo = vmoSvc.constructViewModelObject(form);
                        ngpVMOPropSvc.setIconURL(vmo);
                        forms.push(vmo);
                    });
                }
            }
            return {
                attachments,
                attributeGroups,
                forms
            };
        },
        () => {
            return {
                attachments: [],
                attributeGroups: [],
                forms: []
            };
        }
    );
}
/**
 *
 * Removes previously selected object in all dataProviders but the one with the current selection
 * @param {dataProvider[]} dataProviders array of the data provider objects
 * @param {ViewModelObject[]} selectedObjects an array of selected object 
 */
export function keepSelectionInOneDataProvider(dataProviders, selectedObjects) {
    dataProviders.forEach((dp) => {
        const foundSelectedVmo = Array.isArray(selectedObjects) ?
            _.find(dp.getViewModelCollection().getLoadedViewModelObjects(), (loadedVmo) => loadedVmo.uid === selectedObjects[0].uid) : false;
        if (!foundSelectedVmo) {
            dp.selectNone();
        }
    });
}

/**
 * This method checks if we can delete object or only remove relation and then delegates the call to the corresponding function
 *
 * @param {modelObject[]} objectsToDelete - The objects to delete (AG or Attachment)
 * @param {modelObject} contextObj - The context object of Information page
 */
export function deleteAttachmentsAgs(objectsToDelete, contextObj) {
    //check if we are dealing with the AG that doesnt' have Delete right.
    if (objectsToDelete[0].modelType.typeHierarchyArray.indexOf(ngpConstants.AG_TYPE) > -1) {
        let splittedString = objectsToDelete[0].props.protection.dbValues[0].split('-')[0];
        const isAGCantBeDeleted = splittedString.toLowerCase().indexOf('d') === -1;
        if (isAGCantBeDeleted) {
            let resource = localeService.getLoadedText(app.getBaseUrlPath() + '/i18n/ngpInformationMessages.json');
            const objectToDeleteDisplayName = objectsToDelete[0].props[ngpPropConstants.OBJECT_STRING].uiValue ||
                objectsToDelete[0].props[ngpPropConstants.OBJECT_STRING].uiValues && objectsToDelete[0].props[ngpPropConstants.OBJECT_STRING].uiValues[0];
            let deleteConfirmationMessage = resource.cannotDeleteAGMessage.format(objectToDeleteDisplayName);
            mfgNotificationUtils.displayConfirmationMessage(deleteConfirmationMessage, resource.remove, resource.cancel).then(
                () => {
                    const relation = agUidToRel[objectsToDelete[0].uid];
                    return ngpRelationService.removeRelation(objectsToDelete[0], contextObj, relation).then(
                        () => {
                            delete agUidToRel[objectsToDelete[0].uid];
                        }
                    );
                }
            );
            return;
        }
    }
    //perform delete
    ngpRelationService.deleteObjects(objectsToDelete);
}

/**
 * Removes entry from agUidToRel map with given uid
 * @param {String[]] uids to remove from the agUidToRel map
 */
export function deleteFromUidToRelMap(uids) {
    uids.forEach((uid) => {
        delete agUidToRel[uid];
    });
}

/**
 * this method downloads given attachment file
 * @param {Object} files files
 */
export function downloadAttachment(files) {
    return files;
}

let exports = {};
export default exports = {
    getAttachmentsAgsAndForms,
    keepSelectionInOneDataProvider,
    deleteAttachmentsAgs,
    deleteFromUidToRelMap,
    downloadAttachment
};