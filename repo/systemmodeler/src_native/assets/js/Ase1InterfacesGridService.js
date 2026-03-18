//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Interfaces grid service populates the data required to show grid
 *
 * @module js/Ase1InterfacesGridService
 */
import * as app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import iconSvc from 'js/iconService';
import awMatrixUtils from 'js/awMatrixUtils';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import awMatrixSelectionSvc from 'js/awMatrixSelectionService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/awColumnService';
import 'js/awTableService';

import 'js/selection.service';

var exports = {};

var CELL_DISPLAY_VALUE = '9899';

/**
 * Contructs the cell data map with key as combination of column and row uid
 *
 * @param {object} connectionObjects rolled up conneciton objects in interface graph
 * @param {object} internalSystems internal systems in interface graph
 * @param {object} externalSystems external systems in interface graph
 *
 * @return {Object} cellData of a grid
 */
var getCellData = function( connectionObjects, internalSystems, externalSystems ) {
    var visibleConnMap = {};
    var cellDispMap = {};
    var cellVal = '';
    var cellData = {};
    var externSystems = [];
    if( connectionObjects ) {
        externSystems = _.filter( externalSystems, function( extrenSys ) {
            return extrenSys.name !== 'object_name';
        } );
        _.forEach( connectionObjects, function( connectionObj ) {
            var mapKey = '';
            var connObjects = [];
            mapKey = connectionObj.srcUid;
            mapKey = mapKey.concat( '+' ).concat( connectionObj.tarUid );
            connObjects = visibleConnMap[ mapKey ];
            if( !connObjects ) {
                connObjects = [];
            }
            connObjects.push( connectionObj.connModelObj );
            visibleConnMap[ mapKey ] = connObjects;
        } );
    }
    cellData.cellUids = visibleConnMap;
    _.forEach( internalSystems, function( internalSystem ) {
        _.forEach( externSystems, function( externalSystem ) {
            var key = internalSystem.uid.concat( '+' ).concat( externalSystem.name );
            var relations = visibleConnMap[ key ];
            if( relations ) {
                cellVal = getCellValue( relations );
            } else {
                cellVal = '';
            }
            cellDispMap[ key ] = cellVal;
        } );
    } );
    cellData.cellDispVals = cellDispMap;
    return cellData;
};

/**
 * return the dispay value of the cell
 *
 * @param {object} relations connection object
 *
 * @return {String} cell display value
 */
var getCellValue = function( relations ) {
    if( relations && relations.length > 0 ) {
        var cellValue = '&#' + CELL_DISPLAY_VALUE + ';';
        return '<span class=aw-systemmodeler-cellDisplay>' + cellValue + '</span>';
    }
};

/**
 * Return the external nodes for selected object
 *
 * @return {Array} externalNodes of selected object
 */
var getExternalNodes = function() {
    var interfacesCtx = appCtxService.getCtx( 'interfacesCtx' );
    var externalNodes = [];
    var displayProp = getDisplayProperty();
    if( interfacesCtx && interfacesCtx.nodeMap && interfacesCtx.externalSystems &&
        interfacesCtx.externalSystems.length > 0 ) {
        _.forEach( interfacesCtx.externalSystems, function( node ) {
            if( interfacesCtx.nodeMap[ node.nodeObject.uid ] ) {
                var nodeObject = interfacesCtx.nodeMap[ node.nodeObject.uid ].nodeObject;
                if( nodeObject && nodeObject.props && nodeObject.props[ displayProp ] ) {
                    externalNodes.push( interfacesCtx.nodeMap[ node.nodeObject.uid ].nodeObject );
                } else {
                    var uiValues = [ node.nodeLabel ];
                    nodeObject.props[ displayProp ] = {};
                    nodeObject.props[ displayProp ].uiValues = uiValues;
                    externalNodes.push( nodeObject );
                }
            }
        } );
    }
    return externalNodes;
};

/**
 * Return the internal systems for selected object with the system of interest as first object
 *
 * @return {Array} internalNodes for selected object
 */
var getInternalNodes = function() {
    var interfacesCtx = appCtxService.getCtx( 'interfacesCtx' );
    var internalNodes = [];

    if( interfacesCtx.nodeMap && interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 ) {
        _.forEach( interfacesCtx.internalSystems, function( node ) {
            if( interfacesCtx.nodeMap[ node.nodeObject.uid ] ) {
                interfacesCtx.nodeMap[ node.nodeObject.uid ].nodeObject.nodeLabel = node.nodeLabel;
                internalNodes.push( interfacesCtx.nodeMap[ node.nodeObject.uid ].nodeObject );
            }
        } );
    } else {
        if( interfacesCtx && interfacesCtx.systemOfInterest ) {
            interfacesCtx.systemOfInterest.nodeObject.nodeLabel = interfacesCtx.systemOfInterest.nodeLabel;
            internalNodes.push( interfacesCtx.systemOfInterest.nodeObject );
        }
    }
    return internalNodes;
};

/**
 * get the current system of interest and system in view
 *
 * @return {Array} pinnedColumns
 */
var getPinnedColumn = function() {
    var interfacesCtx = appCtxService.getCtx( 'interfacesCtx' );
    var pinnedColumns = [];

    if( interfacesCtx.nodeMap && interfacesCtx.systemOfInterest && interfacesCtx.systemInView ) {
        if( interfacesCtx.systemOfInterest.nodeObject.uid === interfacesCtx.systemInView.nodeObject.uid ) {
            var updateSystemOfInterest = updateNodeObjectDisplayProp( interfacesCtx.systemOfInterest );
            pinnedColumns.push( updateSystemOfInterest.nodeObject );
        } else {
            var systemInView = updateNodeObjectDisplayProp( interfacesCtx.systemInView );
            var systemOfInterest = updateNodeObjectDisplayProp( interfacesCtx.systemOfInterest );
            pinnedColumns.push( systemOfInterest.nodeObject );
            pinnedColumns.push( systemInView.nodeObject );
        }
    }
    return pinnedColumns;
};

/**
 * Update display properties of Node object
 *
 * @param {object} system in graph
 *
 * @return {Object} system with updated properties
 */
var updateNodeObjectDisplayProp = function( system ) {
    var displayProp = getDisplayProperty();
    if( system.nodeObject && system.nodeObject.props && !system.nodeObject.props[ displayProp ] ) {
        var uiValues = [ system.nodeLabel ];
        system.nodeObject.props[ displayProp ] = {};
        system.nodeObject.props[ displayProp ].uiValues = uiValues;
    }
    return system;
};

/**
 * Returns the rolled up connection on the interfaces graph
 *
 * @return {Array} edges
 */
var getConnectionObjects = function() {
    var interfacesCtx = appCtxService.getCtx( 'interfacesCtx' );
    var edges = [];
    if( interfacesCtx && interfacesCtx.edges && interfacesCtx.edges.length > 0 ) {
        _.forEach( interfacesCtx.edges, function( edge ) {
            var connectionObj = edge.edgeObject;
            var srcNode = edge.end1Element;
            var tarNode = edge.end2Element;
            var connection = {
                connModelObj: connectionObj,
                srcUid: srcNode.uid,
                tarUid: tarNode.uid
            };
            edges.push( connection );
        } );
    }
    return edges;
};

/**
 * get the current display property from context
 *
 * @return {String} display property
 */
var getDisplayProperty = function() {
    var interfacesLabelCtx = appCtxService.getCtx( 'interfacesLabelCtx' );
    var displayProp = 'object_string';
    if( interfacesLabelCtx && interfacesLabelCtx.selectedLabelProperty ) {
        var propName = interfacesLabelCtx.selectedLabelProperty.split( '.' );
        displayProp = propName[ 1 ];
    }
    return displayProp;
};

/**
 * updates column information on the dataprovider
 *
 * @param {object} uwDataProvider instance of the dataprovider for the grid
 *
 * @return {Object} column info
 */
export let getColumnInfos = function( uwDataProvider ) {
    var externalSystems = getExternalNodes();
    var pinedColInfos = getPinnedColumn();
    var displayProp = getDisplayProperty();
    var columnDefns = awMatrixUtils.loadColumns( externalSystems, pinedColInfos, displayProp );
    uwDataProvider.columnInfos = columnDefns;
    uwDataProvider.cols = columnDefns;
    return {
        columnInfos: columnDefns
    };
};

/**
 * Construct rows for declarative matrix.
 *
 * @param {Object} rowObjects - List of row objects this function will use for constructing the data
 * @param {Object} cellData - Comprising of cell contents to be shown in the matrix cell
 * @param {Object} uwDataProvider instance of the dataprovider for the grid
 *
 * @return {Object} search result for matrix rows
 */
var loadData = function( rowObjects, cellData, uwDataProvider ) {
    var rows = rowObjects;
    var columnDef = uwDataProvider.columnInfos;

    var vmRows = [];
    var displayProperty = getDisplayProperty();
    var cellDispVals = null;
    var cellUids = null;
    if( cellData ) {
        cellDispVals = cellData.cellDispVals;
        cellUids = cellData.cellUids;
    }

    for( var rowNdx = 0; rowNdx < rows.length; rowNdx++ ) {
        var displayLabel = rows[ rowNdx ].nodeLabel;
        var newVMO = viewModelObjectService.createViewModelObject( rows[ rowNdx ].uid );

        if( newVMO !== null ) {
            for( var iDx = 0; iDx < columnDef.length; iDx++ ) {
                if( columnDef[ iDx ].name === 'object_name' ) {
                    var dbValues = 'object_name';

                    var dbvalueArr = [];
                    dbvalueArr.push( dbValues );

                    var displayValues = '';

                    //check if the object display property is loaded or create the display property
                    if( displayProperty && newVMO.props[ displayProperty ] && newVMO.props[ displayProperty ].uiValues ) {
                        displayValues = newVMO.props[ displayProperty ].uiValues[ 0 ];
                    } else {
                        if( displayProperty && newVMO.props ) {
                            displayValues = displayLabel;
                            var displayLabelArr = [ displayLabel ];
                            newVMO.cellHeader1 = displayValues;
                            var displayProp = uwPropertySvc.createViewModelProperty( displayProperty, displayProperty,
                                'String', displayLabel, displayLabelArr );
                            newVMO.props[ displayProperty ] = {};
                            newVMO.props[ displayProperty ] = displayProp;
                        }
                    }

                    var displayValuesArr = [];

                    displayValuesArr.push( displayValues );

                    var prop = uwPropertySvc.createViewModelProperty( columnDef[ iDx ].name,
                        columnDef[ iDx ].displayName, 'String', dbvalueArr, displayValuesArr );

                    prop.propertyDescriptor = {
                        displayName: columnDef[ iDx ].displayName,
                        colId: columnDef[ iDx ].name,
                        rowId: rows[ rowNdx ].uid,
                        rowIdx: rowNdx
                    };

                    prop.typeIconURL = iconSvc.getTypeIconURL( newVMO.type );
                    newVMO.props[ columnDef[ iDx ].name ] = prop;
                    newVMO.isRowSelected = false;
                    newVMO.displayProperty = displayProperty;
                } else {
                    var colKey = columnDef[ iDx ].name;
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
                    prop = uwPropertySvc.createViewModelProperty( columnDef[ iDx ].name,
                        columnDef[ iDx ].displayName, 'String', dbvalueArr, displayValuesArr );

                    prop.propertyDescriptor = {
                        displayName: columnDef[ iDx ].displayName,
                        colId: columnDef[ iDx ].name,
                        rowId: rows[ rowNdx ].uid,
                        rowIdx: rowNdx
                    };

                    newVMO.props[ columnDef[ iDx ].name ] = prop;
                    newVMO.isRowSelected = false;
                    newVMO.displayProperty = displayProperty;
                }
            }
            vmRows.push( newVMO );
        }
    }
    return {
        searchResults: vmRows,
        totalFound: vmRows.length
    };
};

/**
 * Load the Interfaces grid with the data
 *
 * @param {object} data declarative view model
 *
 * @return {Object} Object containing matrix data
 */
export let loadDataForInterfacesGrid = function( data ) {
    var uwDataProvider = data.dataProviders.interfacesGridDataProvider;
    if( data.preferences.ASE1_Interfaces_Cell_Display && data.preferences.ASE1_Interfaces_Cell_Display.length > 0 ) {
        CELL_DISPLAY_VALUE = data.preferences.ASE1_Interfaces_Cell_Display[ 0 ];
    }
    var internalSystems = getInternalNodes();
    var externalSystems = uwDataProvider.columnInfos;
    var connectionObjects = getConnectionObjects();
    var cellData = getCellData( connectionObjects, internalSystems, externalSystems );
    var outputData = loadData( internalSystems, cellData, uwDataProvider );
    return outputData;
};

/**
 * selection logic to select the cell in interface grid
 *
 * @param {object} eventData event data from the grid cell selection
 */
export let setInterfacesCellSelection = function( eventData ) {
    awMatrixSelectionSvc.setCellSelection( eventData );
    var newRowCol = eventData.selectedObjects;
    if( newRowCol.col.field !== 'object_name' ) {
        if( newRowCol.col.field !== 'lastColumn' ) {
            var selectedCellObjects = [];
            var edgeUids = newRowCol.row.entity.props[ newRowCol.col.field ].dbValue;
            if( edgeUids ) {
                _.forEach( edgeUids, function( edgeId ) {
                    var edgeObj = cdm.getObject( edgeId );
                    if( edgeObj ) {
                        selectedCellObjects.push( edgeObj );
                    }
                } );
            }
            var selectionData = {
                selection: selectedCellObjects
            };
            eventBus.publish( 'Ase1InterfacesPage.selectionChanged', selectionData );
        } else {
            var emptySelection = {
                selection: []
            };
            eventBus.publish( 'Ase1InterfacesPage.selectionChanged', emptySelection );
        }
    }
};

/**
 * Set the selection on interfaces grid for external system
 *
 * @param {object} eventData  selected object
 */
export let interfacesGridExternalSystemSelection = function( eventData ) {
    awMatrixSelectionSvc.selectColHeader( eventData );
};

/**
 * Set the selection on interfaces grid for internal system
 *
 * @param {object} eventData  selected object
 */
export let interfacesGridInternalSystemSelection = function( eventData ) {
    awMatrixSelectionSvc.selectRowHeader( eventData );
};

export let pinnedColumnSelection = function( eventData ) {
    awMatrixSelectionSvc.selectPinnedColumn( eventData );
};

/**
 * function for deselecting a matrix cell.
 *
 * @param {object} eventData - The event data which gets passed on the gridCellDeSelection event which gets fired from
 *            the aw-matrix cell directive on cell deselection
 */
export let interfacesGridCellDeSelection = function( eventData ) {
    awMatrixSelectionSvc.setCellDeSelection( eventData );
    var selectionData = {
        selection: []
    };
    eventBus.publish( 'Ase1InterfacesPage.selectionChanged', selectionData );
};

/**
 * Navigates to internal system and update the grid
 *
 * @param {object} eventData event data containing object double clicked on grid
 */
export let interfacesGridNavigateInternalSystem = function( eventData ) {
    if( eventData && eventData.doubleClickedObject ) {
        eventBus.publish( 'Ase1InterfacesPage.objectDoubleClicked', eventData );
    }
};

/**
 * Navigates to external system and update the grid
 *
 * @param {object} eventData event data containing object double clicked on grid
 */
export let interfacesGridNavigateExternalSystem = function( eventData ) {
    if( eventData && eventData.doubleClickedObject ) {
        eventBus.publish( 'Ase1InterfacesPage.objectDoubleClicked', eventData );
    }
};

export let processGridHeaderSeleciton = function( eventData ) {
    var selectionData = {};
    if( eventData && eventData.selectedObjects && eventData.selectedObjects.length > 0 ) {
        var interfacesCtx = appCtxService.getCtx( 'interfacesCtx' );
        var nodeObject = interfacesCtx.nodeMap[ eventData.selectedObjects[ 0 ].uid ].nodeObject;
        selectionData.selection = [ nodeObject ];
    } else {
        selectionData.selection = [ appCtxService.ctx.occmgmtContext.openedElement ];
    }
    eventBus.publish( 'Ase1InterfacesPage.selectionChanged', selectionData );
};

export default exports = {
    getColumnInfos,
    loadDataForInterfacesGrid,
    setInterfacesCellSelection,
    interfacesGridExternalSystemSelection,
    interfacesGridInternalSystemSelection,
    pinnedColumnSelection,
    interfacesGridCellDeSelection,
    interfacesGridNavigateInternalSystem,
    interfacesGridNavigateExternalSystem,
    processGridHeaderSeleciton
};
app.factory( 'Ase1InterfacesGridService', () => exports );
