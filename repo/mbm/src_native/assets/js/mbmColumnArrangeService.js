// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmColumnArrangeService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import actionService from 'js/actionService';
import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';
import declUtils from 'js/declUtils';

var exports = {};

export let processColumnsArrangeSettings = function( dataProvider, gridId, gridOptions ) {
    var cols = _.clone( dataProvider.cols );

    _.remove( cols, function( col ) {
        return col.clientColumn;
    } );

    var grididSetting = {
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

    appCtxService.registerCtx( 'ArrangeClientScopeUI', grididSetting );
};

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
        ctx: appCtxService.ctx
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
                        return actionService.executeAction( declViewModel, resetColumnAction, evaluationCtx,
                            debModuleObj ).then( postProcessingResponseFunc );
                    } );
            }

            return actionService.executeAction( declViewModel, resetColumnAction, evaluationCtx, null ).then(
                postProcessingResponseFunc );
        }
    } else if( colProvider.saveColumnAndLoadAction && ( arrangeType === 'saveColumnAction' || arrangeType === 'saveColumnAndLoadAction' ) ) {
        if( arrangeType === 'saveColumnAndLoadAction' ) {
            dataProvider.resetCollapseCache();
        }

        let saveColumnAction = declViewModel.getAction( colProvider.saveColumnAndLoadAction );
        if( saveColumnAction ) {
            let soaColumnInfosMap ={};
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

            // add column which has isTreeNavigation as true in soaColumnInfo
            let treeNavigationColumn = _.filter( dataProvider.columnConfig.columns, { isTreeNavigation: true } );
            let treeNavigationColumnOrder = treeNavigationColumn.columnOrder || index;
            let firstColumnInfo = awColumnSvc.createSoaColumnInfo( treeNavigationColumn[ 0 ], treeNavigationColumnOrder );
            soaColumnInfosMap[firstColumnInfo.propertyName]=firstColumnInfo;
            index += 100;

            // Update the column for sending via SOA
            _.forEach( eventData.columns, function( col ) {
                // Before saving, remove the icon column
                if( col.name === 'icon' || col.clientColumn ) {
                    return;
                }
                if(index ===treeNavigationColumnOrder)
                {
                    index +=100;
                }

                var soaColumnInfo = awColumnSvc.createSoaColumnInfo( col, index );
                delete soaColumnInfo.isFilteringEnabled;

                soaColumnInfosMap[soaColumnInfo.propertyName]=soaColumnInfo;
                
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
            let clientColumns = _.filter( dataProvider.columnConfig.columns, { enableColumnHiding: false } );

            if( clientColumns ) {
                newColumns = _.concat( newColumns, clientColumns );
                newColumns = _.sortBy( newColumns, function( column ) { return column.columnOrder; } );
            }
            dataProvider.newColumns = Object.values( soaColumnInfosMap );
            dataProvider.columnConfig.columns = newColumns;

            if( saveColumnAction.deps ) {
                return declUtils.loadDependentModule( saveColumnAction.deps ).then(
                    function( debModuleObj ) {
                        return actionService.executeAction( declViewModel, saveColumnAction, evaluationCtx,
                            debModuleObj ).then( function() {
                            dataProvider.newColumns = null;
                        } );
                    } );
            }

            return actionService.executeAction( declViewModel, saveColumnAction, evaluationCtx, null ).then(
                function() {
                    dataProvider.newColumns = null;
                } );
        }
    } else {
        return AwPromiseService.instance.reject( 'Invalid action specified: ' + arrangeType );
    }
};

export default exports = {
    processColumnsArrangeSettings,
    arrangeColumns
};
app.factory( 'mbmColumnArrangeService', () => exports );
