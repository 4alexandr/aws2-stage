// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-location-filter-view.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-cls-bulk-filters.directive';
import 'js/aw-filter-category.directive';
import 'js/aw-cls-bulk-filter-category.directive';
import 'js/aw-filter-in-filters-searchbox.directive';
import 'js/aw-link.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-repeat.directive';
import 'js/exist-when.directive';
import 'js/aw-togglebutton.directive';
import 'js/aw-i18n.directive';
import 'js/aw-transclude.directive';


/**
 *
 *
 * @example <aw-cls-location-filter-view >
 *          </aw-cls-location-filter-view>
 *
 * @member aw-cls-location-filter-view
 * @memberof NgElementDirectives
 */
app.directive( 'awClsLocationFilterView', [ 'appCtxService', 'viewModelService',
    function( appCtxService, viewModelSvc ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-location-filter-view.directive.html',
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
                var ctx = appCtxService.getCtx( 'clsLocation' );
                if ( ctx ) {
                    if ( ctx.savedFilters ) {
                        $scope.data.autoUpdateEnabled.dbValue = ctx.savedFilters.autoUpdateEnabled;
                        $scope.data.bulkFiltersMap = ctx.savedFilters.filters;
                    } else {
                        ctx.savedFilters = {
                            autoUpdateEnabled : true
                        };
                        $scope.data.autoUpdateEnabled.dbValue = ctx.savedFilters.autoUpdateEnabled;
                        appCtxService.updateCtx( 'clsLocation', ctx );
                    }
                }
                /**
                 * On toggle, call apply all on moving from bulk to generic mode
                 * @function toggleBulkFiltering
                 * @returns {Function} A callback function to fire apply all event in case it is the need
                 */
                $scope.toggleBulkFiltering = function() {
                    return function() {
                        ctx.savedFilters.autoUpdateEnabled = $scope.data.autoUpdateEnabled.dbValue;
                        appCtxService.updateCtx( 'clsLocation', ctx );

                        if( $scope.ctx.isBulkFilterMapDirty ) {
                            eventBus.publish( 'propertiesPanel.applyAll' );
                        }
                    };
                };
                if( typeof $scope.data.autoUpdateEnabled.propApi !== 'object' ) {
                    $scope.data.autoUpdateEnabled.propApi = {};
                }

                $scope.data.autoUpdateEnabled.propApi.fireValueChangeEvent = $scope.toggleBulkFiltering();
            } ]
        };
    }
] );
