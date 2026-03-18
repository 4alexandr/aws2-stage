// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This is a contribution for a login process blocking step definition
 *
 * @module js/confidentialityAgreement.states
 */

'use strict';

var contribution = {
    confidentialityAgreement: {
        templateUrl: '/html/confidentiality.agreement.html',
        controller: 'ConfidentialityAgreement',
        resolve: {
            loadController: [ '$q', '$injector', function( $q ) {
                var deferred = $q.defer();
                import( 'js/confidentiality.agreement.controller' ).then( deferred.resolve );
                return deferred.promise;
            } ]
        }
    }
};

export default function( key, deferred ) {
    if( key === 'states' ) {
        if( deferred ) {
            deferred.resolve( contribution );
        } else {
            return contribution;
        }
    }
}
