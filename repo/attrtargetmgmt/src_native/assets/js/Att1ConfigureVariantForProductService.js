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
 * @module js/Att1ConfigureVariantForProductService
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';
import msgSvc from 'js/messagingService';
import parsingUtils from 'js/parsingUtils';
import attrTableUtils from 'js/attrTableUtils';
import paramgmgtUtilSvc from 'js/Att1ParameterMgmtUtilService';

var exports = {};
var _selectionChangeListener = null;
var _variantGridContentLoadedListener = null;
var selectionChangedToTopNode = function( selectedObjects ) {
    var isTopNodeSelected = false;
    var viewMode = _.get( appCtxSvc, 'ctx.ViewModeContext.ViewModeContext', undefined );
    if( viewMode === 'TreeSummaryView' && selectedObjects.length === 1 && selectedObjects[ 0 ].levelNdx === 0 ) {
        isTopNodeSelected = true;
    }
    return isTopNodeSelected;
};
var subscribeContentLoadedForVariantGrid = function() {
    var selectShowParameters = _.get( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', undefined );
    if( !_variantGridContentLoadedListener && selectShowParameters ) {
        _variantGridContentLoadedListener = eventBus.subscribe( 'Pca0VariantsGrid.contentLoaded', function() {
            if( selectShowParameters ) {
                _.set( appCtxSvc, 'ctx.variantConditionContext.allowConsumerAppsToLoadData', true );
                _.set( appCtxSvc, 'ctx.variantConditionContext.consumerAppsLoadDataInProgress', true );
                _.set( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', true );
                exports.loadParameterVariants( _.get( appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', [] ), false );
            }
        } );
    }
};

var subscribePWASelectionChange = function() {
    var showParametersOnVC = _.get( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', undefined );
    if( !_selectionChangeListener && showParametersOnVC ) {
        _selectionChangeListener = eventBus.subscribe( 'primaryWorkArea.selectionChangeEvent', function( eventData ) {
            if( eventData && eventData.dataProvider && eventData.dataProvider.selectedObjects.length > 0 ) {
                //checkIf TopElementIsSelected only
                if( !selectionChangedToTopNode( eventData.dataProvider.selectedObjects ) ) {
                    if( showParametersOnVC ) {
                        exports.loadParameterVariants( eventData.dataProvider.selectedObjects, true );
                    }
                }
            }
        } );
    }
};
var unSubscribePWASelectionChange = function() {
    if( _selectionChangeListener ) {
        eventBus.unsubscribe( _selectionChangeListener );
        _selectionChangeListener = undefined;
    }
};
var unSubscribeContentLoadedForVariantGrid = function() {
    if( _variantGridContentLoadedListener ) {
        eventBus.unsubscribe( _variantGridContentLoadedListener );
        _variantGridContentLoadedListener = undefined;
        _.set( appCtxSvc, 'ctx.variantConditionContext.consumerAppsLoadDataInProgress', undefined );
    }
};
export let loadParameterVariants = function( selectedObjects, isSelectionChange ) {
    var deferred = AwPromiseService.instance.defer();
    var promise = exports.showParameters( selectedObjects, isSelectionChange );
    promise.then( function( response ) {
        deferred.resolve( response );
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
    deferred.promise;
};
var getPerformSearchViewModel4Input = function( parentUids, createParamVarConf ) {
    var openedObjectUid = attrTableUtils.getOpenedObjectUid();
    var openedObject = cdm.getObject( openedObjectUid );
    if( openedObject && openedObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        openedObjectUid = _.get( appCtxSvc, 'ctx.occmgmtContext.productContextInfo.props.awb0Product.dbValues[0]', undefined );
    }
    var productContextUids = _.get( appCtxSvc, 'ctx.occmgmtContext.productContextInfo.uid', '' );
    var isVariantConditionTabActive = createParamVarConf;
    var inputData = {
        inflateProperties: false,
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: 'AttributeMappingTable'
        },
        searchInput: {
            maxToLoad: 20,
            maxToReturn: 20,
            providerName: 'Att1AttributeMapProvider',
            searchCriteria: {
                openedObjectUid: openedObjectUid,
                showUnusedAttrs: 'false',
                parentUids: parentUids,
                queryMappedAttrs: 'true',
                productContextUids: productContextUids,
                isVariantConditionTabActive: isVariantConditionTabActive,
                dcpSortByDataProvider: 'true',
                showInOut: ''
            },
            searchSortCriteria: [ {
                fieldName: '',
                sortDirection: 'ASC'
            } ],
            startIndex: 0
        }
    };
    return inputData;
};
var registerPolicy = function() {
    return policySvc.register( {
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
};
export let toggleShowParameters = function() {
    var showParametersOnVC = _.get( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', undefined );
    if( !showParametersOnVC ) {
        _.set( appCtxSvc, 'ctx.variantConditionContext.allowConsumerAppsToLoadData', true );
        //this ctx variable to store status for Paramgmt since variant condition get reset when we leave variant views
        _.set( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', true );
        subscribeContentLoadedForVariantGrid();
        subscribePWASelectionChange();
    } else {
        _.set( appCtxSvc, 'ctx.parammgmtctx.showParametersOnVC', undefined );
        _.set( appCtxSvc, 'ctx.variantConditionContext.allowConsumerAppsToLoadData', undefined );
        unSubscribeContentLoadedForVariantGrid();
        unSubscribePWASelectionChange();
    }
};
export let showParameters = function( selectedObjects, isSelectionChange ) {
    var deferred = AwPromiseService.instance.defer();
    var policyId = registerPolicy();
    var parentUids = paramgmgtUtilSvc.getParentUids( selectedObjects );
    var promise = soaService.post( 'Internal-AWS2-2019-06-Finder',
        'performSearchViewModel4', getPerformSearchViewModel4Input( parentUids, 'true' ) );

    promise.then( function( response ) {
        exports.updateVcaContext( response, selectedObjects, isSelectionChange );
        policySvc.unregister( policyId );
        deferred.resolve( response );
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
    return deferred.promise;
};
export let updateVcaContext = function( response, selectedObjects, isSelectionChange ) {
    if( response.searchResultsJSON ) {
        var proxyAttrs = [];
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        var variantParameterMap = new Map();
        //populate Map with only selected objects from PWA
        _.forEach( selectedObjects, function( element ) {
            variantParameterMap.set( element.uid, [] );
        } );
        if( searchResults && searchResults.objects.length > 0 ) {
            //now add parameters from soa Response
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                var proxyParameter = cdm.getObject( searchResults.objects[ x ].uid );
                var sourceElementId = proxyParameter.props.att1SourceElement.dbValues[ 0 ];
                if( sourceElementId ) {
                    var parameterList = variantParameterMap.get( sourceElementId ) || [];
                    parameterList.push( proxyParameter );
                    variantParameterMap.set( sourceElementId, parameterList );
                }
            }
        }

        for( const [ sourceElementId, parameterList ] of variantParameterMap.entries() ) {
            var sourceElement = cdm.getObject( sourceElementId );
            proxyAttrs.push( sourceElement );
            proxyAttrs = proxyAttrs.concat( parameterList );
        }
        _.set( appCtxSvc, 'ctx.variantConditionContext.selectedObjectsFromConsumerApps', proxyAttrs );
        _.set( appCtxSvc, 'ctx.parammgmtctx.variantParameterMap', variantParameterMap );

        var consumerAppsLoadDataInProgress = _.get( appCtxSvc, 'ctx.variantConditionContext.consumerAppsLoadDataInProgress', undefined );
        if( consumerAppsLoadDataInProgress ) {
            _.set( appCtxSvc, 'ctx.variantConditionContext.consumerAppsLoadDataInProgress', undefined );
        }
        //reload the variantGrid on Selection Change
        if( isSelectionChange ) {
            eventBus.publish( 'variantTreeTable.initialized' );
        }
    }
};
export let hideParameterVariants = function() {
    _.set( appCtxSvc, 'ctx.parammgmtctx.variantParameterMap', undefined );
    _.set( appCtxSvc, 'ctx.variantConditionContext.allowConsumerAppsToLoadData', undefined );
    unSubscribePWASelectionChange();
    unSubscribeContentLoadedForVariantGrid();
};
/**
 * Returns the Att1ConfigureVariantForProduct instance
 *
 * @member Att1ConfigureVariantForProductService
 */

export default exports = {
    toggleShowParameters,
    showParameters,
    updateVcaContext,
    hideParameterVariants,
    loadParameterVariants
};
app.factory( 'Att1ConfigureVariantForProductService', () => exports );
