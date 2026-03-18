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
 * Directive to support social ratings implementation.
 *
 * @module js/aw-social-ratings-overview.directive
 */
import app from 'app';
import 'js/aw-label.directive';
import 'js/aw-social-ratings.directive';
import 'js/appCtxService';
import 'js/aw-i18n.directive';

'use strict';

/**
 * Directive for custom relation ratings implementation.
 *
 * @example <aw-social-ratings-overview data="data"></aw-social-ratings-overview>
 *
 * @member aw-social-ratings-overview
 * @memberof NgElementDirectives
 * @returns {Object} object containing directive data
 */
app.directive( 'awSocialRatingsOverview', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        controller: [ '$scope', 'appCtxService', function( $scope, appCtxService ) {
            $scope.ctx = appCtxService.ctx;
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-ratings-overview.directive.html'
    };
} ] );
