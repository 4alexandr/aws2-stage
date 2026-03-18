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
 * Directive to display the cell content in an image cell.
 *
 * @module js/aw-inbox-cell-content.directive
 * @requires app
 * @requires js/aw-model-icon.directive
 * @requires js/aw-inbox-cell-content.controller
 */
import app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-inbox-cell-content.controller';
import 'js/aw-clickable-title.directive';

'use strict';

/**
 * Directive for default cell implementation.
 *
 * @example <aw-inbox-cell-content vmo="model"></aw-inbox-cell-content>
 *
 * @member aw-inbox-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awInboxCellContent', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-inbox-cell-content.directive.html',
        controller: 'InboxCellContentCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'vmo', $controller.updateIsUnread );
            $controller.handleObjectsModifiedListener();
        }
    };
} ] );
