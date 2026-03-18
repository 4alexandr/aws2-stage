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
 * Directive to show native weblink viewer
 *
 * @module js/workinstr-weblink-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';
import 'js/workinstrFileTicketService';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native weblink viewer directive
 *
 * @example <workinstr-weblink-viewer data="weblinkDataset">...</workinstr-weblink-viewer>
 *
 * @member workinstr-weblink-viewer
 * @memberof NgElementDirectives
 *
 * @param {Object} workinstrFileTicketSvc - file ticket service
 *
 * @return {Object} workinstrWeblinkViewer directive
 */
app.directive( 'workinstrWeblinkViewer', [ 'workinstrFileTicketService', function( workinstrFileTicketSvc ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-weblink-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Qualifier for current controller
             */
            $scope.whoAmI = 'workinstrWeblinkViewer';

            /**
             * Initialize _element
             */
            _element = $element;

            // Populate the iframe with HTML content
            var promise = controller.initViewer( _element );
            promise.then( function() {
                var fileUrl = $scope.fileUrl;
                $scope.weblinkUrl = workinstrFileTicketSvc.getUrl( fileUrl );
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
} ] );
