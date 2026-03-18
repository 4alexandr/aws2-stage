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
 * Definition for the (aw-ace-effectivity-validator) directive used to validate unit effectivity.
 * 
 * @module js/aw-ace-effectivity-validator.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aceEffectivityValidationService';

'use strict';

/**
 * Define local variables for commonly used key-codes.
 */
var _kcSpace = 32;

/**
 * Definition for the (aw-ace-effectivity-validator) directive used to validate unit effectivity.
 * 
 * 
 * @member aw-ace-effectivity-validator
 * @memberof NgAttributeDirectives
 */
app.directive( 'awAceEffectivityValidator', [
    'aceEffectivityValidationService',
    function( effValidationSvc ) {
        return {
            restrict: "A",
            require: 'ngModel',
            link: function( scope, element, attrs, ngModelCtrl ) {
                if( !ngModelCtrl ) {
                    return;
                }

                /**
                 * Add the validation 'machinery' to the set of 'validators' on the ng-model controller.
                 * 
                 * @param value
                 * 
                 * @returns {Void}
                 */
                ngModelCtrl.$asyncValidators.validEffectivity = function( value, viewValue ) {
                    var valueFinal = viewValue;

                    if( _.isUndefined( valueFinal ) || _.isNull( valueFinal ) ) {
                        valueFinal = '';
                    }

                    return effValidationSvc.checkAsyncUnitEffectivity( scope, attrs.awAceEffectivityValidator,
                        ngModelCtrl, valueFinal );
                };

                /**
                 * Set up to ignore any 'space' key being pressed while in the field.
                 * 
                 * @param event
                 * 
                 * @returns {Void}
                 */
                element.bind( 'keypress', function( event ) {
                    if( event.keyCode === _kcSpace ) {
                        // ignore space key
                        event.preventDefault();
                    }
                } );
            }
        };
    }
] );
