// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/*global
 define,
 document
 */
/**
 * Directive to display a popup-widget by clicking on the link, and showing up the list of Date effectivity with
 * Calendar in the popup widget.
 *
 * @module js/aw-ace-date-effectivity.directive
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import 'js/aw-link-with-popup.directive';
import 'js/visible-when.directive';
import 'js/aw-list.directive';
import 'js/uwDirectiveDateTimeService';
import 'js/aw-datetime.directive';
import 'js/aw-date.directive';
import 'js/aw-enter.directive';
import 'js/exist-when.directive';
import declUtils from 'js/declUtils';

'use strict';

app
    .directive(
        'awAceDateEffectivity', [
            '$filter',
            'uwDirectiveDateTimeService',
            'uwPropertyService',
             function( $filter, uwDirectiveDateTimeSvc, uwPropertyService ) {
                return {
                    restrict: 'E',
                    scope: {
                        data: '=',
                        dataprovider: '=',
                        conditions: '='
                    },
                    templateUrl: app.getBaseUrlPath( ) + '/html/aw-ace-date-effectivity.directive.html',
                    controller: [
                        '$scope',
                         function( $scope ) {
                            var self = this;

                            uwDirectiveDateTimeSvc.assureDateTimeLocale( );

                            self.unSubscribeEvents = function( ) {
                                self.selectionChangeEvent ? eventBus.unsubscribe( self.selectionChangeEvent ) : '';
                                self.modelObjectsUpdatedEvent ? eventBus.unsubscribe( self.modelObjectsUpdatedEvent ) : '';
                                delete self.selectionChangeEvent;
                                delete self.modelObjectsUpdatedEvent;

                                self.dateChangedWatcher ? self.dateChangedWatcher() : '';
                                $scope.data.isTimeEnabled ? $( 'body' ).unbind( 'click', $scope.changeConfigurationWhenTimeSelected ) : '';
                            };

                            var closePopup = function( ) {
                                setTimeout( function() { eventBus.publish( 'awPopupWidget.close' ); } );
                            };

                            var unSubscribeAndClosePopup = function( ) {
                                $scope.data.isPopupActive = false;
                                self.unSubscribeEvents( );
                                closePopup( );
                            };

                            $scope.selectDateEffInList = function( ) {
                                if ( $scope.dataprovider.viewModelCollection.loadedVMObjects.length > 0 ) {
                                    //Find date eff index and select it
                                    var dateEffIndex = $scope.getDateIndex( );
                                    if ( dateEffIndex >= 0 ) {
                                        $scope.dataprovider.changeObjectsSelection( dateEffIndex, dateEffIndex,
                                            true );
                                    }
                                }
                            };

                            $scope.getDateIndex = function( ) {
                                var dateEffIndex;
                                if ( $scope.data.currentEffectiveDate.dbValue ) {
                                    dateEffIndex = $scope.dataprovider.viewModelCollection.loadedVMObjects.map(
                                         function( x ) {
                                            return x.date;
                                        } ).indexOf( $scope.data.currentEffectiveDate.dbValue );
                                } else {
                                    dateEffIndex = $scope.dataprovider.viewModelCollection.loadedVMObjects.map(
                                         function( x ) {
                                            return x.date;
                                        } ).indexOf( $scope.data.currentEffectiveDate.propertyDisplayName );
                                }
                                return dateEffIndex;
                            };

                            $scope.updateDateEffWhenSelectedFromList =  function( eventData ) {
                                if ( eventData.selectedObjects.length ) {
                                    if ( $scope.data.currentEffectiveDate.dbValue ) {
                                        if ( $scope.data.currentEffectiveDate.dbValue !== eventData.selectedObjects[0].date ) {
                                            eventData.effectivityDate = eventData.selectedObjects[0].date;
                                            $scope.setDateEffectivity( eventData );
                                        }
                                    } else {
                                        if ( $scope.data.currentEffectiveDate.propertyDisplayName !== eventData.selectedObjects[0].date ) {
                                            eventData.effectivityDate = eventData.selectedObjects[0].date;
                                            $scope.setDateEffectivity( eventData );
                                        }
                                    }
                                } else { // Handle Current Date Eff selected
                                    unSubscribeAndClosePopup( );
                                }
                            };

                            $scope.changeConfigurationWhenTimeSelected =  function( event ) {
                                var isTimeFromTimePopupSelected = $( event.target ).parents( 'div.aw-jswidgets-dateTimeDrop' ).length > 0;
                                if ( isTimeFromTimePopupSelected ) {
                                    $scope.changeConfiguration();
                                }
                            };

                            $scope.changeConfiguration =  function(  ) {
                                var isValidDateTimeValue = $scope.dateTimeDetails.dbValue > 0 && !$scope.dateTimeDetails.error;
                                if ( isValidDateTimeValue ) {
                                    var selectedDateTime = Math.floor( new Date( $scope.dateTimeDetails.dbValue ).getTime( ) / 1000 ) * 1000;
                                    var currentDateTime = $scope.data.currentEffectiveDate.dbValue ? new Date( $scope.data.currentEffectiveDate.dbValue ).getTime() : '';
                                    var isSameTimeSelected = currentDateTime && selectedDateTime === currentDateTime;
                                    if ( isSameTimeSelected ) {
                                        return;
                                    }
                                    var eventData = {
                                        effectivityDate: new Date( selectedDateTime )
                                    };
                                    $scope.setDateEffectivity( eventData );
                                }
                            };

                            $scope.setDateEffectivity =  function( eventData ) {
                                if ( eventData.effectivityDate === $scope.data.occurrenceManagementTodayTitle.propertyDisplayName ) {
                                    $scope.data.currentEffectiveDate.propertyDisplayName = $scope.data.occurrenceManagementTodayTitle.propertyDisplayName;
                                    $scope.data.currentEffectiveDate.dbValue = null;
                                    eventData.effectivityDate = new Date( '0001-01-01T00:00:00' ).getTime( );
                                } else {
                                    $scope.data.currentEffectiveDate.dbValue = eventData.effectivityDate;
                                    eventData.effectivityDate = new Date( eventData.effectivityDate ).getTime( );
                                }
                                eventBus.publish( 'awConfigPanel.effectivityDateChanged', eventData );
                                unSubscribeAndClosePopup( );
                            };

                            $scope.initializePopupContent = function( ) {
                                if ( $scope.dataprovider.viewModelCollection.totalFound <= 0 ) {
                                    $scope.dataprovider.initialize( $scope );
                                } else {
                                    $scope.selectDateEffInList( );
                                }
                            };

                            $scope.$on( 'awPopupWidget.close', function( ) {
                                if ( $scope.data.isPopupActive ) {
                                    $scope.data.isPopupActive = false;
                                    self.unSubscribeEvents( );
                                }
                            } );
                        }
                    ],

                    link:  function( scope, $element, attrs, controller ) {
                        scope.$watch( 'data.currentEffectiveDate', function( ) {
                            scope.$evalAsync( function( ) {
                                var effDateValue = scope.data.currentEffectiveDate.dbValue ? $filter( 'date' )(
                                    scope.data.currentEffectiveDate.dbValue, scope.data.dateTimeFormat ) :
                                    scope.data.currentEffectiveDate.propertyDisplayName;
                                scope.effectiveDate = uwPropertyService.createViewModelProperty( effDateValue,
                                    effDateValue );
                            } );
                        }, true );

                        var unRegisterPopupInitEvent = scope.$on( 'awPopupWidget.init', function( ) {
                            scope.data.isPopupActive = true;
                            // set config time as default for dateTime widget when popup opened
                            scope.dateTimeDetails = uwPropertyService.createViewModelProperty( '', '', 'DATE', scope.data.currentEffectiveDate.dbValue );
                            controller.unSubscribeEvents( );
                            controller.selectionChangeEvent = eventBus.subscribe( scope.dataprovider.name +
                                '.selectionChangeEvent', scope.updateDateEffWhenSelectedFromList );
                            controller.modelObjectsUpdatedEvent = eventBus.subscribe( scope.dataprovider.name +
                                '.modelObjectsUpdated', scope.selectDateEffInList );

                            scope.initializePopupContent( );

                            if( scope.data.isTimeEnabled ) {
                                $( 'body' ).click( scope.changeConfigurationWhenTimeSelected );
                            } else{
                                controller.dateChangedWatcher = scope.$watch( 'dateTimeDetails.dbValue', scope.changeConfiguration );
                            }
                        } );

                        //And remove it when the scope is destroyed
                        scope.$on( '$destroy', function( ) {
                            unRegisterPopupInitEvent( );
                        } );
                    }

                };
            }

        ] );
