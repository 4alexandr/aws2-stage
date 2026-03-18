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
 * Directive to show native fullText viewer
 *
 * @module js/workinstr-fulltext-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native fullText viewer directive
 *
 * @example <workinstr-fulltext-viewer data="fullTextDataset">...</workinstr-fulltext-viewer>
 *
 * @param {Object} $sce - $sce service
 * @param {Object} appCtxService - App ctx service

 *
 * @member workinstr-fulltext-viewer
 * @memberof NgElementDirectives
 *
 * @return {Object} workinstrFulltextViewer directive
 */
app.directive( 'workinstrFulltextViewer', [ '$sce',  'appCtxService', function( $sce, appCtxService ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-fulltext-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Qualifier for current controller
             */
            $scope.whoAmI = 'workinstrFulltextViewer';

            /**
             * Initialize _element
             */
            _element = $element;

            // Populate the iframe with FullText content
            var promise = controller.initViewer( _element, true );
            promise.then( function() {
                const bodyText = appCtxService.ctx.workinstr0FullText.bodyText;
                $scope.fulltextContent = $sce.trustAsHtml( bodyText );
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
