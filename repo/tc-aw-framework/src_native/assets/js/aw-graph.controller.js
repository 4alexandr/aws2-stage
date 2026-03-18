// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * Defines controller for '<aw-graph>' directive.
 *
 * @module js/aw-graph.controller
 */
import app from 'app';
import $ from 'jquery';
import ngModule from 'angular';
import _ from 'lodash';
import graphCommandService from 'js/graphCommandService';
import logSvc from 'js/logger';
import 'js/appCtxService';
import 'js/command.service';
import 'js/localeService';

'use strict';

/**
 * Defines awGraph controller
 *
 * @member awGraphController
 * @memberof NgControllers
 */
app.controller( 'awGraphController', [
    '$scope',
    '$element',
    '$timeout',
    'appCtxService',
    'commandService',
    'localeService',
    function( $scope, $element, $timeout, appCtxService, commandService, localeSvc ) {
        $scope.initialize = false;

        if( !$scope.graphModel ) {
            logSvc.error( 'Graph model is undefined, skip initializing aw-graph.' );
            return;
        }

        // Set default graph configuration
        if( !$scope.graphModel.config ) {
            $scope.graphModel.config = {};
        }

        if( !$scope.graphModel.config.defaults ) {
            $scope.graphModel.config.defaults = {};
        }

        // It's main graph by default
        if( $scope.isMain === undefined ) {
            $scope.isMain = true;
        }

        /**
         * Load the static commands
         */

        // Create a new isolated scope to evaluate commands
        var commandScope = $scope;
        commandScope.ctx = appCtxService.ctx;
        commandScope.commandContext = {};

        // get the commands for graph nodes
        commandService.getCommands( 'aw_graph_node', commandScope ).then( function( commands ) {
            $scope.graphModel.nodeCommands = commands;
            $scope.graphModel.nodeCommandBindData = graphCommandService.getCommandsBindData( commands );
        } );

        var legendState = {
            activeView: null,
            creatingCategory: null,
            creatingSubCategory: null
        };

        // process graph legend panel
        $scope.legendTabs = [];
        if( $scope.legendData ) {
            // add the default legend view tab
            $scope.legendTabs.push( {
                panelId: 'graphLegendSub',
                name: 'views',
                recreatePanel: true
            } );

            // process application's legend panel tabs extension
            var customTabs = $scope.legendData.tabModels;
            if( customTabs ) {
                $scope.legendTabs = $scope.legendTabs.concat( customTabs );
            }

            $scope.legendState = legendState;
        }

        $scope.setCommandContextItem = function( item ) {
            appCtxService.registerPartialCtx( 'graph.commandContextGraph', $scope.graphModel );
            appCtxService.registerPartialCtx( 'graph.commandContextItem', item );
        };

        var childCommandScope = null;
        childCommandScope = $scope.$new( true );
        childCommandScope.ctx = appCtxService.ctx;
        childCommandScope.commandContext = {};

        $scope.executeCommand = function( commandId, contextGraphItem, commandElemRect ) {
            var command = _.find( $scope.graphModel.nodeCommands, {
                commandId: commandId
            } );

            if( command ) {
                $scope.setCommandContextItem( contextGraphItem );

                commandService.getCommands( command.commandId, childCommandScope ).then( function( childCommands ) {
                    // popup context menu for group command
                    if( childCommands && childCommands.length > 0 ) {
                        $scope.showPopupMenu( contextGraphItem, commandElemRect, childCommands );
                    } else {
                        command.callbackApi.execute();

                        // hide the overlay node after click tile command on overlay node
                        $scope.graphModel.graphControl.hideOverlayNode();
                    }
                } );
            } else {
                logSvc.error( 'The command', commandId, ' is not defined.' );
            }
        };

        var popupOpen = false;
        $scope.showPopupMenu = function( contextItem, relativeRect, childCommands ) {
            $scope.setCommandContextItem( contextItem );

            // get active child commands
            $scope.contextMenuCommands = childCommands;

            var eventData = {
                popupUpLevelElement: $element.find( '.aw-graph-contextMenu' )
            };

            if( popupOpen ) {
                $scope.$broadcast( 'awPopupWidget.close', eventData );
            } else {
                var revealPopup = function() {
                    var contextMenuElem = $element.find( '.aw-graph-contextMenu' );
                    eventData.popupUpLevelElement = contextMenuElem;
                    // set the popup position
                    contextMenuElem.width( relativeRect.width );
                    contextMenuElem.height( relativeRect.height );
                    contextMenuElem.offset( {
                        left: relativeRect.left,
                        top: relativeRect.top
                    } );

                    $scope.$broadcast( 'awPopupWidget.open', eventData );
                    $timeout().then( function() {
                        contextMenuElem.offset( {
                            left: 0,
                            top: 0
                        } );
                    } );

                    popupOpen = true;

                    var popupCloseListener = $scope.$on( 'awPopupWidget.close', function() {
                        popupOpen = false;
                        $scope.contextMenuCommands = null;

                        // hide the overlay node after click context menu item on overlay node
                        $scope.graphModel.graphControl.hideOverlayNode();

                        popupCloseListener();
                    } );
                };

                // Necessary to ensure ng-if condition has revealed the popup div
                $timeout().then( revealPopup );
            }
        };

        // get command title localization text
        var showOverviewCommandTitle = '';
        var hideOverviewCommandTitle = '';
        localeSvc.getTextPromise( 'i18n/GraphMessages' ).then( function( localTextBundle ) {
            showOverviewCommandTitle = localTextBundle.showGraphOverview;
            hideOverviewCommandTitle = localTextBundle.hideGraphOverview;
            $scope.overviewCommandTitle = showOverviewCommandTitle;
            $scope.filterAppliedCommandTitle = localTextBundle.filterApplied;
            if( $scope.legendTabs && $scope.legendTabs.length > 0 ) {
                $scope.legendTabs[ 0 ].name = localTextBundle.views;
            }
        } );

        $scope.graphModel.isOverviewOpened = false;
        $scope.toggleOverView = function() {
            $scope.graphModel.isOverviewOpened = !$scope.graphModel.isOverviewOpened;
            $scope.overviewCommandTitle = $scope.graphModel.isOverviewOpened ? hideOverviewCommandTitle : showOverviewCommandTitle;
        };
    }
] );
