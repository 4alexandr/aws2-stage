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
 * @module js/aw-section-list-popup.directive
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw-section-list-popup.controller';
import 'js/aw-icon.directive';

'use strict';

/**
 * Directive to display a viewer section list popup
 *
 * @example <aw-section-list-popup prop="data.xxx" ></aw-section-list-popup>
 *
 * @member aw-section-list-popup
 * @memberof NgElementDirectives
 */
app.directive( 'awSectionListPopup', [ '$animate', function( animate ) {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        controller: 'awSectionListPopupController',
        link: function( scope, element ) {
            scope.$applyAsync( function() {
                var container = ngModule.element( element[ 0 ].querySelector( '.aw-layout-popup' ) );
                animate.addClass( container, 'aw-popup-animate' );
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-section-list-popup.directive.html'
    };
} ] );
