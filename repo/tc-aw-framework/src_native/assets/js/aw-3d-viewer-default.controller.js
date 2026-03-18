// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines 3d viewer controller
 *
 * @module js/aw-3d-viewer-default.controller
 */
import * as app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'soa/kernel/clientMetaModel';
import 'js/appCtxService';

'use strict';

//eslint-disable-next-line valid-jsdoc
/**
 * Defines controller for default 3d viewer
 *
 * @member aw3dViewerDefaultController
 * @memberof NgControllers
 */
app.controller( 'aw3dViewerDefaultController', [
    '$scope',
    '$q',
    '$timeout',
    'soa_kernel_clientDataModel',
    'appCtxService',
    function( $scope, $q, $timeout, cdm, appCtxSvc ) {
        /**
         * Directive scope
         */
        var self = this; //eslint-disable-line no-invalid-this

        /**
         * Describes the scope
         */
        $scope.whoAmI = 'aw3dViewerDefaultController';

        /**
         * Promise to be invoked to set viewer height
         */
        self.resizePromise = null;

        /**
         * Navigation panel revealed event subscription
         */
        var _navigationPanelEventSub = null;

        /**
         * Tools and info panel revealed event subscription
         */
        var _toolAndInfoPanelEventSub = null;

        /**
         * Full screen command event subscription
         */
        var _fullScreenEventSubscription = null;

        /**
         * command bar resize event subscription
         */
        var _commandBarResizeEventSubscription = null;

        /**
         * Splitter drag event listener
         */
        var _awSplitterChangedListener = null;

        /**
         * View mode context listener
         */
        var _awViewModeContextListener = null;

        self.initViewer = function( containerElement ) {
            self.element = containerElement;
            var returnPromise = $q.defer();
            self.setViewerDimensions();
            _registerForResizeEvents();
            returnPromise.resolve();
            return returnPromise.promise;
        };

        /**
         * Sets the viewer height
         */
        self.setViewerDimensions = function() {
            if( self.element ) {
                var currElement = self.element[ 0 ].parentElement;
                var computedWidth = null;
                var computedHeight = null;
                while( currElement && !_.includes( currElement.className, 'aw-xrt-nonColumnAndSections' ) && !_.includes( currElement.className, 'aw-xrt-nonColumnAndSection' ) ) {
                    currElement = currElement.parentElement;
                }
                if( currElement ) {
                    computedWidth = currElement.clientWidth;
                }
                currElement = self.element[ 0 ].parentElement;
                while( currElement && !_.includes( currElement.className, 'aw-base-scrollPanel' ) && !_.includes( currElement.className, 'aw-xrt-nonColumnAndSections' ) ) {
                    currElement = currElement.parentElement;
                }
                if( currElement ) {
                    var toolbarParentDivElement = $( self.element[ 0 ].parentElement ).find( 'div.aw-toolbar-layout' );
                    if( !computedWidth ) {
                        computedWidth = currElement.clientWidth;
                    }
                    computedHeight = currElement.clientHeight - ( toolbarParentDivElement.height() ? toolbarParentDivElement.height() + 10 : 45 );
                    var locationContext = appCtxSvc.getCtx( 'locationContext' );
                    if( locationContext[ 'ActiveWorkspace:SubLocation' ] === 'showObject' ) {
                        computedHeight -= 28;
                    }

                    var subLocationContext = appCtxSvc.getCtx( 'sublocation' );
                    if( subLocationContext.label === 'Disclosure' ) {
                        var disclosureView = self.element[ 0 ].parentElement;
                        while( disclosureView && !_.includes( disclosureView.className, 'aw-xrt-columnContentPanel' ) ) {
                            disclosureView = disclosureView.parentElement;
                        }
                        computedWidth = disclosureView.clientWidth;
                    }
                    $scope.threeDViewerWidth = computedWidth;
                    $scope.threeDViewerHeight = computedHeight;
                    $scope.viewerHeight = computedHeight + 'px';
                    $scope.viewerWidth = computedWidth + 'px';
                    $scope.loadProgressIndicatorWidth = computedWidth * 0.04 + 'px';
                    $scope.emmProgressIndicatorWidth = computedWidth * 0.08 + 'px';
                    $scope.$broadcast( 'setViewerDimensions', {
                        newViewerWidth: computedWidth,
                        newViewerHeight: computedHeight
                    } );
                } else {
                    logger.error( 'AW Default Viewer : No reference found for viewer dimension' );
                }
                var subLocationContext = appCtxSvc.getCtx( 'sublocation' );
                if( subLocationContext && subLocationContext.label === 'Disclosure' ) {
                    computedHeight -= 28;
                }
            } else {
                logger.error( 'AW Default Viewer : Viewer element can not be null' );
            }
        };

        /**
         * Register for viewer resize events
         */
        function _registerForResizeEvents() {
            if( _navigationPanelEventSub === null ) {
                _navigationPanelEventSub = eventBus.subscribe( 'appCtx.register', function( data ) {
                    if( data && data.name === 'activeNavigationCommand' ) {
                        $scope.resizeViewer();
                    }
                }, 'awStructureViewerController' );
            }

            if( _toolAndInfoPanelEventSub === null ) {
                _toolAndInfoPanelEventSub = eventBus.subscribe( 'appCtx.register', function( data ) {
                    if( data && data.name === 'activeToolsAndInfoCommand' &&
                        data.value === undefined ) {
                        $scope.resizeViewer();
                    }
                }, 'awStructureViewerController' );
            }

            if( _fullScreenEventSubscription === null ) {
                _fullScreenEventSubscription = eventBus.subscribe( 'aw-command-logEvent', function( data ) {
                    if( data &&
                        ( data.sanCommandId === 'Awp0FullScreen' ||
                            data.sanCommandId === 'fullViewMode' || data.sanCommandId === 'Awp0ExitFullScreen' ) ) {
                        $scope.resizeViewer();
                    }
                }, 'awStructureViewerController' );
            }

            if( _awSplitterChangedListener === null ) {
                _awSplitterChangedListener = eventBus.subscribe( 'aw-splitter-update', function() {
                    $scope.resizeViewer();
                }, 'awStructureViewerController' );
            }

            if( _awViewModeContextListener === null ) {
                _awViewModeContextListener = eventBus.subscribe( 'appCtx.register', function( data ) {
                    if( data && data.name === 'ViewModeContext' ) {
                        $scope.resizeViewer();
                    }
                }, 'awStructureViewerController' );
            }

            if( _commandBarResizeEventSubscription === null ) {
                _commandBarResizeEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
                    $scope.resizeViewer();
                }, 'awStructureViewerController' );
            }
        }

        self.setContextObject = function() {
            var viewerData = $scope.data;
            if( viewerData ) {
                var contextObjectUid = null;
                if( viewerData.datasetData && viewerData.datasetData.uid ) {
                    contextObjectUid = viewerData.datasetData.uid;
                } else if( viewerData.uid ) {
                    contextObjectUid = viewerData.uid;
                }
                var contextObject = cdm.getObject( contextObjectUid );
                $scope.contextObject = contextObject;
            }
        };

        /**
         * Implements promise for window resize event
         */
        self.resizeTimer = function() {
            self.resizePromise = $timeout( function() {
                if( self ) {
                    if( self.setViewerDimensions ) {
                        self.setViewerDimensions();
                    }
                }
            }, 250 );
        };

        /**
         * Implements handler for window resize event
         */
        $scope.resizeViewer = function() {
            if( self.resizePromise ) {
                $timeout.cancel( self.resizePromise );
            }
            self.resizeTimer();
        };

        /**
         * Binds window resize event to resizeViewer handler function
         */
        $scope.$on( 'windowResize', $scope.resizeViewer );

        /**
         * Unbinds window resize event handler and element when controller is destroyed
         */
        self.ctrlCleanup = function() {
            if( self.element ) {
                self.element.remove();
            }

            if( _navigationPanelEventSub ) {
                eventBus.unsubscribe( _navigationPanelEventSub );
                _navigationPanelEventSub = null;
            }

            if( _toolAndInfoPanelEventSub ) {
                eventBus.unsubscribe( _toolAndInfoPanelEventSub );
                _toolAndInfoPanelEventSub = null;
            }

            if( _fullScreenEventSubscription ) {
                eventBus.unsubscribe( _fullScreenEventSubscription );
                _fullScreenEventSubscription = null;
            }

            if( _awSplitterChangedListener ) {
                eventBus.unsubscribe( _awSplitterChangedListener );
                _awSplitterChangedListener = null;
            }

            if( _awViewModeContextListener ) {
                eventBus.unsubscribe( _awViewModeContextListener );
                _awViewModeContextListener = null;
            }

            if( _commandBarResizeEventSubscription ) {
                eventBus.unsubscribe( _commandBarResizeEventSubscription );
                _commandBarResizeEventSubscription = null;
            }

            self.resizePromise = null;
        };

        /**
         * Cleanup all watchers and instance members when this scope is destroyed.
         *
         * @return {Void}
         */
        $scope.$on( '$destroy', function() {
            //Cleanup
            self.ctrlCleanup();
        } );
    }
] );
