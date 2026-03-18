/* eslint-disable require-jsdoc */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/IAV1ContentsTPTableService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import parsingUtils from 'js/parsingUtils';
import iconSvc from 'js/iconService';
import 'angular';
import 'lodash';
import awColumnSvc from 'js/awColumnService';
import tcVmoService from 'js/tcViewModelObjectService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _cdm from 'soa/kernel/clientDataModel';
import selectionService from 'js/selection.service';

var _promiseColumnConfig = null;
var _columnConfigData = null;
var exports = {};
var _deferExpandTreeNodeArray = [];
var _treeColumnInfos = [];

function promiseColumnConfig() {
    var deferred = AwPromiseService.instance.defer();

    if( _promiseColumnConfig.promise ) {
        _promiseColumnConfig.promise.then(

            function() {
                deferred.resolve();
            },
            function() {
                deferred.reject();
            } );
    } else {
        deferred.reject();
    }

    return deferred.promise;
}

function _buildTreeTableStructure( parentNode, deferred, treeLoadInput ) {
    var levelIndex = parentNode.levelNdx.toString();
    var selectedobj;
    var type = 'IAV0TestProcedurRevision';

    if( parentNode.type === 'rootType' ) {
        selectedobj = null;
        parentNode.isExpanded = false;
    } else {
        selectedobj = parentNode.uid;
        type = null;
        parentNode.isExpanded = true;
    }
    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: 'Att1ContentsAttrTable'
        },
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Crt1AnalysisRequestInProvider',
            searchCriteria: {
                parentUid: appCtxSvc.ctx.xrtSummaryContextObject.uid,
                requestedObjectUid: selectedobj,
                requestedTypeFilter: type
            }
        },
        inflateProperties: true
    };

    treeLoadInput.parentElement = parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : parentNode.uid;
    treeLoadInput.displayMode = 'Tree';

    exports.getDataFromProvider( deferred, treeLoadInput, soaInput );
}

export let getDataFromProvider = function( deferred, treeLoadInput, soaInput ) {
    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            var collabObjects = [];


            if( response.searchResultsJSON ) {
                var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                if( searchResults ) {
                    for( var x = 0; x < searchResults.objects.length; ++x ) {
                        var uid = searchResults.objects[ x ].uid;
                        var obj = response.ServiceData.modelObjects[ uid ];
                        if( obj ) {
                            dmSvc.getProperties( [ obj ], [ 'object_name' ] );
                            collabObjects.push( obj );
                        }
                    }
                }
            }

            var endReachedVar = response.totalLoaded + treeLoadInput.startChildNdx === response.totalFound;
            var startReachedVar = true;

            var tempCursorObject = {
                endReached: endReachedVar,
                startReached: true
            };

            var treeLoadResult = processProviderResponse( treeLoadInput, collabObjects, startReachedVar,
                endReachedVar );

            treeLoadResult.parentNode.cursorObject = tempCursorObject;

            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        },
        function( error ) {
            deferred.reject( error );
        } );
};

function processProviderResponse( treeLoadInput, searchResults, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var vmNodes = [];

    var parentNode = treeLoadInput.parentNode;
    var levelNdx = parentNode.levelNdx + 1;

    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];

        var vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx, parentNode );
        if( vmNode ) {
            vmNodes.push( vmNode );
            if( !vmNode.isLeaf ) {
                _deferExpandTreeNodeArray.push( vmNode );
            }
        }
    }

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, null );

    return treeLoadResult;
}

function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx, parentNode ) {
    var sourceObj = _cdm.getObject( obj.props.crt1SourceObject.dbValues[0] );
    var displayName = sourceObj.props.object_string.dbValues[ 0 ];

    if( sourceObj.props && sourceObj.props.awb0NumberOfChildren && sourceObj.props.awb0NumberOfChildren.dbValues ) {
        var noOfChildren = sourceObj.props.awb0NumberOfChildren.dbValues[0];
    }
    var hasChildren = containChildren( noOfChildren );
    var iconURL;

    // get Icon for node
    if( sourceObj.props.awb0UnderlyingObjectType && sourceObj.props.awb0UnderlyingObjectType.dbValues[0] ) {
        iconURL = iconSvc.getTypeIconURL( sourceObj.props.awb0UnderlyingObjectType.dbValues[0] );
    }else {
        if( sourceObj.type === 'Arm0ParagraphElement' ) {
        iconURL = iconSvc.getTypeIconURL( 'IAV0TestStepRevision' );
        }
    }

    var vmNode = awTableSvc
        .createViewModelTreeNode( obj.uid, obj.type, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = !hasChildren;
    if( parentNode !== null ) {
        vmNode.parentNode = parentNode;
    }


    return vmNode;
}

function containChildren( noOfChildren ) {
    if( noOfChildren !== '0') {
        return true;
    }
    return false;
}

export let loadTPTreeDataForVR = function( treeLoadInput ) {
    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    /**
     * Get the 'child' nodes async
     */
    _buildTreeTableStructure( treeLoadInput.parentNode, deferred, treeLoadInput );

    return deferred.promise;
};

export let loadTreeTableProperties = function() {
    /**
     * Extract action parameters from the arguments to this function.
     */
    var propertyLoadInput = awTableSvc.findPropertyLoadInput( arguments );

    if( propertyLoadInput ) {
        return _loadProperties( propertyLoadInput );
    }

    return AwPromiseService.instance.reject( 'Missing PropertyLoadInput parameter' );
};

function _loadProperties( propertyLoadInput ) {
    var allChildNodes = [];
    var propertyLoadContext = {
        clientName: 'AWClient',
        clientScopeURI: 'Att1ContentsAttrTable'
    };

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            allChildNodes.push( childNode );
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContext ).then(
        function( response ) {
            _.forEach( allChildNodes, function( childNode ) {
                var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
                    .getObject( childNode.id ), 'EDIT' );
                _.forEach( vmo.props, function( vmProp ) {
                    childNode.props[ vmProp.propertyName ] = vmProp;
                    var propColumns = response.output.columnConfig.columns;
                } );
            } );
            if( response ) {
                propertyLoadResult.columnConfig = response.output.columnConfig;
            }
            propertyLoadResult.columnConfig.columns[ 0 ].pixelWidth = 210;
            //update viewModelProperties
            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
}

function queryColumnConfig( columnConfigUri ) {
    // Get Column data

    var getOrResetUiConfigsIn = {
        scope: 'LoginUser',
        scopeName: '',
        clientName: 'AWClient',
        resetColumnConfig: false,
        columnConfigQueryInfos: [ {
            clientScopeURI: 'Att1ContentsAttrTable',
            operationType: 'configured',
            typeNames: [ 'Awb0Element' ],
            columnsToExclude: []
        } ],

        businessObjects: [ {} ]
    };

    var soaInput = {
        getOrResetUiConfigsIn: [ getOrResetUiConfigsIn ]
    };

    soaSvc.postUnchecked( 'Internal-AWS2-2017-06-UiConfig', 'getOrResetUIColumnConfigs2', soaInput ).then(
        function( response ) {
            // Process returned column data

            var columns;

            if( _isArrayPopulated( response.columnConfigurations ) ) {
                var columnConfigurations = response.columnConfigurations[ 0 ];

                if( _isArrayPopulated( columnConfigurations.columnConfigurations ) ) {
                    columnConfigurations = columnConfigurations.columnConfigurations;

                    if( _isArrayPopulated( columnConfigurations ) ) {
                        columns = _processUiConfigColumns( columnConfigurations[ 0 ].columns );
                    }
                }
            }

            _columnConfigData = { columnInfos: columns };

            _promiseColumnConfig.resolve();
        },
        function( error ) {
            _promiseColumnConfig.reject( error );
        } );
}

function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

function _processUiConfigColumns( columns ) {
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
            enableSorting: false,
            enableColumnMoving: true
        } );
        if (columnInfo.displayName === 'Element Name') {
            columnInfo.pixelWidth = 210;
        }

        _treeColumnInfos.push( columnInfo );
    }

    if( _treeColumnInfos.length > 0 ) {
        _treeColumnInfos[ 0 ].isTreeNavigation = true;
        _treeColumnInfos[ 0 ].enableColumnMoving = false;
        _treeColumnInfos[ 0 ].pinnedLeft = true;
    }

    return _treeColumnInfos;
}
export let loadTreeTableColumns = function( dataProvider, data ) { // Get the column config
    _promiseColumnConfig = AwPromiseService.instance.defer();

    let columnConfigUri = 'Att1ContentsAttrTable';

    data.columnConfigForDataProvider = columnConfigUri;

    queryColumnConfig( columnConfigUri );

    return promiseColumnConfig().then( function() {
        dataProvider.columnConfig = {
            columns: _columnConfigData.columnInfos
        };

        return _columnConfigData;
    } );
};
/*
 * Corrects selection to be Test procedure or its children
 */
export let changeSelection = function( data ) {
    var dataProvider = null;
    var selectedObjects = [];
    if( data && data.dataProviders && data.dataProviders.contentsTPTableProvider ) {
        dataProvider = data.dataProviders.contentsTPTableProvider;
        selectedObjects = dataProvider.selectedObjects;
        appCtxSvc.registerCtx( 'TR_TPTableSelection', selectedObjects );
    } else if( data && data.selectedObjects && data.selectedObjects.length > 0 ) {
        selectedObjects = data.selectedObjects;
    }
    appCtxSvc.registerCtx( 'selectedVRProxyObjects', selectedObjects );
    var selection = selectionService.getSelection();
    if(data && data.dataProviders && data.dataProviders.contentsTPTableProvider && data.dataProviders.contentsTPTableProvider.selectedObjects.length !== 0){
        appCtxSvc.registerCtx( 'isChangeSelectionForTPCalled', true );
    }
    var selectedElementsInPWA = _.get( appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', [] );
    if( selectedObjects.length > 0 && selectedElementsInPWA.length === 1 ) {
        parentSelection = selectedElementsInPWA[ 0 ];
    } else {
        if( !selection.parent ) {
            var parent = appCtxSvc.ctx.parentSelection;
            parentSelection = parent;
            appCtxSvc.registerCtx( 'pselected', parentSelection );
        } else {
            parentSelection = selection.parent;
            appCtxSvc.registerCtx( 'parentSelection', parentSelection );
        }
    }
    if( selectedObjects ) {
        var correctedSelection = [];
        var parentSelection;
        var selectedElementsInPWA = _.get( appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', [] );
        if( selectedObjects.length > 0 && selectedElementsInPWA.length === 1 ) {
            parentSelection = selectedElementsInPWA[ 0 ];
        } else {
            if( !selection.parent ) {
                var parent = appCtxSvc.ctx.parentSelection;
                parentSelection = parent;
                appCtxSvc.registerCtx( 'pselected', parentSelection );
            } else {
                parentSelection = selection.parent;
                appCtxSvc.registerCtx( 'parentSelection', parentSelection );
            }
        }
        // get the selected attributes
        for( var j = 0; j < selectedObjects.length; ++j ) {
            var objUid = selectedObjects[j].props.crt1SourceObject.dbValues[0];
            var attribute = cdm.getObject( objUid );
            correctedSelection.push( attribute );
        }
        // change the current selection
        if( correctedSelection.length > 0 ) {
            selectionService.updateSelection( correctedSelection, parentSelection );
        }
    }
};
/*
 * Corrects selection to be test or prod BOM
 */
export let changeSelectionForBOM = function( data ) {
    var dataProvider = null;
    var selectedObjects = [];
    if( data && data.dataProviders && data.dataProviders.testAndProdBOMTableProvider ) {
        dataProvider = data.dataProviders.testAndProdBOMTableProvider;
        selectedObjects = dataProvider.selectedObjects;
        appCtxSvc.registerCtx( 'TR_TestBOMTableSelection', selectedObjects );
    } else if( data && data.selectedObjects && data.selectedObjects.length > 0 ) {
        selectedObjects = data.selectedObjects;
    }
    var selection = selectionService.getSelection();
    var selectedElementsInPWA = _.get( appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', [] );
    if( selectedObjects.length > 0 && selectedElementsInPWA.length === 1 ) {
        parentSelection = selectedElementsInPWA[ 0 ];
    } else {
        if( !selection.parent ) {
            var parent = appCtxSvc.ctx.parentSelection;
            parentSelection = parent;
            appCtxSvc.registerCtx( 'pselected', parentSelection );
        } else {
            parentSelection = selection.parent;
            appCtxSvc.registerCtx( 'parentSelection', parentSelection );
        }
    }
    if( selectedObjects ) {
        var correctedSelection = [];
        var parentSelection;
        // get the selected attributes
        for( var j = 0; j < selectedObjects.length; ++j ) {
            var objUid = selectedObjects[j].props.crt1SourceObject.dbValues[0];
            var attribute = cdm.getObject( objUid );

            correctedSelection.push( attribute );
        }
        // change the current selection
        if( correctedSelection.length > 0 ) {
            selectionService.updateSelection( correctedSelection, parentSelection );
        }
    }
};

export let isElementAddedToTR = function( vmo, props ) {
    appCtxSvc.updatePartialCtx( 'decoratorToggle', true );
    if(vmo.props.crt1SourceObject.dbValues[0] !== ""){
    var objUid = vmo.props.crt1SourceObject.dbValues[0];
    var object = cdm.getObject( objUid );
    if( object && object.props && object.props.crt1AddedToAnalysisRequest &&
        object.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
        return true;
    }
    return false;
}
};

export let clearProviderSelectionForTP = function( data ) {
    if( data && data.dataProviders )
    {
        var dataProvider = data.dataProviders.contentsTPTableProvider;
        if( dataProvider )
        {
            dataProvider.selectNone();
        }
    }
};

export default exports = {
    getDataFromProvider,
    loadTPTreeDataForVR,
    loadTreeTableProperties,
    loadTreeTableColumns,
    changeSelection,
    changeSelectionForBOM,
    isElementAddedToTR,
    clearProviderSelectionForTP
};
app.factory( 'IAV1ContentsTPTableService', () => exports );
