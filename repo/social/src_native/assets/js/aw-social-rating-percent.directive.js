// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to display a social ratings percent element
 *
 * @module js/aw-social-rating-percent.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/command.service';
import 'js/aw-transclude.directive';

'use strict';

/**
 * Directive to display a social ratings percent element
 *
 * <pre>
 * {String} action - The action to be performed when the social ratings percent is clicked
 * {Object} value - The property specifying numbers for this rating
 * {Object} maxValue The property specifying total number of available ratings.
 * </pre>
 *
 * @example <aw-social-rating-percent value="ratingValue" total = "totalRatings" action="clickAction"></aw-social-ratings-percent>
 *
 * @member aw-social-ratings-percent
 * @memberof NgElementDirectives
 */
app.directive( 'awSocialRatingPercent', //
    [ 'viewModelService', //
        function( viewModelSvc ) {
            return {
                restrict: 'E',
                scope: {
                    action: '@',
                    value: '=',
                    total: '='
                },
                controller: [ '$scope', '$element', function( $scope, $element ) {
                    /*
                     * This is used for the automation as automation need the unique id for the locator . If
                     * parent is passing the ID and it will get assigned to the social ratings percent . This is for the
                     * internal purpose.
                     */
                    if( $scope.$parent && $scope.$parent.id ) {
                        $scope.id = $scope.$parent.id;
                    }

                    // In IE, value is not set correctly, hence explicitly set value finding progress from element
                    var progress = $element.find( 'progress' );
                    if( progress[ 0 ] && progress[ 0 ].value !== $scope.value.dbValue ) {
                        progress[ 0 ].max = $scope.total.dbValue;
                        progress[ 0 ].value = $scope.value.dbValue;
                    }

                    $scope.fetchRatings = function( action, value ) {
                        if( action ) {
                            $scope.selectedprop = value;
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );

                            // Adding Active social ratings percent dimension positions
                            var elementPosition = $element[ 0 ].getBoundingClientRect();
                            declViewModel.activeRatingPercentDimension = {
                                offsetHeight: elementPosition.height,
                                offsetLeft: elementPosition.left,
                                offsetTop: elementPosition.top,
                                offsetWidth: elementPosition.width
                            };
                            viewModelSvc.executeCommand( declViewModel, action, $scope );
                        }
                    };
                } ],
                template: '<progress class="aw-social-summaryStarPanel aw-social-progressBar aw-social-link" ng-click="fetchRatings(action, value)" id="{{id}}" value="{{value.dbValue}}" max = "{{total.dbValue}}" title = "{{(value.dbValue/total.dbValue)*100 | number:0}}%"> </progress>'
            };
        }
    ] );
