// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/workinstrTableService
 */
import * as app from 'app';
import awColumnSvc from 'js/awColumnService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';

/**
 * Export
 */
var exports = {};

/**
 * loadData - get the rows of data to display in the table
 *
 * @param {Object} activeTab the current tab
 * @param {StringArray} sortCriteria the columns sort criteria
 *
 * @return {Object} searchResults - the data to display in the table rows
 * totalFound - the total number of rows to display in the table
 */
export let loadData = function( activeTab, sortCriteria ) {
    var deferred = AwPromiseService.instance.defer();

    var searchResults;
    if( sortCriteria && sortCriteria[ 0 ] ) {
        var sortColumn = sortCriteria[ 0 ].fieldName;
        searchResults = _.sortBy( activeTab.datasetsToShow, function( modelObj ) {
            return modelObj.props[ sortColumn ].dbValues[ 0 ];
        } );
        if( sortCriteria[ 0 ].sortDirection === 'DESC' ) {
            searchResults.reverse();
        }
    } else {
        searchResults = activeTab.datasetsToShow;
    }

    deferred.resolve( {
        searchResults: searchResults,
        totalFound: activeTab.datasetsToShow.length
    } );

    return deferred.promise;
};

/**
 * loadColumns - get table columns
 *
 * @param {Object} dataProvider the table data provide
 * @param {Object} colInfos the table columns info
 *
 * @return {Object} columnInfos - a list of the table columns info
 */
export let loadColumns = function( dataProvider, colInfos ) {
    dataProvider.columnConfig = {
        columns: colInfos
    };

    var deferred = AwPromiseService.instance.defer();

    deferred.resolve( {
        columnInfos: colInfos
    } );

    return deferred.promise;
};

/**
 * Build table columns and the columns property policy from the passed in object properties
 *
 * @param {ObjectArray} tableColumns each table column data
 * @param {StringArray} objProperties each object property in the list to add to the policy and displayed as a column
 * @param {String} objType the object type to get its properties
 *
 * @return {ObjectArray} property policy for all table columns
 */
export let getColumns = function( tableColumns, objProperties, objType ) {
    var propPolicy = {
        types: []
    };

    var properties = [];

    propPolicy.types.push( {
        name: objType,
        properties: properties
    } );

    for( var indx in objProperties ) {
        properties.push( {
            name: objProperties[ indx ]
        } );

        tableColumns.push( awColumnSvc.createColumnInfo( {
            name: objProperties[ indx ],
            propertyName: objProperties[ indx ],
            typeName: objType,
            minWidth: 100,
            width: '*',
            enableFiltering: false,
            enableColumnResizing: true,
            enablePinning: false,
            enableSorting: true,
            enableCellEdit: false
        } ) );
    }

    return propPolicy;
};

/**
 * Build the property policy from the passed in object properties
 *
 * @param {StringArray} objProperties each object property in the list to add to the policy and displayed as a table column
 * @param {String} objType the object type to get its properties
 *
 * @return {ObjectArray} property policy for all table columns
 */
export let getColumnsPolicy = function( objProperties, objType ) {
    var propPolicy = {
        types: []
    };

    var properties = [];

    propPolicy.types.push( {
        name: objType,
        properties: properties
    } );

    for( var indx in objProperties ) {
        properties.push( {
            name: objProperties[ indx ]
        } );
    }

    return propPolicy;
};

/**
 * Build table columns from the passed in object properties
 *
 * @param {ObjectArray} tableColumns each table column data
 * @param {StringArray} objProperties each object property in the list to add to the policy and displayed as a column
 * @param {String} objType the object type to get its properties
 */
export let createColumns = function( tableColumns, objProperties, objType ) {
    for( var indx in objProperties ) {
        tableColumns.push( awColumnSvc.createColumnInfo( {
            name: objProperties[ indx ],
            propertyName: objProperties[ indx ],
            typeName: objType,
            minWidth: 100,
            width: '*',
            enableFiltering: false,
            enableColumnResizing: true,
            enablePinning: false,
            enableSorting: true,
            enableCellEdit: false
        } ) );
    }
};

/**
 * Change the view mode from table to list or vice versa
 *
 * @param {Object} viewerData the viewer data
 * @param {String} newViewMode the view mode to switch to
 */
export let changeViewMode = function( viewerData, newViewMode ) {
    var currentMode = viewerData.tab.viewMode.tableMode;
    if( currentMode === 'table' && newViewMode === 'list' ) {
        viewerData.tab.viewMode.tableMode = 'list';
        viewerData.tab.viewMode.name = viewerData.tab.viewMode.listView;
    } else if( currentMode === 'list' && newViewMode === 'table' ) {
        viewerData.tab.viewMode.tableMode = 'table';
        viewerData.tab.viewMode.name = viewerData.tab.viewMode.tableView;
    }
};

/**
 * A glue code to support work instructions table
 *
 * @param {Object} awColumnSvc - awColumnService
 * @param {Object} $q - $q
 *
 * @return {Object} - Service instance
 *
 * @member workinstrTableService
 */

export default exports = {
    loadData,
    loadColumns,
    getColumns,
    getColumnsPolicy,
    createColumns,
    changeViewMode
};
app.factory( 'workinstrTableService', () => exports );
