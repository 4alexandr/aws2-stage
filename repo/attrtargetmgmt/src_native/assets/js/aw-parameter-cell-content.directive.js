// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global
 define
 */

/**
 * Directive to support parameter cell content implementation.
 *
 * @module js/aw-parameter-cell-content.directive
 */
import app from 'app';
import 'js/aw-visual-indicator.directive';
import 'js/aw-highlight-property-html.directive';

'use strict';

/**
 * Directive for parameter cell content implementation.
 *
 * @example <aw-parameter-cell-content vmo="model"></aw-parameter-cell-content>
 *
 * @member aw-parameter-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awParameterCellContent', [
    function() {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-parameter-cell-content.directive.html'
        };
    }
] );
