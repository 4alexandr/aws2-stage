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
 * @module js/Vm1CreateVendorService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import listBoxService from 'js/listBoxService';
import soaSvc from 'soa/kernel/soaService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import msgSvc from 'js/messagingService';

var exports = {};

var parentData = {};

/**
 * Activates the create vendor panel
 */
export let vm1ActivateCreateVendorPanel = function() {
    commandPanelService.activateCommandPanel( 'Vm1CreateVendor', 'aw_toolsAndInfo' );
};

/**
 * Add given sub panel
 * @param {String} destPanelId Panel ID
 * @param {String} titleLabel Title
 */
export let addSubPanelPage = function( destPanelId, titleLabel ) {
    var context = {
        destPanelId: destPanelId,
        supportGoBack: true,
        title: titleLabel,
        recreatePanel: true,
        isolateMode: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Initialize Create Vendor Panel
 * @param {Object} data Data
 */
export let initializeCreateVendorPanel = function( data ) {
    appCtxSvc.registerCtx( 'panelName', data._internal.panelId );
    appCtxSvc.registerCtx( 'siteReferenceValue', '' );
    // store create change panel data to a variable.
    parentData = data;

    //check if partner contract object type exist in DB
    var objects = [];
    objects.push( 'Vm0PrtnrContract' );
    soaSvc.postUnchecked( 'Core-2015-10-Session', 'getTypeDescriptions2', {
        typeNames: objects,
        options: {}
    } ).then( function( descResult ) {
        if( descResult.types ) {
            for( var k = 0; k < descResult.types.length; k++ ) {
                if( descResult.types[ k ].name === 'Vm0PrtnrContract' ) {
                    data.isPartnerContractTypeExist = true;
                    break;
                }
            }
        }
    } ).catch( function( error ) {
        var errMessage = msgSvc.getSOAErrorMessage( error );
        msgSvc.showError( errMessage );
    } );
};

/**
 * Add Created Vendor Contacts to dataProvider
 * @param {Object} data Data
 */
export let addCreatedPartnerContracts = function( data ) {
    if( !parentData.vmPartnerContractsList ) {
        parentData.vmPartnerContractsList = [];
    }
    if( data.createdObject ) {
        parentData.vmPartnerContractsList.push( data.createdObject );
    }
    data.vmPartnerContractsList = parentData.vmPartnerContractsList;
};

/**
 * This method will remove the object from stored contracts list
 * @param {Object} vmo ViewModelObject to remove
 */
export let removePartnerContractsFromData = function( vmo ) {
    if( parentData.vmPartnerContractsList ) {
        var removePartnerContractUid = [];
        removePartnerContractUid.push( vmo.uid );
        var modelObjects = $.grep( parentData.vmPartnerContractsList, function( eachObject ) {
            return $.inArray( eachObject.uid, removePartnerContractUid ) === -1;
        } );
        parentData.vmPartnerContractsList = modelObjects;
    }
};

/**
 * Add Created Vendor Contacts to dataProvider
 * @param {Object} data Data
 */
export let addCreatedVendorContacts = function( data ) {
    if( !parentData.vmContactsList ) {
        parentData.vmContactsList = [];
    }
    if( data.createdObject ) {
        parentData.vmContactsList.push( data.createdObject );
    }
    data.vmContactsList = parentData.vmContactsList;
};

/**
 * Add Assigned Vendor Contacts from Pallette\Search to dataProvider
 * @param {Object} data Data
 */
export let addAssignedVendorContacts = function( data ) {
    if ( data.sourceObjects ) {
        if ( !parentData.vmContactsList ) {
            parentData.vmContactsList = [];
        }
        var vmContactsListUID = [];
        for ( var j = 0; j < parentData.vmContactsList.length; j++ ) {
            vmContactsListUID.push( parentData.vmContactsList[j].uid );
        }

        for ( var i = 0; i < data.sourceObjects.length; i++ ) {
            var indexOfVendorContact = vmContactsListUID.indexOf( data.sourceObjects[i].uid );
            if ( indexOfVendorContact === -1 ) {
                parentData.vmContactsList.push( data.sourceObjects[i] );
            }
        }
        data.vmContactsList = parentData.vmContactsList;
    }
};

/**
 * This method will remove the object from stored contacts list
 * @param {Object} vmo ViewModelObject to remove
 */
export let removeContactFromData = function( vmo ) {
    if( parentData.vmContactsList ) {
        var removeContactUid = [];
        removeContactUid.push( vmo.uid );
        var modelObjects = $.grep( parentData.vmContactsList, function( eachObject ) {
            return $.inArray( eachObject.uid, removeContactUid ) === -1;
        } );

        parentData.vmContactsList = modelObjects;
    }
};

/**
 * Add Created Locations to dataProvider
 * @param {Object} data Data
 */
export let addCreatedVendorLocations = function( data ) {
    if( !parentData.vmLocationsList ) {
        parentData.vmLocationsList = [];
    }

    if( data.createdObject ) {
        parentData.vmLocationsList.push( data.createdObject );
    }
    data.vmLocationsList = parentData.vmLocationsList;
};

/**
 * Add Assigned Vendor Locations from Pallette\Search to dataProvider
 * @param {Object} data Data
 */
export let addAssignedVendorLocations = function( data ) {
    if ( data.sourceObjects ) {
        if ( !parentData.vmLocationsList ) {
            parentData.vmLocationsList = [];
        }
        var vmLocationsListUID = [];
        for ( var j = 0; j < parentData.vmLocationsList.length; j++ ) {
            vmLocationsListUID.push( parentData.vmLocationsList[j].uid );
        }
        for ( var i = 0; i < data.sourceObjects.length; i++ ) {
            var indexOfVendorLocation = vmLocationsListUID.indexOf( data.sourceObjects[i].uid );
            if ( indexOfVendorLocation === -1 ) {
                parentData.vmLocationsList.push( data.sourceObjects[i] );
            }
        }
        data.vmLocationsList = parentData.vmLocationsList;
    }
};

/**
 * This method will remove the object from stored locations list
 * @param {Object} vmo ViewModelObject to remove
 */
export let removeLocationFromData = function( vmo ) {
    if( parentData.vmLocationsList ) {
        var removeLocationUid = [];
        removeLocationUid.push( vmo.uid );
        var modelObjects = $.grep( parentData.vmLocationsList, function( eachObject ) {
            return $.inArray( eachObject.uid, removeLocationUid ) === -1;
        } );
        parentData.vmLocationsList = modelObjects;
    }
};

/**
 * Create inputs for relations to be create with vendor
 * @param {Object} data Data
 * @returns {Object} inputToSoa
 */
export let prepareRelAndWorkflowInputs = function( data ) {
    getVendorRegTemplateName( data );
    var input = [];
    var i = 0;

    if( data.dataProviders.getVendorContactsList && data.dataProviders.getVendorContactsList.viewModelCollection.loadedVMObjects ) {
        var relationTypeName1 = 'ContactInCompany';
        for( i = 0; i < data.dataProviders.getVendorContactsList.viewModelCollection.loadedVMObjects.length; i++ ) {
            var secondaryObj1 = data.dataProviders.getVendorContactsList.viewModelCollection.loadedVMObjects[ i ];
            var inputData1 = {
                relationType: relationTypeName1,
                primaryObject: data.createdMainObject,
                secondaryObject: secondaryObj1
            };
            input.push( inputData1 );
        }
    }
    if( data.dataProviders.getVendorLocationsList && data.dataProviders.getVendorLocationsList.viewModelCollection.loadedVMObjects ) {
        var relationTypeName2 = 'LocationInCompany';
        for( i = 0; i < data.dataProviders.getVendorLocationsList.viewModelCollection.loadedVMObjects.length; i++ ) {
            var secondaryObj2 = data.dataProviders.getVendorLocationsList.viewModelCollection.loadedVMObjects[ i ];
            var inputData2 = {
                relationType: relationTypeName2,
                primaryObject: data.createdMainObject,
                secondaryObject: secondaryObj2
            };
            input.push( inputData2 );
        }
    }

    if( data.dataProviders.getPartnerContractList && data.dataProviders.getPartnerContractList.viewModelCollection.loadedVMObjects ) {
        var relationTypeName3 = 'Vm0UsesPrtnrContract';
        for( i = 0; i < data.dataProviders.getPartnerContractList.viewModelCollection.loadedVMObjects.length; i++ ) {
            var secondaryObj3 = data.dataProviders.getPartnerContractList.viewModelCollection.loadedVMObjects[ i ];
            var inputData3 = {
                relationType: relationTypeName3,
                primaryObject: data.createdMainObject,
                secondaryObject: secondaryObj3
            };
            input.push( inputData3 );
        }
    }
    return input;
};

/**
 * This method will store the selected projects to set on vendor revision
 * @param {Object} data Data to get projects value
 */
export let updateProjectsInContext = function( data ) {
    if( !parentData.vmProjectsList ) {
        parentData.vmProjectsList = [];
    }
    var selectedObjects = data.eventData.selectedObjects;
    for( var obj in selectedObjects ) {
        var modelObj = clientDataModelSvc.getObject( selectedObjects[ obj ].uid );
        parentData.vmProjectsList.push( modelObj );
    }
    data.vmProjectsList = parentData.vmProjectsList;
};

/**
 * This method will remove the object from stored projects list
 * @param {Object} vmo ViewModelObject to remove
 */
export let removeProjectFromData = function( vmo ) {
    if( parentData.vmProjectsList ) {
        var removeProjectUid = [];
        removeProjectUid.push( vmo.uid );
        var modelObjects = $.grep( parentData.vmProjectsList, function( eachObject ) {
            return $.inArray( eachObject.uid, removeProjectUid ) === -1;
        } );
        parentData.vmProjectsList = modelObjects;
    }
};

/**
 * This method will return contacts list and locations list for Partner Contract addition
 * @param {Object} data Data to store contacts list for Partner Contract
 */
export let getContactsAndLocationsListForCreateVendor = function( data ) {
    var vm1CreateContacts = parentData.dataProviders.getVendorContactsList.viewModelCollection.loadedVMObjects;
    var allContactsLov = [];

    for( var i = 0; i < vm1CreateContacts.length; i++ ) {
        var contactObj = vm1CreateContacts[ i ];
        allContactsLov.push( new SimpleStringEntry( contactObj.props.object_string.displayValues[ 0 ], contactObj.uid ) );
    }
    data.allContactsList = listBoxService.createListModelObjects( allContactsLov, 'displayName' );

    var vm1CreateLocations = parentData.dataProviders.getVendorLocationsList.viewModelCollection.loadedVMObjects;
    var allLocationsLov = [];

    for( var j = 0; j < vm1CreateLocations.length; j++ ) {
        var locObj = vm1CreateLocations[ j ];
        allLocationsLov.push( new SimpleStringEntry( locObj.props.object_string.displayValues[ 0 ], locObj.uid ) );
    }
    data.allLocationsList = listBoxService.createListModelObjects( allLocationsLov, 'displayName' );
};


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
 * When user select type from type selection panel of vendor, we need to navigate to create form.
 * @param {Object} data - The panel's view model object
 */
export let handleTypeSelectionJs = function( data ) {
    var selectedType = data.dataProviders.getCreatableVendorTypes.selectedObjects;
    if ( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[0].props.type_name.dbValue;
    }
};

/**
 * Clear selected type when user click on back button on create form
 * @param {Object} data - The create change panel's view model object
 */
export let clearSelectedType = function( data ) {
    data.selectedType.dbValue = '';
};

/**
 * Get Default Template Name to submit Vendor or its sub type to workflow
 * @param {Object} data Data
 */
export let getVendorRegTemplateName = function( data ) {
    var objType = data.createdMainObject.type;
    var preference_name = objType + '_default_workflow_template';
    var preferenceNames = [ preference_name ];
    var preferencesValues = [];
    soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: false
    } ).then( function( response ) {
        if( response ) {
            if( response.response.length > 0 ) {
            preferencesValues = response.response[ 0 ].values.values;
            appCtxSvc.registerCtx( 'vendorWorkflowName',  preferencesValues[0] );
            }else{
                appCtxSvc.registerCtx( 'vendorWorkflowName', 'Vendor Registration' );
            }
        }
    } ).catch( function( error ) {
        var errMessage = msgSvc.getSOAErrorMessage( error );
        msgSvc.showError( errMessage );
    } );
};


export default exports = {
    vm1ActivateCreateVendorPanel,
    addSubPanelPage,
    initializeCreateVendorPanel,
    addCreatedPartnerContracts,
    removePartnerContractsFromData,
    addCreatedVendorContacts,
    addAssignedVendorContacts,
    removeContactFromData,
    addCreatedVendorLocations,
    addAssignedVendorLocations,
    removeLocationFromData,
    prepareRelAndWorkflowInputs,
    updateProjectsInContext,
    removeProjectFromData,
    getContactsAndLocationsListForCreateVendor,
    handleTypeSelectionJs,
    getVendorRegTemplateName,
    clearSelectedType
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1CreateVendorService
 */
app.factory( 'Vm1CreateVendorService', () => exports );
