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
 * Defines controller for <aw-section-cell> directive.
 *
 * @module js/aw-section-cell.controller
 */
import * as app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';

'use strict';

/**
 * Defines awSectionCell controller
 *
 * @member awSectionCellController
 * @memberof NgControllers
 */
app
    .controller(
        'awSectionCellController',
        [
            '$scope',
            '$element',
            'localeService',
            function( $scope, $element, localeService ) {
                var self = this;
                self._uiProperty = $scope.vmo;
                self._isFocusoutHandlerAttached = false;
                self._offsetValueUpdated = false;
                self._skipCounter = 0;
                self._selectedTextWidget = '';

                //We need to set draggable to false else we can't select in offset edit box
                $( $element.parent().parent()[ 0 ] ).attr( 'draggable', 'false' );

                /**
                 * Create sections panel offset slider property
                 *
                 * @return {Object}
                 */
                self._createSectionOffsetSliderProperty = function() {
                    var sectionPanelOffsetSliderProp = {};
                    sectionPanelOffsetSliderProp.isArray = true;
                    sectionPanelOffsetSliderProp.dbValue = [];
                    sectionPanelOffsetSliderProp.dbValue[ 0 ] = {};
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption = {};
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.disabled = false;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.min = self._uiProperty.offsetMinValue;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.max = self._uiProperty.offsetMaxValue;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.step = ( self._uiProperty.offsetMaxValue - self._uiProperty.offsetMinValue ) / 100;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.value = self._uiProperty.offsetValue;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.orientation = 'horizontal';
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.range = false;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].showIncrementButtons = true;
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderChangeEventAction = 'sliderValueChanged';
                    sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderSlideEventAction = 'sliderValueMoving';
                    return sectionPanelOffsetSliderProp;
                };

                /**
                 * Create sections panel offset property
                 *
                 * @return {Object}
                 */
                self._createSectionOffsetValueProperty = function() {
                    var sectionPanelOffsetProp = {};
                    sectionPanelOffsetProp.type = 'DOUBLE',
                        sectionPanelOffsetProp.dbValue = self._uiProperty.offsetValue;
                    sectionPanelOffsetProp.isRequired = true;
                    sectionPanelOffsetProp.isEditable = true;
                    sectionPanelOffsetProp.isEnabled = true;
                    sectionPanelOffsetProp.labelPosition = 'PROPERTY_LABEL_AT_SIDE';
                    sectionPanelOffsetProp.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
                    sectionPanelOffsetProp.minValue = self._uiProperty.offsetMinValue;
                    sectionPanelOffsetProp.maxValue = self._uiProperty.offsetMaxValue;
                    sectionPanelOffsetProp.validationCriteria = [];
                    sectionPanelOffsetProp.validationCriteria[ 0 ] = '';
                    return sectionPanelOffsetProp;
                };

                /**
                 * Exit field handler which gets triggered when user clicks outside element
                 *
                 * @param {DOMEvent} event -
                 *
                 * @return {Void}
                 */

                $scope.offsetWidgetClicked = function( event ) {
                    self._selectedTextWidget = event.target;
                    $scope.$parent.$parent.dataprovider.selectionModel.addToSelection( [ $scope.vmo ],
                        $scope.$parent.$parent );
                    eventBus.publish( 'geoanalysis.sectionOffsetEditingStarted', {} );
                    if( !self._isFocusoutHandlerAttached ) {
                        self._isFocusoutHandlerAttached = true;
                        $( event.target ).on( 'focusout', $scope.offsetWidgetBlured );
                    }
                };
                        /**
                 * offset panel clicked
                 *
                 * @return {Void}
                 */
                $scope.offsetPanelLinkClicked = function() {
                    self._setSelected();
                };

                /**
                 * offset slider clicked
                 *
                 * @return {Void}
                 */
                $scope.offsetSliderClicked = function() {
                    self._setSelected();
                };

                /**
                 * Set section selected
                 *
                 * @return {Void}
                 */
                self._setSelected = function() {
                    $scope.$parent.$parent.dataprovider.selectionModel.setSelection( $scope.vmo );
                };

                $scope.sectionVisibilityChanged = function() {
                    var isSectionAlreadySelected = $scope.vmo.selected;
                    self._setSelected();
                    if( isSectionAlreadySelected ) {
                        $scope.vmo.isSectionVisible = !$scope.vmo.isSectionVisible;
                        eventBus.publish( 'geoanalysis.sectionVisibilityUpdated', {
                            sectionId: self._uiProperty.sectionId,
                            isVisible: $scope.vmo.isSectionVisible
                        } );
                    }
                };

                /**
                 * Exit field handler which gets triggered when user clicks outside element
                 *
                 * @return {Void}
                 */
                $scope.offsetWidgetBlured = function( event ) {
                    eventBus.publish( 'geoanalysis.sectionOffsetEditingFinished', {} );
                    if( self._isFocusoutHandlerAttached ) {
                        if( event ) {
                            $( event.target ).off( 'focusout', $scope.offsetWidgetBlured );
                        } else {
                            $( self._selectedTextWidget ).off( 'focusout', $scope.offsetWidgetBlured );
                        }
                        self._isFocusoutHandlerAttached = false;
                    }
                    self._applyOffsetValue();
                };

                /**
                 * Offset value updated
                 *
                 * @return {Void}
                 */
                self._applyOffsetValue = function() {
                    self._performOffsetValidation();
                    if( $scope.sectionPanelOffsetProp.validationCriteria[ 0 ] === '' ) {
                        self._offsetValueUpdated = true;
                        var newValue = $scope.sectionPanelOffsetProp.dbValue;
                        $scope.sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.value = newValue;
                        $scope.vmo.offsetValue = newValue;
                        $scope.sectionPanelOffsetTextProp = self._uiProperty.offsetLabel + ' = ' + newValue;
                        eventBus.publish( 'geoanalysis.sectionOffsetUpdated', {
                            sectionId: self._uiProperty.sectionId,
                            newValue: newValue
                        } );
                    }
                };

                /**
                 * Offset value validation
                 *
                 * @return {Void}
                 */
                self._performOffsetValidation = function() {
                    if( $scope.sectionPanelOffsetProp.dbValue < $scope.sectionPanelOffsetProp.minValue ||
                        $scope.sectionPanelOffsetProp.dbValue > $scope.sectionPanelOffsetProp.maxValue ) {
                        $scope.sectionPanelOffsetProp.validationCriteria[ 0 ] = self._uiProperty.sectionPlaneErrorMessage
                            .toString();
                    } else {
                        $scope.sectionPanelOffsetProp.validationCriteria[ 0 ] = '';
                    }
                };

                /**
                 * Slider offset value updated
                 *
                 * @return {Void}
                 */
                self._sliderOffsetUpdated = function( newVal, oldVal ) {
                    if( newVal !== oldVal ) {
                        if( !self._offsetValueUpdated ) {
                            var newOffsetValue = $scope.sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.value;
                            $scope.sectionPanelOffsetProp.dbValue = newOffsetValue;
                            $scope.vmo.offsetValue = newOffsetValue;
                            $scope.sectionPanelOffsetTextProp = self._uiProperty.offsetLabel + ' = ' +
                                newOffsetValue;
                        } else {
                            if( self._skipCounter === 1 ) {
                                self._skipCounter = 0;
                                self._offsetValueUpdated = false;
                            } else {
                                self._skipCounter += 1;
                            }
                        }
                    }
                };

                /**
                 * Slider offset value updated
                 *
                 * @return {Void}
                 */
                self._sectionSelected = function() {
                    if( $scope.vmo.selected ) {
                        eventBus.publish( 'geoanalysis.sectionSelected', {
                            sectionId: self._uiProperty.sectionId
                        } );
                    } else {
                        var currentSelectedObjs = $scope.$parent.$parent.dataprovider.getSelectedObjects();
                        if( currentSelectedObjs.length === 0 ) {
                            self._setSelected();
                        }
                    }
                };

                $scope.sectionCellThumbnail = self._uiProperty.planeThumbnailIcon;
                $scope.sectionPanelData =self._uiProperty.sectionPanelData;
                if (self._uiProperty.sectionProps)
                {
                    $scope.sectionPlanes =self._uiProperty.sectionProps;
                }else{
                    $scope.sectionPlanes =self._uiProperty.customSectionProps;
                }
                

                $scope.clipStateData =self._uiProperty.clipStateData;
                $scope.clipStateProps =self._uiProperty.clipStateProps;
                $scope.currentSelectionDisplayName =self._uiProperty.sectionPlaneLabel;
                $scope.sectionPanelOffsetProp = self._createSectionOffsetValueProperty();
                $scope.sectionPanelOffsetSliderProp = self._createSectionOffsetSliderProperty();
                $scope.sectionPanelOffsetLabelProp = self._uiProperty.offsetLabel;
                $scope.sectionPanelOffsetTextProp = self._uiProperty.offsetLabel + ' = ' +
                    self._uiProperty.offsetValue;
                $scope.$watch( 'vmo.selected', self._sectionSelected );
                $scope.$watch( 'sectionPanelOffsetSliderProp.dbValue[0].sliderOption.value',
                    self._sliderOffsetUpdated );
                $scope.$watch( 'sectionPanelOffsetProp.dbValue', self._performOffsetValidation );
                        $scope.cutLineLabel = self._uiProperty.cutLineLabel;
                        $scope.cutLineLabel.getCutLines( self._uiProperty.sectionId ).then( function( data ) {
                            $scope.cutLineLabel.dbValue = data;
                        } );
                        $scope.sectionToggle = self._uiProperty.sectionToggle;

                        $scope.$watch( 'sectionToggle.dbValue', function( newVal, oldVal ) {
                            var currentSelectedObjs = $scope.$parent.$parent.dataprovider.getSelectedObjects();
                            if ( currentSelectedObjs.length > 0 && currentSelectedObjs[0].sectionId === $scope.vmo.sectionId && newVal !== oldVal ) {
                              $scope.vmo.isSectionVisible = !$scope.vmo.isSectionVisible;
                              eventBus.publish( 'geoanalysis.sectionVisibilityUpdated', {
                                sectionId: self._uiProperty.sectionId,
                                isVisible: $scope.vmo.isSectionVisible
                              } );
                            }
                        } );

                        $scope.sectionPlaneTooltip = localeService.getLoadedText( 'GeometricAnalysisMessages' ).sectionPlaneTooltip;
                        $scope.clipStateTooltip = localeService.getLoadedText( 'GeometricAnalysisMessages' ).clipStateTooltip;
                        $scope.offToggleButtonLabel = localeService.getLoadedText( 'GeometricAnalysisMessages' ).offToggleButtonLabel;
                        $scope.onToggleButtonLabel = localeService.getLoadedText( 'GeometricAnalysisMessages' ).onToggleButtonLabel;

                $scope.$on( '$destroy', function() {
                    $scope.vmo = null;
                    $element.remove();
                    $element.empty();
                } );
            }
        ] );

