//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/* global */

/**
 * @module js/epValidationUtil
 */

'use strict';

/**
 *
 * @param {object} tabModel - the object where the current command context is saved
 * @param {object} commandContext - anything you want to be set as the command context
 */
export function setCommandContext( tabModel, commandContext ) {
    if( tabModel && commandContext && typeof commandContext === 'object' ) {
        Object.assign( tabModel, commandContext );
    }
}

/**
 * Will inititialize the selected tab in data and copy the tabs to the data
 * @param {Array} tabs the tabs passed from sub panel context
 * @param {Object} data the data
 */
export function initEpValidationContentPanel( tabs, data ) {
    if( tabs.length === 1 ) {
        // set the selected tab because the tabs set will not be there and won't set it
        data.selectedTab = tabs[ 0 ];
    }
    data.tabs = tabs;
}

const exports = {
    setCommandContext,
    initEpValidationContentPanel
};

export default exports;
