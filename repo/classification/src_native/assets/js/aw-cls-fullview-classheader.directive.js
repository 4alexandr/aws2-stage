// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-cls-fullview-classheader.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-transclude.directive';
import 'js/classifyFullViewService';
import 'js/aw-property-image.directive';


/**
 * Directive to display the 'Class' header with expand/collapse functionality for the hierarchy widget
 *
 * @example <aw-cls-fullview-classheader></aw-cls-classheader>
 *
 * @member aw-cls-fullview-classheader
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewClassheader', [ 'viewModelService', 'classifyFullViewService', function( viewModelSvc, classifySvc ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            expansionstate: '=',
            action: '=',
            clickaction: '@?',
            caption: '@',
            keyword: '@'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.fireClickAction = function() {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, $scope.clickaction, $scope );
            };
            viewModelSvc.getViewModel( $scope, true );

            $scope.toggleExpansion = function() {
                $scope.expansionstate = !$scope.expansionstate;
            };

            $scope.evalKeyup = function( $event ) {
                classifySvc.filterPropGroups( $scope.data );
            };
        } ],
        link: function( $scope ) {
            $scope.$watch( 'data.' + $scope.caption, function( value ) {
                $scope.caption = value;
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-classheader.directive.html'
    };
} ] );
