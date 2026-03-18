//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/* global */

/**
 * @module js/mfeContentPanelUtil
 */

'use strict';

/**
 * Set the tab data to be available in the command context
 *
 * Please use following object names in the commandContext for consistency:
 * inputObject - the object whose data is displayed in the tab
 * selection - the selected objects in the tab
 * name - the tab display name
 * contentCount - the number of objects displayed in the tab content
 * namePrefix - the tab display name prefix when displaying its content quantity as part of the tab display name
 * propertiesToLoad - the inputObject property which contains the objects to be displayed in the tab content
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
export function initMfeContentPanel( tabs, data ) {
    if( tabs.length === 1 ) {
        // set the selected tab because the tabs set will not be there and won't set it
        data.selectedTab = tabs[ 0 ];
    }
    data.tabs = tabs;
}

const exports = {
    setCommandContext,
    initMfeContentPanel
};

export default exports;
