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
 * @module js/occmgmtTreeLoadResultBuilder
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import awTableSvc from 'js/awTableService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import occmgmtUtils from 'js/occmgmtUtils';
import occurrenceManagementStateHandler from 'js/occurrenceManagementStateHandler';
import occmgmtVMTNodeCreateService from 'js/occmgmtViewModelTreeNodeCreateService';
import occmgmtGetOccsResponseService from 'js/occmgmtGetOccsResponseService';
import occmgmtTreeTableStateService from 'js/occmgmtTreeTableStateService';
import aceStaleRowMarkerService from 'js/aceStaleRowMarkerService';
import aceExpandBelowService from 'js/aceExpandBelowService';
import _ from 'lodash';
import 'js/eventBus';
import 'js/logger';
import editHandlerService from 'js/editHandlerService';

import 'js/occmgmtIconService';

/**
 *
 */
var _mapCtxToLoadResult = {
    productContextInfo: 'pciModelObject',
    openedElement: 'openedModelObject',
    topElement: 'topModelObject',
    sublocationAttributes: 'sublocationAttributes',
    searchFilterCategories: 'filter.searchFilterCategories',
    searchFilterMap: 'filter.searchFilterMap',
    requestPref: 'requestPref',
    configContext: 'configContext'
};

/**
 * @param {TreeLoadResult} treeLoadResult - TreeLoadResult response structure.
 * @param {Object} contextState : Context State
 */
function _updateTreeLoadResultWithDefaultBaseModelObjectIfNeeded( treeLoadResult, contextState ) {
    if( !treeLoadResult.baseModelObject ) {
        if( contextState.context.modelObject ) {
            treeLoadResult.baseModelObject = contextState.context.modelObject;
        }
    }
}

/**
 * @param {Object} contextState : Context State
 * @param {TreeLoadResult} treeLoadResult - TreeLoadResult response structure.
 */
function _updateTreeLoadResultWithDefaultTopModelObjectIfNeeded( contextState, treeLoadResult ) {
    if( !treeLoadResult.topModelObject ) {
        if( contextState.context.topElement ) {
            treeLoadResult.topModelObject = contextState.context.topElement;
        } else if( contextState.context.currentState && contextState.context.currentState.t_uid ) {
            treeLoadResult.topModelObject = cdmSvc.getObject( contextState.context.currentState.t_uid );
        }

        if( !_.isUndefined( treeLoadResult.topModelObject.props ) ) {
            treeLoadResult.parentNode.props = _.clone( treeLoadResult.topModelObject.props );
        }
    }
}

/**
 * Return Level Index of VM node based on its position in Parent Children Map and CDM cache.
 */

var getVMNodeLevelIndex = function( treeLoadOutput, parentChildrenInfos, node ) {
    /*
    *startLevelNdx -1 makes sure that first level is shown at 0th levelNdx. But in case of topNode display,
     topNode gets added at 0th level. So, startLevelNdx should be 0 in that case.
    */
    var startLevelNdx = treeLoadOutput.showTopNode ? 0 : -1;
    if( node ) {
        var parentNode = node;
        while( parentNode ) {
            parentNode = getParentVMNodeInfo( parentChildrenInfos, parentNode );
            if( parentNode ) {
                node = parentNode;
                startLevelNdx++;
            }
        }

        while( node.uid || node.occurrenceId ) {
            node = {
                uid: occmgmtUtils.getParentUid( cdmSvc.getObject( node.uid ? node.uid : node.occurrenceId ) ),
                occurrenceId: occmgmtUtils.getParentUid( cdmSvc.getObject( node.uid ? node.uid :
                    node.occurrenceId ) )
            };
            if( node.uid || node.occurrenceId ) {
                startLevelNdx++;
            }
        }
    }

    return startLevelNdx;
};

var getParentVMNodeInfo = function( parentChildrenInfos, node ) {
    var parentInfo = null;

    for( var parentChildIdx = 0; parentChildIdx < parentChildrenInfos.length; parentChildIdx++ ) {
        for( var childrenIdx = 0; childrenIdx < parentChildrenInfos[ parentChildIdx ].childrenInfo.length; childrenIdx++ ) {
            if( node.uid === parentChildrenInfos[ parentChildIdx ].childrenInfo[ childrenIdx ].occurrenceId ||
                node.occurrenceId === parentChildrenInfos[ parentChildIdx ].childrenInfo[ childrenIdx ].occurrenceId ) {
                parentInfo = parentChildrenInfos[ parentChildIdx ].parentInfo;
                break;
            }
        }
    }

    return parentInfo;
};

var setAutoSavedSessiontime = function( isProductInteracted, contextState, treeLoadOutput, response ) {
    if( !isProductInteracted || _.isEqual( contextState.context.requestPref.savedSessionMode, 'ignore' ) ) {
        treeLoadOutput.autoSavedSessiontimeForRestoreOption = response.userWorkingContextInfo.autoSavedSessiontime;
    } else {
        treeLoadOutput.autoSavedSessiontime = response.userWorkingContextInfo.autoSavedSessiontime;
    }
};

/**
 *
 * @param {*} treeLoadInput treeLoadInput structure
 * @param {*} treeLoadOutput treeLoadOput structure used to treeLoadResult
 * @param {*} response getOccurrences response
 * @param {*} newState contextState for new getOccurrences() response
 */
function _updateTopNodeRelatedInformationInOutputStructure( treeLoadInput, treeLoadOutput, response, newState ) {
    var uwci = response.userWorkingContextInfo;
    treeLoadOutput.sublocationAttributes = uwci ? uwci.sublocationAttributes : {};
    treeLoadOutput.changeContext = null;

    if( response.requestPref ) {
        treeLoadOutput.requestPref.isStaleStructure = response.requestPref.isStaleStructure;
    }

    treeLoadOutput.showTopNode = _shouldTopNodeBeDisplayed( newState );

    if( treeLoadOutput.showTopNode === true ) {
        if( _.isEqual( treeLoadInput.dataProviderActionType, 'initializeAction' ) ) {
            if( _.isEmpty( response.occurrences ) && _.isEmpty( response.parentChildrenInfos ) ) {
                treeLoadOutput.topNodeOccurrence = [];
                treeLoadOutput.topNodeOccurrence.push( response.parentOccurrence );
            }
        }
    }

    _buildRootPathNodes( treeLoadOutput, response, newState );
    _updateNewTopNodeIfApplicable( treeLoadInput, treeLoadOutput );
}

/**
 *
 * @param {*} treeLoadInput treeLoadInput structure
 * @param {*} treeLoadOutput treeLoadOput structure used to treeLoadResult
 */
function _updateNewTopNodeIfApplicable( treeLoadInput, treeLoadOutput ) {
    if( treeLoadOutput.rootPathNodes && treeLoadOutput.rootPathNodes.length > 0 ) {
        var firstNode = _.first( treeLoadOutput.rootPathNodes );

        if( firstNode.uid !== treeLoadInput.parentNode.uid ) {
            treeLoadOutput.newTopNode = firstNode;
            treeLoadOutput.topModelObject = cdmSvc.getObject( firstNode.uid );
            treeLoadOutput.baseModelObject = cdmSvc.getObject( firstNode.uid );
        }
    }
}

/**
 * Function
 *
 * @param {*} parentModelObj parentOccurrence of getOccurrences response
 * @param {*} isShowTopNodeForEmptyStructure true if showTopNode is true
 * @returns{*} rootPath Hierarchy for given parentModelObj
 */
function _buildRootPathObjects( parentModelObj ) {
    /**
     * Determine the path to the 'root' occurrence IModelObject starting at the immediate 'parent' (t_uid)
     * object.
     */
    var rootPathObjects = [];
    var pathModelObject = parentModelObj;

    if( pathModelObject ) {
        var pathParentUid = occmgmtUtils.getParentUid( pathModelObject );
        rootPathObjects.push( pathModelObject );

        while( pathModelObject && pathParentUid ) {
            pathModelObject = cdmSvc.getObject( pathParentUid );

            if( pathModelObject ) {
                rootPathObjects.push( pathModelObject );
                pathParentUid = occmgmtUtils.getParentUid( pathModelObject );
            }
        }
    }

    return rootPathObjects;
}

/**
 * Function
 *
 * @param {*} response getOccurrences response
 * @param {*} rootPathObjects rootPathObjects
 * @param {*} pciUid ProductContextInfo UID
 * @param {*} treeLoadOutput treeLoadOutput structure
 * @returns{*} rootPath Hierarchy for given rootPathObjects
 */
function _buildRootPath( response, rootPathObjects, pciUid, treeLoadOutput ) {
    /**
     * Determine the path to the 'root' occurrence IModelObject starting at the immediate 'parent' (t_uid)
     * object.
     */
    var rootPathNodes = [];

    /**
     * Determine new 'top' node by walking back from bottom-to-top of the rootPathObjects and creating nodes to
     * wrap them.
     */
    var nextLevelNdx = -1;

    for( var ndx = rootPathObjects.length - 1; ndx >= 0; ndx-- ) {
        var currNode = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( rootPathObjects[ ndx ], 0, nextLevelNdx++ );
        var rootPathNodesLength = rootPathObjects.length - 1;
        /**
         * Note: We mark all necessary 'parent' path nodes as 'placeholders' so that we can find them later and
         * fill them out as needed (when they come into view)
         */
        var isPlaceholder = !( ndx === rootPathNodesLength || treeLoadOutput.showTopNode && ndx === rootPathNodesLength - 1 );
        currNode.isExpanded = true;

        //TopNode for empty structure. Should not be set as expanded. it makes getOcc call otherwise
        if( !_.isEmpty( treeLoadOutput.topNodeOccurrence ) ) {
            currNode.isExpanded = false;
        }

        if( ndx === 0 && response.cursor ) {
            currNode.cursorObject = response.cursor;
        }

        currNode.isPlaceholder = isPlaceholder;
        currNode.pciUid = pciUid;

        rootPathNodes.push( currNode );
    }

    return rootPathNodes;
}

/**
 */
function _buildRootPathNodes( treeLoadOutput, response, newState, occurrenceId ) {
    occurrenceId = _.isUndefined( occurrenceId ) ? response.parentOccurrence.occurrenceId : occurrenceId;
    if( cdmSvc.isValidObjectUid( occurrenceId ) ) {
        var parentOccurrenceObject = cdmSvc.getObject( occurrenceId );
        var rootPathObjects = _buildRootPathObjects( parentOccurrenceObject );
        var addExtraTopNodeInRootPathHierarchy = treeLoadOutput.showTopNode && _.isEmpty( treeLoadOutput.topNodeOccurrence );

        if( addExtraTopNodeInRootPathHierarchy === true ) {
            var topNode = _.last( rootPathObjects );
            rootPathObjects.push( topNode );
        }

        var rootPathNodes = _buildRootPath( response, rootPathObjects, newState.pci_uid, treeLoadOutput );

        if( rootPathNodes.length > 0 ) {
            treeLoadOutput.rootPathNodes = rootPathNodes;
        }
    }
}

/**
 *
 */
function _shouldTopNodeBeDisplayed( contextState ) {
    var productContextInfo = cdmSvc.getObject( contextState.pci_uid );
    var supportedFeatures = occurrenceManagementStateHandler.getSupportedFeaturesFromPCI( productContextInfo );
    var swc = false;
    var isTreeView = occmgmtUtils.isTreeView();

    if( !isTreeView ) {
        return false;
    }

    if( productContextInfo && productContextInfo.props && productContextInfo.props.awb0ContextObject && productContextInfo.props.awb0ContextObject.dbValues ) {
        swc = cdmSvc.getObject( productContextInfo.props.awb0ContextObject.dbValues[ 0 ] );
    }

    if( supportedFeatures[ '4GStructureFeature' ] || swc ) {
        return false;
    }

    return true;
}

/**
 *
 */
function _buildTreeLoadOutputInfo( treeLoadInput, treeLoadOutput, response, newState, contextState ) {
    //Values from different sources get copied to treeLoadResult. treeLoadInput, response, ctx etc. That needs unification.
    //We will create treeLoadOutput and copy that into basic treeLoadResult rather than updating basic treeLoadResult at different points.

    //Opened object is assembly/sub-assembly that user has navigated into.
    treeLoadOutput.openedModelObject = cdmSvc.getObject( newState.o_uid );

    //But in case of trees, there is no navigation ( but expansion ). So, openedModelObject is always TopNode/t_uid.
    if( occmgmtUtils.isTreeView() ) {
        treeLoadOutput.openedModelObject = cdmSvc.getObject( newState.t_uid );
    }

    treeLoadOutput.expandParent = treeLoadInput.expandParent;
    treeLoadOutput.retainTreeExpansionStates = treeLoadInput.retainTreeExpansionStates;
    treeLoadOutput.filter = response.filter;
    treeLoadOutput.configContext = {};
    treeLoadOutput.startFreshNavigation = false;
    treeLoadOutput.elementToPCIMap = occmgmtGetOccsResponseService.updateElementToPCIMap( response, contextState );
    treeLoadOutput.isFocusedLoad = treeLoadInput.isFocusedLoad;

    treeLoadOutput.requestPref = {
        savedSessionMode: appCtxSvc.ctx.requestPref ? appCtxSvc.ctx.requestPref.savedSessionMode : 'restore',
        criteriaType: contextState.context.requestPref.criteriaType,
        showUntracedParts: contextState.context.requestPref.showUntracedParts,
        recipeReset: !_.isUndefined( response.requestPref ) && response.requestPref.recipeReset ? response.requestPref.recipeReset[ 0 ] : 'false'
    };

    if( !_.isUndefined( contextState.context.showTopNode ) ) {
        treeLoadOutput.showTopNode = contextState.context.showTopNode;
    }

    occmgmtGetOccsResponseService.populateRequestPrefInfoOnOccmgmtContext( treeLoadOutput, response, contextState.key );
    occmgmtGetOccsResponseService.populateFeaturesInfoOnOccmgmtContext( treeLoadOutput, response, contextState.key );

    /**
     *
     * treeLoadInput.isFocusedLoad will be true in requrest to dataProvider if is is focus action ( user searched for something which is not loaded)
     * Other use case is, user opened a structure. So, instead of sending first level, server sent multiple levels around last saved selection.
     * So, this is focus use case but triggered from server side. In this case also, isFocusedLoad should be true.
     */
    var focusChildOccInfo = response.focusChildOccurrence;
    if( !_.isEmpty( focusChildOccInfo.occurrenceId ) && cdmSvc.isValidObjectUid( focusChildOccInfo.occurrenceId ) ) {
        treeLoadOutput.isFocusedLoad = true;
    }

    var pci_uid = newState.pci_uid;

    if( treeLoadInput.skipFocusOccurrenceCheck && contextState.context.previousState ) {
        pci_uid = contextState.context.previousState.pci_uid;
    }

    treeLoadOutput.pciModelObject = cdmSvc.getObject( pci_uid );

    if( !_.isEmpty( contextState.context.configContext ) ) {
        treeLoadOutput.isConfigurationChangeRequest = true;
    }

    if( treeLoadInput.clearExistingSelections ) {
        contextState.context.pwaSelectionModel.selectNone();
    }

    aceStaleRowMarkerService.updateCtxWithStaleUids( response.requestPref, response.occurrences, response.parentChildrenInfos );
}

/**
 *
 */
function _setFirstRootPathNodeAsTopModelObjectInOuputStructure( treeLoadInput, treeLoadOutput ) {
    if( treeLoadOutput.rootPathNodes ) {
        var topNode = _.first( treeLoadOutput.rootPathNodes );
        /**
         * Earlier we used to build tree level by level. So, when level 0 was built last, topModelObject and
         * baseModelObject were set to RootNode.As we are processing all levels in one call, that is not
         * taking place. Ideally, when we are rendering levels, at each level topModelObject and
         * baseModelObject should be RootNode.
         */
        if( treeLoadInput.parentNode.levelNdx === -1 ) {
            treeLoadOutput.topModelObject = cdmSvc.getObject( topNode.uid );
            treeLoadOutput.baseModelObject = cdmSvc.getObject( topNode.uid );
            treeLoadOutput.openedModelObject = cdmSvc.getObject( topNode.uid );
        }
    }
}

/**
 *
 */
function _updateVMNodesWithIncompleteHeadTailInfo( cursorInfo, vmNodes ) {
    var headChild = _.head( vmNodes );
    var lastChild = _.last( vmNodes );

    if( !cursorInfo.startReached ) {
        headChild.incompleteHead = true;
    }

    if( !cursorInfo.endReached ) {
        lastChild.incompleteTail = true;
    }
}

var _isRootPathNodeInSyncWithResponse = function( viewModelCollection, rootPathNode, treeLoadOutput, response ) {
    if( rootPathNode.parentUid ) {
        var rootPathNodeParentNdx = viewModelCollection.findViewModelObjectById( rootPathNode.parentUid );
        if( rootPathNodeParentNdx !== -1 ) {
            var rootPathNodeParent = viewModelCollection.getViewModelObject( rootPathNodeParentNdx );

            if( rootPathNodeParent && rootPathNodeParent.children ) {
                for( var i = 0; i < response.parentChildrenInfos.length; i++ ) {
                    var info = response.parentChildrenInfos[ i ];

                    if( info && info.parentInfo && info.childrenInfo &&
                        ( _.isEqual( info.parentInfo.occurrenceId, rootPathNodeParent.uid ) || _.isEqual( info.parentInfo.uid, rootPathNodeParent.uid ) ) &&
                        !_.isEqual( info.childrenInfo.length, rootPathNodeParent.children.length ) ) {
                        // There is mismatch in the tree children count with the children present in response for the parent.
                        // We can not proceed with merging new nodes.
                        treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = false;
                        return;
                    }
                }
            }
            // else the parent of rootPathNode is collapsed.
        }
    }
};

var _populateMergeNewNodesInCurrentyLoadedTreeParameter = function( treeLoadOutput, declViewModel, response ) {
    var viewModelCollection = occmgmtUtils.getCurrentTreeDataProvider( declViewModel.dataProviders ).viewModelCollection;
    var lastParentChildrenInfo = _.last( response.parentChildrenInfos );
    var lastParentNodeNdx = viewModelCollection.findViewModelObjectById( lastParentChildrenInfo.parentInfo.occurrenceId );

    //Setting mergeNewNodesInCurrentlyLoadedTree always to true is no harm.
    treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = true;

    //If user has searched for an element whose parent was already expanded(and partially loaded), disable merge.
    //No mechanism to figure out where new page that has come belongs (below/above/middle of existing nodes).
    //It would create a scenario of multiple cursors for given parent.
    if( lastParentNodeNdx !== -1 ) {
        var lastParentNode = viewModelCollection.getViewModelObject( lastParentNodeNdx );

        if( lastParentNode.isExpanded ) {
            treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = false;
            return;
        }
    }

    //Objects in RootPath already present in Tree, as placeholder parents, or as expanded sub-assemblies having has incomplete structure (incomplete head/tail).
    //do not merge new results into currently loaded tree if parents are incomplete as it will lead to parent with multiple incomplete sections in parent and
    //multiple cursors. This will leave tree in weird state. For BVR , this scenario will not arise as BVR sends all nodes at given level.
    _.forEach( treeLoadOutput.rootPathNodes, function( rootPathNode ) {
        var rootPathNodeNdx = viewModelCollection.findViewModelObjectById( rootPathNode.uid );

        if( rootPathNodeNdx !== -1 ) {
            var rootPathParentNode = viewModelCollection.getViewModelObject( rootPathNodeNdx );

            if( rootPathParentNode.isPlaceholder ) {
                treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = false;
                return;
            }

            var firstChildOfRootPathParentNode = _.first( rootPathParentNode.children );
            var lastChildOfRootPathParentNode = _.last( rootPathParentNode.children );

            if( firstChildOfRootPathParentNode && firstChildOfRootPathParentNode.incompleteHead ||
                lastChildOfRootPathParentNode && lastChildOfRootPathParentNode.incompleteTail ) {
                treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = false;
                return;
            }
        } else {
            _isRootPathNodeInSyncWithResponse( viewModelCollection, rootPathNode, treeLoadOutput, response );
        }
    } );
};

var identifyParentsToLookIntoFromCache = function( cachedChildren, parentsToLookInto, expandedNodesFromCache ) {
    _.forEach( cachedChildren, function( child ) {
        if( child.__expandState ) {
            parentsToLookInto.push( child );
            expandedNodesFromCache = expandedNodesFromCache.concat( child.__expandState.expandedNodes );
            identifyParentsToLookIntoFromCache( child.__expandState.children, parentsToLookInto, expandedNodesFromCache );
        } else if( !child.__expandState && child.children ) {
            parentsToLookInto.push( child );
            identifyParentsToLookIntoFromCache( child.children, parentsToLookInto, expandedNodesFromCache );
        }
    } );
};

/**
 */
function _createChildOccurrences( treeLoadInput, treeLoadOutput, response, newState, declViewModel, contextState, levelNdx ) {
    var vmNodes = [];
    var vmNodeStates = undefined;

    if( !_.isEmpty( response.parentChildrenInfos ) ) {
        // To support jitter free tree display upon configuration and filter change, build rootPathNodes
        // with first parent in parentChildrenInfos in getOcc SOA  response. In expandBelow case, rootPathNodes
        // are not required, hence skipping that case
        if( treeLoadInput.expandBelow ) {
            vmNodeStates = {};
            vmNodeStates.isInExpandBelowMode = true;
            vmNodeStates.expandedNodesFromCache = [];
            vmNodeStates.parentsToLookInto = [];
            const pwaEditHandler = editHandlerService.getEditHandler( contextState.context.vmc.name );
            if( pwaEditHandler && pwaEditHandler.editInProgress() ) {
                var cachedExpandState = contextState.context.expandStateCache;
                if( cachedExpandState ) {
                    vmNodeStates.expandedNodesFromCache = cachedExpandState.expandedNodes;
                    vmNodeStates.contextState = contextState;
                    identifyParentsToLookIntoFromCache( cachedExpandState.children, vmNodeStates.parentsToLookInto, vmNodeStates.expandedNodesFromCache );
                }
            }
        } else {
            if( _.isUndefined( treeLoadOutput.rootPathNodes ) ) {
                var occurrenceId = response.parentChildrenInfos[ 0 ].parentInfo.occurrenceId;
                _buildRootPathNodes( treeLoadOutput, response, newState, occurrenceId );
            }
        }

        // There is a possibility of non root path data being sent from server. Validate and set the flag here.
        _setFirstRootPathNodeAsTopModelObjectInOuputStructure( treeLoadInput, treeLoadOutput );

        //Server returned multiple levels. Merge will happen if parent this path is present in loaded structure.
        if( treeLoadInput.focusLoadAction ) {
            vmNodes = _populateViewModelTreesNodesInTreeHierarchyFormat( treeLoadOutput, response );
            _populateMergeNewNodesInCurrentyLoadedTreeParameter( treeLoadOutput, declViewModel, response );
        } else {
            var parentNodeUnderAction = treeLoadOutput.rootPathNodes ? treeLoadOutput.rootPathNodes[ 0 ].uid : treeLoadInput.parentElement;
            treeLoadOutput.vmNodesInTreeHierarchyLevels = [];
            treeLoadOutput.nonRootPathHierarchicalData = true;
            treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree = Boolean( treeLoadInput.expandBelow );

            _populateViewModelTreesNodesInTreeHierarchyFormatForTopDown( treeLoadInput, treeLoadOutput, response, declViewModel, vmNodeStates, contextState );
            _updateVMNodesWithChildrenAndCountInformation( treeLoadOutput, declViewModel, contextState, vmNodeStates );

            vmNodes = getVMNodeChildren( treeLoadOutput.vmNodesInTreeHierarchyLevels, parentNodeUnderAction );
        }
    } else {
        var childOccInfos = [];

        if( !_.isEmpty( response.occurrences ) ) {
            childOccInfos = response.occurrences;
        }

        vmNodes = occmgmtVMTNodeCreateService.createVMNodesForGivenOccurrences( childOccInfos, levelNdx, newState.pci_uid, treeLoadOutput.elementToPCIMap );
    }

    return vmNodes;
}

var _populateViewModelTreesNodesInTreeHierarchyFormat = function( treeLoadOutput, response ) {
    var vmNodesInTreeHierarchyLevels = [];
    var levelNdx = -1;
    var vmNodes = [];
    var rootPathNodesLength = treeLoadOutput.rootPathNodes.length - response.parentChildrenInfos.length + 1;

    //Build levels of placeholder parents
    for( var ndx = 0; ndx < rootPathNodesLength; ndx++, levelNdx++ ) {
        vmNodesInTreeHierarchyLevels.push( [ treeLoadOutput.rootPathNodes[ ndx ] ] );
    }
    //Parent level from which occurrences have been returned
    var startLevelNdx = levelNdx;
    _.forEach( response.parentChildrenInfos, function( parentChildInfo ) {
        vmNodes = occmgmtVMTNodeCreateService.createVMNodesForGivenOccurrences( parentChildInfo.childrenInfo, levelNdx );
        //If level is incomplete (head/tail), update VM Nodes with that info
        _updateVMNodesWithIncompleteHeadTailInfo( parentChildInfo.cursor, vmNodes );
        vmNodesInTreeHierarchyLevels.push( vmNodes );
        levelNdx++;
    } );

    //Update cursor information on VM Nodes
    _.forEach( response.parentChildrenInfos, function( parentChildInfo ) {
        var parentViewModelTreeNode = vmNodesInTreeHierarchyLevels[ startLevelNdx ].filter( function( vmo ) {
            return vmo.id === parentChildInfo.parentInfo.occurrenceId;
        } )[ 0 ];
        parentViewModelTreeNode.cursorObject = parentChildInfo.cursor;
        startLevelNdx++;
    } );

    treeLoadOutput.vmNodesInTreeHierarchyLevels = vmNodesInTreeHierarchyLevels;
    return vmNodes;
};

function _findPlaceHolderParentsInRootPathNodes( parentChildrenInfos, rootPathNodes ) {
    var allParents = _.map( parentChildrenInfos, function( parentChildrenInfo ) {
        return parentChildrenInfo.parentInfo.occurrenceId;
    } );

    return _.filter( rootPathNodes, function( rootPathNode ) {
        return allParents.indexOf( rootPathNode.id ) === -1;
    } );
}

var setExpansionStateForNode = function( contextState, vmNode, declViewModel, dataProvider, expandBelowModeState ) {
    if( contextState.context.expandNLevel && vmNode.$$treeLevel >= contextState.context.expandNLevel.levelsApplicableForExpansion ) {
        var vmoIndex = dataProvider.viewModelCollection.findViewModelObjectById( vmNode.uid );
        var node = dataProvider.viewModelCollection.getViewModelObject( vmoIndex );
        //Case where node was collapsed but is maintained on cache, send node from the cache to collapse to preserve expandtate
        if( !node ) {
            var nodeFoundInCache = _.find( expandBelowModeState.parentsToLookInto, function( cachedNode ) {
                return cachedNode.uid === vmNode.uid;
            } );
            if( nodeFoundInCache && !nodeFoundInCache.isLeaf && nodeFoundInCache.__expandState ) {
                vmNode.__expandState = nodeFoundInCache.__expandState;
                node = nodeFoundInCache;
            }
        }
        aceExpandBelowService.collapseNodeHierarchy( {
            data: declViewModel,
            row: node ? node : vmNode
        } );
    } else {
        occmgmtTreeTableStateService.addNodeToExpansionState( vmNode, declViewModel );
        _.assign( vmNode, expandBelowModeState );
    }
};

/**
 *
 * @param {*} treeLoadOutput VMTreeNodes
 * @param {*} declViewModel declarative viewModel
 * @param {*} contextState context state
 * @param {*} expandBelowModeState Flags to Assign
 */
function _updateVMNodesWithChildrenAndCountInformation( treeLoadOutput, declViewModel, contextState, expandBelowModeState ) {
    var vmNodesInTreeHierarchyLevels = treeLoadOutput.vmNodesInTreeHierarchyLevels;
    var dataProvider = occmgmtUtils.getCurrentTreeDataProvider( declViewModel.dataProviders );
    for( var ndx = 0; ndx < vmNodesInTreeHierarchyLevels.length; ndx++ ) {
        for( var cdx = 0; cdx < vmNodesInTreeHierarchyLevels[ ndx ].length; cdx++ ) {
            var viewModelTreeNode = vmNodesInTreeHierarchyLevels[ ndx ][ cdx ];
            if( !viewModelTreeNode.isLeaf ) {
                var children = getVMNodeChildren( vmNodesInTreeHierarchyLevels, viewModelTreeNode.uid );
                if( children ) {
                    viewModelTreeNode.children = _.clone( children );
                    viewModelTreeNode.isExpanded = true;
                    viewModelTreeNode.totalChildCount = children.length;
                } else if( expandBelowModeState ) {
                    setExpansionStateForNode( contextState, vmNodesInTreeHierarchyLevels[ ndx ][ cdx ], declViewModel, dataProvider, expandBelowModeState );
                }
            }
        }
    }
}

var replaceVmoPropsFromCache = function( cacheNodes, vmNodes ) {
    _.forEach( cacheNodes, function( expandedNodeToReplace ) {
        _.forEach( vmNodes, function( vmNode ) {
            if( expandedNodeToReplace.uid === vmNode.uid ) {
                vmNode.props = expandedNodeToReplace.props;
            }
        } );
    } );
};

/**
 *
 * @param {*} treeLoadInput TreeLoadInput
 * * @param {*} treeLoadOutput TreeLoadOutput
 * @param {*} response GetOccurrences response
 * @param {*} declViewModel decl ViewModel
 * @param {*} vmNodeStates VM Node States
 * @param {*} contextState Context State
 */
function _populateViewModelTreesNodesInTreeHierarchyFormatForTopDown( treeLoadInput, treeLoadOutput, response, declViewModel, vmNodeStates, contextState ) {
    var vmNodesInTreeHierarchyLevels = treeLoadOutput.vmNodesInTreeHierarchyLevels;
    var dataProvider = occmgmtUtils.getCurrentTreeDataProvider( declViewModel.dataProviders );
    /*
     *   Populate Parent VM Node
     */
    if( treeLoadOutput.mergeNewNodesInCurrentlyLoadedTree ) {
        var parentNodeIndex = dataProvider.viewModelCollection.findViewModelObjectById( response.parentOccurrence.occurrenceId );

        if( parentNodeIndex !== -1 ) {
            var parentNode = _.assign( {}, dataProvider.viewModelCollection.getViewModelObject( parentNodeIndex ) );
            vmNodesInTreeHierarchyLevels.push( [ parentNode ] );
        }
    } else {
        var placeHolderParentsInRootPathNodes = _findPlaceHolderParentsInRootPathNodes( response.parentChildrenInfos, treeLoadOutput.rootPathNodes );

        //topNode to be added in vmNodesInTreeHierarchyLevels here for correct indentation and processing of data.
        if( treeLoadOutput.showTopNode ) {
            vmNodesInTreeHierarchyLevels.push( [ treeLoadOutput.rootPathNodes[ 1 ] ] );
        }

        // Build levels of placeholder parents
        for( var ndx = 1; ndx < placeHolderParentsInRootPathNodes.length; ndx++ ) {
            vmNodesInTreeHierarchyLevels.push( [ treeLoadOutput.rootPathNodes[ ndx ] ] );
        }

        // The parent object in first parentChildrenInfos is the child of the last root path node. So insert it in vmNodesInTreeHierarchyLevels.
        if( placeHolderParentsInRootPathNodes.length > 0 ) {
            var parentModelObject = cdmSvc.getObject( response.parentChildrenInfos[ 0 ].parentInfo.occurrenceId );
            var vmNodeLevelIndex = getVMNodeLevelIndex( treeLoadOutput, response.parentChildrenInfos, parentModelObject );
            var firstLoadedParentNode = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( parentModelObject, 0, vmNodeLevelIndex );
            firstLoadedParentNode.isPlaceholder = true;
            vmNodesInTreeHierarchyLevels.push( [ firstLoadedParentNode ] );
        }

        // We do not need rootPathNodes for further processing. Retaining those will lead to a different code path and hence we need to get rid of those
        delete treeLoadOutput.rootPathNodes;
    }

    /*
     *   Populate VM Node tree hierarchy for all Children
     */
    for( ndx = 0; ndx < response.parentChildrenInfos.length; ndx++ ) {
        var parentChildInfo = response.parentChildrenInfos[ ndx ];
        vmNodeLevelIndex = getVMNodeLevelIndex( treeLoadOutput, response.parentChildrenInfos, parentChildInfo.childrenInfo[ 0 ] );
        var vmNodes = occmgmtVMTNodeCreateService.createVMNodesForGivenOccurrences( parentChildInfo.childrenInfo, vmNodeLevelIndex, null, null,
            parentChildInfo.parentInfo.occurrenceId );

        vmNodes = vmNodes.map( function( vmnode ) {
            var nodeIndex = dataProvider.viewModelCollection.findViewModelObjectById( vmnode.uid );
            if( nodeIndex !== -1 && !treeLoadOutput.isConfigurationChangeRequest && !treeLoadInput.isResetRequest && !treeLoadInput.sortCriteriaChanged ) {
                delete vmnode.type;
                return _.assign( dataProvider.viewModelCollection.getViewModelObject( nodeIndex ), vmnode );
            }
            return vmnode;
        } );

        //Retain prop edits for expand below use case
        if( declViewModel.treeLoadInput.expandBelow ) {
            const pwaEditHandler = editHandlerService.getEditHandler( contextState.context.vmc.name );
            if( pwaEditHandler && pwaEditHandler.editInProgress() ) {
                //Case when we want to expandBelow an already expanded node.The cache is deleted for the expanded node,
                //but the sub-assemblies below it do have cache which can be used to maintain edits
                var cachedExpandState = contextState.context.expandStateCache;
                if( !cachedExpandState ) {
                    _.forEach( vmNodes, function( vmNode ) {
                        if( vmNode.__expandState ) {
                            vmNodeStates.parentsToLookInto.push( vmNode );
                            identifyParentsToLookIntoFromCache( vmNode.__expandState.children, vmNodeStates.parentsToLookInto, vmNodeStates.expandedNodesFromCache );
                        }
                    } );
                }

                //First loop through the expanded nodes for quick search.
                var foundNodeInExpandedNodes = vmNodeStates.expandedNodesFromCache ? vmNodeStates.expandedNodesFromCache.filter( o => vmNodes.some( ( { uid } ) => o.uid === uid ) ) : null;
                if( foundNodeInExpandedNodes && foundNodeInExpandedNodes.length ) {
                    replaceVmoPropsFromCache( foundNodeInExpandedNodes, vmNodes );
                } else {
                    //look into children of the parents if after editing the parent was collapsed
                    var childrenToLookInto;
                    _.forEach( vmNodeStates.parentsToLookInto, function( parentToLook ) {
                        //See if the parentInfo from the current loop matches with any parents identified from cache
                        if( parentChildInfo.parentInfo.occurrenceId === parentToLook.uid ) {
                            childrenToLookInto = parentToLook.__expandState ? parentToLook.__expandState.children : parentToLook.children;
                        }
                    } );
                    var childFound = childrenToLookInto ? childrenToLookInto.filter( child => vmNodes.some( ( { uid } ) => child.uid === uid ) ) : null;
                    if( childFound && childFound.length ) {
                        replaceVmoPropsFromCache( childFound, vmNodes );
                    }
                }
            }
        }

        vmNodesInTreeHierarchyLevels.push( vmNodes );
    }

    treeLoadOutput.vmNodesInTreeHierarchyLevels = vmNodesInTreeHierarchyLevels;
}

var getVMNodeChildren = function( vmNodesInTreeHierarchyLevels, uid ) {
    for( var ndx = 0; ndx < vmNodesInTreeHierarchyLevels.length; ndx++ ) {
        for( var cdx = 0; cdx < vmNodesInTreeHierarchyLevels[ ndx ].length; cdx++ ) {
            if( vmNodesInTreeHierarchyLevels[ ndx ][ cdx ].parentUid === uid ) {
                return vmNodesInTreeHierarchyLevels[ ndx ];
            }
        }
    }
};

var exports = {};

/**
 */
function _getCursorObjectOfLastExpandedParent( response ) {
    var cursorObject = response.cursor;

    if( !_.isEmpty( response.parentChildrenInfos ) ) {
        cursorObject = _.last( response.parentChildrenInfos ).cursor;
    }

    return cursorObject;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {ISOAResponse} response - SOA Response
 *
 * @return {TreeLoadResult} A new TreeLoadResult object containing result/status information.
 */

export let processGetOccurrencesResponse = function( treeLoadInput, response, contextState, declViewModel ) {
    /**
     * Extract action parameters from the arguments to this function.
     */
    var parentNode = treeLoadInput.parentNode;
    var isTopNode = parentNode.levelNdx === -1;
    var cursorObject = _getCursorObjectOfLastExpandedParent( response );
    var startReached = cursorObject.startReached;
    var endReached = cursorObject.endReached;

    /**
     * ---------------------------------------------------<BR>
     * Build treeLoadResult object<BR>
     * ---------------------------------------------------<BR>
     */
    /**
     * Check if this is the outer-most level of the tree.
     */
    var treeLoadOutput = {};
    var treeLoadResult;
    var vmNodes;
    var newState = occmgmtGetOccsResponseService.getNewStateFromGetOccResponse( response, contextState.key );
    _buildTreeLoadOutputInfo( treeLoadInput, treeLoadOutput, response, newState, contextState );

    //Child Level should be parent level plus one.
    treeLoadOutput.childOccsCreationLevelNdx = treeLoadInput.parentNode.levelNdx + 1;

    if( declViewModel && declViewModel.dataProviders ) {
        treeLoadOutput.vmc = occmgmtUtils.getCurrentTreeDataProvider( declViewModel.dataProviders ).viewModelCollection;
    }

    if( treeLoadInput.expandBelow ) {
        _updateNewTopNodeIfApplicable( treeLoadInput, treeLoadOutput );
    } else if( isTopNode ) {
        _updateTopNodeRelatedInformationInOutputStructure( treeLoadInput, treeLoadOutput, response, newState );
    }
    setAutoSavedSessiontime( treeLoadInput.isProductInteracted, contextState, treeLoadOutput, response );

    if( !_.isEmpty( treeLoadOutput.topNodeOccurrence ) ) {
        vmNodes = occmgmtVMTNodeCreateService.createVMNodesForGivenOccurrences( treeLoadOutput.topNodeOccurrence, treeLoadOutput.childOccsCreationLevelNdx,
            newState.pci_uid, treeLoadOutput.elementToPCIMap );
    } else {
        vmNodes = _createChildOccurrences( treeLoadInput, treeLoadOutput, response, newState, declViewModel, contextState, treeLoadOutput.childOccsCreationLevelNdx );
    }

    /**
     * Create occs and a basic treeLoadResult
     */
    treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached, endReached, treeLoadOutput.newTopNode );

    if( isTopNode ) {
        /**
         * Remove the 'c_uid' property since these are normally controlled by the sublocation.
         */
        if( treeLoadInput.skipFocusOccurrenceCheck && contextState.context.previousState.c_uid ) {
            delete newState.c_uid;
            delete newState.o_uid;
        }
        contextStateMgmtService.syncContextState( contextState.key, newState );
    } else {
        /**
         * Move all mapped objects that exist in the 'occmgmtContext' to the treeLoadResult.
         * <P>
         * Note: We do this to keep these objects 'stable' as the tree is expanded over many levels.
         */
        _.forEach( _mapCtxToLoadResult, function( fromPath, toPath ) {
            if( contextState.context[ toPath ] ) {
                treeLoadResult[ fromPath ] = contextState.context[ toPath ];
            }
        } );
    }

    _.forEach( treeLoadOutput, function( value, name ) {
        if( !_.isUndefined( value ) ) {
            treeLoadResult[ name ] = value;
        }
    } );

    treeLoadResult.parentNode.cursorObject = cursorObject;

    occmgmtGetOccsResponseService.populateSourceContextToInfoMapOnOccmgmtContext( treeLoadResult, response );
    occmgmtGetOccsResponseService.populateRequestPrefInfoOnOccmgmtContext( treeLoadResult, response, contextState.key );
    occmgmtGetOccsResponseService.populateFeaturesInfoOnOccmgmtContext( treeLoadResult, response, contextState.key );

    _updateTreeLoadResultWithDefaultBaseModelObjectIfNeeded( treeLoadResult, contextState );
    _updateTreeLoadResultWithDefaultTopModelObjectIfNeeded( contextState, treeLoadResult );

    return treeLoadResult;
};

/**
 * Toggle Index Configuration service utility
 */

export default exports = {
    processGetOccurrencesResponse
};
app.factory( 'occmgmtTreeLoadResultBuilder', () => exports );
