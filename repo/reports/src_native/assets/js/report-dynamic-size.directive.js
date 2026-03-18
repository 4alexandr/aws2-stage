// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Attribute Directive to change the height and width of an element based on the input. Duplicate of LDF dynamic size,
 * Can be removed when generic framework support is added.
 *
 * @module js/report-dynamic-size.directive
 */
import app from 'app';
import _ from 'lodash';

'use strict';

/**
 * Attribute Directive to change the height and width of an element.
 *
 * @example TODO
 *
 * @member report-dynamic-size
 * @memberof NgAttributeDirectives
 */
app.directive( 'reportDynamicSize', //
    [ function() {
        return {
            restrict: 'A',
            replace: true,
            link: function( scope, element, attr ) {
                scope.$watch( attr.reportDynamicSize, function( value ) {
                    if( !_.isUndefined( value ) ) {
                        if( !_.isUndefined( value.height ) ) {
                            element.css( 'height', value.height );
                        }
                        if( !_.isUndefined( value.width ) ) {
                            element.css( 'width', value.width );
                        }
                        if( !_.isUndefined( value.width ) ) {
                            element.css( 'max-width', value.width );
                        }
                    }
                } );
            }
        };
    } ] );
