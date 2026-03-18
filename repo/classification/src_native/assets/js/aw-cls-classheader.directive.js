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
 * @module js/aw-cls-classheader.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-transclude.directive';
import 'js/aw-property-image.directive';


/**
 * Directive to display the 'Class' header with expand/collapse functionality for the hierarchy widget
 *
 * @example <aw-cls-classheader></aw-cls-classheader>
 *
 * @member aw-cls-classheader
 * @memberof NgElementDirectives
 */
app.directive( 'awClsClassheader', [ 'viewModelService', 'localeService', function( viewModelSvc, localeSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            expansionstate: '=',
            action: '=',
            caption: '@'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.resetHierarchy = function() {
                var resource = app.getBaseUrlPath() + '/i18n/ClassificationPanelMessages';
                localeSvc.getTextPromise( resource ).then( function( localTextBundle ) {
                    $scope.assignedClasses = localTextBundle.assignedClasses;
                    if( $scope.caption === localTextBundle.assignedClasses ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );

                        viewModelSvc.executeCommand( declViewModel, 'resetHierarchy', $scope );
                    }
                } );
            };
            viewModelSvc.getViewModel( $scope, true );

            $scope.toggleExpansion = function() {
                $scope.expansionstate = !$scope.expansionstate;
            };
        } ],
        link: function( $scope ) {
            $scope.$watch( 'data.' + $scope.caption, function( value ) {
                $scope.caption = value;
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-classheader.directive.html'
    };
} ] );
