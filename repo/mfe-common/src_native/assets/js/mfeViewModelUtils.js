// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * NGP View Model service
 *
 * @module js/mfeViewModelUtils
 */
'use strict';

/**
 *
 * @param {Object} object - a given object
 * @param {string} key - the key to save in the given object
 * @param {Object} value - a value to save under the given key in the given object
 */
export function setValueInViewModel( object, key, value ) {
    if( typeof key === 'string' ) {
        if( key === '' ) {
            object = value;
        } else {
            object[ key ] = value;
        }
    }
}

/**
 *
 * @param {Object} targetObj - the target object to merge to
 * @param {Object} sourceObj - the source object to merge from
 */
export function mergeValueInViewModel( targetObj, sourceObj ) {
    if( targetObj && sourceObj && typeof sourceObj === 'object' ) {
        Object.assign( targetObj, sourceObj );
    }
}

/**
 *
 * @param {boolean} booleanToToggle - a given boolean value to toggle
 * @return {boolean} the opposite of the given boolean
 */
export function getToggledBoolean( booleanToToggle ) {
    return !booleanToToggle;
}

let exports = {};
export default exports = {
    setValueInViewModel,
    mergeValueInViewModel,
    getToggledBoolean
};
