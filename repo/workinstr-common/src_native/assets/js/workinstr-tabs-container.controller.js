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
 * Controller to display work instructions tabs container.
 *
 * @module js/workinstr-tabs-container.controller
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/appCtxService';

'use strict';

/**
 * Directive to display work instructions tabs container.
 *
 * @example <workinstr-tabs-container tabs="tabsList"></workinstr-tabs-container>
 *
 * @param {Object} $scope - Directive scope
 * @param {Object} $timeout - $timeout service
 * @param {Object} appCtxSvc - appCtxService
 *
 * @member workinstr-tabs-container
 * @memberof NgElementDirectives
 */
app.controller( 'workinstrTabsContainerCtrl', [ '$scope', '$timeout', 'appCtxService',
    function( $scope, $timeout, appCtxSvc ) {
        var self = this;

        $scope.viewerData = {};

        /**
         * Update the selected tab view
         */
        self.updateTabView = function() {
            if( $scope.selectedTab ) {
                self.initCmdContext();

                var tab = $scope.selectedTab;
                // Remove previous tab title selection
                if( $scope.currSelectedTab && $scope.currSelectedTab !== tab ) {
                    $scope.currSelectedTab.selectedTab = false;
                }
                $scope.currSelectedTab = tab;

                if( $scope.activeTab ) {
                    // Remove the previous tab content
                    $scope.activeTab = null;
                }

                var activeTab = {
                    tab: tab,
                    presenter: tab.viewMode.name,
                    id: $scope.$id
                };

                // Update the active tab content
                $timeout( function() {
                    $scope.activeTab = activeTab;
                    $scope.$broadcast( 'NgTabSelectionUpdate', tab );
                    // For the commands
                    $scope.viewerData.tab = tab;
                }, 200 );
            }
        };

        /**
         * Tab callback when clicking on a tab title
         *
         * @param {Integer} idx the index of the tab to select
         */
        $scope.selectTab = function( idx ) {
            $scope.selectedTab = $scope.tabs[ idx ];
            self.updateTabView();
        };

        /**
         * Set the viewer data as the command context
         *
         * @param {Object} viewerData the viewer data to set as the command context
         */
        self.setCmdContext = function( viewerData ) {
            // For gallery
            $scope.viewerData.datasetData = viewerData.datasetData;
            $scope.viewerData.fileData = viewerData.fileData;
            // For table/ list
            $scope.viewerData.selectedObjects = viewerData.selectedObjects;
            // For markup command
            $scope.viewerData.myGalleryPanel = viewerData.myGalleryPanel;
        };

        /**
         * Init the command context
         */
        self.initCmdContext = function() {
            var viewerData = {
                fileData: {
                    file: null,
                    fmsTicket: null,
                    fileUrl: null,
                    viewer: null,
                    cortonaInteractivityTicket: null,
                    cortonaWorkInstructionsTicket: null,
                    useParentDimensions: true
                },
                hasMoreDatasets: false,
                uid: null,
                useParentDimensions: true,
                myGalleryPanel: null,
                datasetData: null
            };
            self.setCmdContext( viewerData );
        };

        /**
         * On table/ list selection change - update the command context
         *
         * @method handleSelectionChangeListener
         */
        var _handleSelectionChangeListener = function() {
            // Add listener
            var selectionChangeListener = eventBus.subscribe( 'workinstr.selectionChange', function( eventData ) {
                // In case of TwoPanelLayout, $scope.selectedTab is undefined
                // Therefore, inserting a check for it
                if( $scope.selectedTab && eventData.activeTab.name === $scope.selectedTab.name ) {
                    self.setCmdContext( eventData.dataProvider );
                }
            } );

            // And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( selectionChangeListener );
            } );
        };

        _handleSelectionChangeListener();

        /**
         * On data change - update the tab view
         *
         * @method handleDataChangeListener
         */
        var _handleDataChangeListener = function() {
            // Add listener
            var dataChangeListener = eventBus.subscribe( 'workinstr.dataChange', function( eventData ) {
                // In case of TwoPanelLayout, $scope.selectedTab is undefined
                // Therefore, inserting a check for it
                if( !eventData.tab || ($scope.selectedTab && $scope.selectedTab.name && eventData.tab.name === $scope.selectedTab.name)) {
                    self.updateTabView();
                    appCtxSvc.unRegisterCtx( 'workinstr0viewToRefresh' );
                }
            } );

            // And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( dataChangeListener );
            } );
        };

        _handleDataChangeListener();

    }
] );
