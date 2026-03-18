// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Att1AttrMappingTableCreateService
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import policySvc from 'soa/kernel/propertyPolicyService';
import editHandlerSvc from 'js/editHandlerService';
import attrTableUtils from 'js/attrTableUtils';
import tcVmoService from 'js/tcViewModelObjectService';
import parammgmtUtilSvc from 'js/Att1ParameterMgmtUtilService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var _mappingTableContextName = 'Att1ShowMappedAttribute';
var _isMappingTableEditing = 'isMappingTableEditing';
var _mappingTableDefinitionCtx = null;
var _attrAlignmentProxyObjects = {};
var _attrEditHandler = null;
var _onXRTPageContextEventListener = null;

var _startIndex = 0;
var _openedObjectUid = '';

/**
 * @param uid Object uid
 * @returns Model object for attribute alignment proxy object
 */
function getAttrAlignmentProxyObject( uid ) {
    return _attrAlignmentProxyObjects[ uid ];
}

/**
 * @param object
 * @returns true if the array is populated
 */
function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

/**
 * @param propertyLoadRequests
 * @returns Promise
 */
function _loadProperties( propertyLoadInput ) {
    var allChildNodes = [];
    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
    var propertyLoadContext = {
        clientName: mapContext.clientName,
        clientScopeURI: mapContext.clientScopeURI
    };

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            allChildNodes.push( childNode );
        } );
    } );

    // The TreeViewModelNode with uid 'top' is a pseudo node.
    // Return an empty result to prevent unneeded call to getTableViewModelProperties.
    if( allChildNodes.length === 1 && allChildNodes[ 0 ].uid === 'top' ) {
        var _deferred = AwPromiseService.instance.defer();
        var _propEmptyResult = {
            propertyLoadResult: {
                updatedNodes: []
            }
        };
        _deferred.resolve( _propEmptyResult );
        return _deferred.promise;
    }

    //ensure the required objects are loaded
    if( appCtxSvc.ctx.openedARObject === undefined &&
        appCtxSvc.ctx.selected.type !== 'Crt0VldnContractRevision' ) {
        var policyId = policySvc.register( {
            types: [ {
                name: 'Att1AttributeAlignmentProxy',
                properties: [ {
                    name: 'att1AttributeAlignment'
                }, {
                    name: 'att1ContextObject',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                }, {
                    name: 'att1SourceAttribute',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                }, {
                    name: 'att1SourceElement'
                } ]
            }, {
                name: 'Att0MeasurableAttribute',
                properties: [ {
                    name: 'att1InContext'
                } ]
            } ]
        } );
    }

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContext ).then(
        function( response ) {
            _.forEach( allChildNodes, function( childNode ) {
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
                    .getObject( childNode.id ), 'EDIT' );
                _.forEach( vmo.props, function( vmProp ) {
                    childNode.props[ vmProp.propertyName ] = vmProp;
                } );
            } );

            if( policyId ) {
                policySvc.unregister( policyId );
            }

            if( response ) {
                var columns = response.output.columnConfig.columns;
                propertyLoadResult.columnConfig = response.output.columnConfig;
                _.forEach( columns, function( col ) {
                    col.typeName = col.associatedTypeName;
                } );
            }
            //update viewModelProperties
            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
}

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
    createOrUpdateMapContext();
    var deferred = AwPromiseService.instance.defer();
    var awColumnInfos = [];

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        displayName: 'NAME',
        typeName: 'Att1AttributeAlignmentProxy',
        width: 1000,
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
}; // loadTreeTableColumns

/**
 * Unregister Property Policies as soon as AR sublocation is changed.
 */
function _unregisterPropPolicies() {
    eventBus.unsubscribe( _onXRTPageContextEventListener );
    appCtxSvc.unRegisterCtx( 'subscribeToXRTPageContext' );
    appCtxSvc.unRegisterCtx( 'selectUnusedAttrsFilter' );
    appCtxSvc.unRegisterCtx( _mappingTableContextName );
}

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
 *            function is invoked from. The object is usually the result of processing the 'inputData' property
 *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
 *            properties on this object is used (if defined).
 *
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var propertyLoadInput = '';

    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( awTableSvc.isPropertyLoadInput( arg ) ) {
            propertyLoadInput = arg;
        }
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    return _loadProperties( propertyLoadInput );
};

/**
 * @param {occurrenceInfo} occ - Occurrence Information sent by server
 * @param {childNdx} child Index
 * @param {levelNdx} Level index
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx ) {
    var proxyObject = getAttrAlignmentProxyObject( obj.uid );

    var displayName = obj.displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var hasChildren = proxyObject.props.att1HasChildren.dbValues[ 0 ];

    var iconURL = null;

    if( !displayName ) {
        var sourceObj = cdm.getObject( proxyObject.props.att1SourceAttribute.dbValues[ 0 ] );
        if( sourceObj && sourceObj.props && sourceObj.props.object_name ) {
            displayName = sourceObj.props.object_name.uiValues[ 0 ];
        } else {
            displayName = proxyObject.props.att1SourceAttribute.uiValues[ 0 ];
        }
    }

    //
    if( objType ) {
        iconURL = iconSvc.getTypeIconURL( objType );
    }

    var vmNode = awTableSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = hasChildren === '0';

    return vmNode;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {ISOAResponse} response - SOA Response
 * @return {TreeLoadResult} A new TreeLoadResult object containing result/status information.
 */
function processProviderResponse( treeLoadInput, searchResults, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];

    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];
        var vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached, endReached, null );
}

/**
 * @param clientName
 * @param clientURI
 * @param parentUids
 * @param connectionInfo
 * @param productContextUids
 * @param rootElementUids
 */
export let getPerformSearchViewModelInput = function( clientName, clientURI, openedObjectUid, showUnusedAttrs, parentUids,
    connectionInfo, productContextUids, rootElementUids, startIndex, sortCriteria, columnFilters ) {
    var fieldName = '';
    var sortDirection = '';

    if( sortCriteria && sortCriteria.length > 0 ) {
        fieldName = sortCriteria[ 0 ].fieldName;
        sortDirection = sortCriteria[ 0 ].sortDirection;
    }
    var showSubtreeAttrs= 'false';
    var showInOut = '';

    var xrtPrimPage = appCtxSvc.getCtx( 'xrtPageContext.primaryXrtPageID' );
    var xrtSecPage = appCtxSvc.getCtx( 'xrtPageContext.secondaryXrtPageID' );

    var selected = appCtxSvc.getCtx( 'mselected' );
    var isRequirementObject = false;
    if(selected && selected.length >= 1 && (selected[0].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 || selected[0].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 || selected[0].modelType.typeHierarchyArray.indexOf( 'Arm0ParagraphElement' ) > -1)) {
        isRequirementObject = true;
    }

    if (  xrtSecPage === "tc_xrt_Documentation" || (xrtSecPage === "tc_xrt_Overview" && isRequirementObject) ) 
    {
        showSubtreeAttrs = 'true';
    }

    if( xrtPrimPage === 'tc_xrt_OutputForDCP' || xrtSecPage === 'tc_xrt_OutputForDCP' ) {
        showInOut = 'out';
    }

    return {
        inflateProperties: false,
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: clientURI
        },
        searchInput: {
            startIndex: startIndex,
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Att1AttributeMapProvider',
            searchCriteria: {
                openedObjectUid: openedObjectUid,
                showUnusedAttrs: showUnusedAttrs,
                parentUids: parentUids,
                connectionInfo: connectionInfo,
                productContextUids: productContextUids,
                rootElementUids: rootElementUids,
                queryMappedAttrs: 'true',
                dcpSortByDataProvider: 'true',
                showInOut: showInOut,
                showSubtreeAttrs: showSubtreeAttrs
            },
            searchSortCriteria: [ {
                fieldName: fieldName,
                sortDirection: sortDirection
            } ],
            columnFilters: columnFilters
        }
    };
};

/**
 * @param {JSO} response - SOA response object
 * @param {PolicyId} policyId - Registered property policy
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 */
function _handlePerformSearchViewModelResponse( response, policyId, treeLoadInput, deferred ) {
    var proxyObjects = [];
    _attrAlignmentProxyObjects = {};

    if( response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults && _isArrayPopulated( searchResults.objects ) ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                proxyObjects.push( searchResults.objects[ x ] );

                var uid = searchResults.objects[ x ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                if( obj ) {
                    _attrAlignmentProxyObjects[ uid ] = obj;
                }
            }
        }
    }

    if( policyId ) {
        policySvc.unregister( policyId );
    }

    var totalFound = response.totalFound;
    var totalLoaded = response.totalLoaded;

    var endReached = false;
    if( _startIndex + totalLoaded >= totalFound ) {
        endReached = true;
    }

    treeLoadInput.parentNode.cursorObject = {
        startReached: true,
        endReached: endReached
    };

    var treeLoadResult = processProviderResponse( treeLoadInput, proxyObjects, true, endReached );

    deferred.resolve( {
        treeLoadResult: treeLoadResult
    } );
}

/**
 * @param {ViewModelTreeNode} parentNode - A node that acts as 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 */
function _buildTreeTableStructure( parentNode, deferred, treeLoadInput, openedObjectUid, sortCriteria, columnFilters ) {
    var showUnusedAttrs = 'true';
    var parentUids = '';
    var connectionInfo = '';
    var productContextUids = '';
    var rootElementUids = '';
    var interactionSelected = false;
    var clientName = '';
    var clientURI = '';
    _attrAlignmentProxyObjects = {};

    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
    if( mapContext ) {
        parentUids = mapContext.parentUids;
        connectionInfo = mapContext.connectionInfo;
        productContextUids = mapContext.productContextUids;
        rootElementUids = mapContext.rootElementUids;
        interactionSelected = mapContext.interactionSelected;
        clientName = mapContext.clientName;
        clientURI = mapContext.clientScopeURI;
        var selectUnusedAttrsFilter = appCtxSvc.getCtx( 'selectUnusedAttrsFilter' );
        if( selectUnusedAttrsFilter === undefined || selectUnusedAttrsFilter === null ||
            selectUnusedAttrsFilter === 'false' ) {
            showUnusedAttrs = 'false';
        } else if( selectUnusedAttrsFilter === 'true' ) {
            showUnusedAttrs = 'true';
        }
    }

    if( parentNode.levelNdx === -1 ) {
        appCtxSvc.unRegisterCtx( 'selectedProxyObjects' );
        appCtxSvc.unRegisterCtx( 'selectedAlignmentObjects' );
    } else {
        parentUids = parentNode.uid;
        if( !interactionSelected ) {
            connectionInfo = '';
        }
    }

    var soaInput = exports.getPerformSearchViewModelInput( clientName, clientURI, openedObjectUid, showUnusedAttrs,
        parentUids, connectionInfo, productContextUids, rootElementUids, _startIndex, sortCriteria, columnFilters );

    treeLoadInput.parentElement = parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : parentNode.id;
    treeLoadInput.displayMode = 'Tree';

    //ensure the required objects are loaded
    var policyId = policySvc.register( {
        types: [ {
            name: 'Att1AttributeAlignmentProxy',
            properties: [ {
                name: 'att1SourceAttribute',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            }, {
                name: 'att1HasChildren'
            }, {
                name: 'att1SourceElement'
            } ]
        } ]
    } );

    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            _handlePerformSearchViewModelResponse( response, policyId, treeLoadInput, deferred );
        },
        function( error ) {
            deferred.reject( error );
        } );
}

/** Calculate StartIndex
 * @param {uwDataProvider} uwDataProvider - data provider
 * @returns _startIndex
 */
function _calculateStartIndex( uwDataProvider ) {
    if( uwDataProvider ) {
        _mappingTableDefinitionCtx = uwDataProvider.json.editContext;

        // update table definition context
        var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
        if( mapContext && !mapContext.tableContextName ) {
            mapContext.tableContextName = _mappingTableDefinitionCtx;
        }

        if( !_attrEditHandler || !_attrEditHandler.getDataSource() ||
            uwDataProvider !== _attrEditHandler.getDataSource().getDataProvider() ) {
            _attrEditHandler = editHandlerSvc.getEditHandler( _mappingTableDefinitionCtx );
        }

        // update attribute edit handler
        if( mapContext && !mapContext.attrEditHandler ) {
            mapContext.attrEditHandler = _attrEditHandler;
        }

        _startIndex = uwDataProvider.startIndex;
    }

    return _startIndex;
}

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
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
export let loadTreeTableData = function( treeLoadInput, uwDataProvider, sortCriteria, columnFilters ) {
    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();
    appCtxSvc.unRegisterCtx( 'inContextAttr' );
    appCtxSvc.unRegisterCtx( 'isAttrmultipleParentSelected' );
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    if( treeLoadInput.startChildNdx > 0 && treeLoadInput.parentNode.levelNdx === -1 ) {
        treeLoadInput.parentNode.children = [];
        treeLoadInput.parentNode.totalChildCount = 0;

        treeLoadInput.rootNode = treeLoadInput.parentNode;
        treeLoadInput.startChildNdx = 0;
    }

    _startIndex = _calculateStartIndex( uwDataProvider );

    _openedObjectUid = attrTableUtils.getOpenedObjectUid();

    // Initialize Editing Context
    appCtxSvc.updateCtx( _isMappingTableEditing, false );

    /**
     * Get the 'child' nodes async
     */
    _buildTreeTableStructure( treeLoadInput.parentNode, deferred, treeLoadInput, _openedObjectUid, sortCriteria, columnFilters );
    return deferred.promise;
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
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
export let loadTreeTablePage = function( treeLoadInput, uwDataProvider, sortCriteria, columnFilters ) {
    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    if( treeLoadInput ) {
        _startIndex = treeLoadInput.startChildNdx;
    }

    if( uwDataProvider ) {
        _mappingTableDefinitionCtx = uwDataProvider.json.editContext;
    }

    // Get the 'child' nodes async
    _buildTreeTableStructure( treeLoadInput.parentNode, deferred, treeLoadInput, _openedObjectUid, sortCriteria, columnFilters );

    return deferred.promise;
};

var _processTracelink = function( obj, processedConnections ) {
    var graphContext = appCtxSvc.getCtx( 'graph' );
    var visibleEdgeModel = graphContext.graphModel.graphControl.graph.getVisibleEdges();
    _.forEach( visibleEdgeModel, function( edgeModel ) {
        if( edgeModel.modelObject && edgeModel.modelObject.uid === obj.uid ) {
            var sourceObject = edgeModel.getSourceNode();
            var targetObject = edgeModel.getTargetNode();
            if( sourceObject && targetObject &&
                edgeModel.modelObject.modelType.typeHierarchyArray.indexOf( 'FND_TraceLink' ) > -1 ) {
                processedConnections.push( edgeModel );
            }
        }
    } );
};

/**
 * Check uid length and push into uid
 * @param {object} uidProductContexts - updated uidProductContexts
 * @param {object} uidRootElements - updated uidRootElements
 * @returns uids
 */
function _checkUidLengthAndPush( uidProductContexts, uidRootElements ) {
    var uids = [];
    if( uidProductContexts.length > 0 ) {
        uids.push( uidProductContexts.trim() );
    }
    if( uidRootElements.length > 0 ) {
        uids.push( uidRootElements.trim() );
    }
    return uids;
}

var _getProductContextOrRootElementUids = function() {
    var uidProductContexts = '';
    var uidRootElements = '';
    var uids = [];
    var occmgmtContext = appCtxSvc.getCtx( 'occmgmtContext' );
    var occurence = occmgmtContext && occmgmtContext.openedElement;
    if( occmgmtContext && occmgmtContext.elementToPCIMap ) {
        for( var k in occmgmtContext.elementToPCIMap ) {
            if( occmgmtContext.elementToPCIMap[ k ] ) {
                uidProductContexts = uidProductContexts.concat( occmgmtContext.elementToPCIMap[ k ], ' ' );
                uidRootElements = uidRootElements.concat( k, ' ' );
            }
        }
    }
    if( uidRootElements.length === 0 ) {
        if( occurence && occurence.modelType && occurence.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
            var loop = true;
            while( loop ) {
                if( occurence.props.awb0Parent && occurence.props.awb0Parent.dbValues[ 0 ] ) {
                    occurence = cdm.getObject( occurence.props.awb0Parent.dbValues[ 0 ] );
                } else {
                    loop = false;
                }
            }
        }
        uidProductContexts = occmgmtContext && occmgmtContext.productContextInfo.uid;
        uidRootElements = occurence && occurence.uid;
    }

    if( uidProductContexts && uidRootElements ) {
        uids = _checkUidLengthAndPush( uidProductContexts, uidRootElements );
    }

    return uids;
};

export let initAttrMappingContext = function( data ) {
    parammgmtUtilSvc.resetParentAccess();
    //set the Context
    var attrMappingContext = {};
    var selectedUids = '';
    var connectionInfo = '';
    var processedConnections = [];
    var openedObject = null;
    var productContextAndRootElementUids = [];
    var selections = null;
    appCtxSvc.unRegisterCtx( 'Att1ShowMappedAttribute' );
    if( data.eventData && data.eventData.selections ) {
        selections = data.eventData.selections;
    } else {
        selections = appCtxSvc.getCtx( 'mselected' );
    }
    var state = appCtxSvc.getCtx( 'state' );
    for( var i = 0; i < selections.length; i++ ) {
        selectedUids = selectedUids.concat( selections[ i ].uid, '#' );
        if( selections[ i ].modelType.typeHierarchyArray.indexOf( 'FND_TraceLink' ) > -1 ) {
            _processTracelink( selections[ i ], processedConnections );
        }
    }
    if( selectedUids.endsWith( '#' ) ) {
        selectedUids = selectedUids.slice( 0, selectedUids.length - 1 );
    }
    _.forEach( processedConnections, function( conn ) {
        connectionInfo = connectionInfo.concat( conn.getSourceNode().modelObject.uid, ' ' );
        connectionInfo = connectionInfo.concat( conn.modelObject.uid, ' ' );
        connectionInfo = connectionInfo.concat( conn.getTargetNode().modelObject.uid, '   ' );
    } );
    attrMappingContext.parentUids = selectedUids.trim();
    attrMappingContext.connectionInfo = connectionInfo.trim();
    attrMappingContext.clientName = 'AWClient';
    attrMappingContext.openedObjectUid = state.params.uid;
    openedObject = cdm.getObject( state.params.uid );
    if( openedObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        attrMappingContext.mappingCommand = 'true';
        attrMappingContext.clientScopeURI = 'ARMappingAttrTableForSplitPanel';
    } else {
        attrMappingContext.mappingCommand = 'true';
        attrMappingContext.clientScopeURI = 'AttributeMappingTable';
    }
    productContextAndRootElementUids = _getProductContextOrRootElementUids();
    attrMappingContext.productContextUids = productContextAndRootElementUids[ 0 ];
    attrMappingContext.rootElementUids = productContextAndRootElementUids[ 1 ];
    appCtxSvc.registerCtx( 'Att1ShowMappedAttribute', attrMappingContext );
    eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
};

/**
 * Display attribute table
 */
function createOrUpdateMapContext() {
    if( appCtxSvc.ctx.subscribeToXRTPageContext === undefined ) {
        _onXRTPageContextEventListener = eventBus.subscribe( 'appCtx.update', function( eventData ) {
            if( eventData.name === 'xrtPageContext' && appCtxSvc.ctx.subscribeToXRTPageContext === true ) {
                _unregisterPropPolicies();
            }
        }, 'Att1AttrMappingTableCreateService' );
        appCtxSvc.updatePartialCtx( 'subscribeToXRTPageContext', true );
    }

    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );

    if( appCtxSvc.ctx.mselected.length > 1 && appCtxSvc.ctx.state.params.spageId === 'Parameters' ) {
        var selectedObjectUids = attrTableUtils.getSelectedElementUids();

        var openedObject = cdm.getObject( attrTableUtils.getOpenedObjectUid() );
        var clientScopeURI = null;
        if( openedObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            clientScopeURI = 'ARInputAttrTable';
        } else {
            clientScopeURI = 'AttributeMappingTable';
        }

        if( !mapContext ) {
            mapContext = {
                clientName: 'AWClient',
                clientScopeURI: clientScopeURI,
                parentUids: selectedObjectUids
            };
            appCtxSvc.registerCtx( _mappingTableContextName, mapContext );
        } else {
            mapContext.parentUids = selectedObjectUids;
            mapContext.clientScopeURI = clientScopeURI;
            appCtxSvc.updatePartialCtx( _mappingTableContextName, mapContext );
        }
    } else {
        if( !mapContext ) {
            mapContext = {
                clientName: 'AWClient',
                clientScopeURI: 'ARInputAttrTable',
                openedObjectUid: attrTableUtils.getOpenedObjectUid(),
                showUnusedAttrs: 'false'
            };
            appCtxSvc.registerCtx( _mappingTableContextName, mapContext );
        } else {
            mapContext.showUnusedAttrs = 'false';
            mapContext.openedObjectUid = attrTableUtils.getOpenedObjectUid();
            appCtxSvc.updatePartialCtx( _mappingTableContextName, mapContext );
        }
    }
}

/**
 * Att1AttrMappingTableCreateService factory
 */

export default exports = {
    loadTreeTableColumns,
    loadTreeTableProperties,
    getPerformSearchViewModelInput,
    loadTreeTableData,
    loadTreeTablePage,
    initAttrMappingContext
};
app.factory( 'Att1AttrMappingTableCreateService', () => exports );
