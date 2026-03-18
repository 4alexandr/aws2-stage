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
 * @module js/Vm1RemoveContactsLocationsService
 */
import * as app from 'app';
import selectionSvc from 'js/selection.service';
import clientDataModelSvc from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * This method is to get Input to SOA remove relations.
 * @returns Input to SOA remove relations.
 */

export let getRemoveContactsFromPartnerContractInput = function() {
    var relationInputs = [];
    var selection = selectionSvc.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var primaryObj = selectionSvc.getSelection().parent;
        for( var index = 0; index < selection.length; index++ ) {
            relationInputs.push( {
                primaryObject: primaryObj,
                secondaryObject: selection[ index ],
                relationType: 'Vm0ContractContacts'
            } );
        }
    }
    return relationInputs;
};
/**
 * This method is to get Input to SOA remove relations.
 * @returns Input to SOA remove relations.
 */

export let getRemoveLocationsFromPartnerContractInput = function() {
    var relationInputs = [];
    var selection = selectionSvc.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var primaryObj = selectionSvc.getSelection().parent;
        for( var index = 0; index < selection.length; index++ ) {
            relationInputs.push( {
                primaryObject: primaryObj,
                secondaryObject: selection[ index ],
                relationType: 'Vm0ContractLocations'
            } );
        }
    }
    return relationInputs;
};
/**
 *  This method is to get the list of IP-License attached to the Partner Contract Revision.
 *  @param ctx -  context data
 *  @returns the array Of LiscenseId properties.
 */

export let getLicenseIdsForRemoveLicenseInput = function( ctx ) {
    var licenseId = ctx.pselected.props.license_list.dbValues[ 0 ];
    var licObject = clientDataModelSvc.getObject( licenseId );
    var userObjectArray = [];
    if( licObject !== null ) {
        if( licObject.props.object_name !== undefined ) {
            var licensePropertyValue = licObject.props.object_name.dbValues[ 0 ];
            userObjectArray.push( licensePropertyValue );
        } else {
            userObjectArray.push( ctx.pselected.props.license_list.uiValues[ 0 ] );
        }
    }
    return userObjectArray;
};

export default exports = {
    getRemoveContactsFromPartnerContractInput,
    getRemoveLocationsFromPartnerContractInput,
    getLicenseIdsForRemoveLicenseInput
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1RemoveContactsLocationsService
 */
app.factory( 'Vm1RemoveContactsLocationsService', () => exports );
