// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Defines controller for '<workinstr-header-props>' directive.
 *
 * @module js/workinstr-header-props.controller
 * @requires app
 */
import * as app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import ngModule from 'angular';
import 'js/uwPropertyService';
import 'js/svgTextUtils';

'use strict';

/**
 * The controller for workinstr-header-props directive
 *
 * @class workinstrHeaderPropsController
 *
 * @param {Object} $scope - Directive scope
 * @param {Object} $window - window object
 * @param {Object} $timeout - timeout object
 * @param {Object} uwPropertySvc - property service
 * @param {Object} svgTextUtils - text utils
 *
 * @memberof NgControllers
 */
app.controller( 'workinstrHeaderPropsController', [
    '$scope',
    '$window',
    '$timeout',
    'uwPropertyService',
    'svgTextUtils',
    function( $scope, $window, $timeout, uwPropertySvc, svgTextUtils ) {
        var self = this;
        var propertiesWidth = [];
        var labelsWidth = [];
        var titles = [];
        var prevScrollValue = 0;
        var headerPropertiesWrapper;
        var headerPropertiesPanel;
        var leftButton;
        var rightButton;

        self.$postLink = function() {
            $timeout( function() {
                headerPropertiesWrapper = $( '.aw-workinstr-headerPropertiesWrapper' );
                headerPropertiesPanel = $( '.aw-workinstr-headerPropertiesPanel' );
                leftButton = $( '#headerPropertiesLeftButton' );
                rightButton = $( '#headerPropertiesRightButton' );

                ngModule.element( $window ).on( 'resize', _updateButtonsVisibility );
                _updateButtonsVisibility();
            }, 5 );
        };

        self.$destroy = function() {
            ngModule.element( $window ).off( 'resize', _updateButtonsVisibility );
        };

        /**
         * Set the header properties
         */
        self.setHeaderProperties = function() {
            var nameValueHeaderProperties = $scope.propdata;
            if( nameValueHeaderProperties && nameValueHeaderProperties.length > 0 ) {
                // Calculate how many properties will be in the row
                var cssClassName = 'aw-workinstr-headerPropertyContainer';
                // The max size of property value in pixels
                var maxSizeInPixels = 200;
                // The separator between properties in pixels
                var separatorInPixels = 7;

                propertiesWidth = [];
                labelsWidth = [];
                var headerPropertiesList = [];
                _.forEach( nameValueHeaderProperties, function( headerProperty ) {
                    var propValue = headerProperty.propertyValue;
                    // Only add the property if the value is not empty
                    if( !_.isEmpty( propValue ) ) {
                        var propDisplayName = headerProperty.propertyName;

                        // Tooltip
                        titles.push( propDisplayName + ': ' + propValue );

                        // Trim the value and the label if more than max size
                        var propertyValue = svgTextUtils.truncateText( propValue, cssClassName, maxSizeInPixels,
                            true );
                        var propertyLabel = svgTextUtils.truncateText( propDisplayName, cssClassName,
                            maxSizeInPixels, true );

                        var valueWidth = svgTextUtils.calculateTextWidth( propertyValue, cssClassName );
                        var labelWidth = svgTextUtils.calculateTextWidth( propertyLabel, cssClassName );
                        labelWidth += 10;
                        propertiesWidth.push( labelWidth + valueWidth + separatorInPixels );
                        labelsWidth.push( labelWidth );

                        var displayValuesArr = [];
                        displayValuesArr.push( propertyValue );
                        var prop = uwPropertySvc.createViewModelProperty( propDisplayName, propertyLabel, 'STRING',
                            propertyValue, displayValuesArr );
                        var newProperty = {
                            property: prop
                        };
                        headerPropertiesList.push( newProperty );
                    }
                } );

                var totalNumOfProps = headerPropertiesList.length;
                var numOfPropsInRow = Math.floor( totalNumOfProps / 2 );
                var compareLast = 0;
                if( totalNumOfProps % 2 > 0 ) {
                    numOfPropsInRow++;
                    // Odd number of properties - no need to compare the last property
                    compareLast++;
                }

                // Set the property width - we know which properties are placed one on top of the other
                for( var j = 0; j < numOfPropsInRow - compareLast; j++ ) {
                    if( propertiesWidth[ j ] < propertiesWidth[ j + numOfPropsInRow ] ) {
                        propertiesWidth[ j ] = propertiesWidth[ j + numOfPropsInRow ];
                    } else {
                        propertiesWidth[ j + numOfPropsInRow ] = propertiesWidth[ j ];
                    }
                }

                // Calculate header width - summarize the width of all the props in the row
                var margin = 21; // The total margin added in the css
                var headerWidth = 5;
                for( var i = 0; i < numOfPropsInRow; i++ ) {
                    headerWidth += propertiesWidth[ i ] + margin;
                }
                // Adding the pixels of the border
                headerWidth += numOfPropsInRow - 1;
                headerPropertiesPanel.css( 'width', headerWidth + 'px' );

                $scope.headerProperties = headerPropertiesList;
            }
        };

        // Add watch to headerProperties to set their width for the properties to be aligned in the two rows
        $scope.$watch( 'headerProperties', function() {
            if( $scope.headerProperties && $scope.headerProperties.length > 0 ) {
                $timeout( function() {
                    var propertyElements = $( '.aw-workinstr-headerPropertiesPanel aw-widget .aw-widgets-propertyContainer' );
                    var propertyElementsLabels = $( '.aw-workinstr-headerPropertiesPanel aw-widget .aw-widgets-propertyContainer .propertyLabelTopContainer .aw-widgets-propertyLabelTop' );
                    var propsLength = propertyElements.length;
                    for( var j = 0; j < propsLength; j++ ) {
                        propertyElements[ j ].style.width = propertiesWidth[ j ] + 'px';
                        propertyElementsLabels[ j ].style.width = labelsWidth[ j ] + 'px';
                        propertyElements[ j ].title = titles[ j ];
                    }

                    _updateButtonsVisibility();
                }, 5 );
            }
        } );

        /**
         * Init header properties left to 0
         */
        function _initLeft() {
            headerPropertiesPanel.css( 'left', '0px' );
            prevScrollValue = 0;
        }

        /**
         * Scroll to a certain place
         *
         * @param {int} distance the distance to scroll
         */
        function _scrollTo( distance ) {
            var newScrollValue = prevScrollValue + distance;
            headerPropertiesPanel.css( 'left', newScrollValue + 'px' );
            prevScrollValue = newScrollValue;
        }

        /**
         * Determines if the right and left scroll buttons will be visible or not
         */
        function _updateButtonsVisibility() {
            var maxScroll = headerPropertiesWrapper.width() - headerPropertiesPanel.width();

            // The header fits in the wrapper - no need to scroll
            if( maxScroll >= 0 ) {
                _initLeft();
                leftButton.hide();
                rightButton.hide();
            } else {
                // Left button visibility
                // In general, always scroll to negative values - this use case can happen when moving from small window to a larger one
                if( prevScrollValue >= 0 ) {
                    // Set the panel to most left position
                    _initLeft();
                    leftButton.hide();
                } else {
                    leftButton.show();
                }

                // Right button visibility
                // Check that wasn't scrolled to much - more to scroll
                if( prevScrollValue > maxScroll ) {
                    rightButton.show();
                } else { // No more to scroll
                    rightButton.hide();
                    // Set the panel to the right most position
                    _scrollTo( maxScroll - prevScrollValue );
                }
            }
        }

        /**
         * Handler for left button
         */
        $scope.onLeftButtonClick = function() {
            _scrollTo( headerPropertiesWrapper.width() / 2 );
            _updateButtonsVisibility();
        };

        /**
         * Handler for right button
         */
        $scope.onRightButtonClick = function() {
            _scrollTo( -1 * headerPropertiesWrapper.width() / 2 );
            _updateButtonsVisibility();
        };
    }
] );
