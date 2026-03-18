// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import awIconService from 'js/awIconService';
import awTableService from 'js/awTableService';
import vMOService from 'js/viewModelObjectService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import eventBus from 'js/eventBus';
import app from 'app';
import preferenceService from 'soa/preferenceService';

/**
 * Service for mfe table views
 *
 * @module js/mfeTableService
 */
'use strict';

/**
 * Build table columns and the columns property policy from the passed in object properties
 *
 * @param {String} preferenceName - the preference name which contains the list of object properties to display as a column in the table
 * @param {Object} dataProvider - the table data provider
 * @param {object} columnProvider - the table column provider
 * @param {Object} additionalPolicyObjects - additional objects to add to policy
 * @return {promise<null>} returns a promise which is resolved once we finished to create the columns
 */
export function createColumns( preferenceName, dataProvider, columnProvider = {}, additionalPolicyObjects = {} ) {
    if( typeof preferenceName !== 'string' || preferenceName === '' || !dataProvider ) {
        return new Promise( ( resolve, reject ) => {
            reject( null );
        } );
    }

    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/MfeMessages' );
    const {
        enableFiltering = false, enableColumnResizing = true, enablePinning = false,
            enableSorting = false, enableCellEdit = false, columnDefaultWidth = 100
    } = columnProvider;

    const propPolicy = {};
    propPolicy.types = additionalPolicyObjects && additionalPolicyObjects.types ? additionalPolicyObjects.types : [];

    const tableColumns = _.flatMap( columnProvider.clientColumns, ( column ) => {
        if( column.clientColumn ) { return createColumnInfo( column ); }
    } );

    return preferenceService.getStringValues( preferenceName ).then( ( preferenceValues ) => {
        if( Array.isArray( preferenceValues ) && preferenceValues.length > 0 ) {
            preferenceValues.forEach( ( column ) => {
                let [ objType, objPropertyName, columnWidth ] = column.split( '.' );
                columnWidth = isNaN( columnWidth ) || columnWidth === '' ? objPropertyName === 'object_string' ? 200 : columnDefaultWidth : parseInt( columnWidth );

                //if column not defined well, we don't add it
                if( !objType || !objPropertyName ) {
                    return;
                }

                const policyEntry = _.find( propPolicy.types, ( { name } ) => name === objType );
                if( policyEntry ) {
                    policyEntry.properties.push( { name: objPropertyName } );
                } else {
                    propPolicy.types.push( {
                        name: objType,
                        properties: [ { name: objPropertyName } ]
                    } );
                }

                tableColumns.push( awColumnSvc.createColumnInfo( {
                    name: objPropertyName,
                    propertyName: objPropertyName,
                    typeName: objType,
                    minWidth: 25,
                    width: columnWidth,
                    enableFiltering,
                    enableColumnResizing,
                    enablePinning,
                    enableSorting,
                    enableCellEdit
                } ) );
            } );

            dataProvider.columnConfig = {
                columns: tableColumns
            };
            dataProvider.policy = propPolicy;
        } else {
            const noPrefValueError = resource.noPreferenceValueError;
            messagingService.showError( noPrefValueError.format( preferenceName ) );
        }
    } );
}

/**
 *
 * @param {String} className name of the class which you want to add on the row object
 * @param {String} name renderer name
 * @param {function} condition the condition function which decides if style should be applied to a row or not
 * @param {function} action responsible for adding style on each cell(pass you own action if you want to override default action)
 * @return {object} the row renderer object
 */
export function getRowRenderer( className, name, condition, action ) {
    return {
        action: action ? action : function( column, vmo, tableElem, rowElem ) {
            rowElem.classList.add( className );
        },
        condition,
        name
    };
}
/**
 * getTreeNodeObject
 *
 * @param {Object} nodeObject - model object or view model object
 * @param {Object} parentNode - the parent node
 * @param {boolean} isLeaf - check if node has further children
 * @param {int} childNdx - child index
 *
 * @return {Object} vmNode - tree node object
 */
export function getTreeNodeObject( nodeObject, parentNode, isLeaf, childNdx ) {
    if( !vMOService.isViewModelObject( nodeObject ) ) {
        nodeObject = vMOService.createViewModelObject( nodeObject );
    }

    const type = nodeObject.type;

    let iconURL = awIconService.getThumbnailFileUrl( nodeObject );
    if( iconURL === '' ) {
        iconURL = awIconService.getTypeIconURL( type );
    }

    const nodeName = nodeObject.props.object_string.uiValues[ 0 ];
    const nodeId = nodeObject.uid;
    const levelNdx = parentNode.levelNdx + 1;
    const vmNode = awTableService.createViewModelTreeNode( nodeId, type, nodeName, levelNdx, childNdx, iconURL );
    vmNode.modelType = nodeObject.modelType;
    vmNode.isLeaf = isLeaf;
    if( !vmNode.props ) {
        vmNode.props = nodeObject.props;
    }
    return vmNode;
}

/**
 * Check if a tree node is a leaf or it has children
 *
 * @param {Object} object - the object we want to check if is leaf
 * @param {String} leafProp - the boolean property indicating if the object has children/ isLeaf
 *
 * @return {Boolean} if object is leaf
 */
export function isLeaf( object, leafProp ) {
    return object.props[ leafProp ] ? object.props[ leafProp ].dbValues[ 0 ] === '0' : true;
}

/**
 * Create column info
 *
 * @param {Object} column - the column data
 *
 * @return {AwTableColumnInfo} Newly created AwTableColumnInfo object.
 */
function createColumnInfo( column = {} ) {
    const {
        propertyName = '', minWidth = 30, width = 30,
        enableColumnMenu = false, enableSorting = false, enableColumnMoving = false, enableColumnHiding = false,
        enableFiltering = false, enableColumnResizing = true, enablePinning = false, enableCellEdit = false
    } = column;
    return awColumnSvc.createColumnInfo( {
        name: column.name,
        propertyDisplayName: column.propertyDisplayName,
        propertyName,
        minWidth,
        width,
        enableColumnMenu,
        enableSorting,
        enableColumnMoving,
        enableColumnHiding,
        enableFiltering,
        enableColumnResizing,
        enablePinning,
        enableCellEdit
    } );
}

/**
 * Save the resized columns width
 *
 * @param {String} preferenceName - the preference name which contains the list of object properties to display as a column in the table with each column width
 * @param {Object} columns - the table columns with their width
 */
export function saveResizedColumnsWidth( preferenceName, columns ) {
    preferenceService.getStringValues( preferenceName ).then( ( preferenceValues ) => {
        if( Array.isArray( preferenceValues ) && preferenceValues.length > 0 ) {
            const concatPrefValue = preferenceValues.join( '.' );
            const newPrefValue = [];
            columns.forEach( ( column ) => {
                //if column exists in prefernce, then we add it to the new preference value
                //to avoid adding client columns which aren't mentioned in the preference
                if( concatPrefValue.indexOf( `${column.typeName}.${column.propertyName}` ) > -1 ) {
                    newPrefValue.push( [ column.typeName, column.propertyName, column.drawnWidth ].join( '.' ) );
                }
            } );
            preferenceService.setStringValue( preferenceName, newPrefValue );
        }
    } );
}

/**
 * Expands the given tree node
 *
 * @param {Object} dataProvider - the data provider object
 * @param {ViewModelTreeNode} vmoTreeNode - the view model tree node object
 * @param {Object} viewModelData - the viewmodel data
 * @return {Promise} a promise object
 */
export function expandTreeNode( dataProvider, vmoTreeNode, viewModelData ) {
    vmoTreeNode.isExpanded = true;
    return expandOrCollapseTreeNode( dataProvider, vmoTreeNode, viewModelData, true );
}

/**
 * Collapses the given tree node
 *
 * @param {Object} dataProvider - the data provider object
 * @param {ViewModelTreeNode} vmoTreeNode - the view model tree node object
 * @param {Object} viewModelData - the viewmodel data
 * @return {Promise} a promise object
 */
export function collapseTreeNode( dataProvider, vmoTreeNode, viewModelData ) {
    vmoTreeNode.isExpanded = false;
    return expandOrCollapseTreeNode( dataProvider, vmoTreeNode, viewModelData, false );
}

/**
 * Collapses the given tree node
 *
 * @param {Object} dataProvider - the data provider object
 * @param {ViewModelTreeNode} vmoTreeNode - the view model tree node object
 * @param {Object} viewModelData - the viewmodel data
 * @param {boolean} expand - true if we need to expand the given tree node
 * @return {Promise} a promise object
 */
function expandOrCollapseTreeNode( dataProvider, vmoTreeNode, viewModelData, expand ) {
    const dataObj = {
        data: viewModelData,
        ctx: appCtxSvc.ctx
    };
    return expand ? dataProvider.expandObject( dataObj, vmoTreeNode ) : dataProvider.collapseObject( dataObj, vmoTreeNode );
}

/**
 * Refreshes the table
 * @param {String} tableId - the table id
 */
export function refreshTable( tableId ) {
    eventBus.publish( `${tableId}.plTable.clientRefresh` );
}

/**
 * Reloads the table
 * @param {String} tableId - the table id
 */
export function reloadTable( tableId ) {
    eventBus.publish( `${tableId}.plTable.reload` );
}

/**
 * This methods added VMOs to dataProvider.viewModelCollection.loadedVMObjects
 * This can be used only in case you flat tree, a tree without expand. As method doesn't creates treeNode.
 *
 * @param { Object } objUidToAddList - Array of objects UID we want to Add to data - provider
 * @param { Object } dataProvider - data provider which need to be updated
 */
export function addToDataProvider( objUidToAddList, dataProvider ) {
    const viewModelCollection = dataProvider.getViewModelCollection();
    const loadedVMObjects = viewModelCollection.loadedVMObjects;

    _.forEach( objUidToAddList, function( objectUid ) {
        loadedVMObjects.push( vMOService.createViewModelObject( objectUid ) );
    } );

    dataProvider.viewModelCollection.setTotalObjectsFound( loadedVMObjects.length );
    dataProvider.noResults = loadedVMObjects.length === 0;
}

/**
 * This methods removes VMOs from dataProvider.viewModelCollection.loadedVMObjects
 *
 * @param {String[]} uidsToRemove - Array of objects UID we want to remove from data-provider
 * @param {Object} dataProvider - data provider which need to be updated
 */
export function removeFromDataProvider( uidsToRemove, dataProvider ) {
    const viewModelCollection = dataProvider.getViewModelCollection();
    const loadedVMObjects = viewModelCollection.getLoadedViewModelObjects();
    const objToRemoveList = loadedVMObjects.filter( obj => uidsToRemove.indexOf( obj.uid ) > -1 );

    if( objToRemoveList && objToRemoveList.length > 0 ) {
        viewModelCollection.removeLoadedObjects( objToRemoveList );
        dataProvider.viewModelCollection.setTotalObjectsFound( loadedVMObjects.length );
        dataProvider.noResults = loadedVMObjects.length === 0;
    }
}

/**
 * This method appends child tree nodes to a given parent tree node
 * @param {TreeViewModelObject} parentTreeNode - the parent tree node we want to append children to
 * @param {modelObject[]} childObjects - the child objects we want to append
 * @param {object} dataProvider - the data provider object
 * @param {Function} isLeafFunc - the function to calculate if a node is a leaf or not
 * @param {string} isLeafProperty - a given property name
 * @param {TreeViewModelObject} childNodeToAddAfter - a given child node to add after
 */
export function appendChildNodes( parentTreeNode, childObjects, dataProvider, isLeafFunc, isLeafProperty, childNodeToAddAfter ) {
    if( !parentTreeNode.children ) {
        parentTreeNode.children = [];
    }
    parentTreeNode.isLeaf = false;
    const childIndex = childNodeToAddAfter ? childNodeToAddAfter.childNdx + 1 : parentTreeNode.children.length;
    let childNdx = childIndex;
    const childTreeNodes = childObjects.map( ( childModelObj ) => {
        return getTreeNodeObject( childModelObj, parentTreeNode, isLeafFunc( childModelObj, isLeafProperty ), childNdx++ );
    } );
    const loadedVmos = dataProvider.getViewModelCollection().getLoadedViewModelObjects();
    let refIndex = childNodeToAddAfter ? loadedVmos.indexOf( childNodeToAddAfter ) : loadedVmos.indexOf( parentTreeNode );
    const descendantTreeNodes = getAllDescendantTreeNodes( childNodeToAddAfter ? childNodeToAddAfter : parentTreeNode );
    descendantTreeNodes.forEach( descendant => {
        let index = loadedVmos.indexOf( descendant );
        if( index > refIndex ) {
            refIndex = index;
        }
    } );
    loadedVmos.splice( refIndex + 1, 0, ...childTreeNodes );
    parentTreeNode.children.splice( childIndex, 0, ...childTreeNodes );
    if( childNodeToAddAfter ) {
        updateChildIndexes( parentTreeNode );
    }
}

/**
 * This methods removes VMOs from dataProvider.viewModelCollection.loadedVMObjects
 *
 * @param {TreeViewModelObject} parentTreeNode - the parent tree node we want to append children to
 * @param { Object } childObjectsToRemove - Array of objects UID we want to remove from data-provider
 * @param { Object } dataProvider - data provider which need to be updated
 */
export function removeChildNodes( parentTreeNode, childObjectsToRemove, dataProvider ) {
    if( parentTreeNode.children ) {
        const viewModelCollection = dataProvider.getViewModelCollection();
        const loadedVMObjects = viewModelCollection.getLoadedViewModelObjects();
        const objectUidToRemoveList = childObjectsToRemove.map( object => object.uid );
        const childNodesToRemove = loadedVMObjects.filter( object => objectUidToRemoveList.indexOf( object.uid ) > -1 );
        if( childNodesToRemove.length > 0 ) {
            let nodesToRemove = [];
            childNodesToRemove.forEach( node => nodesToRemove.push( node, ...getAllDescendantTreeNodes( node ) ) );
            viewModelCollection.removeLoadedObjects( nodesToRemove );
            dataProvider.viewModelCollection.setTotalObjectsFound( loadedVMObjects.length );
            childNodesToRemove.forEach( childNode => {
                parentTreeNode.children.splice( parentTreeNode.children.indexOf( childNode ), 1 );
            } );
            parentTreeNode.isLeaf = Boolean( parentTreeNode.children.length === 0 );
        }
    }
}

/**
 * Returns all of the decendant tree nodes
 * @param {ViewModelTreeNode} treeNode - a given tree node object
 * @return {ViewModelTreeNode[]} array of tree node objects
 */
export function getAllDescendantTreeNodes( treeNode ) {
    const descendants = [];
    if( !treeNode.isLeaf && treeNode.children && treeNode.children.length > 0 ) {
        treeNode.children.forEach( ( childTreeNode ) => {
            descendants.push( ...getAllDescendantTreeNodes( childTreeNode ) );
        } );
        descendants.push( ...treeNode.children );
    }
    return descendants;
}

/**
 * Update child indexes after adding child node

 * @param {ViewModelTreeNode} parentTreeNode - a given tree node object
 */
function updateChildIndexes( parentTreeNode ) {
    parentTreeNode.children.forEach( ( childNode, index ) => childNode.childNdx = index );
}

/**
 * Set the "toDeSelectObjects" to the given data provider
 *
 * @param {Object} dataProvider the data provider object
 * @param {Array} objectsToDeSelect objects to select
 */
export function removeSelection( dataProvider, objectsToDeSelect ) {
    if( !Array.isArray( objectsToDeSelect ) ) {
        objectsToDeSelect = [ objectsToDeSelect ];
    }
    const loadedObjects = dataProvider.getViewModelCollection().getLoadedViewModelObjects();
    const uidList = objectsToDeSelect.map( object => object.uid );

    const loadedObjectToToDeSelect = loadedObjects.filter( loadedObj => uidList.indexOf( loadedObj.uid ) > -1 );
    dataProvider.selectionModel.removeFromSelection( loadedObjectToToDeSelect );
}

/**
 *
 * @param {string} childUid - a given child uid
 * @param {object} dataProvider - a given data provider object
 * @return {TreeNodeViewModelObject} - the parent tree node of the given child uid. If it doesn't have a parent, then returns undefined.
 */
export function getParentNode( childUid, dataProvider ) {
    if( childUid && dataProvider ) {
        const loadedObjects = dataProvider.getViewModelCollection().getLoadedViewModelObjects();
        const childNodeIndex = _.findIndex( loadedObjects, ( obj ) => obj.uid === childUid );
        if( childNodeIndex > -1 ) {
            const childTreeLevel = loadedObjects[ childNodeIndex ].$$treeLevel;
            if( childTreeLevel > 0 ) {
                for( let i = childNodeIndex - 1; i >= 0; i-- ) {
                    if( loadedObjects[ i ].$$treeLevel === childTreeLevel - 1 ) {
                        return loadedObjects[ i ];
                    }
                }
            }
        }
    }
}

/**
 * This method clears the expansion state of the given tree nodes.
 * This is relevant only if the table uses the "cache collapse" mechanisim
 * @param {TreeNodeViewModelObject[]} treeNodes -  a set of given tree nodes
 */
export function clearCollapseCache( treeNodes ) {
    treeNodes.forEach( ( node ) => {
        delete node.__expandState;
    } );
}

/**
 *
 * @param {object} dataProvider - the dataProvider object
 */
export function unselectInvisibleNodes( dataProvider ) {
    const selected = dataProvider.selectionModel.getSelection();
    if( selected.length > 0 ) {
        const loadedObjects = dataProvider.getViewModelCollection().getLoadedViewModelObjects();
        const removeFromSelection = selected.filter( ( selectedObj ) => {
            return _.findIndex( loadedObjects, ( obj ) => obj.uid === selectedObj.uid ) === -1;
        } );
        if( removeFromSelection.length > 0 ) {
            dataProvider.selectionModel.removeFromSelection( removeFromSelection );
        }
    }
}

let exports;
export default exports = {
    createColumns,
    getTreeNodeObject,
    isLeaf,
    saveResizedColumnsWidth,
    expandTreeNode,
    collapseTreeNode,
    refreshTable,
    reloadTable,
    getRowRenderer,
    addToDataProvider,
    removeFromDataProvider,
    appendChildNodes,
    getAllDescendantTreeNodes,
    removeChildNodes,
    removeSelection,
    getParentNode,
    clearCollapseCache,
    unselectInvisibleNodes
};
