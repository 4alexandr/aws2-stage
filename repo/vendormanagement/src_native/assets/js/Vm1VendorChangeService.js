// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
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
 * @module js/Vm1VendorChangeService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import msgSvc from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

import 'js/viewModelObjectService';

var exports = {};

/**
 * Give a confirmation message to the user according to preference and selection
 *
 * @param {object} data the view model data object
 */
export let confirmationForChange = function( data ) {
    var SelectedObjectsArray = appCtxSvc.ctx.mselected;
    var nSelected = SelectedObjectsArray.length;
    var vendorObject = data.dataProviders.searchVendors.selectedObjects[ 0 ];
    var isMaintainHistoryOn = data.preferences.VMS_Maintain_Vendor_History[ 0 ];
    var isVendorSelected = false;
    var msg2 = null;
    var ParentSelectedObject = cdm.getObject( appCtxSvc.ctx.mselected[ 0 ].uid );
    var typeHierarchy = ParentSelectedObject.modelType.typeHierarchyArray;

    if( typeHierarchy.indexOf( 'Vendor' ) > -1 ) {
        isVendorSelected = true;
    }

    if( !isVendorSelected ) {
        if( isMaintainHistoryOn.toLowerCase() === 'false' ) {
            if( nSelected === 1 ) {
                msg2 = data.i18n.changeVendorForPartMessageMove.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', SelectedObjectsArray[ 0 ].props.object_name.dbValues[ 0 ] );
            } else {
                msg2 = data.i18n.changeVendorForPartMessageMove.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', 'Selected Objects' );
            }
        } else {
            if( nSelected === 1 ) {
                msg2 = data.i18n.changeVendorForPartMessageCopy.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', SelectedObjectsArray[ 0 ].props.object_name.dbValues[ 0 ] );
            } else {
                msg2 = data.i18n.changeVendorForPartMessageCopy.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', 'Selected Objects' );
            }
        }
    } else {
        if( isMaintainHistoryOn.toLowerCase() === 'false' ) {
            msg2 = data.i18n.changeVendorForVendorMessageMove.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', SelectedObjectsArray[ 0 ].props.object_name.dbValues[ 0 ] );
        } else {
            msg2 = data.i18n.changeVendorForVendorMessageCopy.replace( '{1}', vendorObject.props.object_name.dbValue ).replace( '{0}', SelectedObjectsArray[ 0 ].props.object_name.dbValues[ 0 ] );
        }
    }
    var buttons = [ {
        addClass: 'btn btn-notlfy',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.changeVendor,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'vendorMgmt.vm1ChangeVendorAction', data );
        }
    } ];
    msgSvc.showWarning( msg2, buttons );
};

/**
 * Change the assigned vendor for a Vendor or a Vendor part
 *
 * @param {object} data the view model data object
 * @return {object} input object for the changeVendor SOA
 */

export let changeVendorForVendorPart = function( data ) {
    var resultObject = [];
    var vendorPartArray = [];
    var isVendorSelected = false;
    var SelectedObjectsArray = appCtxSvc.ctx.mselected;
    var nSelected = SelectedObjectsArray.length;
    var prevVendor = null;
    var ParentSelectedObject = null;
    var typeHierarchy = null;
    var vendorObject = data.dataProviders.searchVendors.selectedObjects[ 0 ];
    var input = null;

    for( var i = 0; i < nSelected; i++ ) {
        ParentSelectedObject = cdm.getObject( appCtxSvc.ctx.mselected[ i ].uid );
        typeHierarchy = ParentSelectedObject.modelType.typeHierarchyArray;
        vendorPartArray[ i ] = ParentSelectedObject;
    }

    if( typeHierarchy.indexOf( 'Vendor' ) > -1 ) {
        isVendorSelected = true;
    }

    if( isVendorSelected ) {
        prevVendor = ParentSelectedObject;
        input = {
            vendorToChange: prevVendor,
            vendorParts: vendorPartArray,
            newVendor: vendorObject
        };
    } else {
        input = {
            vendorToChange: '',
            vendorParts: vendorPartArray,
            newVendor: vendorObject
        };
    }
    resultObject.push( input );

    return resultObject;
};

/**
 * Change the assigned vendor for a Vendor or a Vendor part
 *
 * @param {object} data the view model data object
 * @param {object} response changeVendor SOA response
 */

export let processChangeVendorSoaResponse = function( response, data ) {
    var selectedObjectsArray = appCtxSvc.ctx.mselected;
    var nSelected = selectedObjectsArray.length;
    var failedVp = [];
    var finalMessage;
    var multiSelectMsg;

    for( var i = 0; i < response.statuses[ 0 ].changedStatus.length; i++ ) {
        var status = response.statuses[ 0 ].changedStatus[ i ];
        if( status.notes !== data.i18n.changeVendorStatus ) {
            failedVp.push( status.oldPartStr );
        }
    }

    if( failedVp.length > 0 ) {
        finalMessage = data.i18n.changeVendorFailureMessage.replace( '{0}', failedVp ).replace( '{1}', data.dataProviders.searchVendors.selectedObjects[ 0 ] ).replace( '{2}', data.dataProviders.searchVendors.selectedObjects[ 0 ] );

        if( nSelected > 1 ) {
            multiSelectMsg = data.i18n.changeVendorFailureMessageForMultiselect.replace( '{0}', nSelected - failedVp.length ).replace( '{1}', nSelected );
            finalMessage = multiSelectMsg.concat( '</br>' ).concat( finalMessage );
        }
        msgSvc.showError( finalMessage );
    }
};

export default exports = {
    confirmationForChange,
    changeVendorForVendorPart,
    processChangeVendorSoaResponse
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1VendorChangeService
 */
app.factory( 'Vm1VendorChangeService', () => exports );
