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
 * Directive to display a gallery panel
 *
 * @module js/workinstr-gallery-panel.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-transclude.directive';
import 'js/aw-include.directive';
import 'js/workinstr-gallery-cell.directive';
import 'js/workinstr-gallery-list.directive';
import 'js/workinstr-gallery-panel.controller';

'use strict';

/**
 * Directive to display a gallery panel
 *
 * @example <workinstr-gallery-panel widgets="typeViewerMap" activeTab="subPanelContext">...</workinstr-gallery-panel>
 *
 * @member workinstr-gallery-panel
 * @memberof NgElementDirectives
 */
app.directive( 'workinstrGalleryPanel', //
    [
        function() {
            return {
                restrict: 'E',
                require: '^?workinstrTabsContainer',
                transclude: true,
                templateUrl: app.getBaseUrlPath() + '/html/workinstr-gallery-panel.directive.html',
                scope: {
                    widgets: '<',
                    activeTab: '=?'
                },
                controller: 'workinstrGalleryPanelController',
                link: function( $scope, $element, $attrs, workinstrTabsContainerCtrl ) {
                    $scope.setCmdContext = function( viewerData ) {
                        if( workinstrTabsContainerCtrl !== null ) {
                            workinstrTabsContainerCtrl.setCmdContext( viewerData );
                        }
                    };

                    eventBus.publish( 'awPanel.reveal', {
                        scope: $scope
                    } );
                },
                replace: true
            };
        }
    ] );
