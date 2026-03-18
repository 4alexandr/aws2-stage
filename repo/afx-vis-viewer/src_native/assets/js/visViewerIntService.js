// Copyright (c) 2020 Siemens
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';
import 'config/visConfiguration';
import declUtils from 'js/declUtils';
import Debug from 'Debug';

const trace = new Debug( 'vis-web-viewer:visViewerIntService' );

/**
 * VisWeb instance store.
 */
const visWebInstanceStore = {
    getInstance( id ) {
        return this[ id ];
    },
    addInstance( id, instance ) {
        this[ id ] = instance;
    },
    removeInstance( id ) {
        delete this[ id ];
    },
    getExtensionManagerInstance( visId, extension ) {
        let extensionManager = this.getInstance( visId ).Viewer.viewerManager.getExtensionManager( extension );
        if( !extensionManager ) {
            extensionManager = this.getInstance( visId ).Viewer.addExtension( extension );
        }
        return extensionManager;
    }
};

/**
 * Find the correct instance of visWeb and store it in visWebInstance store for future usage.
 * @param {*} vm viewModel
 */
const _findAndStoreInstance = ( vm ) => {
    const viewId = vm.getViewId();
    const instance = document.querySelector( `[view-id=${viewId}] mfe-vis-web` );
    vm.visContext = {};
    vm.visContext.id = Symbol( viewId );
    visWebInstanceStore.addInstance( vm.visContext.id, instance );
    trace( 'Vis instance %s stored', Symbol( viewId ) );
};

/**
 * Create service proxy.
 * @param {String} serviceProxy name
 * @return {Promise} promise.
 */
const _createProxyService = ( serviceProxy ) => {
    return declUtils.loadDependentModule( serviceProxy );
};
/**
 * @param {String} viewId viewer ID
 * @returns {Object} config
 */
const _readAndValidateConfig = ( viewId ) => {
    const configs = cfgSvc.getCfgCached( 'visConfiguration' );
    if( Object.keys( configs ).length === 0 ) {
        throw 'Missing visConfiguration: visServiceProxy.json has been replaced with visConfiguration.json!';
    }
    const config = configs[ viewId ];
    if( !config ) {
        throw `No Configuration defined for ${viewId}!`;
    }
    if( !config.serviceProxy ) {
        throw `No serviceProxy defined for ${viewId}!`;
    }
    if( !config.licenseKey ) {
        throw `No licenseKey defined for ${viewId}!`;
    }
    return config;
};
/**
 * Initial setup of thr viewer
 * @module js/visViewerIntService
 * @param {*} vm  data (the viewModel)
 *
 */
const setupViewer = ( vm ) => {
    _findAndStoreInstance( vm );
    const visWeb = visWebInstanceStore.getInstance( vm.visContext.id );
    const config = _readAndValidateConfig( vm.getViewId() );
    visWeb.licenseKey = config.licenseKey;
    _createProxyService( config.serviceProxy ).then( ( serviceProxy ) => {
        if( typeof serviceProxy === 'function' ) {
            visWeb.serviceProxy = new serviceProxy();
        } else {
            visWeb.serviceProxy = serviceProxy;
        }
    } );
    visWeb.onError = ( error ) => {
        console.log( error );
    };
    const sourceId = vm.visContext.id;
    visWeb.Viewer.addEventListener( visWeb.EventEnum.ON_PART_SELECTED, ( event, selectedObject ) => {
        eventBus.publish( 'visViewer.partSelectionChanged', { sourceId: sourceId, selection: selectedObject } );
    } );
    visWeb.Viewer.addEventListener( visWeb.EventEnum.VISIBILITY_STATE_CHANGED, ( event, eventData ) => {
        eventBus.publish( 'visViewer.visibilityChanged', { sourceId: sourceId, eventData: eventData } );
    } );
    visWeb.ps = {};
    visWeb.ps.onStartDeRegistration = visWeb.ProgressService.onStart( () => {
        trace( 'Busy...' );
        eventBus.publish( 'visViewer.busyIndicator', { sourceId: sourceId, show: true } );
    } );
    visWeb.ps.onUpdateDeRegistration = visWeb.ProgressService.onUpdate( msg => {
        trace( msg );
        // Disabled for now
        // eventBus.publish( 'visViewer.busyIndicator.updateMsg', { sourceId: sourceId, message: msg } );
    } );
    visWeb.ps.onEndDeRegistration = visWeb.ProgressService.onEnd( () => {
        trace( 'End.' );
        eventBus.publish( 'visViewer.busyIndicator', { sourceId: sourceId, show: false } );
    } );
    setMouseNavigationMode( vm.visContext, 'rotate' );
};
/**
 * A helper method to return the same value as provided. used to change viewModel's property
 *@memberof visViewerIntService.Util
 * @param {Object} value to wrapped in an object
 * @returns{Object} an object
 */
const returnMe = ( value ) => {
    return { newValue: value };
};

/**
 * Destroy the vis context and remove instance from the store.
 * @param {*} vm viewModel
 */
const destroy = ( vm ) => {
    if( vm.visContext === undefined ) {
        trace( `Invalid!! vm: ${vm}` );
        return;
    }
    const visWeb = visWebInstanceStore.getInstance( vm.visContext.id );
    if( visWeb ) {
        visWeb.ps.onStartDeRegistration();
        visWeb.ps.onUpdateDeRegistration();
        visWeb.ps.onEndDeRegistration();
        visWebInstanceStore.removeInstance( vm.visContext.id );
    }
    delete vm.visContext;
};

/**
 * Update visibility of the provided node.
 * @param {Symbol} visId instance Id.
 * @param {String} modelId the model id to load
 * @param {boolean} show flag to show/hide in the viewer.
 * @returns{Promise} a promise.
 */
const setVisibilityById = ( visId, modelId, show ) => {
    if( visId === 'unknown' || modelId === 'unknown' ) {
        trace( 'Initializing!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    if( !visWeb || !modelId ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    return visWeb.Viewer.setVisibilityById( modelId, show ).then( ( stats ) => {
        trace( stats );
        return stats;
    } );
};

/**
 * Update selection status of the provided node.
 * @param {Symbol} visId instance Id
 * @param {String} modelId to select
 * @param {boolean} isSelected flag to select/unselect
 * @returns {Promise} a promise
 */
const setSelectionById = ( visId, modelId, isSelected ) => {
    if( visId === 'unknown' || modelId === 'unknown' ) {
        trace( 'Initializing:selection port!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    if( !visWeb || !modelId ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    return visWeb.Viewer.setSelectionById( modelId, isSelected );
};

const fitAll = visId => {
    visWebInstanceStore.getInstance( visId ).Viewer.fitAll();
};

const setMouseNavigationMode = ( visContext, mode ) => {
    let currentMode;
    const visWeb = visWebInstanceStore.getInstance( visContext.id );
    if( mode === 'pan' ) {
        currentMode = 'pan';
        visWebInstanceStore.getInstance( visContext.id ).Viewer.viewerManager.setMouseNavigationMode( visWeb.MouseMode.PAN );
    }
    if( mode === 'rotate' ) {
        currentMode = 'rotate';
        visWebInstanceStore.getInstance( visContext.id ).Viewer.viewerManager.setMouseNavigationMode( visWeb.MouseMode.CONTEXT );
    }
    if( mode === 'zoom' ) {
        currentMode = 'zoom';
        visWebInstanceStore.getInstance( visContext.id ).Viewer.viewerManager.setMouseNavigationMode( visWeb.MouseMode.ZOOM );
    }
    visContext.currentMouseNavigationMode = currentMode;
};

const captureSnapshot = visId => {
    const snapshotManager = visWebInstanceStore.getInstance( visId ).Snapshot;
    snapshotManager.setSnapshotEnabled( true );
    snapshotManager.createSnapshotInPNG( dataURL => {
        const link = document.createElement( 'a' );
        link.setAttribute( 'href', dataURL );
        link.setAttribute( 'download', 'download.png' );
        link.click();
    } );
};
/**
 * Get the visWeb instance.
 * @param {Symbol} visId of the instance
 * @returns{Object} visWeb instance
 */
const getVisWebInstance = ( visId ) => visWebInstanceStore.getInstance( visId );

const getPMITreeForPart = ( visId, selectedParts, args ) => {
    const eventName = 'visViewer.publishPMITree';
    if( !visId || !selectedParts ) {
        eventBus.publish( eventName, { sourceId: visId, modelId: selectedParts, PMITree: {}, error: 'Invalid Parameters!!' } );
        return;
    }
    const pmiMgr = visWebInstanceStore.getInstance( visId ).PMI;
    pmiMgr.getPmiStructureInfoByModelId( selectedParts[ 0 ], args ).then( tree => {
        eventBus.publish( eventName, { sourceId: visId, modelId: selectedParts[ 0 ], PMITree: tree, error: undefined } );
    } ).catch( e => {
        eventBus.publish( eventName, { sourceId: visId, modelId: selectedParts[ 0 ], PMITree: {}, error: e } );
    } );
};

const setVisibilityForPMIById = ( visId, psId, show, parentPsId, args ) => {
    if( visId === 'unknown' || psId === 'unknown' ) {
        trace( 'Initializing:visibility port for PMI tree!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    if( !visWeb || !psId ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    const pmiMgr = visWeb.PMI;
    return pmiMgr.setVisibilityByPsId( psId, show, () => {
        eventBus.publish( 'visViewer.publishPMITreeVisibility', { sourceId: visId, PMITree: pmiMgr.getPmiStructureInfo( parentPsId, args ), show: show } );
    } );
};

const setSelectionForPMI = ( visId, selectedpsId, isLeaf ) => {
    if( visId === 'unknown' || selectedpsId === 'unknown' || isLeaf === 'unknown' ) {
        trace( 'Initializing:selection port for PMI tree!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    if( !visWeb || !selectedpsId ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    const pmiMgr = visWeb.PMI;
    pmiMgr.setSelectionByPsId( selectedpsId, true );
    if( isLeaf ) {
        pmiMgr.alignCameraToPmi( selectedpsId );
    }
};

const setStandardView = ( visId, standardViewType ) => {
    const visWeb = visWebInstanceStore.getInstance( visId );
    visWeb.Viewer.viewerManager.setCameraToStandardView( visWeb.StandardViewType[ standardViewType ] );
};

const getConfigurations = ( visId ) => {
    const configs = visWebInstanceStore.getInstance( visId ).Configurator.getConfig();
    return { configs: configs };
};

const saveConfiguration = ( visId, configs ) => {
    visWebInstanceStore.getInstance( visId ).Configurator.updateAllConfigs( configs );
};

const setVisibilityOfObjectsInViewer = ( visId, modelIds, visibility ) => {
    if( !visId || !modelIds ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    visWeb.Viewer.setVisibilityOfObjectsInViewer( modelIds, visibility );
};

const setVisibilityOfSelectedOnly = ( visId, selectedModelIds ) => {
    if( !visId || !selectedModelIds ) {
        trace( 'Invalid Parameters!!' );
        return Promise.resolve();
    }
    setVisibilityOfAllObjectsInViewer( visId, false );
    setVisibilityOfObjectsInViewer( visId, selectedModelIds, true );
};

const setVisibilityOfAllObjectsInViewer = ( visId, visibility ) => {
    if( !visId ) {
        trace( 'Invalid Parameter!!' );
        return Promise.resolve();
    }
    const visWeb = visWebInstanceStore.getInstance( visId );
    visWeb.Viewer.setVisibilityOfAllObjectsInViewer( visibility );
};

export default {
    setupViewer,
    destroy,
    setVisibilityById,
    setSelectionById,
    fitAll,
    setMouseNavigationMode,
    captureSnapshot,
    returnMe,
    getVisWebInstance,
    getPMITreeForPart,
    setVisibilityForPMIById,
    setSelectionForPMI,
    setStandardView,
    getConfigurations,
    saveConfiguration,
    setVisibilityOfObjectsInViewer,
    setVisibilityOfSelectedOnly,
    setVisibilityOfAllObjectsInViewer
};
