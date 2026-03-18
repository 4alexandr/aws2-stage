// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Export Interface panel
 *
 * @module js/Ase1ExportInterfaceElement
 */

'use strict';

var exports = {};

/**
 * Get the selected scope name
 *
 * @param {Object} data - The panel's view model object
 * @return {String} The scope name
 */
export let getScopeValue = function( data ) {
    var scope = '';
    if( data.exportInterfaceScope.dbValue === data.i18n.internalOnly ) {
        scope = "Internal Only";
    } else if( data.exportInterfaceScope.dbValue === data.i18n.internalAndExternal ) {
        scope = "Internal and External";
    }
    return scope;
};

export default exports = {
    getScopeValue
};
