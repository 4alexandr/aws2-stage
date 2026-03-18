// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Initialization service for EasyPlan.
 *
 * @module js/epInitializationService
 */

import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import epHostingMessagingService from 'js/epHostingMessagingService';
import appCtxService from 'js/appCtxService';
import { initForNavigationFromHosted } from 'js/epNavigationService';
import mfeVMOLifeCycleSvc from 'js/services/mfeViewModelObjectLifeCycleService';
import { constants as epLoadConstants } from 'js/epLoadConstants';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import epSessionService from 'js/epSessionService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import epBackToBalancingService from 'js/epBackToBalancingService';
import tcSvrVer from 'js/TcServerVersion';
import cdm from 'soa/kernel/clientDataModel';

'use strict';

let unSubscribeEvents = [];
let originalUseObjectQuotaValue;
let imanObjectTypePolicyId;
let isTCPlatformVersionUpdated = false;

const EP_SCOPE_OBJECT_KEY = 'ep.scopeObject';
const EP_LOADED_PRODUCT_OBJECT_KEY = 'ep.loadedProductObject';
const M_SELECTED_KEY = 'mselected';
const SELECTED_KEY = 'selected';

/**
 * Reset EP context
 */
export function resetEpContext() {
    appCtxService.updatePartialCtx( EP_SCOPE_OBJECT_KEY, null );
    appCtxService.updatePartialCtx( EP_LOADED_PRODUCT_OBJECT_KEY, null );
    appCtxService.updatePartialCtx( M_SELECTED_KEY, [] );
    appCtxService.updatePartialCtx( SELECTED_KEY, {} );
    eventBus.publish( 'mfe.scopeObjectChanged' );
}

/**
 * This method is used to navigate to EasyPlan object
 */
export function init() {
    epHostingMessagingService.init();
    epBackToBalancingService.init();
    mfeVMOLifeCycleSvc.init();
    originalUseObjectQuotaValue = appCtxService.getCtx( 'objectQuotaContext.useObjectQuota' );
    if( !originalUseObjectQuotaValue ) {
        appCtxService.registerCtx( 'objectQuotaContext', {
            useObjectQuota: true
        } );
        appCtxService.registerPartialCtx( 'ep.closeOldWindows', true );
    }
    imanObjectTypePolicyId = propertyPolicySvc.register( {
        types: [ {
            name: 'ImanType',
            properties: [ {
                name: 'parent_types'
            }, {
                name: 'type_name'
            } ]
        } ]
    } );

    if( !isTCPlatformVersionUpdated ) {
        updatePlatformVersion();
        isTCPlatformVersionUpdated = true;
    }
    unSubscribeEvents.push( initForNavigationFromHosted() );
}

/**
 * Load model
 *
 * @return {Object} readOnlyEffectivityModeData - the effectivity data for the read only message
 */
export function loadModel() {
    let currentStateName = AwStateService.instance.current.name;
    let currentStateParent = AwStateService.instance.current.parent;

    epSessionService.setMCN( AwStateService.instance.params.mcn );

    let loadTypeInputs;
    let loadedObjectUid = AwStateService.instance.params.uid;
    let loadType;
    const additionalLoadParams = [];
    if( currentStateName.includes( 'easyplan.admin' ) || currentStateParent.includes( 'easyplan.admin' ) ) {
        loadType = epLoadConstants.CC;
    } else {
        loadType = [ epLoadConstants.HEADER ];
        // TODO: Remove this workspace check once all pages start showing it.
        if( currentStateName !== 'manageLegacyBopPackage' && currentStateName !== 'manageWorkPackageNew' && appCtxService.ctx.workspace.workspaceId === 'WIWorkspace' ) {
            loadType.push( epLoadConstants.GET_ASSOCIATED_ASSEMBLY );
            additionalLoadParams.push( {
                attributeName: 'isScopeOrTarget',
                attributeValue: 'Target',
                tagName: 'productInfo'
            } );
        }
    }
    loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( loadType, loadedObjectUid, null, null, additionalLoadParams );
    return epLoadService.loadObject( loadTypeInputs, true ).then(
        function( response ) {
            const loadedVMO = mfeVMOLifeCycleSvc.createViewModelObjectFromUid( loadedObjectUid );
            appCtxService.updatePartialCtx( EP_SCOPE_OBJECT_KEY, loadedVMO );
            if( response.loadedObjectsMap.associatedAssembly && response.loadedObjectsMap.associatedAssembly.length > 0 ) {
                const loadedProductObjectVMO = mfeVMOLifeCycleSvc.createViewModelObjectFromModelObject( response.loadedObjectsMap.associatedAssembly[0] );
                appCtxService.updatePartialCtx( EP_LOADED_PRODUCT_OBJECT_KEY, loadedProductObjectVMO );
            }
            appCtxService.updatePartialCtx( M_SELECTED_KEY, [ loadedVMO ] );
            appCtxService.updatePartialCtx( SELECTED_KEY, loadedVMO );

            if( response.loadedObjectsMap.ChangeNoticeRevision ) {
                const mcnObject = response.loadedObjectsMap.ChangeNoticeRevision[ 0 ];
                appCtxService.updatePartialCtx( 'ep.mcnObject', mcnObject );
            }

            const readOnlyModeCaptionData = getReadOnlyByEffectivityCaptionData( response );
            eventBus.publish( 'mfe.scopeObjectChanged' );
            return readOnlyModeCaptionData;
        } );
}

/**
 * Check for read only mode according to effectivity and get the date for the read only message
 * @param {ObjectArray} loadResponse - the load soa response
 *
 * @return {Object} readOnlyModeCaptionData - the data for the read only message
 */
export function getReadOnlyByEffectivityCaptionData( loadResponse ) {
    const MBC_IS_READ_ONLY = epBvrConstants.MBC_IS_READ_ONLY;
    let isReadOnlyMode = false;
    let readOnlyModeCaptionData;

    const workPackage = loadResponse.loadedObjectsMap.collaborationContext[ 0 ];
    if( workPackage ) {
        const collaborationContextUid = workPackage.uid;
        if( workPackage.props && workPackage.props[ MBC_IS_READ_ONLY ] ) {
            isReadOnlyMode = workPackage.props[ MBC_IS_READ_ONLY ].uiValues[ 0 ] === 'True';
            if( isReadOnlyMode === true && loadResponse.relatedObjectsMap[ collaborationContextUid ] ) {
                const effectivityData = loadResponse.relatedObjectsMap[ collaborationContextUid ].additionalPropertiesMap2;
                readOnlyModeCaptionData = {
                    selectedRevisionRule: effectivityData.revisionRule[ 0 ],
                    SelectedPlanUnit: '',
                    selectedEndItem: ''
                };
                if( effectivityData.effectivityDate && effectivityData.effectivityDate[ 0 ] ) {
                    readOnlyModeCaptionData.SelectedPlanUnit = effectivityData.effectivityDate[ 0 ];
                } else if( effectivityData.unitNumber && effectivityData.unitNumber[ 0 ] ) {
                    readOnlyModeCaptionData.SelectedPlanUnit = effectivityData.unitNumber[ 0 ] + ' |';
                }
                if( effectivityData.endItem && effectivityData.endItem[ 0 ] ) {
                    readOnlyModeCaptionData.selectedEndItem = effectivityData.endItem[ 0 ];
                }
            }
        }
    }
    return readOnlyModeCaptionData;
}

/**
 * Update tc platform version in tcSessionData.
 * Sync command should be visible only for version >= TC12.4.0.1
 */
export function updatePlatformVersion() {
    const phase = tcSvrVer.phase;
    if( phase ) {
        var stringArray = phase.split( '_' );
        if( stringArray !== null && stringArray.length >= 2 ) {
            const str = stringArray[ 0 ];
            const phaseVersion = parseInt( str, 10 );
            if( phaseVersion >= 10 ) {
                appCtxService.updatePartialCtx( 'tcSessionData.phaseVersion', phaseVersion );
            }
        }
    }
}

/**
 * Destroy
 */
export function destroy() {
    unSubscribeEvents.forEach( subDef => {
        eventBus.unsubscribe( subDef );
    } );
    epHostingMessagingService.destroy();
    mfeVMOLifeCycleSvc.destroy();
    appCtxService.updatePartialCtx( 'objectQuotaContext.useObjectQuota', originalUseObjectQuotaValue );
    appCtxService.unRegisterCtx( 'ep.mcnObject' );
    appCtxService.unRegisterCtx( 'tcSessionData.phaseVersion' );
    resetEpContext();
    if( imanObjectTypePolicyId ) {
        propertyPolicySvc.unregister( imanObjectTypePolicyId );
    }
}

// eslint-disable-next-line no-unused-vars
let exports = {};
export default exports = {
    init,
    loadModel,
    resetEpContext,
    getReadOnlyByEffectivityCaptionData,
    updatePlatformVersion,
    destroy
};
