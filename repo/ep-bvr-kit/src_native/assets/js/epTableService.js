// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for ep table views
 *
 * @module js/epTableService
 */
import _ from 'lodash';

import epSaveService from 'js/epSaveService';
import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import policySvc from 'soa/kernel/propertyPolicyService';
import saveInputWriterService from 'js/saveInputWriterService';
import { constants as epLoadConstants } from 'js/epLoadConstants';
import { constants as epSaveConstants } from 'js/epSaveConstants';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import awTableService from 'js/awTableService';
import mfeTableService from 'js/mfeTableService';
import vMOService from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import selectionModelFactory from 'js/selectionModelFactory';
import mfeTableSvc from 'js/mfeTableService';
import mfeSyncUtils from 'js/mfeSyncUtils';

'use strict';

const className = 'aw-ep-highlightScopes';
const rendererName = 'highLightScopedNode';
/**
 * Builds selection Model
 *
 * @param {string} selectionModelMode the selectionModel Mode - single/multiple
 *
 * @returns {object} selectionModel
 */
export function buildSelectionModel( selectionModelMode ) {
   return selectionModelFactory.buildSelectionModel(
        selectionModelMode,
        ( input ) => {
            if( typeof input === 'string' || !input.uid ) {
                return input;
            }
            return input.uid;
        } );
}


/**
 * Load table columns data
 *
 * @param {String} objUid - the object uid to load its related data to display in table
 * @param { String } loadInputObject has loadType, propertiesToLoad, targetUid, additionalLoadParams, loadedObjectMapKey
 * @param {Object} tabContext - the selected tab context
 *
 * @return {ObjectArray} rowsObjects - the table rows objects
 * @return {ObjectArray} totalRows - the number of table rows
 */
export function loadColumnsData( objUid, loadInputObject, tabContext ) {
    if( tabContext.selectedTab !== true ) {
        return;
    }

    if( !objUid ) {
        return {
            rowsObjects: [],
            totalRows: 0
        };
    }

    const { loadType, propertiesToLoad, targetUid, additionalLoadParams, loadedObjectMapKey } = loadInputObject;
    return loadDataFromLoadedResponse( objUid, loadType, propertiesToLoad, targetUid, additionalLoadParams, loadedObjectMapKey ).then( ( result ) => {
        return result;
    } );
}

/**
 * Function accepts loadTypeInputs for creating inputs data for SOA call
 *
 * @param {string} objUid the node uid
 * @param {String} loadType the load type
 * @param {array} propertiesToLoad the props to load
 * @param {string} targetUid the target uid
 * @param {array} additionalLoadParams additional params
 * @param { String } loadedObjectMapKey key for loadedObjectsMap
 *
 * @returns {Object} data for table
 */
export function loadDataFromLoadedResponse( objUid, loadType, propertiesToLoad, targetUid, additionalLoadParams, loadedObjectMapKey ) {
    if( !objUid ) {
        return;
    }

    const loadTypeInput = epLoadInputHelper.getLoadTypeInputs( [ loadType ], objUid, propertiesToLoad, targetUid, additionalLoadParams );
    return epLoadService.loadObject( loadTypeInput, false ).then( ( response ) => {
        let rowsObjects;
        if( loadedObjectMapKey ) {
            if( response.relatedObjectsMap ) {
                rowsObjects = getObjectsFromRelatedObjectsMap( objUid, response.relatedObjectsMap, loadedObjectMapKey );
            }
        } else {
            rowsObjects = getProperties( objUid, propertiesToLoad );
        }

        const totalRows = rowsObjects ? Object.keys( rowsObjects ).length : 0;

        return {
            rowsObjects,
            totalRows
        };
    } );
}

/**
 * Function accepts objectUid, loadedObjectsMap and key, returns value at this key
 *
 * @param { Object } objectUid source object uid
 * @param { String } relatedObjectsMap response from Load SOA
 * @param { String } key for relatedObjectsMap
 *
 * @returns {Object} data for table
 */
function getObjectsFromRelatedObjectsMap( objectUid, relatedObjectsMap, key ) {
    if( relatedObjectsMap[ objectUid ] ) {
        const relatedObjMap = relatedObjectsMap[objectUid];
        if( relatedObjMap.additionalPropertiesMap2[key] ) {
            return _.map( relatedObjMap.additionalPropertiesMap2[key], ( uid ) => cdm.getObject( uid ) );
        }
    }

    return [];
}

/**
 * Function accepts Object UID and Properties array to get
 * @param { String } objUid : objects UID
 * @param { array } propertiesToLoad the props to load
 * @returns {Object} data for table
 */
function getProperties( objUid, propertiesToLoad ) {
    const currModelObject = cdm.getObject( objUid );
    const relatedObjectsUids = _.flatMap( propertiesToLoad, ( prop ) => {
        if( currModelObject.props[ prop ] ) { return currModelObject.props[ prop ].dbValues; }
    } ).filter( Boolean );
    return _.map( relatedObjectsUids, ( uid ) => cdm.getObject( uid ) );
}

/**
 * Load data for tree for the first time i.e. entire process tree
 *
 * @param {Object} treeLoadInput treeLoadInput object
 * @param {String} topNodeUid : trees top node Uid
 * @param {Object} rootLoadInputData - the table data provider
 * @param {Object} childLoadInputData - the table data provider
 * @param {Object} dataProvider - the table data provider
 * @param {int} treeNavigationColumnIndex - the expandable column index
 *
 * @return {ObjectArray} treeLoadResult - treeLoadResult
 */
export function initializeLoadDataForTree( treeLoadInput, topNodeUid, rootLoadInputData, childLoadInputData, dataProvider, treeNavigationColumnIndex = 0, isLeafProperty = 'bl_has_children' ) {
    const parentNode = treeLoadInput.parentNode;
    const nodeToExpand = parentNode.uid;
    const isRootNode = nodeToExpand === topNodeUid;

    treeLoadInput.parentNode.cursorObject = {
        startReached: true,
        endReached: true
    };

    dataProvider.columnConfig.columns[ treeNavigationColumnIndex ].isTreeNavigation = true;

    const policyId = policySvc.register( dataProvider.policy );

    const inputDataObject = isRootNode ? rootLoadInputData : childLoadInputData;
    const { loadType, propertiesToLoad, targetUid, additionalLoadParams } = inputDataObject;

    return loadDataFromLoadedResponse( nodeToExpand, loadType, propertiesToLoad, targetUid, additionalLoadParams ).then( function( result ) {
        /**
         * For initial load, the top process and its children must be visible
         */
        policySvc.unregister( policyId );

        const childTreeNodes = [];

        const vmo = vMOService.createViewModelObject( topNodeUid );
        const topNode = mfeTableService.getTreeNodeObject( vmo, parentNode, mfeTableService.isLeaf( vmo, isLeafProperty ), 0 );
        topNode.children = [];
        childTreeNodes.push( topNode );

        for( let i = 0; i < result.rowsObjects.length; i++ ) {
            const childNdx = i;
            const vmo = vMOService.createViewModelObject( result.rowsObjects[ i ] );
            const childNode = mfeTableService.getTreeNodeObject( vmo, topNode, mfeTableService.isLeaf( result.rowsObjects[ i ], isLeafProperty ), childNdx );
            childTreeNodes.push( childNode );
            childNode.props.bl_parent && childNode.props.bl_parent.dbValues[0] === topNode.uid  && topNode.children.push( childNode );
            setIsOpaqueProperty( vmo, false );
        }

        const endReached = treeLoadInput.startChildNdx + treeLoadInput.pageSize > childTreeNodes.length;
        const treeLoadResult = awTableService.buildTreeLoadResult( treeLoadInput, childTreeNodes, false, true, endReached, null );

        if( nodeToExpand === topNodeUid && !parentNode.isExpanded ) {
            topNode.isExpanded = true;
        }

        return {
            treeLoadResult: treeLoadResult
        };
    } );
}

/**
 * loadTreeTableData
 *
 * @param {Object} treeLoadInput treeLoadInput object
 * @param {String} topNodeUid : trees top node Uid
 * @param { Boolean } isTopNode: if topNodeUid is a top node
 * @param {Object} rootLoadInputData - the table data provider
 * @param {Object} childLoadInputData - the table data provider
 * @param {Object} dataProvider - the table data provider
 * @param {int} treeNavigationColumnIndex - the expandable column index
 *
 * @return {ObjectArray} treeLoadResult - treeLoadResult
 */
export function loadTreeTableData( treeLoadInput, topNodeUid, isTopNode, rootLoadInputData, childLoadInputData, dataProvider, treeNavigationColumnIndex = 0,
    isLeafProperty = epBvrConstants.MBC_HAS_SUB_ELEMENTS ) {
    const parentNode = treeLoadInput.parentNode;
    const nodeToExpand = parentNode.uid;
    const isRootNode = nodeToExpand === topNodeUid;

    treeLoadInput.parentNode.cursorObject = {
        startReached: true,
        endReached: true
    };

    dataProvider.columnConfig.columns[ treeNavigationColumnIndex ].isTreeNavigation = true;

    const inputDataObject = isRootNode ? rootLoadInputData : childLoadInputData;
    const { loadType, propertiesToLoad = [ 'Mfg0sub_elements' ], targetUid, additionalLoadParams, loadedObjectMapKey } = inputDataObject;

    return loadDataFromLoadedResponse( nodeToExpand, loadType, propertiesToLoad, targetUid, additionalLoadParams, loadedObjectMapKey ).then( function( result ) {
        const childTreeNodes = _.map( result.rowsObjects, ( rowObject, childNdx ) => {
            const vmo = vMOService.createViewModelObject( rowObject );
            setIsOpaqueProperty( vmo, false );
            return mfeTableService.getTreeNodeObject( vmo, parentNode, mfeTableService.isLeaf( rowObject, isLeafProperty ), childNdx );
        } );

        const endReached = treeLoadInput.startChildNdx + treeLoadInput.pageSize > childTreeNodes.length;
        const treeLoadResult = awTableService.buildTreeLoadResult( treeLoadInput, childTreeNodes, false, true, endReached, null );

        if( isTopNode && nodeToExpand === topNodeUid && !parentNode.isExpanded ) {
            const vmo = vMOService.createViewModelObject( topNodeUid );
            const topNode = mfeTableService.getTreeNodeObject( vmo, parentNode, false, 0 );
            topNode.isExpanded = true;
            topNode.children = childTreeNodes;
            treeLoadResult.rootPathNodes = [ parentNode, topNode ];
        }

        return {
            treeLoadResult: treeLoadResult
        };
    } );
}

/**
 * Get the tab context
 *
 * @param {Object} tabData - the selected tab data
 * @returns {Object} context
 */
export function getTabContext( tabData ) {
    return tabData;
}

/**
 * Merge generic custom columns with the custom columns from the subPanelContext
 *
 * @param {ObjectArray} subPanelContextCustomColumns - custom columns which are defined in specific subPanelContext view
 * @param {ObjectArray} genericCustomColumns - the view generic custom columns
 */
export function getCustomColumns( subPanelContextCustomColumns, genericCustomColumns ) {
    if( subPanelContextCustomColumns && subPanelContextCustomColumns.length > 0 ) {
        return subPanelContextCustomColumns.concat( genericCustomColumns );

    }
    return genericCustomColumns;
}

/**
 * Remove or Add Objects
 *
 * @param {String} actionType - Remove or Add
 * @param {Object} inputObj - the object to remove its related objects or add new objects to
 * @param {ObjectArray} selectedObjects - the objects to remove or add
 * @param {String} entryName - the save input entry name
 * @param {String} relationType - the relation type name
 */
export function removeOrAddObjects( actionType, inputObj, selectedObjects, entryName, relationType ) {
    const objectsToRemoveOrAdd = _.map( selectedObjects, ( obj ) => obj.uid );
    const saveInputWriter = saveInputWriterService.get();
    saveInputWriter.addRemoveOrAddObjects( actionType, inputObj.uid, objectsToRemoveOrAdd, entryName, relationType );

    const relatedObject = [...selectedObjects, inputObj];

    epSaveService.saveChanges( saveInputWriter, true, relatedObject );
}

/**
 * Handle the events which were returned from the save soa server call
 *
 * @param {Object} saveEvents - the save events as json object
 * @param {String} relationNames - the relation type names
 * @param {Object} dataProvider - the table data provide
 * @param { String } inputObjectUid - selected tab scopeObject Uid
 * @param { Boolean } selectAddedObjects - flag indicating if the added oobjects be selected
 */
export function handleAddRemoveSaveEvents( saveEvents, relationNames, dataProvider, inputObjectUid, selectAddedObjects = true ) {
    if( !Array.isArray( relationNames ) ) {
        relationNames = [ relationNames ];
    }
    relationNames.forEach( ( relationName ) => {
        const relevantEvents = saveEvents[ relationName ];
        if( relevantEvents ) {
            // confirm tab scope object and save event object is same, or else no need to update tab content
            if( relevantEvents.eventObjectUid === inputObjectUid ) {
                const relatedEvents = relevantEvents.relatedEvents;
                const objUidToDeleteList = relatedEvents[ epSaveConstants.DELETE ];
                const objUidToRemoveList = relatedEvents[ epSaveConstants.REMOVED_FROM_RELATION ];
                const objUidToAddList = relatedEvents[ epSaveConstants.ADDED_TO_RELATION ];
                if( objUidToRemoveList && objUidToRemoveList.length > 0 ) {
                    mfeTableService.removeFromDataProvider( objUidToRemoveList, dataProvider );
                }
                if( objUidToDeleteList && objUidToDeleteList.length > 0 ) {
                    mfeTableService.removeFromDataProvider( objUidToDeleteList, dataProvider );
                }
                if( objUidToAddList && objUidToAddList.length > 0 ) {
                    mfeTableService.addToDataProvider( objUidToAddList, dataProvider );
                    if( selectAddedObjects ) {
                        const addedModelObjs = objUidToAddList.map( objUid => cdm.getObject( objUid ) );
                        mfeSyncUtils.setSelection( dataProvider, addedModelObjs );
                    }
                }
            }
        }
    });
 }
/**
 * This function checks whether top node is loaded or not,if loaded,createCellRenderers function is not called
 * @param {object} data - ViewModel data
 * @param {object} columns - column configuration
 */
export function renderCutIndication(data, columns ){
    columns.forEach( ( column ) => {
        if( !column.cellRenderers ) {
            column.cellRenderers = [];
        }
        column.cellRenderers.push( mfeTableService.getRowRenderer( 'aw-widgets-partialVisibility', 'opaqueRowRenderer', isOpaque ) );
    } );
}

/**
 * @param {object} column - column configuration
 * @param {object} rowVMO - row vmo
 * @return {Boolean} isOpaque - returns true if the partial visibility for row vmo is set
 */
function isOpaque( column, rowVMO ) {
    return rowVMO.props.isOpaque ? rowVMO.props.isOpaque.dbValues === true : false;
}

/**
 * Create view model property 'isOpaque' for tree node
 * @param {object} vmo - vmo
 * @param {object} propertyValue - property value for isOpaque
 */
export function setIsOpaqueProperty( vmo, propertyValue ) {
    const isOpaqueProperty = {
        value: propertyValue,
        displayValue: '',
        propType: 'BOOLEAN',
        isArray: false,
        displayName: 'isOpaque'
    };
    vmo.props.isOpaque = vMOService.constructViewModelProperty( isOpaqueProperty, 'isOpaque', vmo, false );
}

/**
 * This function checks whether top node is loaded or not,if loaded,createCellRenderers function is not called
 * @param {object} data - ViewModel data
 * @param {object} columns - column configuration
 * @param {String} topNodeUid- Uid of top node
 */
export function highlightScopedNode( data, columns, topNodeUid ) {
    const isTopNodeLoaded = data.treeLoadResult.childNodes[0].uid === topNodeUid;
    if( data.treeLoadResult.parentNode.uid !== topNodeUid && !isTopNodeLoaded ) {
        createCellRenderers( columns );
    }

}
function createCellRenderers( columns ) {
    columns.forEach( ( column ) => {
        if( !column.cellRenderers ) {
            column.cellRenderers = [];
        }
        column.cellRenderers.push( mfeTableSvc.getRowRenderer( className, rendererName, checkScopesToHighlight ) );
    } );
}

function checkScopesToHighlight( column, rowVMO ) {
    return rowVMO.levelNdx === 0;
}

/**
 * Add child nodes
 *
 * @param {Object} dataProvider - the table data provider
 * @param {Object} parentObject - parent object
 * @param {Array} childObjectsToAdd - child objects to add
 * @param {String} isLeafProperty - property type
 * @param {Object} viewModelData - the viewModel data
 * @param {Object} objectToAddAfter - object to add after
 */
export function addChildNodes( dataProvider, parentObject, childObjectsToAdd, isLeafProperty = epBvrConstants.MBC_HAS_SUB_ELEMENTS, viewModelData, objectToAddAfter ) {
    const parentTreeNode = getTreeNode( dataProvider, parentObject );
    const childNodeToAddAfter = objectToAddAfter ? getTreeNode( dataProvider, objectToAddAfter ) : undefined;
    if( parentTreeNode.isExpanded || mfeTableService.isLeaf( parentTreeNode, isLeafProperty ) ) {
        mfeTableService.appendChildNodes( parentTreeNode, childObjectsToAdd, dataProvider, mfeTableService.isLeaf, isLeafProperty, childNodeToAddAfter );
        parentTreeNode.isExpanded = true;
        parentTreeNode.isLeaf = false;
        mfeSyncUtils.setSelection( dataProvider, childObjectsToAdd );
    } else{
        mfeTableService.expandTreeNode( dataProvider, parentTreeNode, viewModelData ).then(
            () => {
                mfeSyncUtils.setSelection( dataProvider, childObjectsToAdd );
            }
        );
    }
}

/**
 * Remove child nodes
 *
 * @param {Object} dataProvider - the table data provider
 * @param {Object} parentObject - parent object
 * @param {Array} childObjectsToRemove - child objects to remove
 */
export function removeChildNodes( dataProvider, parentObject, childObjectsToRemove ) {
    const parentTreeNode = getTreeNode( dataProvider, parentObject );
    mfeTableService.removeSelection( dataProvider, childObjectsToRemove );
    mfeTableService.removeChildNodes( parentTreeNode, childObjectsToRemove, dataProvider );
}

/**
 * get Tree Node from dataProvider
 *
 * @param {Object} dataProvider - the save events as json object
 * @param {Object} modelObject - event Type
 */
function getTreeNode( dataProvider, modelObject ) {
    return modelObject && _.find( dataProvider.viewModelCollection.getLoadedViewModelObjects(), ( loadedVmo ) => loadedVmo.uid === modelObject.uid );
}

/**
 * set selection in tree
 * if objectsToSelect isn't loaded, load hierarchy till objectsToSelect.
 *
 * @param {Object} dataProvider data provider
 * @param {Array} objectsToSelect objects to select
 * @param {String} propertyToSort property to sort objects
 */
export function setSelection(dataProvider, objectsToSelect, propertyToSort){
    const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    objectsToSelect = !Array.isArray( objectsToSelect ) ? [ objectsToSelect ] : objectsToSelect;
    if( objectsToSelect.length === 1 && loadedObjects.length !==0 ) {
        const vmoToSelect = mfeSyncUtils.setSelection(dataProvider, objectsToSelect);
        vmoToSelect && vmoToSelect.length === 0 && loadHierarchy(dataProvider, objectsToSelect[0], propertyToSort);
    }
}


/**
 * loads the hierarchy till objectToSelect and expand
 *
 * @param {Object} dataProvider data provider
 * @param {Object} objectToSelect object to select
 */
function loadHierarchy(dataProvider, objectToSelect, propertyToSort){
    const policyId = registerLoadHierarchyPolicy();
    const loadTypeInput = epLoadInputHelper.getLoadTypeInputs( [ epLoadConstants.GET_HIERARCHY], objectToSelect.uid);
    epLoadService.loadObject( loadTypeInput, false ).then( ( response ) => {
        policyId && policySvc.unregister( policyId );
        const parentChildObjectsMap = getParentChildObjectsMap(dataProvider, response.loadedObjects);
        const parentUids = getParentUids(objectToSelect, epBvrConstants.BL_PARENT);
        expandNodes(dataProvider, objectToSelect, parentChildObjectsMap, parentUids, propertyToSort);
    } );
}

/**
 * Register the policy
 *
 * @return {Object}  null
 */
function registerLoadHierarchyPolicy() {
    const loadHierarchyPolicy = {
        types: [ {
            name: epBvrConstants.MFG_BVR_OPERATION,
            properties: [ {
                name: epBvrConstants.BL_PARENT
            } ]
        },
        {
            name: epBvrConstants.MFG_BVR_PROCESS,
            properties: [ {
                name: epBvrConstants.BL_PARENT
            }]
        }
     ]
    };
    return policySvc.register( loadHierarchyPolicy );
}

/**
 * creates parent to child objects map
 *
 * @param {Object} dataProvider data provider
 * @param {Array} hierarchyObjects objects in hierarchy
 * @return {Array} parent to child objects map
 */
function getParentChildObjectsMap(dataProvider, hierarchyObjects){
    let parentChildObjectsMap = {};
    const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;

    hierarchyObjects.forEach( hierarchyObject => {
        const index = loadedObjects.findIndex( loadedObj => loadedObj.uid === hierarchyObject.uid );
        if( index === -1 ) {
            const parentUid = hierarchyObject.props.bl_parent && hierarchyObject.props.bl_parent.dbValues[0];
            parentChildObjectsMap[parentUid] ? parentChildObjectsMap[parentUid].push(hierarchyObject) : parentChildObjectsMap[parentUid] = [hierarchyObject];
        }
    } );
    return parentChildObjectsMap;
}

/**
 * @param {object} objectToSelect : object to select
 * @param {String} parentProperty property of parent
 * @return {Array} parent objects Uids of selected object in the hierarchy
 */
function getParentUids( objectToSelect, parentProperty ) {
    const parentHierarchy = [];
    let currentObj = objectToSelect;
    let  parentUid = currentObj.props[parentProperty] && currentObj.props[parentProperty].dbValues[0];
    while( parentUid ) {
        parentHierarchy.push( parentUid );
        currentObj = cdm.getObject( parentUid );
        parentUid = currentObj.props[parentProperty] && currentObj.props[parentProperty].dbValues[0];
    }
    return parentHierarchy;
}

/**
 * Expands parent nodes of selected object
 *
 * @param {Object} dataProvider data provider
 * @param {Object} objectToSelect object to select
 * @param {Map} parentChildObjectsMap Map of parent uid to child objects
 * @param {Array} parentUids - parent objects Uids of selected object
 */
function expandNodes(dataProvider, objectToSelect, parentChildObjectsMap, parentUids, propertyToSort){
    const loadedObjects = dataProvider.viewModelCollection.loadedVMObjects;
    for( let i = parentUids.length - 1; i >= 0; i-- ) {
        const parentTreeNode = loadedObjects.find( loadedObj => loadedObj.uid === parentUids[ i ] );
        if( parentTreeNode && !parentTreeNode.isExpanded) {
            parentTreeNode.isExpanded = true;
            const childObjects = parentChildObjectsMap[parentTreeNode.uid];
            propertyToSort && childObjects.sort((obj1, obj2) => (obj1.props[propertyToSort].dbValues[0] > obj2.props[propertyToSort].dbValues[0]) ? 1 : -1);
            mfeTableService.appendChildNodes( parentTreeNode, childObjects, dataProvider, mfeTableService.isLeaf, epBvrConstants.MBC_HAS_SUB_ELEMENTS );
        }
    }
    dataProvider.selectionModel.setSelection( objectToSelect );
}

let exports;
export default exports = {
    buildSelectionModel,
    loadColumnsData,
    loadDataFromLoadedResponse,
    initializeLoadDataForTree,
    loadTreeTableData,
    getTabContext,
    getCustomColumns,
    removeOrAddObjects,
    handleAddRemoveSaveEvents,
    renderCutIndication,
    setIsOpaqueProperty,
    highlightScopedNode,
    addChildNodes,
    removeChildNodes,
    setSelection
};


