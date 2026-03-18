//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/Ase1SyncInteractionsCommandService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

/**
 * Return create input for create diagram operation.
 *
 * @param {Object} data - The panel's view model object
 *
 * @return {Array} sync interaction input
 */
export let getSyncInteractionsInput = function( data ) {
    var selection = appCtxSvc.getCtx( 'mselected' );
    var occMgmnt = appCtxSvc.getCtx( 'occmgmtContext' );
    var context = appCtxSvc.getCtx( 'architectureCtx' );

    if( selection && selection.length > 0 ) {
        if( !cmm.isInstanceOf( 'Awb0Connection', selection[ 0 ].modelType ) ) {
            var intfDetailsCtx = appCtxSvc.getCtx( 'interfaceDetails' );
            if( intfDetailsCtx ) {
                var tarModelObj = intfDetailsCtx.targetModelObject;
                if( tarModelObj ) {
                    selection = [ tarModelObj ];
                }
            }
        }
    }

    context.syncRunInBackground = data.runInBackground.dbValue;

    var input = [];
    var inputData = {
        awbConnections: selection,
        runInBackground: data.runInBackground.dbValue,
        productContextElementInfo: [
            [ occMgmnt.productContextInfo ],
            [ occMgmnt.openedElement ]
        ]
    };

    input.push( inputData );

    return input;
};

/**
 * Return an Object of Ase1SyncInteractionsCommandService
 *
 * @param {Object} appCtxSvc App Context service
 * @param {Object} cmm Client Meta Model
 *
 * @return {Object} service exports
 */

export default exports = {
    getSyncInteractionsInput
};
app.factory( 'Ase1SyncInteractionsCommandService', () => exports );
