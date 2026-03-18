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
 * @module js/aw-perform-panel-include.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/awLayoutService';

"use strict";

/**
 * Defines an include element.
 * <P>
 * Define an element that is used to include other layout files. The "when" attribute is optional and may be used to
 * select layouts based on predefined condition names. The "sub-panel-context" attribute is also optional, and
 * should be used, when some information needs to be passed on to the child layout file.
 *
 * @example <aw-perform-panel-include name="main-header"></aw-perform-panel-include>
 * @example <aw-perform-panel-include name="default-layout" when="condition-1:layout-1, conditions-2:layout-2"></aw-perform-panel-include>
 * @example <aw-perform-panel-include name="main-header" sub-panel-context="dataForSubPanel"></aw-perform-panel-include>
 *
 * @memberof NgDirectives
 * @member aw-perform-panel-include
 */
app.directive( 'awPerformPanelInclude', [
    '$compile',
    'awLayoutService',
    function( $compile, awLayoutService ) {
        return {
            restrict: 'E',
            scope: {
                name: '@',
                when: '@?',
                subPanelContext: "=?"
            },
            link: function( $scope, $element ) {

                //Automatically add class to aw-include
                //Should probably be done with aw-include element selector instead
                $element.addClass( 'aw-layout-flexbox' );

                //The scope for the current view model
                var childScope = null;
                //The element for the current view
                var childElement = null;

                //The template that will be compiled with the view model scope
                var childElementHtml = '<div class="aw-layout-include aw-layout-flexColumn"' +
                    'sub-panel-context="subPanelContext" data-ng-include="layoutViewName"></div>';

                /**
                 * When the "name" changes do a full rebuild of the embedded view.
                 *
                 * This means destroy the child scope and any view models associated with it and then create a new
                 * scope and attach the new view model to it.
                 *
                 * This works similar to ng-if. See the source of that directive for more information.
                 */
                $scope.$watch( 'name', function() {
                    //Clear out current contents and destroy child scope
                    $element.empty();
                    if( childScope ) {
                        childScope.$destroy();
                        awLayoutService.removeLayoutElement( childElement );
                    }
                    //Compile the new contents with a new child scope
                    childScope = $scope.$new();
                    childElement = $compile( childElementHtml )( childScope );
                    $element.append( childElement );

                    //And initialize "when" conditions and load view / view model
                    awLayoutService.addLayoutElement( childScope, childElement, $scope.name, $scope.when );
                } );

                /**
                 * Fire the ng-include "$includeContentLoaded" angular event into the event bus
                 */
                $scope.$on( '$includeContentLoaded', function( $event ) {
                    eventBus.publish( childScope.currentLayoutName + '.contentLoaded', {
                        scope: childScope
                    } );
                    $event.stopPropagation();
                } );

                $scope.$on( "$destroy", function() {
                    //Clear child element contents and remove aw-include listeners
                    awLayoutService.removeLayoutElement( childElement );
                    eventBus.publish( childScope.currentLayoutName + '.contentUnloaded' );
                } );
            }
        };
    }
] );
