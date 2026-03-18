// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpRelationSvc from 'js/services/ngpRelationService';
import ngpModelUtils from 'js/utils/ngpModelUtils';
import ngpSelectUponLoadSvc from 'js/services/ngpSelectUponLoadService';
import ngpTableSvc from 'js/services/ngpTableService';
import ngpCloneSvc from 'js/services/ngpCloneService';
import ngpVMOPropSvc from 'js/services/ngpViewModelPropertyService';
import ngpPropConstants from 'js/constants/ngpPropertyConstants';
import ngpTypeUtils from 'js/utils/ngpTypeUtils';
import mfeTableSvc from 'js/mfeTableService';

import _ from 'lodash';
import awTableService from 'js/awTableService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';

/**
 * NGP Build Strategy service
 *
 * @module js/services/ngpBuildStrategyService
 */
'use strict';

/**
 *
 * @param {Object} treeLoadInput treeLoadInput object
 * @param {Object} dataProvider - the dataprovider created in the viewModel
 * @param {Object} sortCriteria - the sort criteria object
 * @param {Object} viewModelData - the data of the view model which uses this service
 * @return {Promise} - a promise object
 */
export function loadTableData( treeLoadInput, dataProvider, sortCriteria, viewModelData ) {
    const columns = dataProvider.columnConfig.columns;
    for( let i in columns ) {
        if( columns[ i ].propertyName === ngpPropConstants.OBJECT_STRING ) {
            columns[ i ].isTreeNavigation = true;
            break;
        }
    }
    const nodeToExpand = treeLoadInput.parentNode;
    nodeToExpand.cursorObject = {
        startReached: true,
        endReached: true
    };

    return ngpRelationSvc.getContentElements( nodeToExpand.uid, true ).then(
        ( contentElements ) => {
            const columns = dataProvider.columnConfig.columns;
            let hasCloneStatusColumn = !columns.every( ( column ) => column.name !== 'MasterStatus' && column.name !== 'CloneStatus' );
            if( hasCloneStatusColumn ) {
                return ngpCloneSvc.getCloneStatuses( contentElements ).then(
                    () => {
                        const contentElementUids = contentElements.map( ( elem ) => elem.uid );
                        viewModelData.savedCloneStatusUids.push( ...contentElementUids );
                        viewModelData.savedCloneStatusUids = viewModelData.savedCloneStatusUids.filter( ( uid, index, array ) => array.indexOf( uid ) === index );
                        return contentElements;
                    }
                );
            }
            return contentElements;
        }
    ).then(
        ( contentElements ) => {
            contentElements.forEach( ( elem ) => {
                ngpVMOPropSvc.addLocalizedTypeDisplayNames( elem );
            } );
            const sortedContentElements = ngpTableSvc.sortTable( contentElements, sortCriteria );
            const childTreeNodes = sortedContentElements.map( ( object, index ) => {
                const isLeaf = !ngpModelUtils.hasContentElements( object );
                return mfeTableSvc.getTreeNodeObject( object, nodeToExpand, isLeaf, index );
            } );
            const treeLoadResult = awTableService.buildTreeLoadResult( treeLoadInput, childTreeNodes, false, true, true, null );
            setSelectionUponInitialLoad( dataProvider, viewModelData );
            return {
                treeLoadResult
            };
        }
    );
}

/**
 * Creates the table column in the given dataProvider
 *
 * @param {String} preferenceName - the preference name which contains the list of object properties to display as a column in the table
 * @param {Object} dataProvider - the table data provider
 * @param {object} columnProvider - the table column provider
 */
export function createTableColumns( preferenceName, dataProvider, columnProvider ) {
    mfeTableSvc.createColumns( preferenceName, dataProvider, columnProvider ).then(
        () => {
            createCellRenderers( dataProvider.columnConfig.columns );
            ngpTableSvc.setTreeNavigationColumn( dataProvider, ngpPropConstants.OBJECT_STRING );
            ngpTableSvc.setCloneAndMasterColumnsSettings( dataProvider );
        }
    );
}

/**
 *
 * @param {object[]} columns - an array of column objects
 */
function createCellRenderers( columns ) {
    columns.forEach( ( column ) => {
        if( !column.cellRenderers ) {
            column.cellRenderers = [];
        }
        column.cellRenderers.push( mfeTableSvc.getRowRenderer( 'aw-widgets-partialVisibility', 'opaqueRowRenderer', shouldCellBeOpaque ) );
    } );
}

/**
 *
 * @param {object} column - the column
 * @param {ViewModelObject} rowVMO - the row ViewModelObject
 * @return {boolean} true if the cell should be opaque
 */
function shouldCellBeOpaque( column, rowVMO ) {
    const moveCandidates = appCtxSvc.getCtx( 'ngp.buildStrategyState.moveCandidates' );
    const obj = _.find( moveCandidates, ( candidate ) => candidate.uid === rowVMO.uid );
    return Boolean( obj );
}

/**
 *
 * @param {object} dataProvider - the data provider object
 * @param {object} viewModelData - the data of the view model which uses this service
 */
export function setSelectionUponInitialLoad( dataProvider, viewModelData ) {
    const uidsToSelect = ngpSelectUponLoadSvc.getUidsToSelectUponLoad();
    if( uidsToSelect && uidsToSelect.length > 0 ) {
        setTimeout( () => {
            findAndSetSelection( uidsToSelect, dataProvider, viewModelData );
        }, 100 );
    }
}

/**
 *
 * @param {string[]} uidsToSelect - an array of uids to select
 * @param {object} dataProvider - the data provider object
 * @param {object} viewModelData - the view model data which is using this service
 */
export function findAndSetSelection( uidsToSelect, dataProvider, viewModelData ) {
    if( uidsToSelect && dataProvider && viewModelData ) {
        //for now, we assume that only one object needs to get selected
        //if multiple needs to get selected, then need to make sure all of them are loaded and only then select
        if( Array.isArray( uidsToSelect ) && uidsToSelect.length === 1 ) {
            const uid = uidsToSelect[ 0 ];
            const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
            const vmoToSelect = _.find( loadedObjects, ( loadedObj ) => loadedObj.uid === uid );
            if( vmoToSelect ) {
                dataProvider.selectionModel.setSelection( vmoToSelect );
                return;
            }
            const ancestorUids = ngpModelUtils.getAncestorUids( cdm.getObject( uid ) );
            for( let i = 0; i < ancestorUids.length; i++ ) {
                const vmoTreeNode = _.find( loadedObjects, ( loadedObj ) => loadedObj.uid === ancestorUids[ i ] );
                if( vmoTreeNode ) {
                    mfeTableSvc.expandTreeNode( dataProvider, vmoTreeNode, viewModelData ).then(
                        () => {
                            findAndSetSelection( uidsToSelect, dataProvider, viewModelData );
                        }
                    );
                    break;
                }
            }
        }
    }
}
/**
 * Updates the table after the restructure
 * @param {modelObject} parentTreeNode - the object that we need to add the cloned object which were moved to
 * @param {modelObject} childObject - the item that need to be added to target
 * @param {object} dataProvider - the dataprovider object
 */
function updateTableAfterClone( parentTreeNode, childObject, dataProvider ) {
    const isLeafFunc = ( modelObj ) => !ngpModelUtils.hasContentElements( modelObj );
    mfeTableSvc.appendChildNodes( parentTreeNode, [ cdm.getObject( childObject.uid ) ], dataProvider, isLeafFunc );
}
/**
 *
 * @param {modelObject[]} updatedClones - a list of clones that were updated
 * @param {object} dataProvider - a given data provider object
 * @param {string} tableId - the table id
 * @param {object} viewModelData - the viewModel data of the viewModel which calls this service
 */
export function onClonesUpdated( updatedClones, dataProvider, tableId, viewModelData ) {
    //currently we're updating only one clone and not multiple
    if( Array.isArray( updatedClones ) ) {
        const clone = updatedClones[ 0 ];
        const scopeObject = appCtxSvc.getCtx( 'ngp.scopeObject' );
        if( ngpTypeUtils.isBuildElement( scopeObject ) ) {
            let uidToCollapseAndExpand;
            if( ngpTypeUtils.isActivity( clone ) ) {
                uidToCollapseAndExpand = clone.uid;
            } else {
                uidToCollapseAndExpand = clone.props[ ngpPropConstants.PARENT_OF_PROCESS_OR_ME ].dbValues[ 0 ];
            }
            const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
            const vmoTreeNode = _.find( loadedObjects, ( loadedObj ) => loadedObj.uid === uidToCollapseAndExpand );
            mfeTableSvc.collapseTreeNode( dataProvider, vmoTreeNode, viewModelData ).then( () => {
                mfeTableSvc.expandTreeNode( dataProvider, vmoTreeNode, viewModelData );
            } );
        } else {
            //TODO need to think of a more optimal solution
            mfeTableSvc.reloadTable( tableId );
        }
    }
}

let exports = {};
export default exports = {
    loadTableData,
    findAndSetSelection,
    onClonesUpdated,
    createTableColumns,
    updateTableAfterClone
};
