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
 * @module js/Ase0MatrixTableService
 */
import * as app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import iconSvc from 'js/iconService';
import selectionService from 'js/selection.service';
import awMatrixUtils from 'js/awMatrixUtils';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import Ase0ArchitectureDataCache from 'js/Ase0ArchitectureDataCache';
import awMatrixSelectionSvc from 'js/awMatrixSelectionService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var matrixConnTypes = [];

var DELIMITER = '\\:';

var exports = {};

var getCellData = function( connectionObjects, visibleNodesInGraph ) {
    var visibleConnMap = {};
    var cellDispMap = {};
    var cellVal = '';
    var cellData = {};
    if( connectionObjects !== null ) {
        for( var iDx = 0; iDx < connectionObjects.length; iDx++ ) {
            var mapKey = '';
            mapKey = connectionObjects[ iDx ].srcUid;
            mapKey = mapKey.concat( '+' ).concat( connectionObjects[ iDx ].tarUid );
            var connObjects = [];
            connObjects = visibleConnMap[ mapKey ];
            if( !connObjects ) {
                connObjects = [];
            }
            connObjects.push( connectionObjects[ iDx ].connModelObj );
            visibleConnMap[ mapKey ] = connObjects;
        }
    }
    cellData.cellUids = visibleConnMap;
    for( var ix = 0; ix < visibleNodesInGraph.length; ix++ ) {
        for( var j = 0; j < visibleNodesInGraph.length; j++ ) {
            var key = visibleNodesInGraph[ ix ].uid.concat( '+' ).concat( visibleNodesInGraph[ j ].uid );
            var relations = visibleConnMap[ key ];
            if( relations ) {
                cellVal = getCellValue( relations );
            } else {
                cellVal = '';
            }
            cellDispMap[ key ] = cellVal;
        }
    }
    cellData.cellDispVals = cellDispMap;
    return cellData;
};

var getCellValue = function( connObjs ) {
    var cellValue = '<ul>';
    if( connObjs !== null ) {
        var keys = [];
        var availableTypeKeys = [];
        if( matrixConnTypes && matrixConnTypes.length > 0 ) {
            for( var i = 0; i < matrixConnTypes.length; i++ ) {
                var keyValue = matrixConnTypes[ i ].split( ':' );
                keys.push( keyValue[ 0 ] );
                var supportedTypes = null;
                if( keyValue.length === 2 && keyValue[ 1 ] !== null ) {
                    supportedTypes = keyValue[ 1 ].split( ',' );
                }
                for( var j = 0; j < connObjs.length; j++ ) {
                    var underlyingObj = connObjs[ j ].props.awb0UnderlyingObject;
                    if( underlyingObj && underlyingObj.dbValues ) {
                        var revUid = underlyingObj.dbValues[ 0 ];
                        var object = cdm.getObject( revUid );
                        if( object ) {
                            var type = object.type;
                            if( type && supportedTypes && supportedTypes.indexOf( type ) !== -1 &&
                                availableTypeKeys.indexOf( keyValue[ 0 ] ) === -1 ) {
                                availableTypeKeys.push( keyValue[ 0 ] );
                            }
                        }
                    }
                }
            }
        }
        if( availableTypeKeys && availableTypeKeys.length > 0 ) {
            var k = 0;
            for( var l = 0; l < keys.length; l++ ) {
                if( availableTypeKeys.indexOf( keys[ l ] ) !== -1 ) {
                    if( keys[ l ].length > 1 ) {
                        cellValue = cellValue.concat( '<li>' + keys[ l ].charAt( 0 ) + '</li>' );
                    } else {
                        cellValue = cellValue.concat( '<li>' + keys[ l ] + '</li>' );
                    }
                } else {
                    cellValue = cellValue.concat( '<li>&nbsp;</li>' );
                }
                k++;
            }
            cellValue = cellValue.concat( '</ul>' );
            return cellValue;
        }
        cellValue = cellValue.concat( '</ul>' );
        return cellValue;
    }
};

var getVisibleNodes = function() {
    var architectureCtx = appCtxService.getCtx( 'architectureCtx' );
    var visibleNodesInGraph = [];
    if( architectureCtx && architectureCtx.archPageData ) {
        visibleNodesInGraph = architectureCtx.archPageData.nodes;
        if( visibleNodesInGraph.length > 0 ) {
            _.forEach( visibleNodesInGraph, function( visibleNode ) {
                if( visibleNode.props.awp0CellProperties && visibleNode.props.awp0CellProperties.uiValues ) {
                    var dispName = visibleNode.props.awp0CellProperties.uiValues[ 0 ];
                    var nameArr = dispName.split( DELIMITER );
                    if( visibleNode.props.object_string && visibleNode.props.object_string.uiValues ) {
                        visibleNode.props.object_string.uiValues[ 0 ] = nameArr[ 1 ];
                    } else {
                        visibleNode.props.object_string = {
                            uiValues: [ nameArr[ 1 ] ]
                        };
                    }
                }
            } );
        }
    }
    return visibleNodesInGraph;
};

var getConnectionObjects = function() {
    var architectureCtx = appCtxService.getCtx( 'architectureCtx' );
    var connectionObjects = [];
    if( architectureCtx && architectureCtx.archPageData ) {
        var connections = architectureCtx.archPageData.edges;
        _.forEach( connections, function( conn ) {
            var biDirectional = false;
            if( conn !== null ) {
                var edgeDataFromCache = Ase0ArchitectureDataCache.getEdgeDataInfoMap( conn.uid );
                if( edgeDataFromCache ) {
                    var isConnection = cmm.isInstanceOf( 'Awb0Connection', edgeDataFromCache.edge.modelType );
                    if( isConnection ) {
                        var srcPort = Ase0ArchitectureDataCache.getPortDataInfoMap( edgeDataFromCache.end1Element.uid );
                        var tarPort = Ase0ArchitectureDataCache.getPortDataInfoMap( edgeDataFromCache.end2Element.uid );
                        if( srcPort.portInfo.displayProperties[ 1 ] === 'fnd0Bidirectional' && tarPort.portInfo.displayProperties[ 1 ] === 'fnd0Bidirectional' ) {
                            biDirectional = true;
                        }
                        var srcNode = srcPort.portOwner;
                        var tarNode = tarPort.portOwner;
                        var connection = {
                            connModelObj: conn,
                            srcUid: srcNode.uid,
                            tarUid: tarNode.uid,
                            isBiDirectional: biDirectional
                        };
                        connectionObjects.push( connection );
                    }
                }
            }
        } );
    }
    return connectionObjects;
};

export let getColumnInfos = function( uwDataProvider, data ) {
    var columnDefns = [];
    var visibleNodesInGraph = [];
    visibleNodesInGraph = getVisibleNodes();
    var headerCellTemplate = '';
    columnDefns = awMatrixUtils.loadColumns( visibleNodesInGraph, headerCellTemplate, data.displayProp );
    uwDataProvider.columnInfos = columnDefns;
    return {
        columnInfos: columnDefns
    };
};

/**
 * Construct rows for declarative matrix.
 *
 * @param {Object} rowObjects - List of row objects this function will use for constructing the data
 * @param {Object} cellData - Comprising of cell contents to be shown in the matrix cell
 * @param {Object} data - data to load
 * @return {Object} ViewModel rows info and ColumnDefinitions info
 */
var loadData = function( rowObjects, cellData, data ) { // eslint-disable-line no-unused-vars
    var rows = rowObjects;

    var vmRows = [];
    var columnDefs = data.dataProviders.interactionMatrixDataProvider.columnInfos;
    var displayProperty = data.displayProp;

    var cellDispVals = null;
    var cellUids = null;
    var displayValues = '';
    if( cellData ) {
        cellDispVals = cellData.cellDispVals;
        cellUids = cellData.cellUids;
    }

    for( var rowNdx = 0; rowNdx < rows.length; rowNdx++ ) {
        var newVMO = viewModelObjectService.createViewModelObject( rows[ rowNdx ].uid );

        if( newVMO !== null ) {
            for( var iDx = 0; iDx < columnDefs.length; iDx++ ) {
                if( columnDefs[ iDx ].name === 'object_name' ) {
                    var dbValues = 'object_name';

                    var dbvalueArr = [];
                    dbvalueArr.push( dbValues );

                    if( displayProperty ) {
                        displayValues = newVMO.props[ displayProperty ].uiValues[ 0 ];
                    } else {
                        displayValues = newVMO.props.object_string.uiValues[ 0 ];
                    }

                    var displayValuesArr = [];

                    displayValuesArr.push( displayValues );

                    var prop = uwPropertySvc.createViewModelProperty( columnDefs[ iDx ].name,
                        columnDefs[ iDx ].displayName, 'String', dbvalueArr, displayValuesArr );

                    prop.propertyDescriptor = {
                        displayName: columnDefs[ iDx ].displayName,
                        colId: columnDefs[ iDx ].name,
                        rowId: rows[ rowNdx ].uid,
                        rowIdx: rowNdx
                    };

                    prop.typeIconURL = iconSvc.getTypeIconURL( newVMO.type );
                    newVMO.props[ columnDefs[ iDx ].name ] = prop;
                    newVMO.isRowSelected = false;
                    newVMO.displayProperty = displayProperty;
                } else {
                    var colKey = columnDefs[ iDx ].name;
                    var rowKey = rows[ rowNdx ].uid;

                    dbvalueArr = [];
                    displayValuesArr = [];

                    var mapKey = rowKey + '+' + colKey;
                    if( cellUids && cellUids[ mapKey ] ) {
                        var connObj = cellUids[ mapKey ][ 0 ];
                        if( connObj ) {
                            dbvalueArr.push( connObj.uid );
                        }
                    }
                    if( cellDispVals !== null ) {
                        displayValuesArr.push( cellDispVals[ mapKey ] );
                    }
                    prop = uwPropertySvc.createViewModelProperty( columnDefs[ iDx ].name,
                        columnDefs[ iDx ].displayName, 'String', dbvalueArr, displayValuesArr );

                    prop.propertyDescriptor = {
                        displayName: columnDefs[ iDx ].displayName,
                        colId: columnDefs[ iDx ].name,
                        rowId: rows[ rowNdx ].uid,
                        rowIdx: rowNdx
                    };

                    newVMO.props[ columnDefs[ iDx ].name ] = prop;
                    newVMO.isRowSelected = false;
                    newVMO.displayProperty = displayProperty;
                }
            }
            vmRows.push( newVMO );
        }
    }

    return {
        searchResults: vmRows,
        totalFound: vmRows.length,
        columnInfos: columnDefs
    };
};

export let loadDataForConnectionMatrix = function( data ) {
    var visibleNodesInGraph = [];
    var connectionObjects = [];
    visibleNodesInGraph = getVisibleNodes();
    connectionObjects = getConnectionObjects();
    matrixConnTypes = data.preferences.AWC_Connection_Type_Categories;
    var cellData = getCellData( connectionObjects, visibleNodesInGraph );
    var outputData = loadData( visibleNodesInGraph, cellData, data );
    return outputData;
};

/**
 * This function is called for selecting a matrix cell and applying css to the corresponding row and column header
 * of the selected cell.The connection table also gets loaded if the selected matrix cell contains connection data.
 *
 * @param {*} eventData - The event data which gets passed on the gridCellSelection event which gets fired from the
 *            framework code on ui-grid cell nav
 */
export let setCellSelection = function( eventData ) {
    awMatrixSelectionSvc.setCellSelection( eventData );
    var selectedCellObjects = [];
    var newRowCol = eventData.selectedObjects;
    var connUids = newRowCol.row.entity.props[ newRowCol.col.field ].dbValue;
    if( connUids ) {
        _.forEach( connUids, function( connId ) {
            var connObj = cdm.getObject( connId );
            if( connObj ) {
                selectedCellObjects.push( connObj );
            }
        } );
    }
    if( selectedCellObjects.length !== 0 ) {
        selectionService.updateSelection( selectedCellObjects );
    }
};

export let executeColSingleClick = function( eventData ) {
    awMatrixSelectionSvc.selectColHeader( eventData );
};

export let executeRowSingleClick = function( eventData ) {
    awMatrixSelectionSvc.selectRowHeader( eventData );
};

export let executeRowColSelection = function( eventData ) {
    var selectedObjects = eventData.selectedObjects;
    eventBus.publish( 'AM.SubLocationContentSelectionChangeEvent', {
        selections: selectedObjects
    } );
};

/**
 * This function is to deselect a matrix cell. In this function we are removing the css of the cell as well as row
 * and column header and unloading the connection table if it was loaded earlier on selection.
 *
 * @param {*} eventData - The event data which gets passed on the gridCellDeSelection event which gets fired from
 *            the aw-matrix cell directive on cell deselection
 */
export let setCellDeSelection = function( eventData ) {
    awMatrixSelectionSvc.setCellDeSelection( eventData );
};

export default exports = {
    getColumnInfos,
    loadDataForConnectionMatrix,
    setCellSelection,
    executeColSingleClick,
    executeRowSingleClick,
    executeRowColSelection,
    setCellDeSelection
};
/**
 *
 * @memberof NgServices
 * @member Ase0MatrixTableService
 */
app.factory( 'Ase0MatrixTableService', () => exports );
