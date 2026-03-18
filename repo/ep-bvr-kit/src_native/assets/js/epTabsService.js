// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import { constants as epLoadConstants } from 'js/epLoadConstants';
import cdm from 'soa/kernel/clientDataModel';
import epObjectPropertyCacheService from 'js/epObjectPropertyCacheService';

/**
 * Tabs Service for EasyPlan.
 *
 * @module js/epTabsService
 */

/**
 * Set the tab display name with its contentCount (number of object displayed in the tab content) in parenthesis
 *
 * @param {Object} tabsData - the tabs data as json object
 */
export function setTabDisplayNameWithQuantity( tabData ) {
    if( tabData ) {
        tabData.namePrefix = !tabData.namePrefix ? tabData.name : tabData.namePrefix;
        tabData.name = !tabData.contentCount || tabData.contentCount === 0 ? tabData.namePrefix : `${tabData.namePrefix} (${tabData.contentCount})`;
    }
}

/**
 * Get list of tabs that should display their contentCount (number of object displayed in the tab content)
 * in parenthesis next to their display name
 *
 * @param {Object} contentPanelData - the content panel ( having the tabs ) data as json object
 */
export function getListOfTabsToDisplayNameWithQuantity( contentPanelData ) {
    contentPanelData.displayNameWithQuantityTabs = contentPanelData.tabs.filter( tab => tab.loadInputObject );
}

/**
 * Get list of properties to load in order to have each tab contentCount (number of object displayed in the tab content)
 *
 * @param {Object} contentPanelData - the content panel ( having the tabs ) data as json object
 */
export function getAllPropertiesToLoad( contentPanelData ) {
    contentPanelData.allPropertiesToLoad = [];
    contentPanelData.allLoadTypes = [];
    contentPanelData.displayNameWithQuantityTabs.forEach( ( tab ) => {
        tab.loadInputObject.propertiesToLoad && contentPanelData.allPropertiesToLoad.push( ...tab.loadInputObject.propertiesToLoad );
        tab.loadInputObject.additionalPropertiesToLoad && contentPanelData.allPropertiesToLoad.push( ...tab.loadInputObject.additionalPropertiesToLoad );
        tab.loadInputObject.loadType && contentPanelData.allLoadTypes.push(tab.loadInputObject.loadType);
    } );
}

/**
 * Load properties in order to have each tab contentCount (number of object displayed in the tab content)
 *
 * @param {String} objUid - the object uid to load its related data to display in tabs
 * @param {StringArray} propertiesToLoad - list of all tabs properties to get their content
 *
 * @returns {Object} the object properties
 */
function loadAllProperties( objUid, propertiesToLoad,loadTypes) {
    const loadTypeInput = epLoadInputHelper.getLoadTypeInputs( [ epLoadConstants.GET_PROPERTIES ], objUid, propertiesToLoad );
    if(loadTypes){
        loadTypes.forEach(typeToLoad =>{
            loadTypeInput.push({
                loadType:typeToLoad,
                objectsToLoad:[objUid]
            });
        });
    }
    return epLoadService.loadObject( loadTypeInput, false );
}

/**
 * Init all the relevant tabs contentCount
 *
 * @param {Object} tabsData - the tabs data as json object
 */
function initTabsContentCount( tabsData ) {
    tabsData.forEach( ( tabData ) => {
        tabData.namePrefix = !tabData.namePrefix ? tabData.name : tabData.namePrefix;
        tabData.contentCount = 0;
        tabData.name = tabData.namePrefix;
    } );
}

/**
 * In case an object is selected to display its related data in the details tabs than,
 * Calculate the number of objects to display in each tab to, display in parenthesis next to the tab display name.
 * In case no object to display its related data in tabs is selected, or more than one object is selected than,
 * Don't display anything next to the tab display name
 *
 * @param {String} objUid - the object uid to load its related data to display in tabs
 * @param {Object} tabsData - the tabs data as json object
 */
export function calculateContentCountForEachTab( objUid, contentPanelData ) {
    if( objUid ) {
        loadAllProperties( objUid, contentPanelData.allPropertiesToLoad,contentPanelData.allLoadTypes ).then( ( response ) => {
            const modelObject = cdm.getObject( objUid );
            contentPanelData.displayNameWithQuantityTabs.forEach( ( tabData ) => {
                const property = tabData.loadInputObject.propertiesToLoad;
                if(modelObject.props[property]){
                    tabData.contentCount = modelObject.props[property].dbValues ? modelObject.props[property].dbValues.length : 0;
                }else{
                    //Handle additional properties here
                    tabData.contentCount = 0;
                    const additionalProps = epObjectPropertyCacheService.getProperty( objUid, tabData.loadInputObject.loadedObjectMapKey );
                    if(additionalProps){
                        tabData.contentCount = additionalProps.length;
                    }
                }

                setTabDisplayNameWithQuantity( tabData );
            } );
        } );
    } else {
        initTabsContentCount( contentPanelData.displayNameWithQuantityTabs );
    }
}


const exports = {
    setTabDisplayNameWithQuantity,
    getListOfTabsToDisplayNameWithQuantity,
    getAllPropertiesToLoad,
    calculateContentCountForEachTab
};

export default exports;
