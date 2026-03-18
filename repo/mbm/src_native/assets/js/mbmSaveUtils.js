// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmSaveUtils
 */

import app from 'app';
var exports = {};

/**
 * Get entry for add
 * @param {Array} targetObjectIds array of target Object uids
 * @param {Array} sourceObjectsIds array of source Object uids
 * @param {Array} sortPropertyName array sort property names
 * @param {Array} sortOrder array of sort Order
 * @return {Object} entry object
 */
export let getEntryForAdd = function( targetObjectIds, sourceObjectsIds, sortPropertyName, sortOrder, actionType ) {
    return {
        "Object": {
            "nameToValuesMap": {
                "id": targetObjectIds
            }
        },
        "AssignedElements": {
            "nameToValuesMap": {
                [ `${actionType}` ]: sourceObjectsIds,
                "SortPropertyName": sortPropertyName,
                "SortOrder": sortOrder
            }
        }
    };
};

/**
 * Get entry for remove
 * @param {Array} removedElementsIds array of removed Object uids
 * @return {Object} entry object
 */
export let getEntryForRemove = function( removedElementsIds ) {
    return {
        "AssignedElements": {
            "nameToValuesMap": {
                "Remove": removedElementsIds
            }
        }
    };
};

/**
 * Get children uids
 * @param {response} response SOA response
 * @return {Array} children uids
 */
export let getChildren = function( response ) {
    let childOccurrencesUids = [];
    if( response && response.saveEvents )
    {
        response.saveEvents.forEach( event => {
            if( event.eventType === 'addedToRelation' ) {
            childOccurrencesUids = event.eventData;
            }
        } );
    }
    return childOccurrencesUids;
};

/**
 * Get newly created elements uids
 * @param {response} response SOA response
 * @return {Array} new elements uids
 */
export let getNewElements = function( response ) {
    let newElements = [];
   if( response && response.saveEvents )
   {
        response.saveEvents.forEach( event => {
            if( event.eventType === 'create' ) {
                if(event.eventObjectUid !== "" && event.eventObjectUid!== null)
                {
                    newElements.push(event.eventObjectUid);
                }
            }
        } );
    }
    return newElements;
};

/**
 * Get removed elements uids
 * @param {response} response SOA response
 * @return {Array} removed elements uids
 */
export let getRemovedElements = function( response ) {
    let removedElements = [];
    if( response && response.saveEvents )
    {
        response.saveEvents.forEach( event => {
            if( event.eventType === 'delete' ) {
                removedElements.push( event.eventObjectUid );
            }
        } );
    }
    return removedElements;
};

/**
 * Get object for source and target
 * @param {String} id object uids
 * @param {String} status indication status
 * @param {Array} equiLines equivalent lines
 * @return {Object} object
 */
export let getObject = function( id, status, equiLines ) {
    return {
        "id": id,
        "status": parseInt( status ),
        "equiLines": equiLines
    };
};

/**
 * Get equivalent lines uids
 * @param {Array} eventData event data
 * @return {Array} equivalent lines uids
 */
export let getEquivalentLine = function( eventData ) {
    let equiLines = [];
    for( let i = 1; i <= eventData.length - 1; i++ ) {
        equiLines.push( eventData[ i ] );
    }
    return equiLines;
};

/**
 * Get source data
 * @param {response} response SOA response
 * @return {Array} source data
 */
export let getSource = function( response ) {
    return getProcessedDataFor( response, 'sourceAssignmentMismatch' );
};

/**
 * process response and returns processed object 
 * @return {Object} processed object  
 */
let getProcessedDataFor = function( response, eventType ) {
    let processedObject = [];
    if(response && response.saveEvents)
    {
        response.saveEvents.forEach( event => {
            if( event.eventType === eventType ) {
                processedObject.push( getObject( event.eventObjectUid, event.eventData[ 0 ], getEquivalentLine( event.eventData ) ) );
            }
        } );
    }
    return processedObject;
};

/**
 * Get target data
 * @param {response} response SOA response
 * @return {Array} target data
 */
export let getTarget = function( response ) {
    return getProcessedDataFor( response, 'targetAssignmentMismatch' );
};

/**
 * Get entry for Session
 * @param {Array} performCheck array of perform checks
 * @param {Array} sourcePci array of source pci uids
 * @param {Array} targetPci array of target pci uids
 * @param {Array} sourceScope array of source topline uids
 * @param {Array} targetScope array of target topline uids
 * @return {Object} entry object
 */
export let getEntryForSessionSection = function( performCheck, sourcePci, targetPci, sourceScope, targetScope ) {
    return {
        "PerformCheck": {
            "nameToValuesMap": {
                "value": performCheck
            }
        },
        "EBOMPCI": {
            "nameToValuesMap": {
                "uid": sourcePci
            }
        },
        "MBOMPCI": {
            "nameToValuesMap": {
                "uid": targetPci
            }
        },
        "EBOMScope": {
            "nameToValuesMap": {
                "uid": sourceScope
            }
        },
        "MBOMScope": {
            "nameToValuesMap": {
                "uid": targetScope
            }
        }
    };
};

export default exports = {
    getEntryForAdd,
    getEntryForRemove,
    getRemovedElements,
    getEntryForSessionSection,
    getNewElements,
    getObject,
    getEquivalentLine,
    getChildren,
    getSource,
    getTarget
};
