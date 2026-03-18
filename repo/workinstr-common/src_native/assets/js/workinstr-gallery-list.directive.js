// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to display gallery list of items
 *
 * @module js/workinstr-gallery-list.directive
 */
import * as app from 'app';
import 'js/workinstr-gallery-list.controller';
import 'js/aw-transclude.directive';

'use strict';

/**
 * Directive to display list of items
 *
 * @example <workinstr-gallery-list dataprovider="dataProvider"><div>Sample list item</div></workinstr-gallery-list>
 *
 * @member workinstr-gallery-list
 * @memberof NgElementDirectives
 */
app.directive( 'workinstrGalleryList', //
    [ //
        function() {
            return {
                restrict: 'E',
                require: '^?workinstrGalleryPanel',
                controller: 'workinstrGalleryListController',
                transclude: true,
                scope: {
                    dataprovider: '<'
                },
                templateUrl: app.getBaseUrlPath() + '/html/workinstr-gallery-list.directive.html',
                link: function( $scope, $element, $attrs, workinstrGalleryPanelController ) {
                    $scope.selectItem = function( item ) {
                        if ( $scope.selectedItem === item ) {
                            return;
                        }
                        $scope.selectedItem = item;
                        if( workinstrGalleryPanelController !== null ) {
                            workinstrGalleryPanelController.itemSelected( $scope.selectedItem );
                        }
                    };
                }
            };
        }
    ] );
