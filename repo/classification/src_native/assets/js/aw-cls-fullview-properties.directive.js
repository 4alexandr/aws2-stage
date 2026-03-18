
// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-cls-fullview-properties.directive
 */
import app from 'app';
import 'js/aw-panel-section.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-command-panel-section.directive';
import 'js/aw-cls-fullview-propsheader.directive';
import 'js/aw-cls-properties.directive';
import 'js/exist-when.directive';
import 'js/classifyFullViewService';


/**
 * Directive to display the class attributes for view, edit, and add operations
 *
 * @example <aw-cls-fullview-properties data="data"></aw-cls-fullview-properties>
 *
 * @member aw-cls-fullview-properties
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewProperties',  [ function( ) {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        controller: [ '$scope', 'appCtxService', 'classifyFullViewService', 'viewModelService', function( $scope, appCtxService, classifyFullViewSvc, viewModelSvc ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            $scope.tmpClass = '';

            $scope.getClsPropContainerHeight = function( ) {
                var conditions = declViewModel.getConditionStates();

                $scope.tmpHeight = '';
                var adjust = 0;
                if ( conditions.createOrEdit ) {
                    //adjust for footer
                    adjust += 30;
                }
                adjust += classifyFullViewSvc.findContHeight( conditions, false );
                $scope.tmpHeight = 'calc(100vh - ' +  adjust  + 'px)';
                return $scope.tmpHeight;
            };
        } ],

        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-properties.directive.html'
    };
} ] );
