// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmTreeService
 */
import appContextService from 'js/appCtxService';
/** 
 * sets selection mode for tree and viewer
 * @param {Boolean} multiSelectionEnable  multi Selection Enable flag
 */
export function setSingleSelectMode( multiSelectionEnable ) {
    let mbomContext = appContextService.getCtx( 'mbomContext' );
    let ebomContext = appContextService.getCtx( 'ebomContext' );
    if( mbomContext && ebomContext ) {
        mbomContext.pwaSelectionModel.setMultiSelectionEnabled( multiSelectionEnable );
        ebomContext.pwaSelectionModel.setMultiSelectionEnabled( multiSelectionEnable );
    }
}

export default {
    setSingleSelectMode
};
