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
 * Directive to support default cell implementation.
 *
 * @module js/aw-cls-fullview-container.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/aw-command-panel-section.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-splitter.directive';
import 'js/viewModelService';
import 'js/aw-command-bar.directive';
import 'js/aw-i18n.directive';
import 'js/classifyFullViewService';
import 'js/aw-cls-classheader.directive';
import 'js/aw-navigate-breadcrumb.directive';
import 'js/aw-column.directive';
import 'js/aw-row.directive';
import 'js/aw-include.directive';
import 'js/aw-panel-body.directive';
import 'js/aw-panel-footer.directive';
import 'js/aw-button.directive';


/**
 * Directive for classification cell implementation.
 *
 * @example <aw-cls-fullview-container></aw-cls-fullview-container>
 *
 * @member aw-cls-fullview-container.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewContainer', [ 'viewModelService', 'classifyFullViewService', function( viewModelSvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',

        controller: [ '$scope', function( $scope ) {
            $scope.expansionstate = true;
            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            //Hook for property group tree selection event
            $scope.$on( 'NodeSelectionEvent', function( event, data ) {
                if( data.node === null ) {
                    declViewModel.isFiltered = false;
                    declViewModel.nodeAttr = null;
                } else {
                    declViewModel.isFiltered = true;
                    declViewModel.filteredAttributes = [];
                    declViewModel.filteredAttributes.push( data.node );
                    declViewModel.nodeAttr = declViewModel.filteredAttributes;
                    //When selecting a node, expand it automatically
                    declViewModel.nodeAttr[ 0 ].propExpanded = true;
                    if( declViewModel.propFilter ) {
                        classifyFullViewSvc.filterProperties( declViewModel );
                    }
                }
            } );

            $scope.toggleExpansion = function() {
                $scope.expansionstate = !$scope.expansionstate;
            };

            $scope.getClsImgContainerHeight = function( ) {
                var conditions = declViewModel.getConditionStates();
                var adjust = 0;
                if ( conditions.imgOrBlocks ) {
                    adjust += classifyFullViewSvc.findContHeight( conditions, false );
                }
                $scope.tmpHeight = 'calc(100vh - ' +  adjust  + 'px)';
                return $scope.tmpHeight;
            };

            $scope.getClsPropContainerHeight = function( ) {
                var conditions = declViewModel.getConditionStates();

                $scope.tmpHeight = '';
                var adjust = 0;
                if ( conditions.createOrEdit ) {
                    adjust += classifyFullViewSvc.findContHeight( conditions, false );
                    $scope.tmpHeight = 'calc(100vh - ' +  adjust  + 'px)';
                }
                return $scope.tmpHeight;
            };
        } ],

        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-container.directive.html'
    };
} ] );
