// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to display a custom date lov in Suspect panel.
 * 
 * @module js/aw-requirements-custom-date-lov.directive
 */
import app from 'app';
import 'js/aw-panel-body.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-listbox.directive';
import 'js/exist-when.directive';
import 'js/aw-property-error.directive';
import 'js/aw-date.directive';

'use strict';

/**
 * Directive to display a custom date lov in Suspect panel.
 * 
 * @example <aw-requirements-custom-date-lov data="data.xxx"></aw-date-range-effectivity> *
 * 
 * @member aw-requirements-custom-date-lov
 * @memberof awRequirementsCustomDateLov
 */
app.directive( 'awRequirementsCustomDateLov', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-custom-date-lov.directive.html'
    };
} ] );
