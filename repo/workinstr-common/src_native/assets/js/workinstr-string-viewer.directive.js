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
 * Directive to show native string viewer
 *
 * @module js/workinstr-string-viewer.directive
 */
import * as app from 'app';

'use strict';

/**
 * Native string viewer directive
 *
 * @example <workinstr-string-viewer data="stringDataset">...</workinstr-string-viewer>
 *
 * @member workinstr-string-viewer
 * @memberof NgElementDirectives
 *
 * @param {Object} $sce - $sce
 *
 * @return {Object} workinstrStringViewer directive
 */
app.directive( 'workinstrStringViewer', [ '$sce', function( $sce ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-string-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope ) {
            // Set the string content
            var strContent = $scope.data.value;
            $scope.stringContent = $sce.trustAsHtml( strContent );
        }
    };
} ] );
