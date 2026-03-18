// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import app from 'app';
import ngpSoaSvc from 'js/services/ngpSoaService';
import ngpPropConstants from 'js/constants/ngpPropertyConstants';
import ngpCloneStatusCache from 'js/services/ngpCloneStatusCache';
import ngpModelUtils from 'js/utils/ngpModelUtils';
import ngpLoadService from 'js/services/ngpLoadService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import localeService from 'js/localeService';

import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

/**
 * The ngp relation service
 *
 * @module js/services/ngpRelationService
 */
'use strict';
let errorMsgKey = null;
/**
 *
 * @param {modelObject} modelObj - a given modelObject
 * @param {string[]} relationTypeNames - the relation type names
 * @return {promise} a promise object
 */
export function getSecondaryRelation(modelObj, relationTypeNames) {
    const info = relationTypeNames.map((relationTypeName) => ({
        relationTypeName,
        otherSideObjectTypes: null
    }));
    const soaInput = {
        primaryObjects: [modelObj],
        pref: {
            expItemRev: false,
            returnRelations: true,
            info
        }
    };
    return ngpSoaSvc.executeSoa('Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', soaInput).then(
        (response) => {
            if (response) {
                return response.output[0].relationshipData;
            }
        }
    );
}

/**
 *
 * @param {modelObject} manufacturingModelObj - the given manufacturing model object
 * @return {promise} a promise object
 */
export function getProductEffectivityValue(manufacturingModelObj) {
    return getSecondaryRelation(manufacturingModelObj, [ngpPropConstants.PRODUCT_MODEL]).then(
        (relationshipData) => {
            let productEffectivity = '';
            if (relationshipData) {
                relationshipData.every((data) => {
                    if (data.relationName === ngpPropConstants.PRODUCT_MODEL) {
                        if (Array.isArray(data.relationshipObjects) && data.relationshipObjects.length > 0) {
                            const relation = data.relationshipObjects[0].relation;
                            if (relation) {
                                const productEffectivityValue = relation.props[ngpPropConstants.PRODUCT_EFFECTIVITY_FORMULA].uiValues[0];
                                const value = productEffectivityValue.split('=').pop();
                                if (value) {
                                    productEffectivity = value;
                                }
                            }
                        }
                        return false;
                    }
                    return true;
                });
            }
            return productEffectivity;
        }
    );
}

/**
 * @param {modelObject} modelObject - a given modelObject
 * @return {Promise} a promise object
 */
export function getBreadcrumbs(modelObject) {
    if (modelObject) {
        const soaInput = {
            objects: [{
                clientID: 'tc-mfg-web',
                object: modelObject
            }]
        };
        return ngpSoaSvc.executeSoa('Internal-ManufacturingCore-2017-05-RelationManagement', 'getBreadcrumbs', soaInput).then(
            (response) => {
                if (response && response.objectBreadcrumbs) {
                    return response.objectBreadcrumbs[0].breadcrumbs || [];
                }
                return [];
            }
        );
    }

    console.warn('Tried to get breadcrumbs with null modelObject');
    return new Promise((resolve) => {
        resolve([]);
    });
}

/**
 *
 * @param {Object} soaInput - an input object
 * @return {promise} a promise object
 */
export function createRelateAndSubmitObjects(soaInput) {
    return ngpSoaSvc.executeSoa('Internal-Core-2012-10-DataManagement', 'createRelateAndSubmitObjects', { inputs: soaInput });
}

/**
 *
 * @param {modelObject[]} modelObjects - an array of modelObject that we need a status on
 * @param {string} option - option to provide which status you want on the object. Can be ['All', 'AssignmnetStatus', 'CloneStatus']
 * @return {promise} a promise object
 */
export function getStatusInformation(modelObjects = [], option = 'All') {
    if (Array.isArray(modelObjects) && modelObjects.length > 0) {
        const soaInput = {
            input: modelObjects,
            option
        };
        return ngpSoaSvc.executeSoa('Internal-Process-2017-05-Compare', 'getStatusInformation', soaInput).then(
            (response) => {
                const cloneStatuses = {};
                const assignmentStatuses = {};

                response.objectsStatusData.forEach((statusData) => {
                    const context = statusData.assignedToObjects[0];
                    assignmentStatuses[context.uid] = statusData.assignmentStatuses || [];
                    cloneStatuses[context.uid] = statusData.cloneStatus || [];
                });

                Object.keys(cloneStatuses).forEach((key) => {
                    const cloneObj = cloneStatuses[key];

                    if (cloneObj.status === ngpCloneStatusCache.cloneStatusConstants.NO_STATUS) {
                        cloneObj.masterInfo = null;
                        cloneObj.clonesInfo = [];
                    }
                    if (cloneObj.masterInfo && cloneObj.masterInfo.originalMaster.objectID === '') {
                        cloneObj.masterInfo.originalMaster = null;
                    }
                    if (cloneObj.masterInfo && cloneObj.masterInfo.configuredMaster.objectID === '') {
                        cloneObj.masterInfo.configuredMaster = null;
                    }

                    if (cloneObj.status === ngpCloneStatusCache.cloneStatusConstants.CLONE || cloneObj.status === ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE) {
                        if (cloneObj.masterInfo.hasMasterProgressed) {
                            cloneObj.status = cloneObj.status.concat('_OUT_OF_DATE');
                        }
                    }
                });

                ngpCloneStatusCache.updateCache(cloneStatuses);
                return {
                    cloneStatuses,
                    assignmentStatuses
                };
            }
        );
    }
    console.warn('Tried to call getStatusInformation with null object or empty array');
    return new Promise((resolve, reject) => {
        resolve(null);
    });
}

/**
 *
 * @param {String} uid - a given modelObject
 * @param {boolean} returnAsVMOs - true if you want the returned array as viewModelObjects
 * @return {Promise} a promise object
 */
export function getContentElements(uid, returnAsVMOs) {
    if (uid) {
        const modelObject = cdm.getObject(uid);
        if (modelObject) {
            let childrenPropArray = ngpModelUtils.getChildrenProperties(modelObject);
            if (childrenPropArray) {
                return ngpLoadService.getPropertiesAndLoad([modelObject.uid], childrenPropArray).then(
                    () => {
                        let children = [];
                        childrenPropArray.forEach((childProp) => {
                            const childObjects = modelObject.props[childProp].dbValues.map((uid) => {
                                const modelObj = cdm.getObject(uid);
                                if (returnAsVMOs) {
                                    return viewModelObjectSvc.createViewModelObject(modelObj);
                                }
                                return cdm.getObject(uid);
                            });
                            children = children.concat(childObjects);
                        });
                        return children;
                    }
                );
            }
        }
    }

    console.warn('Tried to load children with null modelObject or get children of childless object');
    return new Promise((resolve) => {
        resolve([]);
    });
}

/**
 * This method deletes the selected objects
 *
 * @param {modelObject[]} selectedObjects - a given array of modelObjects
 * @return {promise} the soa promise
 */
function performDelete(selectedObjects) {
    return ngpSoaSvc.executeSoa('Internal-ManufacturingCore-2018-06-DataManagement', 'removeObjects', { objects: selectedObjects }).then(
        (response) => {
            if (Array.isArray(response.deleted) && response.deleted.length > 0) {
                eventBus.publish('ngp.deleteObjects', {
                    deletedUids: response.deleted
                });
            }
        }
    );
}

/**
 * This method deletes the selected objects
 *
 * @param {modelObject[]} objectsToDelete - The objects to delete
 */
export function deleteObjects(objectsToDelete) {
    // show the confirmation message
    let resource = localeService.getLoadedText(app.getBaseUrlPath() + '/i18n/NgpDataMgmtMessages.json');
    let deleteConfirmationMessage = null;
    if (objectsToDelete && objectsToDelete.length === 1) {
        const objectToDeleteDisplayName = Array.isArray(objectsToDelete[0].props[ngpPropConstants.OBJECT_STRING].uiValues) ?
            objectsToDelete[0].props[ngpPropConstants.OBJECT_STRING].uiValues[0] : objectsToDelete[0].props.object_string.uiValue;
        deleteConfirmationMessage = resource.singleDeleteMessage.format(objectToDeleteDisplayName);
    } else {
        deleteConfirmationMessage = resource.multipleDeleteMessage.format(objectsToDelete.length);
    }
    mfgNotificationUtils.displayConfirmationMessage(deleteConfirmationMessage, resource.deleteTooltipMsg, resource.cancel).then(
        () => {
            performDelete(objectsToDelete);
        }
    );
}


/**
 * Remove selected study from selected collaboration context (CC)
 *
 * @param {modelObject} secondaryObject - a given modelObject  (secondary object)
 * @param {modelObject} primaryObject - a given modelObject (primary object)
 * @param {String} relation - relation
 */
export function removeRelation(secondaryObject, primaryObject, relation) {
    let inputData = {
        input: [{
            primaryObject,
            secondaryObject,
            relationType: relation,
            clientId: 'tc-mfg-web'
        }]
    };

    return ngpSoaSvc.executeSoa('Core-2006-03-DataManagement', 'deleteRelations', inputData).then((result) => {
        if (Array.isArray(result.deleted) && result.deleted.length > 0) {
            eventBus.publish('ngp.deleteRelation', {
                deletedUids: secondaryObject.uid
            });
        }
    });
}

let exports;
export default exports = {
    createRelateAndSubmitObjects,
    getProductEffectivityValue,
    getSecondaryRelation,
    getBreadcrumbs,
    getStatusInformation,
    getContentElements,
    deleteObjects,
    removeRelation
};