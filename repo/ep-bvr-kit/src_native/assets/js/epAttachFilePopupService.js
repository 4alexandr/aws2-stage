// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for attaching files to an object.
 *
 * @module js/epAttachFilePopupService
 */
import _ from 'lodash';
import soaSvc from 'soa/kernel/soaService';
import listBoxSvc from 'js/listBoxService';
import addObjectUtils from 'js/addObjectUtils';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';

'use strict';

export function initiateDatasetCreation(data, scopeObject) {
    if (data.fileName !== '' && data.fileExt !== '') {
        let datsetObjectTypePolicy = propertyPolicySvc.register({
            types: [{
                name: 'DatasetType',
                properties: [{
                    name: 'datasettype_name'
                }]
            }]
        });
        if (data.validFile === false) {
            resetInputs(data);
            return;
        }
        addObjectUtils.initDSCreateParams(data);
        getDatasetTypes(scopeObject, data.fileExt).then( (getDatasetTypesResponse) => {
            if (getDatasetTypesResponse) {
                let output = getDatasetTypesResponse.output[0];
                data.datasetTypesWithDefaultRelInfo = output.datasetTypesWithDefaultRelInfo;
                data.fileExtension = output.fileExtension;
                data.datasetTypeList = addObjectUtils.getDatasetTypesFromTypesWithRelInfo(getDatasetTypesResponse);
                getFileType(data);
                updateDatasetTypesWithRelation(data);
                propertyPolicySvc.unregister(datsetObjectTypePolicy);
            }
        });
    }
    else {
        resetInputs(data);
    }
}

/**
 * Reset the input UI component values
 * @param {*} data - data
 */
function resetInputs(data) {
     const vmoProps = Object.values(data).filter(val => val.constructor && val.constructor.name === 'ViewModelProperty');
     vmoProps.forEach( vmoProp => {
         vmoProp.dbValue = null;
         vmoProp.uiValue = '';
     } );
    data.listOfDatasetTypes = [];
    data.relationList = [];
}

/**
 * Get dataset types supported for the file
 * @param {*} scopeObject 
 * @param {*} fileExt 
 */
function getDatasetTypes(scopeObject, fileExt) {
    let request = {
        fileExtensions: [fileExt],
        parent: {
            type: scopeObject.type,
            uid: scopeObject.uid
        }
    };
    return soaSvc.post('Internal-AWS2-2015-10-DataManagement', 'getDatasetTypesWithDefaultRelation', request);
}

/**
* Get the proper type of file
* @param {*} typesList - list of types
* @param {*} fileExtension - file extension
*/
function getFileType(data) {
    let typesList = data.preferences.DRAG_AND_DROP_default_dataset_type;
    if (typesList && typesList.length > 0 && typesList[0] !== null) {
        let regex = new RegExp(`${data.fileExt.toLowerCase()}:(.*)`);
        let fileTypes = [];
        fileTypes = getFilterStrings(regex, typesList);
        let fileType = null;
        let isText = false;
        if (fileTypes.length > 0) {
            fileType = fileTypes[0];
            isText = fileType && fileType.toLowerCase() === 'text' ? true : false;
        }
        data.fileType = fileType;
        data.isText = isText;
    }
}

/**
 * Get the filtered list of strings.
 * @param {*} patteren  pattern
 * @param {*} listExtensions extensions
 */
function getFilterStrings(patteren, listExtensions) {
    let inclusiveKits = [];
    _.forEach(listExtensions, page => {
        let t = patteren.exec(page);
        if (t !== null && t[1]) {
            inclusiveKits.push(t[1]);
        }
    });
    return inclusiveKits;
}

/**
 * Get the allowed file types.
 * @param {*} fileExtnsWithDatasetTypes - mapping of file extensions and dataset types
 */
export function getAllowedFileTypes(fileExtnsWithDatasetTypes) {
    let allowedTypes = '';
    if (fileExtnsWithDatasetTypes) {
        const regex = new RegExp('(.*):');
        _.forEach(fileExtnsWithDatasetTypes, page => {
            let t = regex.exec(page);
            if (t !== null && t[1]) {
                allowedTypes = allowedTypes + ', .' + t[1];
            }
        });
    }
    return {
        allowedTypes
    };
}

/**
 * Update the dataset types and the relations.
 * @param {*} data - data
 */
function updateDatasetTypesWithRelation(data) {
    let regex;
    regex = new RegExp(`${data.fileExtension.toLowerCase()}:(.*)`);
    let listOfDatasetTypes = [];
    listOfDatasetTypes = getFilterStrings(regex, data.preferences.DRAG_AND_DROP_default_dataset_type);
    const result = data.datasetTypeList.filter(dataType => dataType.propInternalValue.props.object_string.dbValues[0].toUpperCase() === listOfDatasetTypes[0].toUpperCase());
    data.listOfDatasetTypes = result;

    regex = new RegExp(`(.*).${data.fileType}`);
    let listOfRelations = [];
    listOfRelations = getFilterStrings(regex, data.preferences.MBC_AllowedDatasetTypes);
    if (listOfRelations === undefined || listOfRelations.length === 0) {
        listOfRelations.push(epBvrConstants.IMAN_SPECIFICATION);
    }
    
    soaSvc.ensureModelTypesLoaded(listOfRelations).then(() => {
        let relationList = listBoxSvc.createListModelObjectsFromStrings(listOfRelations);
        data.relationList = relationList;
    });
}

/**
 * Get the saved dataset object.
 * @param {*} saveResults - saveResults array
 * @param {*} fileType - type of file
 */
export function getSavedDatasetObject(saveResults, fileType) {
    let datasetUid = null;
    let namedReference = '';

    const datasetResultObjects = saveResults.filter(saveResult => saveResult.saveResultObject.type === fileType);
    if (datasetResultObjects !== undefined && datasetResultObjects.length === 1) {
        let datasetObject = datasetResultObjects[0].saveResultObject;
        datasetUid = datasetObject.uid;
        namedReference = datasetObject.modelType.references[0].name;
    }
    return {
        datasetUid,
        namedReference
    };
}

let exports;
export default exports = {
    getAllowedFileTypes,
    getSavedDatasetObject,
    initiateDatasetCreation
};