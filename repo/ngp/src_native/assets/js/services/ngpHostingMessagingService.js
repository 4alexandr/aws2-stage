// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import mfeHostingMessagingService from 'js/services/mfeHostingMessagingService';
import eventBus from 'js/eventBus';

/**
 * @module js/services/ngpHostingMessagingService
 */
'use strict';

/**
 * Submit to workflow event subscribtion
 */
let submitToWorkflowSubscribe;

/**
 *
 * @param {object} sourceWindow - the source window object
 * @return {string} the iframe id
 */
function getNgpHostedIframeID( sourceWindow ) {
    if( sourceWindow.location && sourceWindow.location.href && sourceWindow.location.href.indexOf( '#/com.siemens.splm.client.mfg.ngp/ngpEcn?uid=' ) >= 0 ) {
        return 'impactedAnalysisHostedIframe';
    }
    return mfeHostingMessagingService.getDefaultHostedIframeID();
}

/**
 * init method for this hosting service
 */
export function init() {
    mfeHostingMessagingService.initHostingMessaging( getNgpHostedIframeID );
    mfeHostingMessagingService.messageHandlers.mfeAddPopupGlassPanel.push( addGlassPanel );
    submitToWorkflowSubscribe = eventBus.subscribe( 'ngp.message.submitToWorkflow', submitToWorkflowHandler, false );
}

/**
 *
 * This method adds a glass pane when we open a dialog from the hosted iframe
 * @param {object} data - data object
 */
function addGlassPanel( data ) {
    if( !mfeHostingMessagingService.getGlassPanelForKey( 'headerNavigation' ) ) {
        let mfeNgpHeaderElement = document.querySelector( 'aw-layout-slot[name=\'mfe_header\']' );

        if( !mfeNgpHeaderElement ) {
            mfeNgpHeaderElement = document.getElementsByClassName( 'afx-layout-header-container aw-layout-row aw-layout-flexbox afx-base-parentElement ng-scope' )[ 0 ];
        }
        const mfeNgpHeaderElementLeft = mfeNgpHeaderElement.offsetLeft + 'px';

        //calculate the height of the header + tabs
        let hostedIframeHeight = document.querySelector( '#hostedIframe' ).offsetHeight;
        let mfeNgpHeaderElementHeight = document.querySelector( 'body' ).offsetHeight - hostedIframeHeight;
        let element = document.createElement( 'div' );
        mfeHostingMessagingService.setGlassPanelStyle( mfeNgpHeaderElementHeight + 'px', '100%', element, data.backgroundColor, mfeNgpHeaderElementLeft );
        mfeHostingMessagingService.addGlassPanelToMap( 'headerNavigation', element );
        mfeNgpHeaderElement.appendChild( element );
    }
}

/**
 * Post a message upon a submit to workflow
 * @param {object} event - the event object
 */
function submitToWorkflowHandler( event ) {
    const iFrame = document.getElementById( 'hostedIframe' );
    if( iFrame ) {
        var targetWindow = iFrame.contentWindow;
        var modelObjectsUid = event.updatedObjects;

        targetWindow.postMessage( {
            type: 'submitToWorkflow',
            data: modelObjectsUid
        }, '*' );
    }
}

/**
 * This method destroys this instance of the host messaging service
 */
export function destroy() {
    mfeHostingMessagingService.removeEventListners();
    if( submitToWorkflowSubscribe ) {
        submitToWorkflowSubscribe.unsubscribe();
    }
}

export default {
    init,
    destroy
};
