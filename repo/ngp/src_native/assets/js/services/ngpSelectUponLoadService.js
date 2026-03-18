// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * NGP Select Upon Load service
 *
 * @module js/services/ngpSelectUponLoadService
 */
'use strict';

/** session storage constant key */
const UIDS_TO_SELECT_UPON_LOAD_STORAGE_KEY = 'elementsToHighlightUponLoad';

/** separator constant */
const SEPARATOR = '&_SEPERATOR_&';

/**
 * Saves to the session storage the
 * @param {string[]} uids - an array of uids
 */
export function setUidsToSelectUponLoad( uids ) {
    if( Array.isArray( uids ) && uids.length > 0 ) {
        let value = '';
        uids.forEach( ( uid ) => {
            value = value.concat( uid ).concat( SEPARATOR );
        } );
        sessionStorage.setItem( UIDS_TO_SELECT_UPON_LOAD_STORAGE_KEY, value );
    }
}

/**
 * @return {string[]} the uids to select upon load
 */
export function getUidsToSelectUponLoad() {
    let uids = [];
    const value = sessionStorage.getItem( UIDS_TO_SELECT_UPON_LOAD_STORAGE_KEY );
    if( value ) {
        uids = value.split( SEPARATOR );
        uids.pop();
    }
    sessionStorage.removeItem( UIDS_TO_SELECT_UPON_LOAD_STORAGE_KEY );
    return uids;
}

let exports = {};
export default exports = {
    setUidsToSelectUponLoad,
    getUidsToSelectUponLoad
};
