// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*
global
 define
 */

/**
 * @module js/aw-cls-hierarchy-filter-searchbox.directive
 */
import app from 'app';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/localeService';
import 'js/filterPanelService';


/**
 * Directive to display classification classes
 *
 *
 * @member aw-cls-hierarchy-filter-searchbox
 * @memberof NgElementDirectives
 */
app.directive( 'awClsHierarchyFilterSearchbox', [
    'viewModelService',
    'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                results: '=',
                optionalPlaceHolder: '@'
            },
            controller: [
                '$scope',
                '$timeout',
                function( $scope, $timeout ) {
                    var timeout = null;
                    viewModelSvc.getViewModel( $scope, true );

                    var resource = app.getBaseUrlPath() + '/i18n/ClassificationPanelMessages';
                    localeSvc.getTextPromise( resource ).then( function( localTextBundle ) {
                        $scope.filterValueText = localTextBundle.filter;
                        $scope.filterLabelText = localTextBundle.FilterInClassList;
                    } );

                    $scope.evalKeyup = function( $event ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        if( !_.isNull( timeout ) ) {
                            $timeout.cancel( timeout );
                        }
                        timeout = $timeout( function() {
                            if( $scope.data.searchBox.dbValue &&
                                $scope.data.searchBox.dbValue.length >= 1 &&
                                $scope.data.searchBox.dbValue.length < $scope.data.searchStringMinLength ) {
                                eventBus.publish( $scope.data.tableSummaryDataProviderName + '.invalidSearchString', {} );
                            } else {
                                $scope.data.isTreeExpanding = false;
                                eventBus.publish( $scope.data.tableSummaryDataProviderName + '.dataProvider.reset' );
                                eventBus.publish( $scope.data.tableSummaryDataProviderName + '.clearClassBreadCrumb' );
                            }
                        }, 1500 );
                    };
                }
            ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-hierarchy-filter-searchbox.directive.html'
        };
    }
] );
