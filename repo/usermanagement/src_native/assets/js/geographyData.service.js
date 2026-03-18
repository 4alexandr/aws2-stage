// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This represents the data handling for the geography interactions
 * 
 * 
 * @module js/geographyData.service
 */
import app from 'app';
import notyService from 'js/NotyModule';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

// service and module references

/**
 * requests the data used to populate the form for user interaction
 */
export let getServerGeographyData = function() {
    var deferred = AwPromiseService.instance.defer();
    soaSvc.post( 'Administration-2016-10-UserManagement', 'getCurrentCountryPageInfo', {} ).then(
        function( response ) {

            var data = {};
            if( response && response.displayCountries ) {
                data.countryList = response.displayCountries;
            }
            if( response && response.extraInfoOut ) {
                // check for initial Country & confidentiality text - both optional
                if( response.extraInfoOut.initialCountry !== '' ) {
                    var initialValue = response.extraInfoOut.initialCountry;
                    data.initialCountryValue = initialValue;
                } else {
                    data.initialCountryValue = '';
                }
                if( response.extraInfoOut.confidentialityStatement ) {
                    var text = response.extraInfoOut.confidentialityStatement;
                    data.confidentialText = text;
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
 * service call to save the newly chosen code to the server.
 * 
 * @param {String} geoKey - key value from the geography key/value pair
 * @return {deferred.promise} Promise resolved once action is complete
 */
export let saveNewGeography = function( geoKey ) {
    var input = {
        'selectedcountry': geoKey
    };
    return soaSvc.post( 'Administration-2016-10-UserManagement', 'saveAndValidateCurrentCountry', input ).then(
        function( resp ) {
            return resp;
        },
        function( errObj ) {
            var msg = errObj;
            // default to the full Error object, but if there is a message prop, use that.
            if( errObj && errObj.message ) {
                msg = errObj.message;
            }
            notyService.showError( msg );
        } );
};

export default exports = {
    getServerGeographyData,
    saveNewGeography
};
/**
 * The native leave place service.
 * 
 * @member leavePlaceService
 * @memberof NgServices
 */
app.factory( 'geographyDataService', () => exports );
