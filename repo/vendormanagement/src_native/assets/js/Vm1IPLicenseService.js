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
 * @module js/Vm1IPLicenseService
 */
import app from 'app';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import 'js/appCtxService';
import 'js/commandPanel.service';

var exports = {};

/**
 * This method will create the input for removeIPLicense action
 * @param {Object} ctx ctx to get license value
 * @returns {Array} License Array
 */
export let getLicenseListInputFunction = function( ctx ) {
    var lengthLiclist = ctx.selected.props.license_list.uiValues.length;
    var licenseArray = [];
    var objString = null;

    for( var i = 0; i < lengthLiclist; i++ ) {
        objString = ctx.selected.props.license_list.uiValues[ i ];
        licenseArray.push( objString );
    }

    return licenseArray;
};

/**
 * This method will create the input for removeIPLicense action
 * @param {Object} ctx ctx to get projects value
 */

export let getRemoveUserLicenseInput = function( ctx ) {
    var userId = ctx.selected.props.Vm0PartnerUser.dbValues[ 0 ];
    var userObject = clientDataModelSvc.getObject( userId );
    var userObjectArray = [];
    userObjectArray.push( userObject );

    return userObjectArray;
};

/**
 * This method will create the input for createOrUpdateSoa
 * @param {Object} ctx ctx to get projects value
 * @param {Object} data data provided
 * @param {Object} decision Decision to add or remove user
 * JSDoc @returns returnArray: input for add or remove Ip license
 */

export let createOrUpdateSoaInput = function( ctx, data, decision ) {
    var returnArray = [];
    var licenseInfo = null;
    var userId = null;
    var licenseArray = getLicenseListInputFunction( ctx );
    if( decision === 'add' ) {
        userId = data.dataProviders.getEligibleUsers.selectedObjects[ 0 ].props.userid.dbValue;
        for( var i = 0; i < licenseArray.length; i++ ) {
            licenseInfo = {
                licenseType: 'IP_License',
                licenseId: licenseArray[ i ],
                licenseReason: '',
                users: [ userId ],
                qualifyingCfr: '',
                newLicenseId: ''
            };
            returnArray.push( licenseInfo );
        }
    } else if( decision === 'remove' ) {
        for( var inx = 0; inx < licenseArray.length; inx++ ) {
            licenseInfo = {
                licenseType: 'IP_License',
                licenseId: licenseArray[ inx ],
                licenseReason: '',
                users: [],
                qualifyingCfr: '',
                newLicenseId: ''
            };
            returnArray.push( licenseInfo );
        }
    }

    return returnArray;
};

export default exports = {
    getLicenseListInputFunction,
    getRemoveUserLicenseInput,
    createOrUpdateSoaInput
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1IPLicenseService
 */
app.factory( 'Vm1IPLicenseService', () => exports );
