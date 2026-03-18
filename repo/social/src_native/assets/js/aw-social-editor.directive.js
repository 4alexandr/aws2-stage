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
 * Directive to support social editor implementation.
 *
 * @module js/aw-social-editor.directive
 */
import app from 'app';
import 'js/aw-social-editor.controller';

'use strict';

/**
 * Directive for custom relation button implementation.
 *
 * @example <aw-social-ratings ratings='ratings' data='data'></aw-social-ratings>

 * @memberof NgElementDirectives
 */
app.directive( 'awSocialEditor', [ function() {
    return {
        restrict: 'E',
        transclude: false,
        controller: 'awSocialEditorController',
        scope: false,
        template: '<div class="aw-social-editor gwt-TextArea"> <textarea id="ckeditor" name="ckeditor"></textarea> </div>',
        replace: true
    };
} ] );
