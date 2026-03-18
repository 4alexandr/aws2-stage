// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import mfeHostingMessagingService from 'js/services/mfeHostingMessagingService';
import _leavePlaceService from 'js/leavePlace.service';
import AwPromiseService from 'js/awPromiseService';

/**
 * @module js/epHostingMessagingService
 */
'use strict';

let deferredLeavePlacePromise;

export const init = function( data ) {
    let mfeSyncCtxPath = 'ep.selectedProductVariants';
    mfeHostingMessagingService.initHostingMessaging( getEPHostedIframeID, mfeSyncCtxPath );
    mfeHostingMessagingService.messageHandlers.mfeAddPopupGlassPanel.push( addGlassPanel );

    //For Handling leave place service in hosted
    mfeHostingMessagingService.messageHandlers.registerLeavePlaceHandlerToHost = [ registerLeavePlaceHandlerToHost ];
};

/**
 *
 * @param {object} sourceWindow - the source window object
 * @return {string} the iframe id
 */
function getEPHostedIframeID() {
    return mfeHostingMessagingService.getDefaultHostedIframeID();
}

const addGlassPanel = function( data ) {
    if( !mfeHostingMessagingService.getGlassPanelForKey( 'headerNavigation' ) ) {
        let mfeEpHeaderElement = document.querySelector( 'aw-include[name=\'epHeader\']' );
        const mfeEpHeaderLeft = mfeEpHeaderElement.offsetLeft + 'px';

        //calculate the height of the header + tabs
        let hostedIframeHeight = document.querySelector( '#hostedIframe' ).offsetHeight;
        let mfeEpHeaderElementHeight = document.querySelector( 'body' ).offsetHeight - hostedIframeHeight;
        let element = document.createElement( 'div' );
        mfeHostingMessagingService.setGlassPanelStyle( mfeEpHeaderElementHeight + 'px', '100%', element, data.backgroundColor );
        mfeHostingMessagingService.addGlassPanelToMap( 'headerNavigation', element );
        mfeEpHeaderElement.appendChild( element );
    }
};

/**
 * Register LeavePlaceServicce Handler to Host
 *  @param {object} data - data
 **/
function registerLeavePlaceHandlerToHost( data ) {
    _leavePlaceService.registerLeaveHandler( {
        okToLeave: function() {
            return leavePlaceHandlerCallback( data );
        }
    } );
}

/**
 * performSaveThroughHosted
 * 
 * @param {Object} saveInput save soa input
 * @param { Array } relatedObjects save realted objects
 */
export function performSaveThroughHosted( saveInput, relatedObjects ) {
    const data = {
        saveInput,
        relatedObjects
    };
    mfeHostingMessagingService.postMessageToHostedWindow( 'performSaveThroughHosted', 'ep.performSaveThroughHosted', JSON.stringify( data ) );
}

/**
 * LeavePlaceHandler Callback function
 *  @param {object} data - data
 **/
function leavePlaceHandlerCallback( data ) {
    deferredLeavePlacePromise = AwPromiseService.instance.defer();
    mfeHostingMessagingService.postMessageToHostedWindow( 'notifyHostedLeavePlaceHandler', 'ep.notifyHostedLeavePlaceHandler', data.value );
    mfeHostingMessagingService.messageHandlers.leavePlaceServiceHostCallbackEvent = [ leavePlaceServiceHostCallbackEvent ];
    return deferredLeavePlacePromise.promise;
}

/**
 * For notifying Host Leave Place Service callback event
 **/
function leavePlaceServiceHostCallbackEvent() {
    if( deferredLeavePlacePromise ) {
        deferredLeavePlacePromise.resolve();
    }
}

const destroy = function() {
    mfeHostingMessagingService.removeEventListners();
};

let exports = {};
export default exports = {
    init,
    destroy,
    performSaveThroughHosted
};
