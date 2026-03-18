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
 * Inbox image cell directive to be used within a cell list
 * 
 * @module js/aw-inbox-image-cell.directive
 * @requires app
 * @requires js/aw-image-cell.controller
 * @requires js/aw-inbox-cell-content.directive
 */
import app from 'app';
import 'js/aw-image-cell.controller';
import 'js/aw-inbox-cell-content.directive';
import 'js/aw-visual-indicator.directive';

'use strict';

/**
 * Inbox image cell directive to be used within a cell list. Uses aw-inbox-cell-content instead of
 * aw-default-cell-content.
 * 
 * @example <aw-inbox-image-cell vmo="model"></aw-inbox-image-cell>
 * 
 * @member aw-inbox-image-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awInboxImageCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-inbox-image-cell.directive.html',
        controller: 'ImageCellCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'vmo', $controller.updateIcon );
        }
    };
} ] );
