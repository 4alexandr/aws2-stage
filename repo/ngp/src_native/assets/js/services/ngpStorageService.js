// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpStorageConstants from 'js/constants/ngpStorageConstants';
import ngpLoadSvc from 'js/services/ngpLoadService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import dms from 'soa/dataManagementService';

const SPECIAL_SUFFIX = ':/ngp/';

/**
 * The ngp relation service
 *
 * @module js/services/ngpStorageService
 */
'use strict';

/**
 * Clears the storage upon signing out
 */
function clearStorageUponSignOut() {
    const topicsObj = getFromStorage( ngpStorageConstants.STORAGE_TOPICS_LIST, true );
    if( topicsObj && Array.isArray( topicsObj.topics ) ) {
        topicsObj.topics.forEach( ( topicName ) => {
            removeItemFromLocalStorage( topicName );
        } );
    }
    removeItemFromLocalStorage( ngpStorageConstants.STORAGE_TOPICS_LIST );
    removeItemFromLocalStorage( ngpStorageConstants.STORAGE );
}

/**
 *
 * @param {object} deleteEvent - the delete event object
 */
function removeDeletedItemsFromStorage( deleteEvent ) {
    if( deleteEvent && Array.isArray( deleteEvent.deletedObjectUids ) ) {
        const deletedUids = deleteEvent.deletedObjectUids;
        const topicsObj = getFromStorage( ngpStorageConstants.STORAGE_TOPICS_LIST, true );
        if( topicsObj && Array.isArray( topicsObj.topics ) ) {
            topicsObj.topics.forEach( ( topicName ) => {
                const currentValue = getFromStorage( topicName, true );
                const updatedUidsArray = currentValue.uids.filter( ( uid ) => deletedUids.indexOf( uid ) === -1 );
                setItemInLocalStorage( topicName, updatedUidsArray, currentValue.props );
            } );
        }
    }
}

/**
 *
 * @param {string[]} keys - array of local storage keys
 * @return {promise} a promise object
 */
function ensureCachedObjectsAreLoaded( keys ) {
    const promiseArray = [];
    const uidsToLoad = [];
    keys.forEach( ( key ) => {
        const { uids, props } = getFromStorage( key, true );
        if( Array.isArray( props ) && props.length > 0 ) {
            promiseArray.push( dms.getProperties( uids, props ) );
        } else {
            uidsToLoad.push( ...uids );
        }
    } );
    if( uidsToLoad.length > 0 ) {
        promiseArray.push( ngpLoadSvc.ensureObjectsLoaded( uidsToLoad ) );
    }
    return Promise.all( promiseArray );
}

/**
 *
 * @param {object} storageEvent - the storage event object
 */
function onStorageChange( storageEvent ) {
    let topicsObj = getFromStorage( ngpStorageConstants.STORAGE_TOPICS_LIST, true );
    if( topicsObj && topicsObj.topics && topicsObj.topics.length > 0 ) {
        const key = storageEvent.key.replace( SPECIAL_SUFFIX, '' );
        if( topicsObj.topics.indexOf( key ) > -1 ) {
            ensureCachedObjectsAreLoaded( [ key ] ).then(
                () => {
                    eventBus.publish( 'ngp.storageUpdateEvent' );
                }
            );
        }
    }
}

/**
 *
 * @param {string} storageKey - the key to use in the storage
 */
function removeItemFromLocalStorage( storageKey ) {
    localStorage.removeItem( `${storageKey}${SPECIAL_SUFFIX}` );
}

/**
 *
 * @param {string} storageKey - the key to use in the storage
 * @param {string[]} uids - the array of uids to store
 * @param {string[]} props - array of props to be added
 */
function setItemInLocalStorage( storageKey, uids, props ) {
    const newValue = {
        uids,
        props
    };
    localStorage.setItem( `${storageKey}${SPECIAL_SUFFIX}`, JSON.stringify( newValue ) );
}

/**
 *
 * @param {string} storageKey - the key which points to the saved value in the local storage
 * @param {boolean} parsed - true if you want the saved item parsed
 * @return {string} the value stored in the local storage
 *
 * consider to change the method to be "getModelObjects" which returns the modelObjects
 * from the localStorage value. We'll fix in the next cp
 */
export function getFromStorage( storageKey, parsed ) {
    const storageValue = localStorage.getItem( `${storageKey}${SPECIAL_SUFFIX}` );
    return parsed ? JSON.parse( storageValue ) : storageValue;
}

/**
 * Adds the given topic to the saved topic array in the local storage
 * @param {string} potentialNewTopic - potential new topic
 */
function updateTopicsArray( potentialNewTopic ) {
    let topicsObj = getFromStorage( ngpStorageConstants.STORAGE_TOPICS_LIST, true );
    if( !topicsObj || !topicsObj.topics ) {
        topicsObj = {
            topics: [ potentialNewTopic ]
        };
    } else if( topicsObj.topics.indexOf( potentialNewTopic ) === -1 ) {
        topicsObj.topics.push( potentialNewTopic );
    }
    localStorage.setItem( `${ngpStorageConstants.STORAGE_TOPICS_LIST}${SPECIAL_SUFFIX}`, JSON.stringify( topicsObj ) );
}

/**
 * Initialize the storage service
 */
export function init() {
    if( !window.ngpStorageEventSubscriptions ) {
        window.ngpStorageEventSubscriptions = true;
        eventBus.subscribe( 'session.signOut', clearStorageUponSignOut );
        eventBus.subscribe( 'cdm.deleted', removeDeletedItemsFromStorage );
        window.addEventListener( 'storage', onStorageChange );
    }
    const topicsObj = getFromStorage( ngpStorageConstants.STORAGE_TOPICS_LIST, true );
    if( topicsObj && topicsObj.topics && topicsObj.topics.length > 0 ) {
        ensureCachedObjectsAreLoaded( topicsObj.topics );
    }
}

/**
 *
 * @param {string} storageKey - the key to use in the storage
 * @param {string[]} uids - the array of uids to store
 * @param {string[]} props - array of props to be added
 */
export function saveUidsAndPropNamesInStorage( storageKey, uids, props = [] ) {
    setItemInLocalStorage( storageKey, uids, props );
    updateTopicsArray( storageKey );
}

/**
 *
 * @param {string} storageKey - the key to use in the storage
 * @param {modelObject[]} modelObjects - a given array of modelObjects
 * @param {string[]} props - array of props to be added
 */
export function saveModelObjectsAndPropNamesInStorage( storageKey, modelObjects, props = [] ) {
    const uids = modelObjects.map( ( modelObj ) => modelObj.uid ).filter( ( uid ) => Boolean( uid ) );
    saveUidsAndPropNamesInStorage( storageKey, uids, props );
}

/**
 *
 * @param {string} storageKey - the key to use in the storage
 * @return {modelObject[]} the set of modelObjects whos uids are saved in the local storage under the given key
 */
export function getModelObjectsFromStorage( storageKey ) {
    let modelObjects = [];
    const value = getFromStorage( storageKey, true );
    if( value && value.uids ) {
        modelObjects = value.uids.map( ( uid ) => cdm.getObject( uid ) ).filter( ( modelObj ) => Boolean( modelObj ) );
    }
    return modelObjects;
}

export default {
    init,
    saveUidsAndPropNamesInStorage,
    saveModelObjectsAndPropNamesInStorage,
    getFromStorage,
    getModelObjectsFromStorage
};
