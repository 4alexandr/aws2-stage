// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service is create viewer context data
 *
 * @module js/structureViewerVisibilityHandlerProvider
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import StructureViewerService from 'js/structureViewerService';
import TracelinkSelectionHandler from 'js/tracelinkSelectionHandler';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import assert from 'assert';

var exports = {};

/**
 * Provides an instance of structure viewer selection handler
 *
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {StructureViewerVisibilityHandler} Returns viewer selection manager
 */
export let getStructureViewerVisibilityHandler = function( viewerContextData ) {
    var visibilityHandler = null;

    if( TracelinkSelectionHandler.instance.isRootSelectionTracelinkType() ) {
        visibilityHandler = TracelinkSelectionHandler.instance.createVisibilityHandler( StructureViewerVisibilityHandler,
            viewerContextData );
    } else {
        visibilityHandler = new StructureViewerVisibilityHandler( viewerContextData );
    }

    return visibilityHandler;
};

/**
 * Class to hold the structure viewer visibility data
 *
 * @constructor StructureViewerVisibilityHandler
 * @param {Object} viewerContextData Viewer Context data
 */
var StructureViewerVisibilityHandler = function( viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );
    var self = this;
    var _viewerCtxData = viewerContextData;
    var _isViewerVisibilityListenerAttached = false;

    /**
     * Register the viewer listener
     *
     * @return {Void}
     */
    self.registerForVisibilityEvents = function( _occmgmtContextNameKey ) {
        if( !_isViewerVisibilityListenerAttached ) {
            let occmgmtContext = appCtxService.getCtx( _occmgmtContextNameKey );
            occmgmtContext.cellVisibility = {};
            occmgmtContext.cellVisibility.getOccVisibility = self.internalGetOccVisibility;
            occmgmtContext.cellVisibility.toggleOccVisibility = self.internalToggleOccVisibility;
            _viewerCtxData.getVisibilityManager().addViewerVisibilityChangedListener(
                self.viewerVisibilityChangedListener );
            _isViewerVisibilityListenerAttached = true;
        }
        var aceVisibilityUpdateEventData = {};
        aceVisibilityUpdateEventData.viewToReact = _occmgmtContextNameKey;
        //We need to fire this event to ensure the cell thumbnail titles are activated.
        eventBus.publish( 'occMgmt.visibilityStateChanged', aceVisibilityUpdateEventData );
    };

    /**
     * Get visibility of occurrence in viewer
     *
     * @param {ViewModelObject} vmo a view model object to get visibility
     * @return {Void}
     */
    self.internalGetOccVisibility = function( vmo ) {
        return self.getOccVisibility( _viewerCtxData, vmo );
    };

    /**
     * Clean viewer visibility listeners
     *
     * @param {ViewModelObject} vmo a view model object to toggle visibility
     * @return {Void}
     */
    self.internalToggleOccVisibility = function( vmo ) {
        self.toggleOccVisibility( _viewerCtxData, vmo );
    };

    /**
     * Viewer visibility changed listener
     *
     * @param {Array} occurrencesFromViewer Array of CSID chain of occurrences
     * @param {Boolean} visibilityToSet visibility to set
     * @param {Boolean} isStateChange is state change
     */
    self.viewerVisibilityChangedListener = function( occurrencesFromViewer, visibilityToSet, isStateChange ) {
        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( _viewerCtxData );
        var aceVisibilityUpdateEventData = {};
        aceVisibilityUpdateEventData.viewToReact = StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
            _viewerCtxData.getViewerCtxNamespace() );
        //We need to fire this event to ensure the cell thumbnail titles are activated.
        eventBus.publish( 'occMgmt.visibilityStateChanged', aceVisibilityUpdateEventData );
    };

    /**
     * Clean viewer visibility listeners
     *
     * @return {Void}
     */
    self.cleanUp = function() {
        if( _isViewerVisibilityListenerAttached ) {
            _isViewerVisibilityListenerAttached = false;
            appCtxService.updatePartialCtx( 'occmgmtContext.cellVisibility', {} );
            var aceVisibilityUpdateEventData = {};
            aceVisibilityUpdateEventData.viewToReact = StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
                _viewerCtxData.getViewerCtxNamespace() );
            //We need to fire this event to ensure the cell thumbnail titles are activated.
            eventBus.publish( 'occMgmt.visibilityStateChanged', aceVisibilityUpdateEventData );
        }

        if( _viewerCtxData && _viewerCtxData.getVisibilityManager() ) {
            _viewerCtxData.getVisibilityManager().removeViewerVisibilityChangedListener(
                self.viewerVisibilityChangedListener );
        }
    };
};

StructureViewerVisibilityHandler.prototype.toggleOccVisibility = function( viewerCtxData, vmo ) {
    var csid = objectToCSIDGeneratorService.getCloneStableIdChain( vmo );
    if( csid === '/' ) {
        csid = '';
    }
    var selectedObjects = [ vmo ];

    //Getting packed occurences from selected object if any and applying master visibility to all found packed occurences.
    getCloneStableIDsWithPackedOccurrences( viewerCtxData, selectedObjects ).then( function( response ) {
        if( response && response.csids && response.csids.length > 0 ) {
            var masterVisibility = !StructureViewerVisibilityHandler.prototype.getOccVisibility( viewerCtxData, vmo );
            response.csids.push( csid );
            response.csids.forEach( function( item ) {
                viewerCtxData.getVisibilityManager().setPackedPartsVisibility( item, masterVisibility );
            } );
        } else {
            viewerCtxData.getVisibilityManager().toggleProductViewerVisibility( csid );
        }
        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( viewerCtxData );
        var aceVisibilityUpdateEventData = {};
        aceVisibilityUpdateEventData.viewToReact = StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
            viewerCtxData.getViewerCtxNamespace() );
        //We need to fire this event to ensure the cell thumbnail titles are activated.
        eventBus.publish( 'occMgmt.visibilityStateChanged', aceVisibilityUpdateEventData );
    } );
};

StructureViewerVisibilityHandler.prototype.getOccVisibility = function( viewerCtxData, vmo ) {
    var csid = objectToCSIDGeneratorService.getCloneStableIdChain( vmo );
    if( csid === '/' ) {
        csid = '';
    }
    var visibility = viewerCtxData.getVisibilityManager().getProductViewerVisibility( csid );
    if( visibility === viewerCtxData.getVisibilityManager().VISIBILITY.PARTIAL ||
        visibility === viewerCtxData.getVisibilityManager().VISIBILITY.INVISIBLE ) {
        return false;
    }
    return true;
};

var getCloneStableIDsWithPackedOccurrences = function( viewerCtxData, selectedObjects ) {
    let returnPromise = AwPromiseService.instance.defer();
    let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext(
        viewerCtxData.getViewerCtxNamespace() );
    let currentProductCtx = occmgmtContext.productContextInfo;
    let isPackedProperty = selectedObjects[ 0 ].props.awb0IsPacked;
    if( isPackedProperty && isPackedProperty.uiValues && isPackedProperty.uiValues.length > 0 && isPackedProperty.uiValues[ 0 ] === 'True' ) {
        var input = {
            occurrences: selectedObjects,
            productContextInfo: currentProductCtx
        };
        soaService.postUnchecked( 'Internal-ActiveWorkspaceBom-2017-12-OccurrenceManagement', 'getPackedOccurrenceCSIDs', input ).then( function( response ) {
            returnPromise.resolve( response );
        } );
    } else {
        returnPromise.resolve();
    }
    return returnPromise.promise;
};

export default exports = {
    getStructureViewerVisibilityHandler
};
/**
 * This service is used to get StructureViewerVisibilityHandler
 *
 * @memberof NgServices
 */
app.factory( 'structureViewerVisibilityHandlerProvider', () => exports );
