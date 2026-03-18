// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global
 define
 */

/**
 * @module js/aw-preference-filter-category.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-hierarchical-navigation.directive';
import 'js/aw-transclude.directive';
import 'js/filterPanelService';
import 'js/aw-splm-table.directive';

'use strict';

/**
 * Directive to display search categories
 *
 * @example <aw-filter-category category-action="'selectCategory'" filter-action="filterSearchText"
 *          search-action="'selectFilter'" category="item" aw-repeat="item : data.categories track by $index" >
 *          </aw-filter-category>
 *
 * @member aw-preference-filter-category
 * @memberof NgElementDirectives
 * @param {Object} viewModelSvc viewmodel service
 * @param {Object} filterPanelSvc filter panel service
 * @returns {*} return value
 */
app.directive( 'awPreferenceFilterCategory', [ 'viewModelService', 'filterPanelService',
    function( viewModelSvc, filterPanelSvc ) {
        return {

            transclude: true,
            restrict: 'E',
            scope: {
                categoryAction: '@',
                filterAction: '@',
                searchAction: '@',
                category: '='
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
                $scope.category.expand = true;
                $scope.category.showExpand = true;

                $scope.toggleExpansion = function() {
                    $scope.category.expand = !$scope.category.expand;
                    var context = {
                        source: 'filterPanel',
                        category: $scope.category,
                        expand: $scope.category.expand
                    };
                    eventBus.publish( 'toggleExpansion', context );
                };

                /**
                 * publish event to select category header
                 *@param {*} $event the event
                 */
                $scope.select = function( $event ) {
                    filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );

                    // Call selectCategory action from json file
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    viewModelSvc.executeCommand( declViewModel, $scope.categoryAction, $scope );
                };
            } ],
            link: function( $scope, element ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );

                $scope.$watch( 'data.' + $scope.action, function( value ) {
                    $scope.action = value;
                } );

                element.addClass( 'aw-ui-categoryWrapper' );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-preference-filter-category.directive.html'
        };
    }
] );
