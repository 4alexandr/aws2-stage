// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpPropConstants from 'js/constants/ngpPropertyConstants';
import ngpLoadSvc from 'js/services/ngpLoadService';
import ngpDataUtils from 'js/utils/ngpDataUtils';
import vmoSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import mfeHostingService from 'js/services/mfeHostingService';
import popupService from 'js/popupService';
import eventBus from 'js/eventBus';
import ngpNavigationService from 'js/services/ngpNavigationService';
import ngpHostingMessagingService from 'js/services/ngpHostingMessagingService';
import addObjectUtilsSvc from 'js/addObjectUtils';
import ngpRelationSvc from 'js/services/ngpRelationService';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import ngpConstants from 'js/constants/ngpModelConstants';

/**
 * The ngp workflow service
 *
 * @module js/services/ngpChangeManagementService
 */
'use strict';

let navigateToObjectFromHostedContentListener;

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {string} activeMcnUid - mcn uid
 */
export function getActiveMcnUid( modelObject ) {
    if( modelObject ) {
        return modelObject.props[ ngpPropConstants.ACTIVE_MCN ].dbValues[ 0 ];
    }
}

/**
 *
 * @param {string} activeMcnUid - mcn uid
 * @return {promise} a promise object
 */
export function loadActiveMcn( activeMcnUid ) {
    return ngpLoadSvc.ensureObjectsLoaded( [ activeMcnUid ] ).then(
        () => {
            return vmoSvc.constructViewModelObjectFromModelObject( cdm.getObject( activeMcnUid ) );
        }
    );
}

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {string[]} mcnUids - a list of mcn uids
 */
export function getPreviousMcnUids( modelObject ) {
    let uids = [];
    if( modelObject ) {
        const activeMcn = modelObject.props[ ngpPropConstants.ACTIVE_MCN ].dbValues[ 0 ];
        const associatedMcns = modelObject.props[ ngpPropConstants.ASSOCIATED_MCNS ].dbValues;
        const mcnHistoryUids = associatedMcns.filter( ( uid ) => uid !== activeMcn );
        uids = mcnHistoryUids;
    }
    return uids;
}

/**
 *
 * @param {string[]} mcnUids - a list of mcn uids
 * @return {promise} a promise object
 */
export function loadPreviousMcns( mcnUids ) {
    return ngpLoadSvc.ensureObjectsLoaded( mcnUids ).then(
        () => {
            let previousMcns = mcnUids.map( ( uid ) => vmoSvc.constructViewModelObjectFromModelObject( cdm.getObject( uid ) ) );
            return ngpDataUtils.sortModelObjectsByProp( previousMcns, ngpPropConstants.CREATION_DATE, false );
        }
    );
}

/**
 *
 * @param {string} activeMcnUid - the active mcn uid
 * @return {promise} a promise object
 */
export function loadRelatedEcns( activeMcnUid ) {
    return ngpLoadSvc.getPropertiesAndLoad( [ activeMcnUid ], [ ngpPropConstants.ECNS_OF_MCN ] ).then(
        () => {
            const activeMcn = cdm.getObject( activeMcnUid );
            const ecnUids = activeMcn.props[ ngpPropConstants.ECNS_OF_MCN ].dbValues;
            const ecnVMOs = ecnUids.map( ( uid ) => vmoSvc.constructViewModelObjectFromModelObject( cdm.getObject( uid ) ) );
            return ngpDataUtils.sortModelObjectsByProp( ecnVMOs, ngpPropConstants.CREATION_DATE, false );
        }
    );
}

/**
 *
 * @return {boolean} a boolean
 */
export function isActiveMcnPopupOpened() {
    return document.getElementsByClassName( 'aw-ngp-activeMCNPopup' ).length !== 0;
}

/**
 * set the hosting popup and relevant url to open
 * @param {Object} ctx - the ctx object
 * @param {object} contextModelObj - the context model object
 * @param {Object} data
 */
export function setHostingPopup( ctx, contextModelObj, data ) {
    ngpHostingMessagingService.init();
    const contextDefined = Boolean( contextModelObj && contextModelObj.uid );
    const uid = contextDefined ? contextModelObj.uid : ctx.selected.uid;
    const params = {
        uid
    };

    mfeHostingService.initHosting( 'ngp', 'com.siemens.splm.client.mfg.ngp/ngpEcn', params, 'impactedAnalysisHostedIframe' );

    navigateToObjectFromHostedContentListener = eventBus.subscribe( 'navigateToObjectFromHostedContent', function( eventData ) {
        eventBus.unsubscribe( navigateToObjectFromHostedContentListener );
        navigateToObjectFromHostedContentListener = null;
        destroyHostingPopup( data._internal.panelId, contextDefined );
        ngpNavigationService.onNavigationFromHostedRequest( eventData );
    } );
}

/**
 * cauculate the src iframe
 * @param {Object} ctx - the ctx object
 * @param {Object} contextModelObj - the context modelObject
 * @return {string} the iframe src string
 */
export function getIframeSrc( ctx, contextModelObj ) {
    const contextDefined = Boolean( contextModelObj && contextModelObj.uid );
    const uid = contextDefined ? contextModelObj.uid : ctx.selected.uid;
    const params = {
        uid
    };

    return mfeHostingService.initSrc( 'ngp', 'com.siemens.splm.client.mfg.ngp/ngpEcn', params );
}
/**
 * clear all resource of hosting when closing popup
 * @param { string } popupId - the popup id
 * @param { boolean } isUsingImpactAnalysisHostingSvc - boolean which hosting service is used
 *
 */
export function destroyHostingPopup( popupId, isUsingImpactAnalysisHostingSvc ) {
    if( !isUsingImpactAnalysisHostingSvc ) {
        ngpHostingMessagingService.destroy();
        mfeHostingService.destroyHosting();
    }
    popupService.hide( popupId );
    if( navigateToObjectFromHostedContentListener ) {
        eventBus.unsubscribe( navigateToObjectFromHostedContentListener );
        navigateToObjectFromHostedContentListener = null;
    }
}

/**
 * cauculate the src iframe
 * @param { Object } ctx - the ctx object
 * @param {Object} contextModelObj - the context modelObject
 * @return {Object} object with the iframeId and boolean stating if we're using the secondary hosting service
 */
export function getPopupParams( ctx, contextModelObj ) {
    const shouldUseSecondaryHostingSvc = Boolean( contextModelObj && contextModelObj.uid );
    return {
        iframeId: 'impactedAnalysisHostedIframe',
        isUsingSecondaryHostingSvc: shouldUseSecondaryHostingSvc,
        ecnName: shouldUseSecondaryHostingSvc ? contextModelObj.props.object_name.uiValues[ 0 ] : ctx.selected.props.object_name.uiValues[ 0 ]
    };
}

/**
 * @param { object } data - the data object
 * @param { modelObject } modelObject - a given model object
 * @return { object } - the created input object
 */
export function createRelateAndSubmitSoaInput( data, modelObject ) {
    const createInput = addObjectUtilsSvc.getCreateInput( data );
    createInput[ 0 ].targetObject = {
        uid: 'AAAAAAAAAAAAAA',
        type: 'unknownType'
    };
    createInput[ 0 ].workflowData.submitToWorkflow = [ '1' ];
    createInput[ 0 ].dataToBeRelated.CMHasImpactedItem = [ modelObject.uid ];
    return createInput;
}

/**
 * @param { object } viewModelData - the viewModel data object
 * @param { modelObject } scopeObject - a given scope object
 * @return { promise } - a promise object
 */
export function createMcnAndSubmitToWorkflow( viewModelData, scopeObject ) {
    const soaInput = createRelateAndSubmitSoaInput( viewModelData, scopeObject );
    return ngpRelationSvc.createRelateAndSubmitObjects( soaInput ).then(
        () => true,
        () => false
    );
}

/**
 * @param { string } mcnTypeName - the mcn type name
 * @return { boolean } - a boolean
 */
export function mcnTypeToCreateValidation( mcnTypeName ) {
    if( mcnTypeName ) {
        return soaSvc.ensureModelTypesLoaded( [ mcnTypeName ] ).then(
            () => {
                var modelType = cmm.getType( mcnTypeName );
                return cmm.isInstanceOf( ngpConstants.MCN_OBJECT_BASE_TYPE, modelType );
            }
        );
    }
    return new Promise( ( resolve ) => {
        resolve( false );
    } );
}

let exports;
export default exports = {
    mcnTypeToCreateValidation,
    createMcnAndSubmitToWorkflow,
    createRelateAndSubmitSoaInput,
    loadActiveMcn,
    getActiveMcnUid,
    getPreviousMcnUids,
    loadPreviousMcns,
    loadRelatedEcns,
    isActiveMcnPopupOpened,
    setHostingPopup,
    destroyHostingPopup,
    getPopupParams,
    getIframeSrc
};
