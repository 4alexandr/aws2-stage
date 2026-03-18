// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import ngpConstants from 'js/constants/ngpModelConstants';
import ngpPropConstants from 'js/constants/ngpPropertyConstants';
import cdm from 'soa/kernel/clientDataModel';

/**
 * Utility to check mfg_ngp object type
 *
 * @module js/utils/ngpTypeUtils
 */
'use strict';

const NGP_BASE_OBJECT_TYPES = [
    ngpConstants.PROCESS_TYPE, ngpConstants.ACTIVITY_TYPE, ngpConstants.BUILD_ELEMENT_TYPE,
    ngpConstants.OPERATION_TYPE, ngpConstants.MANUFACTURING_ELEMENT_TYPE
];

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {boolean} true if the given modelO
 * bject is an NGP object we should navigate to
 */
export function isNGPNavigationObject( modelObject ) {
    return mfeTypeUtils.isOfTypes( modelObject, NGP_BASE_OBJECT_TYPES );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is a process element
 */
export function isProcessElement( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.PROCESS_TYPE );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is an operation
 */
export function isOperation( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.OPERATION_TYPE );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is an activity
 */
export function isActivity( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.ACTIVITY_TYPE );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is a build element
 */
export function isBuildElement( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.BUILD_ELEMENT_TYPE );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is a manufacturing element
 */
export function isManufacturingElement( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.MANUFACTURING_ELEMENT_TYPE );
}

/**
 * @param {object} modelObj - a given model object
 * @return {boolean} true if the given object is an attribute group
 */
export function isAttributeGroup( modelObj ) {
    return mfeTypeUtils.isOfType( modelObj, ngpConstants.AG_TYPE );
}

/**
 * @param {modelObject} modelObject - a given model object
 * @return {boolean} true if the given object is a class library
 */
export function isClassLibrary( modelObject ) {
    if( modelObject && modelObject.props[ ngpPropConstants.MANUFACTURING_MODEL ] ) {
        const mfgModelUid = modelObject.props[ ngpPropConstants.MANUFACTURING_MODEL ].dbValues[ 0 ];
        const mfgModelObj = cdm.getObject( mfgModelUid );
        if( mfgModelObj ) {
            const isClassLibrary = mfgModelObj.props[ ngpPropConstants.IS_CLASS_LIBRARY ].uiValues[ 0 ];
            return isClassLibrary.toLowerCase() === 'true';
        }
    }
    return false;
}

export default {
    isNGPNavigationObject,
    isProcessElement,
    isOperation,
    isActivity,
    isBuildElement,
    isManufacturingElement,
    isAttributeGroup,
    isClassLibrary
};
