// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support group member panel list cell content implementation.
 *
 * @module js/aw-userpanel-cell-content.directive
 */
import * as app from 'app';
import 'js/aw-i18n.directive';
import 'soa/kernel/clientDataModel';
import 'js/aw-userpanel-cell.controller';

'use strict';

/**
 * Directive for group member panel list cell content implementation.
 *
 * @example <aw-userpanel-cell-content vmo="vmo"> </aw-userpanel-cell-content>
 *
 * @member aw-userpanel-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awUserpanelCellContent', [ 'soa_kernel_clientDataModel', function( cdm ) {
    return {
        restrict: 'E',
        scope: {
            vmo: '<'
        },
        controller: 'UserPanelCellCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'vmo', $controller.renderCellProperties );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-userpanel-cell-content.directive.html'
    };
} ] );
