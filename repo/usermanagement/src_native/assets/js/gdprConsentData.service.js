// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This represents the data handling for the GDPR Consent Page interactions
 * 
 * 
 * @module js/gdprConsentData.service
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

// service and module references

/**
 * requests the data used to populate the form for user interaction
 * 
 * @return {deferred.promise} Promise resolved once action is complete
 */
export let getGDPRConsentStatement = function() {
    var deferred = AwPromiseService.instance.defer();
    soaSvc.post( 'Administration-2018-11-OrganizationManagement', 'getUserConsentStatement ', {} ).then(
        function( UserConsentStatement ) {

            var data = {};
            if( UserConsentStatement ) {
                // check for GDPR statements   
                if( UserConsentStatement.consentStatement ) {
                    var text = UserConsentStatement.consentStatement;
                    data.consentStatementTextData = text;
                }
            }

            deferred.resolve( data );
        },
        function( err ) {
            deferred.reject( err );
        } );

    return deferred.promise;
};

/**
 * service call to record user consent
 * 
 * @param {String} acceptedConsent - record GDPR Concent status
 * @return {deferred.promise} Promise resolved once action is complete
 */
export let recordUserConsent = function( acceptedConsent ) {
    var input = {
        'userConsent': acceptedConsent
    };
    return soaSvc.post( 'Administration-2018-11-OrganizationManagement', 'recordUserConsent', input ).then(
        function( resp ) {
            return resp;
        },
        function( errObj ) {
            var msg = errObj;
            // default to the full Error object, but if there is a message prop, use that.
            if( errObj && errObj.message ) {
                msg = errObj.message;
            }
        } );
};

export default exports = {
    getGDPRConsentStatement,
    recordUserConsent
};
/**
 * The native leave place service.
 * 
 * @member leavePlaceService
 * @memberof NgServices
 */
app.factory( 'gdprConsentDataService', () => exports );
