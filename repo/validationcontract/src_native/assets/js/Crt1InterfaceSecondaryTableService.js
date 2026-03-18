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
 * @module js/Crt1InterfaceSecondaryTableService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * initTable
 */
export let initTable = function() {
    var attrContext = {
        clientName: "AWClient",
        clientScopeURI: "Crt1InterfaceDefAttrTable",

        parentUids: "",
        rootElementUids: "",
        productContextUids: "",
        connectionInfo: "",

        mappingCommand: "false" // turn off mapping buttons
    };

    appCtxSvc.updateCtx( 'Att1ShowMappedAttribute', attrContext );
};

/**
 * rowSelected
 *
 * @param {Object} data the event data
 */
export let rowSelected = function( data ) {

    var interfaceDetailsCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    if( !interfaceDetailsCtx ) {
        return;
    }

    var selectedObj = data.eventData.value;
    var parentObj = interfaceDetailsCtx.targetModelObject;

    if( selectedObj && selectedObj.modelType.typeHierarchyArray.indexOf( 'Seg0IntfSpecRevision' ) > -1 ) {

        var attrContext2 = appCtxSvc.getCtx( 'Att1ShowInterfaceDefAttrsTable' );

        var parentUids = selectedObj.uid + "#" + parentObj.uid;

        if( attrContext2 === null || attrContext2 === undefined || !attrContext2.parentUids || attrContext2.parentUids !== parentUids ) {

            // Update ctx for Attributes table
            var attrContext = {
                parentUids: parentUids // selected Interface Definition and selected port
            };

            appCtxSvc.updateCtx( 'Att1ShowInterfaceDefAttrsTable', attrContext );

            // Trigger Attributes table refresh
            eventBus.publish( 'Att1ShowInterfaceDefAttrsTable.refreshTable' );
        }
    } else if( selectedObj && selectedObj.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) < 0 ) {
        // Clear the attributes table

        var attrContext = {
            parentUids: ""
        };

        appCtxSvc.updateCtx( 'Att1ShowInterfaceDefAttrsTable', attrContext );

        // Trigger Attributes table refresh
        eventBus.publish( 'Att1ShowInterfaceDefAttrsTable.refreshTable' );
    }
};

/**
 * Crt1InterfaceSecondaryTableService factory
 *
 * @param {appCtxService} appCtxSvc - Service
 *
 * @returns {Crt1InterfaceSecondaryTableService} Reference to service's API object.
 */

export default exports = {
    initTable,
    rowSelected
};
app.factory( 'Crt1InterfaceSecondaryTableService', () => exports );
