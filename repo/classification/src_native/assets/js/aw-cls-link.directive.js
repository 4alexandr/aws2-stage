// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to display a link element
 *
 * @module js/aw-cls-link.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-transclude.directive';


/**
 * Directive to display a link element
 *
 * <pre>
 * {String} action - The action to be performed when the link is clicked
 * {Object} prop - The property to display in the link
 * {Object} selectedprop (optional) - The property to be set when a link is selected. Used when you have
 *            multiple links calling the same action.
 * </pre>
 *
 * @example <aw-link action="clickAction" prop="linkProp" selectedProp="selectedProp"></aw-navigation-widget>
 *
 * @member aw-navigation-widget
 * @memberof NgElementDirectives
 */
app
    .directive(
        'awClsLink', //
        [
            'viewModelService', //
            function( viewModelSvc ) {
                return {
                    restrict: 'E',
                    scope: {
                        action: '@',
                        prop: '=',
                        selectedprop: '=?'
                    },
                    controller: [ '$scope', function( $scope ) {
                        $scope.doit = function( action, selectedProp ) {
                            $scope.selectedprop = selectedProp;
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            $scope.data.selectedSearchResult = selectedProp;
                            viewModelSvc.executeCommand( declViewModel, action, $scope );
                        };
                    } ],
                    template: '<a class="aw-base-normal"' +
                        ' ng-class="' + '{\'aw-cls-selectedLink\': selectedprop.id != undefined && selectedprop.id == prop.id }' + '" ' +
                        ' ng-click="doit(action, prop)" title="{{prop.propertyName}}">{{prop.propertyDisplayName}}</a>'
                };
            }
        ] );
