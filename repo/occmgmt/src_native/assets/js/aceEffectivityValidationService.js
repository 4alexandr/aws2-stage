// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 * This service provides validations for unit effectivity.
 *
 * @module js/aceEffectivityValidationService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import uwValidationSvc from 'js/uwValidationService';

var _integerMaxValue = 2147483647;
var exports = {};

/**
 * @private
 *
 * @param {Function} msgFn - Function to call that will set the error message
 */
var _setErrorText = function( scope, msgFn ) {
    scope.errorApi.errorMsg = '...details pending';
    var resource = 'OccurrenceManagementMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    if( localTextBundle ) {
        msgFn( localTextBundle );
    } else {
        localeSvc.getTextPromise( resource ).then( msgFn( localTextBundle ) );
    }
};

/**
 * Validate unit effectivity and issues error on invalid entry.
 * <P>
 * Note: If there is any failure in validation, the details of which will appear as a non-null value on the
 * 'scope.errorApi.errorMsg' property.
 *
 * @param {NgScope} scope - The AngularJS 'scope' containing the property to interact with.
 *
 * @param {String} effectivityValidator - Effectivity Validator string
 *
 * @param {NgModelController} ngModelCtrl - The (optional) NgModelController to interact with in case the UI needs
 *            to be updated.
 *
 * @param {String} value - String to test for validity.
 *
 * @returns {String} Same as given input value with any invalid characters removed.
 */
export let checkAsyncUnitEffectivity = function( scope, effectivityValidator, ngModelCtrl, value ) {
    var deferred = AwPromiseService.instance.defer();

    if( scope.errorApi ) {
        _setErrorText( scope, function( localTextBundle ) {

            var clean = value;

            var errorMsg = null;

            //regex for positive integers
            var unitEffPattern = /^[0-9]+$/g;

            if( effectivityValidator === "UNIT" ) {

                if( clean !== null && clean !== '' ) {

                    clean = clean.replace( /\s+/g, '' ); //remove all spaces from the given string
                    if( ngModelCtrl && value !== clean ) {
                        ngModelCtrl.$setViewValue( clean );
                        ngModelCtrl.$render();
                    }

                    var result = clean.match( unitEffPattern );

                    if( result === null || result.length > 1 ) {
                        errorMsg = localTextBundle.shouldBePositiveNumber;
                    } else if( parseInt( result, 10 ) > _integerMaxValue ) {
                        errorMsg = localTextBundle.tooLarge;
                    }
                }
            } else if( effectivityValidator === "AUTHOR_DATE" ) {
                if( clean !== null && clean !== '' ) {
                    var startDate = scope.data.startDate.dbValue;
                    var endDate = scope.data.endDate.dbValue;
                    var endDateOptions = scope.data.endDateOptions.dbValue;

                    if( startDate > 0 && endDateOptions === 'Date' && endDate > 0 && ( endDate - startDate ) <= 0 ) {
                        errorMsg = localTextBundle.dateRangeInvalidMessage;
                    }
                }
                scope.data.isDateRangeValid = ( errorMsg === null );
            } else if( effectivityValidator === "EDIT_DATE" ) {
                if( clean !== null && clean !== '' ) {
                    var startDate = scope.data.startDate.dbValue; // eslint-disable-line no-redeclare
                    var endDate = scope.data.endDate.dbValue; // eslint-disable-line no-redeclare
                    var endDateOptions = scope.data.endDateOptions.dbValue; // eslint-disable-line no-redeclare
                    if( startDate > 0 && endDateOptions === 'Date' && endDate > 0 && ( endDate - startDate ) <= 0 ) {
                        errorMsg = localTextBundle.dateRangeInvalidMessage;
                    }
                }
                scope.data.isDateRangeValid = ( errorMsg === null );
            } else if( effectivityValidator === "AUTHOR_UNIT" ) {
                clean = clean.replace( /\s+/g, '' ); //remove all spaces from the given string
                if( ngModelCtrl && value !== clean ) {
                    ngModelCtrl.$setViewValue( clean );
                    ngModelCtrl.$render();
                }

                if( clean !== null && clean !== '' ) {
                    var unitInParts = clean.split( "," );
                    var lastValue = -1;
                    var i = 0;
                    for( i = 0; i < unitInParts.length; i++ ) {
                        var units = unitInParts[ i ].split( "-" );

                        // if range is given even after UP or SO, lastValue will be NaN
                        // pattern like 10-15-20 is invalid
                        if( isNaN( lastValue ) ) {
                            errorMsg = localTextBundle.rangeInvalidMessage;
                            break;
                        } else if( units.length > 2 ) {
                            errorMsg = localTextBundle.badSyntax;
                            break;
                        }
                        // check 1st part is number or if it is a negative number
                        if( isNaN( units[ 0 ] ) ) {
                            errorMsg = localTextBundle.shouldBePositiveNumber;
                            break;
                        } else if( units[ 0 ] === "" ) {
                            errorMsg = localTextBundle.shouldBePositiveNumber;
                            break;
                        } else if( Number( units[ 0 ] ) <= lastValue ) {
                            errorMsg = localTextBundle.rangeInvalidMessage;
                            break;
                        } else if( parseInt( units[ 0 ], 10 ) > _integerMaxValue ) {
                            errorMsg = localTextBundle.tooLarge;
                            break;
                        }

                        lastValue = Number( units[ 0 ] ); // update last value

                        // if there is second part
                        if( units.length > 1 ) {
                            // check 1st part is number
                            if( isNaN( units[ 1 ] ) ) {
                                if( units[ 1 ] !== 'UP' && units[ 1 ] !== 'SO' ) {
                                    errorMsg = localTextBundle.shouldBePositiveNumber;
                                    break;
                                }
                            } else if( Number( units[ 1 ] ) <= lastValue ) {
                                errorMsg = localTextBundle.rangeInvalidMessage;
                                break;
                            } else if( parseInt( units[ 1 ], 10 ) > _integerMaxValue ) {
                                errorMsg = localTextBundle.tooLarge;
                                break;
                            }

                            lastValue = Number( units[ 1 ] );
                        }
                    }

                    scope.data.isunitRangeValid = ( errorMsg === null );
                }
            }

            if( errorMsg !== null ) {
                uwValidationSvc.setErrorMessage( scope, errorMsg );
                deferred.reject();
            } else {
                // nullify error and since it is a valid number convert it to number
                // watcher function will sync prop.error too, but the async function can happen after
                // gwt's setError function which reverts the errorMsg to the previous error.
                uwValidationSvc.setErrorMessage( scope, null );

                deferred.resolve();
            }
        } );
    }
    return deferred.promise;
};

export default exports = {
    checkAsyncUnitEffectivity
};
/**
 * Register effectivity validation service.
 *
 * @memberof NgServices
 * @member uwValidationService
 */
app.factory( 'aceEffectivityValidationService', () => exports );
