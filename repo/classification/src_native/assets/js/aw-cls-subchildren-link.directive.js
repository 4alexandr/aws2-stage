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
 * Directive to display a link next
 *
 * @module js/aw-cls-subchildren-link.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-transclude.directive';


/**
 * Directive to display a link element
 *
 * <pre>
 * {String} ng-click - The action to be performed when the link is clicked
 * {Object} prop - The property to display in the link
 * </pre>
 *
 * @example <aw-cls-subchildren-link a prop="linkProp" ng-click="singleClick"></aw-cls-subchildren-link>
 *
 * @member aw-navigation-widget
 * @memberof NgElementDirectives
 */
app
    .directive(
        'awClsSubchildrenLink', //
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
                        /*
                         * This is used for the automation as automation need the unique id for the locator . If
                         * parent is passing the ID and it will get assigned to the link . This is for the
                         * internal purpose.
                         */

                        if( $scope.$parent && $scope.$parent.id ) {
                            $scope.id = $scope.$parent.id;
                        }
                        $scope.doit = function( action, selectedProp ) {
                            $scope.selectedprop = selectedProp;
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, action, $scope );
                        };
                    } ],
                    template: '<div class="aw-cls-nextLvlChildren"><a ng-click="doit(action, prop)" id="{{id}}">{{prop.propertyDisplayName}}</a></div>'
                };
            }
        ] );
