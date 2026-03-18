//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/changeService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import occmgmtUtils from 'js/occmgmtUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

var _aceElementRemovedEvent = null;

/**
 * Initializes Change service.
 */
export let initialize = function() {
    if( _aceElementRemovedEvent === null ) {
        _aceElementRemovedEvent = eventBus.subscribe( 'ace.elementsRemoved', function() {
            if( occmgmtUtils.isTreeView() && appCtxSvc.ctx.aceActiveContext.context.isChangeEnabled ) {
                var parentUid = occmgmtUtils.getParentUid( appCtxSvc.ctx.selected );
                var vmoId = appCtxSvc.ctx.aceActiveContext.context.vmc.findViewModelObjectById( parentUid );
                if( vmoId !== -1 ) {
                    var vmo = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects[ vmoId ];
                    delete vmo.isExpanded;
                    vmo.isInExpandBelowMode = false;
                    eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', vmo );
                    vmo.isExpanded = true;
                    delete vmo.__expandState;
                    eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', vmo );
                }
            }
        } );
    }
};

export let destroy = function() {
    if( _aceElementRemovedEvent ) {
        eventBus.unsubscribe( _aceElementRemovedEvent );
        _aceElementRemovedEvent = null;
    }
};

/**
 * Show BOM Change Configuration service utility
 * @param {appCtxService} appCtxSvc - Service to use
 * @param {occmgmtUtils} occmgmtUtils - Service to use
 * @returns {object} - object
 */

export default exports = {
    initialize,
    destroy
};
app.factory( 'changeService', () => exports );
