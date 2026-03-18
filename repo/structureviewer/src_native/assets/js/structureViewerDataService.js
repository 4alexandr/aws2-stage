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
 * @module js/structureViewerDataService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import StructureViewerService from 'js/structureViewerService';
import awPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import StructureViewerData from 'js/structureViewerData';
import awIconService from 'js/awIconService';

var exports = {};

/**
 * Set structure viewer namespace
 * @param {Object} occmgmtContextKey occmgmt context name key
 */
export let setStructureViewerNamespace = function( occmgmtContextKey ) {

    let occmgmtContextOnLeft = false;
    let occmgmtContextOnRight = false;

    let isSplitMode = appCtxSvc.getCtx( 'splitView.mode' );
    let splitViewKeys = appCtxSvc.getCtx( 'splitView.viewKeys' );
    if( isSplitMode && splitViewKeys && splitViewKeys.length === 2 ) {
        occmgmtContextOnLeft = occmgmtContextKey === splitViewKeys[ 0 ];
        occmgmtContextOnRight = occmgmtContextKey === splitViewKeys[ 1 ];
    }
    else {
        occmgmtContextOnLeft = occmgmtContextKey === 'occmgmtContext';
    }

    return {
        'viewerCtxNamespace': StructureViewerService.instance.getViewerCtxNamespaceUsingOccmgmtKey( occmgmtContextKey ),
        'occmgmtContextOnLeft': occmgmtContextOnLeft,
        'occmgmtContextOnRight': occmgmtContextOnRight,
        'occmgmtContextKey':occmgmtContextKey
    };
};

/**
 * Set thumbnail url
 * @param {Object} occmgmtContextNameKey occmgmt context name key
 */
export let setThumbnailUrl = function( occmgmtContextNameKey ) {
    return awIconService.getThumbnailFileUrl( appCtxSvc.getCtx( occmgmtContextNameKey ).topElement );
};

/**
 * Initialize 3D viewer.
 * @param {Object} data Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
 */
export let initialize3DViewer = function( data, subPanelContext, force3DViewerReload ) {
    let viewerContainerDivEle = null;
    if( data && data.viewContainerProp && data.viewContainerProp.viewerContainerDiv ) {
        viewerContainerDivEle = data.viewContainerProp.viewerContainerDiv;
    } else {
        throw 'The viewer container div can not be null';
    }
    let structureViewerInstance = null;
    if( data.svInstance && data.svInstance instanceof StructureViewerData ) {
        structureViewerInstance = data.svInstance;
        let deferred = awPromiseService.instance.defer();
        structureViewerInstance.reload3DViewer().then( () => {
            deferred.resolve( structureViewerInstance );
        } ).catch( ( error ) => {
            logger.error( error );
            deferred.resolve( structureViewerInstance );
        } );
        return deferred.promise;
    }
    structureViewerInstance = new StructureViewerData( viewerContainerDivEle, subPanelContext.contextKey );
    return structureViewerInstance.initialize3DViewer( subPanelContext, force3DViewerReload );
};

/**
 * Reload 3D viewer.
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewer = function( svInstance, subPanelContext ) {
    if( svInstance && typeof svInstance.reload3DViewer === 'function' ) {
        svInstance.reload3DViewer( subPanelContext );
    }
};

/**
 * Reload 3D viewer for PCI change.
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewerForPCIChange = function( svInstance, subPanelContext ) {
    if( svInstance && typeof svInstance.reload3DViewerForPCIChange === 'function' ) {
        svInstance.reload3DViewerForPCIChange( subPanelContext );
    }
};

/**
 * Handle render source changed event
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let renderSourceChanged = function( svInstance, subPanelContext ) {
    if( svInstance && typeof svInstance.handleRenderSourceChanged === 'function' ) {
        svInstance.handleRenderSourceChanged( subPanelContext );
    }
};

/**
 * Resize 3D viewer
 * @param {Object} svInstance Data from viewmodel
 */
export let set3DViewerSize = function( svInstance ) {
    if( svInstance && typeof svInstance.set3DViewerSize === 'function' ) {
        svInstance.set3DViewerSize();
    }
};

/**
 * Display image capture
 * @param {Object} svInstance Data from viewmodel
 * @param {String} fileUrl Image file url
 */
export let displayImageCapture = function( svInstance, fileUrl ) {
    if( svInstance && typeof svInstance.displayImageCapture === 'function' ) {
        svInstance.displayImageCapture( fileUrl );
    }
};

/**
 * Deactivate image capture
 * @param {Object} svInstance Data from viewmodel
 */
export let deactivateImageCaptureDisplayInView = function( svInstance ) {
    if( svInstance && typeof svInstance.deactivateImageCaptureDisplayInView === 'function' ) {
        svInstance.deactivateImageCaptureDisplayInView();
    }
};

/**
 * Send message to Vis to reconfigure viewer.
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} svInstance Data from viewmodel
 */
export let reconfigure3DViewer = function( svInstance, occmgmtContextNameKey ) {
    if( svInstance && typeof svInstance.reconfigureViewer === 'function' ) {
        svInstance.reconfigureViewer( occmgmtContextNameKey );
    }
};

/**
 * Reset parameters for 3D reload
 * @param {Boolean} isLoading - boolen indicating if 3D viewer loading is in progress
 * @returns {Array} - Array with reset parameters
 */
export let resetParametersFor3DReload = function() {
    return [ {
        'displayImageCapture': false,
        'loadingViewer': true,
        'showViewerEmmProgress': true,
        'showViewerProgress': false
    } ];
};

/**
 * Set viewer loading status
 * @param {Boolean} isLoading boolen indicating if viewer is loading
 * @returns {Boolean} boolean indicating if viewer is loading
 */
export let setViewerLoadingStatus = function( isLoading ) {
    return isLoading;
};

/**
 * Display image capture
 * @param {Boolean} isShow boolen indicating if image capture should be shown
 * @returns {Boolean} boolean indicating boolen indicating if image capture should be shown
 */
export let setDisplayImageCapture = function( isShow ) {
    return isShow;
};

/**
 * Show viewer emm progress
 * @param {Boolean} isShow boolen indicating is emm progress indicator should be shown
 * @returns {Boolean} boolean indicating if emm progress indicator should be shown
 */
export let showViewerEmmProgress = function( isShow ) {
    return isShow;
};

/**
 * Show viewer progress
 * @param {Boolean} isShow boolen indicating is viewer progress indicator should be shown
 * @returns {Boolean} boolean indicating if viewer progress indicator should be shown
 */
export let showViewerProgress = function( isShow ) {
    return isShow;
};

/**
 * cleanup 3D view
 * @param {String} viewerCtxNamespace viewer namespace
 */
export let cleanup3DViewer = function( viewerCtxNamespace ) {
    eventBus.publish( 'sv.cleanup3DView', { 'viewerCtxNamespace': viewerCtxNamespace } );
};

export default exports = {
    setStructureViewerNamespace,
    setThumbnailUrl,
    initialize3DViewer,
    reload3DViewer,
    reload3DViewerForPCIChange,
    renderSourceChanged,
    set3DViewerSize,
    displayImageCapture,
    deactivateImageCaptureDisplayInView,
    reconfigure3DViewer,
    resetParametersFor3DReload,
    setViewerLoadingStatus,
    setDisplayImageCapture,
    showViewerEmmProgress,
    showViewerProgress,
    cleanup3DViewer
};

app.factory( 'structureViewerDataService', () => exports );
