// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpPinSvc from 'js/services/ngpPinService';
import ngpFavoritesSvc from 'js/services/ngpFavoritesService';
import ngpCloneSvc from 'js/services/ngpCloneService';
import ngpModelViewsSvc from 'js/services/ngpModelViewsService';
import ngpWorkflowSvc from 'js/services/ngpWorkflowService';
import ngpHeaderPolicy from 'js/services/ngpHeaderPolicy';
import ngpPolicySvc from 'js/services/ngpPolicyService';
import ngpTypeUtils from 'js/utils/ngpTypeUtils';

import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';

/**
 * NGP header service
 *
 * @module js/services/ngpHeaderService
 */
'use strict';

const NGP_HEADER_POLICY_NAME = 'ngpHeaderPolicyName';
const NGP_STATUS_CTX_PATH = 'ngp.scopeObject.status';

/**
 * @param {modelObject} modelObject - a given modelObject
 *
 */
export function updateHeader( modelObject ) {
    ngpFavoritesSvc.isInFavorites( modelObject ).then(
        ( isInFavorites ) => {
            appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.isInFavorites`, isInFavorites );
        }
    );
    ngpPinSvc.isPinnedToHome( modelObject ).then(
        ( isPinned ) => {
            appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.isPinnedToHome`, isPinned );
        }
    );
    ngpCloneSvc.getCloneStatus( modelObject, false ).then(
        ( cloneStatus ) => {
            appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.cloneStatus`, cloneStatus );
        }
    );
    ngpModelViewsSvc.getSendToNxStatus( modelObject ).then(
        ( hasBackgroundElements ) => {
            appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.hasBackgroundElements`, hasBackgroundElements );
        }
    );
    ngpWorkflowSvc.getDiscontinuedAndNotReleasedProcessesUids( modelObject ).then(
        ( discontinuedUids ) => {
            appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.amountOfDiscontinuedSubElements`, discontinuedUids.length );
        }
    );
}

/**
 * Registers the property policy of the header
 */
export function init() {
    ngpPolicySvc.register( NGP_HEADER_POLICY_NAME, ngpHeaderPolicy );
}

/**
 * Unregisters the header policy
 */
export function destroy() {
    ngpPolicySvc.unregister( NGP_HEADER_POLICY_NAME );
}

/**
 *
 * @param {modelObject[]} updatedObjects - updated uids
 */
export function updateDiscontinuedElementsIndication( updatedObjects ) {
    const contextObj = appCtxSvc.getCtx( 'ngp.scopeObject' );
    if( ngpTypeUtils.isActivity( contextObj ) && Array.isArray( updatedObjects ) && updatedObjects.length > 0 ) {
        const contextUpdated = _.find( updatedObjects, ( obj ) => obj.uid === contextObj.uid );
        if( contextUpdated ) {
            ngpWorkflowSvc.getDiscontinuedAndNotReleasedProcessesUids( contextObj ).then(
                ( discontinuedUids ) => {
                    appCtxSvc.updatePartialCtx( `${NGP_STATUS_CTX_PATH}.amountOfDiscontinuedSubElements`, discontinuedUids.length );
                }
            );
        }
    }
}

let exports = {};
export default exports = {
    updateHeader,
    updateDiscontinuedElementsIndication,
    init,
    destroy
};
