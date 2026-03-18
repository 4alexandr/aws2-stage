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
 * @module js/Vm1AddPartnerContactService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import msgSvc from 'js/messagingService';
import dateTimeService from 'js/dateTimeService';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';

import 'soa/dataManagementService';
import 'soa/kernel/clientDataModel';
import 'js/viewModelObjectService';

var exports = {};

/**
 * Create String entry
 * @param {String} displayName Display Name
 * @param {String} internalValue Internal Value
 */
var SimpleStringEntry = function( displayName, internalValue ) {
    var self = this;
    self.displayName = displayName;
    self.internalValue = internalValue;
};


/**
 * Validate dates for contract
 * @param {Object} data Data
 */
export let validateNewContractDates = function( data ) {
    var today = new Date();
    today.setHours( 0, 0, 0 );
    var startDate = dateTimeService.getJSDate( data.revision__vm0ContractStartDate.dbValue );
    var endDate = dateTimeService.getJSDate( data.revision__vm0ContractEndDate.dbValue );
    var dateComparisonResult = 0;
    dateComparisonResult = dateTimeService.compare( endDate, startDate );
    if( dateComparisonResult === 0 || dateComparisonResult === -1 ) {
        msgSvc.showWarning( data.i18n.invalidStartEndDate );
    } else {
        eventBus.publish( 'vm1.inputsDataValidated' );
    }
};


/**
 * Get input for contacts
 * @param {Object} data Data
 * @returns {Object} input for contact
 */
export let getInputForContacts = function( data ) {
    var input = [];
    var internalValueForContacts = [];
    //prepare selected contacts data
    var selectedContacts = data.allContactsData.dbValue;
    for( var i = 0; i < selectedContacts.length; i++ ) {
        if( selectedContacts[ i ].internalValue !== undefined ) {
            if( !internalValueForContacts.includes( selectedContacts[ i ].internalValue ) ) {
                internalValueForContacts.push( selectedContacts[ i ].internalValue );
                var contactObj = {
                    uid: selectedContacts[ i ].internalValue,
                    type: 'CompanyContact'
                };
                var inputData = {
                    primaryObject: data.createdObject,
                    secondaryObject: contactObj,
                    relationType: 'Vm0ContractContacts',
                    clientId: '',
                    userData: {
                        uid: 'AAAAAAAAAAAAAA',
                        type: 'unknownType'
                    }
                };
                input.push( inputData );
            }
        }
    }
    return input;
};


/**
 * Get input for locations
 * @param {Object} data Data
 * @returns {Object} input for locations
 */
export let getInputForLocations = function( data ) {
    var inputForLocations = [];
    var internalValueForLocations = [];
    var selectedLocations = data.allLocationsData.dbValue;
    for( var i = 0; i < selectedLocations.length; i++ ) {
        if( selectedLocations[ i ].internalValue !== undefined ) {
            if( !internalValueForLocations.includes( selectedLocations[ i ].internalValue ) ) {
                internalValueForLocations.push( selectedLocations[ i ].internalValue );
                var locationObj = {
                    uid: selectedLocations[ i ].internalValue,
                    type: 'CompanyLocation'
                };
                var inputDataLocation = {
                    primaryObject: data.createdObject,
                    secondaryObject: locationObj,
                    relationType: 'Vm0ContractLocations',
                    clientId: '',
                    userData: {
                        uid: 'AAAAAAAAAAAAAA',
                        type: 'unknownType'
                    }
                };
                inputForLocations.push( inputDataLocation );
            }
        }
    }
    return inputForLocations;
};


/**
 * Get Contacts list
 * @param {*} data Data
 */
export let getContactsList = function( data ) {
    var selectedObj = appCtxSvc.getCtx( 'selected' );
    var allContacts = [];
    var allLocations = [];

    var allContactsLov = [];
    var allLocationsLov = [];

    allContacts = selectedObj.props.ContactInCompany;
    var allContactsLength = allContacts.dbValues.length;

    for( var i = 0; i < allContactsLength; i++ ) {
        allContactsLov.push( new SimpleStringEntry( allContacts.displayValues[ i ], allContacts.dbValues[ i ] ) );
    }
    data.allContactsList = listBoxService.createListModelObjects( allContactsLov, 'displayName' );

    allLocations = selectedObj.props.LocationInCompany;
    var allLocationsLength = allLocations.dbValues.length;
    for( var j = 0; j < allLocationsLength; j++ ) {
        allLocationsLov.push( new SimpleStringEntry( allLocations.displayValues[ j ], allLocations.dbValues[ j ] ) );
    }
    data.allLocationsList = listBoxService.createListModelObjects( allLocationsLov, 'displayName' );
};


/**
 * When user select type from Partner Contract type selection panel of vendor, we need to navigate to create form.
 * @param {Object} data - The panel's view model object
 */
export let handlePCTypeSelectionJs = function( data ) {
    var selectedType = data.dataProviders.getCreatablePartnerContractTypes.selectedObjects;
    if ( selectedType && selectedType.length > 0 ) {
        data.selectedPCType.dbValue = selectedType[0].props.type_name.dbValue;
    }
};


/**
 * Clear selected Partner Contract type when user click on back button on create form
 * @param {Object} data - The create change panel's view model object
 */
export let clearSelectedPCType = function( data ) {
    data.selectedPCType.dbValue = '';
};

/**
 * Get Default Template Name to submit Partner Contract Revision or its sub type to workflow
 * @param {Object} data Data
 */
export let getPartnerQualificationTemplateName = function( data ) {
    var objType = data.createdPartnerContractRevision.type;
    var preference_name = objType + '_default_workflow_template';
    var preferenceNames = [ preference_name ];
    var preferencesValues = [];
    appCtxSvc.registerCtx( 'partnerContractRevWorkflowName', 'Partner Contract Qualification' );
    soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: false
    } ).then( function( response ) {
        if( response && response.response.length > 0 ) {
            preferencesValues = response.response[ 0 ].values.values;
            appCtxSvc.registerCtx( 'partnerContractRevWorkflowName',  preferencesValues[0] );
        }
    } ).catch( function( error ) {
        var errMessage = msgSvc.getSOAErrorMessage( error );
        msgSvc.showError( errMessage );
    } );
};


/**
 * Select the first company contact from the list if only single contact
 * is available for partner contract creation in Partner Contracts tab
 * @param {Object} data Data
 */
export let selectFirstContact = function( data ) {
    if( data.allContactsData ) {
        data.allContactsData.dbValue[0] = data.allContactsList[0].propInternalValue;
        data.allContactsData.displayValues[0] = data.allContactsList[0].propDisplayValue;
        data.allContactsData.uiValue = data.allContactsList[0].propDisplayValue;
    }
};

/**
 * Select the first company contact from the list if only single contact
 * is available for partner contract creation in Vendor Create dialog
 * @param {Object} data Data
 * @param {Object} selectedObject first company contact
 */
export let selectFirstContactInPC = function( data, selectedObject ) {
    if( data.allContactsData ) {
        data.allContactsData.dbValue[0] = selectedObject.propInternalValue;
        data.allContactsData.displayValues[0] = selectedObject.propDisplayValue;
        data.allContactsData.uiValue = selectedObject.propDisplayValue;
    }
};

export default exports = {
    validateNewContractDates,
    getInputForContacts,
    getInputForLocations,
    getContactsList,
    handlePCTypeSelectionJs,
    clearSelectedPCType,
    getPartnerQualificationTemplateName,
    selectFirstContact,
    selectFirstContactInPC
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1AddPartnerContactService
 */
app.factory( 'Vm1AddPartnerContactService', () => exports );
