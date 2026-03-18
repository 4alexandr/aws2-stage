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
 * @module js/aw-xrt-splitter.directive
 */
import * as app from 'app';
import 'js/awXrtSplitterService';

"use strict";

/**
 * Define a splitter between two XRT columns.
 * <P>
 * Defines a standard splitter control to be used in two adjacent XRT columns.
 * 
 * @example <aw-xrt-splitter></aw-xrt-splitter>
 * 
 * @memberof NgDirectives
 * @member aw-xrt-splitter
 */
app.directive( "awXrtSplitter", [ "awXrtSplitterService", "$timeout", function( xrtSplitterSvc, $timeout ) {
    return {
        restrict: "E",
        scope: {
            name: '@?', // unused
            minSize1: '@?', // optional
            minSize2: '@?', // optional
            direction: '@?', // optional
            selector: '@?' // unused - for future cases
        },
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-splitter.directive.html', // reuse aw-splitter marker to have consistent styling
        link: {
            post: function( $scope, elements, attributes ) {
                $timeout( function() {
                    xrtSplitterSvc.initSplitter( elements, attributes );
                } );
            }
        }
    };
} ] );
