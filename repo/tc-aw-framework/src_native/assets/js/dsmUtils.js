// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 document
 */

/**
 * This module provides reusable functions related to DSM integration status. This service updates the DSM integration
 * status in local storage using DSM "com.siemens.splm.clientfx.ui.DataShareManagerIntegrationStatus" as key below are
 * the DSM status are in local storage
 *
 * 0 : Data Share Manager not installed on this device. 1 : Data Share Manager is installed on this device. 2 : Use Data
 * Share Manager on this device
 *
 * @module js/dsmUtils
 */
import * as app from 'app';
import localStrg from 'js/localStorage';

var exports = {};

/**
 * DSM local storage key
 */
var dsmStateLocalStrgKeyName = "com.siemens.splm.clientfx.ui.DataShareManagerIntegrationStatus";

/**
 * Update DSM integration status on client to local storage using dsmStateLocalStrgKeyName.
 */
export let updateDSMIntegrationStatus = function( dsmIntegrationStatus ) {
    localStrg.publish( dsmStateLocalStrgKeyName, JSON.stringify( dsmIntegrationStatus ) );
};

/**
 * get DSM integration status value from local storage and return.
 */
export let getDSMIntegrationStatus = function() {
    return localStrg.get( dsmStateLocalStrgKeyName );
};

/**
 * This function verified weather the DSM us usable or not on this client. returns True if DSM is usable; Otherwise
 * false.
 *
 * If DSM integration status local storage value is 2 returns true; else false.
 *
 */
export let isDSMUsable = function() {
    var dsmIntegrationStatus = exports.getDSMIntegrationStatus();
    return dsmIntegrationStatus === "2";
};

export default exports = {
    updateDSMIntegrationStatus,
    getDSMIntegrationStatus,
    isDSMUsable
};
