// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/epObjectPropertyCacheService
 */
'use strict';

let propertiesCache = {};

export const setProperties = ( key, properties ) => { propertiesCache[ key ] = properties; };

export const addProperty = function( key, propertyKey, propertyValue ) {
    if( !propertiesCache[ key ] ) {
        propertiesCache[ key ] = {};
    }
    propertiesCache[ key ][ propertyKey ] = propertyValue;
};

export const updateProperty = function( key, propertyKey, propertyValue ) {
    if( propertiesCache[ key ] ) {
        if( propertiesCache[ key ][ propertyKey ] ) {
            propertiesCache[ key ][ propertyKey ] = propertyValue;
        }
    }
};

export const getProperty = function( key, propertyKey ) {
    if( propertiesCache[ key ] ) {
        return propertiesCache[ key ][ propertyKey ];
    }
    return null;
};

export const clearCache = function( key ) {
    if( key ) {
        delete propertiesCache[ key ];
    } else {
        propertiesCache = {};
    }
};

export default {
    setProperties,
    addProperty,
    updateProperty,
    getProperty,
    clearCache
};
