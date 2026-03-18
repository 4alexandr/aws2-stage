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
 * Directive to render effectivity intent for all families and their values.
 *
 * @module js/aw-aps-effectivity-intent.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/apsEffectivityIntentService';
import 'jquery';
import 'js/aw-list.directive';
import 'js/viewModelService';
import 'js/aw-link-with-popup.directive';
import 'js/exist-when.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/appCtxService';
import 'js/aw-label.directive';
import 'js/aw-column.directive';
import 'js/dataProviderFactory';
import 'js/declDataProviderService';

'use strict';
var selectionChangeEvent = null;
var popupClose = null;

/**
 * Directive to display intent with families and list of values in a popup.<br>
 *
 * <pre>
 *  Directive Attribute Usage:
 *      family - (Required) The family object of which values to be rendered in popup.
 *      currentValue - (Required) The current selected value for a family.
 *      availableIntentValues - (Required) List of available values for a family.
 * </pre>
 *
 * @example <aw-aps-effectivity-intent family="family.famProp"
 * current-value="family.currentValue" available-intent-values=
 * "data.effIntents.familiesValuesMap[family.famProp.propertyDisplayName]"></aw-aps-effectivity-intent>
 *
 * @member aw-aps-effectivity-intent
 * @memberof NgElementDirectives
 */
app.directive(
    'awApsEffectivityIntent',
    [
        'viewModelService',
        'apsEffectivityIntentService',
        'dataProviderFactory',
        'declDataProviderService',
        'appCtxService',
        function( viewModelSvc, apsEffIntentSvc, dataProviderFactory, declDataProviderSvc, appCtxSvc ) {
            return {
                restrict: 'E',
                scope: {
                    family: '=',
                    currentValue: '=',
                    availableIntentValues: '='
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-aps-effectivity-intent.directive.html',
                controller: [
                    '$scope',
                    function( $scope ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        $scope.anydisplayname = apsEffIntentSvc.getAnyValueDisplayName();
                        var isSelectionChanged = false;

                        var dataProviderName = $scope.family.propertyDisplayName;
                        var dataProviderJson = {
                            dataProviderType: "Static",
                            response: $scope.availableIntentValues.response, // Populate the response array with the values in current Family.
                            totalFound: $scope.availableIntentValues.response.length
                        };

                        // Instantiate the dataprovider
                        if( !declViewModel.dataProviders ) {
                            declViewModel.dataProviders = {};
                        }
                        $scope.intentValuesProvider = new dataProviderFactory.createDataProvider( dataProviderJson,
                            null, dataProviderName, declDataProviderSvc );
                        declViewModel.dataProviders[ dataProviderName ] = $scope.intentValuesProvider;

                        // Initialize the dataProvider
                        $scope.intentValuesProvider.initialize( $scope ).then( function() {
                            $scope.isInitialized = true;
                        } );

                        $scope.selectItem = function() {
                            if( $scope.intentValuesProvider.viewModelCollection.loadedVMObjects.length > 0 ) {
                                if( $scope.currentValue.propertyDisplayName ) {
                                    //Find and select the new item
                                    var indexOfCurrentSelection = $scope.intentValuesProvider.viewModelCollection.loadedVMObjects
                                        .map( function( x ) {
                                            return x.propertyDisplayName;
                                        } ).indexOf( $scope.currentValue.propertyDisplayName );
                                    if( indexOfCurrentSelection >= 0 ) {
                                        $scope.intentValuesProvider.changeObjectsSelection( indexOfCurrentSelection,
                                            indexOfCurrentSelection, true );
                                    }
                                }
                            } else if( $scope.currentValue.propertyDisplayName === $scope.anydisplayname ) {
                                //Select "Any" from list
                                var indexOfAnySelection = $scope.intentValuesProvider.viewModelCollection.loadedVMObjects
                                    .map( function( x ) {
                                        return x.propertyDisplayName;
                                    } ).indexOf( $scope.currentValue.propertyDisplayName );

                                if( indexOfAnySelection >= 0 ) {
                                    $scope.intentValuesProvider.changeObjectsSelection( indexOfAnySelection,
                                        indexOfAnySelection, true );
                                }
                            }
                        };

                        $scope.changeItemSelection = function( eventData ) {
                            isSelectionChanged = false;
                            if( eventData.selectedObjects.length > 0 &&
                                $scope.currentValue.propertyDisplayName !== eventData.selectedObjects[ 0 ].propertyDisplayName ) {

                                // User clicks on 'Any' and selects a value
                                if( $scope.currentValue.propertyDisplayName === $scope.anydisplayname && eventData.selectedObjects[ 0 ] ) {
                                    $scope.currentValue = eventData.selectedObjects[ 0 ];
                                    isSelectionChanged = true;
                                }
                                // User clicks on some item
                                else if( $scope.currentValue.propertyDisplayName !== $scope.anydisplayname ) {
                                    // user selects 'Any'
                                    if( eventData.selectedObjects[ 0 ].propertyDisplayName === $scope.anydisplayname ) {
                                        var anyValProp = apsEffIntentSvc.createIntentProperty( apsEffIntentSvc.getAnyValueDisplayName(), false );
                                        $scope.currentValue = anyValProp;
                                        isSelectionChanged = true;
                                    } else if( eventData.selectedObjects[ 0 ] &&
                                        $scope.currentValue.propertyDisplayName !== eventData.selectedObjects[ 0 ].propertyDisplayName ) {
                                        $scope.currentValue = eventData.selectedObjects[ 0 ];
                                        isSelectionChanged = true;
                                    }
                                }
                            } else if( $scope.currentValue.propertyDisplayName && !eventData.selectedObjects[ 0 ] ) {
                                eventBus.publish( 'awPopupWidget.close', eventData );
                                eventBus.unsubscribe( selectionChangeEvent );
                            }

                            if( isSelectionChanged ) {
                                var famName = $scope.family.propertyDisplayName;

                                for( var idx = 0; idx < appCtxSvc.ctx.effIntents.families.length; idx++ ) {
                                    if( appCtxSvc.ctx.effIntents.families[ idx ].famProp.propertyDisplayName === famName ) {
                                        appCtxSvc.ctx.effIntents.families[ idx ].currentValue = $scope.currentValue;
                                        break;
                                    }
                                }

                                // update formula
                                apsEffIntentSvc.setEffIntentFormula( appCtxSvc.ctx.effIntents );

                                // Check the active command that initiated the intent sub-view. Currently, there are only two possible
                                // values, Configuration command  or the Aps Effectivity authoring command.
                                if( appCtxSvc.ctx.activeNavigationCommand && appCtxSvc.ctx.activeNavigationCommand.commandId === "Fgf0ConfigurationFilter" ) {
                                    // if the active command is configuration panel, then we would like to set the current selection right away.
                                    // get the intent formula.
                                    // $scope.newIntentFormula = apsEffIntentSvc.getEffIntentFormula();
                                    eventData.newIntentFormula = apsEffIntentSvc.getEffIntentFormula();
                                    eventBus.unsubscribe( selectionChangeEvent );
                                    // Now publish the apply intent event to the view model.
                                    eventBus.publish( 'awConfigPanel.EffectivityIntentChanged', eventData );
                                    eventBus.publish( 'awPopupWidget.close', eventData );

                                } else {
                                    eventBus.unsubscribe( selectionChangeEvent );
                                    eventBus.publish( 'awPopupWidget.close', eventData );

                                }
                            }
                        };

                        $scope.initializePopupContent = function() {
                            if( $scope.intentValuesProvider.viewModelCollection.totalFound <= 0 ) {
                                $scope.intentValuesProvider.initialize( $scope );
                            } else {
                                $scope.selectItem();
                            }
                        };
                    }
                ],

                link: function( scope ) {
                    var unRegisterPopupInitEvent = scope.$on( 'awPopupWidget.init', function() {
                        scope.initializePopupContent();

                        //subscribe event
                        selectionChangeEvent = eventBus.subscribe( scope.intentValuesProvider.name +
                            ".selectionChangeEvent",
                            function( eventData ) {
                                scope.changeItemSelection( eventData );
                            } );

                        popupClose = eventBus.subscribe( 'awPopupWidget.close', function() {
                            if( selectionChangeEvent ) {
                                eventBus.unsubscribe( selectionChangeEvent );
                            }
                            if( popupClose ) {
                                eventBus.unsubscribe( popupClose );
                            }
                        } );
                    } );

                    //And remove it when the scope is destroyed
                    scope.$on( '$destroy', function() {
                        unRegisterPopupInitEvent();
                        if( selectionChangeEvent ) {
                            eventBus.unsubscribe( selectionChangeEvent );
                        }

                        // Nothing required for 'Event - awPopupWidget.init'. It would get tidied up automatically after de-scoping of $scope.
                        // When current scope is destroyed the listeners unbind automatically.
                    } );
                }
            };
        }
    ] );
