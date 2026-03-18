//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive for report format widgets
 *
 * @module js/aw-report-format.directive
 */
import app from 'app';
import 'js/aw-checkbox.directive';
import 'js/aw-listbox.directive';
import 'js/aw-widget.directive';
import 'js/aw-column.directive';

'use strict';

/**
 * Directive for report format collection implementation.
 *
 * @example <aw-report-format data="data" sourcetc="IsReportSourceTc?" officetemplate="IsReportIsOfficeTemplate?"
 *          runinbackgroundsupported="RunInBackGroundSupported"></aw-report-format>
 *
 * @member aw-report-format
 * @memberof NgElementDirectives
 */
app.directive( 'awReportFormat', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '=',
            sourcetc: '=',
            officetemplate: '=',
            runinbackgroundsupported: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-report-format.directive.html'
    };
} ] );
