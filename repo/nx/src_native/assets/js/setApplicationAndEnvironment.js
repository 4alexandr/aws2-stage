// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/setApplicationAndEnvironment
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import prefSvc from 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

/**
 *Added Preferences
 *TC_NX_Current_Environment
 *TC_NX_Environments
 *TC_NX_Applications
 *TC_NX_Current_Application
 *AWC_NX_ApplicationAndEnvironmentIsSupported
 */
var exports = {};

/**
 * Uses the selected event data to update/select a Client Application and Environment to be printed in the nxtcxml when using open in nx in stand alone
 *
 * @param {eventData} eventData - eventData selected from pop-up-link
 */

export let setApplicationOrEnvironment = function( eventData ) {
    if( eventData.propScope.id === "aw-state-setApplication" ) {
        var appValue = [];
        appValue[ 0 ] = eventData.property.dbValue;
        appCtxSvc.updatePartialCtx( "preferences.TC_NX_Current_Application", appValue );
    } else if( eventData.propScope.id === "aw-state-setEnvironment" ) {
        var envValue = [];
        envValue[ 0 ] = eventData.property.dbValue;
        appCtxSvc.updatePartialCtx( "preferences.TC_NX_Current_Environment", envValue );
    }
};

export default exports = {
    setApplicationOrEnvironment
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member setApplicationAndEnvironment
 */
app.factory( 'setApplicationAndEnvironment', () => exports );
