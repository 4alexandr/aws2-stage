// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Vm1AddVendorPartService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';

var exports = {};

export let updateCreateVMOObjectData = function( data ) {
    var selectedVendor = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
    var vendorViewModelProp = uwPropertyService.createViewModelProperty( 'vm0vendor_ref', 'Vendor', 'OBJECT', selectedVendor.uid, selectedVendor.props.object_string.dbValues[0] );
    vendorViewModelProp.uiValue = selectedVendor.props.object_string.dbValues[0];
    vendorViewModelProp.valueUpdated = true;
    data.vm0vendor_ref = vendorViewModelProp;
};

export default exports = {
    updateCreateVMOObjectData
};

/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1AddVendorPartService
 */
app.factory( 'Vm1AddVendorPartService', () => exports );
