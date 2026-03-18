// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to show 2d viewer
 *
 * @module js/aw-2d-viewer.directive
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/utils2dViewer';
import 'js/awIconService';
import 'js/localeService';
import 'js/messagingService';
import 'js/aw3dViewerService';
import 'js/Awp0ViewerGalleryUtils';
import 'soa/preferenceService';
import 'js/viewModelService';
import 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import AwPromiseService from 'js/awPromiseService';

'use strict';

var WEB_XML_VIS_PROXY_CONTEXT = 'VisProxyServlet' + '/';

/**
 * 2D viewer directive
 *
 * @member aw-2d-viewer
 * @memberof NgElementDirectives
 *
 * @param {localeService} localeSvc service
 * @param {messagingService} msgSvc service
 * @param {aw3dViewerService} aw3dViewerService service
 * @param {Awp0ViewerGalleryUtils} viewerGalleryUtils service
 * @param {soa_preferenceService} preferenceService service
 * @param {viewModelService} viewModelService service
 * @param {utils2dViewer} utils2dViewer service
 * @param {appCtxService} appCtxSvc service
 *
 * @return {Void} none
 */
app.directive( 'aw2dViewer', [
    'localeService',
    'messagingService',
    'aw3dViewerService',
    'Awp0ViewerGalleryUtils',
    'soa_preferenceService',
    'viewModelService',
    'utils2dViewer',
    'appCtxService',
    function( localeSvc, msgSvc, aw3dViewerService, viewerGalleryUtils, preferenceService, viewModelService, utils2dViewer, appCtxSvc ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-2d-viewer.directive.html',
            scope: { //isolate the scope
                data: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'aw2dViewer';

                /**
                 * setting ng element
                 */
                var element = $element;

                /**
                 * Store reference to scope for processing on resolution of promise
                 */
                var scope = $scope;

                /**
                 * Native viewer context data
                 */
                var viewerCtxData = null;

                /**
                 * Root node
                 */
                var _viewerCanvasDivElement = null;

                /**
                 * EMM Progress indicator event subscription.
                 */
                var _emmProgressIndicatorEvent = null;

                /**
                 * Viewer progress indicator event subscription.
                 */
                var _viewerProgressIndicatorEvent = null;

                /**
                 * Replace file event subscription.
                 */
                var _replaceFileEvent = null;

                /**
                 * Total number of pages.
                 */
                var _numPages = 1;

                /**
                 * Current page number.
                 */
                var _currentPage = 1;

                /**
                 * THE rotation degree
                 */
                var rotation = 0;

                /**
                 * 2D Viewer render option
                 */
                var VIEWER_2D_RENDER_OPTION = preferenceService.getLoadedPrefs().AWV02DViewerRenderOption;

                // Initialize the controller and viewer
                var promise = controller.initViewer( $element, true );
                promise.then( function() {
                    scope.initViewer( false );
                } );

                /**
                 * Initialize viewer
                 *
                 * @function initViewer
                 * @memberOf NgElementDirectives.aw-2d-viewer.directive
                 * @param {Boolean} isReloadViewer true if viewer is loaded after reload
                 */
                $scope.initViewer = function( isReloadViewer ) {
                    rotation = 0;
                    var returnPromise = AwPromiseService.instance.defer();
                    var viewerElement = element.find( 'div#awImageViewer' );
                    var declViewModel = viewModelService.getViewModel( $scope, false );
                    var selectedDataset = declViewModel.datasetData;

                    $scope.showViewerEmmProgress = true;
                    $scope.viewerLoading = true;
                    $scope.viewerError = false;

                    registerViewerProgressIndicatorEvents();

                    var pageValues = {
                        numPages: _numPages,
                        currentPage: _currentPage
                    };

                    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );

                    _setLoadingMsg();
                    $scope.resizeViewer();

                    _checkIfVisIsInstalled();

                    if( !_replaceFileEvent ) {
                        _replaceFileEvent = eventBus.subscribe( 'fileReplace.success', function() {
                            var declViewModel = viewModelService.getViewModel( $scope, false );

                            viewerGalleryUtils.refetchViewer( declViewModel ).then(
                                function() {
                                    $scope.data = declViewModel.viewerData;
                                    $scope.fileUrl = declViewModel.viewerData.fileData.fileUrl;
                                    isReloadViewer = true;
                                    setupViewer();
                                }
                            );
                        } );
                    }

                    /**
                     * Check if Vis Server is Installed
                     */
                    function _checkIfVisIsInstalled() {
                        var url = browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;

                        $scope.showViewerEmmProgress = true;

                        window.JSCom.Health.HealthUtils.getServerHealthInfo( url ).then( function( health ) {
                            var poolManagers = health.getPoolManagers();
                            if( poolManagers.length > 0 ) {
                                utils2dViewer.setUsePictureSlinging( true );
                                setupViewer();
                            } else {
                                utils2dViewer.setUsePictureSlinging( false );

                                $scope.viewerError = true;
                                $scope.viewerLoading = false;
                                $scope.showViewerEmmProgress = false;
                                getViewerMessage( 'viewerNotConfigured2D', 'Viewer2DMessages' ).then( function( localizedErrorMsg ) {
                                    msgSvc.showError( localizedErrorMsg );
                                } );
                            }
                        }, function( error ) {
                            logger.error( 'Server Health: ' + error );

                            $scope.viewerError = true;
                            $scope.viewerLoading = false;
                            $scope.showViewerEmmProgress = false;

                            getViewerMessage( 'viewerNotConfigured2D', 'Viewer2DMessages' ).then( function( localizedErrorMsg ) {
                                msgSvc.showError( localizedErrorMsg );
                            } );
                        } );
                    }

                    /**
                     * Setup the viewer
                     */
                    function setupViewer() {
                        var width = parseInt( $scope.twoDViewerWidth );
                        var height = parseInt( $scope.twoDViewerHeight );

                        if( isReloadViewer || !aw3dViewerService.isSameProductOpenedAsPrevious( selectedDataset ) ) {
                            aw3dViewerService.cleanUpPreviousView();

                            var viewerLoadInputParams = aw3dViewerService.getViewerLoadInputParameter( selectedDataset, width, height - 5 );

                            if(selectedDataset.type === 'Zip')
                            {
                                viewerLoadInputParams.setAdditionalInfo( {'FileTypeID':'ImageView.Document'} );
                            }
                            else
                            {
                                viewerLoadInputParams.setAdditionalInfo( {} );
                            }

                            viewerLoadInputParams.set2DRenderer( true );
                            viewerLoadInputParams.initializeViewerContext();
                            viewerCtxData = viewerLoadInputParams.getViewerContext();
                            _registerForConnectionProblems();
                            aw3dViewerService.getViewerView( viewerLoadInputParams ).then( function( viewerData ) {
                                _setupViewerAfterLoad( viewerElement, viewerData, selectedDataset );
                                $scope.resizeViewer();

                                var matrix = {
                                    a: 1,
                                    b: 0,
                                    c: 0,
                                    d: 1,
                                    e: 0,
                                    f: 0
                                };

                                viewerData[ 0 ].setViewUpdateCallback( resizeMarkups, matrix );

                                $scope.showViewerEmmProgress = false;
                                returnPromise.resolve( viewerData[ 0 ] );
                            }, function( errorMsg ) {
                                logger.error( 'Failed to load viewer : ' + errorMsg );
                                $scope.viewerError = true;
                                returnPromise.reject( errorMsg );
                            } );
                        } else {
                            aw3dViewerService.restorePreviousView().then( function( viewerData ) {
                                _setupViewerAfterLoad( viewerElement, viewerData, selectedDataset );
                                _registerForConnectionProblems();
                                var dim = $scope.getComputedViewerDimensions();
                                viewerCtxData.setSize( dim.viewerWidth, dim.viewerHeight - 5 );
                                $scope.resizeViewer();

                                var matrix = {
                                    a: 1,
                                    b: 0,
                                    c: 0,
                                    d: 1,
                                    e: 0,
                                    f: 0
                                };

                                viewerData[ 0 ].setViewUpdateCallback( resizeMarkups, matrix );

                                $scope.showViewerEmmProgress = false;
                                returnPromise.resolve( viewerData[ 0 ] );
                            }, function( errorMsg ) {
                                logger.error( 'Failed to restore viewer : ' + errorMsg );
                                $scope.viewerError = true;
                                returnPromise.reject( errorMsg );
                            } );
                        }
                    }
                };

                /**
                 * Registers Product Context launch api
                 * @param {Object} viewerElement viewer div element
                 * @param {Object} viewerData viewer Data
                 * @param {Object} viewerContextObj viewer context data object
                 */
                function _setupViewerAfterLoad( viewerElement, viewerData, viewerContextObj ) {
                    if( _viewerCanvasDivElement ) {
                        _viewerCanvasDivElement.remove();
                    }

                    _viewerCanvasDivElement = viewerData[ 1 ];

                    if( _viewerCanvasDivElement ) {
                        _viewerCanvasDivElement.lastElementChild.addEventListener( 'transform', function( eventData ) {
                            var viewport = viewerCtxData.getSize();
                            resizeMarkups( viewport, eventData.detail.matrix );
                        } );
                    }

                    viewerElement.append( _viewerCanvasDivElement );
                    $scope.viewerError = false;
                    $scope.viewerLoading = false;
                    viewerCtxData = viewerData[ 0 ];
                    viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );

                    var awTwoDViewerNavMode = appCtxSvc.getCtx( 'awTwoDViewerNavMode' );

                    var bPan = true;

                    if( awTwoDViewerNavMode && awTwoDViewerNavMode === 'zoom' ) {
                        bPan = false;
                    }

                    $scope.setMouseMovePan( bPan );
                }

                /**
                 * set the viewer dimensions
                 *
                 * @function setViewerDimensions
                 * @param {Number} viewerWidthToSet viewer width
                 * @param {Number} viewerHeightToSet viewer height
                 */
                $scope.setViewerDimensions = _.debounce( function( viewerWidthToSet, viewerHeightToSet ) {
                        if( viewerCtxData ) {
                            var newWidth = parseInt( viewerWidthToSet );
                            var newHeight = parseInt( viewerHeightToSet );

                            viewerCtxData.setSize( newWidth, newHeight - 5 );
                            //utils2dViewer.clearCanvas();
                        }
                    },
                    100, {
                        trailing: true,
                        leading: false
                    } );

                /**
                 * Register for viewer visibility events
                 */
                function _registerForConnectionProblems() {
                    viewerCtxData.addViewerConnectionProblemListener( resetViewerSettings );
                }

                /**
                 * Reset viewer settings
                 */
                function resetViewerSettings() {
                    cleanUp( true );
                    $scope.initViewer( true );
                }

                /**
                 * Sets the locale specific 'Loading...' message from text bundle
                 *
                 * @param {String} key -
                 */
                var _setLoadingMsg = function() {
                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        $scope.$evalAsync( function() {
                            $scope.loadingMsg = localTextBundle.LOADING_TEXT;
                        } );
                    } );

                    getViewerMessage( 'viewerIssue', 'Viewer2DMessages' ).then( function( localizedErrorMsg ) {
                        $scope.viewerIssueMsg = localizedErrorMsg;
                    } );
                };

                /**
                 * Get viewer message for key
                 *
                 * @function getViewerMessage
                 * @memberOf NgElementDirectives.aw-2d-viewer.directive
                 *
                 * @param {String} key Key to search
                 * @param {String} i18nFile file to search
                 * @return {Promise} A promise resolved once message is retrieved
                 */
                function getViewerMessage( key, i18nFile ) {
                    var returnPromise = AwPromiseService.instance.defer();
                    localeSvc.getTextPromise( i18nFile ).then(
                        function( localTextBundle ) {
                            $scope.$evalAsync( function() {
                                returnPromise.resolve( localTextBundle[ key ] );
                            } );
                        } );
                    return returnPromise.promise;
                }

                /**
                 * Resize markups so they match the base doc
                 *
                 *  @param {object} viewport - the current viewport data
                 *  @param {object} matrix - the current matrix data
                 */
                function resizeMarkups( viewport, matrix ) {
                    if( isSSR() ) {
                        resizeMarkupsPicSling( viewport );
                    } else {
                        resizeMarkupsVectorSling( viewport, matrix );
                    }
                }

                /**
                 * Check if server side rendering
                 *
                 * @return {boolean} True if is server side rendering
                 */
                function isSSR() {
                    if( !VIEWER_2D_RENDER_OPTION || VIEWER_2D_RENDER_OPTION.length === 0 ) {
                        VIEWER_2D_RENDER_OPTION = [ 'SSR' ];
                    }

                    if( Array.isArray( VIEWER_2D_RENDER_OPTION ) && VIEWER_2D_RENDER_OPTION[ 0 ] === 'CSR' ) {
                        return false;
                    }

                    return true;
                }

                /**
                 * Calculate the pixel density in dots per unit (pixels per document unit).
                 *
                 * @param {integer} units - the units
                 * @return {double} the unit multiplier
                 */
                function unitsMultiplier( units ) {
                    var multiplier = 1.0; // Inches

                    if( units === 2 ) { // Millimeters
                        multiplier *= 25.4;
                    } else if( units === 4 ) { // Feet
                        multiplier /= 12.0;
                    } else if( units === 12 ) { // Yards
                        multiplier /= 36.0;
                    } else if( units === 10 ) { // Centimeters
                        multiplier *= 2.54;
                    } else if( units === 15 ) { // Decimeters
                        multiplier *= 0.254;
                    } else if( units === 6 ) { // Meters
                        multiplier *= 0.0254;
                    } else if( units === 7 ) { // Kilometers
                        multiplier *= 0.0000254;
                    }
                    return multiplier;
                }

                /**
                 * Calculate the markups viewport.
                 *
                 * @param {object} viewport - the viewport
                 * @return {object} the markup viewport
                 */
                function calculateMarkupViewport( viewport ) {
                    var scale = Math.max( Math.min( viewport.width / viewport.docPixelWidth, viewport.height / viewport.docPixelHeight, 100 ), 0.001 );

                    // adjust for units so Vis markups align with image
                    var docRatioInInches = viewport.startWidth / viewport.pageWidth;
                    var unitsMult = unitsMultiplier( viewport.units ); // Inches is 1.0
                    docRatioInInches *= unitsMult;
                    var adjust = viewport.startScale * docRatioInInches / 96.0;

                    var xOffset = 0;
                    var yOffset = 0;
                    var angle = (rotation/90)*(Math.PI/2);

                    // handle pan and zoom translations
                    var transX = viewport.startWidth * ( 0.5 - viewport.startTranslationX ) * viewport.startScale;
                    var transY = viewport.startHeight * ( 0.5 - viewport.startTranslationY ) * viewport.startScale;

                    if( rotation % 360 !== 0 )
                    {
                        var cos = Math.cos( angle );
                        var sin = Math.sin( angle );

                        xOffset = viewport.width / 2 - (viewport.startScale) * ( viewport.docPixelWidth * cos - viewport.docPixelHeight * sin ) / 2;
                        yOffset = viewport.height / 2 - (viewport.startScale) * ( viewport.docPixelWidth * sin + viewport.docPixelHeight * cos ) / 2;

                        if( rotation === 180 || rotation === -180 )
                        {
                            xOffset -= transX;
                            yOffset += transY;
                        }
                        else
                        {
                            xOffset += transX*cos + transY*sin;
                            yOffset += transX*sin + transY*cos;
                        }
                    }
                    else
                    {
                        var aspectRatio = viewport.docPixelHeight / viewport.docPixelWidth;
                        var canvasRatio = viewport.height / viewport.width;

                        var d = 0;

                        // padding is added to the image on one side so markups need to account for it
                        if( canvasRatio < aspectRatio ) {
                            aspectRatio = viewport.docPixelWidth / viewport.docPixelHeight;
                            d = viewport.height / viewport.width * aspectRatio;
                            xOffset = Math.abs( viewport.width - viewport.width * d ) / 2.0;
                        } else {
                            d = viewport.width / viewport.height * aspectRatio;
                            yOffset = Math.abs( viewport.height - viewport.height * d ) / 2.0;
                        }

                        // correct padding offset based on scale
                        xOffset -= viewport.width / 2;
                        yOffset -= viewport.height / 2;

                        viewport.startScale = Math.abs( viewport.startScale );

                        xOffset *= viewport.startScale / scale;
                        yOffset *= viewport.startScale / scale;

                        // adjust for units so Vis markups align with image
                        xOffset *= unitsMult;
                        yOffset *= unitsMult;

                        xOffset += viewport.width / 2;
                        yOffset += viewport.height / 2;

                        xOffset += transX;
                        yOffset -= transY;
                    }

                    var vp = {
                        scale: adjust,
                        x: xOffset,
                        y: yOffset,
                        angle2: angle
                    };
                    return vp;
                }

                /**
                 * Resize markups so they match the base doc.
                 *
                 * @param {object} viewport - the current viewport data
                 */
                function resizeMarkupsPicSling( viewport ) {
                    setNumPages( viewport.numPages );
                    var vp = calculateMarkupViewport( viewport );
                    utils2dViewer.resize( vp );
                }

                /**
                 * Resize markups so they match the base doc
                 *
                 *  @param {object} viewport - the current viewport data
                 *  @param {object} matrix - the transform matrix data
                 */
                function resizeMarkupsVectorSling( viewport, matrix ) {
                    setNumPages( viewport.numPages );

                    var unitsToInches = 1;

                    if( viewport.units === 2 ) { // millimeters
                        unitsToInches *= 25.4;
                    } else if( viewport.units === 4 ) { // Feet
                        unitsToInches /= 12.0;
                    } else if( viewport.units === 12 ) { // Yards
                        unitsToInches /= 36.0;
                    } else if( viewport.units === 10 ) { // Centimeters
                        unitsToInches *= 2.54;
                    } else if( viewport.units === 15 ) { // Decimeters
                        unitsToInches *= 0.254;
                    } else if( viewport.units === 6 ) { // Meters
                        unitsToInches *= 0.0254;
                    } else if( viewport.units === 7 ) { // Kilometers
                        unitsToInches *= 0.0000254;
                    }

                    var theScale = Math.max( Math.abs(matrix.a), Math.abs(matrix.b), Math.abs(matrix.c), Math.abs(matrix.d) );
                    var angle = (rotation/90)*(Math.PI/2);

                    var vp = {
                        scale: theScale / 96.0 * unitsToInches,
                        x: matrix.e,
                        y: matrix.f,
                        angle2: angle
                    };

                    utils2dViewer.resize( vp );
                }

                /**
                 * Subscribes to viewer and emm progress indicator events.
                 */
                function registerViewerProgressIndicatorEvents() {
                    if( _emmProgressIndicatorEvent === null ) {
                        _emmProgressIndicatorEvent = eventBus.subscribe( 'emmProgressIndicator', function( eventData ) {
                            AwTimeoutService.instance( function() {
                                $scope.showViewerEmmProgress = eventData.emmProgressIndicatorStatus;

                                if( !$scope.showViewerEmmProgress && viewerCtxData ) {
                                    if( isSSR() ) {
                                        resizeMarkups( viewerCtxData.getSize() );
                                    } else {
                                        var viewport = viewerCtxData.getSize();
                                        viewerCtxData.setSize( viewport.width, viewport.height );
                                    }
                                }
                            } );
                        }, 'aw2DViewerController' );
                    }
                }

                /**
                 * Set new viewer dimensions
                 */
                $scope.$on( 'setViewerDimensions', function( _event, args ) {
                    if( !$scope.viewerLoading ) {
                        $scope.setViewerDimensions( args.newViewerWidth, args.newViewerHeight );
                    }
                } );

                /**
                 * Resize viewer function
                 *
                 * @function resizeViewer
                 * @memberOf NgElementDirectives.aw-2d-viewer.directive
                 */
                $scope.resizeViewer = function() {
                    var dimensions = $scope.getComputedViewerDimensions();

                    var curWidth = parseInt( $scope.twoDViewerWidth );
                    var curHeight = parseInt( $scope.twoDViewerHeight );

                    if( curWidth !== dimensions.viewerWidth || curHeight !== dimensions.viewerHeight ) {
                        $scope.twoDViewerWidth = dimensions.viewerWidth + 'px';
                        $scope.twoDViewerHeight = dimensions.viewerHeight + 'px';

                        $scope.loadProgressIndicatorWidth = dimensions.viewerWidth * 0.04 + 'px';
                        $scope.emmProgressIndicatorWidth = dimensions.viewerWidth * 0.08 + 'px';

                        $scope.$broadcast( 'setViewerDimensions', {
                            newViewerWidth: dimensions.viewerWidth,
                            newViewerHeight: dimensions.viewerHeight
                        } );
                    }
                };

                /**
                 * Deactivates the display if image capture in viewer upon deactivate image capture event.
                 *
                 * @returns {String} viewerComputedWidth Computed viewer width
                 */
                $scope.getComputedViewerDimensions = function() {
                    var viewerComputedWidth = parseInt( $scope.viewerWidth );
                    var viewerComputedHeight = parseInt( $scope.viewerHeight );

                    //var headerNodeElement = $element.find( '.aw-viewerjs-header' )[ 0 ];
                    //if( headerNodeElement ) {
                    //    viewerComputedHeight -= headerNodeElement.offsetHeight;
                    //}

                    var pos = 0;
                    var parentNodeElement = $element[ 0 ].parentNode;

                    if( parentNodeElement && parentNodeElement.className ) {
                        pos = parentNodeElement.className.indexOf( 'aw-viewerjs-dimensions' );
                    }

                    while( parentNodeElement && pos < 0 ) {
                        parentNodeElement = parentNodeElement.parentNode;

                        if( parentNodeElement && parentNodeElement.className ) {
                            pos = parentNodeElement.className.indexOf( 'aw-viewerjs-dimensions' );
                        }
                    }

                    if( parentNodeElement ) {
                        viewerComputedWidth = parentNodeElement.clientWidth;
                    }

                    return {
                        viewerWidth: viewerComputedWidth,
                        viewerHeight: viewerComputedHeight
                    };
                };

                /**
                 * Clean up the directive
                 *
                 * @param {Boolean} isReloadViewer boolean indicating if the cleanup is for reload
                 */
                function cleanUp( isReloadViewer ) {
                    if( _emmProgressIndicatorEvent ) {
                        eventBus.unsubscribe( _emmProgressIndicatorEvent );
                        _emmProgressIndicatorEvent = null;
                    }

                    if( _viewerProgressIndicatorEvent ) {
                        eventBus.unsubscribe( _viewerProgressIndicatorEvent );
                        _viewerProgressIndicatorEvent = null;
                    }

                    if( _replaceFileEvent ) {
                        eventBus.unsubscribe( _replaceFileEvent );
                        _replaceFileEvent = null;
                    }

                    if( viewerCtxData ) {
                        aw3dViewerService.updateStructureViewerVisibility( viewerCtxData.getViewerCtxNamespace(), false );
                    }

                    if( !isReloadViewer ) {
                        element = null;
                        scope = null;
                    } else {
                        if( _viewerCanvasDivElement && _viewerCanvasDivElement.parentNode ) {
                            _viewerCanvasDivElement.parentNode.removeChild( _viewerCanvasDivElement );
                        }
                    }
                    viewerCtxData.removeViewerConnectionProblemListener( resetViewerSettings );
                }

                /**
                 * setCurrentPage
                 *
                 * @param {Integer} currentPage page number
                 */
                function setCurrentPage( currentPage ) {
                    _currentPage = currentPage;

                    var pageValues = {
                        numPages: _numPages,
                        currentPage: _currentPage
                    };

                    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );
                }

                /**
                 * setNumPages
                 * @param {Integer} numPages total number of pages
                 */
                function setNumPages( numPages ) {
                    _numPages = numPages;

                    var pageValues = {
                        numPages: _numPages,
                        currentPage: _currentPage
                    };

                    appCtxSvc.updateCtx( 'awTwoDViewer', pageValues );
                }
                /**
                 * page function
                 *
                 * @param {Object} param up, down, or page #
                 */
                $scope.page = function( param ) {
                    var page = _currentPage;

                    if( param === 'up' ) {
                        ++page;
                    } else if( param === 'down' ) {
                        --page;
                    } else {
                        page = parseInt( param );
                    }

                    if( viewerCtxData && page > 0 && page <= _numPages ) {
                        setCurrentPage( page );
                        viewerCtxData.setCurrentPage( page );
                    }
                };

                $scope.getPageIndex = function() {
                    return _currentPage - 1;
                };

                $scope.setPage = function( pageNum ) {
                    viewerCtxData.setCurrentPage( pageNum );
                    setCurrentPage( pageNum );
                };

                $scope.fit2DView = function() {
                    viewerCtxData.fit2DView();
                };

                $scope.rotate2DCW90 = function() {
                    rotation += 90;
                    if( rotation > 180 )
                    {
                        rotation -= 360;
                    }
                    viewerCtxData.rotate2DCW90();
                };

                $scope.rotate2DCCW90 = function() {
                    rotation -= 90;
                    if( rotation < -180 )
                    {
                        rotation += 360;
                    }
                    viewerCtxData.rotate2DCCW90();
                };

                $scope.setMouseMovePan = function( bPan ) {
                    viewerCtxData.setMouseMovePan( bPan );
                };

                /**
                 * Set the viewport based on the vp info calculated when the markup was created.
                 * Call the appropriate function to do the calculations based on whether Server or
                 * Client Side Rendering is currently in effect.
                 *
                 * @param {object} markup the markup
                 */
                $scope.setViewportForMarkup = function( markup ) {
                    var vpt = null;

                    if( isSSR() ) {
                        vpt = setViewportForMarkupSSR( markup, viewerCtxData.getSize() );
                    } else {
                        vpt = setViewportForMarkupCSR( markup, viewerCtxData.getSize() );
                    }
                    viewerCtxData.set2DViewport( vpt.scale, vpt.center.x, vpt.center.y );
                };

                /**
                 * Make the viewport calculations needed for setting the viewport for Server Side Rendering
                 * where a new PNG image will be rendered on the server for display.
                 *
                 * @param {object} markup the markup
                 * @param {object} ctxVpt viewer context
                 * @returns {object} viewport
                 */
                function setViewportForMarkupSSR( markup, ctxVpt ) {
                    var mrkViewParam = markup.viewParam;

                    // Calculate the pixels-per-unit density.
                    var screenDim = ctxVpt.startWidth;
                    var docDimInUnits = ctxVpt.pageWidth;
                    var unitsMult = unitsMultiplier( ctxVpt.units );
                    var density = screenDim / docDimInUnits * unitsMult; // Inches is 1.0

                    // Calculate the original scale factor in effect when the markup was created.
                    var originalScale = mrkViewParam.scale * 96.0 * ( 1.0 / density );

                    // Calculate the markup center in document units.
                    var markupStartInDocUnits = {
                        x: markup.start.x * unitsMult / 96.0,
                        y: ctxVpt.pageHeight - markup.end.y * unitsMult / 96.0 // flip back to 0.0 at lower left.
                    };
                    var markupEndInDocUnits = {
                        x: markup.end.x * unitsMult / 96.0,
                        y: ctxVpt.pageHeight - markup.start.y * unitsMult / 96.0 // flip back to 0.0 at lower left.
                    };
                    var mrkCenter = {
                        x: markupStartInDocUnits.x + ( markupEndInDocUnits.x - markupStartInDocUnits.x ) * 0.5,
                        y: markupStartInDocUnits.y + ( markupEndInDocUnits.y - markupStartInDocUnits.y ) * 0.5
                    };

                    return { scale: originalScale, center: { x: mrkCenter.x, y: mrkCenter.y } };
                }

                /**
                 * Make the viewport calculations needed for setting the viewport for Client Side Rendering
                 * where a transform matrix will be used with the current canvas and SVG.
                 *
                 * @param {object} markup the markup
                 * @param {object} ctxVpt viewer context
                 * @returns {object} viewport
                 */
                function setViewportForMarkupCSR( markup, ctxVpt ) {
                    var mrkViewParam = markup.viewParam;

                    var unitsMult = unitsMultiplier( ctxVpt.units );

                    var originalScale = mrkViewParam.scale * 96.0 * ( 1.0 / unitsMult );
                    var mrkCenter = {
                        x: -( mrkViewParam.x * mrkViewParam.scale ),
                        y: -( mrkViewParam.y * mrkViewParam.scale )
                    };

                    return { scale: originalScale, center: { x: mrkCenter.x, y: mrkCenter.y } };
                }

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 */
                $scope.$on( '$destroy', function() {
                    aw3dViewerService.cleanUpPreviousView();
                    cleanUp( false );
                } );

                /**
                 * Set callback on window resize
                 */
                controller.setResizeCallback( $scope.resizeViewer );

                /**
                 * Set callback on window page
                 */
                utils2dViewer.setPageCallback( $scope.page );

                /**
                 * Set callback on fit all
                 */
                utils2dViewer.setFit2DCallback( $scope.fit2DView );

                /**
                 * Set callback on clockwise rotate 90 degree
                 */
                utils2dViewer.setRotateCWCallback( $scope.rotate2DCW90 );

                /**
                 * Set callback on counter clockwise rotate 90 degree
                 */
                utils2dViewer.setRotateCCWCallback( $scope.rotate2DCCW90 );

                /**
                 * Set callback on mouse move pan
                 */
                utils2dViewer.setMouseMovePanCallback( $scope.setMouseMovePan );

                /**
                 * Set callback on get page index
                 */
                utils2dViewer.setPageIndexCallback( $scope.getPageIndex );

                /**
                 * Set callback on set current page
                 */
                utils2dViewer.setCurrentPageCallback( $scope.setPage );

                /**
                 * Set callback on set viewport for markup
                 * This gives utils2dViewer a function to call here.  This allows another user, such as Markup2d.js
                 * to be able to call the utils2dViewer, which will call this one, which is able to call into
                 * JSCom such as ViewImpl2DPicSling to be able to call down into the Vis server.
                 */
                utils2dViewer.setViewportForMarkupCallback( $scope.setViewportForMarkup );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
