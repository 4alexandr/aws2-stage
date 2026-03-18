// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/workinstrFileTicketService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import AwSceService from 'js/awSceService';
import _ from 'lodash';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';

/**
 * Cached client data model service
 */

/**
 * Export
 */
var exports = {};

/**
 * File tickets list as [busObjectUid:[fileTickets]]
 */
var fileTickets = {};

/**
 * Add file tickets to the list
 *
 * @param {StringArray} fileTicketsVector the file tickets to add to the list
 */
export let updateFileTickets = function( fileTicketsVector ) {
    for( var k in fileTicketsVector ) {
        var currentFileTicket = fileTicketsVector[ k ];
        var busObject = currentFileTicket.busObject;
        var mappedTickets = fileTickets[ busObject.uid ];
        if( mappedTickets ) {
            mappedTickets[ mappedTickets.length ] = currentFileTicket.ticket;
        } else {
            fileTickets[ busObject.uid ] = [ currentFileTicket.ticket ];
        }
    }
};

/**
 * Set the input for the SOA to get file tickets of the busObjects that are not in the fileTickets list
 *
 * @param {StringArray} fileObjectsUid - The file objects uid
 * @return {StringArray} the soa file objects uid input
 */
export let getInput = function( fileObjectsUid ) {
    var input = {
        input: []
    };

    var currFileObjUid;
    var fileTicket;
    var fileObjectsLen = fileObjectsUid.length;
    for( var ii = 0; ii < fileObjectsLen; ii++ ) {
        currFileObjUid = fileObjectsUid[ ii ];
        fileTicket = fileTickets[ currFileObjUid ];
        if( !fileTicket || fileTicket.length === 0 ) {
            var imanFileObj = cdm.getObject( currFileObjUid );
            input.input.push( {
                fileObject: imanFileObj
            } );
        }
    }
    return input;
};

/**
 * Get file tickets SOA
 * Calls the EWI soa to get file tickets from the server. (when they are not present in the cache)
 * We need to call ewi SOA which will do processing for vmb file and for rest of files, will return the read ticket.
 *
 * @param {StringArray} fileObjectsUid - The file objects uid
 * @return {StringArray} the file tickets
 */
export let getFileTickets = function( fileObjectsUid ) {
    var deferred = AwPromiseService.instance.defer();

    var input = this.getInput( fileObjectsUid );
    if( input.input.length > 0 ) {
        var promise = soaSvc.post( 'Ewia-2012-10-DataManagement', 'getCortonaAnimationFileTicket', input );

        promise.then( function( response ) {
            var output = response.output;
            var outputLen = output.length;
            var fileTicketsVector = [];
            for( var fileIndx = 0; fileIndx < outputLen; fileIndx++ ) {
                var fileTicket = {
                    busObject: output[ fileIndx ].fileObject,
                    ticket: output[ fileIndx ].fileReadTicket
                };
                fileTicketsVector[ fileIndx ] = fileTicket;
            }

            exports.updateFileTickets( fileTicketsVector );
            deferred.resolve( fileTickets );
        } );
    } else {
        deferred.resolve( fileTickets );
    }
    return deferred.promise;
};

/**
 * Get the file URL
 *
 * @param {String} fileTicket - The file ticket
 * @return {String} the file URL
 */
export let getFileURL = function( fileTicket ) {
    if( fileTicket ) {
        var baseURL = browserUtils.getBaseURL();
        var fileName = fmsUtils.getFilenameFromTicket( fileTicket );
        var fileExtension = exports.getFileExtension( fileName );
        if( fileExtension === 'jt' || fileExtension === 'vmb' ) {
            return 'fms/fmsdownload/?ticket=' + fileTicket;
        }
        return baseURL + 'fms/fmsdownload/' + fileName + '?ticket=' + fileTicket;
    }
};

/**
 * Download the file
 *
 * @param {String} fileTicket - The file ticket
 */
export let downloadFile = function( fileTicket ) {
    window.open( fileTicket, '_self', 'enabled' );
};

/**
 * Get a web URL
 *
 * @param {String} url - The current url string
 * @return {String} the url address as a trusted url
 */
export let getUrl = function( url ) {
    if( _.isString( url ) && url.length > 0 ) {
        if( url.indexOf( 'http://' ) === -1 && url.indexOf( 'https://' ) === -1 ) {
            url = 'http://' + url;
        }
        url = url.replace( 'watch?v=', 'embed/' );
        return AwSceService.instance.trustAsResourceUrl( url );
    }
};

/**
 * Open the url in new window
 *
 * @param {String} url - The url to open in a new window
 */
export let openUrlInNewWindow = function( url ) {
    window.open( exports.getUrl( url ), '_blank', 'enabled' );
};

/**
 * Get file name extension from file name
 *
 * @param {String} fileName file name
 * @return {String} file name extension
 */
export let getFileExtension = function( fileName ) {
    var extIndex = fileName.lastIndexOf( '.' );
    if( extIndex > -1 ) {
        return fileName.substring( extIndex + 1 );
    }
    return null;
};

/**
 * A glue code to support work instructions file ticket
 *
 * @param {Object} $q - $q
 * @param {Object} soaSvc - soa_kernel_soaService
 * @param {Object} cdm - soa_kernel_clientDataModel
 * @param {Object} $sce - $sce
 *
 * @return {Object} - Service instance
 *
 * @member workinstrFileTicketService
 */

export default exports = {
    updateFileTickets,
    getInput,
    getFileTickets,
    getFileURL,
    downloadFile,
    getUrl,
    openUrlInNewWindow,
    getFileExtension
};
app.factory( 'workinstrFileTicketService', () => exports );
