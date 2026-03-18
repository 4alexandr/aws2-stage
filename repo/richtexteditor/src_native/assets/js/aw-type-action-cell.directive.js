// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive is used to show the tracelink tooltip cell.
 *
 * @module js/aw-type-action-cell.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-icon.directive';
import 'js/appCtxService';
import 'js/commandPanel.service';
import 'js/exist-when.directive';

'use strict';

/**
 * Definition for the 'aw-type-action-cell' directive used to show the type actions cell.
 *
 * @example <aw-type-action-cell.directive vmo="vmo" ></aw-type-action-cell.directive>
 *
 * @member aw-type-action-cell.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awTypeActionCell', [ 'appCtxService', 'commandPanelService', function( appCtxService, commandPanelService ) {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-type-action-cell.directive.html',
        transclude: true,
        controller: [ '$scope', function( $scope ) {
            /**
             * This method handles the click event of the element.
             * It will delegate the actions according to the element clicked.
             * @param {Object} row - the action object user want to perform
             */
            $scope.fireEvent = function( row ) {
                var eventData = {
                    selectedRow: row
                };
                eventBus.publish( 'requirements.handleCommandSelection', eventData );
            };
        } ]

    };
} ] );
