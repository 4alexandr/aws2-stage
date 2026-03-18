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
 * Directive to support social ratings implementation.
 *
 * @module js/aw-custom-commentary-cell.directive
 */
import app from 'app';
import 'js/aw-parse-html.directive';
import 'js/aw-model-icon.directive';
import 'js/aw-social-ratings.directive';

'use strict';

/**
 * Directive for custom relation ratings implementation.
 *
 * @example <aw-custom-commentary-cell vmo="model"></aw-custom-commentary-cell>
 *
 * @member aw-custom-commentary-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awCustomCommentaryCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-custom-commentary-cell.directive.html'
    };
} ] );
