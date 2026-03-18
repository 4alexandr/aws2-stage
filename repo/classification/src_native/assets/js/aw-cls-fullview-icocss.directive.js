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
 *
 * @module js/aw-cls-fullview-icocss.directive
 */
import app from 'app';
import _ from 'lodash';


/**
 * Attribute Directive to change the height and width of an element.
 *
 * @example TODO
 *
 * @member aw-cls-fullview-icocss
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewIcocss', //
    [ function() {
        return {
            restrict: 'A',
            replace: true,
            link: function( $scope, $element ) {
                $element.addClass( 'aw-layout-primaryWorkareaFill' );
            }
        };
    } ] );
