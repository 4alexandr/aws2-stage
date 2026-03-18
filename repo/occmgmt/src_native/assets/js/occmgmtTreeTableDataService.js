/* eslint-disable max-lines */
//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/occmgmtTreeTableDataService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import awColumnSvc from 'js/awColumnService';
import cdmSvc from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import occmgmtGetSvc from 'js/occmgmtGetService';
import occmgmtUtils from 'js/occmgmtUtils';
import appCtxSvc from 'js/appCtxService';
import aceRestoreBWCStateService from 'js/aceRestoreBWCStateService';
import structureFilterService from 'js/structureFilterService';
import occmgmtTreeTableStateService from 'js/occmgmtTreeTableStateService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import occmgmtVisibilityService from 'js/occmgmtVisibility.service';
import occmgmtIconSvc from 'js/occmgmtIconService';
import occmgmtTreeLoadResultBuilder from 'js/occmgmtTreeLoadResultBuilder';
import occmgmtCellRenderingService from 'js/occmgmtCellRenderingService';
import awTableStateService from 'js/awTableStateService';
import treeTableDataService from 'js/treeTableDataService';
import assert from 'assert';
import _ from 'lodash';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';

var _firstColumnConfigColumnPropertyName = null;

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * {Boolean} TRUE if certain properties and/or events should be logged during occurrence loading.
 */
var _debug_logOccLoadActivity = false;

/**
 * Map from pci uid to "stableId" of nodes that are in expanded state
 */
var _pciToExpandedNodesStableIdsMap;

var _expandedNodes = {};

var updateExpansionState = function( treeLoadResult, declViewModel, contextState ) {
    if( appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState ) {
        awTableStateService.clearAllStates( declViewModel, _.keys( declViewModel.grids )[ 0 ] );
        delete appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState;
        _pciToExpandedNodesStableIdsMap[ contextState.key ] = {};
    }

    _expandedNodes[ contextState.key ] = _expandedNodes[ contextState.key ] || _.cloneDeep( _expandedNodes.nodes ) || [];
    if( _expandedNodes[ contextState.key ] && _expandedNodes[ contextState.key ].length > 0 ) {
        _expandedNodes[ contextState.key ].map( function( uid ) {
            var gridId = Object.keys( declViewModel.grids )[ 0 ];
            awTableStateService.saveRowExpanded( declViewModel, gridId, uid );
        } );
        treeLoadResult.retainTreeExpansionStates = true;
        _expandedNodes[ contextState.key ] = [];
    }
};


/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {Object} soaInput - Parameters to be sent to the 'pocc6' SOA call.
 * @param {*} uwDataProvider - Data Provider
 * @param {*} declViewModel - Decl ViewModel
 * @param {*} contextState - Context State
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState ) {
    var parentNode = treeLoadInput.parentNode;
    var sytemLocatorParams = appCtxSvc.getCtx( 'systemLocator' );

    if( sytemLocatorParams ) {
        treeLoadInput.isFocusedLoad = sytemLocatorParams.isFocusedLoad;
    }

    /**
     * If 'parent' has no 'child' nodes yet, there is no cursor that should be needed, or used.
     */
    if( _.isEmpty( parentNode.children ) ) {
        parentNode.cursorObject = null;
    }

    /**
     * If input has a known 'pci_uid', locate the IModelObject and set it in the inputData.
     *
     */
    if( treeLoadInput.pci_uid ) {
        soaInput.inputData.config.productContext = occmgmtUtils.getObject( treeLoadInput.pci_uid );
    }

    treeLoadInput.displayMode = 'Tree';

    /**
     * If a node other than the active product is being expanded then we must fetch and use filter parameters
     * from the cache
     */
    if( treeLoadInput.pci_uid && treeLoadInput.pci_uid !== contextState.context.currentState.pci_uid ) {
        treeLoadInput.filterString = updateFilterParamsOnInputForCurrentPciUid( treeLoadInput.pci_uid,
            contextState );
    }

    return occmgmtGetSvc.getOccurrences( treeLoadInput, soaInput, contextState.context ).then(
        function( response ) {
            if( !declViewModel.isDestroyed() ) {
                var pciBeforeConfigurationChange = contextState.context.currentState.pci_uid;
                var treeLoadResult = occmgmtTreeLoadResultBuilder.processGetOccurrencesResponse( treeLoadInput, response, contextState, declViewModel );
                updateExpansionState( treeLoadResult, declViewModel, contextState );
                aceRestoreBWCStateService.addOpenedProductToSessionStorage( declViewModel, treeLoadInput, treeLoadResult, uwDataProvider, contextState );

                _pciToExpandedNodesStableIdsMap[ contextState.key ] = _pciToExpandedNodesStableIdsMap[ contextState.key ] || {};

                /**
                 * Currently expansion state is maintained in local storage and is based on "id" property of the
                 * nodes which is nothing but "uid" property of an element. When configuration changes, for ACE,
                 * "uid" of objects change and hence expansion state is lost. It is important from user
                 * perspective that we maintain expansion state. In order to achieve that what we do is use
                 * "stableId" (commonly referred to as clone stable id chain) property of expanded nodes to
                 * identify those on reload. This property remains same across configuration changes. Adding a
                 * mapping between product context and "stableId" further solidifies the proper identification
                 * of an element. Hence we build a map from "pci" to all "csid" that were expanded.
                 */
                if( !_.isEmpty( contextState.context.configContext ) || _.isEqual( contextState.context.retainTreeExpansionStateInJitterFreeWay, true ) ) {
                    occmgmtTreeTableStateService.setupCacheToRestoreExpansionStateOnConfigChange(
                        uwDataProvider, declViewModel, pciBeforeConfigurationChange,
                        contextState.context, _pciToExpandedNodesStableIdsMap[ contextState.key ] );
                    treeLoadResult.retainTreeExpansionStates = true;
                }

                /**
                 * Restore expansion state of nodes that were identified as expanded when the request was made.
                 * It cannot be restricted to the call which made configuration change as not all expanded nodes
                 * are returned in a single load action. Hence we must try to identify nodes that need to be
                 * expanded from those that are returned after every call.
                 */
                if( uwDataProvider && _pciToExpandedNodesStableIdsMap[ contextState.key ] &&
                    Object.keys( _pciToExpandedNodesStableIdsMap[ contextState.key ] ).length > 0 ) {
                    var pciAfterConfigurationChange = contextState.context.currentState.pci_uid;

                    var newlyLoadedNodes = treeLoadResult.childNodes;

                    // If we have received multiple parent-child info consider those nodes too for maintaining expansion state.
                    if( treeLoadResult.vmNodesInTreeHierarchyLevels ) {
                        newlyLoadedNodes = [];

                        _.forEach( treeLoadResult.vmNodesInTreeHierarchyLevels, function(
                            vmNodesInTreeHierarchyLevel ) {
                            newlyLoadedNodes = newlyLoadedNodes.concat( vmNodesInTreeHierarchyLevel );
                        } );
                    }

                    occmgmtTreeTableStateService.updateLocalStorageWithExpandedNodesOnConfigChange(
                        newlyLoadedNodes, declViewModel, pciAfterConfigurationChange,
                        _pciToExpandedNodesStableIdsMap[ contextState.key ] );

                    if( response.elementToPCIMap ) {
                        occmgmtTreeTableStateService.updateLocalStorageForProductNodesOfSWCOnConfigChange(
                            declViewModel, uwDataProvider.viewModelCollection.getLoadedViewModelObjects(),
                            pciBeforeConfigurationChange, newlyLoadedNodes, pciAfterConfigurationChange );
                    }
                }

                if( treeLoadInput.gridOptions ) {
                    treeLoadInput.gridOptions.enableSorting = occmgmtUtils.isSortingSupported( contextState );
                    treeLoadInput.gridOptions.enableExpansionStateCaching =  !aceRestoreBWCStateService.isRestoreOptionApplicable( treeLoadInput, treeLoadResult, contextState.context.currentState.uid );
                }

                return {
                    treeLoadResult: treeLoadResult
                };
            }
        } );
} // _loadTreeTableNodes

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} loadIDs IDs to be loaded
 */
function _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput ) {
    /**
     * Since we are 'selecting' the 'opened' node. We want to make sure the 'opened' node is
     * expanded.
     */
    treeLoadInput.expandParent = true;
    var loadIDs = treeLoadInput.loadIDs;

    if ( treeLoadInput.openOrUrlRefreshCase ) {
        //All uids i.e. top occurrence, opened occurrence and selected occurrence are same
        if( _.isEqual( loadIDs.t_uid, loadIDs.o_uid ) && _.isEqual( loadIDs.o_uid, loadIDs.c_uid ) ) {
            treeLoadInput.parentElement = loadIDs.t_uid;
        }
    }

    /**
     * Check if the 'parent' has already been loaded
     */
    var oUidObject = cdmSvc.getObject( loadIDs.o_uid );
    var grandParentUid = occmgmtUtils.getParentUid( oUidObject );

    if( grandParentUid ) {
        treeLoadInput.parentElement = grandParentUid;
        populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, oUidObject );
    }
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} loadIDs IDs to be loaded
 */
function _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState ) {
    var oUidObject = cdmSvc.getObject( loadIDs.o_uid );
    var grandParentUid = occmgmtUtils.getParentUid( oUidObject );

    if( cdmSvc.isValidObjectUid( grandParentUid ) ) {
        treeLoadInput.parentElement = grandParentUid;
        populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, oUidObject );
    } else {
        treeLoadInput.parentElement = loadIDs.o_uid;
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 * @param {*} loadIDs IDs to be loaded
 * @param {*} newSortCriteria sortCriteria passed in argument input
 */
function _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria ) {
    if( treeLoadInput.parentNode.levelNdx === -1 ) {
        treeLoadInput.isTopNode = true;
        treeLoadInput.loadIDs = _getTreeNodeIdsToBeLoaded( loadIDs, contextState );
        treeLoadInput.topUid = treeLoadInput.loadIDs.t_uid ? treeLoadInput.loadIDs.t_uid : treeLoadInput.loadIDs.o_uid;
        treeLoadInput.parentElement = cdmSvc.NULL_UID;
    }

    if( _.isEmpty( contextState.context.previousState ) ) {
        treeLoadInput.openOrUrlRefreshCase = 'open';
        if ( !_.isEmpty( contextState.context.currentState.pci_uid ) ) {
            if ( _.isUndefined( appCtxSvc.ctx.aceSessionInitalized ) ) {
               treeLoadInput.openOrUrlRefreshCase = 'urlRefresh';
           } else {
               treeLoadInput.openOrUrlRefreshCase = 'backButton';
           }
        }
        appCtxSvc.ctx.aceSessionInitalized = true;

        treeLoadInput.isProductInteracted = aceRestoreBWCStateService.isProductInteracted( contextState.context.currentState.uid );
        if( !_.isEqual( treeLoadInput.openOrUrlRefreshCase, 'urlRefresh' ) && !treeLoadInput.isProductInteracted ) {
         contextState.context.transientRequestPref.savedSessionMode = [ 'ignore' ];
       }
    }
    _populateRetainExpansionStatesParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria );
    _populateSortCriteriaParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria );
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 * @param {*} loadIDs IDs to be loaded
 * @param {*} topUid topUid
 */
function _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput  ) {
    var loadIDs = treeLoadInput.loadIDs;
    if( _.isEqual( loadIDs.c_uid, loadIDs.o_uid ) ) {
        treeLoadInput.expandParent = true;
    }
    if( _.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
        treeLoadInput.parentElement = treeLoadInput.topUid;
    }
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 */
function _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState ) {
    if( contextState.context.requestPref.resetTreeDisplay || !_.isEmpty( contextState.context.configContext ) ) {
        if( treeLoadInput.parentNode.cursorObject && treeLoadInput.parentNode.cursorObject.endIndex ) {
            treeLoadInput.parentNode.cursorObject.endIndex = 0;
        }
        treeLoadInput.startChildNdx = 0;
    }
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 *
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _doTreeTableLoad( treeLoadInput, uwDataProvider, declViewModel, contextState, soaInput ) {
    var loadIDs = treeLoadInput.loadIDs;

    if( contextState.context.expansionCriteria && contextState.context.expansionCriteria.expandBelow ) {
        treeLoadInput.parentElement = contextState.context.currentState.o_uid;
        contextState.context.expansionCriteria.scopeForExpandBelow = appCtxSvc.ctx.aceActiveContext.context.nodeUnderExpandBelow.uid;
        treeLoadInput.expandBelow = true;
        if( contextState.context.expandNLevel ) {
            treeLoadInput.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
            contextState.context.expansionCriteria.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
        }
    } //Move to populateExpandBelowParamsIfAppliacble()
    /*
     * loadTreeTableData() is calling this method with skipFocusOccurrenceCheck to true. So , logic to set
     * skipFocusOccurrenceCheck to true is commented as default value is true. Going forward , we should try to
     * get rid of this flag skipFocusOccurrenceCheck
     */

    /**
     * Determine what 'parent' we should tell 'occ6' to focus on.
     */
    else if( treeLoadInput.isTopNode ) {
        if( !treeLoadInput.cursorObject ) {
            soaInput.inputData.requestPref.includePath = [ 'true' ];
            soaInput.inputData.requestPref.loadTreeHierarchyThreshold = [ '50' ];
        } //This should move to _populateTreeLoadInputParamsForProvidedInput()

        /**
         * Check if a 'top' occurrence is set
         */
        if( treeLoadInput.topUid ) {
            /**
             * Check if no 'selected' (c_uid) occurrence OR it is the same as the, valid, 'parent' (o_uid) being
             * loaded.<BR>
             * If so: Find the 'grandparent' and make the 'parent' the focus of the query.
             * <P>
             * TODO: This is where 'includePath' can be used to avoid needing access to the 'grandParent' when
             * the SOA API change to support this is fully deployed.
             */
            if( _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) ) {
                if( _debug_logOccLoadActivity ) {
                    logger.info( '_doTreeTableLoad: Case #1: Focus on parent o_uid:' + loadIDs.o_uid );
                }

                _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput, loadIDs.o_uid );

                /**
                 * We need to load the 'parent' before we can know the 'grandparent'
                 */
                if( _.isEqual( treeLoadInput.parentElement, cdmSvc.NULL_UID ) ) {
                    if( cdmSvc.isValidObjectUid( loadIDs.c_uid ) ) {
                        treeLoadInput.skipFocusOccurrenceCheck = false;
                    }

                    return dataManagementSvc.loadObjects( [ loadIDs.o_uid ] ).then( function() {
                        return _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState );
                    } );
                }
            } else {
                /**
                 * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
                 * 'uid'. -- Need to check with use case is this.
                 */
                if( _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTableLoad: Case #2: Focus on parent o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.c_uid );
                    }

                    _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput );

                    /**
                     * Check for case of the 'top' is selected<BR>
                     * If so: Just treat it as a normal 'top' expansion<BR>
                     * If not: Trust that the 'o_uid' is the immediate parent of the 'c_uid'.
                     */
                    if( !_.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
                        treeLoadInput.parentElement = loadIDs.o_uid; //already set above?
                        var cUidObject = cdmSvc.getObject( loadIDs.c_uid );

                        treeLoadInput.isFocusedLoad = true;

                        if( cUidObject ) {
                            if( !cdmSvc.isValidObjectUid( treeLoadInput.parentElement ) ) {
                                treeLoadInput.parentElement = occmgmtUtils.getParentUid( cUidObject );
                            }
                        } else {
                            cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
                        }

                        /**
                         * Check if we are changing the configuration<BR>
                         * If so: We need to reset inputs as if we are loading for the first time
                         */
                        _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState );

                        if( !_.isEmpty( contextState.context.configContext ) ) {
                            treeLoadInput.skipFocusOccurrenceCheck = false;
                        }

                        soaInput.inputData.focusOccurrenceInput.element = cUidObject;
                    }

                    if( _debug_logOccLoadActivity ) {
                        logger.info( //
                            '_doTreeTableLoad: treeLoadInput:' + JSON.stringify( treeLoadInput, //
                                [ 'parentElement', 'cursorObject', 'isFocusedLoad', 'skipFocusOccurrenceCheck' ], 2 ) +
                            '\n' + 'soaInput.inputData.focusOccurrenceInput:' + '\n' +
                            JSON.stringify( soaInput.inputData.focusOccurrenceInput, [ 'element' ], 2 ) );
                    }
                } else {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTableLoad: Case #3: Focus on top o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.c_uid );
                    }

                    treeLoadInput.skipFocusOccurrenceCheck = false;
                    treeLoadInput.parentElement = treeLoadInput.topUid;
                }
            }
        } else {
            treeLoadInput.parentElement = cdmSvc.NULL_UID;
        }
    } else {
        /**
         * Assume the 'parent' node UID is good for the loading
         */
        treeLoadInput.parentElement = treeLoadInput.parentNode.uid;

        /**
         * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the 'uid'.
         */
        if( loadIDs && _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
            if( _debug_logOccLoadActivity ) {
                logger.info( '_doTreeTableLoad: Case #4: Focus on placeholder o_uid:' + loadIDs.o_uid //
                    +
                    ' c_uid: ' + loadIDs.c_uid );
            }

            cUidObject = cdmSvc.getObject( loadIDs.c_uid );

            if( cUidObject ) {
                if( !cdmSvc.isValidObjectUid( treeLoadInput.parentElement ) ) {
                    treeLoadInput.parentElement = occmgmtUtils.getParentUid( cUidObject );
                }
            } else {
                cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
            }

            soaInput.inputData.focusOccurrenceInput.element = cUidObject;
        }
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
} // _doTreeTableLoad

function populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, focusObject ) {
    if( !treeLoadInput.skipFocusOccurrenceCheck ) {
        treeLoadInput.isFocusedLoad = true;
        soaInput.inputData.focusOccurrenceInput.element = focusObject;
    }
}

/**
 * @param {TreeLoadInput} loadIDs - Parameters for the operation.
 * @return {boolean} true if condition is met
 */
function _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) {
    return cdmSvc.isValidObjectUid( loadIDs.o_uid ) && ( !loadIDs.c_uid || cdmSvc.isValidObjectUid( loadIDs.c_uid ) && loadIDs.c_uid === loadIDs.o_uid );
}

/**
 * @param {TreeLoadInput} loadIDs - Parameters for the operation.
 * @return {boolean} true if condition is met
 */
function _areLoadIDsAndOpenedObjectDifferent( loadIDs ) {
    /**
     * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
     * 'uid'.
     */
    return cdmSvc.isValidObjectUid( loadIDs.o_uid ) && cdmSvc.isValidObjectUid( loadIDs.c_uid ) && loadIDs.o_uid !== loadIDs.uid && loadIDs.c_uid !== loadIDs.uid;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 *
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _doTreeTablePage( treeLoadInput, uwDataProvider, declViewModel, contextState, soaInput ) {
    var loadIDs = treeLoadInput.loadIDs;

    /**
     * Determine what 'parent' we should tell 'occ6' to focus on.
     */
    if( treeLoadInput.isTopNode ) {
        soaInput.inputData.requestPref.includePath = [ 'true' ];

        /**
         * Check if a 'top' occurrence is set
         */
        if( treeLoadInput.topUid ) {
            /**
             * Check if no 'selected' (c_uid) occurrence OR it is the same as the, valid, 'parent' (o_uid) being
             * loaded.<BR>
             * If so: Find the 'grandparent' and make the 'parent' the focus of the query.
             * <P>
             * TODO: This is where 'includePath' can be used to avoid needing access to the 'grandParent' when
             * the SOA API change to support this is fully deployed.
             */
            if( _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) ) {
                if( _debug_logOccLoadActivity ) {
                    logger.info( '_doTreeTablePage: Case #1: Focus on parent o_uid:' + loadIDs.o_uid );
                }

                _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput, loadIDs.o_uid );

                /**
                 * If parent is emtpy , we need to load the 'parent' before we can know the 'grandparent'
                 */
                if( _.isEqual( treeLoadInput.parentElement, cdmSvc.NULL_UID ) ) {
                    return dataManagementSvc.loadObjects( [ loadIDs.o_uid ] ).then( function() {
                        return _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState );
                    } );
                }
            } else {
                /**
                 * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
                 * 'uid'.
                 */
                if( _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTablePage: Case #2: Focus on parent o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.o_uid );
                    }

                    _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput );

                    /**
                     * Check for case of the 'top' is selected<BR>
                     * If so: Just treat it as a normal 'top' expansion<BR>
                     * If not: Trust that the 'o_uid' is the immediate parent of the 'c_uid'.
                     */
                    if( !_.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
                        treeLoadInput.parentElement = loadIDs.o_uid; //already set above?
                        var cUidObject = cdmSvc.getObject( loadIDs.c_uid );

                        if( cUidObject ) {
                            var parentElement = occmgmtUtils.getParentUid( cUidObject );

                            if( cdmSvc.isValidObjectUid( parentElement ) ) {
                                treeLoadInput.parentElement = parentElement;
                            }

                            populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, cUidObject );
                        } else {
                            cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
                        }

                        /**
                         * Check if we are changing the configuration<BR>
                         * If so: We need to reset inputs as if we are loading for the first time
                         */
                        _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState );
                    }

                    if( _debug_logOccLoadActivity ) {
                        logger.info( //
                            '_doTreeTablePage: treeLoadInput:' + JSON.stringify( treeLoadInput, //
                                [ 'parentElement', 'cursorObject', 'isFocusedLoad', 'skipFocusOccurrenceCheck' ], 2 ) +
                            '\n' + 'soaInput.inputData.focusOccurrenceInput:' + '\n' +
                            JSON.stringify( soaInput.inputData.focusOccurrenceInput, [ 'element' ], 2 ) );
                    }
                } else {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTablePage: Case #3: Focus on top o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.o_uid );
                    }

                    treeLoadInput.parentElement = treeLoadInput.topUid;
                }
            }
        }
    } else {
        treeLoadInput.parentElement = treeLoadInput.parentNode.uid;
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
} // __doTreeTablePage

/**
 *
 *
 */
export let updateColumnPropsAndNodeIconURLs = function( propColumns, occurrenceNodes, contextKey ) {
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };
    var firstColumnConfigColumn = _.filter( propColumns, function( col ) { return _.isUndefined( col.clientColumn ); } )[0];
    var sortingSupported = occmgmtUtils.isSortingSupported( contextState );
    if( !sortingSupported ) {
        appCtxSvc.updatePartialCtx( contextKey + '.sortCriteria', null );
    }

    // first column is special here
    if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' || appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ) {
        firstColumnConfigColumn.isTreeNavigation = true;
        firstColumnConfigColumn.enableColumnHiding = false;
    } else if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TableSummaryView' || appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TableView' ) {
        firstColumnConfigColumn.isTableCommand = true;
    }

    _.forEach( propColumns, function( col ) {
        if( !col.typeName && col.associatedTypeName ) {
            col.typeName = col.associatedTypeName;
            col.enableSorting = sortingSupported;

            var vmpOfColumnProp = occurrenceNodes[ 0 ].props[ col.propertyName ];

            //Disable Sorting on DCP property
            if( vmpOfColumnProp && vmpOfColumnProp.isDCP ) {
                col.enableSorting = false;
            }

            var sortCriteria = appCtxSvc.getCtx( contextKey ).sortCriteria;
            if( !_.isEmpty( sortCriteria ) ) {
                if( sortCriteria[ 0 ].fieldName && _.eq( col.propertyName, sortCriteria[ 0 ].fieldName ) ) {
                    col.sort = {};
                    col.sort.direction = sortCriteria[ 0 ].sortDirection.toLowerCase();
                    col.sort.priority = 0;
                }
            }
        }
    } );

    firstColumnConfigColumn.enableColumnMoving = false;
    _firstColumnConfigColumnPropertyName = firstColumnConfigColumn.propertyName;

    // We got awb0ThumbnailImageTicket for nodes in SOA response. Update icon URL for all Nodes
    _.forEach( occurrenceNodes, function( childNode ) {
        childNode.iconURL = occmgmtIconSvc.getIconURL( childNode );
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnConfigColumnPropertyName );
    } );

    if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
        exports.updateDisplayNames( { viewModelObjects: appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects } );
    }
    occmgmtCellRenderingService.addCellClass( propColumns );
    occmgmtCellRenderingService.setOccmgmtCellTemplate( propColumns );
};

/**
 *
 */
function _resetContextState( contextKey ) {
    appCtxSvc.ctx[ contextKey ].retainTreeExpansionStates = false;
    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', false );
    appCtxSvc.ctx[ contextKey ].transientRequestPref = {};
    delete appCtxSvc.ctx[ contextKey ].retainTreeExpansionStateInJitterFreeWay;
}

/**
 *
 */
function _populateRetainExpansionStatesParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria ) {
    treeLoadInput.retainTreeExpansionStates = false;

    //Retain expansion states if specified on context.
    if( contextState.context.retainTreeExpansionStates ) {
        treeLoadInput.retainTreeExpansionStates = true;
    }

    //Retain expansion states when sort criteria has changed.
    var currentSortCriteria = appCtxSvc.getCtx( contextState.key ).sortCriteria;
    if( newSortCriteria ) {
        if( !_.eq( newSortCriteria, currentSortCriteria ) ) {
            treeLoadInput.retainTreeExpansionStates = true;
        }
    }
}

/**
 *
 */
function _populateSortCriteriaParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria ) {
    var currentSortCriteria = appCtxSvc.getCtx( contextState.key ).sortCriteria;
    if( newSortCriteria ) {
        if( !_.eq( newSortCriteria, currentSortCriteria ) ) {
            treeLoadInput.retainTreeExpansionStates = true;
            treeLoadInput.sortCriteriaChanged = true;
            appCtxSvc.updatePartialCtx( contextState.key + '.sortCriteria', newSortCriteria );
        }
    }

    treeLoadInput.sortCriteria = appCtxSvc.getCtx( contextState.key ).sortCriteria;
}

/**
 *
 */
function _populateClearExistingSelectionsParameterForProvidedInput( treeLoadInput, contextState ) {
    var clearExistingSelections = appCtxSvc.getCtx( contextState.key ).clearExistingSelections;

    if( clearExistingSelections || !_.isEmpty( contextState.context.configContext ) ) {
        treeLoadInput.clearExistingSelections = true;
        appCtxSvc.updatePartialCtx( contextState.key + '.clearExistingSelections', false );
    }
}

/**
 *
 */
function _updateContextStateOnUrlRefresh( treeLoadInput, contextState ) {
    //If previous state is empty, that means it is open case/url refresh case
    if( treeLoadInput.openOrUrlRefreshCase ) {
        if( !_.isEmpty( contextState.context.currentState.incontext_uid ) ) {
            contextState.context.currentState.c_uid = contextState.context.currentState.incontext_uid;
        }
    }
}

/**
 *
 */
function _updateTreeLoadInputParameterForResetAction( treeLoadInput, contextState ) {
    var requestPref = appCtxSvc.getCtx( contextState.key ).requestPref;
    var isResetActionInProgress = requestPref && _.isEqual( requestPref.savedSessionMode, 'reset' );

    //When reset is done and UID of rootNode doesn't change, Tree widget doesn't populate children property.
    //Re-setting parentNode UID info to what it was when we open structure (state.uid ) helps. Correct way
    //to fix this is refactor dataProviderFactory processTreeNodes logic.
    if( isResetActionInProgress ) {
        treeLoadInput.parentNode.uid = contextState.context.currentState.uid;
        appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState = true;
        treeLoadInput.isResetRequest = true;
    }
}

/**
 *
 */
function _getTreeNodeIdsToBeLoaded( loadIDs, contextState ) {
    if( !loadIDs ) {
        return {
            t_uid: contextState.context.currentState.t_uid,
            o_uid: contextState.context.currentState.o_uid,
            c_uid: contextState.context.currentState.c_uid,
            uid: contextState.context.currentState.uid
        };
    }
    return loadIDs;
}

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @param {Object} columnProvider:
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider, columnProvider ) {
    var deferred = AwPromiseService.instance.defer();
    var awColumnInfos = [];
    var firstColumnConfigCol = {
        name: 'object_string',
        displayName: '...',
        typeName: 'Awb0Element',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false,
        columnOrder: 100
    };

    var clientColumns = columnProvider && columnProvider.clientColumns ? columnProvider.clientColumns : [];
    if( clientColumns ) {
        _.forEach( clientColumns, function( column ) {
            if( column.clientColumn ) {
                awColumnInfos.push( column );
            }
        } );
    }

    awColumnInfos.push( firstColumnConfigCol );
    awColumnInfos = _.sortBy( awColumnInfos, function( column ) { return column.columnOrder; } );

    occmgmtCellRenderingService.setOccmgmtCellTemplate( awColumnInfos );

    var sortCriteria = appCtxSvc.ctx.aceActiveContext.context.sortCriteria;
    if( !_.isEmpty( sortCriteria ) ) {
        if( sortCriteria[ 0 ].fieldName && _.eq( awColumnInfos[ 0 ].name, sortCriteria[ 0 ].fieldName ) ) {
            awColumnInfos[ 0 ].sort = {};
            awColumnInfos[ 0 ].sort.direction = sortCriteria[ 0 ].sortDirection.toLowerCase();
            awColumnInfos[ 0 ].sort.priority = 0;
        }
    }

    awColumnSvc.createColumnInfo( awColumnInfos );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {TreeLoadInput} treeLoadInput - An Object with details for this action for what to load. The object is
 * usually the result of processing the 'inputData' property of a DeclAction based on data from the current
 * DeclViewModel on the $scope). The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 *
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].treeLoadInput, 'Missing argument property' );
    assert( arguments[ 0 ].contextKey, 'Missing argument property : contextKey' );

    var treeLoadInput = arguments[ 0 ].treeLoadInput;
    var loadIDs = arguments[ 0 ].loadIDs;
    var gridOptions = arguments[ 0 ].gridOptions;
    var contextKey = arguments[ 0 ].contextKey;
    var dataProvider = arguments[ 0 ].uwDataProvider;
    var declViewModel = arguments[ 0 ].declViewModel;
    var newSortCriteria = arguments[ 0 ].sortCriteria;
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };

    treeLoadInput.dataProviderActionType = !_.isUndefined( arguments[0].dataProviderActionType ) ? arguments[0].dataProviderActionType : 'initializeAction';

    /**purpose of skipFocusOccurrenceCheck flag is to not pass selection to server when one object is selected and other is expanded.
     * Setting this to true makes sense only in that scenario.
     *
     * One more scenario is loading of placeHolder parent. In that case, skipFocusOccurrenceCheck should be true.
     */

    if( loadIDs && loadIDs.c_uid ) {
        var objNdx = dataProvider.viewModelCollection.findViewModelObjectById( loadIDs.c_uid );
        var vmNode = dataProvider.viewModelCollection.getViewModelObject( objNdx );

        /**isPlaceholder / _focusRequested property on vmNode indicates that it is placeHolder node. This is not actual focus
         * object. But passed as focus object to load that particular incomplete level in client. So set skipFocusOccurrenceCheck to true.
         **/
        if( vmNode && vmNode._focusRequested ) {
            treeLoadInput.skipFocusOccurrenceCheck = true;
        }
    }

    _populateClearExistingSelectionsParameterForProvidedInput( treeLoadInput, contextState );
    _updateTreeLoadInputParameterForResetAction( treeLoadInput, contextState );

    treeLoadInput.gridOptions = gridOptions;

    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', true );

    // When changing configuration we need to send list of expanded nodes to server
    if( !_.isEmpty( contextState.context.configContext ) ||  _.isEqual( contextState.context.retainTreeExpansionStateInJitterFreeWay, true ) ) {
        contextState.context.requestPref.expandedNodes = occmgmtTreeTableStateService.getCSIDChainsForExpandedNodes( dataProvider );
        delete contextState.context.retainTreeExpansionStateInJitterFreeWay;
    }

    _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria );
    _updateContextStateOnUrlRefresh( treeLoadInput, contextState );


    /**
     * Get the 'child' nodes async
     */
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    return _doTreeTableLoad( treeLoadInput, dataProvider, declViewModel, contextState, soaInput );
};

/*
* Method registered against focusAction in viewModel json.
* But currently this is not honored in Apollo. So, have kept this commented.
*/
export let loadOccurrencesWithFocusInTreeTable = function() {
    return exports.loadTreeTableData( arguments[0] );
};

/*
* Method registered against nextAction in viewModel json
*/
export let loadNextOccurrencesInTreeTable = function() {
    return exports.loadTreeTableDataPage( arguments[0] );
};

/*
* Method registered against previousAction in viewModel json
*/
export let loadPreviousOccurrencesInTreeTable = function() {
    return exports.loadTreeTableDataPage( arguments[0] );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {TreeLoadInput} treeLoadInput - An Object with details for this action for what to load. The object is
 * usually the result of processing the 'inputData' property of a DeclAction based on data from the current
 * DeclViewModel on the $scope). The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 *
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableDataPage = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].treeLoadInput, 'Missing argument property' );
    assert( arguments[ 0 ].contextKey, 'Missing argument property : contextKey' );

    var treeLoadInput = arguments[ 0 ].treeLoadInput;
    //var loadIDs = arguments[ 0 ].loadIDs;
    var loadIDs = null; //for focus action to work in _doTreeTablePage(), this has to be null.
    var gridOptions = arguments[ 0 ].gridOptions;
    var contextKey = arguments[ 0 ].contextKey;
    var dataProvider = arguments[ 0 ].uwDataProvider;
    var newSortCriteria = arguments[ 0 ].sortCriteria;
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };

    if( ( contextState.context.expansionCriteria.expandBelow || treeLoadInput.parentNode.isInExpandBelowMode ) && _.isEmpty( contextState.context.configContext ) ) {
        contextState.context.expansionCriteria.expandBelow = 'true';
        contextState.context.expansionCriteria.loadTreeHierarchyThreshold = '500';
        contextState.context.expansionCriteria.scopeForExpandBelow = appCtxSvc.ctx.aceActiveContext.context.nodeUnderExpandBelow.uid;
        treeLoadInput.expandBelow = true;
        if( contextState.context.expandNLevel ) {
            treeLoadInput.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
            contextState.context.expansionCriteria.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
        }
    }

    treeLoadInput.gridOptions = gridOptions;

    /*
     * This method is called in following scenarios : a) Object is added into selection,it is not displayed
     * currently in tree , needs to be fetched from server and focused. In this case, skipFocusOccurrenceCheck
     * should not be true so that focus occurrence is passed to server and it get focused after server response (
     * in case of 4G , different object comes from server) b) When Tree Node is expanded. In this case,
     * skipFocusOccurrenceCheck should be true so that current focus occurrence is not passed to server. Server
     * returns data based on parent of focus occurrence
     */
    if( treeLoadInput.parentNode ) {
        if( treeLoadInput.parentNode.isExpanded ) {
            //TreeNode expansion scenario
            treeLoadInput.skipFocusOccurrenceCheck = true;
            //We need loadIDs from data provider only in "Expand Node" use case. Otherwise, loadIDs
            //information is there on URL.
            loadIDs = arguments[ 0 ].loadIDs;

            if( contextState.context.elementToPCIMap ) {
                if( treeLoadInput.parentNode.pciUid ) {
                    treeLoadInput.pci_uid = treeLoadInput.parentNode.pciUid;
                } else {
                    treeLoadInput.pci_uid = occmgmtUtils.getProductContextForProvidedObject( treeLoadInput.parentNode );
                }
            }
        }
    }

    /*
     *For Load Next / Load Previous case , we need to skip focus occurrence. These flag population conditions
     *are technical debts which should get cleaned up with LCS-145929
     */
    if( treeLoadInput.cursorNodeId ) {
        var objNdx = dataProvider.viewModelCollection.findViewModelObjectById( treeLoadInput.cursorNodeId );
        var vmNode = dataProvider.viewModelCollection.getViewModelObject( objNdx );

        if( vmNode._loadTailRequested || vmNode._loadHeadRequested ) {
            treeLoadInput.skipFocusOccurrenceCheck = true;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', true );
    _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria );

    /**
     * Get the 'child' nodes async
     */
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    // When focus load action triggered we need to send list of expanded nodes to server
    // Applications can consume expanded nodes information as needed
    if( treeLoadInput.focusLoadAction ) {
        contextState.context.requestPref.expandedNodes = occmgmtTreeTableStateService.getCSIDChainsForExpandedNodes( dataProvider );
        soaInput.inputData.requestPref.loadTreeHierarchyThreshold = [ '50' ];
    }

    return _doTreeTablePage( treeLoadInput, arguments[ 0 ].uwDataProvider, arguments[ 0 ].declViewModel, contextState, soaInput );
};

/**
 * Get a object containing callback function.
 * @return {Object} A object containing callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function( propColumns, allChildNodes, contextKey, response, uwDataProvider ) {
        var columnConfigResult = null;
        let clientColumns = uwDataProvider && !_.isEmpty( uwDataProvider.cols ) ? _.filter( uwDataProvider.cols, { clientColumn: true } ) : [];
        propColumns = clientColumns.length > 0 ? _.concat( clientColumns, propColumns ) : propColumns;
        exports.updateColumnPropsAndNodeIconURLs( propColumns, allChildNodes, contextKey );

        let columnsConfig = response.output.columnConfig;
        columnsConfig.columns = _.sortBy( propColumns, function( column ) { return column.columnOrder; } );
        columnConfigResult = columnsConfig;

        _resetContextState( contextKey );
        return columnConfigResult;
    };

    return updateColumnPropsCallback;
}

/**
 * Get a page of row column data for a tree-table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {PropertyLoadInput} propertyLoadInput - (found within the 'arguments' property passed to this function) The
 * PropertyLoadInput contains an array of PropertyLoadRequest objects this action function is invoked to
 * resolve.
 *
 * @return {Promise} A Promise resolved with a 'PropertyLoadResult' object containing the details of the result.
 */
export let loadTreeTableProperties = function() {
    arguments[ 0 ].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTableProperties( arguments[ 0 ] ) );
};

export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( vmNodes, declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback ) );
};

export let getContextKeyFromParentScope = function( parentScope ) {
    return contextStateMgmtService.getContextKeyFromParentScope( parentScope );
};

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * eventData : {Object} containing viewModelObjects and totalObjectsFound
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnConfigColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnConfigColumnPropertyName );
            } );
        } );
    }
};

/**
 * Process the viewModelCollectionEvent
 *
 * @param {Object} event The viewModelCollectionEvent
 */
export let processViewModelCollectionEvent = function( event ) {
    if( event.vmc ) {
        var treeNodesToRemove = [];
        _.forEach( event.modifiedObjects, function( mo ) {
            _.forEach( event.vmc.loadedVMObjects, function( vmo ) {
                if( mo.uid === vmo.uid ) {
                    //Update the display name
                    treeTableDataService.updateVMODisplayName( vmo, _firstColumnConfigColumnPropertyName );

                    // Understand the if the node is leaf or not
                    var numChildren = 0;
                    if( mo.props && mo.props.awb0NumberOfChildren &&
                        mo.props.awb0NumberOfChildren.dbValues &&
                        mo.props.awb0NumberOfChildren.dbValues.length ) {
                        numChildren = parseInt( mo.props.awb0NumberOfChildren.dbValues[ 0 ] );
                    }

                    //update children status
                    if( vmo.isLeaf !== ( numChildren === 0 ) ) {
                        vmo.isLeaf = numChildren === 0;
                        if( vmo.isLeaf && vmo.children && vmo.children.length > 0 ) {
                            treeNodesToRemove = treeNodesToRemove.concat( vmo.children );
                            vmo.children = [];
                            vmo.expanded = false;
                        }
                    }
                }
            } );
        } );

        if( treeNodesToRemove && treeNodesToRemove.length > 0 ) {
            event.vmc.removeLoadedObjects( treeNodesToRemove );
        }
    }
};

/**
 * @param {Object} loadedVMObjects all loaded view model objects whose visibility to be populated
 */
export let setOccVisibility = function( loadedVMObjects, contextKey, gridId ) {
    let viewKey = contextKey ? contextKey : appCtxSvc.ctx.aceActiveContext.key;
    let visibilityControlsCurrentValue = appCtxSvc.getCtx( viewKey + '.visibilityControls' );


    if( _.isArray( loadedVMObjects ) ) {
        var visibilityChangedVmos = [];
        _.forEach( loadedVMObjects, function( target ) {
            var originalVisibility = target.visible;
            target.visible = occmgmtVisibilityService.getOccVisibility( cdmSvc.getObject( target.uid ), viewKey );
            if( originalVisibility !== target.visible ) {
                visibilityChangedVmos.push( target );
            }
        } );

        let visibilityControlsNewValue = appCtxSvc.getCtx( viewKey + '.visibilityControls' );

        if( visibilityChangedVmos.length || !_.isEqual( visibilityControlsCurrentValue, visibilityControlsNewValue  ) ) {
            //event should also take visibilityStateChangedVMOs and update process only this.
            eventBus.publish( gridId + '.plTable.visibilityStateChanged' );
        }
    }
};

export let initialize = function() {
    _pciToExpandedNodesStableIdsMap = {};
    _expandedNodes = {};
    if( appCtxSvc.ctx.expandedNodes ) {
        _expandedNodes.nodes = _.cloneDeep( appCtxSvc.ctx.expandedNodes );
        delete appCtxSvc.ctx.expandedNodes;
    }
};

export let destroy = function() {
    _pciToExpandedNodesStableIdsMap = {};
    _.keys( _expandedNodes ).map( function( key ) {
        delete _expandedNodes[ key ];
    } );
    _expandedNodes = {};
};

export let retainCurrentExpansionState = function() {
    var expandedNodes = appCtxSvc.ctx.aceActiveContext.context.vmc.getLoadedViewModelObjects().filter( function( node ) {
        return node.isExpanded === true;
    } );
    appCtxSvc.ctx.expandedNodes = expandedNodes;
};

export let updateOccMgmtTreeTableColumns = function( data, dataProvider ) {
    if( dataProvider && data.newColumnConfig ) {
        var propColumns = data.newColumnConfig.columns;
        var context = appCtxSvc.ctx.aceActiveContext.key;
        let clientColumns = !_.isEmpty( dataProvider.cols ) ? _.filter( dataProvider.cols, { clientColumn: true } ) : [];
        propColumns = clientColumns.length > 0 ? _.concat( clientColumns, propColumns ) : propColumns;
        exports.updateColumnPropsAndNodeIconURLs( propColumns, dataProvider.getViewModelCollection().getLoadedViewModelObjects(), context );
        data.newColumnConfig.columns = propColumns;
        dataProvider.columnConfig = data.newColumnConfig;
    }
};

/**
 * In case of Saved Working Context in Tree view it can happen so that filter is applied to multiple products.<br>
 * The URL will have filter information only for the active product.<br>
 * If a non-active product is being expanded we check if its information is available in the cache and use it
 */
function updateFilterParamsOnInputForCurrentPciUid( currentPciUid, contextState ) {
    if( !contextState.context.requestPref.calculateFilters ) {
        return structureFilterService
            .computeFilterStringForNewProductContextInfo( currentPciUid );
    }
    return null;
}

var urlAttrs = browserUtils.getUrlAttributes();
_debug_logOccLoadActivity = urlAttrs.logOccLoadActivity !== undefined;

export default exports = {
    updateColumnPropsAndNodeIconURLs,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableDataPage,
    loadOccurrencesWithFocusInTreeTable,
    loadNextOccurrencesInTreeTable,
    loadPreviousOccurrencesInTreeTable,
    loadTreeTableProperties,
    loadTreeTablePropertiesOnInitialLoad,
    getContextKeyFromParentScope,
    updateDisplayNames,
    processViewModelCollectionEvent,
    setOccVisibility,
    initialize,
    destroy,
    retainCurrentExpansionState,
    updateOccMgmtTreeTableColumns
};
/**
 * @memberof NgServices
 * @member occmgmtTreeTableDataService
 */
app.factory( 'occmgmtTreeTableDataService', () => exports );
