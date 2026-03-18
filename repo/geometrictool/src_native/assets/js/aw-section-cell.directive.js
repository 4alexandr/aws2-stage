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
 * @module js/aw-section-cell.directive
 */
import * as app from 'app';
import 'js/aw-section-cell.controller';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/aw-section-cell-popup.directive';
import 'js/aw-slider.directive';
import 'js/aw-listbox.directive';
import 'js/aw-checkbox.directive';
import 'js/aw-togglebutton.directive';
import 'js/aw-listbox.directive';
import 'js/aw-enter.directive';


'use strict';

/**
 * Directive to display a viewer section list popup
 *
 * @example <aw-section-cell prop="data.xxx" ></aw-section-cell>
 *
 * @member aw-section-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awSectionCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: 'awSectionCellController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-section-cell.directive.html'
    };
} ] );

