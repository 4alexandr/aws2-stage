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
 * @module js/addMeasurementFile
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

export let initAddFilePanelTypes = function( data ) {
    var xrtCtx = appCtxSvc.getCtx("xrtSummaryContextObject");
    if (xrtCtx && xrtCtx.modelType.typeHierarchyArray.indexOf('Att0MeasurableAttribute') > -1 && xrtCtx.props && xrtCtx.props.att0CurrentValue) {
        var measureObjUid = xrtCtx.props.att0CurrentValue.dbValues[0];
        var measureObj = cdm.getObject(measureObjUid);
        if (measureObj) {
            var relationMap = {};
            relationMap["Dataset"] = ["Att0HasMeasurementFile"];

            data.addValueFile = {
                relationMap: relationMap,
                target: measureObj
            };
        }
    }
};

/**
 * Returns the addMeasurementFile instance
 * 
 * @member addMeasurementFile
 */

export default exports = {
    initAddFilePanelTypes
};
app.factory( 'addMeasurementFile', () => exports );
