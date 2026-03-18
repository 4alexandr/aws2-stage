// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/CadBomColumnArrangeService
 */
import app from 'app';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import appCtxSvc from 'js/appCtxService';
import actionSvc from 'js/actionService';
import awColumnSvc from 'js/awColumnService';
import AwPromiseService from 'js/awPromiseService';
import 'js/columnArrangeService';

'use strict';
let exports = {};

/**
 * Process column arrange settings
 *
 * @param {Object} dataProvider - data provider of grid
 * @param {Object} gridId - grid id
 * @param {Object} gridOptions - grid options
 */
export let processColumnsArrangeSettings = function( dataProvider, gridId, gridOptions ) {
    let cols = _.clone( dataProvider.cols );

    _.remove( cols, function( col ) {
        return col.clientColumn;
    } );

    let grididSetting = {
        name: gridId,
        columnConfigId: dataProvider.columnConfig.columnConfigId,
        objectSetUri: dataProvider.objectSetUri,
        columns: cols,
        useStaticFirstCol: Boolean( gridOptions.useStaticFirstCol ),
        showFirstColumn: true
    };

    if( dataProvider.objectSetUri ) {
        grididSetting.operationType = dataProvider.columnConfig.operationType;
    }

    appCtxSvc.registerCtx( 'ArrangeClientScopeUI', grididSetting );
};

/**
 * Arrange grid columns on reset or save action.
 *
 * @param {object} declViewModel - Declarative View Model for grid
 * @param {object} eventData - Event data
 * @returns {object} Promise 
 */
export let arrangeColumns = function( declViewModel, eventData ) {
    let gridToArrange = declViewModel.grids[ eventData.name ];
    if( !gridToArrange ) {
        return AwPromiseService.instance.resolve();
    }

    let dataProvider = declViewModel.dataProviders[ gridToArrange.dataProvider ];
    let colProvider = declViewModel.columnProviders[ gridToArrange.columnProvider ];
    let arrangeType = eventData.arrangeType;

    let evaluationCtx = {
        data: declViewModel,
        ctx: appCtxSvc.ctx
    };

    if( arrangeType === 'reset' && colProvider.resetColumnAction ) {
        dataProvider.resetCollapseCache();
        let resetColumnAction = declViewModel.getAction( colProvider.resetColumnAction );
        if( resetColumnAction ) {
            let inputOpType = resetColumnAction.inputData.getOrResetUiConfigsIn &&
                resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ] &&
                resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ].columnConfigQueryInfos[ 0 ] &&
                resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ].columnConfigQueryInfos[ 0 ].operationType;
            let inputTypesForArrange = dataProvider.columnConfig.typesForArrange;

            let postProcessingResponseFunc = function() {
                let config = dataProvider.resetColumnConfigs[ 0 ];
                let columnConfig = config.columnConfigurations[ 0 ];
                let columns = columnConfig.columns;
                _.forEach( columns, function( column ) {
                    if( column.propDescriptor ) {
                        column.displayName = column.propDescriptor.displayName;
                        column.name = column.propDescriptor.propertyName;
                        column.propertyName = column.propDescriptor.propertyName;
                        column.typeName = column.columnSrcType;
                    }
                } );

                if( !columnConfig.operationType ) {
                    columnConfig.operationType = inputOpType;
                }
                if( !columnConfig.typesForArrange && inputTypesForArrange ) {
                    columnConfig.typesForArrange = inputTypesForArrange;
                }

                let clientColumns = _.filter( dataProvider.columnConfig.columns, { clientColumn: true } );
                if( clientColumns ) {
                    columns = _.concat( columns, clientColumns );
                    columns = _.sortBy( columns, function( column ) { return column.columnOrder; } );
                    columnConfig.columns = columns;
                }

                dataProvider.columnConfig = columnConfig;
                dataProvider.resetColumnConfigs = null;
            };

            if( resetColumnAction.deps ) {
                return declUtils.loadDependentModule( resetColumnAction.deps ).then(
                    function( debModuleObj ) {
                        return actionSvc.executeAction( declViewModel, resetColumnAction, evaluationCtx,
                            debModuleObj ).then( postProcessingResponseFunc );
                    } );
            }

            return actionSvc.executeAction( declViewModel, resetColumnAction, evaluationCtx, null ).then(
                postProcessingResponseFunc );
        }
    } else if( colProvider.saveColumnAndLoadAction && ( arrangeType === 'saveColumnAction' || arrangeType === 'saveColumnAndLoadAction' ) ) {
        if( arrangeType === 'saveColumnAndLoadAction' ) {
            dataProvider.resetCollapseCache();
        }

        let saveColumnAction = declViewModel.getAction( colProvider.saveColumnAndLoadAction );
        if( saveColumnAction ) {
            let soaColumnInfos = [];
            let newColumns = [];
            let index = 100;

            // build a map of columnconfig as value and  propertyName as key
            let propNameToColumns = {};
            _.forEach( dataProvider.columnConfig.columns, function( column ) {
                if( column.propertyName ) {
                    propNameToColumns[ column.propertyName ] = column;
                } else if( column.name ) {
                    propNameToColumns[ column.propertyName ] = column;
                }
            } );

            let firstPropertyColumn = _.filter( dataProvider.columnConfig.columns, { isTreeNavigation: true } );
            let newFirstPropertyColumn = _.filter( eventData.columns, { isTreeNavigation: true } );

            if ( firstPropertyColumn && firstPropertyColumn.length > 0 && newFirstPropertyColumn.length === 0 ) {
                let firstPropName = firstPropertyColumn[0].propertyName;

                if ( firstPropName ) {
                    let firstColumnInfo = awColumnSvc.createSoaColumnInfo( propNameToColumns[ firstPropName ], index );
                    soaColumnInfos.push( firstColumnInfo );
                    delete firstColumnInfo.isFilteringEnabled;

                    newColumns.push( propNameToColumns[ firstPropName ] );
                    index += 100;
                }
            }

            // Update the column for sending via SOA
            _.forEach( eventData.columns, function( col ) {
                // Before saving, remove the icon column
                if( col.name === 'icon' || col.clientColumn ) {
                    return;
                }

                let soaColumnInfo = awColumnSvc.createSoaColumnInfo( col, index );
                delete soaColumnInfo.isFilteringEnabled;
                soaColumnInfos.push( soaColumnInfo );

                let column = propNameToColumns[ col.propertyName ];
                if( column ) {
                    column.hiddenFlag = col.hiddenFlag;
                    column.isFilteringEnabled = col.isFilteringEnabled;
                    column.pixelWidth = col.pixelWidth;
                    column.sortDirection = col.sortDirection;
                    column.sortPriority = col.sortPriority;
                    column.columnOrder = index;
                    newColumns.push( column );
                }
                index += 100;
            } );
            let clientColumns = _.filter( dataProvider.columnConfig.columns, { clientColumn: true } );

            if( clientColumns ) {
                newColumns = _.concat( newColumns, clientColumns );
                newColumns = _.sortBy( newColumns, function( column ) { return column.columnOrder; } );
            }
            dataProvider.newColumns = soaColumnInfos;
            dataProvider.columnConfig.columns = newColumns;

            if( saveColumnAction.deps ) {
                return declUtils.loadDependentModule( saveColumnAction.deps ).then(
                    function( debModuleObj ) {
                        return actionSvc.executeAction( declViewModel, saveColumnAction, evaluationCtx,
                            debModuleObj ).then( function() {
                            dataProvider.newColumns = null;
                        } );
                    } );
            }

            return actionSvc.executeAction( declViewModel, saveColumnAction, evaluationCtx, null ).then(
                function() {
                    dataProvider.newColumns = null;
                } );
        }
    } else {
        return AwPromiseService.instance.reject( 'Invalid action specified: ' + arrangeType );
    }
};

/**
 * CAD-BOM Column Arrange service
 */
export default exports = {
    processColumnsArrangeSettings,
    arrangeColumns
};
app.factory( 'CadBomColumnArrangeService', () => exports );
