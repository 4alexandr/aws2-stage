// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/syncPublish
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

export let getSynchronizeMeasurableAttributesInput = function( operation ) {
    var selected = appCtxSvc.getCtx( "selected" );
    var pselected = appCtxSvc.getCtx( "pselected" );

    var syncCandidates = appCtxSvc.getCtx( "syncCandidates" );
    var publishCandidates = appCtxSvc.getCtx( "publishCandidates" );
    appCtxSvc.unRegisterCtx( "syncCandidates" );
    appCtxSvc.unRegisterCtx( "publishCandidates" );
    var xrtSummaryContextObject = appCtxSvc.getCtx( "xrtSummaryContextObject" );
    var parentObj = null;
    if( pselected && cmm.isInstanceOf( 'Crt0VldnContractRevision', pselected.modelType ) ) {
        parentObj = pselected;
    } else if( selected && cmm.isInstanceOf( 'Crt0VldnContractRevision', selected.modelType ) ) {
        parentObj = selected;
    } else if( xrtSummaryContextObject &&
        cmm.isInstanceOf( 'Crt0VldnContractRevision', xrtSummaryContextObject.modelType ) ) {
        parentObj = xrtSummaryContextObject;
    }
    if( operation === "Sync" ) {
        return {
            input: [ {
                clientId: "SyncOrPublish",
                analysisRequest: parentObj,
                attrs: syncCandidates,
                action: "syncAttr"
            } ]
        };
    } else {
        return {
            input: [ {
                clientId: "SyncOrPublish",
                analysisRequest: parentObj,
                attrs: publishCandidates,
                action: "publishAttr"

            } ]
        };
    }

};

export let refreshTable = function() {
    eventBus.publish( "Att1ShowAttrProxyTable.refreshTable" );
};

export default exports = {
    getSynchronizeMeasurableAttributesInput,
    refreshTable
};
app.factory( 'syncPublish', () => exports );
