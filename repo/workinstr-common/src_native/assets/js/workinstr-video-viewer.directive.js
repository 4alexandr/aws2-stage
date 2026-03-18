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
 * Directive to show native video viewer
 *
 * @module js/workinstr-video-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native video viewer directive
 *
 * @example <workinstr-video-viewer data="mp4Dataset">...</workinstr-video-viewer>
 *
 * @member workinstr-video-viewer
 * @memberof NgElementDirectives
 *
 * @param {Object} $sce - $sce
 *
 * @return {Object} workinstrVideoViewer directive
 */
app.directive( 'workinstrVideoViewer', [ '$sce', //
    function( $sce ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/workinstr-video-viewer.directive.html',
            // Isolate the scope
            scope: {
                data: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'workinstrVideoViewer';

                /**
                 * Initialize _element
                 */
                _element = $element;

                // Populate the embed tag with video content
                var promise = controller.initViewer( _element );
                promise.then( function() {
                    var fileUrl = $scope.fileUrl;
                    $scope.videoUrl = $sce.trustAsResourceUrl( fileUrl );
                } );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 *
                 * @return {Void}
                 */
                $scope.$on( '$destroy', function() {
                    // Cleanup
                    $element = null;
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
