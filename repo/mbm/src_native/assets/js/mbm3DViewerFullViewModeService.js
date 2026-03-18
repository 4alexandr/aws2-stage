// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link mbm3DViewerFullViewModeService} which manages the mbm 3D Viewer full screen function
 *
 * @module js/mbm3DViewerFullViewModeService
 */
import appContextService from 'js/appCtxService';

'use strict';

const contextToClass = {
    ebomContext: 'aw-mbm-ebomContent',
    mbomContext:'aw-mbm-mbomContent'
};
/**
 * Class names to reference elements to hide for full screen mode
 */
const classesToHide = [ 'aw-mbm-gridContent', 'aw-layout-splitter' ];

/**
 * Removes class from elements when coming back to normal mode from full screen mode
 * @param {contextKey} contextKey name of the active context
 * @param {cssClassToRemove} class name to be removed
 */

 let removeClass = function( contextKey, cssClassToRemove ) {
    let contextClass = contextToClass[contextKey];
    let elements = document.getElementsByClassName( contextClass );
    if( elements && elements.length ) {
        for( let inx = 0; inx < elements.length; inx++ ) {
            let element = elements[inx];
            for( let idx = 0; idx < classesToHide.length; idx++ ) {
                let targetElements = element.getElementsByClassName( classesToHide[idx] );
                for( let idx1 = 0; idx1 < targetElements.length; idx1++ ) {
                    targetElements[idx1].classList.remove( cssClassToRemove );
                }
            }
        }
    }
};

/**
 * Adds class to elements when going to full screen mode from normal mode
 * @param {contextKey} contextKey name of the active context
 * @param {cssClassToAdd} cssClassToAdd class name to be added
 */
let addClass = function( contextKey, cssClassToAdd ) {
    let contextClass = contextToClass[contextKey];
    let elements = document.getElementsByClassName( contextClass );
    if( elements && elements.length ) {
        for( let inx = 0; inx < elements.length; inx++ ) {
            let element = elements[inx];
            for( let idx = 0; idx < classesToHide.length; idx++ ) {
                let targetElements = element.getElementsByClassName( classesToHide[idx] );
                for( let idx1 = 0; idx1 < targetElements.length; idx1++ ) {
                    targetElements[idx1].classList.add( cssClassToAdd );
                }
            }
        }
    }
};

/**
 * Toggles the 3 D view between full screen mode and normal mode
 * @param {Object} svInstance structure viewer instance
 */
export let mbmToggle3DViewerFullScreenMode = function( svInstance ) {
    // Check if One Step Full Screen command is active
    let context = appContextService.getCtx( svInstance.occmgmtContextNameKey );
    let fullViewModeActive;
    if ( context ) {
        fullViewModeActive = context.fullscreen;
        if ( fullViewModeActive ) {
            removeClass( svInstance.occmgmtContextNameKey, 'hidden' );
        }else{
            addClass( svInstance.occmgmtContextNameKey, 'hidden' );
        }
        appContextService.updatePartialCtx( 'fullscreenDisabled', true );
        appContextService.updatePartialCtx( svInstance.occmgmtContextNameKey + '.fullscreen', !fullViewModeActive );
    }
};

export default {
    mbmToggle3DViewerFullScreenMode
};


