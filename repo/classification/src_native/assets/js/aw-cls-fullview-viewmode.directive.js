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
 * Directive to support default cell implementation.
 *
 * @module js/aw-cls-fullview-viewmode.directive
 */
import app from 'app';
import 'js/aw-command-panel-section.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/visible-when.directive';
import 'js/aw-button.directive';
import 'js/aw-cls-fullview-classheader.directive';
import 'js/viewModelService';
import 'js/classifyFullViewService';
import 'js/aw-panel-body.directive';
import 'js/aw-column.directive';
import 'js/aw-row.directive';


/**
 * Directive for classification cell implementation.
 *
 * @example <aw-cls-fullview-viewmode.directive></aw-cls-fullview-viewmode.directive>
 *
 * @member aw-cls-fullview-viewmode.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewViewmode', [ 'viewModelService', 'classifyFullViewService', function( viewModelSvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',

        controller: [ '$scope', function( $scope ) {
            $scope.expansionstate = true;
            //Hook for property group tree selection event
            $scope.$on( 'NodeSelectionEvent', function( event, data ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                if( data.node === null ) {
                    declViewModel.isFiltered = false;
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
        } ],

        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-viewmode.directive.html'
    };
} ] );
