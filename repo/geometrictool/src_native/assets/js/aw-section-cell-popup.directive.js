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
 * @module js/aw-section-cell-popup.directive
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw-section-cell-popup.controller';
import 'js/aw-icon.directive';

'use strict';

/**
 * Directive to display a viewer section cell popup
 *
 * @example <aw-section-cell-popup prop="data.xxx" ></aw-section-cell-popup>
 *
 * @member aw-section-cell-popup
 * @memberof NgElementDirectives
 */
app.directive( 'awSectionCellPopup', [ '$animate', function( animate ) {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        controller: 'awSectionCellPopupController',
        link: function( scope, element ) {
            scope.$applyAsync( function() {
                var container = ngModule.element( element[ 0 ].querySelector( '.aw-layout-popup' ) );
                animate.addClass( container, 'aw-popup-animate' );
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-section-cell-popup.directive.html'
    };
} ] );
