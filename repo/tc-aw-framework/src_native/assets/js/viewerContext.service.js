// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link NgServices.viewerContextService} which provides utility functions for viewer
 *
 * @module js/viewerContext.service
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import prefService from 'soa/preferenceService';
import commandPanelService from 'js/commandPanel.service';
import viewerIntrSvcProvider from 'js/viewerInteractionServiceProvider';
import viewerCtxDataProvider from 'js/viewerContextDataProvider';
import vmoSvc from 'js/viewModelObjectService';
import viewerPreferenceService from 'js/viewerPreference.service';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';

import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

/**
 * reference to self
 */
let exports = {};

/**
 * Registered viewer context
 */
var registeredViewerContext = {};

/**
 * Viewer visibility subscription for event from viewer ctx
 */
var viewerVisibilitySubViewerCtx = null;

/**
 * Viewer visibility subscription for event from app ctx
 */
var viewerVisibilitySubAppCtx = null;

/**
 * viewer visibility token
 */
export let VIEWER_VISIBILITY_TOKEN = 'isViewerRevealed';

/**
 * Viewer types
 */
export let ViewerType = {
    GwtViewer: 'GwtViewer',
    JsViewer: 'JsViewer'
};

/**
 * viewer view mode token
 */
export let VIEWER_VIEW_MODE_TOKEN = 'viewerViewMode';

/**
 * Viewer states
 */
export let ViewerViewModes = {
    VIEWER3D: 'VIEWER3D',
    VIEWER2D: 'VIEWER2D',
    NOVIEWER: 'NOVIEWER'
};

/**
 * Viewer license levels
 */
export let ViewerLicenseLevels = {
    BASE: 0,
    STANDARD: 1,
    PROFESSIONAL: 2,
    MOCKUP: 3
};

/**
 * Viewer CSID selection token
 */
export let VIEWER_CSID_SELECTION_TOKEN = 'viewerSelectionCSIDS';

/**
 * Viewer Model object selection token
 */
export let VIEWER_MODEL_OBJECT_SELECTION_TOKEN = 'viewerSelectionModels';

/**
 * Viewer current product context token
 */
export let VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN = 'viewerCurrentProductContext';

/**
 * Viewer invisible CSID token
 */
export let VIEWER_INVISIBLE_CSID_TOKEN = 'AllInvisibleCSIDs';

/**
 * Viewer invisible exception CSID token
 */
export let VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN = 'AllInvisibleExceptionCSIDs';

/**
 * Viewer selected off visibility
 */
export let VIEWER_SELECTED_OFF_VISIBILITY_TOKEN = 'isSelectedOffVisible';

/**
 * Viewer selected on visibility
 */
export let VIEWER_SELECTED_ON_VISIBILITY_TOKEN = 'isSelectedOnVisible';

/**
 * Viewer context on visibility
 */
export let VIEWER_CONTEXT_ON_VISIBILITY_TOKEN = 'isContextOnVisible';

/**
 * Viewer license level property name
 */
export let VIEWER_LICENSE_LEVEL_TOKEN = 'licLevel';

/**
 * Viewer Namespace
 */
export let VIEWER_NAMESPACE_TOKEN = 'viewer';

/**
 * Viewer OccmgmtContext Namespace
 */
export let VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN = 'occmgmtContextName';

/**
 * Viewer alternate pci token
 */
export let VIEWER_HAS_ALTERNATE_PCI_TOKEN = 'hasAlternatePCI';

/**
 * Viewer has disclosed Model View data
 */
export let VIEWER_HAS_DISCLOSED_MV_DATA_TOKEN = 'hasDisclosedMVData';

/**
 * Clean up viewer context in application context
 *
 * @param {Object} viewerCtxData Viewer context data
 */
var cleanUpViewerApplicationContext = function( viewerCtxData ) {
    exports.unregisterViewerContext( viewerCtxData );
    appCtxService.unRegisterCtx( viewerCtxData.getViewerCtxNamespace() );
};

/**
 * Create viewer context in application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 */
export let createViewerApplicationContext = function( viewerCtxNamespace ) {
    appCtxService.registerCtx( viewerCtxNamespace, {} );
};

/**
 * update viewer application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} path - Path to the context
 * @param {Object} value - The value of context variable
 */
export let updateViewerApplicationContext = function( viewerCtxNamespace, path, value ) {
    var fullPath = viewerCtxNamespace + '.' + path;
    appCtxService.updatePartialCtx( fullPath, value );

    var eventData = {
        viewerContextNamespace: viewerCtxNamespace,
        property: path,
        value: value
    };
    eventBus.publish( 'awViewerContext.update', eventData );
};

/**
 * Get viewer application context
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} path - Path to the context
 */
export let getViewerApplicationContext = function( viewerCtxNamespace, path ) {
    var fullPath = viewerCtxNamespace + '.' + path;
    return appCtxService.getCtx( fullPath );
};

/**
 * Register viewer with viewer context namespace
 *
 * @function registerViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} viewerType One of the type specified in
 *            {@link viewerContextService.ViewerType}
 * @param {String} contextData Context data. This is an optional field for viewerType
 *            'GwtViewer'. It should be the view object in case of 'JsViewer'
 * @return {Object} Registered viewer context
 */
export let registerViewerContext = function( viewerCtxNamespace, viewerType, contextData ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'registerViewerContext : Viewer context namespace is invalid' );
        return;
    }
    var viewerTypeToBeRegistered = exports.ViewerType[ viewerType ];

    if( _.isUndefined( viewerTypeToBeRegistered ) || _.isNull( viewerTypeToBeRegistered ) ||
        _.isEmpty( viewerTypeToBeRegistered ) ) {
        logger.warn( 'registerViewerContext : Viewer type is invalid' );
        return;
    }

    var viewerCtxData = viewerCtxDataProvider.getViewerContextData( viewerCtxNamespace,
        viewerTypeToBeRegistered, contextData, exports );
    viewerCtxData.addViewerConnectionCloseListener( cleanUpViewerApplicationContext );
    viewerCtxData.initialize( exports );
    registeredViewerContext[ viewerCtxNamespace ] = viewerCtxData;
    exports.updateViewerApplicationContext( 'viewer', 'viewerType', viewerType );
    _setPmiDataAvailability();

    return viewerCtxData;
};

/**
 * Update registered viewer context namespace
 *
 * @function updateRegisteredViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} contextData Context data. This is an optional field for viewerType
 *            'GwtViewer'. It should be the view object in case of 'JsViewer'
 */
export let updateRegisteredViewerContext = function( viewerCtxNamespace, contextData ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'registerViewerContext : Viewer context namespace is invalid' );
        return;
    }
    registeredViewerContext[ viewerCtxNamespace ] = contextData;
    _setPmiDataAvailability();
};

/**
 * Sets pmi availability on active context.
 *
 */
var _setPmiDataAvailability = function() {
    if( viewerVisibilitySubAppCtx === null ) {
        viewerVisibilitySubAppCtx = eventBus
            .subscribe(
                'appCtx.update',
                function( eventData ) {
                    if( eventData.target === undefined && eventData.value !== undefined && eventData.value.viewerViewMode &&
                        eventData.value.viewerViewMode === 'VIEWER3D' ||
                        eventData.target === 'isViewerRevealed' && eventData.name &&
                        eventData.value[ eventData.name ].isViewerRevealed === true &&
                        eventData.value[ eventData.name ].viewerViewMode === 'VIEWER3D'
                    ) {
                        var deferred = AwPromiseService.instance.defer();
                        deferred.promise.then( function( value ) {
                            if( value ) {
                                exports.updateViewerApplicationContext( eventData.name,
                                    'hasPMIData', value.hasPMIData );
                            }
                        } );
                        exports.getViewerApi( eventData.name ).hasPMIData( eventData.name,
                            deferred );
                    }
                } );
    }
    if( viewerVisibilitySubViewerCtx === null ) {
        viewerVisibilitySubViewerCtx = eventBus
            .subscribe(
                'awViewerContext.update', // viewer context
                function( eventData ) {
                    let viewerCtx = appCtxService.getCtx( eventData.viewerContextNamespace );
                    if( eventData.property === undefined && viewerCtx.viewerViewMode &&
                        viewerCtx.viewerViewMode === 'VIEWER3D' ||
                        eventData.property === 'isViewerRevealed' && eventData.viewerContextNamespace &&
                        viewerCtx.isViewerRevealed === true &&
                        viewerCtx.viewerViewMode === 'VIEWER3D'
                    ) {
                        var deferred = AwPromiseService.instance.defer();
                        deferred.promise.then( function( value ) {
                            if( value ) {
                                exports.updateViewerApplicationContext( eventData.viewerContextNamespace,
                                    'hasPMIData', value.hasPMIData );
                            }
                        } );
                        exports.getViewerApi( eventData.viewerContextNamespace ).hasPMIData( eventData.viewerContextNamespace,
                            deferred );
                    }
                } );
    }
};

/**
 * Unregister viewer with viewer context namespace
 *
 * @function unregisterViewerContext
 *
 *
 * @param {Object} viewerCtxData Viewer context data
 */
export let unregisterViewerContext = function( viewerCtxData ) {
    viewerCtxData.removeViewerConnectionCloseListener( cleanUpViewerApplicationContext );
    delete registeredViewerContext[ viewerCtxData.getViewerCtxNamespace() ];
};

/**
 * Handle browser close event
 *
 * @function handleBrowserUnload
 *
 */
export let handleBrowserUnload = function( isPageClose ) {
    _.forOwn( registeredViewerContext, ( registeredObj ) => {
        if( typeof registeredObj.close === 'function' ) {
            registeredObj.close( isPageClose );
        }
    } );
};

/**
 * Get registered viewer context object with viewer context namespace
 *
 * @function getRegisteredViewerContext
 *
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @return {Object} Registered viewer context if found
 */
export let getRegisteredViewerContext = function( viewerCtxNamespace ) {
    if( _.isUndefined( viewerCtxNamespace ) || _.isNull( viewerCtxNamespace ) ||
        _.isEmpty( viewerCtxNamespace ) ) {
        logger.warn( 'getRegisteredViewerContext : Viewer context namespace is invalid' );
        return;
    }

    var registeredCtx = registeredViewerContext[ viewerCtxNamespace ];

    if( _.isUndefined( registeredCtx ) || _.isNull( registeredCtx ) ) {
        logger.warn( 'getRegisteredViewerContext : Viewer context namespace is not registered' );
        return;
    }

    return registeredCtx;
};

/**
 * Gets registered viewer contexts name keys 
 * 
 * @function getRegisteredViewerContextNamseSpaces
 *
 *
 * @return {String[]}  Registered viewer contexts array
 */
export let getRegisteredViewerContextNamseSpaces = function() {

    return Object.keys(registeredViewerContext);
};

/**
 * Activate viewer command panel
 *
 * @function activateViewerCommandPanel
 *
 *
 * @param {String} commandId - ID of the command to open. Should map to the view model to
 *            activate.
 * @param {String} location - Which panel to open the command in. "aw_navigation" or
 *            "aw_toolsAndInfo"
 * @param {String} viewerCtxNamespace - Viewer context namespace for active command
 *  * @param {Boolean} closeWhenCommandHidden - If you have to show the panel even though the commandId is different then set it to false.
 */
export let activateViewerCommandPanel = function( commandId, location, viewerCtxNamespace, closeWhenCommandHidden ) {
    var viewerCtx = appCtxService.getCtx( 'viewer' );
    if( !viewerCtx ) {
        viewerCtx = {};
        appCtxService.registerCtx( 'viewer', viewerCtx );
    }
    viewerCtx.activeViewerCommandCtx = viewerCtxNamespace;
    commandPanelService.activateCommandPanel( commandId, location, undefined, undefined, closeWhenCommandHidden );
};

/**
 * Set markup command visibility
 *
 * @function setMarkupCommandVisibility
 *
 *
 * @param {Boolean} isVisible or not
 * @param {Object} model object or view model object
 */
export let setMarkupCommandVisibility = function( isVisible, modelObj ) {
    var currentViewerContext = appCtxService.getCtx( 'viewerContext' );
    if( isVisible ) {
        var vmoObj = null;
        if( vmoSvc.isViewModelObject( modelObj ) ) {
            vmoObj = modelObj;
        } else {
            vmoObj = vmoSvc.constructViewModelObjectFromModelObject( modelObj );
        }
        appCtxService.unRegisterCtx( 'viewerContext' );
        if( currentViewerContext ) {
            currentViewerContext.vmo = vmoObj;
            currentViewerContext.type = 'aw-image-viewer';
        } else {
            currentViewerContext = {
                vmo: vmoObj,
                type: 'aw-image-viewer'
            };
        }
        appCtxService.registerCtx( 'viewerContext', currentViewerContext );
    } else {
        if( currentViewerContext ) {
            currentViewerContext.vmo = null;
            currentViewerContext.type = null;
        }
    }
};

/**
 * Update the selection display mode
 *
 * @function setUseTransparency
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isUseTransparency - true if UseTransparency option should be turned on
 *
 * @return {Promise} A promise resolved once use transparency option is set in viewer
 */
export let setUseTransparency = function( viewerContextNamespace, isUseTransparency ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setUseTransparency( viewerContextNamespace,
        isUseTransparency, deferred );
    deferred.promise.then( function() {
        var name = 'AWC_visSelectionDisplay';
        var values = [];
        values[ 0 ] = isUseTransparency.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visSelectionDisplay',
            isUseTransparency );
        if( isUseTransparency ) {
            eventBus.publish( 'viewerSettings.viewerSelectionDisplayTransparent', {} );
        } else {
            eventBus.publish( 'viewerSettings.viewerSelectionDisplayHighlight', {} );
        }
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Toggle the selection display mode
 *
 * @function toggleUseTransparency
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Promise} A promise resolved once use transparency option is set in viewer
 */
export let toggleUseTransparency = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    var isUseTransparency = appCtxService.getCtx( 'viewer.preference.AWC_visSelectionDisplay' );
    isUseTransparency = !isUseTransparency;
    exports.getViewerApi( viewerContextNamespace ).setUseTransparency( viewerContextNamespace,
        isUseTransparency, deferred );
    deferred.promise.then( function() {
        var name = 'AWC_visSelectionDisplay';
        var values = [];
        values[ 0 ] = isUseTransparency.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visSelectionDisplay',
            isUseTransparency );
        if( isUseTransparency ) {
            eventBus.publish( 'viewerSettings.viewerSelectionDisplayTransparent', {} );
        } else {
            eventBus.publish( 'viewerSettings.viewerSelectionDisplayHighlight', {} );
        }
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Update viewer navigation mode
 *
 * @function setNavigationMode
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} navigationModeStr - valid navigation mode string
 *
 * @return {Promise} A promise resolved once navigation mode is set in viewer
 */
export let setNavigationMode = function( viewerContextNamespace, navigationModeStr ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setNavigationMode( viewerContextNamespace,
        navigationModeStr, deferred );
    deferred.promise.then( function() {
        var name = 'AWC_visNavigationMode';
        var values = [];
        values[ 0 ] = navigationModeStr;
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visNavigationMode',
            navigationModeStr );
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Set PMI flat to screen in viewer
 *
 * @function setPmiFlatToScreen
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Boolean} isPmiFlatToScreen - true if PMI is set flat to screen
 *
 * @return {Promise} A promise resolved once pmi is set flat to screen in viewer
 */
export let setPmiFlatToScreen = function( viewerContextNamespace, isPmiFlatToScreen ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setPmiFlatToScreen( viewerContextNamespace,
        isPmiFlatToScreen, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Set shaded mode in viewer
 *
 * @function setShadedMode
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Number} shadedModeIndex - number indicating shaded mode
 *
 * @return {Promise} A promise resolved once shaded mode is set in viewer
 */
export let setShadedMode = function( viewerContextNamespace, shadedModeIndex ) {
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setShadedMode( viewerContextNamespace, shadedModeIndex ).then( function() {
            var name = 'AWC_visShading';
            var values = [];
            values[ 0 ] = shadedModeIndex === 1 ? 'true' : 'false';
            prefService.setStringValue( name, values );
            var isShadedWithEdges = shadedModeIndex === 1;
            appCtxService.updatePartialCtx( 'viewer.preference.AWC_visShading',
                isShadedWithEdges );
            returnPromise.resolve();
        },
        function( errorMsg ) {
            returnPromise.reject( errorMsg );
        } );

    return returnPromise.promise;
};

/**
 * Set trihedron visibility in viewer
 *
 * @function setTrihedron
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isVisible - boolean indicating trihedron visibility
 */
export let setTrihedron = function( viewerContextNamespace, isVisible ) {
    exports.getViewerApi( viewerContextNamespace ).setTrihedron( viewerContextNamespace, isVisible );
    var name = 'AWC_visTrihedronOn';
    var values = [];
    values[ 0 ] = isVisible.toString();
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_visTrihedronOn', isVisible );
};

/**
 * Set floor visibility in viewer
 *
 * @function setFloorVisibility
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isVisible - boolean indicating floor visibility
 */
export let setFloorVisibility = function( viewerContextNamespace, isVisible ) {
    exports.getViewerApi( viewerContextNamespace ).setFloorVisibility( viewerContextNamespace, isVisible );
    var name = 'AWC_visFloorOn';
    var values = [];
    values[ 0 ] = isVisible.toString();
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_visFloorOn', isVisible );
};

/**
 * Set grid visibility in viewer
 *
 * @function setGridVisibility
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isVisible - boolean indicating grid visibility
 */
export let setGridVisibility = function( viewerContextNamespace, isVisible ) {
    exports.getViewerApi( viewerContextNamespace ).setGridVisibility( viewerContextNamespace, isVisible );
    var name = 'AWC_visGridOn';
    var values = [];
    values[ 0 ] = isVisible.toString();
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_visGridOn', isVisible );
};

/**
 * Set shadow visibility in viewer
 *
 * @function setShadowVisibility
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isVisible - boolean indicating shadow visibility
 *
 * @return {Promise} A promise resolved once shadow visibility is set in viewer
 */
export let setShadowVisibility = function( viewerContextNamespace, isVisible ) {
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setShadowVisibility( viewerContextNamespace, isVisible ).then( function() {
        var name = 'AWC_visShadowOn';
        var values = [];
        values[ 0 ] = isVisible.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visShadowOn', isVisible );
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Set reflection visibility in viewer
 *
 * @function setReflectionVisibility
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isVisible - boolean indicating reflection visibility
 *
 * @return {Promise} A promise resolved once reflection visibility is set in viewer
 */
export let setReflectionVisibility = function( viewerContextNamespace, isVisible ) {
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setReflectionVisibility( viewerContextNamespace, isVisible ).then( function() {
        var name = 'AWC_visReflectionOn';
        var values = [];
        values[ 0 ] = isVisible.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visReflectionOn', isVisible );
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Set viewer floor orientation
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} planeId - String indicating plane id
 */
export let setFloorOrientation = function( viewerContextNamespace, planeId ) {
    exports.getViewerApi( viewerContextNamespace ).setFloorOrientation( viewerContextNamespace, parseInt( planeId ) );
    var name = 'AWC_visFloorPlaneOrientation';
    var values = [];
    values[ 0 ] = planeId;
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_visFloorPlaneOrientation', planeId );
};

/**
 * Set viewer floor offset
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} newOffsetValue - Floor offset value
 */
export let setFloorOffset = function( viewerContextNamespace, newOffsetValue ) {
    exports.getViewerApi( viewerContextNamespace ).setFloorOffset( viewerContextNamespace, newOffsetValue );
    var name = 'AWC_visFloorOffset';
    var values = [];
    values[ 0 ] = newOffsetValue.toString();
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_visFloorOffset', newOffsetValue.toString() );
};

/**
 * Set navigation 3D mode in viewer
 *
 * @function setNavigation3Dmode
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} navigation3DMode - string indicating navigation 3D mode for viewer
 *            (EXAMINE\WALK)
 *
 * @return {Promise} A promise resolved once navigation 3D mode is set in viewer
 */
export let setNavigation3Dmode = function( viewerContextNamespace, navigation3DMode ) {
    var navigationMode = null;
    if( navigation3DMode === 'EXAMINE' ) {
        navigationMode = 1;
    } else if( navigation3DMode === 'WALK' ) {
        navigationMode = 0;
    }
    exports.getViewerApi( viewerContextNamespace ).setNavigation3Dmode( viewerContextNamespace, navigationMode );
    var name = 'AWC_vis3DNavigationMode';
    var values = [];
    values[ 0 ] = navigation3DMode;
    prefService.setStringValue( name, values );
    appCtxService.updatePartialCtx( 'viewer.preference.AWC_vis3DNavigationMode',
        navigation3DMode );
    if( navigation3DMode && navigation3DMode === 'EXAMINE' ) {
        appCtxService.ctx.viewer.preference.isExamineNavigationMode = true;
        appCtxService.ctx.viewer.preference.isWalkNavigationMode = false;
    } else if( navigation3DMode && navigation3DMode === 'WALK' ) {
        appCtxService.ctx.viewer.preference.isExamineNavigationMode = false;
        appCtxService.ctx.viewer.preference.isWalkNavigationMode = true;
    }
};

/**
 * Set global material in viewer
 *
 * @function setGlobalMaterial
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} materialIndex - Global material index to be set
 *
 * @return {Promise} A promise resolved once material is set in viewer
 */
export let setGlobalMaterial = function( viewerContextNamespace, materialIndex ) {
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).setGlobalMaterial( viewerContextNamespace, parseInt( materialIndex ) ).then( function() {
        var name = 'AWC_visMaterial';
        var values = [];
        values[ 0 ] = materialIndex;
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_visMaterial', materialIndex );
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Apply true shading material in viewer
 *
 * @function applyTrueShadingMaterials
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} isApply - Apply true shading material
 *
 * @return {Promise} A promise resolved once true shading material is applied in viewer
 */
export let applyTrueShadingMaterials = function( viewerContextNamespace, isApply ) {
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).applyTrueShadingMaterials( viewerContextNamespace, isApply ).then( function() {
        var name = 'AWC_applyTrueShadingMaterial';
        var values = [];
        values[ 0 ] = isApply.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.AWC_applyTrueShadingMaterial',
            isApply );
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );

    return returnPromise.promise;
};

/**
 * Get PMI settings in viewer
 *
 * @function getPMISettings
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once reflection visibility is set in viewer
 */
export let getPMISettings = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).hasPMIData( viewerContextNamespace,
        deferred );
    deferred.promise.then( function( returnObject ) {
        returnPromise.resolve( returnObject );
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute ViewOrientation command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {String} camOrientation - camera orientation name
 * @return {Promise} A promise resolved once orientation state is set in viewer
 */
export let executeViewOrientationCommand = function( viewerContextNamespace, camOrientation ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    var cameraOrientation = viewerPreferenceService.getViewOrientation( camOrientation );
    exports.getViewerApi( viewerContextNamespace ).executeViewOrientationCommand(
        viewerContextNamespace, cameraOrientation, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute AllOn command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once AllOn command get executed successfully in viewer
 */
export let executeAllOnCommand = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeAllOnCommand( viewerContextNamespace,
        deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute AllOff command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once AllOff command get executed successfully in viewer
 */
export let executeAllOffCommand = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeAllOffCommand( viewerContextNamespace,
        deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute SelectedOff command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once SelectedOff command get executed successfully in
 *         viewer
 */
export let executeSelectedOffCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeSelectedOffCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute SelectedOn command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once SelectedOn command get executed successfully in
 *         viewer
 */
export let executeSelectedOnCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeSelectedOnCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute SelectedOnly command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once SelectedOnly command get executed successfully in
 *         viewer
 */
export let executeSelectedOnlyCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeSelectedOnlyCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute ContextOff command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once ContextOff command get executed successfully in
 *         viewer
 */
export let executeContextOffCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeContextOffCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute ContextOn command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once ContextOn command get executed successfully in
 *         viewer
 */
export let executeContextOnCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeContextOnCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute ContextOnly command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Object} allSelectedCSIDS - all selected csids
 *
 * @return {Promise} A promise resolved once ContextOnly command get executed successfully in
 *         viewer
 */
export let executeContextOnlyCommand = function( viewerContextNamespace, allSelectedCSIDS ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeContextOnlyCommand(
        viewerContextNamespace, allSelectedCSIDS, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute SelectContext command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array} contextCSIDs - context csids
 *
 * @return {Promise}A promise resolved once SelectContext command get executed successfully in
 *         viewer
 */
export let executeSelectContextCommand = function( viewerContextNamespace, contextCSIDs ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeSelectContextCommand(
        viewerContextNamespace, contextCSIDs, deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Execute Fit command.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @return {Promise} A promise resolved once Fit command get executed successfully in viewer
 */
export let executeFitCommand = function( viewerContextNamespace ) {
    var deferred = AwPromiseService.instance.defer();
    var returnPromise = AwPromiseService.instance.defer();
    exports.getViewerApi( viewerContextNamespace ).executeFitCommand( viewerContextNamespace,
        deferred );
    deferred.promise.then( function() {
        returnPromise.resolve();
    }, function( errorMsg ) {
        returnPromise.reject( errorMsg );
    } );
    return returnPromise.promise;
};

/**
 * Set PMI flat based on boolean input
 *
 * @function setFlatPMI
 *
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {boolean} inPlane - 'true' if the PMI should appear flat otherwise 'false'.
 */
export let setFlatPMI = function( viewerContextNamespace, inPlane ) {
    exports.getViewerApi( viewerContextNamespace ).setInPlane( viewerContextNamespace, !inPlane ).then( function( data ) {
        var name = 'pmiChecked';
        var values = [];
        values[ 0 ] = inPlane.toString();
        prefService.setStringValue( name, values );
        appCtxService.updatePartialCtx( 'viewer.preference.pmiChecked', inPlane );
    } );
};

/**
 * Gets the In Plane property of all PMI in the view. When set to true, the PMI
 * will be parrallel to the XY plane. When set to false, the PMI will be parrallel with the camera's viewing plane.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Promise} inPlane property value for the current model.
 */
export let getInPlane = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getInPlane( viewerContextNamespace );
};

/**
 * Create JSCom.EMM.Occurence object
 *
 * @param {String} keyOrStr key or occurrence string identifying the specific occurrence
 * @return {Object} JSCom.EMM.Occurence object
 */
export let createViewerOccurance = function( keyOrStr ) {
    return new window.JSCom.EMM.Occurrence( viewerPreferenceService.getViewerOccuranceType(), keyOrStr );
};

/**
 * Returns the active basic display mode
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getBasicDisplayMode = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getBasicDisplayMode( viewerContextNamespace );
};

/**
 * Returns the current context Display Style
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getContextDisplayStyle = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getContextDisplayStyle( viewerContextNamespace );
};

/**
 * Returns the current Selection Display Style Percentage Done
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let getSelectionDisplayStyle = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getSelectionDisplayStyle( viewerContextNamespace );
};

/**
 * Sets the Basic display Mode value locally and on the server
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.BasicDisplayMode} displayMode - The Basic Display Mode
 */
export let setBasicDisplayMode = function( viewerContextNamespace, displayMode ) {
    return exports.getViewerApi( viewerContextNamespace ).setBasicDisplayMode( viewerContextNamespace, displayMode );
};

/**
 * Updates the current context Display Style to given one
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array.<Object>} occs - An array of JSCom.EMM.Occurrence objects to set context
 */
export let setContext = function( viewerContextNamespace, occs ) {
    return exports.getViewerApi( viewerContextNamespace ).setContext( viewerContextNamespace, occs );
};

/**
 * Updates the current context Display Style to given part/assembly
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.ContextDisplayStyle} displayStyle - context display style
 */
export let setContextDisplayStyle = function( viewerContextNamespace, displayStyle ) {
    return exports.getViewerApi( viewerContextNamespace ).setContextDisplayStyle( viewerContextNamespace, displayStyle );
};

/**
 * Updates the current Selection Display Style to given one
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.ContextDisplayStyle} displayStyle - Selection display style
 */
export let setSelectionDisplayStyle = function( viewerContextNamespace, displayStyle ) {
    return exports.getViewerApi( viewerContextNamespace ).setSelectionDisplayStyle( viewerContextNamespace, displayStyle );
};

/**
 * Displays JSCom.EMM.Occurrence objects passed in only and does a fitall on them.
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {Array.<Object>} occList - JSCom.EMM.Occurrence An array of occurrences
 *
 * @return {Promise} promise that is resolved or rejected when the operation has completed.
 */
export let viewOnly = function( viewerContextNamespace, occList ) {
    return exports.getViewerApi( viewerContextNamespace ).viewOnly( viewerContextNamespace, occList );
};

/**
 * Get model Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 * @returns {JSCom.Consts.DisplayUnit}
 *
 */
export let getModelUnit = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getModelUnit( viewerContextNamespace );
};

/**
 * set display Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @param {JSCom.Consts.DisplayUnit} displayUnit
 *
 */
export let setDisplayUnit = function( viewerContextNamespace, displayUnit ) {
    return exports.getViewerApi( viewerContextNamespace ).setDisplayUnit( viewerContextNamespace, displayUnit );
};

/**
 * get display Unit
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 *
 */
export let getDisplayUnit = function( viewerContextNamespace ) {
    return exports.getViewerApi( viewerContextNamespace ).getDisplayUnit( viewerContextNamespace );
};

/**
 * Remove Analysis result
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 */
export let executeRemoveAnalysisResultCommand = function( viewerContextNamespace ) {
    let activeToolAndInfoCmd = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
    if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: activeToolAndInfoCmd.commandId
        } );
    }
    AwTimeoutService.instance( function() {
        exports.getViewerApi( viewerContextNamespace ).executeRemoveAnalysisResultCommand( viewerContextNamespace );
    } );
};

/**
 * Get the viewer api object
 *
 * @param {String} viewerContextNamespace - registered viewer context name space
 * @return {Object} An object that provides access to viewer api's
 */
export let getViewerApi = function( viewerContextNamespace ) {
    var regCtxObj = exports.getRegisteredViewerContext( viewerContextNamespace );
    var viewerInteractionSvcProvider = viewerIntrSvcProvider
        .getViewerInteractionServiceProvider( regCtxObj.getViewerType() );
    viewerInteractionSvcProvider.getViewerInteractionService().setViewerContextService( exports );
    return viewerInteractionSvcProvider.getViewerInteractionService().getViewerApi();
};

export default exports = {
    VIEWER_VISIBILITY_TOKEN,
    ViewerType,
    VIEWER_VIEW_MODE_TOKEN,
    ViewerViewModes,
    ViewerLicenseLevels,
    VIEWER_CSID_SELECTION_TOKEN,
    VIEWER_MODEL_OBJECT_SELECTION_TOKEN,
    VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN,
    VIEWER_INVISIBLE_CSID_TOKEN,
    VIEWER_INVISIBLE_EXCEPTION_CSID_TOKEN,
    VIEWER_SELECTED_OFF_VISIBILITY_TOKEN,
    VIEWER_SELECTED_ON_VISIBILITY_TOKEN,
    VIEWER_CONTEXT_ON_VISIBILITY_TOKEN,
    VIEWER_LICENSE_LEVEL_TOKEN,
    VIEWER_NAMESPACE_TOKEN,
    VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN,
    VIEWER_HAS_ALTERNATE_PCI_TOKEN,
    VIEWER_HAS_DISCLOSED_MV_DATA_TOKEN,
    createViewerApplicationContext,
    updateViewerApplicationContext,
    getViewerApplicationContext,
    registerViewerContext,
    updateRegisteredViewerContext,
    unregisterViewerContext,
    handleBrowserUnload,
    getRegisteredViewerContext,
    activateViewerCommandPanel,
    setMarkupCommandVisibility,
    setUseTransparency,
    toggleUseTransparency,
    setNavigationMode,
    setPmiFlatToScreen,
    setShadedMode,
    setTrihedron,
    setFloorVisibility,
    setGridVisibility,
    setShadowVisibility,
    setReflectionVisibility,
    setFloorOrientation,
    setFloorOffset,
    setNavigation3Dmode,
    setGlobalMaterial,
    applyTrueShadingMaterials,
    getPMISettings,
    executeViewOrientationCommand,
    executeAllOnCommand,
    executeAllOffCommand,
    executeSelectedOffCommand,
    executeSelectedOnCommand,
    executeSelectedOnlyCommand,
    executeContextOffCommand,
    executeContextOnCommand,
    executeContextOnlyCommand,
    executeSelectContextCommand,
    executeFitCommand,
    setFlatPMI,
    getInPlane,
    createViewerOccurance,
    getBasicDisplayMode,
    getContextDisplayStyle,
    getSelectionDisplayStyle,
    setBasicDisplayMode,
    setContext,
    setContextDisplayStyle,
    setSelectionDisplayStyle,
    viewOnly,
    getModelUnit,
    setDisplayUnit,
    getDisplayUnit,
    executeRemoveAnalysisResultCommand,
    getViewerApi,
    getRegisteredViewerContextNamseSpaces
};
/**
 * Set of utility functions for viewer
 *
 * @class viewerContextService
 * @param appCtxService {Object} - appCtxService
 * @memberOf NgServices
 */
app.factory( 'viewerContextService', () => exports );