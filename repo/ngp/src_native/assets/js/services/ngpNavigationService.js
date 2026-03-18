// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import awStateSvc from 'js/awStateService';
import ngpLoadSvc from 'js/services/ngpLoadService';
import pageSvc from 'js/page.service';
import cdm from 'soa/kernel/clientDataModel';
import navigationSvc from 'js/navigationService';
import ngpDataUtils from 'js/utils/ngpDataUtils';
import ngpVmoPropSvc from 'js/services/ngpViewModelPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import msgSvc from 'js/messagingService';

export const NGP_PARENT_STATE = 'com_siemens_splm_client_mfg_ngp';
export const NGP_PARENT_URL = 'com.siemens.splm.client.mfg.ngp';
const AW_DEFAULT_URL = 'com.siemens.splm.clientfx.tcui.xrt.showObject';
const NAVIGATION_PREFIX = '#/';

/**
 * The ngp navigation service
 *
 * @module js/services/ngpNavigationService
 */
'use strict';

/**
 *
 * @param {ViewModelObject} viewModelObject - a given ViewModelObject
 * @param { String } subpageNameNavigatingFrom - the subpage name we're navigating from
 * @return {promise<String>} - a promise object with the subpage name
 */
function getSubpageToNavigateTo( viewModelObject, subpageNameNavigatingFrom ) {
    ngpVmoPropSvc.addClassLibraryProperty( viewModelObject );
    return getAvailableSubpages( viewModelObject ).then(
        ( subpages ) => {
            const hasCurrentSubpage = subpages.filter( ( subpage ) => subpage.name === subpageNameNavigatingFrom );
            if( hasCurrentSubpage.length === 1 ) {
                return subpageNameNavigatingFrom;
            }
            const defaultSubpage = _.minBy( subpages, 'data.defaultSubpagePriority' );
            return defaultSubpage.name;
        }
    );
}

/**
 *
 * @param {string} uid - a given uid to navigate to
 */
export function navigateWithInNgp( uid ) {
    const state = awStateSvc.instance;
    if( uid !== state.params.uid ) {
        const vmo = viewModelObjectSvc.constructViewModelObject( cdm.getObject( uid ) );
        getSubpageToNavigateTo( vmo, state.current.name ).then(
            ( subpageName ) => {
                state.go( subpageName, { uid } );
            }
        );
    }
}

/**
 * Navigates to the configured revision of the given modelObject or displays a message if no navigation occured
 * @param {modelObject} modelObject - given modelObject
 * @param {string} msgIfNoNavigationOccured - the message to display if the given object is already the configured object
 */
export function navigateToConfiguredRevision( modelObject, msgIfNoNavigationOccured ) {
    if( modelObject ) {
        ngpLoadSvc.getConfiguredObject( modelObject.uid ).then(
            ( configuredObj ) => {
                const configuredFoundationId = ngpDataUtils.getFoundationId( configuredObj );
                const modelObjFoundationId = ngpDataUtils.getFoundationId( modelObject );
                if( configuredFoundationId !== modelObjFoundationId ) {
                    navigateWithInNgp( configuredObj.uid );
                } else if( msgIfNoNavigationOccured ) {
                    msgSvc.showInfo( msgIfNoNavigationOccured );
                }
            }
        );
    }
}

/**
 *
 * @param {string} uid - a given uid
 * @param {string} url - the url to navigate to
 * @param {string} navigateIn - the string which states if we want to navigate to a newTab or newWindow
 */
function navigate( uid, url, navigateIn ) {
    const action = {
        actionType: 'Navigate',
        navigateTo: url
    };
    const navigationParams = {
        uid
    };
    if( navigateIn ) {
        action.navigateIn = navigateIn;
    }
    navigationSvc.navigate( action, navigationParams );
}

/**
 *
 * @param {modelObject} modelObject - a given model object
 * @param {string} navigateIn - the string which states if we want to navigate to a newTab or newWindow
 */
export function navigateToNGPFromAWPage( modelObject, navigateIn ) {
    let vmo = modelObject;
    if( !viewModelObjectSvc.isViewModelObject( modelObject ) ) {
        vmo = viewModelObjectSvc.constructViewModelObject( modelObject );
    }
    ngpVmoPropSvc.addClassLibraryProperty( vmo ).then( () => {
            return getDefaultSubpageName( vmo );
        } )
        .then(
            ( subpageName ) => {
                const url = subpageName ? `${NAVIGATION_PREFIX}${NGP_PARENT_URL}${subpageName}` : `${NAVIGATION_PREFIX}${AW_DEFAULT_URL}`;
                navigate( vmo.uid, url, navigateIn );
            }
        );
}

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {promise} a promise object
 */
function getAvailableSubpages( modelObject ) {
    return pageSvc.getAvailableSubpages( NGP_PARENT_STATE, {
        ngpObjectToNavigate: modelObject
    } );
}

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {promise} a promise object which returns a the name of the subpage
 */
export function getDefaultSubpageName( modelObject ) {
    return getAvailableSubpages( modelObject ).then(
        ( subpages ) => {
            if( Array.isArray( subpages ) && subpages.length > 0 ) {
                const defaultSubpage = _.minBy( subpages, 'data.defaultSubpagePriority' );
                if( defaultSubpage ) {
                    return defaultSubpage.url.split( '?' )[ 0 ];
                }
            }
        }
    );
}

/**
 * Reloads the current page
 */
export function reloadCurrentPage() {
    awStateSvc.instance.reload();
}

/**
 * This method subscribes event fired for navigation from hosted content
 * TODO : To be removed once Hosting is removed.
 * @param {object} requestData - the data of the request
 */
export function onNavigationFromHostedRequest( requestData ) {
    //state needs to be reloaded so that hosted subPage also gets fresh content while navigating
    //from within hosted subPage
    let routerMsg = requestData.routerMsg;
    routerMsg.Options.reload = routerMsg.ToState.name;
    const notNgpPage = routerMsg.ToState.parent !== NGP_PARENT_STATE && routerMsg.ToState.name !== NGP_PARENT_STATE;
    const ngpPageWithSubPage = routerMsg.ToState.parent === NGP_PARENT_STATE && routerMsg.ToState.name;
    if( notNgpPage || ngpPageWithSubPage ) {
        awStateSvc.instance.go( routerMsg.ToState.name, routerMsg.ToParams, routerMsg.Options );
    } else {
        const navToUid = routerMsg.ToParams.uid;
        ngpLoadSvc.ensureObjectsLoaded( [ navToUid ] )
            .then(
                () => {
                    const modelObj = cdm.getObject( navToUid );
                    return viewModelObjectSvc.constructViewModelObject( modelObj );
                }
            )
            .then(
                ( navToViewModelObj ) => {
                    return getSubpageToNavigateTo( navToViewModelObj, routerMsg.FromState.name );
                }
            )
            .then(
                ( subpageName ) => {
                    awStateSvc.instance.go( subpageName, routerMsg.ToParams, routerMsg.Options );
                }
            );
    }
}

let exports;
export default exports = {
    navigateWithInNgp,
    navigateToNGPFromAWPage,
    NGP_PARENT_URL,
    getDefaultSubpageName,
    reloadCurrentPage,
    navigateToConfiguredRevision,
    onNavigationFromHostedRequest
};
