// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/wiDragAndDropService
 */

import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import epSaveService from 'js/epSaveService';
import { constants as _epBvrConstants } from 'js/epBvrConstants';
import awDragAndDropUtils from 'js/awDragAndDropUtils';
import saveInputWriterService from 'js/saveInputWriterService';

/**
 * @param {Object} dropData objects
 * @returns {Object} config for preventing default action
 */
function dragOver( dropData ) {
    if( !dropData.declViewModel.inputObject || !dropData.declViewModel.inputObject.uid ) {
        return {
            dropEffect: 'none',
            stopPropagation: true
        };
    }
    return {
        preventDefault: true,
        stopPropagation: true,
        dropEffect: 'copy'
    };
}
/**
 *
 * @param {Object} dropData objects
 */
function drop( dropData ) {
    const sourceUids = awDragAndDropUtils.getCachedSourceUids();
    const saveInputWriter = saveInputWriterService.get();
    let relatedObject = [];
    _.forEach( sourceUids, function( sourceUid ) {
        const sourceObj = cdm.getObject( sourceUid );
        relatedObject.push( sourceObj );
    } );
    const targetObjectInput = {
            id: dropData.declViewModel.inputObject.uid
    };
    const partsAddObject = createAssignmentObject( _epBvrConstants.ME_CONSUMED, sourceUids );
        relatedObject.push( cdm.getObject( dropData.declViewModel.inputObject.uid ) );
    saveInputWriter.addRelatedObjects( relatedObject );
    saveInputWriter.addAssignedParts( targetObjectInput, partsAddObject );
    //Tree handles adding of new obj
    epSaveService.saveChanges( saveInputWriter, true, relatedObject );
}

/**
 * @param {String} relationType relation Type
 * @param {String} assignedObjIds assigned Obj Ids
 * @return {Object} assignment jsn object
 */
let createAssignmentObject = function( relationType, assignedObjIds ) {
    return {
        relationType: relationType,
        Add: assignedObjIds
    };
};

let exports;
export default exports = {
    dragOver,
    drop
};
