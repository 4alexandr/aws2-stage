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
 * @module js/manageWorkPackageService
 */

import eventBus from 'js/eventBus';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import AwStateService from 'js/awStateService';
import mfeVMOLifeCycleSvc from 'js/services/mfeViewModelObjectLifeCycleService';
import cdm from 'soa/kernel/clientDataModel';
import epObjectPropertyCacheService from 'js/epObjectPropertyCacheService';
import appCtxService from 'js/appCtxService';

'use strict';
/**
 * Initialize manage tile click listener
 *@param {Object} data - the data of the view
 */
export function initializeManageTileClickListener( data ) {
    data.onClickTile = function( subPanelContext, event ) {
        if( subPanelContext, event ) {
            eventBus.publish( 'ep.manageTileClicked', {
                viewId: subPanelContext.viewId,
                clickEvent: event
            } );
        }
    };
}

/**
 * updates manage work package command menu visibility
 *@param {Boolean} isRemoveCmdMenuVisibleFlag - flag to remove Cmd Menu Visibility flag
 */
export function updateCmdMenuVisibility( isRemoveCmdMenuVisibleFlag ) {
    let epPageContext = appCtxService.getCtx( 'epPageContext' );
    if( epPageContext.isCmdMenuVisible && isRemoveCmdMenuVisibleFlag ) {
        delete epPageContext.isCmdMenuVisible;
    } else if( epPageContext.isCmdMenuVisible ) {
        epPageContext.isCmdMenuVisible = !epPageContext.isCmdMenuVisible;
        if( !epPageContext.isCmdMenuVisible ) {
            eventBus.publish( 'ep.updateCmdMenuVisibility' );
        }
    } else {
        epPageContext.isCmdMenuVisible = true;
    }
}

/**
 * Creates view model data for manage tiles
 *@param {Object} context - subPanelContext of the view
 */
export function createManageTileData( context ) {
    if( context ) {
        const Object = cdm.getObject( epObjectPropertyCacheService.getProperty( context.uid, 'bl_revision' ) );
        const revisionRuleObject = cdm.getObject( epObjectPropertyCacheService.getProperty( context.uid, 'revisionRule' ) );
        const vmo = mfeVMOLifeCycleSvc.createViewModelObjectFromUid( Object.uid );
        context.vmo = vmo;
        context.revisionRule = revisionRuleObject.props.object_name.dbValues[ 0 ];
    }
}

/**
 * loads object
 *@param   {String} loadType - type of load object
 */
export function loadObject( loadType ) {
    if( appCtxService.ctx.ep.scopeObject && loadType ) {
        const loadedObjectUid = AwStateService.instance.params.uid;
        const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( loadType, loadedObjectUid );
        return epLoadService.loadObject( loadTypeInputs, true );
    }
}

export default {
    initializeManageTileClickListener,
    loadObject,
    createManageTileData,
    updateCmdMenuVisibility
};
