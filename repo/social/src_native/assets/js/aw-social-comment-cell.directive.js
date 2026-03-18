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
 * @module js/aw-social-comment-cell.directive
 */
import app from 'app';
import 'js/aw-parse-html.directive';
import 'js/aw-model-icon.directive';
import 'js/aw-social-ratings.directive';
import 'js/aw-social-comment-cell-content.directive';

'use strict';

/**
 * Directive for custom relation ratings implementation.
 * 
 * @example <aw-social-comment-cell vmo="model"></aw-social-comment-cell>
 * 
 * @member aw-custom-commentary-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awSocialCommentCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        //            controller: 'awCustomCommentaryCell',
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-comment-cell.directive.html'
    };
} ] );
