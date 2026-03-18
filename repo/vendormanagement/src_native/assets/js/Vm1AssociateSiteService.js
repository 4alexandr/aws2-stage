// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * @module js/Vm1AssociateSiteService
 */

import app from 'app';
import 'jquery';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import msgSvc from 'js/messagingService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';

var exports = {};

/**
 * Search Available sites from Sc1LineItemsProvider
 * @param {Object} ctx Context object
 * @param {Object} data Data to get the filter string
 * @returns {Object} Promise with available sites
 */
export let performSiteSearch = function( ctx, data ) {
    var deferred = AwPromiseService.instance.defer();
    var filterString = data.searchBox.dbValue;
    var inputData = {
        searchInput: {
            providerName: 'Sc1ExchangeLinesProvider',
            searchCriteria: {
                searchString: filterString,

                searchManagedSite: 'true'
            },
            maxToLoad: 50,
            maxToReturn: 50
        },
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ctx.sublocation.clientScopeURI,
            columnsToExclude: [],
            hostingClientName: '',
            operationType: ''
        }
    };

    // SOA call made to get all sites applicable to assign to task
    soaService.post( 'Internal-AWS2-2016-03-Finder', 'performSearch', inputData ).then( function( response ) {
        var sites = response.searchResults;
        // set the updated available list
        var outputData = {
            searchResults: sites,
            totalFound: sites === undefined ? 0 : sites.length,
            totalLoaded: sites === undefined ? 0 : sites.length
        };
        deferred.resolve( outputData );
    } ).catch( function( error ) {
        var errMessage = msgSvc.getSOAErrorMessage( error );
        msgSvc.showError( errMessage );
    } );
    return deferred.promise;
};

/**
 * Get properties to create site
 * @param {Object} data Data to get providers
 * @return {Object} siteProperties set of properties for creating Site
 */
export let getSiteProperties = function( data ) {
    var siteIdValue = data.siteID.dbValue;
    var siteId = siteIdValue.toString();
    var siteProperties = new Object();
    siteProperties.name = data.name.dbValue;
    siteProperties.site_id = siteId;

    return siteProperties;
};


/**
 * This method will store the selected site to set on vendor revision
 * @param {Object} data Data to get site id value
 */
export let assignSiteToNewVendor = function( data ) {
    if( data.eventData.selectedObjects !== undefined ) {
        var siteReferenceValue = appCtxSvc.getCtx( 'siteReferenceValue' );
        var sc0SiteObjectList = [];
        siteReferenceValue = data.eventData.selectedObjects[ 0 ];
        var modelObj = clientDataModelSvc.getObject( siteReferenceValue.uid );
        sc0SiteObjectList.push( modelObj );
        data.sc0SiteObjectList = sc0SiteObjectList;
        appCtxSvc.updateCtx( 'siteReferenceValue', siteReferenceValue );
    }
};

/**
 * This method will store the selected projects to set on vendor revision
 * @param {Object} data Data to get projects value
 */
export let updateProjectsInContext = function( data ) {
    var sc0ProjectsList = [];
    var selectedObjects = data.eventData.selectedObjects;
    for( var obj in selectedObjects ) {
        var modelObj = clientDataModelSvc.getObject( selectedObjects[ obj ].uid );
        sc0ProjectsList.push( modelObj );
    }
    data.sc0ProjectsList = sc0ProjectsList;
};

/**
 * This method will get the site object from response
 * @param {Object} response response of SOA
 * @returns {Object} site Object
 */
export let getSiteObject = function( response ) {
    var modelObj;
    if( response.plain !== undefined ) {
        modelObj = response.modelObjects[ response.plain[ 0 ] ];
        var siteModelObj = [];

        siteModelObj.push( modelObj );
        var eventData = {
            selectedObjects: siteModelObj,
            panelId: 'Vm1CreateNewVendor'

        };
        eventBus.publish( 'associateSiteObjectToNewVendor', eventData );
    }

    return modelObj;
};


export default exports = {
    performSiteSearch,
    getSiteProperties,
    assignSiteToNewVendor,
    updateProjectsInContext,
    getSiteObject
};
/**
 *
 * @memberof NgServices
 * @member Vm1AssociateSiteService
 */
app.factory( 'Vm1AssociateSiteService', () => exports );
