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
 * @module js/aw-social-ratings.directive
 */
import app from 'app';
import 'js/aw-icon.directive';
import 'js/aw-social-ratings.controller';

'use strict';

/**
 * Directive for custom relation ratings implementation.
 *
 * @example <aw-social-ratings></aw-social-ratings>

 * @memberof NgElementDirectives
 */
app.directive( 'awSocialRatings', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        controller: 'awSocialRatingsController',
        scope: {
            isEditable: '=',
            ratings: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-ratings.directive.html',
        replace: true
    };
} ] );
