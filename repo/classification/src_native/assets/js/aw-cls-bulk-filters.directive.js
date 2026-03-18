// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-bulk-filters.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-cls-individual-bulk-filter.directive';
import 'js/aw-transclude.directive';


/**
 *
 *
 * @example <aw-cls-bulk-filters >
 *          </aw-cls-bulk-filters>
 *
 * @member aw-cls-bulk-filters
 * @memberof NgElementDirectives
 */
app.directive( 'awClsBulkFilters', [ 'viewModelService',
    function( viewModelSvc ) {
        return {

            transclude: true,
            restrict: 'E',
            scope: {
                bulkFiltersMap: '=',
                removeAction: '@',
                removeAllAction: '@'
            },
            controller: [ '$scope', function( $scope ) {} ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-bulk-filters.directive.html'
        };
    }
] );
