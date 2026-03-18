// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive is used to show the tracelink tooltip cell.
 *
 * @module js/removeadvanceoptions-mousehandler.directive
 */
import app from 'app';
import $ from 'jquery';

'use strict';

/**
 * Definition for the 'dom-mousehandler' directive used to handle Mouse event for Property Rules.
 *
 * @example <div removeadvanceoptions-mousehandler  ></div>
 *
 * @member removeadvanceoptions-mousehandler
 * @memberof NgElementDirectives
 */
app.directive( 'removeadvanceoptionsMousehandler', function() {
    return {
        restrict: 'A',
        link: function( $scope, element, attrs ) {
            element.on( 'mouseenter', function() {
                $( 'button.remove-advance-options-btn', this ).removeClass( 'hidden' );
            } );
            element.on( 'mouseleave', function() {
                $( 'button.remove-advance-options-btn', this ).addClass( 'hidden' );
            } );
        }
    };
} );
