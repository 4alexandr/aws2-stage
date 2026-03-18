// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/prm1ProductAddComparisonService
 */
import _ from 'lodash';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import dmSvc from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Ensure parameter compare types are present in cache
 *
 * @param {Object} data - The add VR/study panel's view model object
 *
 */
export let ensureCompareTypesLoadedJs = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var returnedTypes = [];

    var displayableCompareTypes = [];
    displayableCompareTypes.push( 'Crt0VldnContract' );
    displayableCompareTypes.push( 'Fnd0SearchRecipe' );

    var promise = soaSvc.ensureModelTypesLoaded( displayableCompareTypes );
    if( promise ) {
        promise.then( function() {
            var typeUids = [];
            for( var i = 0; i < displayableCompareTypes.length; i++ ) {
                var modelType = cmm.getType( displayableCompareTypes[ i ] );
                returnedTypes.push( modelType );
                typeUids.push( modelType.uid );
            }
            //ensure the ImanType objects are loaded
            var policyId = propPolicySvc.register( {
                types: [ {
                    name: 'ImanType',
                    properties: [ {
                        name: 'parent_types'
                    }, {
                        name: 'type_name'
                    } ]
                } ]
            } );

            dmSvc.loadObjects( typeUids ).then( function() {
                var returneddata = {
                    searchResultsType: returnedTypes,
                    totalFoundType: returnedTypes.length
                };

                propPolicySvc.unregister( policyId );

                deferred.resolve( returneddata );
            } );
        } );
    }

    return deferred.promise;
};

/**
 * Clear selected type when user click on type link
 *
 * @param {Object} data - The add VR/study panel's view model object
 *
 */
export let clearSelectedType = function( data ) {
    data.selectedType.dbValue = '';
};

/**
 * get selected type display value to show as link
 * @param {Object} data - The add VR/study panel's view model object
 */
export let getSelectedType = function( data ) {
    if( data.dataProviders.getParamComparisonTypes.selectedObjects.length > 0 ) {
        data.selectedType.dbValue = data.dataProviders.getParamComparisonTypes.selectedObjects[ 0 ].props.type_name.dbValues[0];
        data.selectedType.propertyDisplayName = data.dataProviders.getParamComparisonTypes.selectedObjects[ 0 ].props.type_name.uiValue;
        eventBus.publish( 'addComparison.callcompareDataProviderEvent', {} );
    }
};

/**
 * To update the display name of Crt0VldnContract type
 * @param {Object} data - The add VR/study panel's view model object
 */
export let updateVRStudyDisaplyName = function( data ) {
    for( var i = 0; i < data.dataProviders.getParamComparisonTypes.viewModelCollection.loadedVMObjects.length; i++ ) {
        if( data.dataProviders.getParamComparisonTypes.viewModelCollection.loadedVMObjects[ i ].cellHeader2 === 'Crt0VldnContract' ) {
            data.dataProviders.getParamComparisonTypes.viewModelCollection.loadedVMObjects[ i ].props.type_name.uiValue = data.i18n.VRStudyTypeTitle;
        }
    }
};

/**
 * Method to get provider name as per type of comparison selected
 * @param {object} data VMO
 * @returns {String} provider name
 */
export let getProviderName = function( data ) {
    var providerName = null;
    //if verification request selected
    if( data.selectedType.dbValue === 'Crt0VldnContract' ) {
        providerName = 'Crt1WhereUsdVRStudyProvider';
    }
    //if Recipe selected
    else if( data.selectedType.dbValue === 'Fnd0SearchRecipe' ) {
        providerName = 'Att1GetRecipesProvider';
    }
    return providerName;
};

/**
 * Returns the prm1ProductAddComparisonService instance
 *
 * @member prm1ProductAddComparisonService
 */

export default exports = {
    ensureCompareTypesLoadedJs,
    clearSelectedType,
    getSelectedType,
    updateVRStudyDisaplyName,
    getProviderName
};
app.factory( 'prm1ProductAddComparisonService', () => exports );
