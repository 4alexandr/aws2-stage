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
 * @module js/MrmClassificationResourceService
 */
import commandsSvc from 'js/command.service';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

/**
 * Set the resource tools selection on ctx
 * @param {ArrayList} selectedObjects from selection model of pwa
 */
export function selectionChanged( selectedComponents ) {
    if( selectedComponents.length > 0 ) {
        if( appCtxService.ctx.mrmAddResourceContext === undefined ||
            appCtxService.ctx.mrmAddResourceContext === '' ) {
            appCtxService.ctx.mrmAddResourceContext = {};
        }
        appCtxService.ctx.mrmAddResourceContext.selectedComponents = selectedComponents;
    }

    if( selectedComponents && selectedComponents.length === 0 ) {
        appCtxService.ctx.mrmAddResourceContext.selectedComponents = [];
    }
}

/**
 * Restore the ctx variables as we are adding the custom state to show the classification page
 * @param {Object} ctxVarName list/single ctx parameters to restore on parent page
 */
export function restoreCtxVariables( ctxVarName ) {
    let vmodeContext = appCtxService.getCtx('ViewModeContext');

    if( Array.isArray( ctxVarName ) ) {
        ctxVarName.forEach((param) => {
            appCtxService.updateCtx( param,appCtxService.getCtx('mrmLargePopup.'+ param) );
            if(param === 'locationContext')
            {
                appCtxService.unRegisterCtx( 'mrmLargePopup.'+ param );
            }
        });       
    }else{
        if(ctxVarName === 'ViewModeContext' && vmodeContext['ViewModeContext'] === 'None'){
            appCtxService.updateCtx( 'ViewModeContext',appCtxService.getCtx('mrmLargePopup.ViewModeContext') );
            appCtxService.unRegisterCtx( 'mrmLargePopup.ViewModeContext' );
            appCtxService.updateCtx( 'sublocation',appCtxService.getCtx('mrmLargePopup.sublocation') );
            appCtxService.unRegisterCtx( 'mrmLargePopup.sublocation' );
            appCtxService.updateCtx( 'selected',appCtxService.getCtx('mrmLargePopup.selected') );
            appCtxService.unRegisterCtx( 'mrmLargePopup.selected' );
            appCtxService.updateCtx( 'pselected',appCtxService.getCtx('mrmLargePopup.pselected') );
            appCtxService.unRegisterCtx( 'mrmLargePopup.pselected' );
            appCtxService.updateCtx( 'mselected',appCtxService.getCtx('mrmLargePopup.mselected') );
            appCtxService.unRegisterCtx( 'mrmLargePopup.mselected' );
            if (appCtxService.ctx.mrmAddResourceContext) {
                appCtxService.ctx.mrmAddResourceContext.viewMode = '';
            }
            //After adding components or closing classification search dialog directly using "X" button we need to reset primary work area,
            //so that newly added components are loaded into structure and state is restore properly
            eventBus.publish('acePwa.reset');
        }
    }

    return true;
}

/**
 * Clone the ctx variables as we are adding the custom state to show the classification page,
 * Once the dialog is closed then ctx variables will be restore.
 * @param {Object} ctxVarName list of ctx parameters
 */
export function updateCtxVariables( ctxVarName ) {
    if( appCtxService.ctx.mrmAddResourceContext === undefined ||
        appCtxService.ctx.mrmAddResourceContext === '' ) {
        appCtxService.ctx.mrmAddResourceContext = {};
    }
    
    //Clear old selection before opening the dialog
    if(appCtxService.ctx.mrmAddResourceContext.selectedComponents) {
        appCtxService.ctx.mrmAddResourceContext.selectedComponents = [];
    }

    appCtxService.ctx.mrmAddResourceContext.viewMode = 'resource';

    ctxVarName.forEach((param) => {
        let targetObj = Object.assign( {}, appCtxService.getCtx(param) );        
        appCtxService.registerCtx( 'mrmLargePopup.'+ param, targetObj );
    });

    appCtxService.ctx.locationContext['ActiveWorkspace:Location'] = 'com.siemens.splm.classificationLocation';
    appCtxService.ctx.locationContext['ActiveWorkspace:SubLocation'] = 'showClassification';
    return true;
}

/**
 * Execute command for assign classification . 
 * @param {Object} sourceObject selected process/operation
 */
export function addMrmClassifiedResources( sourceObject ) {
    commandsSvc.executeCommand( 'addResourceSelectedInClassificationPopup', sourceObject );
}

/**
 * It sets number of selected stand alone ICOs and selected classified components in context "mrmAddResourceContext" 
 * @param {ArrayList} selectedComponents selected components
 */
export function addMrmClassifiedResourcesPreChecks( selectedComponents ) {
    var numberOfSelStandAloneICOs = 0;
    var selectedClassifiedComps = [];
    _.forEach( selectedComponents, function( selectedComponent ) {
        if( selectedComponent.modelType.typeHierarchyArray.indexOf( 'Cls0ClassBase' ) > -1 ) {
            numberOfSelStandAloneICOs++;
        }
        else
        {
            selectedClassifiedComps.push(selectedComponent);
        }
    } );
    
    appCtxService.ctx.mrmAddResourceContext.selectedClassifiedComps = selectedClassifiedComps;
    appCtxService.ctx.mrmAddResourceContext.numberOfSelStandAloneICOs = numberOfSelStandAloneICOs;        
}

let exports = {};
export default exports = {    
    addMrmClassifiedResources,
    selectionChanged,
    restoreCtxVariables,
    updateCtxVariables,
    addMrmClassifiedResourcesPreChecks
};