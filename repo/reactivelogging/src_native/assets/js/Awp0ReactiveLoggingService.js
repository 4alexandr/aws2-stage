// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
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
 * @module js/Awp0ReactiveLoggingService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import msgService from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import 'jquery';

/** The exports */
var exports = {};

/** The context service */

/** The messaging service */

/** The promise service */

/** The client data model */

/** The soa service */

/**The fmsTicketURL */
var fmsTicketURL = '';

/**
 * This function gets the module name list from the SOA Internal-DebugMonitor-2011-06-DebugLogging-getModuleJournalStatus
 * and populates the "Type:" multi select drop down list.
 * @param {Data} data - The data of the startLogging SOA service
 * @return A list of module names to be consumed by the option field "Type"
 *
 */
export let getModuleName = function( data ) {
    var moduleName = [];

    for( var i = 0; i < data.moduleList.length; i++ ) {
        moduleName[ i ] = [];
        moduleName[ i ].propDisplayValue = '';
        moduleName[ i ].propInternalValue = '';

        moduleName[ i ].propDisplayValue = data.moduleList[ i ].moduleName;
        moduleName[ i ].propInternalValue = data.moduleList[ i ].moduleName;
    }

    return moduleName;
};

/**
 * This function provides the Fms Ticket information.
 * @param {Data} data - The data of the stopLogging SOA service
 * @return A fms ticket link to be downloaded.
 */
export let fmsTicket = function( data ) {
    var uri = '';
    fmsTicketURL = '';
    if( data.prevDebugLoggingFlags !== undefined && data.prevDebugLoggingFlags.url !== undefined ) {
        uri = data.prevDebugLoggingFlags.url;
        fmsTicketURL = window.location.origin + window.location.pathname + uri;
    }

    return fmsTicketURL;
};

/**
 * This function provides the zip folder name.
 * @param {Data} data - The data of the stopLogging SOA service
 * @return A fms ticket link to be downloaded.
 */
export let folderName = function( data ) {
    var folderName = '';
    if( data.prevDebugLoggingFlags !== undefined && data.prevDebugLoggingFlags.reactiveLogs !== undefined ) {
        folderName = data.prevDebugLoggingFlags.reactiveLogs;
        var n = folderName.lastIndexOf( '\\' );
        folderName = folderName.substring( n + 1 );
    }
    return folderName;
};

/**
 * This function provides the download link for the download button
 * @return A fms ticket link to be downloaded.
 */
export let downloadLink = function() {
    if( fmsTicketURL !== '' ) {
        return window.open( fmsTicketURL );
    }
};

/**
 * This function returns an empty string
 * @return An empty string
 */
export let emptyString = function() {
    return ' ';
};

/**
 * This function helps in swapping the Start/Stop button based on whether the loggingInProgress context is set to
 * true/false. This function also helps in enabling anesets the notification bubble on the settings command
 * notifying the user that logging is in progress.
 * @param {Data} data - The data of the startLogging SOA service
 */
export let loggingStatus = function() {
    if( appCtxSvc.ctx.loggingInProgress === undefined || appCtxSvc.ctx.loggingInProgress === false ) {
        appCtxSvc.ctx.loggingInProgress = true;
    } else {
        appCtxSvc.ctx.loggingInProgress = false;
    }
    //console.log( angular.element(document.body).injector().get('appCtxService').ctx );
};

/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @member Awp0ReactiveLoggingService
 * @param $q
 */

export default exports = {
    getModuleName,
    fmsTicket,
    folderName,
    downloadLink,
    emptyString,
    loggingStatus
};
app.factory( 'Awp0ReactiveLoggingService', () => exports );
