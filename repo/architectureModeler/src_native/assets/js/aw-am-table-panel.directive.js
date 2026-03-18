// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-am-table-panel.directive
 */
import * as app from 'app';

'use strict';

/**
 * Directive for defining panel on table.
 *
 * Currently framework do not support selection in multiple views in secondary work area. This directive panel stops
 * the event propagation on selection change will be handled at application level. The use is specific to scenarios
 * where application have multiple views in SWA.
 *
 * @example <aw-am-table-panel></aw-am-table-panel>
 *
 */
app.directive( 'awAmTablePanel', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        link: function( scope ) {

            //stop the selectionChange event propodation to handle selection on application
            scope.$on( 'dataProvider.selectionChangeEvent', function( event ) {
                event.stopPropagation();
            } );

            // Stop the visibilityStateChanged event propagation as we dont want it for split panel tree/table
            scope.$on( 'visibilityStateChanged', function( event /*, api */ ) {
                event.stopPropagation();
            } );

            // Stop the awTable.imageButtonClick event propagation as we dont want it for split panel tree/table
            scope.$on( 'awTable.imageButtonClick', function( event /*, vmo */ ) {
                event.stopPropagation();
            } );

        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-am-table-panel.directive.html'
    };
} ] );
