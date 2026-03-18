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
 * Directive to support social comment cell content implementation.
 * 
 * @module js/aw-social-comment-cell-content.directive
 */
import app from 'app';

'use strict';

/**
 * Directive for comment cell content implementation.
 * 
 * @example <aw-social-comment-cell-content vmo="model"></aw-social-comment-cell-content>
 * 
 * @member aw-social-comment-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awSocialCommentCellContent', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        //            controller: 'awSocialCommentCellContent',
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-comment-cell-content.directive.html'
    };
} ] );
