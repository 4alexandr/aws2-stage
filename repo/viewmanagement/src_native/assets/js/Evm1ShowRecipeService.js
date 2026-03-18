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
 * Service to provide utility methods to support showing Recipe panel
 *
 * @module js/Evm1ShowRecipeService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

/**
 * Filters the recipe objects based on the property value match
 *
 * @param {Array} viewModelObjs - list of view model objects of recipe objects
 * @param {String} filter - filter text
 * @return {Array} filtered list of view model objects
 */
export let checkFilter = function( viewModelObjs, filter ) {
    var rData = [];
    var filterText;
    if( !_.isEmpty( filter ) ) {
        filterText = filter.toLocaleLowerCase().replace( /\\|\s/g, '' );
    }

    _.forEach( viewModelObjs, function( viewModelObj ) {
        if( filterText ) {
            var modelObj = cdm.getObject( viewModelObj.uid );
            // We have a filter, don't add nodes unless the filter matches a cell property
            var cellProps = modelObj.props.awp0CellProperties.dbValues;
            _.forEach( cellProps, function( property ) {
                var tmpProperty = property.toLocaleLowerCase().replace( /\\|\s/g, '' );
                if( tmpProperty.indexOf( filterText ) > -1 ) {
                    // Filter matches a property, add node to output elementList and go to next node
                    rData.push( viewModelObj );
                    return false;
                }
            } );
        } else {
            // No filter, just add the node to output elementList
            rData.push( viewModelObj );
        }
    } );
    return rData;
};

/**
 * Process the response and extract the recipe objects
 * Filter and return list of recipe data
 *
 * @param {Object} data - response from SOA
 */
export let processSoaResponseFunc = function( data ) {
    var rData = [];
    if( data.searchResults && data.searchResults.objects ) {
        rData = data.searchResults.objects;
    }
    data.recipeDataList.dbValue = rData;
    data.recipeDataFilterList.dbValue = data.recipeDataList.dbValue;
};

/**
 * Filter and return list of recipe data
 *
 * @param {Object} data - The view model data
 */
export let actionFilterList = function( data ) {
    // maintaining list of original data
    var rData = data.recipeDataList.dbValue;

    var filter = '';
    if( data.filterBox && data.filterBox.dbValue ) {
        filter = data.filterBox.dbValue;
    }

    if( rData.length > 0 ) {
        //update the list based on filter criteria
        data.recipeDataFilterList.dbValue = exports.checkFilter( rData, filter );
    }
};

/**
 * Execute Selected Recipe
 *
 * @param {Object} data - The view model data
 */
export let executeRecipe = function( data ) {
    // perform read before execute
    // get selection and productContext from ACE

    var occmgmtCtx = appCtxSvc.getCtx( 'occmgmtContext' );
    var selectedObjs = [];
    var productContext;
    var selectedRecipeObject;
    var rootElement;

    // check if ace product context exists
    if( occmgmtCtx && occmgmtCtx.productContextInfo ) {
        productContext = occmgmtCtx.productContextInfo;
    }

    // Save the root element from the ACE
    if( occmgmtCtx && occmgmtCtx.openedElement ) {
        rootElement = occmgmtCtx.openedElement;
    }

    // Check if seed selections are present i.e. BOM elements are selected in ACE.
    if( occmgmtCtx && occmgmtCtx.selectedModelObjects && occmgmtCtx.selectedModelObjects.length > 0 ) {
        selectedObjs = occmgmtCtx.selectedModelObjects;
    }

    // Maintain a flag userAction = 'execute' in recipe context
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        recipeCtx.userAction = 'execute';
        recipeCtx.executeRecipeInput = {
            productContext: productContext,
            selectedObjs: selectedObjs
        };
        recipeCtx.rootElement = rootElement;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        var executeRecipeInput = {
            productContext: productContext,
            selectedObjs: selectedObjs
        };

        recipeCtx = {
            userAction: 'execute',
            executeRecipeInput: executeRecipeInput,
            rootElement: rootElement
        };

        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }

    // Get selected recipe object from execute recipes panel
    if( data.dataProviders.dataProviderRecipeList.selectedObjects.length > 0 ) {
        selectedRecipeObject = data.dataProviders.dataProviderRecipeList.selectedObjects[ 0 ];
    }

    // fire event to open recipe.
    if( selectedRecipeObject ) {
        eventBus.publish( 'openSelectedRecipe', { uid: selectedRecipeObject.uid } );
    }
};

/**
 * Excecuting recipe to show in Relationship Browser
 */
export let executeShowRecipe = function( data ) {
    if( data.dataProviders && data.dataProviders.dataProviderRecipeList ) {
        var rootIds = appCtxSvc.ctx.mselected;
        var customFact = [];
        var recipeId = data.dataProviders.dataProviderRecipeList.selectedObjects[ 0 ].uid;
        _.forEach( rootIds, function( rootId ) {
            var rootUid = rootId.uid;
            if( cmm.isInstanceOf( 'Awb0Element', rootId.modelType ) && rootId.props.awb0UnderlyingObject ) {
                var uid = rootId.props.awb0UnderlyingObject.dbValues[ 0 ];
                if( uid ) {
                    rootUid = uid;
                }
            }
            var fact = 'object=' + rootUid + ',source=Recipe,recipe=' + recipeId;
            customFact.push( fact );
        } );

        eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
            expandDirection: 'all',
            customFact: customFact
        } );
    }
};

export default exports = {
    checkFilter,
    processSoaResponseFunc,
    actionFilterList,
    executeRecipe,
    executeShowRecipe
};
/**
 * Return an Object of Evm1ShowRecipeService
 *
 * @memberof NgServices
 * @param {Object} cdm Client Data Model
 * @param {Object} appCtxSvc appCtxService
 * @return {Object} service exports exports
 */
app.factory( 'Evm1ShowRecipeService', () => exports );
