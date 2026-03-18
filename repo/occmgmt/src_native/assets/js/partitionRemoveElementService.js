// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Removal of partition structure elements
 *
 * @module js/partitionRemoveElementService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 Function gets called remove element soa return created lines.
 *  The Use case is for Structure Partition.
 * When we remove Child partition line referenced under the single parent,
 * it becomes the top level partition line
 * We need to refresh the PWA to show the created
 * partition line
 * */
export let updateAcePwaWithCreatedPartition = function(  ) {
eventBus.publish( 'acePwa.reset', {
    "retainTreeExpansionStates": true,
    viewToReact:appCtxSvc.ctx.aceActiveContext.key
 } );
    var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
    if( inactiveView ) {
            eventBus.publish( 'acePwa.reset', { "retainTreeExpansionStates": true,viewToReset: inactiveView, silentReload: true } );
    }
};

/**
 * Structure partition Remove Element service utility
 */

export default exports = {
updateAcePwaWithCreatedPartition
};
app.factory( 'partitionRemoveElementService', () => exports );
