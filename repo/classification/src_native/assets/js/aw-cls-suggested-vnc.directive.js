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
 * @module js/aw-cls-suggested-vnc.directive
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
import 'js/aw-i18n.directive';
import 'js/aw-icon-button.directive';
import 'js/aw-i18n.directive';
import 'js/aw-button.directive';


/**
 * Directive for suggested VNC implementation in full view classification.
 *
 * @example <aw-cls-suggested-vnc.directive></aw-cls-suggested-vnc.directive>
 *
 * @member aw-cls-suggested-vnc.directive aw-cls-suggested-vnc directive for use in the classification location
 * @memberof NgElementDirectives
 */
app.directive( 'awClsSuggestedVnc', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        controller: [ '$scope', function( $scope ) {
            $scope.tileClick = function( node ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                $scope.selectedNode = node;
                viewModelSvc.executeCommand( declViewModel, 'navigateToSuggestedClass', $scope );
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-suggested-vnc.directive.html'
    };
} ] );
