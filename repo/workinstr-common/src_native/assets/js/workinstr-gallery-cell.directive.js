// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * work instructions gallery cell directive to be used within gallery list
 *
 * @module js/workinstr-gallery-cell.directive
 *
 * @requires app
 * @requires js/workinstr-gallery-cell.controller
 */
import * as app from 'app';
import 'js/workinstr-gallery-cell.controller';

'use strict';

/**
 * work instructions gallery cell directive to be used within gallery list
 *
 * @example <workinstr-gallery-cell vmo="model"></workinstr-gallery-cell>
 *
 * @member workinstr-gallery-cell
 *
 * @return {Object} workinstrGalleryCell directive
 *
 * @memberof NgElementDirectives
 */
app.directive( 'workinstrGalleryCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '<'
        },
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-gallery-cell.directive.html',
        controller: 'workinstrGalleryCellCtrl'
    };
} ] );
