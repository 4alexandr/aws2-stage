// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This module provides services for viewer measurement feature
 *
 * @module js/viewerMeasureService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

/**
 * Cached reference to AngularJS & AW services.
 */

/**
 * Define public API
 */
var exports = {};

/**
 * Define private API
 */
var _measureToolAndInfoPanelCloseEventSubscription = null;
var _queryToolAndInfoPanelCloseEventSubscription = null;
var _measureFullScreenEventSubscription = null;
var _queryFullScreenEventSubscription = null;

export let PickFilters = {
    PICK_FEATURES_ALL: 'PICK_FEATURES_ALL',
    PICK_PARTS: 'PICK_PARTS',
    PICK_SURFACE: 'PICK_SURFACE',
    PICK_EDGE: 'PICK_EDGE',
    PICK_VERTEX: 'PICK_VERTEX',
    PICK_POINT: 'PICK_POINT',
    PICK_ARC_CENTER: 'PICK_ARC_CENTER'
};

/**
 * Set selected measurement object
 *
 * @param {Object} measurementObject - selected measurement object
 */
var _setSelectedMeasurement = function() {
    eventBus.publish( 'viewerMeasurement.selectedMeasurementChanged', {} );
};

/**
 * Notify measurement pick filter changed
 */
var _notifyMeasurementPickFiltersChanged = function() {
    viewerSecondaryModelService.setMeasurementPickMode( _getCurrentViewerCtxNamespace() );
    eventBus.publish( 'viewerMeasurement.measurePickFilterChanged', {} );
};

/**
 * Notify query pick filter changed
 */
var _notifyQueryPickFiltersChanged = function() {
    viewerSecondaryModelService.setQueryPickMode( _getCurrentViewerCtxNamespace() );
    eventBus.publish( 'viewerMeasurement.queryPickFilterChanged', {} );
};

/**
 * Notify viewer measurement panel revealed
 */
var _notifyViewerMeasurementPanelRevealed = function() {
    _updateMeasurementContext( 'viewerMeasurement.isMeasurementPanelRevealed', 'true' );
    _updateQuickMeasurementContext( _getCurrentViewerCtxNamespace(),
        'viewerMeasurement.isQuickMeasureModeEnabled', 'false' );
    viewerSecondaryModelService.startViewerMeasurement( _getCurrentViewerCtxNamespace() );
    eventBus.publish( 'viewerMeasurement.measurePanelReveal', {} );
};

/**
 * Notify viewer measurement panel hidden
 */
var _notifyViewerMeasurementPanelHidden = function() {
    try {
        _updateMeasurementContext( 'viewerMeasurement.isMeasurementPanelRevealed', 'false' );
        viewerSecondaryModelService.closeViewerMeasurement( _getCurrentViewerCtxNamespace() );
        eventBus.publish( 'viewerMeasurement.measurePanelHidden', {} );
    } catch {
        logger.warn( 'Failed to close measurememt panel since the viewer is not alive' );
    }
};

/**
 * Notify viewer query panel revealed
 */
var _notifyViewerQueryPanelRevealed = function() {
    _updateMeasurementContext( 'viewerMeasurement.isMeasurementPanelRevealed', 'true' );
    _updateQuickMeasurementContext( _getCurrentViewerCtxNamespace(),
        'viewerMeasurement.isQuickMeasureModeEnabled', 'false' );
    viewerSecondaryModelService.startViewerQuery( _getCurrentViewerCtxNamespace() );
    eventBus.publish( 'viewerMeasurement.queryPanelReveal', {} );
};

/**
 * Notify viewer query panel hidden
 */
var _notifyViewerQueryPanelHidden = function() {
    try {
        _updateMeasurementContext( 'viewerMeasurement.isMeasurementPanelRevealed', 'false' );
        viewerSecondaryModelService.closeViewerQuery( _getCurrentViewerCtxNamespace() );
        eventBus.publish( 'viewerMeasurement.queryPanelHidden', {} );
    } catch {
        logger.warn( 'Failed to close query panel since the viewer is not alive' );
    }
};

/**
 * Unsubscribe for measurement tool and info panel close event.
 */
var _unSubscribeForMeasurementPanelCloseEvent = function() {
    if( _measureToolAndInfoPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _measureToolAndInfoPanelCloseEventSubscription );
        _measureToolAndInfoPanelCloseEventSubscription = null;
    }
};

/**
 * Unsubscribe for full screen close event.
 */
var _unSubscribeForMeasurePanelFullScreenEvent = function() {
    if( _measureFullScreenEventSubscription !== null ) {
        eventBus.unsubscribe( _measureFullScreenEventSubscription );
        _measureFullScreenEventSubscription = null;
    }
};

/**
 * Subscribe for measurement tool and info panel close event.
 */
var _subscribeForMeasurementPanelCloseEvent = function() {
    if( _measureToolAndInfoPanelCloseEventSubscription === null ) {
        _measureToolAndInfoPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function(
            eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _unSubscribeForMeasurementPanelCloseEvent();
                _notifyViewerMeasurementPanelHidden();
            }
        }, 'viewerMeasureService' );
    }

    if( _measureFullScreenEventSubscription === null ) {
        _measureFullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
            _unSubscribeForMeasurementPanelCloseEvent();
            _unSubscribeForMeasurePanelFullScreenEvent();
            _notifyViewerMeasurementPanelHidden();
        }, 'viewerMeasureService' );
    }
};

/**
 * Unsubscribe for tool and info panel close event.
 */
var _unSubscribeForQueryPanelCloseEvent = function() {
    if( _queryToolAndInfoPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _queryToolAndInfoPanelCloseEventSubscription );
        _queryToolAndInfoPanelCloseEventSubscription = null;
    }
};

/**
 * Unsubscribe for full screen close event.
 */
var _unSubscribeForQueryPanelFullScreenEvent = function() {
    if( _queryFullScreenEventSubscription !== null ) {
        eventBus.unsubscribe( _queryFullScreenEventSubscription );
        _queryFullScreenEventSubscription = null;
    }
};

/**
 * Subscribe for tool and info panel close event.
 */
var _subscribeForQueryPanelCloseEvent = function() {
    if( _queryToolAndInfoPanelCloseEventSubscription === null ) {
        _queryToolAndInfoPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function(
            eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' || eventData.name === 'ViewModeContext' ) {
                _unSubscribeForQueryPanelCloseEvent();
                _notifyViewerQueryPanelHidden();
            }
        }, 'viewerMeasureService' );
    }

    if( _queryFullScreenEventSubscription === null ) {
        _queryFullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
            _unSubscribeForQueryPanelCloseEvent();
            _unSubscribeForQueryPanelFullScreenEvent();
            _notifyViewerQueryPanelHidden();
        }, 'viewerMeasureService' );
    }
};

/**
 * Notify pick filter changed
 *
 * @param {Number} value - value to be formatted
 * @param {String} locale - user locale
 */
var _formatNumber = function( value, locale ) {
    var userLang = null;
    if( locale !== null && !_.isUndefined( locale ) ) {
        userLang = locale.replace( /_/g, '-' );
    }
    if( userLang === null ) {
        userLang = navigator.language || navigator.userLanguage;
    }
    return Number( value ).toLocaleString( userLang, {
        minimumFractionDigits: 4
    } );
};

/**
 * Format the value string to be shown on UI
 *
 * @param {Object} value - value to be processed
 */
var _processMeasurementPropertyValue = function( value ) {
    if( value === null || _.isUndefined( value ) ) {
        return null;
    }

    if( !isNaN( value ) ) {
        return _formatNumber( value, localeSvc.getLocale() );
    }

    if( Array.isArray( value ) ) {
        var returnStr = '[';
        _.forEach( value, function( arrayVal ) {
            returnStr += _formatNumber( arrayVal, localeSvc.getLocale() );
            returnStr += ', ';
        } );
        returnStr = returnStr.substr( 0, returnStr.length - 2 );
        returnStr += ']';
        return returnStr;
    }
    return value;
};

/**
 * Register application context variable
 */
export let getSelectedMeasurement = function() {
    var measurementCtx = _getCurrentViewerMeasurementCtx();
    return measurementCtx.selectedMeasurementObject;
};

/**
 * Toggle quick measurement mode
 */
export let toggleQuickMeasurementMode = function( viewerCtxNamespace ) {
    _initializeQuickMeasurementContext( viewerCtxNamespace );
    var measurementCtx = _getViewerQuickMeasurementCtx( viewerCtxNamespace );
    var isQuickMeasureModeEnabled = measurementCtx.isQuickMeasureModeEnabled;
    if( _.isNull( isQuickMeasureModeEnabled ) || _.isUndefined( isQuickMeasureModeEnabled ) ||
        isQuickMeasureModeEnabled !== 'true' ) {
        _updateQuickMeasurementContext( viewerCtxNamespace, 'viewerMeasurement.isQuickMeasureModeEnabled',
            'true' );
        var selectedQMPickFilter = measurementCtx.selectedQuickMeasurementPickFilters;
        if( _.isNull( selectedQMPickFilter ) || _.isUndefined( selectedQMPickFilter ) ) {
            exports.setQuickMeasurementPickFilter( viewerCtxNamespace, 'PICK_FEATURES_ALL' );
        }
        viewerSecondaryModelService.startViewerQuickMeasurement( viewerCtxNamespace, '' );
    } else {
        _updateQuickMeasurementContext( viewerCtxNamespace, 'viewerMeasurement.isQuickMeasureModeEnabled',
            'false' );
        viewerSecondaryModelService.closeViewerQuickMeasurement( viewerCtxNamespace );
    }
};

/**
 * Set quick measurement pick mode
 */
export let setQuickMeasurementPickFilter = function( viewerCtxNamespace, pickFiltersToBeSelected ) {
    var selectedPickFilters = [];
    if( pickFiltersToBeSelected !== null && !_.isUndefined( pickFiltersToBeSelected ) ) {
        var pickFilterValue = exports.PickFilters[ pickFiltersToBeSelected ];
        if( pickFilterValue !== null && !_.isUndefined( pickFilterValue ) ) {
            selectedPickFilters.push( pickFilterValue );
        }
        _updateQuickMeasurementContext( viewerCtxNamespace,
            'viewerMeasurement.selectedQuickMeasurementPickFilters', selectedPickFilters );
        viewerSecondaryModelService.setQuickMeasurementPickMode( viewerCtxNamespace );
    }
};

/**
 * Do initial load setup
 */
export let measurementPanelRevealed = function() {
    _initializeMeasurementContext();
    var selectedPickFilters = exports.getSelectedMeasurementPickFilters();
    if( selectedPickFilters === null || _.isUndefined( selectedPickFilters ) ) {
        selectedPickFilters = [ exports.PickFilters.PICK_FEATURES_ALL, exports.PickFilters.PICK_SURFACE,
            exports.PickFilters.PICK_EDGE, exports.PickFilters.PICK_VERTEX, exports.PickFilters.PICK_POINT,
            exports.PickFilters.PICK_ARC_CENTER
        ];
        _updateMeasurementContext( 'viewerMeasurement.selectedMeasurementPickFilters', selectedPickFilters );
    }
    viewerSecondaryModelService.getAllMeasurements( _getCurrentViewerCtxNamespace() );
    _subscribeForMeasurementPanelCloseEvent();
    _notifyViewerMeasurementPanelRevealed();
};

/**
 * Do initial load setup
 */
export let queryPanelRevealed = function() {
    _initializeMeasurementContext();
    var selectedPickFilters = exports.getSelectedQueryPickFilters();
    if( selectedPickFilters === null || _.isUndefined( selectedPickFilters ) ) {
        selectedPickFilters = [ exports.PickFilters.PICK_FEATURES_ALL, exports.PickFilters.PICK_SURFACE,
            exports.PickFilters.PICK_EDGE, exports.PickFilters.PICK_VERTEX, exports.PickFilters.PICK_POINT,
            exports.PickFilters.PICK_ARC_CENTER
        ];
        _updateMeasurementContext( 'viewerMeasurement.selectedQueryPickFilters', selectedPickFilters );
    }
    viewerSecondaryModelService.getAllMeasurements( _getCurrentViewerCtxNamespace() );
    _subscribeForQueryPanelCloseEvent();
    _notifyViewerQueryPanelRevealed();
};

/**
 * Get selected measurement object localized text
 *
 * @param {Object} localeBundleText - locale bundle
 */
export let getSelectedMeasurementLocalizedText = function( localeBundleText ) {
    var measurementCtx = _getCurrentViewerMeasurementCtx();
    var returnValue = null;
    if( measurementCtx !== null && !_.isUndefined( measurementCtx ) ) {
        var selectedMeasureObj = measurementCtx.selectedMeasurementObject;
        if( selectedMeasureObj !== null && !_.isUndefined( selectedMeasureObj ) ) {
            returnValue = _getLocalizedText( selectedMeasureObj, localeBundleText );
        }
    }
    return returnValue;
};

/**
 * Get selected measurement object localized text
 *
 * @param {Object} localeBundleText - locale bundle
 */
export let getSelectedQueryLocalizedText = function( localeBundleText ) {
    var measurementCtx = _getCurrentViewerMeasurementCtx();
    var returnValue = null;
    if( measurementCtx !== null && !_.isUndefined( measurementCtx ) ) {
        var selectedMeasureObj = measurementCtx.selectedQueryObject;
        if( selectedMeasureObj !== null && !_.isUndefined( selectedMeasureObj ) ) {
            returnValue = _getLocalizedText( selectedMeasureObj, localeBundleText );
        }
    }
    return returnValue;
};

/**
 * Get localized text
 */
var _getLocalizedText = function( selectedObj, localeBundleText ) {
    var returnValue = {};
    _
        .forOwn(
            selectedObj,
            function( prop, key ) {
                switch ( key.trim() ) {
                    case 'Point':
                        returnValue[ localeBundleText.measurementPropertyPoint ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Length':
                        returnValue[ localeBundleText.measurementPropertyLength ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Center':
                        returnValue[ localeBundleText.measurementPropertyCenter ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Radius':
                        returnValue[ localeBundleText.measurementPropertyRadius ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Angle':
                        returnValue[ localeBundleText.measurementPropertyAngle ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Normal':
                        returnValue[ localeBundleText.measurementPropertyNormal ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Area':
                        returnValue[ localeBundleText.measurementPropertyArea ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Height':
                        returnValue[ localeBundleText.measurementPropertyHeight ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'PartName':
                        returnValue[ localeBundleText.measurementPropertyPartName ] = _processMeasurementPropertyValue( prop );
                        break;
                    case 'Volume':
                        returnValue[ localeBundleText.measurementPropertyVolume ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Centroid':
                        returnValue[ localeBundleText.measurementPropertyCentroid ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Distance':
                        returnValue[ localeBundleText.measurementPropertyDistance ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Deltas':
                        returnValue[ localeBundleText.measurementPropertyDeltas ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'PrincipalMoments':
                        returnValue[ localeBundleText.measurementPropertyPrincipalMoments ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'PrincipalAxis1':
                        returnValue[ localeBundleText.measurementPropertyPrincipalAxis1 ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'PrincipalAxis2':
                        returnValue[ localeBundleText.measurementPropertyPrincipalAxis2 ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'PrincipalAxis3':
                        returnValue[ localeBundleText.measurementPropertyPrincipalAxis3 ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Mass':
                        returnValue[ localeBundleText.measurementPropertyMass ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Minimum Distance':
                        returnValue[ localeBundleText.measurementPropertyMinimumDistance ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Minimum Radius':
                        returnValue[ localeBundleText.measurementPropertyMinimumRadius ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Radii':
                        returnValue[ localeBundleText.measurementPropertyRadii ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Size X':
                        returnValue[ localeBundleText.measurementPropertySizeX ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Size Y':
                        returnValue[ localeBundleText.measurementPropertySizeY ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Size Z':
                        returnValue[ localeBundleText.measurementPropertySizeZ ] = _processMeasurementPropertyValue( prop.value ) + ' ' + prop.unit;
                        break;
                    case 'Measurement Type':
                        returnValue[ localeBundleText.measurementPropertyType ] = _processMeasurementPropertyValue( prop );
                        break;
                    default:
                        break;
                }
            } );
    return returnValue;
};

/**
 * Get measurement pick filters
 */
export let getSelectedMeasurementPickFilters = function() {
    var measurementCtx = _getCurrentViewerMeasurementCtx();
    return measurementCtx.selectedMeasurementPickFilters;
};

/**
 * Get query pick filters
 */
export let getSelectedQueryPickFilters = function() {
    var measurementCtx = _getCurrentViewerMeasurementCtx();
    return measurementCtx.selectedQueryPickFilters;
};

/**
 * Set selected measurement pick filters
 *
 * @param {Array} pickFiltersToBeSelected - array of pick filters to be selected
 */
export let setSelectedMeasurementPickFilters = function( pickFiltersToBeSelected ) {
    var selectedPickFilters = [];
    if( pickFiltersToBeSelected !== null && !_.isUndefined( pickFiltersToBeSelected ) ) {
        _.forEach( pickFiltersToBeSelected, function( pickFilter ) {
            var pickFilterValue = exports.PickFilters[ pickFilter ];
            if( pickFilterValue !== null && !_.isUndefined( pickFilterValue ) ) {
                selectedPickFilters.push( pickFilterValue );
            }
        } );

        _updateMeasurementContext( 'viewerMeasurement.selectedMeasurementPickFilters', selectedPickFilters );
        _notifyMeasurementPickFiltersChanged();
    }
};

/**
 * Set selected query pick filters
 *
 * @param {Array} pickFiltersToBeSelected - array of pick filters to be selected
 */
export let setSelectedQueryPickFilters = function( pickFiltersToBeSelected ) {
    var selectedPickFilters = [];
    if( pickFiltersToBeSelected !== null && !_.isUndefined( pickFiltersToBeSelected ) ) {
        _.forEach( pickFiltersToBeSelected, function( pickFilter ) {
            var pickFilterValue = exports.PickFilters[ pickFilter ];
            if( pickFilterValue !== null && !_.isUndefined( pickFilterValue ) ) {
                selectedPickFilters.push( pickFilterValue );
            }
        } );

        _updateMeasurementContext( 'viewerMeasurement.selectedQueryPickFilters', selectedPickFilters );
        _notifyQueryPickFiltersChanged();
    }
};

/**
 * Get isSelectedMeasurementSectionVisible
 *
 */
export let isSelectedMeasurementSectionVisible = function() {
    return _getCurrentViewerMeasurementCtx().isSelectedMeasurementSectionVisible;
};

/**
 * Set selected measurement properties
 *
 * @param {Object} selectedMeasurementProperties - Selected measurement properties
 *
 */
export let setSelectedMeasurementProperties = function( selectedMeasurementProperties ) {
    _updateMeasurementContext( 'viewerMeasurement.selectedMeasurementProperties', selectedMeasurementProperties );
};

/**
 * Delete selected measurement
 */
export let deleteSelectedMeasurement = function() {
    viewerSecondaryModelService.deleteSelectedMeasurement( _getCurrentViewerCtxNamespace() );
};

/**
 * Delete all measurement
 */
export let deleteAllMeasurement = function() {
    viewerSecondaryModelService.deleteAllMeasurement( _getCurrentViewerCtxNamespace() );
};

/**
 * Get isSelectedQuerySectionVisible
 *
 */
export let isSelectedQuerySectionVisible = function() {
    return _getCurrentViewerMeasurementCtx().isSelectedQuerySectionVisible;
};

/**
 * Set selected query properties
 *
 * @param {Object} selectedQueryProperties - Selected query properties
 *
 */
export let setSelectedQueryProperties = function( selectedQueryProperties ) {
    _updateMeasurementContext( 'viewerMeasurement.selectedQueryProperties', selectedQueryProperties );
};

/**
 * Delete selected query
 */
export let deleteSelectedQuery = function() {
    viewerSecondaryModelService.deleteSelectedQuery( _getCurrentViewerCtxNamespace() );
};

/**
 * Delete all queries
 */
export let deleteAllQueries = function() {
    viewerSecondaryModelService.deleteAllQueries( _getCurrentViewerCtxNamespace() );
};

var _initializeQuickMeasurementContext = function( viewerCtxNamespace ) {
    var viewerCtx = appCtxSvc.getCtx( viewerCtxNamespace );
    var currentMeasurementCtx = viewerCtx.viewerMeasurement;
    if( _.isNull( currentMeasurementCtx ) || _.isUndefined( currentMeasurementCtx ) ) {
        var viewerCtx = appCtxSvc.getCtx( viewerCtxNamespace );
        viewerCtx.viewerMeasurement = {};
        appCtxSvc.updateCtx( viewerCtxNamespace, viewerCtx );
    }
};

var _updateQuickMeasurementContext = function( viewerCtxNamespace, partialPath, value ) {
    var updatedPartialPath = viewerCtxNamespace + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
};

var _initializeMeasurementContext = function() {
    var currentMeasurementCtx = _getCurrentViewerMeasurementCtx();
    if( _.isNull( currentMeasurementCtx ) || _.isUndefined( currentMeasurementCtx ) ) {
        var currentViewerNamespace = _getCurrentViewerCtxNamespace();
        var viewerCtx = appCtxSvc.getCtx( currentViewerNamespace );
        viewerCtx.viewerMeasurement = {};
        appCtxSvc.updateCtx( currentViewerNamespace, viewerCtx );
    }
};

var _updateMeasurementContext = function( partialPath, value ) {
    var viewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var updatedPartialPath = viewerCtxNamespace + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
};

/**
 * Get viewer context
 */
var _getCurrentViewerCtxNamespace = function() {
    return appCtxSvc.getCtx( 'viewer.activeViewerCommandCtx' );
};

/**
 * Get current viewer measurement context
 */
var _getCurrentViewerMeasurementCtx = function() {
    var viewerCtx = appCtxSvc.getCtx( _getCurrentViewerCtxNamespace() );
    return viewerCtx.viewerMeasurement;
};

/**
 * Get quick measurement context
 */
var _getViewerQuickMeasurementCtx = function( viewerCtxNamespace ) {
    var viewerCtx = appCtxSvc.getCtx( viewerCtxNamespace );
    return viewerCtx.viewerMeasurement;
};

/**
 * Initialize viewer measurement service
 */
export let initializeViewerMeasurementService = function() {
    /**
     * Subscribe for viewer measurement created event
     */
    eventBus.subscribe( 'viewerMeasurement.create', function() {
        _setSelectedMeasurement();
    }, 'viewerMeasureService' );

    /**
     * Subscribe for viewer measurement selected event
     */
    eventBus.subscribe( 'viewerMeasurement.select', function() {
        _setSelectedMeasurement();
    }, 'viewerMeasureService' );
};

initializeViewerMeasurementService();

export default exports = {
    PickFilters,
    getSelectedMeasurement,
    toggleQuickMeasurementMode,
    setQuickMeasurementPickFilter,
    measurementPanelRevealed,
    queryPanelRevealed,
    getSelectedMeasurementLocalizedText,
    getSelectedQueryLocalizedText,
    getSelectedMeasurementPickFilters,
    getSelectedQueryPickFilters,
    setSelectedMeasurementPickFilters,
    setSelectedQueryPickFilters,
    isSelectedMeasurementSectionVisible,
    setSelectedMeasurementProperties,
    deleteSelectedMeasurement,
    deleteAllMeasurement,
    isSelectedQuerySectionVisible,
    setSelectedQueryProperties,
    deleteSelectedQuery,
    deleteAllQueries,
    initializeViewerMeasurementService
};
/**
 * The service to use viewer measure feature
 *
 * @member viewerMeasureService
 * @memberof NgServices
 */
app.factory( 'viewerMeasureService', () => exports );
