// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/AMBreakdownNavigationTreeService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import treeTableDataService from 'js/treeTableDataService';
import cdm from 'soa/kernel/clientDataModel';
import awColumnSvc from 'js/awColumnService';
import awIconService from 'js/awIconService';
import AMBreakdownNavigationService from 'js/AMBreakdownNavigationService';
import AwStateService from 'js/awStateService';
import assert from 'assert';
import _ from 'lodash';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';

import 'js/tcViewModelObjectService';

var exports = {};
var _firstColumnPropertyName = null;

var policyIOverride = {
    types: [ {
        name: 'Clr0ProductAppBreakdown',
        properties: [ {
                name: 'clr0ChildAppAreaBreakdown'
            }
        ]
    },
    {
        name: 'Clr0AppearanceAreaBreakdown',
        properties: [ {
                name: 'clr0ChildAppAreas'
            },
            {
                name: 'clr0ChildAppAreaBreakdown'
            },
            {
                name: 'clr0Children'
            },
            {
                name: 'clr0PABRoot'
            }
        ]
    },
    {
        name: 'Clr0AppearanceArea',
        properties: [ {
                name: 'clr0ChildAppDesignators'
            },
            {
                name: 'clr0PABRoot'
            }
        ]
    },
    {
        name: 'WorkspaceObject',
        properties: [ {
                name: 'object_string'
            },
            {
                name: 'object_name'
            }

        ]
    },
    {
        name: 'Folder',
        properties: [ {
            name: 'awp0HasChildren'
        } ]
    }
 ]
};

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [ {
        name: 'object_name',
        displayName: '...',
        typeName: 'WorkspaceObject',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false
    } ];

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
 * Create Callback function.
 *
 * @return {Object} A Object consisting of callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function( propColumns, allChildNodes, contextKey, response ) {
        _.forEach( propColumns, function( col ) {
            if( !col.typeName && col.associatedTypeName ) {
                col.typeName = col.associatedTypeName;
            }
        } );
        propColumns[ 0 ].enableColumnMoving = false;
        _firstColumnPropertyName = propColumns[ 0 ].propertyName;

        _.forEach( allChildNodes, function( childNode ) {
            childNode.iconURL = awIconService.getTypeIconFileUrl( childNode );
            treeTableDataService.updateVMODisplayName( childNode, _firstColumnPropertyName );
        } );

        return response.output.columnConfig;
    };

    return updateColumnPropsCallback;
}

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * @param {Object} eventData Contains viewModelObjects and modifiedObjects
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnPropertyName );
            } );
        } );
    }
};

/**
 * Process tree table properties for initial load.
 *
 * @param {Object} vmNodes loadedVMObjects for processing properties on initial load.
 * @param {Object} declViewModel data object.
 * @param {Object} uwDataProvider data provider object.
 * @param {Object} context context object required for SOA call.
 * @param {String} contextKey contextKey string for context retrieval.
 * @return {Promise} promise A Promise containing the PropertyLoadResult.
 */
export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( vmNodes, declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback ) );
};

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

export let loadTreeTableData = function( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) {
    assert( searchInput, 'Missing search input' );
    assert( treeLoadInput, 'Missing tree load input' );

    treeLoadInput.displayMode = 'Tree';

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    return AwPromiseService.instance.resolve( _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) );
};

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Promise} A Promise resolved with a 'TreeLoadResult' object containing the details of the result.
 */
function _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput ) {
    var target = {};
    var soaSearchInput = searchInput;
    var parentNode = treeLoadInput.parentNode;
    var treeLoadOutput = {};

    if( !parentNode.isExpanded ) {
        target.uid = AwStateService.instance.params.uid;
    } else {
        target.uid = parentNode.uid;
        target.type = parentNode.type;
    }

    treeLoadInput.parentElement = target.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : target.uid;
    treeLoadInput.displayMode = 'Tree';
    soaSearchInput.searchCriteria.parentUid = treeLoadInput.parentElement;

    return getTableSummary( soaSearchInput, columnConfigInput, saveColumnConfigData ).then( function( response ) {
        var vmNodes = [];
        if( !parentNode.isExpanded ) {
            var emptyFolderOpened = _.isEmpty( response.searchResults ) && response.totalFound === 0;

            var rootPathNodes = _buildRootPath( cdm.getObject( target.uid ), !emptyFolderOpened, response.totalFound );

            if( rootPathNodes.length > 0 ) {
                treeLoadOutput.rootPathNodes = rootPathNodes;
                treeLoadOutput.newTopNode = _.first( treeLoadOutput.rootPathNodes );
            }
        }

        if( !emptyFolderOpened ) {
            if( response.searchResultsJSON ) {
                var searchResults = JSON.parse( response.searchResultsJSON );
                if( searchResults ) {
                    for( var x = 0; x < searchResults.objects.length; ++x ) {
                        var uid = searchResults.objects[ x ].uid;
                        var obj = cdm.getObject( uid );
                        if( obj ) {
                            vmNodes.push( obj );
                        }
                    }
                }
            }
        } else {
            vmNodes.push( _.first( rootPathNodes ) );
        }

        var treeLoadResult = exports.createTreeLoadResult( response, treeLoadInput, vmNodes );

        _.forEach( treeLoadOutput, function( value, name ) {
            if( !_.isUndefined( value ) ) {
                treeLoadResult[ name ] = value;
            }
        } );

        return AwPromiseService.instance.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } );
}

/**
 * Function
 *
 * @param {*} parentModelObj parentOccurrence of getOccurrences response
 * @param {*} addExtraTopNodeInRootPathHierarchy true if showTopNode is true
 * @param {*} totalFound totalFound for the expanded node
 * @returns{*} rootPath Hierarchy for given parentModelObj
 */
function _buildRootPath( parentModelObj, addExtraTopNodeInRootPathHierarchy, totalFound ) {
    /**
     * Determine the path to the 'root' occurrence IModelObject starting at the immediate 'parent' (t_uid)
     * object.
     */
    var rootPathNodes = [];
    var rootPathObjects = [];
    var pathModelObject = parentModelObj;

    if( pathModelObject ) {
        rootPathObjects.push( pathModelObject );

        if( addExtraTopNodeInRootPathHierarchy ) {
            rootPathObjects.push( pathModelObject );
        }
    }

    /**
     * Determine new 'top' node by walking back from bottom-to-top of the rootPathObjects and creating nodes to
     * wrap them.
     */
    var nextLevelNdx = -1;

    for( var ndx = rootPathObjects.length - 1; ndx >= 0; ndx-- ) {
        var currNode = createVMNodeUsingObjectInfo( rootPathObjects[ ndx ], 0, nextLevelNdx++ );
        var rootPathNodesLength = rootPathObjects.length - 1;
        /**
         * Note: We mark all necessary 'parent' path nodes as 'placeholders' so that we can find them later and
         * fill them out as needed (when they come into view)
         */
        var isPlaceholder = !( ndx === rootPathNodesLength || addExtraTopNodeInRootPathHierarchy && ndx === rootPathNodesLength - 1 );
        currNode.alternateID = getUniqueIdForEachNode( currNode );
        currNode.isExpanded = true;
        currNode.isPlaceholder = isPlaceholder;
        currNode.totalFound = totalFound;
        if( totalFound > 0 ) {
            currNode.isLeaf = false;
        }
        if( currNode.alternateID === AwStateService.instance.params.s_uid ) {
            appCtxSvc.updatePartialCtx( 'search.totalFound', currNode.totalFound );
        }
        rootPathNodes.push( currNode );
    }

    return rootPathNodes;
}

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Response} response A response object containing the details of the result.
 */
function getTableSummary( searchInput, columnConfigInput, saveColumnConfigData ) {
    if( cdm.getObject( searchInput.searchCriteria.parentUid ).type === 'Clr0ProductAppBreakdown' ) {
        searchInput.searchCriteria.objectSet = 'clr0ChildAppAreaBreakdown.Clr0AppearanceAreaBreakdown';
    } else if( cdm.getObject( searchInput.searchCriteria.parentUid ).type === 'Clr0AppearanceAreaBreakdown' ) {
        searchInput.searchCriteria.objectSet = 'clr0Children.WorkspaceObject';
    } else if( cdm.getObject( searchInput.searchCriteria.parentUid ).type === 'Clr0AppearanceArea' ) {
        searchInput.searchCriteria.objectSet = 'clr0ChildAppDesignators.Clr0AppearanceDesignator';
    }




    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: false,
            noServiceData: false
        }, policyIOverride )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                }

                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );

                //Sort by creation date if the context is set
                response.searchResults = AMBreakdownNavigationService.sortResults(
                    searchInput.searchCriteria.parentUid, response.searchResults );
                return response;
            } );
}

/**
 * Get created object. Return ItemRev if the creation type is Item.
 *
 * @param {Object} response the response of createRelateAndSubmitObjects SOA call
 * @param {Object} treeLoadInput the response of createRelateAndSubmitObjects SOA call
 * @param {Object} vmNodes objects to process ViewModelTreeNode
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
export let createTreeLoadResult = function( response, treeLoadInput, vmNodes ) {
    var endReachedVar = response.totalLoaded + treeLoadInput.startChildNdx === response.totalFound;
    var startReachedVar = true;

    var tempCursorObject = {
        endReached: endReachedVar,
        startReached: true
    };
    treeLoadInput.parentNode.totalFound = response.totalFound;
    var treeLoadResult = processProviderResponse( treeLoadInput, vmNodes, startReachedVar, endReachedVar );

    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    treeLoadResult.searchResults = response.searchResults;
    treeLoadResult.totalLoaded = response.totalLoaded;
    treeLoadResult.searchFilterCategories = response.searchFilterCategories;
    treeLoadResult.objectsGroupedByProperty = response.objectsGroupedByProperty;
    treeLoadResult.searchFilterMap6 = response.searchFilterMap6;

    return treeLoadResult;
};

/**
 * @param {TreeLoadInput} treeLoadInput - treeLoadInput Parameters for the operation.
 * @param {Object} searchResults - searchResults object processed from SOA call.
 * @param {Boolean} startReached - parameter for the operation.
 * @param {Boolean} endReached - parameter for the operation.
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
function processProviderResponse( treeLoadInput, searchResults, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];
    var vmNode;
    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];

        if( !awTableSvc.isViewModelTreeNode( object ) ) {
            vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );

            if( vmNode ) {
                vmNode.parentNode = parentNode;
                vmNode.alternateID = getUniqueIdForEachNode( vmNode );
                if( vmNode.alternateID === AwStateService.instance.params.s_uid ) {
                    appCtxSvc.updatePartialCtx( 'search.totalFound', vmNode.parentNode.totalFound );
                }
            }
        } else {
            vmNode = object;
        }
        vmNodes.push( vmNode );
    }

    // Third Paramter is for a simple vs ??? tree
    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, treeLoadInput.parentNode );

    return treeLoadResult;
}

/**
 * @param {Object} obj - object for creating view model tree node.
 * @param {int} childNdx - int value for child index.
 * @param {int} levelNdx - int value for level index.
 * @return {Object} vmNode A view model node object containing the details of the node.
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var hasChildren = containChildren( obj.props, objType );

    if( obj.props ) {
        if( obj.props.object_name ) {
            displayName = obj.props.object_name.uiValues[ 0 ];
        }
    }

    // get Icon for node
    var iconURL = awIconService.getTypeIconFileUrl( obj );

    var vmNode = awTableSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = !hasChildren;

    return vmNode;
}

/**
 * Tree/Table widget require the rendered objects to be unique. Currently expansion state is maintained in local storage and is based
 * on "id" property of the nodes which is nothing but "uid" property of an element. When duplicate folder nodes exist in tree table,
 * the uid of these nodes happen to get repeated in viewModelCollection. This causes infinite loop when a folder
 * within the same folder node is expanded and causes a browser hung state. Also, the expansion state is lost. It
 * is important from user perspective that we maintain expansion state. Also, it is required that if a 'n'th instance of a
 * duplicate occuring node appears in the tree and is expanded , the child nodes get associated to the 'nth' occurence of the node itself
 * and not the first instance of the node in the tree.  In order to achieve this ,
 * the SWF alternateID attribute which sits on 'ViewModelTreeNode' and 'ViewModelObject' object is leveraged. The 'alternateID' is
 * generated by evaluating the parent node of a particular node in consideration upto the root folder . The comma separated uid string
 * is stored on alternateID on vmNode and is always unique whatever be the expansion state of the tree . The comma separated uid path
 * being stored in alternateID also ensures that when an object is selected and in all but tree mode and when the mode is changed to tree ,
 * with the suid, duid, uid combination in the state params the exact node in the tree is selected .
 *
 * @param {ViewModelTreeNode} obj - the tree node object for which unique id needs to be evaluated
 * @return {String} uidString - returns comma separated uid for every node . uids are made of hierarchy for each node
 */
var getUniqueIdForEachNode = function( obj ) {
    var uidString = '';
    var vmo = obj;
    while( vmo ) {
        uidString = uidString === '' ? uidString + vmo.uid : uidString + ',' + vmo.uid;
        vmo = vmo.parentNode;
    }
    return uidString;
};

/**
 * @param {Object} props - object for getting contain children value.
 * @param {Object} type - type of object containing children.
 * @return {Boolean} Returns boolean.
 */
function containChildren( props, type ) {
    if( type === 'Clr0ProductAppBreakdown' && props.clr0ChildAppAreaBreakdown && props.clr0ChildAppAreaBreakdown.dbValues.length > 0 ) {
        return true;
    } else if( type === 'Clr0AppearanceAreaBreakdown' && props.clr0Children && props.clr0Children.dbValues.length > 0 ) {
        return true;
    } else if( type === 'Clr0AppearanceArea' && props.clr0ChildAppDesignators && props.clr0ChildAppDesignators.dbValues.length > 0 ) {
        return true;
    }
    return false;
}

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = AMBreakdownNavigationService.getDefaultPageSize( defaultPageSizePreference );
    return defaultPageSize;
};

/**
 * Function to update d_uids param upon selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selection - base selection node
 */
export let updateDUidParamForTreeSelection = function( viewMode, selection ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var d_uids = [];
        var newDuid = '';
        var navigationParam = {};

        var stateInstance = AwStateService.instance;
        var selected = selection[ selection.length - 1 ];
        var currentParentNode = selected.parentNode;

        if( currentParentNode ) {

            while( currentParentNode.parentNode ) {
                d_uids.push( currentParentNode.uid );
                currentParentNode = currentParentNode.parentNode;
            }

            var topNode = currentParentNode.uid;

            if( d_uids.length >= 1 ) {
                d_uids = _.reverse( d_uids );

                _.forEach( d_uids, function( d_uid ) {
                    newDuid = newDuid === '' ? newDuid + d_uid : newDuid + '^' + d_uid;
                } );

                navigationParam.d_uids = newDuid;
                appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', topNode );
            } else {
                navigationParam.d_uids = '';
            }
        } else {
            navigationParam.d_uids = '';
        }
        appCtxSvc.updatePartialCtx( 'search.totalFound', selected.parentNode ? selected.parentNode.totalFound : selected.totalFound );
        stateInstance.go( '.', navigationParam, { location: 'replace' } );
    }
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selectedNode - base selection node
 */
export let updateParentHierarchyInURL = function( viewMode, selectedNode ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var navigationParam = AwStateService.instance.params;
        var ctxSelected = appCtxSvc.getCtx( 'selected' );
        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', selectedNode.uid );
        if( ctxSelected.parentNode ) {
            navigationParam.d_uids = '';
            navigationParam.s_uid = selectedNode.uid;
        }
        AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
    }
};

/**
 * Utility to get parent model object of selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} baseSelection - base selection node
 * @param {Object} selection - base selection node
 * @return {Object} Returns parent model object.
 */
export let getParentOfSelection = function( viewMode, baseSelection, selection ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var uid = selection[ selection.length - 1 ].parentNode ? selection[ selection.length - 1 ].parentNode.uid : selection[ 0 ].uid;
        return cdm.getObject( uid );
    }
    return baseSelection;
};

/**
 * Utility to get set selection object based on view mode
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} object - selected object
 * @return {Object} Returns object for selection
 */
export let checkViewModeAndSetSelection = function( viewMode, object ) {
    return exports.isTreeViewMode( viewMode ) ? object : cdm.getObject( object.uid );
};

/**
 * Utility to get set selection object based on view mode
 *
 * @param {Object} viewMode - current view mode
 * @return {Boolean} Returns Boolean based on view mode
 */
export let isTreeViewMode = function( viewMode ) {
    return viewMode === 'tree';
};

/**
 * Function to update s_uid param on view mode change.
 *
 * @param {Object} viewMode - current view mode
 */
export let updateSUidParamOnViewModeChange = function( viewMode ) {
    var d_uidsForNodeSelection = '';
    var navigationParam = AwStateService.instance.params;

    if( exports.isTreeViewMode( viewMode ) ) {
        var nodeToSelect = [];

        var previous_d_uids = navigationParam.d_uids ? navigationParam.d_uids.split( '^' ) : [];
        previous_d_uids = _.reverse( previous_d_uids );

        _.forEach( previous_d_uids, function( d_uid ) {
            d_uidsForNodeSelection = d_uidsForNodeSelection === '' ? d_uidsForNodeSelection + d_uid : d_uidsForNodeSelection + ',' + d_uid;
        } );

        if( navigationParam.s_uid && navigationParam.s_uid !== '' ) {
            nodeToSelect.push( navigationParam.s_uid );
        }

        if( d_uidsForNodeSelection !== '' ) {
            nodeToSelect.push( d_uidsForNodeSelection );
        }

        if( navigationParam.uid !== navigationParam.s_uid ) {
            nodeToSelect.push( navigationParam.uid );
        }

        var selectedNodePath = _.join( nodeToSelect, ',' );
        navigationParam.s_uid = selectedNodePath;
    } else {
        var s_uid = navigationParam.s_uid ? navigationParam.s_uid.split( ',' ) : [];
        navigationParam.s_uid = s_uid[ 0 ];
    }
    AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
};

export default exports = {
    loadTreeTableColumns,
    updateDisplayNames,
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableProperties,
    loadTreeTableData,
    createTreeLoadResult,
    getDefaultPageSize,
    updateDUidParamForTreeSelection,
    updateParentHierarchyInURL,
    getParentOfSelection,
    checkViewModeAndSetSelection,
    isTreeViewMode,
    updateSUidParamOnViewModeChange
};
/**
 * @memberof NgServices
 * @member AMBreakdownNavigationTreeService
 */
app.factory( 'AMBreakdownNavigationTreeService', () => exports );
