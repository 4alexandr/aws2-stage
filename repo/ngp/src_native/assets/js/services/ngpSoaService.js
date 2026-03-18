// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpPartialErrorSvc from 'js/services/ngpPartialErrorService';
import soaSvc from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';

/**
 * The ngp relation service
 *
 * @module js/services/ngpSoaService
 */
'use strict';

/**
 *
 * @param {string} serviceName - the service name
 * @param {string} operationName - the operation name
 * @param {object} body - the soa input
 * @param {boolean} returnErrors - true if you want the list of error numbers returned when resolving the promise
 * @return {promise} a promise object. The promise will be resolved with the response
 *                   and the list of ignorable partial errors, or rejected with a list of partial errors
 */
export function executeSoa( serviceName, operationName, body, returnErrors = false ) {
    const deferred = AwPromiseService.instance.defer();
    soaSvc.postUnchecked( serviceName, operationName, body ).then(
        ( response ) => {
            const categorizedErrors = ngpPartialErrorSvc.handlePartialErrors( response );
            if( categorizedErrors.notToIgnore.length > 0 ) {
                deferred.reject( categorizedErrors.notToIgnore );
            } else {
                if( returnErrors ) {
                    deferred.resolve( {
                        response,
                        errors: categorizedErrors.ignore.concat( categorizedErrors.ignoreButDisplay )
                    } );
                } else {
                    deferred.resolve( response );
                }
            }
        }
    );
    return deferred.promise;
}

export default {
    executeSoa
};
