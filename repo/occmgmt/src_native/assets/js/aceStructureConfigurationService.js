// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceStructureConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import occmgmtUpdatePwaDisplayService from 'js/occmgmtUpdatePwaDisplayService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};
var _eventSubDefs = [];

export let initialize = function() {
    _setupEventListeners();
    _setupEventListeners1();
};

var _setupEventListeners = function() {
    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( context ) {
        if( context.name === 'aceActiveContext' && context.target === 'context.configContext' &&
            Object.keys( context.value.aceActiveContext.context.configContext ).length > 0 ) {
            if( appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected.length > 1 ) {
                appCtxSvc.ctx.aceActiveContext.context.clearExistingSelections = true;
            } else if( appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.multiSelectEnabled ) {
                appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.setMultiSelectionEnabled( false );
            }
            eventBus.publish( 'configurationChangeStarted' );
            if( appCtxSvc.ctx.aceActiveContext.context.currentState !== undefined ) {
                appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid = null;
            }
            occmgmtUpdatePwaDisplayService.resetPwaContents();
        }
    } ) );
};

var _setupEventListeners1 = function() {
    _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( context ) {
        if( appCtxSvc.ctx.splitView && appCtxSvc.ctx.splitView.mode === true && _.includes( appCtxSvc.ctx.splitView.viewKeys, context.name ) && context.target === 'configContext' &&
            Object.keys( context.value[ context.name ].configContext ).length > 0 ) {
            if( appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected.length > 1 ) {
                appCtxSvc.ctx[ context.name ].pwaSelectionModel.selectNone();
            } else if( appCtxSvc.ctx[ context.name ].pwaSelectionModel.multiSelectEnabled ) {
                appCtxSvc.ctx[ context.name ].pwaSelectionModel.setMultiSelectionEnabled( false );
            }
            contextStateMgmtService.updateActiveContext( context.name );
            eventBus.publish( 'configurationChangeStarted' );
            if( appCtxSvc.ctx[ context.name ].currentState !== undefined ) {
                appCtxSvc.ctx[ context.name ].currentState.incontext_uid = null;
            }
            occmgmtUpdatePwaDisplayService.resetPwaContents();
        }
    } ) );
};

export let destroy = function() {
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
    _eventSubDefs = [];
};

/**
 * Updating occmgmt context showInEffectiveOcc or showVariantsInOcc or showSuppressedOcc
 *
 * @param {string} viewToggleState View toggle state. true if toggle is on/selected else false.
 * @param {string} toggleKey Key to identify which view toggle is clicked.
 */
export let updateCtxWithViewToggleValue = function( viewToggleState, toggleKey ) {
    var isTrue = viewToggleState === 'true';
    if( _.isEqual( toggleKey, 'ShowExcludedByEffectivity' ) ) {
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showInEffectiveOcc', isTrue );
    } else if( _.isEqual( toggleKey, 'ShowExcludedByVariants' ) ) {
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showVariantsInOcc', isTrue );
    } else if( _.isEqual( toggleKey, 'ShowSuppressed' ) ) {
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.showSuppressedOcc', isTrue );
    }
};

/**
 * Populate the contextKeyObject on data object from viewModel.
 *
 * @param {Object} data - The 'data' object from viewModel
 * @returns {Object} The 'data' object from viewModel
 */
export let populateContextKey = function( data ) {
    data.subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    if( data.subPanelContext ) {
        if( _.get( data, 'subPanelContext.configurationInPanel' ) ) {
            data.contextKeyObject = appCtxSvc.getCtx( 'aceActiveContext.context' );
            data.contextKey = 'aceActiveContext.context';
            data.viewKey = appCtxSvc.getCtx( 'aceActiveContext.key' );
            return;
        } else if( _.get( data, 'subPanelContext.provider.viewKey' ) ) {
            data.contextKeyObject = appCtxSvc.getCtx( data.subPanelContext.provider.viewKey );
            data.contextKey = data.subPanelContext.provider.viewKey;
            data.viewKey = data.subPanelContext.provider.viewKey;
            return;
        }
    }
    data.contextKeyObject = appCtxSvc.getCtx( 'aceActiveContext.context' );
    data.contextKey = 'aceActiveContext.context';
    data.viewKey = appCtxSvc.getCtx( 'aceActiveContext.key' );
    return data;
};

/**
 * Get the data object from viewModel.
 *
 * @param {Object} data - The 'data' object from viewModel
 * @returns {Object} The 'data' object from viewModel
 */
export let getViewModelData = function( data ) {
    return data;
};

export default exports = {
    initialize,
    destroy,
    updateCtxWithViewToggleValue,
    populateContextKey,
    getViewModelData
};
app.factory( 'aceStructureConfigurationService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */
