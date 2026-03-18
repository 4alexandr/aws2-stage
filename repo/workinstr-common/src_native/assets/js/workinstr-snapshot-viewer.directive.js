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
 * Defines the {@link NgElementDirectives.workinstr-snapshot-viewer}
 *
 * @module js/workinstr-snapshot-viewer.directive
 * @requires app
 * @requires js/aw-gwt-presenter.directive
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import imgViewer from 'js/ImgViewer';
import 'js/aw-universal-viewer.controller';
import 'js/localeService';
import 'js/workinstrSnapshotService';
import 'js/messagingService';

'use strict';

/**
 * Native Snapshot viewer directive
 *
 * @example <workinstr-snapshot-viewer data="snapshotDataset">...</workinstr-snapshot-viewer>
 *
 * @member workinstr-snapshot-viewer
 * @memberof NgElementDirectives
 *
 * @param {Object} $q - $q service
 * @param {Object} $timeout - $timeout service
 * @param {Object} localeSvc - locale service
 * @param {Object} workinstrSnapshotService - workinstr Snapshot service
 * @param {Object} msgSvc - messaging service
 *
 * @return {Object} workinstrSnapshotViewer directive
 */
app.directive( 'workinstrSnapshotViewer', [
    '$q',
    '$timeout',
    'localeService',
    'workinstrSnapshotService',
    'messagingService',
    function( $q, $timeout, localeSvc, workinstrSnapshotService, msgSvc ) {
        return {
            restrict: 'E',
            scope: {
                data: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/workinstr-snapshot-viewer.directive.html',
            link: function( $scope, $element, attrs, controller ) {
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
                 * Image capture event added.
                 */
                var _updateViewWithCaptureImageListener = null;

                /**
                 * Root node
                 */
                var _viewerCanvasDivElement = null;

                /**
                 * Deactivate image capture display event added.
                 */
                var _deactivateImageCaptureDisplayListener = null;

                /**
                 * EMM Progress indicator event subscription.
                 */
                var _emmProgressIndicatorEvent = null;

                /**
                 * On part table/ list selection change event listener - select the part on the viewer
                 */
                var _partSelectionChangeListener = null;

                /**
                 * Viewer progress inciator event subscription.
                 */
                var _viewerProgressIndicatorEvent = null;

                var viewerContextObj = $scope.data.fileData.file;

                var promise = controller.initViewer( $element, true );
                promise.then( function() {
                    scope.initNativeViewer( false );
                } );

                /**
                 * Initialize native viewer
                 *
                 * @function initNativeViewer
                 * @memberOf NgElementDirectives.workinstr-snapshot-viewer.directive
                 * @param {Boolean} isReloadViewer true if viewer is loaded after reload
                 */
                $scope.initNativeViewer = function( isReloadViewer ) {
                    var returnPromise = $q.defer();
                    var viewerElement = element.find( 'div#awNativeViewer' );

                    $scope.showViewerEmmProgress = true;
                    $scope.loadingViewer = true;
                    $scope.hasThumbnail = false;
                    $scope.displayImageCapture = false;
                    _setLoadingMsg();
                    if( $scope.resizeViewer ) {
                        $scope.resizeViewer();
                    }

                    $scope.$evalAsync( function() {
                        var ticket = null;
                        var openedEle = viewerContextObj;

                        if( viewerContextObj.thumbnailURL ) {
                            displayThumbnail( viewerContextObj.thumbnailURL );
                        } else if( openedEle.props && openedEle.props.awp0ThumbnailImageTicket ) {
                            ticket = openedEle.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
                            if( ticket && ticket.length > 28 ) {
                                var fileUrl = _getFileUrl( ticket );
                                if( fileUrl ) {
                                    displayThumbnail( fileUrl );
                                }
                            }
                        }
                    } );

                    registerViewerProgressIndicatorEvents();

                    if( isReloadViewer || !workinstrSnapshotService.isSameProductOpenedAsPrevious( viewerContextObj ) ) {
                        if( workinstrSnapshotService.isSameContextNamespaceAsPrevious( viewerContextObj ) ) {
                            workinstrSnapshotService.cleanUpPreviousView();
                        }
                        workinstrSnapshotService.getViewerLoadInputParameter( viewerContextObj, $scope.threeDViewerWidth, $scope.threeDViewerHeight ).then( function( viewerLoadInputParams ) {
                            viewerLoadInputParams.initializeViewerContext();
                            viewerCtxData = viewerLoadInputParams.getViewerContext();
                            _registerForConnectionProblems();
                            workinstrSnapshotService.getViewerView( viewerLoadInputParams ).then( function( viewerData ) {
                                _setupViewerAfterLoad( viewerElement, viewerData, viewerContextObj );
                                returnPromise.resolve( viewerData[ 0 ] );
                                $scope.showViewerEmmProgress = false;
                            }, function( errorMsg ) {
                                logger.error( 'Failed to load viewer : ' + errorMsg );
                                returnPromise.reject( errorMsg );
                                $scope.showViewerEmmProgress = false;
                            } );
                        } );
                    } else {
                        workinstrSnapshotService.restorePreviousView().then( function( viewerData ) {
                            _setupViewerAfterLoad( viewerElement, viewerData, viewerContextObj );
                            _registerForConnectionProblems();
                            returnPromise.resolve( viewerData[ 0 ] );
                            $scope.showViewerEmmProgress = false;
                        }, function( errorMsg ) {
                            logger.error( 'Failed to load viewer : ' + errorMsg );
                            returnPromise.reject( errorMsg );
                            $scope.showViewerEmmProgress = false;
                        } );
                    }
                };

                /**
                 * Display the thumbnail
                 *
                 * @param {String} fileUrl the thumbnail file url
                 */
                function displayThumbnail( fileUrl ) {
                    var thumbnailViewer = element.find( 'img#thumbnailViewer' )[ 0 ];
                    var jqThumbnailEle = $( thumbnailViewer );
                    jqThumbnailEle.attr( 'src', fileUrl );
                    $scope.hasThumbnail = true;
                    jqThumbnailEle.on( 'load', function() {
                        var imageNaturalWidth = parseInt( jqThumbnailEle[ 0 ].naturalWidth );
                        var imageNaturalHeight = parseInt( jqThumbnailEle[ 0 ].naturalHeight );
                        var containerWidth = parseInt( $scope.threeDViewerWidth );
                        var containerHeight = parseInt( $scope.threeDViewerHeight );
                        var adjustedHeight = null;
                        var adjustedWidth = null;

                        if( containerWidth >= containerHeight ) {
                            adjustedHeight = containerHeight;
                            adjustedWidth = imageNaturalWidth * adjustedHeight / imageNaturalHeight;
                        } else {
                            adjustedWidth = containerWidth;
                            adjustedHeight = adjustedWidth * imageNaturalHeight / imageNaturalWidth;
                        }
                        jqThumbnailEle.css( 'height', adjustedHeight + 'px' );
                        jqThumbnailEle.css( 'width', adjustedWidth + 'px' );
                    } );
                }

                /**
                 * Gets the file URL from ticket
                 *
                 * @param {String} ticket the file ticket
                 * @return {String} file URL resolved from ticket
                 */
                function _getFileUrl( ticket ) {
                    return 'fms/fmsdownload/?ticket=' + ticket;
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
                };

                /**
                 * Subscribes to viewer and emm progress indicator events.
                 */
                function registerViewerProgressIndicatorEvents() {
                    if( _emmProgressIndicatorEvent === null ) {
                        _emmProgressIndicatorEvent = eventBus.subscribe( 'emmProgressIndicator', function( eventData ) {
                            $timeout( function() {
                                $scope.showViewerEmmProgress = eventData.emmProgressIndicatorStatus;
                            } );
                        }, 'workinstrSnapshotViewerController' );
                    }

                    if( _viewerProgressIndicatorEvent === null ) {
                        _viewerProgressIndicatorEvent = eventBus.subscribe( 'progressIndicator', function( eventData ) {
                            $timeout( function() {
                                $scope.showViewerProgress = eventData.progressIndicatorStatus;
                            } );
                        }, 'workinstrSnapshotViewerController' );
                    }
                }

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
                    viewerElement.append( _viewerCanvasDivElement );
                    $scope.loadingViewer = false;
                    viewerCtxData = viewerData[ 0 ];
                    viewerCtxData.setZoomReversed( true );
                    viewerCtxData.getSelectionManager().setSelectionEnabled( true );
                    _registerForOtherViewerEvents();
                    viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );
                    if( $scope.resizeViewer ) {
                        $scope.resizeViewer();
                    }
                }

                /**
                 * Register for viewer events
                 */
                function _registerForOtherViewerEvents() {
                    if( _updateViewWithCaptureImageListener === null ) {
                        _updateViewWithCaptureImageListener = eventBus.subscribe(
                            'imageCapture.updateViewWithCaptureImage',
                            function( eventData ) {
                                _displayImageCapture( eventData.fileUrl );
                            }, 'workinstrSnapshotViewer' );
                    }

                    if( _deactivateImageCaptureDisplayListener === null ) {
                        _deactivateImageCaptureDisplayListener = eventBus.subscribe(
                            'imageCapture.deactivateImageCaptureDisplay',
                            function() {
                                _deactivateImageCaptureDisplay();
                            }, 'workinstrSnapshotViewer' );
                    }

                    if( _partSelectionChangeListener === null ) {
                        _partSelectionChangeListener = eventBus.subscribe(
                            'workinstr.selectionChange',
                            function( eventData ) {
                                if( eventData.activeTab.id === 'Parts' || eventData.activeTab.id === 'Tools' ) {
                                    var selectedObjects = eventData.dataProvider.selectedObjects;
                                    if( selectedObjects.length > 0 ) {
                                        _selectPartOnViewer( selectedObjects[ 0 ] );
                                    } else {
                                        viewerCtxData.getSelectionManager().selectPartsInViewer();
                                    }
                                }
                            }, 'workinstrSnapshotViewer' );
                    }
                }

                /**
                 * On part table/ list selection change event listener - select the part on the viewer
                 *
                 * @param {Object} selectedObj - the object to select on viewer
                 */
                var _selectPartOnViewer = function( selectedObj ) {
                    var selectedPartCsid = workinstrSnapshotService.getCloneStableId( selectedObj );
                    if( selectedPartCsid && selectedPartCsid !== null && !_.isEmpty( selectedPartCsid ) ) {
                        viewerCtxData.getSelectionManager().selectPartsInViewer( [ selectedPartCsid ] );
                    }
                };

                /**
                 * Display image capture upon trigger of image capture event.
                 *
                 * @param {String} fileUrl - Image capture url.
                 */
                var _displayImageCapture = function( fileUrl ) {
                    if( fileUrl ) {
                        $scope.displayImageCapture = true;
                        _removeImageCapturePanel();
                        var displayImgCaptureDiv = document.createElement( 'div' );
                        displayImgCaptureDiv.setAttribute( 'id', 'awDisplayImageCapture' );
                        displayImgCaptureDiv.style.position = 'relative';
                        element[ 0 ].childNodes[ 0 ].append( displayImgCaptureDiv );
                        var displayImageElement = element.find( 'div#awDisplayImageCapture' );
                        displayImageElement.width( $scope.threeDViewerWidth );
                        displayImageElement.height( $scope.threeDViewerHeight );
                        imgViewer.init( displayImageElement[ 0 ] );
                        imgViewer.setImage( fileUrl );
                    } else {
                        logger.error( 'Failed to display image capture due to missing image url.' );
                    }
                };

                /**
                 * Deactivates the display if image capture in viewer upon deactivate image capture event.
                 */
                var _deactivateImageCaptureDisplay = function() {
                    $scope.$apply( function() {
                        $scope.displayImageCapture = false;
                        _removeImageCapturePanel();
                    } );
                };

                /**
                 * Removes image capture display div added at runtime in order to display captured image.
                 */
                var _removeImageCapturePanel = function() {
                    var displayImageElement = element.find( 'div#awDisplayImageCapture' );
                    if( displayImageElement && displayImageElement.length > 0 ) {
                        displayImageElement[ 0 ].parentNode.removeChild( displayImageElement[ 0 ] );
                    }
                };

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
                    $scope.initNativeViewer( true );
                }

                /**
                 * set the viewer dimensions
                 *
                 * @function setViewerDimensions
                 * @param {Number} viewerWidthToSet viewer width
                 * @param {Number} viewerHeightToSet viewer height
                 */
                $scope.setViewerDimensions = function( viewerWidthToSet, viewerHeightToSet ) {
                    if( viewerCtxData ) {
                        viewerCtxData.setSize( parseInt( viewerWidthToSet ), parseInt( viewerHeightToSet ) );
                    }
                };

                /**
                 * Set new viewer dimensions
                 */
                $scope.$on( 'setViewerDimensions', function( _event, args ) {
                    $scope.setViewerDimensions( args.newViewerWidth, args.newViewerHeight );
                } );

                /**
                 * Clean up the directive
                 * @param {Boolean} isReloadViewer boolean indicating if the cleanup is for reload
                 */
                function cleanUp( isReloadViewer ) {
                    if( _deactivateImageCaptureDisplayListener ) {
                        eventBus.unsubscribe( _deactivateImageCaptureDisplayListener );
                        _deactivateImageCaptureDisplayListener = null;
                    }

                    if( _partSelectionChangeListener ) {
                        eventBus.unsubscribe( _partSelectionChangeListener );
                        _partSelectionChangeListener = null;
                    }

                    if( _updateViewWithCaptureImageListener ) {
                        eventBus.unsubscribe( _updateViewWithCaptureImageListener );
                        _updateViewWithCaptureImageListener = null;
                    }

                    if( _emmProgressIndicatorEvent ) {
                        eventBus.unsubscribe( _emmProgressIndicatorEvent );
                        _emmProgressIndicatorEvent = null;
                    }

                    if( _viewerProgressIndicatorEvent ) {
                        eventBus.unsubscribe( _viewerProgressIndicatorEvent );
                        _viewerProgressIndicatorEvent = null;
                    }

                    if( viewerCtxData ) {
                        workinstrSnapshotService.updateStructureViewerVisibility( viewerCtxData.getViewerCtxNamespace(), false );
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
                 * Resize viewer function
                 *
                 * @function resizeViewer
                 * @memberOf NgElementDirectives.aw-3d-viewer.directive
                 */
                $scope.resizeViewer = function() {
                    $scope.threeDViewerWidth = $scope.viewerWidth;
                    $scope.threeDViewerHeight = $scope.viewerHeight;

                    var containerWidth = parseInt( $scope.threeDViewerWidth );
                    $scope.loadProgressIndicatorWidth = containerWidth * 0.04 + 'px';
                    $scope.emmProgressIndicatorWidth = containerWidth * 0.08 + 'px';
                    $scope.$broadcast( 'setViewerDimensions', {
                        newViewerWidth: $scope.viewerWidth,
                        newViewerHeight: $scope.viewerHeight
                    } );
                };

                /**
                 * Set callback on window resize
                 */
                controller.setResizeCallback( $scope.resizeViewer );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 */
                $scope.$on( '$destroy', function() {
                    cleanUp( false );
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
