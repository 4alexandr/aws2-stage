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
 * Directive to .......................................
 *
 * @module js/aw-ace-effectivity.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/appCtxService';
import 'js/dateEffectivityConfigurationService';
import 'js/sharedEffectivityService';
import 'js/aw-row.directive';
import 'js/aw-radiobutton.directive';
import 'js/aw-checkbox.directive';
import 'js/aw-textbox.directive';
import 'js/aw-property-error.directive';
import 'js/aw-date.directive';
import 'js/aw-datetime.directive';
import 'js/aw-listbox.directive';
import 'js/aw-label.directive';
import 'js/aw-button.directive';
import 'js/aw-property-image.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-ace-effectivity-validator.directive';
import 'js/exist-when.directive';

'use strict';

/**
 * Directive to ..............<br>
 *
 * <pre>
 *  Directive Attribute Usage:
 *      data - (Required) The view model data.
 * </pre>
 *
 * @example <aw-ace-effectivity data="data"></aw-ace-effectivity>
 *
 */
app
    .directive(
        'awAceEffectivity',
        [
            'appCtxService',
            'sharedEffectivityService',
            'dateEffectivityConfigurationService',
            function( appCtxSvc, sharedEffSvc, dateEffConfigSvc ) {
                return {
                    restrict: 'E',
                    scope: {
                        data: '='
                    },
                    templateUrl: app.getBaseUrlPath() + '/html/aw-ace-effectivity.directive.html',
                    controller: [
                        '$scope',
                        function( $scope ) {
                            $scope.data.endItemRev = {};

                            $scope.loadOrClearTopLevelAsEndItem = function() {
                                var locationContext = appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:SubLocation' );

                                if( locationContext === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' && !$scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue && ( $scope.flag === 'AUTHOR' || !$scope.data.unitRangeText.dbValue ) ) {
                                    sharedEffSvc.loadTopLevelAsEndItem();
                                    sharedEffSvc.updateEndItemValue( $scope.data );
                                } else if( $scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
                                    sharedEffSvc.clearSelectedEndItem( $scope.data );
                                }
                            };

                            $scope.updateEndItemWidgetVisibility = function() {
                                $scope.isEndItemAllowed = !$scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue ||
                                    $scope.data.endItemVal.uiValue;
                                $scope.loadOrClearTopLevelAsEndItem();
                            };
                            $scope.updateEndItemWidgetVisibility();

                            $scope.getInitialDateEffectivityConfigurationData = function() {
                                dateEffConfigSvc.getInitialDateEffectivityConfigurationData( $scope.data );
                            };
                            $scope.getInitialDateEffectivityConfigurationData();

                            $scope.flag = 'AUTHOR';

                            $scope.setOrClearDateOrUnitEffectivity = function() {
                                if( $scope.flag === 'EDIT' ) {
                                    sharedEffSvc.setDateOrUnitEffectivityInEditPanel( $scope.data );
                                } else if( $scope.flag === 'AUTHOR' ) {
                                    sharedEffSvc.clearDateAndUnitEffectivity( $scope.data );
                                }
                                $scope.updateEndItemWidgetVisibility();
                            };

                            $scope.clearEndDate = function() {
                                if( $scope.data.endDateOptions.dbValue !== 'Date' ) {
                                    $scope.data.endDate.dateApi.dateValue = '';
                                    $scope.data.endDate.dateApi.timeValue = '';
                                    $scope.data.endDate.dbValue = '';
                                }
                            };

                            $scope.navigateToEndItemPanel = function() {
                                eventBus.publish( 'awPanel.navigate', {
                                    destPanelId: 'AuthorEffectivityEndItemPanel',
                                    title: $scope.data.i18n.endItemMessage,
                                    recreatePanel: true,
                                    supportGoBack: true
                                } );
                            };

                            $scope.clearSelectedEndItem = function() {
                                sharedEffSvc.clearSelectedEndItem( $scope.data );
                            };

                            $scope.setProperties = function() {
                                $scope.flag = 'EDIT';
                                sharedEffSvc.setProperties( $scope.data );
                            };
                            $scope.updateEndItemValue = function() {
                                sharedEffSvc.updateEndItemValue( $scope.data );
                            };

                            $scope.$watch(
                                function( scope ) {
                                    return [ scope.data.endItemRev.isEndItemRevSet,
                                        scope.data.endItemVal.uiValue
                                    ];
                                },
                                function() {
                                    $scope.validateEffectivity();
                                    $scope.showEndItem();
                                }, true );

                            $scope.$watch( function( scope ) {
                                return [ scope.data.unitRangeText.dbValue,
                                    scope.data.startDate.dateApi.dateValue,
                                    scope.data.endDate.dateApi.dateValue, scope.data.isShared.dbValue,
                                    scope.data.nameBox.dbValue, scope.data.endDateOptions.dbValue,
                                    scope.data.isunitRangeValid, scope.data.isDateRangeValid
                                ];
                            }, function() {
                                $scope.validateEffectivity();
                            }, true );

                            $scope.$watch( 'data.dateOrUnitEffectivityTypeRadioButton.dbValue', $scope.updateEndItemWidgetVisibility );

                            $scope.showEndItem = function() {
                                if( $scope.data.endItemRev.isEndItemRevSet || $scope.data.endItemVal.uiValue ) {
                                    $scope.isItemRevSet = true;
                                } else {
                                    $scope.isItemRevSet = false;
                                }
                            };

                            $scope.validateEffectivity = function() {
                                if( ( !$scope.data.isShared.dbValue || $scope.data.nameBox.dbValue ) &&
                                    ( $scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue ||
                                        $scope.data.endItemRev.isEndItemRevSet || $scope.data.endItemVal.uiValue ) &&
                                    ( $scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue ||  $scope.data.unitRangeText.dbValue && $scope.data.isunitRangeValid  ) &&
                                    ( !$scope.data.dateOrUnitEffectivityTypeRadioButton.dbValue ||   $scope.data.startDate.dateApi.dateValue && !$scope.data.startDate.error  &&
                                        ( $scope.data.endDateOptions.dbValue !== 'Date' ||  $scope.data.endDate.dateApi.dateValue && !$scope.data.endDate.error  ) && $scope.data.isDateRangeValid  ) ) {
                                    $scope.data.isValidEffectivityPanel = true;
                                } else {
                                    $scope.data.isValidEffectivityPanel = false;
                                }
                            };
                        }
                    ],

                    link: function( scope ) {
                        var setPropertiesEvent = eventBus.subscribe( 'editEffectivities.setProperties',
                            function() {
                                scope.$evalAsync( function() {
                                    scope.setProperties();
                                    scope.updateEndItemWidgetVisibility();
                                } );
                            } );

                        var updateEndItemValueEvent = eventBus.subscribe(
                            'authorEffectivities.updateEndItemValue',
                            function() {
                                scope.updateEndItemValue();
                            } );

                        //handle cleanup when the scope is destroyed
                        scope.$on( '$destroy', function() {
                            eventBus.unsubscribe( setPropertiesEvent );
                            eventBus.unsubscribe( updateEndItemValueEvent );
                        } );
                    }
                };
            }
        ] );
