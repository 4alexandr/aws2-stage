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
 * Directive to support VNC implementation for tree hierarchy
 *
 * @module js/aw-cls-vnc.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
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
 * @example <aw-cls-vnc.directive></aw-cls-vnc.directive>
 *
 * @member aw-cls-vnc.directive aw-cls-vnc directive for use in the classification location
 * @memberof NgElementDirectives
 */
app.directive( 'awClsVnc', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        scope: {
            vncScope: '=vnc'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.maxChildrenToBeShown = 4;

            $scope.childClick = function( childNode, parentNode ) {
                $scope.vncScope.isVNCaction = true;
                $scope.vncScope.isChildVNC = true;
                $scope.vncScope.parents.push( parentNode );
                $scope.vncScope.parents.push( childNode );
                $scope.vncScope.selectedNode = childNode;
                if( $scope.vncScope.panelIsClosed === false ) {
                    eventBus.publish( $scope.vncScope.tableSummaryDataProviderName + '.VNCisSelected' );
                } else {
                    eventBus.publish( $scope.vncScope.tableSummaryDataProviderName + '.VNCisSelectedWhenPanelIsClosed' );
                }
            };

            $scope.parentClick = function( node, isLast, index ) {
                $scope.vncScope.isVNCaction = true;
                $scope.vncScope.parents.push( node );
                $scope.vncScope.selectedNode = node;
                $scope.vncScope.selectedNode.indexOfNode = index;
                if( $scope.vncScope.panelIsClosed === false ) {
                    eventBus.publish( $scope.vncScope.tableSummaryDataProviderName + '.VNCisSelected' );
                } else {
                    eventBus.publish( $scope.vncScope.tableSummaryDataProviderName + '.VNCisSelectedWhenPanelIsClosed' );
                }
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-vnc.directive.html'
    };
} ] );
