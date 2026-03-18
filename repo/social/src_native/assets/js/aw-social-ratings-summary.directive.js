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
 * @module js/aw-social-ratings-summary.directive
 */
import app from 'app';
import 'js/aw-repeat.directive';
import 'js/aw-link.directive';
import 'js/aw-social-rating-percent.directive';
import 'js/viewModelService';

'use strict';

/**
 * Directive for custom relation ratings implementation.
 *
 * @example <aw-social-ratings-summary  data="data"></aw-social-ratings-summary>
 *
 * @member aw-social-ratings-summary
 * @memberof NgElementDirectives
 * @returns {Object} object containing directive data
 */
app.directive( 'awSocialRatingsSummary', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        scope: {
            data: '=',
            action: '@'
        },
        controller: [ '$scope', function( $scope ) {

            $scope.filterRatings = function( ratingProp ) {
                $scope.selectedprop = ratingProp;
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-ratings-summary.directive.html'
    };
} ] );
