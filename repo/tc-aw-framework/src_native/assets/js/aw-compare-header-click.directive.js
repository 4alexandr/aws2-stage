// Copyright (c) 2020 Siemens

/**
 * Directive for header click.
 *
 * @module js/aw-compare-header-click.directive
 */
import app from 'app';

/**
 * Directive for header click.
 *
 * @example TODO
 *
 * @member aw-compare-header-click
 * @memberof NgElementDirectives
 */
app.directive( 'awCompareHeaderClick', function() {
    return function( scope, element ) {
        element.bind( 'click', function( event ) {
            var headRef = scope.col.colDef;
            headRef.onHeaderClickEvent( event );
        } );
    };
} );
