// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/mbmViewUtils
 */

import appContextService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import preferenceService from 'soa/preferenceService';

'use strict';

const MBM_ALIGNMENT_STATE = "mbmAlignmentState";
const MBM_3DVIEWER_CONTENT_LAYOUT_PREFERENCE = "MbmAlignmentPage3DViewerLayout";
const NO_VIEWER = '0';
const EBOM_ONLY = '1';
const MBOM_ONLY = '2';
const EBOM_AND_MBOM = '3';

/**
 * Listens to clicks of ebom or mbom view 
 * @param {data} data of the active view
 */
export let mbmInitializeContextViewerClickListener = function( data ) {
    data.mbmContextViewerClickEvent = function( contextKey ) {
        eventBus.publish( 'ace.activateWindow', { key: contextKey } );
    };
};

/**
 * Toggles Show 3D viewer and Hide 3D viewer commands
 * @param {contextKey} contextKey name of the active context
 * @return {Promise} promise
 */
export let mbmToggleAlignmentContent = function( contextKey) {    
   
    let context = appContextService.getCtx( MBM_ALIGNMENT_STATE );
    if(context && context.hasOwnProperty(contextKey)) {
        
        let showGraphics = context[contextKey].showGraphics;
        let initialize3DViewer = context[contextKey].initialize3DViewer;
        if(! initialize3DViewer) {           
            context[contextKey].initialize3DViewer = true;
        }

        context[contextKey].showGraphics = !showGraphics;
    }
    return update3DViewerContentLayoutPreference();
};

/**
 * Retrieves the preference MbmAlignmentPage3DViewerLayout
 *  @return {Promise} promise
 */
export let get3DViewerContentLayoutPreference = function( ) {
    
   let state = {
        'ebomContext': {
            showGraphics: false,
            initialize3DViewer: false
        },
        'mbomContext': {
            showGraphics: false,
            initialize3DViewer: false
        }
    };
  
    appContextService.updateCtx(MBM_ALIGNMENT_STATE, state);

    return preferenceService.getStringValue( MBM_3DVIEWER_CONTENT_LAYOUT_PREFERENCE ).then( function( prefValue ) {    
        if(prefValue === EBOM_ONLY) {
            state.ebomContext.showGraphics = true;
            state.ebomContext.initialize3DViewer = true;       
          
        } else if(prefValue === MBOM_ONLY) {
            state.mbomContext.showGraphics = true;
            state.mbomContext.initialize3DViewer = true;

        } else if(prefValue === EBOM_AND_MBOM) {
            state.ebomContext.showGraphics = true;
            state.ebomContext.initialize3DViewer = true;
            state.mbomContext.showGraphics = true;
            state.mbomContext.initialize3DViewer = true;          
        }        
        appContextService.updateCtx(MBM_ALIGNMENT_STATE, state);
    });       
      
};

/**
 * Updates the preference MbmAlignmentPage3DViewerLayout
 *  @return {Promise} promise
 */
let update3DViewerContentLayoutPreference = function( ) {
   
    let state = appContextService.getCtx(MBM_ALIGNMENT_STATE);
    let prefValue = NO_VIEWER;
   
    if( state && state.ebomContext.showGraphics ) {
        if( state.mbomContext.showGraphics ) {
            prefValue = EBOM_AND_MBOM;
        } else {
            prefValue = EBOM_ONLY;
        }
    } else if (state && state.mbomContext.showGraphics ) {
        prefValue = MBOM_ONLY;
    }
    
    return preferenceService.setStringValue( MBM_3DVIEWER_CONTENT_LAYOUT_PREFERENCE, [ prefValue ] );
           
};

export default {
    mbmInitializeContextViewerClickListener,
    mbmToggleAlignmentContent,
    get3DViewerContentLayoutPreference    
};
