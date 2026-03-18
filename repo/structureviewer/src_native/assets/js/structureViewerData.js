// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This module holds structure viewer 3D data
 *
 * @module js/structureViewerData
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imgViewer from 'js/ImgViewer';
import logger from 'js/logger';
import awPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import strViewerSelectionHandlerPvd from 'js/structureViewerSelectionHandlerProvider';
import strViewerVisibilityHandlerPvd from 'js/structureViewerVisibilityHandlerProvider';
import StructureViewerService from 'js/structureViewerService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import AwWindowService from 'js/awWindowService';
import AwTimeoutService from 'js/awTimeoutService';
import structureSearchService from 'js/structureSearchService';
import visLaunchInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import productLaunchInfoProviderService from 'js/productLaunchInfoProviderService';
import viewerPreferenceService from 'js/viewerPreference.service';
import TracelinkSelectionHandler from 'js/tracelinkSelectionHandler';

export default class StructureViewerData {
    /**
     * StructureViewerData constructor
     * @param {Object} viewerContainerElement - The DOM element to contain the viewer canvas
     * @param {Object} occmgmtContextNameKey occmgmt context name key
     */
    constructor( viewerContainerElement, occmgmtContextNameKey ) {
        if( _.isNull( viewerContainerElement ) || _.isUndefined( viewerContainerElement ) ) {
            logger.error( 'Viewer container element can not be null' );
            throw 'Viewer container element can not be null';
        }
        if( _.isNull( occmgmtContextNameKey ) || _.isUndefined( occmgmtContextNameKey ) || _.isEmpty( occmgmtContextNameKey ) ) {
            logger.error( 'Occmgmt context key name can not be null' );
            throw 'Occmgmt context key name can not be null';
        }
        this.viewerContainerElement = viewerContainerElement;
        this.occmgmtContextNameKey = occmgmtContextNameKey;
        this.viewerImageCaptureContainer = null;
        this.viewerCtxData = null;
        this.viewerContext = null;
        this.structureViewerSelectionHandler = null;
        this.structureViewerVisibilityHandler = null;
        this.colorGroupingProperty = null;
        this.colorCriteria = [];
        this.ROOT_ID = '';

        //Events subscriptions
        this.resizeTimeoutPromise = null;
        this.modelObjectUpdatedEvent = null;
        this.modelObjectRelatedDataModifiedEvent = null;
        this.newElementAddedEvent = null;
        this.productContextInfoChangedEvent = null;
        this.awGroupObjCategoryChangeEventListener = null;
        this.colorTogglingEventListener = null;
        this.viewerSearchEventSub = null;
        this.cleanup3DViewEvent = null;
        this.mvProxySelectionChangedEventListener = null;
        this.restoreActionListener = null;
    }

    /**
     * Initialize 3D viewer.
     * @param {Object} subPanelContext Sub panel context
     * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
     */
    initialize3DViewer( subPanelContext, force3DViewerReload ) {
        let self = this;
        self.setViewerLoadingStatus( true );
        if( !force3DViewerReload ) {
            self.setIndexedPreference();
        }
        self.viewerContext = StructureViewerService.instance.getPCIModelObject( self.occmgmtContextNameKey );
        return TracelinkSelectionHandler.instance.arePrefsFilled().then( () => {
            let isShowAll = true;
            let isRootLogical = TracelinkSelectionHandler.instance.isRootSelectionTracelinkType();
            if( isRootLogical ) {
                isShowAll = false;
            } else if( appCtxSvc.ctx.hasOwnProperty( 'showGraphics' ) ) {
                isShowAll = appCtxSvc.ctx.showGraphics;
            }
            if( force3DViewerReload ||
               !StructureViewerService.instance.isAppSessionBeingOpened( self.viewerContext ) &&
                !StructureViewerService.instance.isSameProductOpenedAsPrevious( self.viewerContext, self.occmgmtContextNameKey ) ) {
                return StructureViewerService.instance.cleanUpPreviousView( self.occmgmtContextNameKey ).then( () => {
                    return StructureViewerService.instance.getViewerLoadInputParameter( self.viewerContext,
                        self.compute3DViewerWidth(), self.compute3DViewerHeight(), isShowAll, null, self.occmgmtContextNameKey );
                } ).then( ( viewerLoadInputParams ) => {
                    viewerLoadInputParams.initializeViewerContext();
                    self.viewerCtxData = viewerLoadInputParams.getViewerContext();
                    self.setup3DViewerVisibilityHandler();
                    self.registerForConnectionProblems();
                    let resetDeferred = awPromiseService.instance.defer();
                    if( StructureViewerService.instance.checkIfResetWasPerformedOnPci( self.occmgmtContextNameKey ) ) {
                        StructureViewerService.instance.cleanupAutoBookmark( self.occmgmtContextNameKey ).then( () => {
                            resetDeferred.resolve( viewerLoadInputParams );
                        } ).catch( ( error ) => {
                            logger.error( 'Failed to remove bookmark ticket : ' + error );
                            resetDeferred.resolve( viewerLoadInputParams );
                        } );
                    } else {
                        resetDeferred.resolve( viewerLoadInputParams );
                    }
                    return resetDeferred.promise;
                } ).then( ( viewerLoadInputParams ) => {
                    return StructureViewerService.instance.getViewerView( viewerLoadInputParams, self.occmgmtContextNameKey );
                } ).then( ( viewerData ) => {
                    if( StructureViewerService.instance.hasAlternatePCI( StructureViewerService.instance.getViewerPCIToBeLoaded( self.occmgmtContextNameKey ) ) ) {
                        viewerData[ 0 ].setHasAlternatePCI( true );
                    } else {
                        viewerData[ 0 ].setHasAlternatePCI( false );
                    }
                    return viewerData;
                } );
            }
            return StructureViewerService.instance.restorePreviousView( self.occmgmtContextNameKey ).then( ( viewerData ) => {
                AwTimeoutService.instance( function() {
                    eventBus.publish( 'emmProgressIndicator', {
                        viewerContext: viewerData[ 0 ].getViewerCtxNamespace(),
                        emmProgressIndicatorStatus: false
                    } );
                }, 500 );
                return viewerData;
            } );
        } ).then( ( viewerData ) => {
            self.viewerContainerElement.append( viewerData[ 1 ] );
            self.viewerCtxData = viewerData[ 0 ];
            self.viewerCtxData.getSelectionManager().setSelectionEnabled( true );
            StructureViewerService.instance.setOccmgmtContextNameKeyOnViewerContext( self.viewerCtxData.getViewerCtxNamespace(), self.occmgmtContextNameKey );
            self.viewerCtxData.updateCurrentViewerProductContext( appCtxSvc.getCtx( self.occmgmtContextNameKey ).topElement );
            self.setup3DViewerSelectionHandler( subPanelContext.selectedModelObjects );
            self.setup3DViewerVisibilityHandler();
            self.setupViewerImageCaptureContainer();
            self.registerForResizeEvents();
            self.registerForLongPressIn3D();
            self.registerForOther3ViewerEvents();
            self.registerForAceSearchEvent();
            self.registerAsViewerLaunchInfoProvider();
            StructureViewerService.instance.deregisterFilterReloadEvent();
            self.setViewerLoadingStatus( false );
            StructureViewerService.instance.setHasDisclosureData( self.viewerCtxData.getViewerCtxNamespace(),
                appCtxSvc.getCtx( self.occmgmtContextNameKey ).currentState.uid );
            AwTimeoutService.instance( function() {
                self.set3DViewerSize();
            } );
            return this;
        } ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            self.setViewerLoadingStatus( false );
            return error;
        } );
    }

    /**
     * Initializes Indexed/Non-Indexed Mode
     */
    setIndexedPreference() {
        let uIds = StructureViewerService.instance.getPCIModelObject( this.occmgmtContextNameKey );
        if( !StructureViewerService.instance.isSameProductOpenedAsPrevious( uIds, this.occmgmtContextNameKey ) ) {
            let pciModelObj = StructureViewerService.instance.getViewerPCIToBeLoaded( this.occmgmtContextNameKey );
            if( StructureViewerService.instance.hasAlternatePCI( pciModelObj ) ) {
                viewerPreferenceService.setUseAlternatePCIPreference( 'INDEXED' );
            } else {
                viewerPreferenceService.setUseAlternatePCIPreference( 'NO_INDEXED' );
            }
        }
    }

    /**
     * Set 3d viewer loading status
     * @param {Boolean} isLoading is viewer loading
     */
    setViewerLoadingStatus( isLoading ) {
        this.isLoading = isLoading;
        eventBus.publish( 'sv.viewerLoadingStatus', {
            viewerContext: StructureViewerService.instance.getViewerCtxNamespaceUsingOccmgmtKey( this.occmgmtContextNameKey ),
            loadingStatus: isLoading
        } );
    }

    /**
     * Register for viewer visibility events
     */
    registerForConnectionProblems() {
        this.viewerCtxData.addViewerConnectionProblemListener( this.handle3DViewerConnectionProblem, this );
    }

    /**
     * Handler for 3D viewer connection issues
     * @param {Object} viewerCtxDataRef - reference to viewer context data
     */
    handle3DViewerConnectionProblem() {
        this.notify3DViewerReload();
    }

    /**
     * Notify reset parameters  for 3D viewer reload
     */
    notifyResetParametersFor3DReload() {
        eventBus.publish( 'sv.resetParametersFor3DReload', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload event
     */
    notify3DViewerReload() {
        eventBus.publish( 'sv.reload3DViewer', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload for PCI change event
     */
    notify3DViewerReloadForPCIChange() {
        eventBus.publish( 'sv.reload3DViewerForPCI', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify display image capture
     * @param {Boolean} isShow - boolean indicating if image capture should be shown
     */
    notifyDisplayImageCapture( isShow ) {
        eventBus.publish( 'sv.displayImageCapture', {
            viewerContext: this.viewerCtxData.getViewerCtxNamespace(),
            isShow: isShow
        } );
    }

    /**
     * Reload 3D viewer.
     * @param {Object} subPanelContext Sub panel context
     */
    reload3DViewer( subPanelContext ) {
        if( this.isLoading ) {
            return awPromiseService.instance.reject( 'Already loading!' );
        }
        let self = this;
        this.notifyResetParametersFor3DReload();
        let currentlyInvisibleCsids = this.viewerCtxData.getVisibilityManager().getInvisibleCsids()
            .slice();
        let currentlyInvisibleExpCsids = this.viewerCtxData.getVisibilityManager()
            .getInvisibleExceptionCsids().slice();
        this.ctrlCleanup( true );
        viewerPreferenceService.setEnableDrawingPref( false );
        return this.initialize3DViewer( subPanelContext, true ).then( () => {
            self.viewerCtxData.getVisibilityManager().restoreViewerVisibility( currentlyInvisibleCsids, currentlyInvisibleExpCsids ).then( function() {
                viewerPreferenceService.setEnableDrawingPref( true );
                self.viewerCtxData.getDrawManager().enableDrawing( true );
                self.structureViewerVisibilityHandler.viewerVisibilityChangedListener();
            } );
        } ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            return awPromiseService.instance.reject( error );
        } );
    }

    /**
     * Reload 3D viewer for PCI change.
     * @param {Object} subPanelContext Sub panel context
     */
    reload3DViewerForPCIChange( subPanelContext ) {
        if( this.isLoading ) {
            return;
        }
        this.notifyResetParametersFor3DReload();
        this.ctrlCleanup( true );
        this.initialize3DViewer( subPanelContext, true );
    }

    /**
     * Set 3d Viewer size
     */
    set3DViewerSize() {
        let self = this;
        if( this.resizeTimeoutPromise ) {
            AwTimeoutService.instance.cancel( this.resizeTimeoutPromise );
        }
        this.resizeTimeoutPromise = AwTimeoutService.instance( function() {
            self.resizeTimeoutPromise = null;
            self.viewerCtxData.setSize( self.compute3DViewerWidth(), self.compute3DViewerHeight() );
        }, 250 );
    }

    /**
     * Compute 3D viewer height
     */
    compute3DViewerHeight() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientHeight;
    }

    /**
     * Compute 3D viewer width
     */
    compute3DViewerWidth() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientWidth;
    }

    /**
     * Setup 3D viewer visibility handler
     */
    setup3DViewerVisibilityHandler() {
        if( this.structureViewerVisibilityHandler === null ) {
            this.structureViewerVisibilityHandler = strViewerVisibilityHandlerPvd.getStructureViewerVisibilityHandler( this.viewerCtxData );
            this.structureViewerVisibilityHandler.registerForVisibilityEvents( this.occmgmtContextNameKey );
        }
    }

    /**
     * Setup 3D viewer selection handler
     * @param {Array} selections - Array of selected model objects
     */
    setup3DViewerSelectionHandler( selections ) {
        let self = this;
        if( self.structureViewerSelectionHandler === null ) {
            self.structureViewerSelectionHandler = strViewerSelectionHandlerPvd
                .getStructureViewerSelectionHandler( self.viewerCtxData );
            self.structureViewerSelectionHandler.registerForSelectionEvents();
        }
        if( !_.isNull( selections ) && !_.isUndefined( selections ) && !_.isEmpty( selections ) ) {
            let selectionType = self.structureViewerSelectionHandler.getSelectionType( selections );
            if( selectionType === 'OCC_SELECTED' ) {
                StructureViewerService.instance.ensureMandatoryPropertiesForCsidLoaded( selections ).then(
                    function() {
                        let newlySelectedCsids = [];
                        for( let i = 0; i < selections.length; i++ ) {
                            let csid = objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] );
                            newlySelectedCsids.push( csid );
                        }
                        self.structureViewerSelectionHandler.determineAndSelectPackedOccs( selections, newlySelectedCsids );
                        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
                    }
                ).catch( function( error ) {
                    logger.error( 'SsructureViewerData : Failed to load mandatory properties to compute CSID : ' + error );
                } );
            }
        } else {
            let openedElement = appCtxSvc.getCtx( self.occmgmtContextNameKey ).openedElement;
            let topElement = appCtxSvc.getCtx( self.occmgmtContextNameKey ).topElement;
            if( openedElement.uid !== topElement.uid ) {
                let openedElementCsid = objectToCSIDGeneratorService.getCloneStableIdChain( openedElement );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [ openedElement ] );
                self.viewerCtxData.getSelectionManager().setContext( [ openedElementCsid ] );
            } else {
                self.viewerCtxData.getSelectionManager().setContext( [ self.ROOT_ID ] );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [] );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( [] );
            }
            StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
        }
    }

    /**
     * Setup viewer image capture container
     */
    setupViewerImageCaptureContainer() {
        let self = this;
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        _.forEach( currElement.children, ( child ) => {
            if( child.id === 'imageCaptureContainer' ) {
                self.viewerImageCaptureContainer = child;
                return false;
            }
        } );
    }

    /**
     * Register for 3D viewer long press
     */
    registerForLongPressIn3D() {
        this.viewerCtxData.addViewerLongPressListener( this.handle3DViewerLongPress, this );
    }

    /**
     * Handler for 3D viewer connection issues
     */
    handle3DViewerLongPress() {
        this.enableMultiSelectionInACEAnd3D();
    }

    /**
     * Enable multi-selection mode in 3D and ACE
     */
    enableMultiSelectionInACEAnd3D() {
        eventBus.publish( 'primaryWorkarea.multiSelectAction', { multiSelect: true } );
        this.viewerCtxData.getSelectionManager().setMultiSelectModeInViewer( true );
        this.viewerCtxData.setUseTransparency( false );
        let currentlySelectedModelObjs = this.viewerCtxData.getSelectionManager().getSelectedModelObjects();
        let aceMultiSelectionEventData = {};
        if( _.isNull( currentlySelectedModelObjs ) || _.isUndefined( currentlySelectedModelObjs ) || _.isEmpty( currentlySelectedModelObjs ) ) {
            currentlySelectedModelObjs = [];
        }
        aceMultiSelectionEventData.elementsToSelect = currentlySelectedModelObjs;
        aceMultiSelectionEventData.multiSelect = true;
        eventBus.publish( 'aceElementsSelectedEvent', aceMultiSelectionEventData );
    }

    /**
     * Display image capture upon trigger of image capture event.
     *
     * @param {String} fileUrl - Image capture url.
     */
    displayImageCapture( fileUrl ) {
        if( fileUrl ) {
            this.notifyDisplayImageCapture( true );
            this.viewerImageCaptureContainer.innerHTML = '';
            let displayImgCaptureDiv = document.createElement( 'div' );
            displayImgCaptureDiv.id = 'awDisplayImageCapture';
            this.viewerImageCaptureContainer.appendChild( displayImgCaptureDiv );
            imgViewer.init( this.viewerImageCaptureContainer );
            imgViewer.setImage( fileUrl );
        } else {
            logger.error( 'Failed to display image capture due to missing image url.' );
        }
    }

    /**
     * Deactivates the display if image capture in viewer upon deactivate image capture event.
     */
    deactivateImageCaptureDisplayInView() {
        this.notifyDisplayImageCapture( false );
        this.viewerImageCaptureContainer.innerHTML = '';
    }

    /**
     * Set property based coloring criteria for Viewer
     *
     * @param {Object} eventData Event data containing property matched values grouping proerty attribute
     */
    setPropertyBasedColoringCriteria( eventData ) {
        this.colorCriteria = eventData.propGroupingValues;
        this.colorGroupingProperty = eventData.internalPropertyNameToGroupOn;
        let colorPref = appCtxSvc.getCtx( 'preferences' ).AWC_ColorFiltering[ 0 ];
        if( colorPref === 'true' ) {
            this.viewerCtxData.getCriteriaColoringManager().enableCriteriaColoring( this.colorGroupingProperty, this.colorCriteria );
        }
    }

    /**
     * Change color criteria state
     *
     * @param {Object} eventData Event data containing coloring criteria state.
     */
    changeColoringCriteriaState( eventData ) {
        var colorCriteriaState = eventData.dataVal;
        if( colorCriteriaState === 'true' && this.colorCriteria !== null && this.colorGroupingProperty !== null ) {
            this.viewerCtxData.getCriteriaColoringManager().enableCriteriaColoring( this.colorGroupingProperty, this.colorCriteria );
        } else {
            this.viewerCtxData.getCriteriaColoringManager().disableCriteriaColoring();
        }
    }

    /**
     * Model view proxy
     *
     * @param {Object} eventData Event data for model view proxy
     */
    applyModelViewProxy( eventData ) {
        if( eventData && Array.isArray( eventData.selectedObjects ) && eventData.selectedObjects.length > 0 ) {
            this.viewerCtxData.getModelViewManager().invokeModelViewProxy( eventData.selectedObjects[ 0 ].props.fnd0DisclosedModelView.dbValues[ 0 ] );
        }
    }

    /**
     * Handle render source changed event
     * @param {Object} subPanelContext Sub panel context
     */
    handleRenderSourceChanged( subPanelContext ) {
        this.reload3DViewer( subPanelContext );
    }

    /**
     * Register for viewer resize events
     */
    registerForResizeEvents() {
        let self = this;
        // Handle Window resize event
        AwWindowService.instance.onresize = function() {
            self.set3DViewerSize();
        };
    }

    /**
     * Register for ace related events
     */
    registerForOther3ViewerEvents() {
        let self = this;
        if( this.modelObjectUpdatedEvent === null ) {
            this.modelObjectUpdatedEvent = eventBus.subscribe( 'cdm.updated', function( eventData ) {
                if( eventData && !_.isEmpty( eventData.modifiedObjects ) ) {
                    for( let i = 0; i < eventData.modifiedObjects.length; i++ ) {
                        let modifiedObj = eventData.modifiedObjects[ i ];
                        if( modifiedObj.type === 'DirectModel' ) {
                            self.notify3DViewerReload();
                            break;
                        }
                    }
                }
            }, 'structureViewerData' );
        }

        if( this.modelObjectRelatedDataModifiedEvent === null ) {
            this.modelObjectRelatedDataModifiedEvent = eventBus.subscribe( 'cdm.relatedModified', function( eventData ) {
                if( eventData && !_.isEmpty( eventData.childObjects ) ) {
                    for( let i = 0; i < eventData.childObjects.length; i++ ) {
                        let childObj = eventData.childObjects[ i ];
                        if( childObj.type === 'DirectModel' ) {
                            self.notify3DViewerReload();
                            break;
                        }
                    }
                }
            }, 'structureViewerData' );
        }

        if( this.newElementAddedEvent === null ) {
            this.newElementAddedEvent = eventBus.subscribe( 'addElement.elementsAdded', function( eventData ) {
                if( eventData && eventData.viewToReact && eventData.viewToReact === self.occmgmtContextNameKey ) {
                    self.notify3DViewerReload();
                }
            }, 'structureViewerData' );
        }

        if( this.productContextInfoChangedEvent === null ) {
            this.productContextInfoChangedEvent = eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
                let isReload3DView = false;
                let aceContext = appCtxSvc.getCtx( eventData.updatedView );
                if( !( aceContext && !_.isUndefined( aceContext.transientRequestPref ) && !_.isUndefined( aceContext.transientRequestPref.reloadDependentTabs ) &&
                        aceContext.transientRequestPref.reloadDependentTabs === 'false' ) ) {
                    let newProductCtx = StructureViewerService.instance.getPCIModelObject( self.occmgmtContextNameKey );
                    if( newProductCtx && self.viewerContext.uid !== newProductCtx.uid ) {
                        isReload3DView = true;
                    }
                }
                if( aceContext && aceContext.requestPref && aceContext.requestPref.recipeReset === 'true' ) {
                    isReload3DView = true;
                }

                if( isReload3DView && !StructureViewerService.instance.checkIfResetWasPerformedOnPci( self.occmgmtContextNameKey ) ) {
                    self.notify3DViewerReloadForPCIChange();
                } else {
                    let splitViewMode = false;
                    if( appCtxSvc.getCtx( 'splitView' ) ) {
                        splitViewMode = appCtxSvc.getCtx( 'splitView' ).mode;
                    }
                    if( splitViewMode && StructureViewerService.instance.checkIfResetWasPerformedOnPci( self.occmgmtContextNameKey ) ) {
                        StructureViewerService.instance.cleanUpPreviousView( self.occmgmtContextNameKey )
                            .then( () => {
                                return StructureViewerService.instance.cleanupAutoBookmark( self.occmgmtContextNameKey );
                            } ).then( () => {
                                if( !_.isNull( self ) && !_.isUndefined( self ) ) {
                                    self.notify3DViewerReloadForPCIChange();
                                }
                            } ).catch( ( error ) => {
                                logger.error( 'Failed to cleanup AutoBookmark : ' + error );
                            } );
                    }
                }
            }, 'structureViewerData' );
        }

        if( this.awGroupObjCategoryChangeEventListener === null ) {
            this.awGroupObjCategoryChangeEventListener = eventBus.subscribe( 'ace.groupObjectCategoryChanged', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.setPropertyBasedColoringCriteria( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.colorTogglingEventListener === null ) {
            this.colorTogglingEventListener = eventBus.subscribe( 'aw.ColorFilteringToggleEvent', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.changeColoringCriteriaState( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.mvProxySelectionChangedEventListener === null ) {
            this.mvProxySelectionChangedEventListener = eventBus.subscribe( 'mvProxyDataProvider.selectionChangeEvent', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.applyModelViewProxy( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.cleanup3DViewEvent === null ) {
            this.cleanup3DViewEvent = eventBus.subscribe( 'sv.cleanup3DView', function() {
                AwTimeoutService.instance( function() {
                    let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                    let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                    if( occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                        let occmgmtCtx = appCtxSvc.getCtx( self.occmgmtContextNameKey );
                        if( _.isNull( occmgmtCtx ) || _.isUndefined( occmgmtCtx ) || occmgmtCtx.activeTabTitle !== '3D' ) {
                            self.ctrlCleanup( false );
                        }
                    }
                }, 500 );
            }, 'structureViewerData' );
        }

        if( this.restoreActionListener === null ) {
            this.restoreActionListener = eventBus.subscribe( 'acePwa.reset', () => {
                if( self.viewerCtxData && !self.viewerCtxData.isConnectionClosed() ) {
                    let occmgmtContextFromViewerContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
                    if( occmgmtContextFromViewerContext && occmgmtContextFromViewerContext.restoreProduct ) {
                        self.viewerCtxData.getSessionMgr().applyAutoBookmark().then( () => {
                            viewerPreferenceService.loadViewerPreferencesFromVisSession( self.viewerCtxData );
                        } ).catch( () => {
                            logger.error( 'failed to apply bookmark' );
                        } );
                    }
                }
            }, 'structureViewerData' );
        }
    }

    /**
     * Register for Ace search
     */
    registerForAceSearchEvent() {
        let self = this;
        structureSearchService.startListeningSearchEvent();
        if( this.viewerSearchEventSub === null ) {
            this.viewerSearchEventSub = eventBus.subscribe( 'sv.ApplySearchCriteriaEvent', ( eventData ) => {
                if( eventData && eventData.activeContext === self.occmgmtContextNameKey ) {
                    let searchCriteriaJSON = JSON.stringify( eventData.searchCriteria );
                    if( searchCriteriaJSON !== undefined ) {
                        self.viewerCtxData.getSearchMgr().performSearch( 'Awb0FullTextSearchProvider', searchCriteriaJSON, -1,
                            self.viewerCtxData.ViewerSearchActions.SET_VIEW_ONLY ).then( () => {
                            logger.debug( 'Structureviewer: Viewer Search operation completed' );
                        } ).catch( ( error ) => {
                            logger.error( 'Structureviewer: Viewer Search operation failed:' + error );
                        } );
                    }
                }
            } );
        }
    }

    /**
     * Registers Product Context launch api
     */
    registerAsViewerLaunchInfoProvider() {
        productLaunchInfoProviderService.setViewerContextData( this.viewerCtxData );
        visLaunchInfoProvider.registerProductContextToLaunchVis( productLaunchInfoProviderService.getProductToLaunchableOccMap );
    }

    /**
     * Clean up the current
     * @param {Boolean} isReloadViewer - boolean indicating if viewer is reloading while clean up.
     */
    ctrlCleanup( isReloadViewer ) {
        if( this.structureViewerSelectionHandler ) {
            this.structureViewerSelectionHandler.cleanUp();
            this.structureViewerSelectionHandler = null;
        }

        if( this.structureViewerVisibilityHandler ) {
            this.structureViewerVisibilityHandler.cleanUp();
            this.structureViewerVisibilityHandler = null;
        }

        if( this.viewerCtxData ) {
            this.viewerCtxData.removeViewerConnectionProblemListener( this.handle3DViewerConnectionProblem );
            appCtxSvc.unRegisterCtx( this.viewerCtxData.getViewerCtxNamespace() );
        }

        if( this.modelObjectUpdatedEvent ) {
            eventBus.unsubscribe( this.modelObjectUpdatedEvent );
            this.modelObjectUpdatedEvent = null;
        }

        if( this.modelObjectRelatedDataModifiedEvent ) {
            eventBus.unsubscribe( this.modelObjectRelatedDataModifiedEvent );
            this.modelObjectRelatedDataModifiedEvent = null;
        }

        if( this.newElementAddedEvent ) {
            eventBus.unsubscribe( this.newElementAddedEvent );
            this.newElementAddedEvent = null;
        }

        if( this.productContextInfoChangedEvent ) {
            eventBus.unsubscribe( this.productContextInfoChangedEvent );
            this.productContextInfoChangedEvent = null;
        }

        if( this.awGroupObjCategoryChangeEventListener ) {
            eventBus.unsubscribe( this.awGroupObjCategoryChangeEventListener );
            this.awGroupObjCategoryChangeEventListener = null;
        }

        if( this.colorTogglingEventListener ) {
            eventBus.unsubscribe( this.colorTogglingEventListener );
            this.colorTogglingEventListener = null;
        }

        if( this.viewerSearchEventSub ) {
            eventBus.unsubscribe( this.viewerSearchEventSub );
            this.viewerSearchEventSub = null;
        }

        if( this.mvProxySelectionChangedEventListener ) {
            eventBus.unsubscribe( this.mvProxySelectionChangedEventListener );
            this.mvProxySelectionChangedEventListener = null;
        }

        if( this.cleanup3DViewEvent ) {
            eventBus.unsubscribe( this.cleanup3DViewEvent );
            this.cleanup3DViewEvent = null;
        }

        if( this.restoreActionListener ) {
            eventBus.unsubscribe( this.restoreActionListener );
            this.restoreActionListener = null;
        }

        visLaunchInfoProvider.resetProductContextInfo();
        productLaunchInfoProviderService.clearViewerCtxData();

        if( isReloadViewer ) {
            this.viewerContainerElement[ 0 ].innerHTML = '';
        }

        let sideNavConfig = appCtxSvc.getCtx( 'awSidenavConfig' );
        if( sideNavConfig && sideNavConfig.globalSidenavContext &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav.open &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav.pinned ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'globalNavigationSideNav'
            } );
        }
    }

    /**
     * Trigger dynamic update of viewer.
     * This will cause the viewer to requery Tc for the current product
     * structure and then add and/or remove parts from the model as needed.
     * @param {Object} occmgmtContextNameKey occmgmt context name key
     */
    reconfigureViewer( occmgmtContextNameKey ) {
        this.viewerContext = StructureViewerService.instance.getPCIModelObject( occmgmtContextNameKey );

        if( this.viewerCtxData ) {
            var options = 0; // hint on how to handle orphan objects - 0 Keep, 1 Discard

            var seachMgr = this.viewerCtxData.getSearchMgr();

            if( seachMgr ) {
                seachMgr.reconfigure( this.viewerContext.uid, options );
            }
        }
    }
}
