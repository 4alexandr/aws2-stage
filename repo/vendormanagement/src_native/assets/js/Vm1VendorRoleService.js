// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
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
 * @module js/Vm1VendorRoleService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxService from 'js/listBoxService';

var exports = {};

/**
 * Process values return by LOV VendorRole
 *
 * @param {object} response getInitialLOVValues SOA response
 * @return {object} valid values in LOV with display name
 */

export let processVendorRoleList = function( response ) {
    var vendorRoleList = [];
    var listOfValues;
    if( response.lovValues ) {
        listOfValues = response.lovValues;
    }
    var vendorRoles = appCtxSvc.ctx.mselected[ 0 ].props.vendor_role_list.uiValues;
    if( listOfValues ){
      for( var i = 0; i < vendorRoles.length; i++ ) {
          for( var j = 0; j < listOfValues.length; j++ ) {
              if( vendorRoles[ i ] === listOfValues[ j ].propDisplayValues.lov_values[ 0 ] ) {
                  listOfValues.splice( j, 1 );
              }
          }
      }

      for( var lovValue = 0; lovValue < listOfValues.length; lovValue++ ) {
          vendorRoleList.push( new VendorRoleEntry(
              listOfValues[ lovValue ].propDisplayValues.lov_value_descriptions[ 0 ],
              listOfValues[ lovValue ].propInternalValues.lov_values[ 0 ] ) );
      }
    }

    return listBoxService.createListModelObjects( vendorRoleList, 'internalValue' );
};

var VendorRoleEntry = function( displayName, internalValue ) {
    var self = this;
    self.displayName = displayName;
    self.internalValue = internalValue;
};

/**
 * Set the values to properties to update the view accordingly.
 *
 * @param {object} data containing attributes related to Vendor Role
 */
export let updateAddVendorRolePanelView = function( data ) {
    if( data.vendorRoleName.dbValue.internalValue === 'Manufacturer' || data.vendorRoleName.dbValue.internalValue === 'Distributor' ) {
        data.isVendorStatusDisplay = true;
        data.isCertificationStatusDisplay = false;
    } else if( data.vendorRoleName.dbValue.internalValue === 'Supplier' ) {
        data.isVendorStatusDisplay = true;
        data.isCertificationStatusDisplay = true;
    } else {
        data.isVendorStatusDisplay = false;
        data.isCertificationStatusDisplay = false;
    }
};

/**
 * Get the specified type of object from array of modelObjects
 *
 * @param {object} modelObjects array of objects
 * @param {object} objType Object Type
 * @return {object} model object of given type
 */
export let getObjectOfType = function( modelObjects, objType ) {
    if( modelObjects ) {
        var arrKey = Object.keys( modelObjects );

        for( var i = 0; i < arrKey.length; i++ ) {
            var key = arrKey[ i ];
            var modelObj = modelObjects[ key ];

            if( modelObj.type === objType ) {
                return modelObj;
            }
        }
    }
    return null;
};

/**
 * Returns object of type Form from response of SOA addRemoveVendorRoles
 *
 * @param {object} response response of SOA addRemoveVendorRoles
 * @param {object} data containing information about form type
 * @return {object} model object of type form
 */
export let getFormObject = function( response, data ) {
    return exports.getObjectOfType( response.modelObjects, data.vendorRoleName.dbValue.internalValue + 'Info' );
};

/**
 * Returns attributes to set on from related to Vendor Role Info
 *
 * @param {object} data containing information about form
 * @return {object} inputFormAttributes
 */
export let getFormAttributesForVendorRoleInfo = function( data ) {
    var inputSearch = [];
    if( data.vendorRoleName.dbValue.internalValue === 'Manufacturer' || data.vendorRoleName.dbValue.internalValue === 'Distributor' ) {
        inputSearch = {
            vendor_status: [ data.vendorStatus.dbValue === null ? '' : data.vendorStatus.dbValue ]
        };
    } else if( data.vendorRoleName.dbValue.internalValue === 'Supplier' ) {
        inputSearch = {
            vendor_status: [ data.vendorStatus.dbValue === null ? '' : data.vendorStatus.dbValue ],
            certification_status: [ data.certificationStatus.dbValue === null ? '' : data.certificationStatus.dbValue ]
        };
    }
    return inputSearch;
};

/**
 * Returns Vendor Roles Data for input to the SOA addRemoveVendorRoles
 *
 * @return {object} VendorRoles
 */
export let getInputRemoveVendorRole = function() {
    var ctx = appCtxSvc.ctx;
    var Roles = [];

    appCtxSvc.ctx.selectionCount = ctx.mselected.length;
    if( ctx.mselected.length === 1 ) {
        appCtxSvc.ctx.selectedVendorRole = ctx.mselected[ 0 ].props.object_string.dbValue;
    }
    for( var i = 0; i < ctx.mselected.length; i++ ) {
        Roles[ i ] = {
            clientId: '',
            description: '',
            roleType: ctx.mselected[ i ].props.object_string.dbValue,
            remove: true
        };
    }
    return Roles;
};

export default exports = {
    processVendorRoleList,
    updateAddVendorRolePanelView,
    getObjectOfType,
    getFormObject,
    getFormAttributesForVendorRoleInfo,
    getInputRemoveVendorRole
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1VendorRoleService
 */
app.factory( 'Vm1VendorRoleService', () => exports );
