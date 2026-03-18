// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define */

/**
 * Directive for APS effectivity panel.
 *
 * @module js/aw-aps-effectivity.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/appCtxService';
import 'js/apsEffectivityAuthoringService';
import 'js/aw-panel-section.directive';
import 'js/aw-radiobutton.directive';
import 'js/aw-textbox.directive';
import 'js/aw-property-error.directive';
import 'js/aw-date.directive';
import 'js/aw-listbox.directive';
import 'js/aw-aps-effectivity-validator.directive';
import 'js/exist-when.directive';
import 'js/apsEffectivityIntentService';

'use strict';

/**
 * Directive for effectivity authoring panel<br>
 *
 * <pre>
 *  Directive Attribute Usage:
 *      data - (Required) The view model data.
 * </pre>
 *
 * @param {Object} appCtxSvc - appCtxService
 * @param {Object} apsEffAuthSvc - apsEffectivityAuthoringService
 *
 * @return {Object} - Directive instance
 *
 * @example <aw-aps-effectivity data="data"></aw-aps-effectivity>
 */
app.directive(
    'awApsEffectivity',
    [
        'appCtxService',
        'apsEffectivityAuthoringService',
        'apsEffectivityIntentService',
        function( appCtxSvc, apsEffAuthSvc, apsEffIntentSvc ) {
            return {
                restrict: 'E',
                scope: {
                    data: '='
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-aps-effectivity.directive.html',
                controller: [
                    '$scope',
                    function( $scope ) {
                        $scope.flag = "EDIT";
                        if( appCtxSvc.ctx.effIntents.isAddEffectivity === true ) {
                            $scope.flag = "AUTHOR";
                            // clear existing formula before add
                            apsEffIntentSvc.clearExistingFormula();
                        }

                        $scope.setOrClearDateOrUnitEffectivity = function() {
                            if( $scope.flag === "AUTHOR" ) {
                                apsEffAuthSvc.clearDateAndUnitEffectivity( $scope.data );
                            }
                        };

                        $scope.clearEndDate = function() {
                            if( $scope.data.endDateOptions.dbValue !== 'Date' ) {
                                apsEffAuthSvc.clearEndDate( $scope.data );
                            }
                        };

                        // Panel is valid if effectivity type is unit and unit range text has value and it is valid
                        $scope.validateUnitEffectivity = function() {
                            $scope.data.isValidEffectivityPanel = !$scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue &&
                                $scope.data.unitRangeText.dbValue && $scope.data.isUnitRangeValid;
                        };

                        // Panel is valid if effectivity type is SO or UP or ( Date and start date has value and start date value matches regex
                        // and end date option is date and end date has value and end date value matches regex and date range is valid )
                        $scope.validateDateEffectivity = function() {
                            // We are using this directive for authoring purpose and thus sending last argument as true
                            var rangeValid = apsEffAuthSvc.isDateRangeValid( $scope.data, true );
                            $scope.data.isValidEffectivityPanel = rangeValid &&
                                $scope.data.isDateRangeValid;
                        };

                        $scope.$watch( 'data.unitRangeText.dbValue', function() {
                            $scope.validateUnitEffectivity();
                        } );

                        $scope.$watch( 'data.isUnitRangeValid', function() {
                            $scope.validateUnitEffectivity();
                        } );

                        $scope.$watch( 'data.startDate.dateApi.dateValue', function() {
                            // Any change in start or end date should trigger date range validation again
                            $scope.data.isDateRangeValid = false;
                            $scope.validateDateEffectivity();
                        } );

                        $scope.$watch( 'data.endDate.dateApi.dateValue', function() {
                            // Any change in start or end date should trigger date range validation again
                            $scope.data.isDateRangeValid = false;
                            $scope.validateDateEffectivity();
                        } );

                        $scope.$watch( 'data.endDateOptions.dbValue', function() {
                            $scope.validateDateEffectivity();
                        } );

                        $scope.setProperties = function() {
                            $scope.flag = "EDIT";
                            apsEffAuthSvc.setProperties( $scope.data );
                        };
                    }
                ],

                link: function( scope ) {
                    var setPropertiesEvent = eventBus.subscribe( "apsEditEffectivities.setProperties",
                        function() {
                            scope.setProperties();
                        } );

                    //handle cleanup when the scope is destroyed
                    scope.$on( '$destroy', function() {
                        eventBus.unsubscribe( setPropertiesEvent );
                    } );
                }
            };
        }
    ] );
