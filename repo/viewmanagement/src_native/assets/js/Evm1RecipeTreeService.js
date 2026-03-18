//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 *
 *
 * @module js/Evm1RecipeTreeService
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import parsingUtils from 'js/parsingUtils';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdmSvc from 'soa/kernel/clientDataModel';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import eventBus from 'js/eventBus';
import tcVmoService from 'js/tcViewModelObjectService';
import AwPromiseService from 'js/awPromiseService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaSvc from 'soa/kernel/soaService';
import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';
import 'js/command.service';

var exports = {};

var _columnConfigData = null;
var _treeColumnInfos = [];

/**
 * This method is used to hide the execute reciep table if the result is 0.
 * if the totalFound is 0 then will hide the table and messege will be displayed.
 * @param {Object} data the view model data
 */
export let evaluateShowTable = function( data ) {

    var totalFound = _.get( data, 'recipeResultProxyObjects.length', 0 );
    if( totalFound === 0 ) {
        eventBus.publish( 'view.hideRecipeResultTable', {} );
    }
    // Recipe Execution is done so now Enable Show Result Button.
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        recipeCtx.isRecipeExecuting = false;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        recipeCtx = {};
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
};

/**
 * Get a page of row data for a 'tree' table.
 * @returns {promise} promise
 */
export let loadTreeTableProperties = function() {
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

    return loadTreeProperties( propertyLoadInput );
};

/**
 * This function will be used to load tree node properties.
 * @param {object} propertyLoadInput property load inputs
 * @returns {promise} Promise object
 */
var loadTreeProperties = function( propertyLoadInput ) {
    var allChildNodes = [];
    var propertyLoadContext = {
        clientName: 'AWClient',
        clientScopeURI: 'Evm1RecipeResults'
    };

    _.forEach( propertyLoadInput.propertyLoadRequests, ( propertyLoadRequest ) => {
        _.forEach( propertyLoadRequest.childNodes, ( childNode ) => {
            if( !childNode.props ) {
                childNode.props = {};
            }
            allChildNodes.push( childNode );
        } );
    } );

    //ensure the required properties are loaded
    var policyId = policySvc.register( {
        types: [ {
            name: 'Evm1RecipeResultProxy',
            properties: [ {
                    name: 'evm1UnderlyingObject'
                },
                {
                    name: 'evm1SourceObject'
                },
                {
                    name: 'evm1HasChildren'
                },
                {
                    name: 'evm1Parent'
                }
            ]
        } ]
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContext ).then(
        () => {
            _.forEach( allChildNodes, ( childNode ) => {
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdmSvc
                    .getObject( childNode.id ), 'EDIT' );
                _.forEach( vmo.props, ( vmProp ) => {
                    childNode.props[ vmProp.propertyName ] = vmProp;
                } );
            } );

            if( policyId ) {
                policySvc.unregister( policyId );
            }
            //update viewModelProperties
            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
};

/**
 * This function is use to load result of recipe execution.
 * @returns {promise} promise
 */
export let loadRecipeSearchTreeData = function() {
    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    let deferredLoad = AwPromiseService.instance.defer();
    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if( failureReason ) {
        deferredLoad.reject( failureReason );
        return deferredLoad.promise;
    }

    buildTreeTableStructure( treeLoadInput.parentNode, deferredLoad, treeLoadInput, arguments[ 1 ] );
    return deferredLoad.promise;
};

/**
 * This function calls the Soa performSearchViewModel4 to get the Recipe execution result.
 *
 * @param {ViewModelTreeNode} parentNode - A node that acts as 'parent' of a hierarchy of 'child' ViewModelTreeNodes.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {Data} data - data.
 *
 * @returns {promise} promise object
 */

var buildTreeTableStructure = function( parentNode, deferred, treeLoadInput, data ) {

    data.recipeProxyServiceDataObjects = [];
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    recipeCtx.recipeSearchCriteriaProvider.viewType = "treeView";
    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: "Evm1RecipeResults",
            operationType: "union"
        },
        searchInput: {
            maxToLoad: -1,
            maxToReturn: -1,
            providerName: "Evm1ShowRecipeRsltsProvider",
            searchCriteria: recipeCtx.recipeSearchCriteriaProvider,
            searchFilterFieldSortType: "Priority",
            searchSortCriteria: data.columnProviders.recipeSearchColumnProvider.sortCriteria,
            startIndex: data.dataProviders.recipeSearchDataProvider.startIndex,
            columnFilters: data.columnProviders.recipeSearchColumnProvider.columnFilters
        }
    };

    //ensure the required objects are loaded
    var policyId = policySvc.register( {
        types: [ {
            name: 'Evm1RecipeResultProxy',
            properties: [ {
                    name: 'evm1UnderlyingObject'
                },
                {
                    name: 'evm1SourceObject'
                },
                {
                    name: 'evm1HasChildren'
                },
                {
                    name: 'evm1Parent'
                }
            ]
        } ]
    } );

    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        ( response ) => {
            if( response.searchResultsJSON ) {
                data.recipeResultProxyObjects = [];
                var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                if( searchResults && isArrayPopulated( searchResults.objects ) ) {
                    _.forEach( searchResults.objects, ( object ) => {
                        data.recipeResultProxyObjects.push( object );
                        var uid = object.uid;
                        var obj = response.ServiceData.modelObjects[ uid ];
                        if( obj ) {
                            data.recipeProxyServiceDataObjects[ uid ] = obj;
                        }
                    } );
                }
            }
            if( policyId ) {
                policySvc.unregister( policyId );
            }

            var treeLoadResult = processProviderResponse( treeLoadInput, data );

            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        },
        ( error ) => {
            deferred.reject( error );
        } );
};

/**
 * isArrayPopulated
 *
 * @param {Object} object array of object
 * @returns {boolean} true if the array is populated
 */
var isArrayPopulated = function( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
};

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {Data} data - data.
 * @return {object} response
 */

var processProviderResponse = function( treeLoadInput, data ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;
    treeLoadInput.displayMode = 'Tree';
    treeLoadInput.parentElement = treeLoadInput.parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : treeLoadInput.parentNode.id;

    var levelNdx = parentNode.levelNdx + 1;
    var vmNodes = [];

    if( levelNdx === 0 ) {
        for( var idx = 0; idx < data.recipeResultProxyObjects.length; idx++ ) {
            var object = data.recipeResultProxyObjects[ idx ];
            var proxyObject = data.recipeProxyServiceDataObjects[ object.uid ];
            var parent = _.get( proxyObject, 'props.evm1Parent.dbValues[0]', undefined );
            if( parent === null ) {
                var columnForObjectName = _treeColumnInfos[ 0 ].name;
                var displayName = "";
                if( object.props.hasOwnProperty( columnForObjectName ) ) {
                    displayName = object.props[ columnForObjectName ].uiValues[ 0 ];
                } else {
                    displayName = proxyObject.props.evm1SourceObject.uiValues[ 0 ];
                }

                var objType = object.type;
                var objUid = object.uid;
                var iconType = object.type;
                var iconURL = null;

                var endObjectVmo = viewModelObjectSvc.createViewModelObject( object.uid, 'EDIT' );
                if( endObjectVmo ) {
                    iconType = endObjectVmo.type;
                }
                if( iconType ) {
                    iconURL = iconSvc.getTypeIconURL( iconType );
                }
                var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, idx, iconURL );

                var hasChildren = proxyObject.props.evm1HasChildren.dbValues[ 0 ];
                vmNode.isLeaf = hasChildren === '0';

                if( vmNode ) {
                    vmNodes.push( vmNode );
                }
            }
        }
    } else {
        var parentNodeUid = parentNode.uid;
        for( var idx = 0; idx < data.recipeResultProxyObjects.length; idx++ ) {
            var object = data.recipeResultProxyObjects[ idx ];
            var proxyObject = data.recipeProxyServiceDataObjects[ object.uid ];
            var parent = _.get( proxyObject, 'props.evm1Parent.dbValues[0]', undefined );

            if( parentNodeUid === parent ) {
                var columnForObjectName = _treeColumnInfos[ 0 ].name;
                var displayName = "";
                if( object.props.hasOwnProperty( columnForObjectName ) ) {
                    displayName = object.props[ columnForObjectName ].uiValues[ 0 ];
                } else {
                    displayName = proxyObject.props.evm1SourceObject.uiValues[ 0 ];
                }

                var objType = object.type;
                var objUid = object.uid;
                var iconType = object.type;
                var iconURL = null;

                var endObjectVmo = viewModelObjectSvc.createViewModelObject( object.uid, 'EDIT' );
                if( endObjectVmo ) {
                    iconType = endObjectVmo.type;
                }
                if( iconType ) {
                    iconURL = iconSvc.getTypeIconURL( iconType );
                }
                var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, idx, iconURL );

                var hasChildren = proxyObject.props.evm1HasChildren.dbValues[ 0 ];
                vmNode.isLeaf = hasChildren === '0';

                if( vmNode ) {
                    vmNodes.push( vmNode );
                }
            }
        }
    }
    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, false, true, true, null );
    return treeLoadResult;
};

/**
 * queryColumnConfig Function to load Columns for Recipe Tree table.
 * * @param {columnDeferred} columnDeferred - Parameters for the operation.
 *  @returns {promise} promise object
 */

var queryColumnConfig = function( columnDeferred ) {

    var getOrResetUiConfigsIn = {

        scope: 'LoginUser',
        scopeName: '',
        clientName: 'AWClient',
        resetColumnConfig: false,
        columnConfigQueryInfos: [ {
            clientScopeURI: 'Evm1RecipeResults',
            operationType: 'configured',
            typeNames: [ 'WorkspaceObject' ],
            columnsToExclude: []
        } ],

        businessObjects: [ {} ]
    };

    var soaInput = {
        getOrResetUiConfigsIn: [ getOrResetUiConfigsIn ]
    };

    soaSvc.postUnchecked( 'Internal-AWS2-2017-06-UiConfig', 'getOrResetUIColumnConfigs2', soaInput ).then(
        ( response ) => {
            // Process returned column data
            var columns;

            if( isArrayPopulated( response.columnConfigurations ) ) {
                var columnConfigurations = response.columnConfigurations[ 0 ];

                if( isArrayPopulated( columnConfigurations.columnConfigurations ) ) {
                    columnConfigurations = columnConfigurations.columnConfigurations;

                    if( isArrayPopulated( columnConfigurations ) ) {
                        columns = _processUiConfigColumns( columnConfigurations[ 0 ].columns );
                    }
                }
            }
            _columnConfigData = {
                columnInfos: columns
            };
            columnDeferred.resolve();
        },
        ( error ) => {
            columnDeferred.reject( error );
        } );
};

/**
 * Promise for column config
 * @returns {promise} promise object
 */
var promiseColumnConfig = function( columnDeferred ) {
    if( columnDeferred.promise ) {
        columnDeferred.promise.then(
            () => {
                columnDeferred.resolve();
            },
            () => {
                columnDeferred.reject();
            } );
    } else {
        columnDeferred.reject();
    }
    return columnDeferred.promise;
};

/**
 * Function to load Columns for Recipe Tree table.
 * @param {dataProvider} dataProvider data provider to set column config
 * @return {Promise} promise that will be resolved with the requested data when the data is available.
 */
export let loadTreeTableColumns = function( dataProvider ) {

    var columnDeferred = AwPromiseService.instance.defer();

    // Get the column config
    queryColumnConfig( columnDeferred );

    return promiseColumnConfig( columnDeferred ).then( () => {
        dataProvider.columnConfig = {
            columns: _columnConfigData.columnInfos
        };
        return _columnConfigData;
    } );
};

/**
 * _processUiConfigColumns
 *
 * @param {object} columns column
 * @return {Array} List of columns
 */
var _processUiConfigColumns = function( columns ) {
    // Save Column data for later arrange
    _treeColumnInfos = [];

    for( var idx = 0; idx < columns.length; ++idx ) {
        var columnInfo = awColumnSvc.createColumnInfo( {
            name: columns[ idx ].propDescriptor.propertyName,
            propertyName: columns[ idx ].propDescriptor.propertyName,
            displayName: columns[ idx ].propDescriptor.displayName,
            typeName: columns[ idx ].columnSrcType,
            maxWidth: 400,
            minWidth: 60,
            hiddenFlag: columns[ idx ].hiddenFlag,
            pixelWidth: columns[ idx ].pixelWidth,
            width: columns[ idx ].pixelWidth,
            enableColumnMenu: true,
            enableFiltering: false,
            enablePinning: true,
            enableSorting: true,
            enableColumnMoving: true
        } );

        _treeColumnInfos.push( columnInfo );
    }

    if( _treeColumnInfos.length > 0 ) {
        _treeColumnInfos[ 0 ].isTreeNavigation = true;
        _treeColumnInfos[ 0 ].enableColumnMoving = false;
    }
    return _treeColumnInfos;
};

/**
 * Fixing columns on reset action
 * @param {data} data dataprovider
 * @returns {columnConfig} default column config
 */
export let fixResetColumn = function( data ) {

    // The first column needs to have the isTreeNavigation set true otherwise
    // after reset the table will loose tree expand icons

    var columnConfig = {};

    if( isArrayPopulated( data.columnConfigurations ) ) {
        var columnConfigurations = data.columnConfigurations[ 0 ];

        if( isArrayPopulated( columnConfigurations.columnConfigurations ) ) {
            columnConfigurations = columnConfigurations.columnConfigurations;

            if( isArrayPopulated( columnConfigurations ) ) {
                columnConfig = columnConfigurations[ 0 ];

                if( isArrayPopulated( columnConfig.columns ) ) {
                    columnConfig.columns[ 0 ].isTreeNavigation = true;
                }
            }
        }
    }

    // make sure propertyName is set
    for( var z = 0; z < columnConfig.columns.length; ++z ) {
        columnConfig.columns[ z ].propertyName = columnConfig.columns[ z ].propDescriptor.propertyName;
    }
    _treeColumnInfos = _processUiConfigColumns( columnConfig.columns );
    var newColumnConfig = {
        columns: _treeColumnInfos
    };
    return newColumnConfig;
};

/**
 * Checks if string ends with given suffix
 * @param {str} str string
 * @param {suffix} suffix suffix
 * @return {boolean} true if the suffix is exists in given string
 */
var stringEndsWith = function( str, suffix ) {
    return str.indexOf( suffix, str.length - suffix.length ) !== -1;
};

/**
 * filterForProxy
 *
 * @param {vmos} vmos view model objects
 * @return {Array} List of proxy objects
 */

export let filterForProxy = function( vmos ) {
    var proxys = [];
    if( vmos ) {
        _.forEach( vmos, ( vmo ) => {
            if( stringEndsWith( vmo.type, 'Proxy' ) ) { proxys.push( vmo ); }
        } );
    }
    return proxys;
};

/**
 *  loadRecipeSearchChildData function to load child tree nodes. Its a next action function for dataprovider.
 * @returns {promise} promise having data for tree nodes.
 */
export let loadRecipeSearchChildData = function() {

    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    let deferredLoad = AwPromiseService.instance.defer();
    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if( failureReason ) {
        deferredLoad.reject( failureReason );
        return deferredLoad.promise;
    }

    /**
     * Get the 'child' nodes
     */
    var treeLoadResult = processProviderResponse( treeLoadInput, arguments[ 1 ] );
    deferredLoad.resolve( {
        treeLoadResult: treeLoadResult
    } );
    return deferredLoad.promise;
};

export default exports = {
    evaluateShowTable,
    loadTreeTableProperties,
    loadRecipeSearchTreeData,
    fixResetColumn,
    filterForProxy,
    loadTreeTableColumns,
    loadRecipeSearchChildData
};
app.factory( 'Evm1RecipeTreeService', () => exports );
