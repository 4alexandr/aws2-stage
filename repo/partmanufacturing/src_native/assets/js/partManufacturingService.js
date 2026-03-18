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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/partManufacturingService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxSvc from 'js/appCtxService';
import awTableSvc from 'js/awTableService';
import awIconSvc from 'js/awIconService';
import dataManagementSvc from 'soa/dataManagementService';
import tcSesData from 'js/TcSessionData';
import viewModelObjectSvc from 'js/viewModelObjectService';
import policySvc from 'soa/kernel/propertyPolicyService';
import prefSvc from 'soa/preferenceService';
import tcVmoService from 'js/tcViewModelObjectService';
import occTypeSvc from 'js/occurrenceTypesService';
import _ from 'lodash';

var exports = {};

var _proxyObjects = null;
var _resourcesColConfigData;

var partMfgUnloadedEventListener = null;

export let registerContext = function() {
    registerPartMfgContext();
};

export let unregisterContext = function() {
    appCtxSvc.unRegisterCtx( 'PartMfg' );
};

/**
 * Checks for correct TC version and if selected object is 'MENCMachining Revision' <br>
 *
 * @return true if pre-conditions are satisfied
 */
function checkPreconditionsForToolActivityUserData() {
    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    var tcMajor = tcSesData.getTCMajorVersion();
    var tcMinor = tcSesData.getTCMinorVersion();

    if( selectedMO.modelType.typeHierarchyArray.indexOf( 'MENCMachining Revision' ) > -1 &&
                             ( ( tcMajor === 12 && tcMinor >= 3 ) || tcMajor >= 13 )) {
        return true;
    }
    return false;
}

function isTCVersion13OrLater()
{
    var tcMajor = tcSesData.getTCMajorVersion();
    return ( tcMajor >= 13) ? true : false;
}

function getTypesForAddResource() {
    var resLength = (appCtxSvc.ctx.preferences.AWC_PartMfg_AddResource_Types) ? appCtxSvc.ctx.preferences.AWC_PartMfg_AddResource_Types.length : 0;
    var resTypesStr = '';
    if(resLength > 0)
    {
        for( var idx = 0; idx < resLength; idx++ ) {
            resTypesStr += appCtxSvc.ctx.preferences.AWC_PartMfg_AddResource_Types[idx];
            if(idx < (resLength-1))
            {
                resTypesStr += ',';
            }
        }
    }
    else
    {
        // Use resource type Mfg0MEResource if pref is not AWC_PartMfg_AddResource_Types found
        resTypesStr = 'Mfg0MEResource';
    }
    return resTypesStr;
}

/**
 *
 * @param propertyLoadRequests
 * @returns Promise
 */
function _loadProperties( propertyLoadInput ) {
    var allChildNodes = [];
    var columnPropNames = [];
    var allChildUids = [];

    columnPropNames.push( 'awp0ThumbnailImageTicket' );

    /**
     * Note: Assume each propertyLoadRequest has the same columns
     */
    if( !_.isEmpty( propertyLoadInput.propertyLoadRequests ) ) {
        _.forEach( propertyLoadInput.propertyLoadRequests[ 0 ].columnInfos, function( columnInfo ) {
            columnPropNames.push( columnInfo.name );
        } );
    }

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            if( cdm.isValidObjectUid( childNode.uid ) && childNode.uid !== 'top' ) {
                allChildNodes.push( childNode );
                allChildUids.push( childNode.uid );
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;

    if( selectedMO && cdm.isValidObjectUid( selectedMO.uid ) ) {
        allChildUids.push( selectedMO.uid );
    }

    if( _.isEmpty( allChildUids ) ) {
        return AwPromiseService.instance.resolve( {
            propertyLoadResult: propertyLoadResult
        } );
    }

    columnPropNames = _.uniq( columnPropNames );
    allChildUids = _.uniq( allChildUids );

    return dataManagementSvc.loadObjects( allChildUids ).then(
        function() { // eslint-disable-line no-unused-vars
            var vmoObjs = [];
            /**
             * Create a ViewModelObject for each of the returned 'child' nodes
             */
            _.forEach( allChildNodes, function( childNode ) {
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
                    .getObject( childNode.uid ), 'EDIT' );

                vmoObjs.push( vmo );
            } );
            return tcVmoService.getViewModelProperties( vmoObjs, columnPropNames ).then(
                function() {
                    /**
                     * Create a ViewModelObject for each of the returned 'child' nodes
                     */
                    _.forEach( vmoObjs, function( vmo ) {
                        if( vmo.props ) {
                            _.forEach( allChildNodes, function( childNode ) {
                                if( childNode.uid === vmo.uid ) {
                                    if( !childNode.props ) {
                                        childNode.props = {};
                                    }
                                    _.forEach( vmo.props, function( vmProp ) {
                                        childNode.props[ vmProp.propertyName ] = vmProp;
                                    } );
                                }
                            } );
                        }
                    } );

                    return {
                        propertyLoadResult: propertyLoadResult
                    };
                } );
        } );
}

/**
 *
 */
function registerPartMfgContext() {
    var activeTabIndex = 0;

    var bomLine = null;
    var parentElementUid = null;
    var parentElement = null;
    var productContext = null;
    var activityLine = null;
    var addElement = null;
    // Default activities Client Scope URI
    var activitiesClientScopeURI = "Pm1Activities";
    var supportedFeatures = null;
    var resourceTypesForAdd = getTypesForAddResource();
    var itemTypeOccTypesMap = {};
    var itemTypeDefOccTypeMap = {};
    
    var partMfgCtx = {
        activeTabIndex: activeTabIndex,
        bomLine: bomLine,
        parentElementUid: parentElementUid,
        parentElement: parentElement,
        productContext: productContext,
        activityLine: activityLine,
        activitiesClientScopeURI: activitiesClientScopeURI,
        addElement:addElement,
        supportedFeatures:supportedFeatures,
        resourceTypesForAdd:resourceTypesForAdd,
        itemTypeOccTypesMap:itemTypeOccTypesMap,
        itemTypeDefOccTypeMap:itemTypeDefOccTypeMap
    };

    appCtxSvc.registerCtx( 'PartMfg', partMfgCtx );

    //override the default activities clientScopeURI if the preconditions are satisfied
    //and the preference MPP_ToolActivity_EnableUserData is enabled
    if( checkPreconditionsForToolActivityUserData() ) {
        //Get the preference value for MPP_ToolActivity_EnableUserData
        prefSvc.getLogicalValue( 'MPP_ToolActivity_EnableUserData' ).then(
            function( result ) {
                if( result !== null && result.length > 0 && result.toUpperCase() === 'TRUE' ) {
                    appCtxSvc.updatePartialCtx( 'PartMfg.activitiesClientScopeURI', "Pm1NCActivities" );
                }
            } );
    }
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
     */
    var propertyLoadInput = awTableSvc.findPropertyLoadInput( arguments );

    if( propertyLoadInput ) {
        return _loadProperties( propertyLoadInput );
    }

    return AwPromiseService.instance.reject( 'Missing PropertyLoadInput parameter' );
};

/**
 * @param {occurrenceInfo} occ - Occurrence Information sent by server
 * @param {childNdx} child Index
 * @param {levelNdx} Level index
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx ) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var hasChildren = containChildren( obj );

    var iconURL = null;

    if( obj.props ) {
        if( obj.props.object_string ) {
            displayName = obj.props.object_string.uiValues[ 0 ];
        }
    }

    if( !iconURL && obj ) {
        if( obj.modelType.typeHierarchyArray.indexOf( 'CfgAttachmentLine' ) > -1 ) {
            var alObj = cdm.getObject( obj.props.al_object.dbValues[ 0 ] );
            iconURL = awIconSvc.getTypeIconFileUrl( alObj );
        } else {
            iconURL = awIconSvc.getTypeIconFileUrl( obj );
        }
    }

    var vmNode = awTableSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = !hasChildren;

    return vmNode;
}

function containChildren( obj ) {
    if( obj.modelType.typeHierarchyArray.indexOf( 'MECfgLine' ) > -1 ) {
        if( obj.props && obj.props.me_cl_has_children && obj.props.me_cl_has_children.dbValues[ 0 ] === '1' ) {
            return true;
        }
        return false;
    }
    return false;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {ISOAResponse} response - SOA Response
 * @return {TreeLoadResult} A new TreeLoadResult object containing result/status information.
 */
function processProviderResponse( treeLoadInput, searchResults ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];

    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];
        if( object.modelType.typeHierarchyArray.indexOf( 'CfgActivityLine' ) < 0 ) {
            object = cdm.getObject( object.props.al_object.dbValues[ 0 ] );
        }
        var vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );
        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    // Third Paramter is for a simple vs ??? tree
    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, false, true, true, null );

    return treeLoadResult;
}

/**
 * @param {ViewModelTreeNode} parentNode - A node that acts as 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {ColumnConfigInput} columnConfigInput - Column Configuration Input
 * @param {inflateProp} inflateProp - If true, the properties will be inflated (the properties will be loaded and fully populated).
 *
 */
function _buildActivityStructure( parentNode, deferred, treeLoadInput, columnConfigInput, inflateProp ) {
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );
    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;

    var targetNode = parentNode.isExpanded ? parentNode.uid : undefined;

    var policyID = policySvc.register( {
        types: [ {
                name: 'CfgAttachmentLine',
                properties: [ {
                        name: 'me_cl_display_string'
                    },
                    {
                        name: 'me_cl_object_name'
                    },
                    {
                        name: 'me_cl_object_desc'
                    },
                    {
                        name: 'me_cl_object_type'
                    },
                    {
                        name: 'me_cl_owning_group'
                    },
                    {
                        name: 'me_cl_owning_user'
                    },
                    {
                        name: 'me_cl_last_mod_date'
                    },
                    {
                        name: 'me_cl_has_children'
                    },
                    {
                        name: 'me_cl_child_count'
                    },
                    {
                        name: 'al_object',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    },
                    {
                        name: 'me_cl_child_lines',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]

                    }
                ]
            },
            {
                name: 'CfgActivityLine',
                properties: [ {
                        name: 'al_activity_long_description'
                    },
                    {
                        name: 'al_activity_start_time'
                    },
                    {
                        name: 'al_activity_time'
                    },
                    {
                        name: 'al_activity_calc_start_time'
                    },
                    {
                        name: 'al_activity_calc_time'
                    },
                    {
                        name: 'al_activity_nc_tool_number'
                    },
                    {
                        name: 'al_activity_tool_bl_list',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    },
                    {
                        name: 'fnd0al_activity_SpindleId'
                    }
                ]
            },
            {
                name: 'MEActivity',
                properties: [ {
                        name: 'object_name'
                    },
                    {
                        name: 'object_desc'
                    },
                    {
                        name: 'object_type'
                    },
                    {
                        name: 'owning_user'
                    },
                    {
                        name: 'owning_group'
                    },
                    {
                        name: 'last_mod_user'
                    },
                    {
                        name: 'contents',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    }
                ]
            }
        ]
    } );

    var soaInput = {
        inflateProperties: inflateProp,
        columnConfigInput: columnConfigInput,
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Pm1ActivityListProvider',
            searchCriteria: {
                parentUid: selectedMO.uid,
                activityLineUid: targetNode
            },
            cursor: {
                startIndex: treeLoadInput.startChildNdx
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap6: {}
        }
    };

    treeLoadInput.parentElement = targetNode && targetNode.levelNdx > -1 ? targetNode.id : 'AAAAAAAAAAAAAA';
    treeLoadInput.displayMode = 'Tree';

    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }
            _proxyObjects = [];

            if( response && response.searchResults && response.searchResults.objects ) {
                _.forEach( response.searchResults.objects, function( obj ) {
                    _proxyObjects.push( cdm.getObject( obj.uid ) );
                } );
            }

            if( !parentNode.isExpanded && !partMfgCtx.activityLine && response.ServiceData && response.ServiceData.plain ) {
                var plen = response.ServiceData.plain.length;
                if( plen > 0 ) {
                    var uid = response.ServiceData.plain[ plen - 1 ];
                    appCtxSvc.updatePartialCtx( 'PartMfg.activityLine', uid );
                    var newparentNode = createVMNodeUsingObjectInfo( cdm.getObject( uid ), 0, -1 );
                    treeLoadInput.parentNode = newparentNode;
                    treeLoadInput.startChildNdx = 0;
                }
            } else {
                targetNode = parentNode.uid;
                treeLoadInput.startChildNdx = 0;
            }

            var treeLoadResult = processProviderResponse( treeLoadInput, _proxyObjects );
            if( response.columnConfig.columns[ 0 ] ) {
                response.columnConfig.columns[ 0 ].isTreeNavigation = true;
            }

            deferred.resolve( {
                treeLoadResult: treeLoadResult,
                columnConfig: response.columnConfig
            } );
        },
        function( error ) {
            deferred.reject( error );
        } );
}

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 *
 * @param {ColumnConfigInput} columnConfigInput - Column Configuration Input
 * @param {inflateProp} inflateProp - If true, the properties will be inflated (the properties will be loaded and fully populated).
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
export let loadActivitiesData = function( treeLoadInput, columnConfigInput, inflateProp ) {
    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    _buildActivityStructure( treeLoadInput.parentNode, deferred, treeLoadInput, columnConfigInput, inflateProp );
    return deferred.promise;
};

export let loadAttachmentsData = function( dataProvider, columnConfigInput, saveColumnConfigData, inflateProp ) {
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;

    var objectSet = '';
    objectSet += 'IMAN_specification.Dataset';
    objectSet += ',IMAN_reference.Dataset';
    objectSet += ',IMAN_manifestation.Dataset';
    objectSet += ',IMAN_Rendering.Dataset';
    objectSet += ',TC_Attaches.Dataset';
    objectSet += ',IMAN_UG_altrep.Dataset';
    objectSet += ',IMAN_UG_scenario.Dataset';
    objectSet += ',IMAN_Simulation.Dataset';

    var searchCtx = appCtxSvc.getCtx( 'search' );
    var filterMap = searchCtx ? searchCtx.activeFilterMap : undefined;
    var filterMapSize = filterMap && filterMap.hasOwnProperty( 'Dataset.object_type' ) ? filterMap[ 'Dataset.object_type' ].length : 0;

    if( filterMap && filterMapSize > 0 ) {
        var inputData = {
            columnConfigInput: columnConfigInput,
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Pm1AttachmentListProvider',
                searchCriteria: {
                    objectSet: objectSet,
                    parentUid: selectedMO.uid,
                    returnTargetObjs: 'true'
                },
                cursor: {
                    startIndex: dataProvider.startIndex
                },
                searchFilterFieldSortType: 'Alphabetical',
                searchFilterMap6: filterMap
            },
            saveColumnConfigData: saveColumnConfigData,
            inflateProperties: inflateProp
        };
    } else {
        var inputData = {
            columnConfigInput: columnConfigInput,
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Pm1AttachmentListProvider',
                searchCriteria: {
                    objectSet: objectSet,
                    parentUid: selectedMO.uid,
                    returnTargetObjs: 'true'
                },
                cursor: {
                    startIndex: dataProvider.startIndex
                },
                searchFilterFieldSortType: 'Alphabetical',
                searchFilterMap6: {}
            },
            saveColumnConfigData: saveColumnConfigData,
            inflateProperties: inflateProp
        };
    }

    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then(
        function( response ) {
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }

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

            var categoryValues = response.searchFilterMap6;

            var typeFilters = categoryValues && categoryValues.hasOwnProperty( 'Dataset.object_type' ) ? categoryValues[ 'Dataset.object_type' ] : undefined;
            if( typeFilters ) {
                var typeNames = [];
                _.forEach( typeFilters, function( typeFilter ) {
                    typeNames.push( typeFilter.stringValue );
                } );

                var promise = soaSvc.ensureModelTypesLoaded( typeNames );
                if( promise ) {
                    promise.then( function() {
                        _.forEach( typeFilters, function( typeFilter ) {
                            if( cmm.containsType( typeFilter.stringValue ) ) {
                                var type = cmm.getType( typeFilter.stringValue );
                                typeFilter.stringDisplayValue = type.displayName;
                            } else {
                                typeFilter.stringDisplayValue = typeFilter.stringValue;
                            }
                        } );
                    } );
                }
            }

            var activeTypes = [];
            var afMap = appCtxSvc.getCtx( 'search.activeFilterMap' );

            if( afMap && afMap.hasOwnProperty( 'Dataset.object_type' ) ) {
                var activeFilters = afMap[ 'Dataset.object_type' ];
                _.forEach( activeFilters, function( activeFilter ) {
                    activeTypes.push( activeFilter.stringValue );
                } );

                var filteredResults = [];

                if( response.searchResults && response.searchResults.objects ) {
                    _.forEach( response.searchResults.objects, function( obj ) {
                        if( activeTypes.includes( obj.type ) ) {
                            filteredResults.push( viewModelObjectSvc
                                .createViewModelObject( obj.uid, 'EDIT', null, obj ) );
                        }
                    } );

                    response.searchResults = filteredResults;
                    response.totalFound = filteredResults.length;
                    response.totalLoaded = filteredResults.length;
                }
            } else // No filter
            {
                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectSvc
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];
            }
            //Fix weird SOA naming
            response.searchFilterMap = response.searchFilterMap6;
            delete response.searchFilterMap6;

            if( response.columnConfig.columns[ 0 ] ) {
                response.columnConfig.columns[ 0 ].isTableCommand = true;
            }
            return response;
        } );
};

/**
 * Handle tab selection change
 *
 * @param {Object} viewModel
 */
export let handleTabSelectionChange = function( viewModel ) {
    if( viewModel && viewModel.tabDocAndRes && viewModel.tabDocAndRes[ 0 ].selectedTab ) {
        appCtxSvc.updatePartialCtx( 'PartMfg.activeTabIndex', 0 );
    } else if( viewModel && viewModel.tabDocAndRes && viewModel.tabDocAndRes[ 1 ].selectedTab ) {
        appCtxSvc.updatePartialCtx( 'PartMfg.activeTabIndex', 1 );
    }
};

export let loadResourcesData = function( declViewModel, dataProvider, columnConfigInput, saveColumnConfigData, inflateProp ) {
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var policyID = policySvc.register( {
        types: [ {
            name: 'BOMLine',
            properties: [ {
                    name: 'bl_occ_type'
                },
                {
                    name: 'bl_sequence_no'
                }
            ]
        },{
                name: 'Awb0Element',
                properties: [ {
                        name: 'awb0OccType'
                    }
                ]
            },
            {
                name: 'Awb0ProductContextInfo',
                properties: [ {
                        name: 'awb0SupportedFeatures',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    }
                ]
            },
            {
                name: "Awb0FeatureList",
                properties: [ {
                        name: "awb0AvailableFeatures"
                    },
                    {
                        name: "awb0NonModifiableFeatures"
                    }
                ]
            }
        ]
    } );

    var deferred = AwPromiseService.instance.defer();
    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    var occTypesArr = [];

    var searchCtx = appCtxSvc.getCtx( 'search' );
    var filterMap = searchCtx ? searchCtx.activeFilterMap : undefined;
    var filterMapSize = filterMap && filterMap.hasOwnProperty( 'BOMLine.bl_occ_type' ) ? filterMap[ 'BOMLine.bl_occ_type' ].length : 0;

    if( filterMap && filterMapSize > 0 ) {
        var inputData = {
            columnConfigInput: columnConfigInput,
            searchInput: {
                maxToLoad: 150,
                maxToReturn: 150,
                providerName: 'Pm1ResourceListProvider',
                searchCriteria: getSearchCriteriaForResourceData(),
                cursor: {
                    startIndex: dataProvider.startIndex
                },
                searchFilterFieldSortType: 'Alphabetical',
                searchFilterMap6: filterMap
            },
            saveColumnConfigData: saveColumnConfigData,
            inflateProperties: inflateProp
        };
    } else {
        var inputData = {
            columnConfigInput: columnConfigInput,
            searchInput: {
                maxToLoad: 150,
                maxToReturn: 150,
                providerName: 'Pm1ResourceListProvider',
                searchCriteria: getSearchCriteriaForResourceData(),
                cursor: {
                    startIndex: dataProvider.startIndex
                },
                searchFilterFieldSortType: 'Alphabetical',
                searchFilterMap6: {}
            },
            saveColumnConfigData: saveColumnConfigData,
            inflateProperties: inflateProp
        };
    }

    soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then(
        function( response ) {
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }

            if(isTCVersion13OrLater())
            {
                handleResponseForTC13OrLater(response, declViewModel);
            }
            else
            {
                handleResponseForTC12OrBefore(response);
            }
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

            //Fix weird SOA naming
            response.searchFilterMap = response.searchFilterMap6;
            delete response.searchFilterMap6;

            if( response.columnConfig && response.columnConfig.columns[ 0 ] ) {
                response.columnConfig.columns[ 0 ].isTableCommand = true;
            }
            deferred.resolve( response );
        } );
    return deferred.promise;
};

function getSupportedFeatures( productContextInfo ) {
    var supportedFeaturesFromPCI = {};
    var supportedFeaturesObjects = null;
    if( productContextInfo && productContextInfo.props ) {
        supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
    }

    if( supportedFeaturesObjects ) {
        for( var objIndex = 0; objIndex < supportedFeaturesObjects.dbValues.length; objIndex++ ) {
            var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ objIndex ] );

            if( featureObject.type === 'Awb0FeatureList' ) {
                var availableFeatures = featureObject.props.awb0AvailableFeatures;
                for( var feature = 0; feature < availableFeatures.dbValues.length; feature++ ) {
                    supportedFeaturesFromPCI[ availableFeatures.dbValues[ feature ] ] = true;
                }
            } else {
                if( featureObject.type ) {
                    supportedFeaturesFromPCI[ featureObject.modelType.name ] = true;
                }
            }
        }
    }
    return supportedFeaturesFromPCI;
}

function getSearchCriteriaForResourceData()
{
    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var searchCriteria = null;

    if(isTCVersion13OrLater())
    {
        searchCriteria = {
            parentUid: selectedMO.uid,
            parentElementUid: partMfgCtx.parentElementUid,
            displayMode: 'Table'
        };
    }
    else
    {
        searchCriteria = {
            parentUid: selectedMO.uid,
            bomLineUid: partMfgCtx.bomLine
        };
    }
    return searchCriteria;
}

function handleResponseForTC13OrLater(response, declViewModel)
{
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );
    var selectedMO = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    var mergedRows = [];
    if (response.searchResults && response.searchResults.objects) {
        var len = response.searchResults.objects.length;

        for (var idx = 0; idx < len; idx++) {
            var awb0Elem = viewModelObjectSvc.createViewModelObject(response.searchResults.objects[idx]);
            if( awb0Elem.props.awb0OccType ) {
                awb0Elem.props.awb0OccType.hasLov = true;
                awb0Elem.props.awb0OccType.dataProvider = 'occTypesDataProvider';
                if( declViewModel ) {
                    awb0Elem.props.awb0OccType.getViewModel = function() {
                        return declViewModel;
                    };
                }
            }
            mergedRows.push(awb0Elem);
        }
    }
    occTypeSvc.loadOccTypesInfo(selectedMO, mergedRows);

    response.searchResults = mergedRows;

    response.totalLoaded = mergedRows.length;

    if( !partMfgCtx.parentElement && response.ServiceData && response.ServiceData.plain ) {
        var plen = response.ServiceData.plain.length;
        if( plen > 0 ) {
            var parentElementUid = response.ServiceData.plain[ plen - 1 ];
            var productContextUid = response.ServiceData.plain[ plen - 2 ];
            var parentElemVmo = viewModelObjectSvc.createViewModelObject(parentElementUid);
            var prodContextVmo = viewModelObjectSvc.createViewModelObject(productContextUid);
            appCtxSvc.updatePartialCtx( 'PartMfg.parentElementUid', parentElementUid );
            appCtxSvc.updatePartialCtx( 'PartMfg.parentElement', parentElemVmo );
            appCtxSvc.updatePartialCtx( 'PartMfg.productContext', prodContextVmo );
            var supportedFeatures = getSupportedFeatures( partMfgCtx.productContext );
            appCtxSvc.updatePartialCtx( 'PartMfg.supportedFeatures', supportedFeatures );
        }
    }
}

function handleResponseForTC12OrBefore(response)
{
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );
    var mergedRows = [];
    if( response.searchResults && response.searchResults.objects ) {
        var len = response.searchResults.objects.length;
        var itemRevUids = [];
        for( var idx = 0; idx < len; idx += 2 ) {
            var bomLine = viewModelObjectSvc.createViewModelObject( response.searchResults.objects[ idx ] );
            var itemRev = viewModelObjectSvc.createViewModelObject( response.searchResults.objects[ idx + 1 ] );
            // Fix for D-58355 : The If-Else condition is added as a workaround to handle a case where  
            // there are more than one bomlines ( having different Find Nos) for same Item Revision.
            // In such case the size of internal map maintained by "aw-splm-table" is less than size of searchResults 
            // returned by performSearch and the internal logic of "aw-splm-table" calls performSearch soa few more times 
            // causing redundant rows being added in the resources table. This issue is fixed by replacing Item Revision with BOMLine
            // only for those rows which has more than one BOMLines and second BOMLine onwards for same Item Revision. 
            if(!itemRevUids.includes(itemRev.uid))
            {
                itemRevUids.push(itemRev.uid);
                tcVmoService.mergeObjects( bomLine, itemRev );

                if( bomLine.props.bl_occ_type ) {
                    bomLine.props.bl_occ_type.isEditable = false;
                }
                if( bomLine.props.bl_sequence_no ) {
                    bomLine.props.bl_sequence_no.isEditable = false;
                }
                mergedRows.push( bomLine );
            }
            else
            {
                tcVmoService.mergeObjects( itemRev, bomLine );
                mergedRows.push( itemRev );    
            }
        }
    }

    response.searchResults = mergedRows;

    response.totalFound /= 2;

    response.totalLoaded = mergedRows.length;

    if( !partMfgCtx.bomLine && response.ServiceData && response.ServiceData.plain ) {
        var plen = response.ServiceData.plain.length;
        if( plen > 0 ) {
            var uid = response.ServiceData.plain[ plen - 1 ];
            appCtxSvc.updatePartialCtx( 'PartMfg.bomLine', uid );
        }
    }
}

/**
 * Att1AttributeMappingService factory
 */

export default exports = {
    registerContext,
    unregisterContext,
    loadTreeTableProperties,
    loadActivitiesData,
    loadAttachmentsData,
    handleTabSelectionChange,
    loadResourcesData
};
app.factory( 'partManufacturingService', () => exports );
