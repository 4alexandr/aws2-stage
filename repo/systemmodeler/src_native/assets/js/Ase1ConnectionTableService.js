//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Connection table Service
 *
 * @module js/Ase1ConnectionTableService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

export let handleConnectionTableSelection = function( eventData ) {
    var secondaryWorkAreaSelection;
    if( eventData.selectedObjects.length > 0 ) {
        secondaryWorkAreaSelection = eventData.selectedObjects;
    } else {
        var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
        var parentUid = interfacesCtx.targetModelObjectUid;
        secondaryWorkAreaSelection = [ cdm.getObject( parentUid ) ];
    }
    eventBus.publish( 'AM.SubLocationContentSelectionChangeEvent', {
        selections: secondaryWorkAreaSelection
    } );
};

/**
 * Ase1ConnectionTableService factory
 *
 * @param {Object} appCtxSvc appCtxService
 *
 * @return {Object} exports
 */

export default exports = {
    handleConnectionTableSelection
};
app.factory( 'Ase1ConnectionTableService', () => exports );
