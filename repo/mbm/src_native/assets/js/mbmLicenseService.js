// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/mbmLicenseService
 */

import soaService from 'soa/kernel/soaService';
import localeService from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import messagingService from 'js/messagingService';

'use strict';

/**
 * checks first 'mfg_mbm_author_ep' and if it is not present then it will check for 'mfg_mbm_author' license for mbm module and returns promise with passed context object. 
 * if context object is undefined it returns true if license is successfully validated.
 * @param {Object} context context infot to open wp
 * @return {Object} object of given context 
 */
export let validateMbmLicense = function( context ) {
    let deferred = AwPromiseService.instance.defer();
    soaService.post( 'Core-2008-03-Session', 'connect', { featureKey: 'mfg_mbm_author_ep', action: 'get' } ).then(
        function( resolved ) {
            if( context ) {
                deferred.resolve( { ...context } );
            } else {
                let isMbmLicenseValid = true;
                deferred.resolve( isMbmLicenseValid );
            }
        },
        function( reject ) {
            soaService.post( 'Core-2008-03-Session', 'connect', { featureKey: 'mfg_mbm_author', action: 'get' } ).then(
                function( resolved ) {
                    if( context ) {
                        deferred.resolve( { ...context } );
                    } else {
                        let isMbmLicenseValid = true;
                        deferred.resolve( isMbmLicenseValid );
                    }
                },
                function( reject ) {
                    localeService.getLocalizedText( 'mbmMessages', 'mbmLicenseFailureMsg' ).then( function( result ) {
                        messagingService.showError( result );
                        deferred.reject( result );
                    } );
                }
            );
        }
    );
    return deferred.promise;
};

export default {
    validateMbmLicense
};
