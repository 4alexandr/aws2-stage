// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global
 define
 */

/**
 * Directive to support parameter cell implementation.
 *
 * @module js/aw-parameter-cell.directive
 */
import app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-parameter-cell-content.directive';

'use strict';

/**
 * Directive for parameter cell implementation.
 *
 * @example <aw-parameter-cell vmo="model"></aw-parameter-cell>
 * @example <aw-parameter-cell vmo="model" hideoverlay="true"></aw-parameter-cell>
 *
 * @member aw-parameter-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awParameterCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '=',
            hideoverlay: '<?'
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-parameter-cell.directive.html'
    };
} ] );
