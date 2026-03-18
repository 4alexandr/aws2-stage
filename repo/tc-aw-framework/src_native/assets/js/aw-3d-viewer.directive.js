// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to show native viewer
 *
 * @module js/aw-3d-viewer.directive
 */
import * as app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imgViewer from 'js/ImgViewer';
import logger from 'js/logger';
import soaService from 'soa/kernel/soaService';
import 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import 'js/viewerRender.service';
import 'js/awIconService';
import 'js/localeService';
import 'js/messagingService';
import 'js/aw3dViewerService';
import 'js/viewerPreference.service';
import dmSvc from 'soa/dataManagementService';

'use strict';

/**
 * 3D viewer directive
 *
 * @member aw-3d-viewer
 * @memberof NgElementDirectives
 *
 * @return {Void}
 */
app.directive( 'aw3dViewer', [
    '$q',
    'appCtxService',
    'awIconService',
    'localeService',
    'messagingService',
    'viewerRenderService',
    'aw3dViewerService',
    'viewerPreferenceService',
    'soa_kernel_clientDataModel',
    '$timeout',
    function( $q, appCtxSvc, awIconSvc, localeSvc, msgSvc, viewerRenderService, aw3dViewerService, viewerPreferenceService, cdm, $timeout ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-3d-viewer.directive.html',
            scope: false,
            link: function( $scope, $element ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'awNativeViewer';

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
                 * Viewer progress inciator event subscription.
                 */
                var _viewerProgressIndicatorEvent = null;

                /**
                 * Render source changed event Listener
                 */
                var _renderSourceChangedEventListener = null;

                /**
                 * Model view proxy selection changed
                 */
                var _mvProxySelectionChangedEventListener = null;

                /**
                 * Initialize native viewer
                 *
                 * @function getSelectedModelObject
                 * @memberOf NgElementDirectives.aw-3d-viewer.directive
                 * @returns {Object} Selected object to be opened
                 */
                function getSelectedModelObject() {
                    var selectedMO = appCtxSvc.getCtx( 'mselected' );
                    var returnMO = null;
                    if( Array.isArray( selectedMO ) && selectedMO.length > 0 ) {
                        returnMO = selectedMO[ 0 ];
                        var selectedMOType = returnMO.modelType;
                        let subLocationContext = appCtxSvc.getCtx( 'sublocation' );
                        if( subLocationContext && subLocationContext.label === 'Disclosure' ) {
                            let inputData = {
                                primaryObjects: [ cdm.getObject( returnMO.uid ) ],
                                pref: {
                                    expItemRev: false,
                                    returnRelations: true,
                                    info: [ {
                                        relationTypeName: 'Fnd0DisclosingObject'
                                    } ]
                                }
                            };
                            return soaService.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', inputData ).then( ( response ) => {
                                if( Array.isArray( response.output ) && response.output[ 0 ] &&
                                    Array.isArray( response.output[ 0 ].relationshipData ) && response.output[ 0 ].relationshipData[ 0 ] &&
                                    Array.isArray( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) && response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ]
                                ) {
                                    return cdm.getObject( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject.uid );
                                }
                                return returnMO;
                            } ).catch( ( error ) => {
                                logger.error( 'failed to load relation : ' + error );
                                throw 'Could not find collector structure';
                            } );
                        } else if( $scope.$parent.whoAmI === 'awUniversalViewerController' && selectedMOType &&
                            selectedMOType.typeHierarchyArray.indexOf( 'CAEAnalysisRevision' ) > -1 ||
                            selectedMOType.typeHierarchyArray.indexOf( 'CAEResultRevision' ) > -1 ) {
                            var viewerData = $scope.$parent.data;
                            if( viewerData ) {
                                var contextObjectUid = null;
                                if( viewerData.datasetData && viewerData.datasetData.uid ) {
                                    contextObjectUid = viewerData.datasetData.uid;
                                } else if( viewerData.uid ) {
                                    contextObjectUid = viewerData.uid;
                                }
                                returnMO = cdm.getObject( contextObjectUid );
                                return $q.resolve( returnMO );
                            }
                        } else {
                            return dmSvc.getProperties( [ returnMO.uid ], [ 'IMAN_Rendering' ] ).then( function() {
                                var renderedObj = cdm.getObject( returnMO.uid );
                                if( Array.isArray( renderedObj.props.IMAN_Rendering.dbValues ) && renderedObj.props.IMAN_Rendering.dbValues.length > 0 ) {
                                    return returnMO;
                                }
                                var viewerData = $scope.$parent.data;
                                if( viewerData ) {
                                    var contextObjectUid = null;
                                    if( viewerData.datasetData && viewerData.datasetData.uid ) {
                                        contextObjectUid = viewerData.datasetData.uid;
                                    } else if( viewerData.uid ) {
                                        contextObjectUid = viewerData.uid;
                                    }
                                    return cdm.getObject( contextObjectUid );
                                }
                            } );
                        }
                    }
                }

                /**
                 * Initialize native viewer
                 *
                 * @function initNativeViewer
                 * @memberOf NgElementDirectives.aw-3d-viewer.directive
                 * @param {Boolean} isReloadViewer true if viewer is loaded after reload
                 */
                $scope.initNativeViewer = function( isReloadViewer ) {
                    var returnPromise = $q.defer();
                    var viewerElement = element.find( 'div#awNativeViewer' );
                    var selectedObj;

                    getSelectedModelObject().then( function( returnMO ) {
                        selectedObj = returnMO;
                        $scope.showViewerEmmProgress = true;
                        $scope.loadingViewer = true;
                        $scope.hasThumbnail = false;
                        $scope.displayImageCapture = false;
                        _setLoadingMsg();
                        if( $scope.resizeViewer ) {
                            $scope.resizeViewer();
                        }

                        $scope.$evalAsync( function() {
                            var thumbnailViewer = element.find( 'img#thumbnailViewer' )[ 0 ];
                            var jqThumbnailEle = $( thumbnailViewer );
                            var ticket = null;
                            var openedEle = selectedObj;

                            if( openedEle.props && openedEle.props.awp0ThumbnailImageTicket ) {
                                ticket = openedEle.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
                            }

                            if( ticket && ticket.length > 28 ) {
                                var fileUrl = _getFileUrl( ticket );
                                if( fileUrl ) {
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
                            }
                        } );

                        registerViewerProgressIndicatorEvents();
                        registerRenderSourceChangeEvents();

                        if( isReloadViewer || !aw3dViewerService.isSameProductOpenedAsPrevious( selectedObj ) ) {
                            aw3dViewerService.cleanUpPreviousView();
                            aw3dViewerService.getViewerLoadInputParameterPromise( selectedObj, $scope.threeDViewerWidth, $scope.threeDViewerHeight ).then( function(
                                viewerLoadInputParams ) {
                                viewerLoadInputParams.initializeViewerContext();
                                viewerCtxData = viewerLoadInputParams.getViewerContext();
                                _registerForConnectionProblems();
                                aw3dViewerService.getViewerView( viewerLoadInputParams ).then( function( viewerData ) {
                                    _setupViewerAfterLoad( viewerElement, viewerData, selectedObj );
                                    returnPromise.resolve( viewerData[ 0 ] );
                                    $scope.showViewerEmmProgress = false;
                                }, function( errorMsg ) {
                                    logger.error( 'Failed to load viewer : ' + errorMsg );
                                    returnPromise.reject( errorMsg );
                                    $scope.showViewerEmmProgress = false;
                                } );
                            } ).catch( function( error ) {
                                logger.error( 'Failed to load input param : ' + error );
                            } );
                        } else {
                            aw3dViewerService.restorePreviousView().then( function( viewerData ) {
                                aw3dViewerService.updateStructureViewerVisibility( viewerData[ 0 ].getViewerCtxNamespace(), true );
                                _setupViewerAfterLoad( viewerElement, viewerData, selectedObj );
                                _registerForConnectionProblems();
                                returnPromise.resolve( viewerData[ 0 ] );
                                $scope.showViewerEmmProgress = false;
                            }, function( errorMsg ) {
                                logger.error( 'Failed to load viewer : ' + errorMsg );
                                returnPromise.reject( errorMsg );
                                $scope.showViewerEmmProgress = false;
                            } );
                        }
                    } );
                    return returnPromise.promise;
                };

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
                    _registerForOtherViewerEvents();
                    viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );
                    if( $scope.resizeViewer ) {
                        $scope.resizeViewer();
                    }
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
                 * Register for viewer events
                 */
                function _registerForOtherViewerEvents() {
                    if( _updateViewWithCaptureImageListener === null ) {
                        _updateViewWithCaptureImageListener = eventBus.subscribe(
                            'imageCapture.updateViewWithCaptureImage',
                            function( eventData ) {
                                _displayImageCapture( eventData.fileUrl );
                            }, 'aw3dViewer' );
                    }

                    if( _deactivateImageCaptureDisplayListener === null ) {
                        _deactivateImageCaptureDisplayListener = eventBus.subscribe(
                            'imageCapture.deactivateImageCaptureDisplay',
                            function() {
                                _deactivateImageCaptureDisplay();
                            }, 'aw3dViewer' );
                    }

                    if( _mvProxySelectionChangedEventListener === null ) {
                        _mvProxySelectionChangedEventListener = eventBus.subscribe(
                            'ObjectSet_2_Provider.selectionChangeEvent',
                            function( eventData ) {
                                viewerCtxData.getModelViewManager().invokeModelViewProxy( eventData.selectedObjects[ 0 ].props.fnd0DisclosedModelView.dbValues[ 0 ] );
                            }, 'aw3dViewer' );
                    }
                }

                /**
                 * Register for viewer visibility events
                 */
                function _registerForConnectionProblems() {
                    viewerCtxData.addViewerConnectionProblemListener( reloadViewer );
                }

                /**
                 * Reload view
                 */
                function reloadViewer() {
                    cleanUp( true );
                    return $scope.initNativeViewer( true );
                }

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
                    $timeout( function() {
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

                var promise = $scope.initViewer( $element, true );
                promise.then( function() {
                    scope.initNativeViewer( false );
                } );

                /**
                 * Subscribes to viewer and emm progress indicator events.
                 */
                function registerViewerProgressIndicatorEvents() {
                    if( _emmProgressIndicatorEvent === null ) {
                        _emmProgressIndicatorEvent = eventBus.subscribe( 'emmProgressIndicator', function( eventData ) {
                            $timeout( function() {
                                $scope.showViewerEmmProgress = eventData.emmProgressIndicatorStatus;
                            } );
                        }, 'aw3DViewerController' );
                    }

                    if( _viewerProgressIndicatorEvent === null ) {
                        _viewerProgressIndicatorEvent = eventBus.subscribe( 'progressIndicator', function( eventData ) {
                            $timeout( function() {
                                $scope.showViewerProgress = eventData.progressIndicatorStatus;
                            } );
                        }, 'aw3DViewerController' );
                    }
                }

                /**
                 * subscribes render source change listener
                 */
                function registerRenderSourceChangeEvents() {
                    if( _renderSourceChangedEventListener === null ) {
                        _renderSourceChangedEventListener = eventBus.subscribe( 'viewerSettings.renderSourceChanged', function() {
                            reloadViewer()
                                .catch( function( errorMsg ) {
                                    if( errorMsg.toString() === 'Error: Failed to open model: MMV is not supported for Client Side rendering.' ) {
                                        viewerPreferenceService.setRenderSource( 'SSR' );
                                        reloadViewer();
                                    }
                                } );
                        }, 'aw3DViewerController' );
                    }
                }

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

                    if( _renderSourceChangedEventListener ) {
                        eventBus.unsubscribe( _renderSourceChangedEventListener );
                        _renderSourceChangedEventListener = null;
                    }

                    if( _mvProxySelectionChangedEventListener ) {
                        eventBus.unsubscribe( _mvProxySelectionChangedEventListener );
                        _mvProxySelectionChangedEventListener = null;
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
                    viewerCtxData.removeViewerConnectionProblemListener( reloadViewer );
                }

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 */
                $scope.$on( '$destroy', function() {
                    cleanUp( false );
                } );
            }
        };
    }
] );
