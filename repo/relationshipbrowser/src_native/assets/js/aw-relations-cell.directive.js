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
 * Directive to support custom relation cell implementation.
 *
 * @module js/aw-relations-cell.directive
 */
import app from 'app';
import 'js/aw-list.controller';
import 'js/aw-model-icon.directive';
import 'js/aw-default-cell.directive';

'use strict';

/**
 * Directive for custom relation cell implementation.
 *
 * @example <aw-relations-cell vmo="model"></aw-relations-cell>
 *
 * @member aw-default-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awRelationsCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-relations-cell.directive.html'
    };
} ] );
