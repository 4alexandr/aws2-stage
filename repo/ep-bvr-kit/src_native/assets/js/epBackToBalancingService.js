// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for variants
 *
 * @module js/epBackToBalancingService
 */
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import { constants as epBvrConstants } from 'js/epBvrConstants';

'use strict';
let locationCompleteEventSub;
const backToBalancingUid = 'ep.backToBalancing.uid';
const isFromProdBopScope = 'ep.backToBalancing.isFromProdBopScope';
const parentStateEasyPlan = 'com_siemens_splm_client_mfg_easyplan';
/**
 * On location changed logic
 * @param {Object} eventData - event data information with name and value of changes
 */
function locationChanged( eventData ) {
    if( eventData.name === 'state' ) {
        const state = AwStateService.instance;
        //at this moment the loaded object is still previous loaded object
        const isPrevLoadedProdBop = mfeTypeUtils.isOfType( appCtxService.ctx.epPageContext.loadedObject, epBvrConstants.MFG_PRODUCT_BOP );
        const isPrevLoadedOperation = mfeTypeUtils.isOfType( appCtxService.ctx.epPageContext.loadedObject, epBvrConstants.MFG_BVR_OPERATION );
        const isProdBopScope = appCtxService.getCtx( isFromProdBopScope );
        if( isPrevLoadedProdBop || state.current.name === 'functionalPlan' ) {
            appCtxService.updatePartialCtx( isFromProdBopScope, true );
        }else if ( !isProdBopScope ||  !isPrevLoadedOperation ) {
            appCtxService.updatePartialCtx( isFromProdBopScope, false );
        }

        if( state.current.name === 'LineBalancing' ) {
            appCtxService.updatePartialCtx( backToBalancingUid, state.params.uid );
        }else if ( state.current.parent !== parentStateEasyPlan ) {
            appCtxService.updatePartialCtx( backToBalancingUid, '' );
        }
    }
}
/**
 * Initialization
 */
export function init() {
    if( !locationCompleteEventSub ) {
        appCtxService.registerPartialCtx( backToBalancingUid, '' );
        appCtxService.registerPartialCtx( isFromProdBopScope, false );
        locationCompleteEventSub = eventBus.subscribe( 'appCtx.register', locationChanged );
        const state = AwStateService.instance;
        if( state.current.name === 'LineBalancing' ) {
            appCtxService.updatePartialCtx( backToBalancingUid, state.params.uid );
        }
    }
}


// eslint-disable-next-line no-unused-vars
let exports = {};
export default exports = {
    init
};
