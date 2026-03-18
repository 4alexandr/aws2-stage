// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/epReloadService
 */

import _ from 'lodash';
import epLoadInputHelper from 'js/epLoadInputHelper';
const loadInputsMap = new Map();
let reloadIdCount = 0;
const nameToReloadId = {};

'use strict';

let _loadInputs = [];

export const hasReloadInputs = function() {
    return !_.isEmpty( _loadInputs );
};

export const getReloadInputJSON = function() {
    let loadInputs = [];
    loadInputsMap.forEach( ( loadInp ) => {
        let loadInput = epLoadInputHelper.getLoadTypeInputs( loadInp.type, loadInp.uid, loadInp.propertiesToLoad );
        loadInputs.push( loadInput[ 0 ] );
    } );
    return epLoadInputHelper.getReloadInputJSON( loadInputs );
};

export const registerReloadInput = function( name, type, object, propertiesToLoad ) {
    if( typeof name === 'string' && !nameToReloadId[ name ] ) {
        const reloadId = register( type, object, propertiesToLoad );
        nameToReloadId[ name ] = reloadId;
    }
};

function register( type, object, propertiesToLoad ) {
    let loadInput = {
        uid: object.uid,
        type: type,
        propertiesToLoad: propertiesToLoad
    };
    let key = ++reloadIdCount;    
    loadInputsMap.set(key,loadInput);  
    _loadInputs.push( loadInput );
    return key;
}

export const unregisterReloadInput = function( name ) {
    if( typeof name === 'string' && nameToReloadId[ name ] ) {
        unregister( nameToReloadId[ name ] );
        delete nameToReloadId[ name ];
    }
};

function unregister( key ) {
    loadInputsMap.delete(key);
}

export default {
    hasReloadInputs,
    getReloadInputJSON,
    registerReloadInput,
    unregisterReloadInput
};
