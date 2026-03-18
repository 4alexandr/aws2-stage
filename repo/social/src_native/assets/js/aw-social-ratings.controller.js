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
 * Defines controller
 *
 * @module js/aw-social-ratings.controller
 */
import app from 'app';
import 'js/S2clSocialService';
import 'js/commandPanel.service';
import 'js/appCtxService';

'use strict';

/**
 * Defines awSocialRatings controller
 * @member awSocialRatingsController
 * @memberof NgControllers
 */
app.controller( 'awSocialRatingsController', [ '$scope', 'S2clSocialService', 'commandPanelService', 'appCtxService',
    function( $scope, socialSrv, commandPanelService, appCtxService ) {
        var _commandPanelService = commandPanelService;
        var _appCtxService = appCtxService;

        //$scope.ratings = [ 'cmdFilledStar', 'cmdFilledStar', 'cmdHalfFilledStar', 'cmdEmptyStar', 'cmdEmptyStar' ];

        $scope.initializeRatings = function( inputRating ) {
            _updateRatingStars( inputRating );
        };

        // Add watch to ratings to update it after values are populated
        $scope.$watch( 'ratings', function( newVal, oldVal ) {
            if( newVal !== undefined && newVal !== oldVal ) {
                _updateRatingStars( newVal );
            }
        } );

        /**
         * Update Rating Starts
         *
         * @member awSocialRatingsController
         * @memberof NgControllers
         * @param {Number} inputRating The rating to be updated on star
         */
        function _updateRatingStars( inputRating ) {
            $scope.ratingStars = [];
            var floorRating = Math.floor( inputRating );

            var isHalfFilledPopulated = false;
            for( var x = 1; x < 6; ++x ) {
                if( x <= floorRating ) {
                    $scope.ratingStars.push( 'cmdFilledStar' );
                } else if( inputRating < x && inputRating > floorRating && !isHalfFilledPopulated ) { // If rating is in point,show half fillerd star
                    $scope.ratingStars.push( 'cmdHalfFilledStar' );
                    isHalfFilledPopulated = true;
                } else {
                    $scope.ratingStars.push( 'cmdEmptyStar' );
                }
            }
        }

        $scope.updateRating = function( inputRating ) {
            socialSrv.setRating( inputRating );

            if( _appCtxService.ctx.panelContext && _appCtxService.ctx.panelContext.rating ) {
                // Update stars on Ratings panel
                _updateRatingStars( inputRating );
            }
            // Allow user to Rate only if user rating is 0
            if( $scope.ratings === 0 || $scope.ratings === undefined ||  $scope.ratings instanceof Number && $scope.ratings.valueOf() === 0  ) {
                // Update stars as per input ratings
                _updateRatingStars( inputRating );
                var panelContext = { rating: inputRating };
                _commandPanelService.activateCommandPanel( 'S2clSCAddRatingNew', 'aw_toolsAndInfo', panelContext );
            }
        };
    }
] );
