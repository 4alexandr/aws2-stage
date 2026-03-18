//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/requirementsManager
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import reqUtils from 'js/requirementsUtils';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';


var exports = {};
var MAX_WIDGET = 5;
var firstLoad = true;


/**
 * Load recent requirements for requirements manager
 *
 * @param {Object} data - The panel's view model object
 */

export let loadRecentRequirements = function( data ) {
    if ( firstLoad ) {
        eventBus.publish( 'progress.start' );
        firstLoad = false; //to prevent multiple soa calls
        var inputData = {
            searchInput: {
                attributesToInflate: [ 'object_name', 'body_cleartext', 'checked_out_user', 'object_type', 'last_mod_date', 'awp0ThumbnailImageTicket', 'awp0CellProperties', 'owning_user' ],
                startIndex: 0,
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Awp0RecentObjectsProvider',
                searchCriteria: {
                    search: '',
                    showConfiguredRev: 'false'
                },
                searchSortCriteria: [],
                searchFilterFieldSortType: 'Priority',
                searchFilterMap6: {}
            },
            columnConfigInput: {},
            inflateProperties: true,
            saveColumnConfigData: {}
        };
        soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
            eventBus.publish( 'progress.end' );
            firstLoad = true;
            if ( !response.ServiceData.partialErrors ) {
                data.searchResults = JSON.parse( response.searchResultsJSON );
                data.totalFoundRelated.dbValue = response.totalFound;
            }
            exports.getFilteredRecentRequirements( data );
        } );
    }
};


/**
 * Load object properties
 *
 * @param {Object} modelObjects - type name
 * @param {Array} propNames - property names to be loaded
 * @returns {Object} - Json object
 */
var _loadObjectProps = function( modelObjects, propNames ) {
    var deferred = AwPromiseService.instance.defer();
    reqUtils.loadModelObjects( modelObjects, propNames ).then( function() {
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 * Load properties into vmo
 *
 * @param {Object} data - The panel's view model object
 * @param {Array} loadObjects - the objects to be loaded in vmo
 */
var _loadPropsIntoVmo = function( data, loadObjects ) {
    for ( var i = 0; i < loadObjects.length; i++ ) {
        var vmo = data.dataProviders.recentDataProvider.getItemAtIndex( i );
        var item = loadObjects[i];
        if ( item.props ) {
            vmo.object_name = item.props.object_name.uiValues[0];
            if ( vmo.object_name && vmo.object_name.length && vmo.object_name.length >= 37 ) {
                vmo.object_name = vmo.object_name.substring( 0, 35 );
                vmo.object_name += '...';
            }
            vmo.object_string = item.props.object_string.uiValues[0];
            vmo.object_string = vmo.object_string.substring( 0, vmo.object_string.indexOf( ';' ) );
            vmo.object_type = item.props.object_type.uiValues[0];
            vmo.owning_user = item.props.owning_user.uiValues[0];
            vmo.last_mod_date = item.props.last_mod_date.uiValues[0];

            vmo.body_cleartext = item.props.body_cleartext ? item.props.body_cleartext.dbValues[0] : item.props.object_name.uiValues[0];
            if ( vmo.body_cleartext && vmo.body_cleartext.length && vmo.body_cleartext.length >= 150 ) {
                vmo.body_cleartext = vmo.body_cleartext.substring( 0, 150 );
                vmo.body_cleartext += '...';
            }
        }
    }
};

/**
 * Get recently loaded requirement objects and load its properties
 *
 * @param {Object} data - The panel's view model object
 */
export let getFilteredRecentRequirements = function( data ) {
    data.pageSize = 0;
    data.pageIndex = 0;
    var loadObjects = [];
    data.dataProviders.recentDataProvider.viewModelCollection.clear();
    var propNames = [ 'items_tag', 'object_name', 'body_cleartext', 'object_type', 'last_mod_date', 'awp0ThumbnailImageTicket', 'awp0CellProperties', 'owning_user' ];
    if ( data.searchResults && data.searchResults.objects && data.searchResults.objects.length > 0 ) {
        for ( var i = data.searchResults.objects.length - 1; i >= 0; i-- ) {
            var obj = data.searchResults.objects[i];
            var modelObject = cdm.getObject( obj.uid );
            var typeHierarchy = modelObject.modelType.typeHierarchyArray;
            if ( typeHierarchy.indexOf( 'Arm0RequirementElement' ) > -1 || typeHierarchy.indexOf( 'Arm0RequirementSpecElement' ) > -1 || typeHierarchy.indexOf( 'Arm0ParagraphElement' ) > -1 ||
                typeHierarchy.indexOf( 'RequirementSpec Revision' ) > -1 || typeHierarchy.indexOf( 'Requirement Revision' ) > -1 || typeHierarchy.indexOf( 'Paragraph Revision' ) > -1 ) {
                loadObjects.push( modelObject );
            } else {
                data.searchResults.objects.splice( i, 1 );
            }
        }

        if ( loadObjects.length > 0 ) {
            loadObjects.reverse();
            _loadObjectProps( loadObjects, propNames );
            data.pageSize = 1;
            data.pageIndex = 1;
        }

        data.totalFoundRelated.dbValue = data.searchResults.objects.length;

        if ( data.dataProviders.recentDataProvider.viewModelCollection.getVirtualLength() !== data.searchResults.objects.length ) {
            if ( data.searchResults.objects.length > MAX_WIDGET ) {
                data.loadedObjects = loadObjects.slice( 0, loadObjects.length );
                data.pageSize = parseInt( loadObjects.length / MAX_WIDGET );
                if ( loadObjects.length % MAX_WIDGET > 0 ) {
                    data.pageSize++;
                }
                for ( var i = loadObjects.length - 1; i >= MAX_WIDGET; i-- ) {
                    loadObjects.splice( i, 1 );
                }
            }
            data.dataProviders.recentDataProvider.update( loadObjects, loadObjects.length );
        }
        _loadPropsIntoVmo( data, loadObjects );

        if( data.searchResults.objects.length === 0 ) {
            data.totalFoundRelated.dbValue = -1;
        }
    } else{
        data.totalFoundRelated.dbValue = -1;
    }
};

/**
 * Operation to get the previous loaded objects
 */
export let callPreviousRecentObjectsEvent = function() {
    eventBus.publish( 'requirementsManager.getPreviousRecentObjectsEvent' );
};

/**
 * Operation to get the previous loaded objects
 */
export let callNextRecentObjectsEvent = function() {
    eventBus.publish( 'requirementsManager.getNextRecentObjectsEvent' );
};

/**
 * Gets the objects to be loaded
 *
 * @param {Object} data - The panel's view model object
 */
var _getObjectsToLoad = function( data ) {
    var loadObjects = [];
    for ( var i = MAX_WIDGET * ( data.pageIndex - 1 ); i < data.loadedObjects.length && i < MAX_WIDGET * data.pageIndex; i++ ) {
        loadObjects.push( data.loadedObjects[i] );
    }
    data.dataProviders.recentDataProvider.update( loadObjects, loadObjects.length );
    _loadPropsIntoVmo( data, loadObjects );
};

/**
 * Retrieves the previous objects from the Recently loaded objects
 *
 * @param {Object} data - The panel's view model object
 */
export let getPreviousRecentObjects = function( data ) {
    if ( data.loadedObjects ) {
        data.pageIndex = data.pageIndex === 1 ? 1 : data.pageIndex - 1;
        _getObjectsToLoad( data );
    }
};

/**
 * Retrieves the next objects from the Recently loaded objects
 *
 * @param {Object} data - The panel's view model object
 */
export let getNextRecentObjects = function( data ) {
    if ( data.loadedObjects ) {
        data.pageIndex = data.pageIndex === data.pageSize ? data.pageSize : data.pageIndex + 1;
        _getObjectsToLoad( data );
    }
};

/**
 * Service for requirementsManager.
 *
 * @member requirementsManager
 */

export default exports = {
    loadRecentRequirements,
    getFilteredRecentRequirements,
    callPreviousRecentObjectsEvent,
    callNextRecentObjectsEvent,
    getPreviousRecentObjects,
    getNextRecentObjects
};
app.factory( 'requirementsManager', () => exports );
