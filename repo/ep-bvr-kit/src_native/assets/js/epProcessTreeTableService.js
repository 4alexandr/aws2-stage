// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for ep table custom table column cell
 *
 * @module js/epProcessTreeTableService
 */

import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import epTableService from 'js/epTableService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import epBvrObjectService from 'js/epBvrObjectService';
import mfeTableService from 'js/mfeTableService';


'use strict';

const CREATE_EVENT_TYPE = 'create';
const DELETE_EVENT_TYPE = 'delete';
const MODIFY_RELATIONS_EVENT_TYPE = 'modifyRelations';
const RESEQUENCE_EVENT_TYPE = 'resequence';
const REMOVED_FROM_RELATION_EVENT = 'removedFromRelation';
const ADDED_TO_RELATION_EVENT = 'addedToRelation';
const MODIFY_PRIMITIVE_PROPERTIES_EVENT = 'modifyPrimitiveProperties';
const AWB0_BOMLINE_REV_ID = 'awb0BomLineRevId';

/**
 * Handle the events which were returned from the save soa server call for add operation and remove operation
 *
 * @param {Object} eventData - the save events as json object
 * @param {Object} dataProvider - the table data provider
 * @param {Object} viewModelData - the viewModel data
 */
export function handleSaveEvents( eventData, dataProvider, viewModelData ) {
    //For updating the objects props in tree
    const resequenceEvent = getEventData( eventData, RESEQUENCE_EVENT_TYPE );
    const modifyPropsEvent = getEventData( eventData, MODIFY_PRIMITIVE_PROPERTIES_EVENT );
    modifyPropsEvent && modifyPropsEvent.length > 0 && resequenceEvent.length === 0 && handleModifyProperties( eventData, modifyPropsEvent, dataProvider, viewModelData );

    //For Remove Operation
    const deleteEvent = getEventData( eventData, DELETE_EVENT_TYPE );
    deleteEvent.push( ...getEventData( eventData, REMOVED_FROM_RELATION_EVENT ) );
    deleteEvent && deleteEvent.length > 0 && handleRemoveOperation( eventData, deleteEvent, dataProvider );

    //For Create Operation
    const createEvent = getEventData( eventData, CREATE_EVENT_TYPE );
    createEvent.push( ...getEventData( eventData, ADDED_TO_RELATION_EVENT ) );
    createEvent && createEvent.length > 0 && handleAddOperation( eventData, createEvent, dataProvider, viewModelData );
}

/**
 * Handle save events for add operation
 *
 * @param {Object} eventData - the save events as json object
 * @param {Object} createEvents - the save events as json object
 * @param {Object} dataProvider - the table data provider
 * @param {Object} viewModelData - the viewModel data
 */
function handleAddOperation ( eventData, createEvents, dataProvider, viewModelData ) {

let createdOperations = [];
    createEvents.forEach(createEvent =>{
        const createdOperationUid = createEvent.eventObjectUid;
        const createdOperation = cdm.getObject(createdOperationUid);
        createdOperationUid && createdOperation.type === epBvrConstants.MFG_BVR_OPERATION && createdOperations.push( createdOperation);
    });

    if( createdOperations.length > 0 ) {
        const parentObjectUid = epBvrObjectService.getParent(createdOperations[0]).uid;
        const objToAddAfter = getObjectToAddAfter(eventData, createEvents[0]);
        parentObjectUid && epTableService.addChildNodes( dataProvider, cdm.getObject( parentObjectUid ), createdOperations, epBvrConstants.MBC_HAS_SUB_ELEMENTS, viewModelData, objToAddAfter );
    }
}

/**
 * Find the op
 *
 * @param {Object} deleteEvent - the save events as json object
 * @param {Object} dataProvider - the table data provider
 */
function getObjectToAddAfter( eventData, createEvent ) {
    const createdOperationUid = createEvent.eventObjectUid;
    const createdObj = eventData.ServiceData.modelObjects[ createdOperationUid ];
    const children = epBvrObjectService.getSequencedChildren( epBvrObjectService.getParent(createdObj), epBvrConstants.MFG_SUB_ELEMENTS );
    const seqNoOfNewlyCreatedObj =  createdObj.props.bl_sequence_no && createdObj.props.bl_sequence_no.dbValues[0];

    return children.find(obj => (obj.props.bl_sequence_no && obj.props.bl_sequence_no.dbValues[0] &&
        obj.props.bl_sequence_no.dbValues[0] === `${seqNoOfNewlyCreatedObj - 10}`));

}
/**
 * Handle save events for add operation
 *
 * @param {Object} deleteEvent - the save events as json object
 * @param {Object} dataProvider - the table data provider
 */
function handleRemoveOperation ( eventData, removeEvents, dataProvider ) {
    let removedOperations = [];
    removeEvents.forEach( removeEvent => {
        const removedOperationUid = removeEvent.eventObjectUid;
        const removedOperation = cdm.getObject( removedOperationUid );
        removedOperationUid && removedOperation.type === epBvrConstants.MFG_BVR_OPERATION && removedOperations.push( removedOperation );
    });

    if( removedOperations.length > 0 ) {
        const parentObjectUid = epBvrObjectService.getParent( removedOperations[0] ).uid;
        if( parentObjectUid ){
            epTableService.removeChildNodes( dataProvider, cdm.getObject( parentObjectUid ), removedOperations );
        }
    }
}

/**
 * Handle save events for modify props of object in focus
 *
 * @param {Object} eventData - the save events as json object
 * @param {Object} modifyPropsEvent - the modufy props events as json object
 * @param {Object} dataProvider - the table data 
 * @param {Object} viewModelData - the viewModel data
 */
function handleModifyProperties( eventData, modifyPropsEvent, dataProvider, viewModelData ){
    const event = modifyPropsEvent.find( event => event.eventData[0] === AWB0_BOMLINE_REV_ID);
    if(event){
        const updatedObject = eventData.ServiceData.modelObjects[event.eventObjectUid];
        const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
        const vmoToUpdate = loadedObjects.find( loadedObj => loadedObj.uid === updatedObject.uid );
        if( vmoToUpdate.isExpanded ){
            mfeTableService.collapseTreeNode( dataProvider, vmoToUpdate, viewModelData ).then(
                () => {
                    mfeTableService.expandTreeNode( dataProvider, vmoToUpdate, viewModelData ).then(
                        () => {
                            vmoToUpdate.displayName = updatedObject.props.object_string.dbValues[0];
                        }
                    );
                }
            );
        }else{
            vmoToUpdate.displayName = updatedObject.props.object_string.dbValues[0];
        }
    }
}

/**
 * filter event data by type
 *
 * @param {Object} eventData - the save events as json object
 * @param {String} eventType - event Type
 */
function getEventData( eventData, eventType ) {
    return _.filter( eventData.saveEvents, event => event.eventType === eventType );
}

let exports;
export default exports = {
    handleSaveEvents
};
