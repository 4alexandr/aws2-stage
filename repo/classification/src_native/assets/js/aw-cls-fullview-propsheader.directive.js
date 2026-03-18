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
 * @module js/aw-cls-fullview-propsheader.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-transclude.directive';
import 'js/classifyFullViewService';
import appCtxSvc from 'js/appCtxService';

/**
 * Directive to display the 'Class' header with expand/collapse functionality for the hierarchy widget
 *
 * @example <aw-cls-fullview-propsheader></aw-cls-fullview-propsheader>
 *
 * @member aw-cls-fullview-propsheader
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewPropsheader', [ 'viewModelService', 'classifyFullViewService', function( viewModelSvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            data: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.placeholder = $scope.data.i18n.searchPlaceholder;

            $scope.evalKeyup = function( $event ) {
                $scope.$parent.$parent.data.propFilter = $scope.propFilter;
                var isAdmin = false;
                if( appCtxSvc.ctx && appCtxSvc.ctx.locationContext &&
                    appCtxSvc.ctx.locationContext && 
                    appCtxSvc.ctx.locationContext['ActiveWorkspace:Location'] === 'com.siemens.splm.classificationManagerLocation') 
                {
                    isAdmin = true;
                }
                classifyFullViewSvc.filterProperties( $scope.$parent.$parent.data , isAdmin );
            };
        } ],
        link: function( $scope ) {

        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-propsheader.directive.html'
    };
} ] );
