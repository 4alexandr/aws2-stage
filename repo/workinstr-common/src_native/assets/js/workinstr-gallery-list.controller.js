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
 * Defines controller for '<workinstr-gallery-list>' directive.
 *
 * @module js/workinstr-gallery-list.controller
 */
import * as app from 'app';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

'use strict';

/**
 * Defines workinstrGalleryList controller
 *
 * @param {Object} $scope - Directive scope
 * @param {Object} $window - window object
 * @param {Object} $timeout - timeout object
 *
 * @member workinstrGalleryListController
 * @memberof NgControllers
 */
app.controller( 'workinstrGalleryListController', [
    '$scope',
    '$window',
    '$timeout',
    function( $scope, $window, $timeout ) {
        var self = this;
        var myData = {};

        self.$postLink = function() {
            $timeout( function() {
                myData.id = $scope.$id;
                myData.rightButton = document.getElementById( 'galleryRightButton' + myData.id );
                myData.thumbnailContainer = document.getElementById( 'thumbnailContainer' + myData.id );

                ngModule.element( $window ).on( 'resize', self.onResize );

                self.splitterUpdateEventDef = eventBus.subscribe( 'aw-splitter-update', function() {
                    self.onResize();
                } );

                self.onResize();

                // Select first item in Gallery by default
                $scope.selectItem( $scope.dataprovider.viewModelCollection.loadedVMObjects[ 0 ] );
            }, 5 );
        };

        self.$destroy = function() {
            ngModule.element( $window ).off( 'resize', self.updateButtonsVisibility );
            eventBus.unsubscribe( self.splitterUpdateEventDef );
        };

        /**
         * Returns the distance between thumbnails panel END and the right button
         *
         * @return {int} the right hidden width.
         */
        self.getThumbnailContainerRightHiddenWidth = function() {
            return myData.thumbnailContainer.scrollWidth - myData.thumbnailContainer.scrollLeft -
                myData.thumbnailContainer.offsetWidth - myData.rightButton.offsetWidth;
        };

        /**
         * Returns the visible width of the thumbnails panel
         *
         * @return {int} the visible width
         */
        self.getVisiblePanelWidth = function() {
            return myData.thumbnailContainer.offsetWidth;
        };

        /**
         * Returns the distance between thumbnails panel START and the left button
         *
         * @return {int} the left hidden width.
         */
        self.getThumbnailContainerLeftHiddenWidth = function() {
            return myData.thumbnailContainer.scrollLeft;
        };

        /**
         * Handler for left button
         */
        $scope.onLeftButtonClick = function() {
            var hiddenLeft = self.getThumbnailContainerLeftHiddenWidth();
            if( hiddenLeft > 0 ) {
                var visibleWidth = self.getVisiblePanelWidth();
                var widthToDisplay = visibleWidth < hiddenLeft ? visibleWidth : hiddenLeft;
                var scrollDistance = hiddenLeft - widthToDisplay;
                self.animateScroll( scrollDistance );
            }
        };

        /**
         * Handler for right button
         */
        $scope.onRightButtonClick = function() {
            var hiddenRight = self.getThumbnailContainerRightHiddenWidth();
            if( hiddenRight > 0 ) {
                var visibleWidth = self.getVisiblePanelWidth();
                var widthToDisplay = hiddenRight < visibleWidth ? hiddenRight : visibleWidth;
                var hiddenLeft = self.getThumbnailContainerLeftHiddenWidth();
                var scrollDistance = hiddenLeft + widthToDisplay;
                self.animateScroll( scrollDistance );
            }
        };

        /**
         * Animate the thumbnails scroll
         *
         * @param {int} scrollDistance the distance to scroll
         */
        self.animateScroll = function( scrollDistance ) {
            $( '#thumbnailContainer' + myData.id ).animate( {
                scrollLeft: scrollDistance
            }, 800 );

            setTimeout( function() {
                self.updateButtonsVisibility();
            }, 800 );
        };

        /**
         * Update the left and right buttons visibility
         */
        self.updateButtonsVisibility = function() {
            if( self.getThumbnailContainerLeftHiddenWidth() > 0 ) {
                $( '#galleryLeftButton' + myData.id ).show();
            } else {
                $( '#galleryLeftButton' + myData.id ).hide();
            }
            if( self.getThumbnailContainerRightHiddenWidth() > 5 ) {
                $( '#galleryRightButton' + myData.id ).show();
            } else {
                $( '#galleryRightButton' + myData.id ).hide();
            }
        };

        /**
         * Update the thumbnails image and label size according to container height
         */
        self.updateThumbnailsSize = function() {
            var containerElement = $( '#thumbnailContainer' + myData.id );
            if( containerElement && containerElement[ 0 ] ) {
                var imageElements = containerElement.find( '.aw-workinstr-thumbnailImage' );
                var labelElements = containerElement.find( '.aw-workinstr-thumbnailLabel' );
                var cellElements = containerElement.find( 'workinstr-gallery-cell' );
                if( containerElement[ 0 ].clientHeight < 55 ) {
                    if( imageElements ) {
                        imageElements.addClass( 'aw-workinstr-thumbnailImageSmall' );
                    }
                    if( labelElements ) {
                        labelElements.addClass( 'aw-workinstr-thumbnailLabelSmall' );
                    }
                    if( cellElements ) {
                        cellElements.addClass( 'workinstr-gallery-cellSmall' );
                    }
                } else {
                    if( imageElements ) {
                        imageElements.removeClass( 'aw-workinstr-thumbnailImageSmall' );
                    }
                    if( labelElements ) {
                        labelElements.removeClass( 'aw-workinstr-thumbnailLabelSmall' );
                    }
                    if( cellElements ) {
                        cellElements.removeClass( 'workinstr-gallery-cellSmall' );
                    }
                }

                if( containerElement[ 0 ].clientHeight < 72 ) {
                    if( imageElements ) {
                        imageElements.addClass( 'aw-workinstr-thumbnailImageSmallAlign' );
                    }
                } else {
                    if( imageElements ) {
                        imageElements.removeClass( 'aw-workinstr-thumbnailImageSmallAlign' );
                    }
                }
            }
        };

        /**
         * Update scroll buttons and thumbnails size on resize
         */
        self.onResize = function() {
            self.updateButtonsVisibility();
            self.updateThumbnailsSize();
        };
    }
] );
