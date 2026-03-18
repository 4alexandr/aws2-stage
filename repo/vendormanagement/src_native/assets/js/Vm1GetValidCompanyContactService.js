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
 * @module js/Vm1GetValidCompanyContactService
 */

import app from 'app';
import cdm from 'soa/kernel/clientDataModel';

import 'js/viewModelObjectService';

var exports = {};

/**
 * This method constructs an array of Eligible Company Contact Objects
 *
 * @param response - This action is the call from output of previous action, so the previous response is forwarded here
 * @param data - Data to get Providers and load with new attributes
 * @param ctx - context of the object selected by user
 */

export let getAllTheValidCompanyContacts = function( response, data, ctx ) {
    if( response.output[0].relationshipData[0] ) {
        var contactArr = [];
        var relatedVendorObj = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject;
        contactArr = relatedVendorObj.props.ContactInCompany.dbValues;
        var tempArray = ctx.selected.props.Vm0ContractContacts.dbValues;
        var omitArray = [];
        var filterString = data.filterBox.dbValue;
        var statIndex = data.dataProviders.getRelevantCompanyContacts.startIndex;
        var returnContactArray = [];

        omitArray = contactArr.filter( function( x ) {
            return tempArray.indexOf( x ) < 0;
        } );

        for( var i = 0; i < omitArray.length; i++ ) {
            returnContactArray.push( cdm.getObject( omitArray[ i ] ) );
        }
        getFilteredData( filterString, statIndex, data, returnContactArray );
        return data.FilteredContacts;
    }
};

/**
 * This function filters the contact data according to the value entered by user in the filter box
 *
 * @param filterString - The string that will be given by the user for filter
 * @param startIndex    - Start Index
 * @param returnContactArray - The complete array of contacts to be processed.
 */

export let getFilteredData = function( filterString, startIndex, data, returnContactArray ) {
    var result = {};

    if( filterString.length > 0 ) {
        var filterStr = function( fil ) {
            var hasWildcardChar = /[%*]/g;
            if( fil.props.object_name.dbValues[ 0 ] !== undefined && fil.props.object_string.dbValues[ 0 ] !== undefined ) {
                if( hasWildcardChar.test( filterString ) ) {
                    var wildcrdRegex = new RegExp( filterString.replace( /[%*]/ig, '.*' ), 'ig' );

                    if( wildcrdRegex.test( fil.props.object_name.dbValues[ 0 ] ) || wildcrdRegex.test( fil.props.object_string.dbValues[ 0 ] ) ) {
                        return fil;
                    }
                } else if( fil.props.object_name.dbValues[ 0 ].toLowerCase().indexOf( filterString.toLowerCase() ) > -1 ) {
                    return fil;
                }
            }
        };
        result = returnContactArray.filter( filterStr );

        if( !data.FilteredContacts ) {
            data.FilteredContacts = [];
            data.FilteredContacts = result;
        } else {
            data.FilteredContacts = result;
        }
    } else {
        if( !data.FilteredContacts ) {
            data.FilteredContacts = [];
            data.FilteredContacts = returnContactArray;
        } else {
            data.FilteredContacts = returnContactArray;
        }
    }
};

/**
 * This method constructs an array of Eligible Company Location Objects
 * @param response - This action is the call from output of previous action, so the previous response is forwarded here
 * @param data -Data to get Providers and load with new attributes
 * @param ctx - context of the object selected by user
 */

export let getAllTheValidCompanyLocations = function( response, data, ctx ) {
    var LocationArr = [];
    if( response.output[0].relationshipData[0] ) {
        var relatedVendorObj = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject;
        LocationArr = relatedVendorObj.props.LocationInCompany.dbValues;
        var tempArray = ctx.selected.props.Vm0ContractLocations.dbValues;

        var filterString = data.filterBox.dbValue;
        var omitArray = [];
        var statIndex = data.dataProviders.getRelevantCompanyLocations.startIndex;
        var returnLocationArray = [];

        omitArray = LocationArr.filter( function( x ) {
            return tempArray.indexOf( x ) < 0;
        } );

        for( var i = 0; i < omitArray.length; i++ ) {
            returnLocationArray.push( cdm.getObject( omitArray[ i ] ) );
        }

        getFilteredLocation( filterString, statIndex, data, returnLocationArray );
        return data.FilteredLocations;
    }
};

/**
 * This function filters the contact data according to the value entered by user in the filter box
 *
 * @param filterString - The string that will be given by the user for filter
 * @param startIndex    - Start Index
 * @param returnContactArray - The complete array of contacts to be processed.
 */

export let getFilteredLocation = function( filterString, startIndex, data, returnLocationArray ) {
    var result = {};

    if( filterString.length > 0 ) {
        result = returnLocationArray.filter( function( fil ) {
            var hasWildcardChar = /[%*]/g;
            if( fil.props.object_name.dbValues[ 0 ] !== undefined && fil.props.object_string.dbValues[ 0 ] !== undefined ) {
                if( hasWildcardChar.test( filterString ) ) {
                    var wildcrdRegex = new RegExp( filterString.replace( /[%*]/ig, '.*' ), 'ig' );

                    if( wildcrdRegex.test( fil.props.object_name.dbValues[ 0 ] ) || wildcrdRegex.test( fil.props.object_string.dbValues[ 0 ] ) ) {
                        return fil;
                    }
                } else if( fil.props.object_name.dbValues[ 0 ].toLowerCase().indexOf( filterString.toLowerCase() ) > -1 ) {
                    return fil;
                }
            }
        } );

        if( !data.FilteredLocations ) {
            data.FilteredLocations = [];
            data.FilteredLocations = result;
        } else {
            data.FilteredLocations = result;
        }
    } else {
        if( !data.FilteredLocations ) {
            data.FilteredLocations = [];
            data.FilteredLocations = returnLocationArray;
        } else {
            data.FilteredLocations = returnLocationArray;
        }
    }
};

/**
 *
 * This function is used to create input data for createRelations SOA for both company contacts and locations.
 *  @param  ctx - context of the object selected by user
 * @param  data - Data to get Providers
 */

export let getCreateRelationData = function( ctx, data ) {
    var input = [];
    if( data.dataProviders.getRelevantCompanyLocations && data.dataProviders.getRelevantCompanyLocations.selectedObjects ) {
        var relationTypeName = 'Vm0ContractLocations';
        for( var i = 0; i < data.dataProviders.getRelevantCompanyLocations.selectedObjects.length; i++ ) {
            var secondaryObj = data.dataProviders.getRelevantCompanyLocations.selectedObjects[ i ];
            var inputData2 = {
                relationType: relationTypeName,
                primaryObject: ctx.selected,
                secondaryObject: secondaryObj
            };
            input.push( inputData2 );
        }
    } else if( data.dataProviders.getRelevantCompanyContacts && data.dataProviders.getRelevantCompanyContacts.selectedObjects ) {
        var relationTypeName2 = 'Vm0ContractContacts';
        for( var ix = 0; ix < data.dataProviders.getRelevantCompanyContacts.selectedObjects.length; ix++ ) {
            var secondaryObjC = data.dataProviders.getRelevantCompanyContacts.selectedObjects[ ix ];
            var inputDataContact = {
                relationType: relationTypeName2,
                primaryObject: ctx.selected,
                secondaryObject: secondaryObjC
            };
            input.push( inputDataContact );
        }
    }
    return input;
};

export default exports = {
    getAllTheValidCompanyContacts,
    getFilteredData,
    getAllTheValidCompanyLocations,
    getFilteredLocation,
    getCreateRelationData
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1GetValidCompanyContactService
 */
app.factory( 'Vm1GetValidCompanyContactService', () => exports );

/*   return {
      moduleServiceNameToInject: 'Vm1GetValidCompanyContactService'
  }; */
