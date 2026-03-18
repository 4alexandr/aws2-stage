// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support group member panel list cell implementation.
 *
 * @module js/aw-userpanel-cell.directive
 */
import * as app from 'app';
import 'js/aw-userpanel-icon.directive';
import 'js/aw-userpanel-cell-content.directive';

'use strict';

/**
 * Directive for group member panel list cell implementation.
 *
 * @example <aw-userpanel-cell vmo="model"></aw-userpanel-cell>
 *
 * @member aw-userpanel-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awUserpanelCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '<'
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-userpanel-cell.directive.html'
    };
} ] );
