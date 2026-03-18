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
 * Directive for architecture page.
 *
 * @module js/aw-architecture-page.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'jquery';
import 'js/aw-transclude.directive';

'use strict';

/**
 * Directive for architecture page.
 *
 * @example <aw-architecture-page.directive></aw-architecture-page.directive>
 *
 * @memberof NgElementDirectives
 */
app.directive( 'awArchitecturePage', [ function() {
    return {
        restrict: 'EA',
        transclude: true,
        replace: false,
        link: function( scope ) {

            var subLocationContentSelectionChangeEvent = eventBus.subscribe( "AM.SubLocationContentSelectionChangeEvent", function( eventData ) {
                scope.$emit( 'dataProvider.selectionChangeEvent', {
                    selected: eventData.selections,
                    source: 'secondaryWorkArea',
                    dataProviderName: "ArchitectureDataprovider"
                } );
            } );

            scope.$on( '$destroy', function() {
                eventBus.unsubscribe( subLocationContentSelectionChangeEvent );
            } );

        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-architecture-page.directive.html'
    };

} ] );
