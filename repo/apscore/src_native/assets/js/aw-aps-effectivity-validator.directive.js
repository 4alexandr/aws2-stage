// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Definition for the (aw-aps-effectivity-validator) directive used to validate unit and date effectivity.
 * 
 * @module js/aw-aps-effectivity-validator.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/dateTimeService';
import 'js/localeService';
import 'js/apsEffectivityValidationService';

'use strict';

/**
 * Define local variables for commonly used key-codes.
 */
var _kcSpace = 32;

/**
 * Definition for the (aw-aps-effectivity-validator) directive used to validate unit and date effectivity.
 * 
 * @param {Object} dateTimeSvc - dateTimeService
 * @param {Object} localeSvc - localeService
 * @param {Object} effValidationSvc - apsEffectivityValidationService
 * 
 * @return {Object} - Directive instance
 * 
 * @member aw-aps-effectivity-validator
 * @memberof NgAttributeDirectives
 */
app.directive( 'awApsEffectivityValidator', [
    'dateTimeService',
    'localeService',
    'apsEffectivityValidationService',
    function( dateTimeSvc, localeSvc, effValidationSvc ) {
        return {
            restrict: "A",
            require: 'ngModel',
            link: function( $scope, $element, attrs, ngModelCtrl ) {
                if( !ngModelCtrl ) {
                    return;
                }

                //This validator handles both date and unit effectivity validations.
                //The below listeners are required only when date effectivity is being validated
                if( attrs.awApsEffectivityValidator.indexOf( "DATE" ) !== -1 ) {

                    //Start date: Listen to changes in start date and set start and end same
                    $scope.changeEventListener1 = $scope.$watch( function() {
                        var scope = $scope.$parent;
                        while( scope !== null && !scope.data ) {
                            scope = scope.$parent;
                        }
                        return scope.data.startDate.dateApi.dateValue;
                    }, function() {
                        //Re-validate to clear out any previous error
                        effValidationSvc.checkAsyncRangeEffectivity( $scope, attrs.awApsEffectivityValidator,
                            ngModelCtrl, $scope.data.endDate );
                    } );

                    // End Date: Listen to changes in end date and validate
                    $scope.changeEventListener2 = $scope.$watch( function() {
                        var scope = $scope.$parent;
                        while( scope !== null && !scope.data ) {
                            scope = scope.$parent;
                        }
                        return scope.data.endDate.dateApi.dateValue;
                    }, function( newValue ) {
                        var endDate = dateTimeSvc.getJSDate( newValue );
                        effValidationSvc.checkAsyncRangeEffectivity( $scope, attrs.awApsEffectivityValidator,
                            ngModelCtrl, endDate );
                    } );
                }

                /**
                 * Add the validation 'machinery' to the set of 'validators' on the ng-model controller.
                 * 
                 * @param {String} value - value
                 * @param {String} viewValue - view value
                 * 
                 * @returns {Object} promise
                 */
                ngModelCtrl.$asyncValidators.validEffectivity = function( value, viewValue ) {
                    var valueFinal = viewValue;

                    if( _.isUndefined( valueFinal ) || _.isNull( valueFinal ) ) {
                        valueFinal = '';
                    }

                    //Handle unit and date effectivity validation
                    return effValidationSvc.checkAsyncRangeEffectivity( $scope, attrs.awApsEffectivityValidator,
                        ngModelCtrl, valueFinal );
                };

                /**
                 * Set up to ignore any 'space' key being pressed while in the field.
                 * 
                 * @param event
                 * 
                 * @returns {Void}
                 */
                $element.bind( 'keypress', function( event ) {
                    if( event.keyCode === _kcSpace ) {
                        // ignore space key
                        event.preventDefault();
                    }
                } );

                //Clean-up listeners when the scope is destroyed
                $scope.$on( '$destroy', function() {
                    if( $scope.changeEventListener1 ) {
                        $scope.changeEventListener1 = null;
                    }
                    if( $scope.changeEventListener2 ) {
                        $scope.changeEventListener2 = null;
                    }
                } );
            }
        };
    }
] );
