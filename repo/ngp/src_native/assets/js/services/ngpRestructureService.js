// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpSoaSvc from 'js/services/ngpSoaService';
import ngpModelUtils from 'js/utils/ngpModelUtils';
import mfeTableSvc from 'js/mfeTableService';

import _ from 'lodash';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import vMOService from 'js/viewModelObjectService';

/**
 * NGP Restructure service
 *
 * @module js/services/ngpRestructureService
 */
'use strict';

/**
 * This method restructures the "toBeMoved" objects to be under the new parent
 * @param {TreeNodeVMO[]} treeNodesToBeMoved - modelObjects to be moved
 * @param {modelObject} newParent - the parent modelObject
 */
export function restructure( treeNodesToBeMoved, newParent ) {
    const soaInput = {
        input: []
    };
    const movedObjectWithOldParentArray = [];
    treeNodesToBeMoved.forEach( ( obj ) => {
        movedObjectWithOldParentArray.push( {
            uidToBeMoved: obj.uid,
            oldParentUid: obj.props[ ngpModelUtils.getParentPropertyName( obj ) ].dbValue
        } );
        soaInput.input.push( {
            child: obj,
            newParent
        } );
    } );
    ngpSoaSvc.executeSoa( 'Process-2017-05-RelationManagement', 'restructure', soaInput ).finally(
        () => {
            eventBus.publish( 'ngp.restructureAction', {
                movedObjectWithOldParentArray,
                moveTo: newParent
            } );
        }
    );
}

/**
 * Updates the table after the restructure
 * @param {object[]} movedObjectWithOldParentArray - an array of objects which contain the moved object and the old parent uid
 * @param {modelObject} moveTo - the objects which were moved to
 * @param {object} dataProvider - the dataprovider object
 * @param {object} viewModelData - the data object of the viewModel which called this service
 */
function updateTableAfterRestructure( movedObjectWithOldParentArray, moveTo, dataProvider, viewModelData ) {
    const movedObjectsUids = [];
    movedObjectWithOldParentArray.forEach( ( { uidToBeMoved, oldParentUid } ) => {
        const toBeMoved = cdm.getObject( uidToBeMoved );
        const newParentProp = ngpModelUtils.getParentPropertyName( toBeMoved );
        const newParentUid = toBeMoved.props[ newParentProp ].dbValues[ 0 ];
        //actual restructure occurs if new parent is different from old parent
        if( newParentUid === moveTo.uid && newParentUid !== oldParentUid ) {
            const oldParentTreeNode = _.find( dataProvider.getViewModelCollection().getLoadedViewModelObjects(), ( loadedVmo ) => loadedVmo.uid === oldParentUid );
            if( oldParentTreeNode ) {
                mfeTableSvc.removeChildNodes( oldParentTreeNode, [ toBeMoved ], dataProvider );
            } else {
                mfeTableSvc.removeFromDataProvider( [ toBeMoved.uid ], dataProvider );
            }
            movedObjectsUids.push( toBeMoved.uid );
        }
    } );

    if( movedObjectsUids.length > 0 ) {
        const moveToTreeNode = _.find( dataProvider.getViewModelCollection().getLoadedViewModelObjects(), ( loadedVmo ) => loadedVmo.uid === moveTo.uid );
        if( moveToTreeNode ) {
            updateNodes(moveToTreeNode, movedObjectsUids, dataProvider, viewModelData);
        }
    }
}


/**
 * Updates the table after the restructure
 * @param {modelObject} parentObject -the parent object
 * @param {modelObject[]} childrenCreated - the objects which were created
 * @param {object} dataProvider - the dataprovider object
 * @param {object} viewModelData - the data object of the viewModel which called this service
 * @param {object} rootNodeTree - root table node
 */
export function updateTableAfterObjectCreated( parentObject, childrenCreated, dataProvider, viewModelData,rootNodeTree ) {
    const childrenCreatedUids = childrenCreated.map( ( object ) => object.uid );
    let parentTreeNode = null;
    if (parentObject){
        parentTreeNode = _.find( dataProvider
            .getViewModelCollection()
            .getLoadedViewModelObjects(),
            ( loadedVmo ) => loadedVmo.uid === parentObject.uid );
    }
    if( !parentTreeNode ) {
        parentTreeNode = rootNodeTree;
    }
    updateNodes(parentTreeNode, childrenCreatedUids, dataProvider, viewModelData);
}
/**
 * update tree with node that created/moved in tbale
 *
 * @param {object} parentTreeNode -the parent tree node
 * @param {String[]} modelObjectUids - the objects uid which were created/moved
 * @param {object} dataProvider - the dataprovider object
 * @param {object} viewModelData - the data object of the viewModel which called this service
 */
function updateNodes(parentTreeNode, modelObjectUids, dataProvider, viewModelData)
{
    const modelObjects = modelObjectUids.map( ( uid ) => cdm.getObject( uid ) );
    const isLeafFunc = ( modelObj ) => !ngpModelUtils.hasContentElements( modelObj );
    if( parentTreeNode.isExpanded ) {
         mfeTableSvc.appendChildNodes( parentTreeNode, modelObjects, dataProvider, isLeafFunc );
        selectWithTimeout( dataProvider, modelObjectUids );
    } else {
        parentTreeNode.isLeaf = false;
        mfeTableSvc.expandTreeNode( dataProvider, parentTreeNode, viewModelData ).then( () => {
            selectWithTimeout( dataProvider, modelObjectUids );
        } );
    }
}
/**
 *
 * @param {object} dataProvider - the dataprovider object
 * @param {string[]} uidsToSelect - the uids to select post expand
 */
function selectWithTimeout( dataProvider, uidsToSelect ) {
    setTimeout( () => {
        const loadedVmos = dataProvider.viewModelCollection.getLoadedViewModelObjects();
        const vmosToSelect = loadedVmos.filter( ( vmo ) => uidsToSelect.indexOf( vmo.uid ) > -1 );
        dataProvider.selectionModel.setSelection( vmosToSelect );
    }, 100 );
}

/**
 *
 * @param {string[]} messageArray - the initail message array
 * @param {modelObject[]} moveCandidates - the move candidates array
 */
export function populateMoveCandidatesHereMsgArray( messageArray, moveCandidates ) {
    moveCandidates.forEach( ( candidate ) => {
        messageArray.push( candidate.props.object_string.dbValue );
    } );
}

let exports = {};
export default exports = {
    restructure,
    populateMoveCandidatesHereMsgArray,
    updateTableAfterRestructure,
    updateTableAfterObjectCreated
};


