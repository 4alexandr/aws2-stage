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
 * Inbox cell directive to be used within a cell list
 *
 * @module js/aw-inbox-cell.directive
 * @requires app
 * @requires js/aw-model-icon.directive
 * @requires js/aw-inbox-cell-content.directive
 */
import app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-inbox-cell-content.directive';
import 'js/aw-visual-indicator.directive';
import 'js/aw-inbox-cell-content.controller';

'use strict';

/**
 * Inbox cell directive to be used within a cell list. Uses aw-inbox-cell-content instead of
 * aw-default-cell-content.
 *
 * @example <aw-inbox-cell vmo="model"></aw-inbox-cell>
 *
 * @member aw-inbox-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awInboxCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-inbox-cell.directive.html',
        controller: 'InboxCellContentCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'vmo', $controller.updateIsUnread );
            $controller.handleObjectsModifiedListener();
        }
    };
} ] );
