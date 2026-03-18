// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import { constants as mfeVisConstants } from 'js/constants/mfeVisConstants';

/**
 * @module js/mfeSyncUtils
 */

'use strict';

/**
 * Set the "toSelectObjects" to the given data provider
 *
 * @param {Object} dataProvider data provider
 * @param {Array} objectsToSelect objects to select
 * @returns {Object} loaded object to select
 */
export function setSelection( dataProvider, objectsToSelect ) {
    if( !Array.isArray( objectsToSelect ) ) {
        objectsToSelect = [ objectsToSelect ];
    }
    const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    const uidList = objectsToSelect.map( object => object.uid );

    // TODO need to find a more performent way to do this.
    const loadedObjectToToSelect = loadedObjects.filter( loadedObj => uidList.indexOf( loadedObj.uid ) > -1 );
    dataProvider.selectionModel.setSelection( loadedObjectToToSelect );
    return loadedObjectToToSelect;
    // TODO add scroll and focus on selection
}


/**
 * Set the "objectsToSelect" to the given selectionModel
 *
 * @param {Object} selectionModel selectionModel
 * @param {Array} objectsToSelect objects to select
 */
export function setSelectionInSelectionModel( selectionModel, objectsToSelect ) {
    if( !Array.isArray( objectsToSelect ) ) {
        objectsToSelect = [ objectsToSelect ];
    }
    selectionModel.setSelection( objectsToSelect );
}

/**
 * Set the input Object
 *
 * @param {Object} data data
 * @param {Object} value selected object
 */
export function setInputObject( data, value ) {
    data.inputObject = value;
}

/**
 * Returns the selection object in Visibility data format
 *
 * @param {Object} vmo - the selected object
 *
 * @returns {Object} object in Visibility format
 */
export function convertToVisibilityData( vmo ) {
    let visibilityData = {
        uid: 'unknown',
        show: false
    };
    if( vmo ) {
        visibilityData.uid = vmo.uid;
        visibilityData.show = vmo.graphicVisibilityState === mfeVisConstants.LOADING;
    }
    return visibilityData;
}

/**
 * Get single input object
 * @param {Object} data the ViewModel data
 * @param {Object} newInput the new Input
 */
export function handleNewInputForSingleObject( data, newInput ) {
    data.isInputObjectUpdated = false;
    if( newInput === '' ) {
        // unmount case - framework is sending empty string
        // we don't want to set this new input in the input object
        // we return and the next actions in the view model can continue using old input.
        return;
    }
    let input = newInput;
    if( Array.isArray( input ) && input.length === 1 ) {
        input = newInput[ 0 ];
    }
    if( data.inputObject && input.uid === data.inputObject.uid ) {
        return;
    }
    data.inputObject = input;
    data.isInputObjectUpdated = true;
}

const exports = {
    setSelection,
    setSelectionInSelectionModel,
    setInputObject,
    convertToVisibilityData,
    handleNewInputForSingleObject
};

export default exports;
