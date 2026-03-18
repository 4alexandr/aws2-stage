// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Classification Service for popup.
 *
 * @module js/classificationResourceService
 */
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import commandsSvc from 'js/command.service';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

/**
 * Assign the resource to the selected process\operation
 * @param {Object} sourceObject selected tools
 * @param {Object} resourceObj selected process/operations
 */
export function assignResourceFromClassification( sourceObject, resourceObj ) {
    const relatedObjects = [];
    const saveInputWriter = saveInputWriterService.get();
    let resourceObject = _.get( resourceObj, 'commandArgs.inputObject' );
    const sourceObjectIdsWithRel = [];

    const targetObject = {
        id: [ resourceObject.uid ]
    };
    _.forEach( sourceObject, function( node ) {
        sourceObjectIdsWithRel.push( {
            Add: node.uid,
            useDefaultRelationType: "true"
        } );
        relatedObjects.push( node );
    } );

    relatedObjects.push( resourceObject );
    if( !_.isEmpty( sourceObjectIdsWithRel ) ) {
        _.forEach( sourceObjectIdsWithRel, function( sourcePrc ) {
            saveInputWriter.addAssignedTools( targetObject, sourcePrc );
        } );
    }
    epSaveService.saveChanges( saveInputWriter, false, relatedObjects );
}

/**
 * reset the clsLocation for BOE page
 */
export let setNoneSelection = function( ctx ) {
    ctx.clsLocation = ctx.clsLocation || {};
    ctx.clsLocation.tableSummaryDataProviderName = 'getClassTableSummary';
    ctx.clsLocation.isChildVNC = null;
    ctx.clsLocation.isVNCaction = null;
    ctx.clsLocation.selectedNode = null;
    ctx.clsLocation.selectedTreeNode = null;
    ctx.clsLocation.chartProvider = null;
    ctx.clsLocation.panelIsClosed = false;
    ctx.clsLocation.selectedClass = null;
    ctx.clsLocation.prevSelectedClass = null;
    ctx.clsLocation.isNavigating = true;
    ctx.clsLocation.propertiesSearch = false;
    ctx.clsLocation.isFiltersVisible = false;
    ctx.clsLocation.expansionCounter = 0;
    ctx.resourceContext = "";
};

/**
 * Set the tool selections on ctx
 * @param {ArrayList} selectionModel selection model of pwa
 */
export function selectionChanged( selectedNodes ) {
    if( selectedNodes.length > 0 ) {
        if( appCtxService.ctx.resourceContext === undefined ||
            appCtxService.ctx.resourceContext === '' ) {
            appCtxService.ctx.resourceContext = {};
        }
        appCtxService.ctx.resourceContext.selectedNodes = selectedNodes;
    }
    if( selectedNodes && selectedNodes.length === 0 ) {
        appCtxService.ctx.resourceContext.selectedNodes = [];
    }
}

/**
 * Restore the ctx variables as we are adding the custom state to show the classification page
 * @param {Object} ctxVarName list/single ctx parameters to restore on parent page
 */
export function restoreCtxVariables( ctxVarName ) {
    let vmodeContext = appCtxService.getCtx( 'ViewModeContext' );
    let pselected = appCtxService.getCtx( 'pselected' );
    let mselected = appCtxService.getCtx( 'mselected' );
    let selected = appCtxService.getCtx( 'selected' );

    if( Array.isArray( ctxVarName ) ) {
        ctxVarName.forEach( ( param ) => {
            appCtxService.updateCtx( param, appCtxService.getCtx( 'mfeLargePopup.' + param ) );
            appCtxService.unRegisterCtx( 'mfeLargePopup.' + param );
        } );
    } else {
        if( ctxVarName === 'ViewModeContext' && vmodeContext[ 'ViewModeContext' ] === 'None' ) {
            appCtxService.updateCtx( 'ViewModeContext', appCtxService.getCtx( 'mfeLargePopup.ViewModeContext' ) );
            appCtxService.updateCtx( 'sublocation', appCtxService.getCtx( 'mfeLargePopup.sublocation' ) );
            appCtxService.unRegisterCtx( 'mfeLargePopup.ViewModeContext' );
          
        }
        if( ctxVarName === 'selected' && selected === null ) {
            appCtxService.updateCtx( 'selected', appCtxService.getCtx( 'mfeLargePopup.selected' ) );
            appCtxService.updateCtx( 'pselected', appCtxService.getCtx( 'mfeLargePopup.pselected' ) );
            appCtxService.updateCtx( 'mselected', appCtxService.getCtx( 'mfeLargePopup.mselected' ) );
            appCtxService.unRegisterCtx( 'mfeLargePopup.selected' );
            appCtxService.unRegisterCtx( 'mfeLargePopup.pselected' );
            appCtxService.unRegisterCtx( 'mfeLargePopup.mselected' );
        }
    }


    return true;

}

/**
 * Clone the ctx variables as we are adding the custom state to show the classification page
 * @param {Object} ctxVarName list of ctx parameters
 */
export function updateCtxVariables( ctxVarName ) {
    ctxVarName.forEach( ( param ) => {
        let targetObj = Object.assign( {}, appCtxService.getCtx( param ) );
        appCtxService.registerCtx( 'mfeLargePopup.' + param, targetObj );
    } );
    return true;
}

/**
 * Execute command for assign classification . 
 * @param {Object} sourceObject selected process/operation
 */
export function assignResourceAction( sourceObject ) {
    commandsSvc.executeCommand( 'assignResourceSelectedInClassificationPopup', sourceObject );
}

/**
 * update the loading indication . 
 * @param {Object} data model
 */
export function updateIsLoading( data ) {
    if( data.eventData && data.eventData.firstPage && data.eventData.firstPage === true ) {
        return false;
    }
    return true;
}
let exports = {};

export default exports = {
    assignResourceFromClassification,
    assignResourceAction,
    selectionChanged,
    restoreCtxVariables,
    updateCtxVariables,
    setNoneSelection,
    updateIsLoading
};
