// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/projMgmtService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import _ from 'lodash';
import 'js/uwPropertyService';

var exports = {};

var _columnDefns = [];
var _isFilterSet = false;
/**
 * Load the column configuration
 * 
 * @param {Object} dataprovider - the data provider
 * 
 */
function initColumns() {

    _columnDefns = [ {
            "name": "icon",
            "displayName": "",
            "width": 40,
            "enableColumnMoving": false,
            "enableColumnResizing": false,
            "enableFiltering": false,
            "pinnedLeft": true
        }, {
            "name": "object_string",
            "displayName": "object_string",
            "typeName": "TC_Project",
            "width": 150
        }, {
            "name": "project_name",
            "displayName": "object_name",
            "typeName": "TC_Project",
            "width": 150
        }, {
            "name": "project_id",
            "displayName": "object_desc",
            "typeName": "TC_Project",
            "width": 150
        }, {
            "name": "last_mod_date",
            "displayName": "last_mod_date",
            "typeName": "WorkspaceObject",
            "width": 150
        }, {
            "name": "creation_date",
            "displayName": "creation_date",
            "typeName": "WorkspaceObject",
            "width": 150
        }, {
            "name": "owning_user",
            "displayName": "Owner",
            "typeName": "WorkspaceObject",
            "width": 150
        }

    ];

}

/**
 * Load the column configuration
 * 
 * @param {Object} dataprovider - the data provider
 * 
 */
export let loadColumns = function( dataprovider ) {
    if( _.isEmpty( _columnDefns ) ) {
        initColumns();
        var type = cmm.getType( "TC_Project" );
        _.forEach( _columnDefns, function( columnDef ) {
            if( type && type.propertyDescriptorsMap[ columnDef.name ] ) {
                columnDef.displayName = type.propertyDescriptorsMap[ columnDef.name ].displayName;
            } else {
                columnDef.displayName = columnDef.name;
            }
        } );

    }

    dataprovider.columnConfig = {
        "columns": _columnDefns
    };
    return _columnDefns;
};

export let getSortCriteria = function( sortCriteria ) {

    var criteria = ngModule.copy( sortCriteria );
    if( !_.isEmpty( criteria ) && ( criteria[ 0 ].fieldName.indexOf( '.' ) === -1 ) ) {
        criteria[ 0 ].fieldName = "WorkspaceObject." + criteria[ 0 ].fieldName;
    }

    return criteria;
};


export let updateCriteria = function( searchCriteria ) {
    _isFilterSet = true;
    var searchContext = appCtxService.getCtx( 'search' );
    searchContext.criteria.searchString = searchCriteria;
    appCtxService.updateCtx( 'search', searchContext );
    eventBus.publish( 'myProjectList.loadData' );
};

/**
 * Update data provider with search results
 *
 * @param {Object} data - data
 * @param {Object} dataProvider - data provider
 */
export let updateDataProviders = function( data, dataProvider ) {
    if( _isFilterSet ) {
        _isFilterSet = false;
        dataProvider.update( data.searchResults, data.totalFound );
    }
};

export let getStartIndex = function( dataProvider ) {
    var startIndex = 0;
    if( !_isFilterSet ) {
        startIndex = dataProvider.startIndex;
    }
    return startIndex;
};

export default exports = {
    loadColumns,
    getSortCriteria,
    updateCriteria,
    updateDataProviders,
    getStartIndex
};
app.factory( 'projMgmtService', () => exports );
