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
 * Directive to support social comment implementation.
 *
 * @module js/aw-social-comment-list.directive
 */
import app from 'app';
import $ from 'jquery';
import 'js/aw-scrollpanel.directive';
import 'js/aw-social-comment-cell.directive';
import 'js/aw-list.directive';

'use strict';

/**
 * Directive for custom relation comment implementation.
 *
 * @example <aw-social-comment-list vmo="model"></aw-social-comment-list>
 *
 * @member aw-social-comment-list
 * @memberof NgElementDirectives
 */
app.directive( 'awSocialCommentList', [ function() {
    return {
        restrict: 'E',
        scope: {
            dataprovider: '='
        },
        // controller: 'awSocialCommentList',
        templateUrl: app.getBaseUrlPath() + '/html/aw-social-comment-list.directive.html',

        // on Click div should be visible if hidden and hide div if visible
        link: function( $scope, $element ) {
            $element.click( function( evt ) {
                var toToggle = $( evt.target ).closest( '.aw-widgets-cellListItem' ).find( '.aw-social-cellText' );
                toToggle.toggle();
            } );
        }
    };
} ] );
