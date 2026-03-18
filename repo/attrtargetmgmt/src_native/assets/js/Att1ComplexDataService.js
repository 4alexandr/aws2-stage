// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Att1ComplexDataService
 */

import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import eventBus from 'js/eventBus';
import 'lodash';
import 'js/parsingUtils';

var exports = {};

/**
 * Sets the value table in ctx
 * @param {Object} response response from soa
 */
function registerValueTable( response ) {
    if( response.attributeComplexDataOutput[ 0 ].measurePropNamesToMeasurementComplexDataMap ) {
        var measurePropNamesToMeasurementComplexDataMap = response.attributeComplexDataOutput[ 0 ].measurePropNamesToMeasurementComplexDataMap;
        if( measurePropNamesToMeasurementComplexDataMap.att0ValueTable &&
            measurePropNamesToMeasurementComplexDataMap.att0ValueTable.length > 0 ) {
            appCtxSvc.registerCtx( 'valueTable',
                measurePropNamesToMeasurementComplexDataMap.att0ValueTable[ 0 ] );
        }
    }
}

/**
 * Gets the complex data tables for the opened xrt summary object and sets the tables in the context
 */
export let getComplexData = function() {
    appCtxSvc.unRegisterCtx( 'goalTable' );
    appCtxSvc.unRegisterCtx( 'minTable' );
    appCtxSvc.unRegisterCtx( 'maxTable' );
    appCtxSvc.unRegisterCtx( 'valueTable' );
    var xrtObject = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
    var soaInput = {
        inputs: [ {
            clientId: 'AWClient',
            objectToRetrieve: xrtObject,
            attrPropNames: [],
            measurePropNames: []
        } ]
    };
    return soaSvc
        .post( 'AttrTargetMgmt-2018-11-AttributeTargetManagement', 'getAttributeComplexData', soaInput )
        .then(
            function( response ) {
                if( response.attributeComplexDataOutput[ 0 ].attrPropNamesToAttrComplexDataMap ) {
                    var attrPropNamesToAttrComplexDataMap = response.attributeComplexDataOutput[ 0 ].attrPropNamesToAttrComplexDataMap;
                    if( attrPropNamesToAttrComplexDataMap.att0GoalTable &&
                        attrPropNamesToAttrComplexDataMap.att0GoalTable.length > 0 ) {
                        appCtxSvc
                            .registerCtx( 'goalTable', attrPropNamesToAttrComplexDataMap.att0GoalTable[ 0 ] );
                    }
                    if( attrPropNamesToAttrComplexDataMap.att0MinTable &&
                        attrPropNamesToAttrComplexDataMap.att0MinTable.length > 0 ) {
                        appCtxSvc.registerCtx( 'minTable', attrPropNamesToAttrComplexDataMap.att0MinTable[ 0 ] );
                    }
                    if( attrPropNamesToAttrComplexDataMap.att0MaxTable &&
                        attrPropNamesToAttrComplexDataMap.att0MaxTable.length > 0 ) {
                        appCtxSvc.registerCtx( 'maxTable', attrPropNamesToAttrComplexDataMap.att0MaxTable[ 0 ] );
                    }
                }
                registerValueTable( response );
                return null;
            } );
};

/**
 *
 * @param {Object} xrtObject
 * @return isBoolean
 */
function _getBoolean( xrtObject ) {
    var isBoolean = xrtObject.modelType.typeHierarchyArray.indexOf( 'Att0AttributeDefRevision' ) > -1 && xrtObject.props.att0AttrType.dbValues[ 0 ] === 'Boolean' ||
        xrtObject.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttributeBool' ) > -1;
    return isBoolean;
}

/**

 * check if table name matches with goalTable or valueTable

 * @param {*} isBoolean
 * @param {*} tableName
 * @return isTableMatching
 */
function _isTableNameMatching( isBoolean, tableName ) {
    var isTableMatching = isBoolean && ( tableName === 'goalTable' || tableName === 'valueTable' );
    return isTableMatching;
}

/**
 * Gets the rows and columns
 * @param {Object} table -table
 * @param {Object} tableId -tableId
 * @param {Object} id -Id
 * @param {Object} tableName name of the table for which rows are to retreived
 * @param {Object} vmRows -rows
 * @return vmRows
 */
function getRowAndColumnValues( table, tableId, id, tableName, vmRows ) {
    var xrtObject = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
    var isBoolean = _getBoolean( xrtObject );

    for( var j = 0; j <= table.rowHeaders.length; j++ ) {
        var vmObject = tcViewModelObjectSvc.createViewModelObjectById( id + j );
        vmObject.type = 'STRING';
        vmObject.tableName = tableId;
        var dbValues;
        var displayValues;
        for( var i = 0; i <= table.columnHeaders.length; i++ ) {
            var vmProp = null;
            if( j === 0 ) {
                vmObject.id = j;
                if( i === 0 ) {
                    dbValues = '';
                    displayValues = '  ';
                    vmProp = uwPropertySvc.createViewModelProperty( 'RowHeader', 'RowHeader', 'STRING',
                        dbValues, displayValues );
                    vmProp.uiValue = displayValues;
                    vmProp.propertyDescriptor = {
                        displayName: 'RowHeader'
                    };
                    vmProp.isEditable = false;
                    vmProp.parentUid = id + j;
                    vmProp.colId = i;
                    vmObject.props.RowHeader = vmProp;
                } else {
                    var colheader = table.columnHeaders[ i - 1 ].name;
                    dbValues = colheader;
                    displayValues = colheader;
                    vmProp = uwPropertySvc.createViewModelProperty( colheader, colheader, 'STRING', dbValues,
                        displayValues );
                    vmProp.uiValue = displayValues;
                    vmProp.propertyDescriptor = {
                        displayName: colheader
                    };
                    vmProp.parentUid = id + j;
                    vmProp.colId = table.columnHeaders[ i - 1 ].index;
                    vmObject.props[ colheader ] = vmProp;
                }
            } else {
                if( i === 0 ) {
                    var rowheader = table.rowHeaders[ j - 1 ].name;
                    dbValues = rowheader;
                    displayValues = rowheader;
                    vmProp = uwPropertySvc.createViewModelProperty( 'RowHeader', 'RowHeader', 'STRING',
                        dbValues, displayValues );
                    vmProp.uiValue = displayValues;
                    vmProp.propertyDescriptor = {
                        displayName: 'RowHeader'
                    };
                    vmProp.parentUid = id + j;
                    vmProp.colId = i;
                    vmObject.props.RowHeader = vmProp;
                } else {
                    //div.style.font-weight="bold";
                    var celldata = table.rows[ j - 1 ].cells[ i - 1 ].data;
                    var colheader = table.columnHeaders[ i - 1 ].name;
                    if( _isTableNameMatching( isBoolean, tableName ) ) {
                        if( celldata === '0' ) {
                            dbValues = false;
                            displayValues = 'False';
                            vmProp = uwPropertySvc.createViewModelProperty( colheader, colheader, 'BOOLEAN',
                                dbValues, displayValues );
                            vmProp.uiValue = displayValues;
                        } else if( celldata === '1' ) {
                            dbValues = true;
                            displayValues = 'True';
                            vmProp = uwPropertySvc.createViewModelProperty( colheader, colheader, 'BOOLEAN',
                                dbValues, displayValues );
                            vmProp.uiValue = displayValues;
                        }
                    } else {
                        dbValues = celldata;
                        displayValues = celldata;
                        vmProp = uwPropertySvc.createViewModelProperty( colheader, colheader, 'STRING',
                            dbValues, displayValues );
                        vmProp.uiValue = displayValues;
                    }
                    if(vmProp !== null){
                        vmProp.propertyDescriptor = {
                            displayName: colheader
                        };
                        vmProp.parentUid = id + j;
                        vmProp.colId = table.rows[ j - 1 ].cells[ i - 1 ].index;
                        vmObject.id = table.rows[ j - 1 ].index;
                        vmObject.props[ colheader ] = vmProp;
                    }
                }
            }
        }
        vmRows.push( vmObject );
    }
    return vmRows;
}

/**
 * Gets the rows for the particular table
 * @param {Object} data Data of Att1ComplexTableViewModel
 * @param {Object} tableName name of the table for which rows are to retreived
 */
export let getDataForTable = function( data, tableName ) {
    var vmRows = [];
    var id = null;
    var table = appCtxSvc.getCtx( tableName );

    if( table ) {
        var tableId = null;
        switch ( tableName ) {
            case 'goalTable':
                id = 'AAAAAAA';
                tableId = 'att0GoalTable';
                break;
            case 'minTable':
                id = 'BBBBBBB';
                tableId = 'att0MinTable';
                break;
            case 'maxTable':
                id = 'CCCCCCC';
                tableId = 'att0MaxTable';
                break;
            case 'valueTable':
                id = 'DDDDDDD';
                tableId = 'att0ValueTable';
                break;
            default:
                break;
        }

        vmRows = getRowAndColumnValues( table, tableId, id, tableName, vmRows );

        var loadResult = awTableSvc.createTableLoadResult( vmRows.length );
        loadResult.searchResults = vmRows;
        data.goalValues = vmRows;
        loadResult.totalFound = vmRows.length;
        return loadResult;
    }
    return null;
};

/**
 * Returns columnInfo Array for the provided table
 *
 * @param {Object} table the table of object from which column infos are to be made
 */
var getColumnInfos = function( table ) {
    var columnInfos = [];
    var columnInfo = awColumnSvc.createColumnInfo();
    /**
     * Set values for common properties
     */
    columnInfo.name = 'RowHeader';
    columnInfo.displayName = 'A';
    columnInfo.enableFiltering = true;
    columnInfo.isTableCommand = true;
    columnInfo.width = 100;
    columnInfo.minWidth = 80;
    columnInfo.typeName = 'STRING';
    columnInfo.enablePinning = true;
    columnInfo.enableSorting = false;
    columnInfo.enableCellEdit = true;
    columnInfo.enableColumnMenu = false;

    columnInfos.push( columnInfo );

    for( var i = 0; i < table.columnHeaders.length; i++ ) {
        columnInfo = awColumnSvc.createColumnInfo();
        /**
         * Set values for common properties
         */
        columnInfo.name = table.columnHeaders[ i ].name;
        columnInfo.displayName = String.fromCharCode( 65 + ( i + 1 ) % 26 );
        columnInfo.enableFiltering = true;
        columnInfo.isTreeNavigation = false;
        columnInfo.width = 70;
        columnInfo.minWidth = 60;
        columnInfo.typeName = 'STRING';
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = false;
        columnInfo.enableCellEdit = true;
        columnInfo.enableColumnMenu = false;

        columnInfos.push( columnInfo );
    }

    return columnInfos;
};

/**
 * Loads Columns for the Goal Table
 *
 * @param {Object} dataProvider Data Provider for the Goal Table
 */
export let loadColumns = function( dataProvider, tableName ) {
    var table = appCtxSvc.getCtx( tableName );
    var columnInfos = getColumnInfos( table );
    dataProvider.columnConfig = {
        columns: columnInfos
    };
};

/**
 *   Doesn't let the framework throw error when a row is selected in table
 */
var fun = function() {
    //do Nothing
};

var loadConfiguration = function() {
    eventBus.subscribe( 'goalTable.gridSelection', function() {
        fun();
    } );
    eventBus.subscribe( 'minTable.gridSelection', function() {
        fun();
    } );
    eventBus.subscribe( 'maxTable.gridSelection', function() {
        fun();
    } );
    eventBus.subscribe( 'measureValueTable.gridSelection', function() {
        fun();
    } );
};

loadConfiguration();

/**
 * Att1ComplexDataService factory
 */

export default exports = {
    getComplexData,
    getDataForTable,
    loadColumns
};
app.factory( 'Att1ComplexDataService', () => exports );
