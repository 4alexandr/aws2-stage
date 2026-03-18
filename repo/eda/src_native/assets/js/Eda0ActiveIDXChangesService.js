//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Eda0ActiveIDXChangesService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';
import 'jquery';

/* eslint-disable complexity */

var exports = {};
var _columnConfigData = null;
var _promiseColumnConfig = null;

/**
 * loadTreeTableColumns
 * @param {Object} dataProvider Data provider for fetching the rows.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let loadTreeTableColumns = function( dataProvider ) {
    // Get the column config
    _promiseColumnConfig = AwPromiseService.instance.defer();
    queryColumnConfig();

    return promiseColumnConfig().then( function() {
        dataProvider.columnConfig = {
            columns: _columnConfigData.columnInfos
        };

        return _columnConfigData;
    } );
}; // loadTreeTableColumns

/**
 * _processUiConfigColumns
 *
 * @param {Object} columns Columns for the tree.
 * @return {Columns} List of columns
 */
function _processUiConfigColumns( columns ) {
    var _treeColumnInfos = [];
    for( var idx = 0; idx < columns.length; ++idx ) {
        var enableSortingValue = true;
        if( columns[ idx ].propDescriptor.propertyName === 'object_desc' ) {
            enableSortingValue = false;
        }

        var columnInfo = awColumnSvc.createColumnInfo( {

            name: columns[ idx ].propDescriptor.propertyName,
            propertyName: columns[ idx ].propDescriptor.propertyName,
            displayName: columns[ idx ].propDescriptor.displayName,
            typeName: columns[ idx ].columnSrcType,
            maxWidth: 400,
            minWidth: 60,
            hiddenFlag: columns[ idx ].hiddenFlag,
            pixelWidth: columns[ idx ].pixelWidth,
            width: columns[ idx ].pixelWidth,
            enableCellEdit: false,
            enableColumnMenu: true,
            enableFiltering: false,
            enablePinning: true,
            enableSorting: enableSortingValue,
            enableColumnMoving: true
        } );

        _treeColumnInfos.push( columnInfo );
    }
    return _treeColumnInfos;
}

/**
 * _isArrayPopulated
 *
 * @param{Object} object Input for which array is to be checked.
 * @return{boolean} true if the array is populated
 */
function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

/**
 * queryColumnConfig
 */
function queryColumnConfig() {
    // Get Column data

    var getOrResetUiConfigsIn = {
        scope: 'LoginUser',
        scopeName: '',
        clientName: 'AWClient',
        resetColumnConfig: false,
        columnConfigQueryInfos: [ {
            clientScopeURI: 'Eda0IDXProposalsTable',
            operationType: 'configured',
            typeNames: [ 'Eda0IDXIncrement' ],
            columnsToExclude: []
        } ],

        businessObjects: [ {} ]
    };

    var soaInput = {
        getOrResetUiConfigsIn: [ getOrResetUiConfigsIn ]
    };

    soaSvc.postUnchecked( 'Internal-AWS2-2017-06-UiConfig', 'getOrResetUIColumnConfigs2', soaInput ).then(
        function( response ) {
            // Process returned column data

            var columns;

            if( _isArrayPopulated( response.columnConfigurations ) ) {
                var columnConfigurations = response.columnConfigurations[ 0 ];

                if( _isArrayPopulated( columnConfigurations.columnConfigurations ) ) {
                    columnConfigurations = columnConfigurations.columnConfigurations;

                    if( _isArrayPopulated( columnConfigurations ) ) {
                        columns = _processUiConfigColumns( columnConfigurations[ 0 ].columns );
                    }
                }
            }

            _columnConfigData = { columnInfos: columns };

            _promiseColumnConfig.resolve();
        },
        function( error ) {
            _promiseColumnConfig.reject( error );
        } );
} // queryColumnConfig

/**
 * promiseColumnConfig
 *
 * @returns {Promise} promise
 */
function promiseColumnConfig() {
    var deferred = AwPromiseService.instance.defer();
    if( _promiseColumnConfig.promise ) {
        _promiseColumnConfig.promise.then(

            function() {
                deferred.resolve();
            },
            function() {
                deferred.reject();
            } );
    } else {
        deferred.reject();
    }

    return deferred.promise;
}

export default exports = {
    loadTreeTableColumns
};
app.factory( 'Eda0ActiveIDXChangesService', () => exports );
