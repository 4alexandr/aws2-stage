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
 * Defines the {@link NgElementDirectives.aw-3d-viewer-extended}
 *
 * @module js/aw-3d-viewer-extended.directive
 * @requires app
 * @requires js/aw-3d-viewer.directive
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import 'js/aw-3d-viewer.directive';
import 'js/aw-universal-viewer.controller';
import 'js/aw-toolbar.directive';

'use strict';

/**
 * Directive to display the JT viewer.
 *
 *
 * @example <aw-3d-viewer-extended></aw-3d-viewer-extended>
 *
 * @member aw-3d-viewer-extended
 * @memberof NgElementDirectives
 */
app.directive( 'aw3dViewerExtended', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-3d-viewer-extended.directive.html',
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Image capture event added.
             */
            var _updateViewWithCaptureImageListener = null;

            /**
             * Deactivate image capture display event added.
             */
            var _deactivateImageCaptureDisplayListener = null;

            controller.initViewer( $element, true );

            $scope.initViewer = function( element, skipFmsTktLoad ) {
                _registerForImageCaptureEvents();
                return controller.initViewer( element, skipFmsTktLoad );
            };

            /**
             * Resize viewer function
             *
             * @function resizeViewer
             * @memberOf NgElementDirectives.aw-3d-viewer.directive
             */
            $scope.resizeViewer = function() {
                var viewerComputedDimension = $scope.getComputedViewerDimensions();
                $scope.threeDViewerWidth = viewerComputedDimension.viewerComputedWidth + 'px';
                $scope.threeDViewerHeight = viewerComputedDimension.viewerComputedHeight + 'px';
                $scope.loadProgressIndicatorWidth = viewerComputedDimension.viewerComputedWidth * 0.04 + 'px';
                $scope.emmProgressIndicatorWidth = viewerComputedDimension.viewerComputedWidth * 0.08 + 'px';

                $scope.$broadcast( 'setViewerDimensions', {
                    newViewerWidth: viewerComputedDimension.viewerComputedWidth,
                    newViewerHeight: viewerComputedDimension.viewerComputedHeight
                } );
            };

            /**
             * Deactivates the display if image capture in viewer upon deactivate image capture event.
             *
             * @returns {String} viewerComputedWidth Computed viewer width
             */
            $scope.getComputedViewerDimensions = function() {
                var viewerComputedWidth = null;
                var viewerComputedHeight = null;
                var parentNodeElement = $element[ 0 ].parentNode;
                while( parentNodeElement && !_.includes( parentNodeElement.className, 'aw-layout-summaryContent' ) ) {
                    parentNodeElement = parentNodeElement.parentNode;
                }
                if( parentNodeElement ) {
                    viewerComputedWidth = parentNodeElement.offsetWidth;
                    var chevronButton = $( parentNodeElement ).find( 'button#Awp0LeftChevron' );
                    if( chevronButton && chevronButton.length > 0 &&
                        chevronButton[ 0 ].offsetWidth ) {
                        var widthToBeAdjusted = 2 * chevronButton[ 0 ].offsetWidth > 60 ? 2 * chevronButton[ 0 ].offsetWidth : 60;
                        viewerComputedWidth -= widthToBeAdjusted;
                    }

                    viewerComputedHeight = window.innerHeight - $element.offset().top - 110;
                }
                return {
                    viewerComputedWidth: viewerComputedWidth,
                    viewerComputedHeight: viewerComputedHeight
                };
            };

            /**
             * Register for image capture events
             */
            function _registerForImageCaptureEvents() {
                if( _updateViewWithCaptureImageListener === null ) {
                    _updateViewWithCaptureImageListener = eventBus.subscribe(
                        'imageCapture.updateViewWithCaptureImage',
                        function( eventData ) {
                            $scope.displayImageCapture = true;
                        }, 'aw3dViewerExtended' );
                }

                if( _deactivateImageCaptureDisplayListener === null ) {
                    _deactivateImageCaptureDisplayListener = eventBus.subscribe(
                        'imageCapture.deactivateImageCaptureDisplay',
                        function() {
                            $scope.displayImageCapture = false;
                        }, 'aw3dViewerExtended' );
                }
            }

            /**
             * To clean up subscribed events.
             */
            function cleanUp() {
                if( _deactivateImageCaptureDisplayListener ) {
                    eventBus.unsubscribe( _deactivateImageCaptureDisplayListener );
                    _deactivateImageCaptureDisplayListener = null;
                }

                if( _updateViewWithCaptureImageListener ) {
                    eventBus.unsubscribe( _updateViewWithCaptureImageListener );
                    _updateViewWithCaptureImageListener = null;
                }
            }

            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             */
            $scope.$on( '$destroy', function() {
                cleanUp();
            } );

            /**
             * Set callback on window resize
             */
            controller.setResizeCallback( $scope.resizeViewer );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
