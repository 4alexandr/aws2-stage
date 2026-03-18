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
 * Directive to support VNC implementation for search hierarchy and search results.
 *
 * @module js/aw-cls-fullview-vnc.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-command-panel-section.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-image.directive';
import 'js/aw-link.directive';
import 'js/viewModelService';
import 'js/aw-repeat.directive';
import 'js/aw-cls-subchildren-link.directive';
import 'js/aw-i18n.directive';


/**
 * Directive for VNC implementation in full view classification.
 *
 * @example <aw-cls-fullview-vnc.directive></aw-cls-fullview-vnc.directive>
 *
 * @member aw-cls-fullview-vnc.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewVnc', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        controller: [ '$scope', function( $scope ) {
            $scope.selectedNode = null;
            $scope.showMore = false;
            $scope.doit = function( node ) {
                $scope.selectedprop = node;
                $scope.data.selectedSearchResult = node;
                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                viewModelSvc.executeCommand( declViewModel, 'searchResultSelected', $scope );
            };

            $scope.nodeClick = function( node, isLast, index, isParent ) {
                if( node.callback ) {
                    node.callback.childSelected( node.context );
                    return;
                }
                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                if( $scope.action ) {
                    $scope.selectedNode = node;
                    viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    return;
                }
                if( isParent === true ) {
                    $scope.data.parents.push( node.parent );
                }
                $scope.data.parents.push( node );
                $scope.selectedNode = node;
                viewModelSvc.executeCommand( declViewModel, 'getHierarchyVnc', $scope );
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-vnc.directive.html'
    };
} ] );
