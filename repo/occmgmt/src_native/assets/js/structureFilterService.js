//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/structureFilterService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import filterPanelService from 'js/filterPanelService';
import aceFilterService from 'js/aceFilterService';
import searchColorDecoratorService from 'js/searchColorDecoratorService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import uwPropertyService from 'js/uwPropertyService';
import filterPanelUtils from 'js/filterPanelUtils';
import proximityFilterService from 'js/proximityFilterService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import navigationUtils from 'js/navigationUtils';
import awSearchFilterService from 'js/awSearchFilterService';
import prefSvc from 'soa/preferenceService';



var exports = {};

var pciToFilterDataMap = [];
var _TRUE = [ 'true' ];

var structureFilterEventSubscritpions = [];
var jitterFreeContextState =  'aceActiveContext.context.retainTreeExpansionStateInJitterFreeWay';

var gatherAllFilterValuesAcrossCategories = function( categories ) {
    var filterValues = [];
    _.forEach( categories, function( category ) {
        _.forEach( category.filterValues, function( filterValue ) {
            filterValues.push( filterValue );
        } );
    } );
    return filterValues;
};

var isFilterSelected = function( filterValue ) {

     //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
     var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';
    if( appCtxSvc.ctx.state.params.filter ) {
        var isSelected = false;
        var appliedFilters = appCtxSvc.ctx.state.params.filter.split( '~' );
        for( var filterId = 0; filterId < appliedFilters.length; filterId++ ) {
            var categories = appliedFilters[ filterId ].split( '==' );
            if( categories.length === 2 && categories[ 0 ] === 'StringFilter' + '^^' + filterValue.categoryName ) {
                isSelected = categories[ 1 ].split( filterSeparator ).includes( filterValue.internalName );
                break;
            }
        }
        return isSelected;
    }
};

var isFilterValueSameAsInputFilterString = function( filterValue, inputFilterString ) {
    return filterValue.categoryName + '^^' + filterValue.internalName === inputFilterString;
};

var removeFromFilterValuesIfItDoesNotContain = function( filterValues, filterValue, whatToCheck ) {
    var entry = filterValues.filter( function( x ) {
        return x.categoryName === whatToCheck;
    } );
    if( !entry || !entry[ 0 ] ) {
        filterValues.splice( filterValues.indexOf( filterValue ), 1 );
    }
};

var removeOrphanDateEntries = function( filterValues ) {
    var isDateFilter = filterValues.filter( function( filter ) {
        return filter.type === filterPanelUtils.DATE_FILTER ||
            filter.type === filterPanelUtils.DATE_DRILLDOWN_FILTER;
    } );
    if( isDateFilter ) {
        for( var i = 0; i < isDateFilter.length; i++ ) {
            var tmpCategoryName = isDateFilter[ i ].categoryName.substring( 0, isDateFilter[ i ].categoryName
                .indexOf( '_0Z0_' ) );
            if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year' );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_week' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year_month' );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month_day' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_week' );
            }
        }
    }
};

var buildEffectiveFilterString = function( filterValues ) {
    removeOrphanDateEntries( filterValues );
    return getFilterString( filterValues );
};

var getFilterString = function( filterValues ) {

    var filterStringToReturn = '';
    var previousFilterValue;
    //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';

    _.forEach( filterValues, function( filterValue ) {
        if( previousFilterValue && previousFilterValue.categoryName === filterValue.categoryName ) {
            filterStringToReturn = filterStringToReturn + filterSeparator + filterValue.internalName;
        } else {
            if( filterStringToReturn === '' ) {
                filterStringToReturn = filterStringToReturn + 'StringFilter' + '^^' + filterValue.categoryName +
                    '==' + filterValue.internalName;
            } else {
                filterStringToReturn = insertFilterString( filterStringToReturn, filterValue );
            }
        }
        previousFilterValue = filterValue;
    } );
    return filterStringToReturn;
};

var insertFilterString = function( filterStringToReturn, filterValue ) {

   //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
   var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';  
    var appliedFilters = filterStringToReturn.split( '~' );
    var updatedFilterStringToReturn = '';
    for( var filterId = 0; filterId < appliedFilters.length; filterId++ ) {
        var foundCategory = false;
        var categories = appliedFilters[ filterId ].split( '==' );
        if( categories.length === 2 && categories[ 0 ] === 'StringFilter' + '^^' + filterValue.categoryName ) {
            foundCategory = true;
            appliedFilters[ filterId ] = appliedFilters[ filterId ] + filterSeparator + filterValue.internalName;
            break;
        }
    }
    if ( foundCategory === true ) {
        for( var indx = 0; indx < appliedFilters.length; indx++ ) {
            if ( _.isEmpty( updatedFilterStringToReturn ) ) {
                updatedFilterStringToReturn += appliedFilters[ indx ];
            } else {
                updatedFilterStringToReturn = updatedFilterStringToReturn + '~' + appliedFilters[ indx ];
            }
        }
    } else {
        filterStringToReturn = filterStringToReturn + '~StringFilter' + '^^' + filterValue.categoryName + '==' + filterValue.internalName;
        updatedFilterStringToReturn = filterStringToReturn;
    }
    return updatedFilterStringToReturn;
};

var lookupCategoriesInfoInCache = function( productContextInfoUID ) {
    var filterData;
    var categories;
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === productContextInfoUID;
        } );
    }
    if( filterData && filterData[ 0 ] ) {
        categories = filterData[ 0 ].categories;
    }
    return categories;
};

var getEffectiveFilterString = function( category, filter ) {
    var occMgmtCtx = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var categories = lookupCategoriesInfoInCache( productContextInfoUID );
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var effectiveFilterValuesToConsider = [];
    var effectiveFilterString = '';

    var filterString;
    if( !filter ) {
         //The value is entered in the text field of the category with no initial filter value list.
         filterString = category.internalName + '^^' + category.filterValues[ 0 ].prop.dbValue;
    } else {
         //The filter value is selected/deselection from the filter value list in the category.
         filterString = filter.categoryName + '^^' + filter.internalName;
    }

    if ( _.isEmpty( occMgmtCtx.recipe )  ) {
        _.forEach( filterValues, function( filterValue ) {
            if( isFilterSelected( filterValue ) && !isFilterValueSameAsInputFilterString( filterValue,
                filterString ) ||
                !isFilterSelected( filterValue ) && isFilterValueSameAsInputFilterString( filterValue,
                    filterString ) ) {
                effectiveFilterValuesToConsider.push( filterValue );
            }
        } );
        effectiveFilterString = buildEffectiveFilterString( effectiveFilterValuesToConsider );
        if( !filter ) {
            //The value is entered in the text field of the category.
            if( effectiveFilterString === '' ) {
                effectiveFilterString = effectiveFilterString + 'StringFilter' + '^^' + category.internalName +
                    '==' + category.filterValues[ 0 ].prop.dbValue;
            } else {
                effectiveFilterString = effectiveFilterString + '~StringFilter' + '^^' +
                    category.internalName + '==' + category.filterValues[ 0 ].prop.dbValue;
            }
        }
    } else {
        var currentRecipe = _.clone( occMgmtCtx.recipe );
        //filter.selected gives the current state of the filter that the action was performed on
        if (  !filter || filter.selected === false ) {
            //The value is entered in the text field of the category or a filter is selected
            //Need to construct filter map for all the current recipe entries plus the newly added/selected filter
            // Get all the filter values corresponding to existing recipe
            effectiveFilterValuesToConsider = getFilterMapFromRecipes( currentRecipe, false, filterString );
            // Add the selected attribute filter
            _.forEach( filterValues, function( filterValue ) {
                if( isFilterValueSameAsInputFilterString( filterValue,
                        filterString ) ) {
                    effectiveFilterValuesToConsider.push( filterValue );
                }
            } );
            effectiveFilterString = buildEffectiveFilterString( effectiveFilterValuesToConsider );
            if( !filter ) {
                //The value is entered in the text field of the category.
                if( effectiveFilterString === '' ) {
                    effectiveFilterString = effectiveFilterString + 'StringFilter' + '^^' + category.internalName +
                        '==' + category.filterValues[ 0 ].prop.dbValue;
                } else {
                    effectiveFilterString = effectiveFilterString + '~StringFilter' + '^^' +
                        category.internalName + '==' + category.filterValues[ 0 ].prop.dbValue;
                }
            }
        } else if ( filter.selected === true ) {
            //filter is deselected
            if ( currentRecipe.length === 1 ) {
                // the only filter is getting deselected
                effectiveFilterString = '';
            } else {
                effectiveFilterValuesToConsider = getFilterMapFromRecipes( currentRecipe, true, filterString );
                effectiveFilterString = buildEffectiveFilterString( effectiveFilterValuesToConsider );
            }
        }
    }

    return effectiveFilterString;
};

var getEffectiveFilterStringFromRecipe = function( updatedRecipe ) {
    var effectiveFilterValuesToConsider = getFilterMapFromRecipes( updatedRecipe, false );
    return buildEffectiveFilterString( effectiveFilterValuesToConsider );
};

var getFilterMapFromRecipes = function( recipes, validateToIncludeInputFilter, filterString ) {
    var occMgmtCtx = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var categories = lookupCategoriesInfoInCache( productContextInfoUID );
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var effectiveFilterValuesToConsider = [];

    _.forEach( recipes, function( recipe ) {
        if( recipe.criteriaType === 'Attribute' && recipe.criteriaOperatorType !== 'Clear' ) {
            var recipeFoundInMap = false;
            var recipeCategory = recipe.criteriaValues[ 0 ];
            var recipeFilterValue = recipe.criteriaValues[ 1 ];
            _.forEach( filterValues, function( filterValue ) {
                var filterCategory = filterValue.categoryName;
                var value = filterValue.internalName;
                if( recipeCategory === filterCategory && recipeFilterValue === value && isFilterSelected( filterValue ) ) {
                    recipeFoundInMap = true;
                    if ( validateToIncludeInputFilter ) {
                        if ( !isFilterValueSameAsInputFilterString( filterValue, filterString ) ) {
                                effectiveFilterValuesToConsider.push( filterValue );
                        }
                    } else {
                        effectiveFilterValuesToConsider.push( filterValue );
                    }
                }
            } );
            if ( !recipeFoundInMap ) {
                var filterValue = {};
                filterValue.categoryName = recipe.criteriaValues[ 0 ];
                filterValue.internalName = recipe.criteriaValues[ 1 ];
                filterValue.name = recipe.criteriaValues[ 1 ];
                filterValue.type = 'StringFilter';
                filterValue.selected = true;
                effectiveFilterValuesToConsider.push( filterValue );
            }
        }
    } );

    return effectiveFilterValuesToConsider;
};

var updateCategoriesInfoCacheForCurrentPCI = function( categories, rawCategories, rawCategoryValues ) {
    var occMgmtCtx = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var pciUID = occMgmtCtx.productContextInfo.uid;
    var pciVsFilterInfoEntry = {};
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        var filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );
        if( filterData && filterData[ 0 ] ) {
            filterData[ 0 ].categories = categories;
            filterData[ 0 ].rawCategories = rawCategories;
            filterData[ 0 ].rawCategoryValues = rawCategoryValues;
        } else {
            pciVsFilterInfoEntry = {
                pciUid: pciUID,
                categories: categories,
                rawCategories: rawCategories,
                rawCategoryValues: rawCategoryValues
            };
            pciToFilterDataMap.push( pciVsFilterInfoEntry );
        }
    } else {
        pciVsFilterInfoEntry = { // eslint-disable-line no-redeclare
            pciUid: pciUID,
            categories: categories,
            rawCategories: rawCategories,
            rawCategoryValues: rawCategoryValues
        };
        pciToFilterDataMap.push( pciVsFilterInfoEntry );
    }
};

var gatherSelectedFilterValues = function( filterValues ) {
    var selectedFilterValue = [];
    _.forEach( filterValues, function( filterValue ) {
        if( filterValue.selected ) {
            selectedFilterValue.push( filterValue );
        }
    } );
    return selectedFilterValue;
};

var computeFilterStringForCategories = function( categories ) {
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var selectedFilterValues = gatherSelectedFilterValues( filterValues );
    return buildEffectiveFilterString( selectedFilterValues );
};

export let computeFilterStringForNewProductContextInfo = function( newProductContextInfoUID ) {
    var filterString = '';
    var categories = lookupCategoriesInfoInCache( newProductContextInfoUID );
    if( categories ) {
        filterString = computeFilterStringForCategories( categories, newProductContextInfoUID );
    }
    return filterString;
};

var updateURLAsPerCurrentProductBeingOpened = function( eventData ) {
    var newProductContextInfoUID = eventData.newProductContextUID;
    var newState = {};
    var computedFilterString = exports.computeFilterStringForNewProductContextInfo( newProductContextInfoUID );
    newState.filter = _.isEmpty( computedFilterString ) ? null : computedFilterString;
    contextStateMgmtService.syncContextState( appCtxSvc.ctx.aceActiveContext.key, newState );
};

var clearCache = function() {
    pciToFilterDataMap = [];
};

var clearFilterInfoFromURL = function() {
    contextStateMgmtService.syncContextState( appCtxSvc.ctx.aceActiveContext.key, {
        filter: null
    } );
    clearCache();
};

var clearRecipeFromContext = function() {
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( aceActiveContext ) {
        aceActiveContext.recipe = [];
    }
};

var processRawFilterInfo = function( rawCategoriesInfo, rawFilterValues, data, processEmptyCategories ) {
    var processedCategories = filterPanelService.getCategories2( rawCategoriesInfo, rawFilterValues,
        undefined, searchColorDecoratorService.getColorPrefValue(), true, false );
    _.forEach( processedCategories, function( category, index ) {
        processedCategories[ index ].hasMoreFacetValues = !rawCategoriesInfo[index].endReached;
        processedCategories[index].startIndexForFacetSearch = rawCategoriesInfo[index].endIndex;
    } );
    aceFilterService.suppressDateRangeFilterForDateFilters( processedCategories );
    // Special processing for the Filter Categories for which no filter values were returned.
    // In such cases we plan to keep the category collapsed. For performance reasons, the server
    // does not return filter values for Filter categories based on Occurrence Properties, as part
    // of getSubsetInfo SOA service call.
    if( processEmptyCategories ) {
        updateEmptyAttributeFilterData( processedCategories );
    }
    updateCategoriesInfoCacheForCurrentPCI( processedCategories, rawCategoriesInfo, rawFilterValues );

    return processedCategories;
};

var getRawCategoriesAndCategoryValues = function( pci ) {
    var filterData;
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === pci;
        } );
    }
    if( filterData && filterData[ 0 ] ) {
        return {
            rawCategories: filterData[ 0 ].rawCategories,
            rawCategoryValues: filterData[ 0 ].rawCategoryValues
        };
    }
};

var fetchCategoriesInfoAndSelectApplicableCategory = function( productContextInfoUID, data ) {
    var input = {
        subsetInputs: [ {
            productInfo: {
                type: 'Awb0ProductContextInfo',
                uid: productContextInfoUID
            },
            requestPref: {},
            searchFilterFieldSortType: '',
            searchSortCriteria: []
        } ]
    };
    if( appCtxSvc.ctx.aceActiveContext.context.isShowConnection === true ) {
        input.subsetInputs[ 0 ].requestPref.includeConnections = _TRUE;
    }
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getSubsetInfo3', input )
        .then(
            function( response ) {
                if( response && response.filterOut ) {
                    var processedCategories = processRawFilterInfo(
                        response.filterOut[ 0 ].searchFilterCategories, response.filterOut[ 0 ].searchFilterMap, data, true /*prcoess Empty Filter Categories*/ );
                    exports.updateCategories( processedCategories, data, true );
                    processRecipeFromSubsetResponse( response.filterOut[ 0 ].recipe, data );
                }
            } );
};

/**
 * Select the filter
 * @param {Object} category selected category
 * @param {Object} filter selected filter value
 */
export let selectACEFilter = function( category, filter ) {
    appCtxSvc.ctx.aceActiveContext.context.requestPref.calculateFilters = true;
    appCtxSvc.ctx.aceActiveContext.context.requestPref.filterOrRecipeChange = true;

    // Clear selections when filters are being applied or modified in both single select and multiselect scenario
    //TODO - just check if selections needs to be cleared when Spatial filter is applied.
    appCtxSvc.ctx.aceActiveContext.context.clearExistingSelections = true;

    if( category.categoryType === 'Spatial' ) {
        var panelName = filter.internalName + 'SubPanel';
        var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var panelTitile = localTextBundle[ panelName ];

        //Open the subpanel to set the recipe input
        var eventData = {
            destPanelId: panelName,
            title: panelTitile,
            recreatePanel: true,
            isolateMode: false, //IsolateMode is set to false so as to access the subPanel's viewModel data. Have to check for the repurcussions.
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', eventData );
    } else {
        // First clear the incontext state when applying attribute filter. 
        if( appCtxSvc.ctx.aceActiveContext.context.currentState !== undefined ) {
            appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid = null;
        }
        
        //Process Attribute filter category value update
        var effectiveFilterString = getEffectiveFilterString( category, filter );
        var newState = {};
        newState.filter = _.isEmpty( effectiveFilterString ) ? null : effectiveFilterString;

        var categoriesInfo = aceFilterService.extractFilterCategoriesAndFilterMap( effectiveFilterString );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.appliedFilters', categoriesInfo );
        appCtxSvc.updatePartialCtx( jitterFreeContextState, true );

        //If the last filter is removed, then the recipe term operator should be set to clear
        if( effectiveFilterString.length === 0 && appCtxSvc.ctx.aceActiveContext.context.recipe.length === 1 ) {
            appCtxSvc.ctx.aceActiveContext.context.recipe[ 0 ].criteriaOperatorType = 'Clear';
        }
        contextStateMgmtService.updateContextState( appCtxSvc.ctx.aceActiveContext.key, newState, true );
    }
};

/**
 * Fetch the filter data
 *
 * @param {Object} data data object
 */
export let getFilterData = function( data ) {
    var categories = lookupCategoriesInfoInCache( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    if( categories ) {
        exports.updateCategories( categories, data, true );
        //sync the recipe
        if( data ) {
            data.recipe = appCtxSvc.ctx.aceActiveContext.context.recipe;
        }
    } else {
        fetchCategoriesInfoAndSelectApplicableCategory( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid, data );
    }
};

/**
 * Update the categories information
 *
 * @param {Object} categories list of categories
 * @param {Object} data data object
 * @param {boolean} processEmptyCategories Set this to true if you want to render the filter categories with no filter
 *                                         values returned by getSubsetInfo call as collapsed. False, otherwise.
 */
export let updateCategories = function( categories, data, processEmptyCategories ) {
    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var category = aceFilterService.getApplicableCategory( categories );
    aceFilterService.selectGivenCategory( category, 'aceActiveContext.context.categoriesToRender',
        rawCategories );
    if( processEmptyCategories ) {
        updateEmptyAttributeFilterData( categories );
    }
    updateSpatialFilterData( categories );
};

/**
 * This method is to do post processing after getOcc* SOA call is done. This includes populating Subset panel's
 * Viewmodel data, clearing temp variables in ctx and resetting panel.
 * @param {Object} data viewmodel data object
 */
export let performPostProcessingOnLoad = function( data ) {
    //process recipe only when recipe is updated( via filters apply or recipe term change )
    if( appCtxSvc.ctx.aceActiveContext.context.updatedRecipe ||
        appCtxSvc.ctx.aceActiveContext.context.appliedFilters ||
        appCtxSvc.ctx.aceActiveContext.context.contentRemoved === true ) {
        if( data ) {
            data.recipe = appCtxSvc.ctx.aceActiveContext.context.recipe;
        }
        //Publish the event so that any views that are interested when the PWA contents are updated
        //due to filter/recipe change update as necessary. Currently, this will be used by 3D Viewer.
        eventBus.publish( 'primaryWorkArea.contentsReloaded', {
            viewToReact: appCtxSvc.ctx.aceActiveContext.key
        } );
    }
    // Remove updatedRecipe and applied filters
    _removeTempRecipeObjFromAppCtx();
};

/**
 * This method is to post process the occgmmtContext object and remove the updatedRecipe and appliedFilters
 * objects from there. These are temp variables created only to hold the changes for creating the SOA input.
 */
function _removeTempRecipeObjFromAppCtx() {
    if( appCtxSvc.ctx.aceActiveContext.context.updatedRecipe ) {
        delete appCtxSvc.ctx.aceActiveContext.context.updatedRecipe;
    }
    if( appCtxSvc.ctx.aceActiveContext.context.appliedFilters ) {
        delete appCtxSvc.ctx.aceActiveContext.context.appliedFilters;
    }
}

var updateFilterInfo = function( data ) {
    var processedCategories;
    if( appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories &&
        appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories.length > 0 ) {
        processedCategories = processRawFilterInfo(
            appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories,
            appCtxSvc.ctx.aceActiveContext.context.searchFilterMap, data, true );
    }

    /**
     * There is at least one known case where the filter params are cleared from the URL when those should not
     * be because of lack of control over sequence of events. The following block will keep the URL consistent
     * in such cases.
     */
    var stateSvc = navigationUtils.getState();
    if( !appCtxSvc.ctx.aceActiveContext.context.currentState.filter ) {
        var productContextChangeData = {
            newProductContextUID: appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid
        };
        updateURLAsPerCurrentProductBeingOpened( productContextChangeData );
    }

    exports.updateCategories( processedCategories, data, true );
};

/**
 * Select the given ACE filter category
 *
 * @param {Object} category given category to select
 */
export let selectCategory = function( category ) {
    if( category.categoryType !== 'Proximity' && category.filterValues.length > 0 ) {
        var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
        aceFilterService.selectGivenCategory( category, 'aceActiveContext.context.categoriesToRender',
            rawCategories );
            updateSpatialFilterData( appCtxSvc.ctx.aceActiveContext.context.categoriesToRender );
    }
};

var omitUnwantedProperties = function( recipe, propertiesToOmit ) {
    var outRecipe = [];
    if ( recipe ) {
        recipe.forEach( function( term ) {
            var outTerm = _.omit( term, propertiesToOmit );
            if( outTerm.subCriteria && outTerm.subCriteria.length > 0 ) {
                outTerm.subCriteria = omitUnwantedProperties( outTerm.subCriteria, [ '$$hashKey' ] );
            }
            outRecipe.push( outTerm );
        } );
    }
    return outRecipe;
};

/**
 * Update the context on recipe update
 *
 * @param {Object} updatedRecipe the updated recipe to process onto context
 */
export let updateContextOnRecipeUpdate = function( updatedRecipe ) {
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( aceActiveContext ) {
        // Need to remove $$hashkey as it is added if the recipe in View Model is not tracked by $index
        // We are not tracking recipe by $index so that updates to recipe are reflected in the View whenever the recipe changes
        updatedRecipe =  omitUnwantedProperties( updatedRecipe, [ '$$hashKey' ] );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.updatedRecipe', updatedRecipe );
        appCtxSvc.updatePartialCtx( jitterFreeContextState, true );
    }
    appCtxSvc.ctx.aceActiveContext.context.requestPref.calculateFilters = true;
    // Clear selections when filters are being applied or modified in both single select and multiselect scenario
    appCtxSvc.ctx.aceActiveContext.context.clearExistingSelections = true;

    // Populate category search criteria in requestpref
    if( appCtxSvc.getCtx( 'aceActiveContext.context.categorysearchcriteria' ) ) {
        appCtxSvc.ctx.aceActiveContext.context.requestPref.categorysearchcriteria = appCtxSvc
            .getCtx( 'aceActiveContext.context.categorysearchcriteria' );
    }
    eventBus.publish( 'structureFilter.syncFilter', updatedRecipe );
};


/**
 * This method is to do post processing of recipes after getSubsetInfo3 SOA call is done.
 * This includes populating Subset panel's Viewmodel data
 * @param {Object} recipes list of recipes
 * @param {Object} data viewmodel data object
 */
var processRecipeFromSubsetResponse = function( recipes, data ) {
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( aceActiveContext ) {
        aceActiveContext.recipe = recipes;
        if( data ) {
            data.recipe = appCtxSvc.ctx.aceActiveContext.context.recipe;
            if( !_.isEmpty( data.recipe ) && !appCtxSvc.ctx.aceActiveContext.context.currentState.filter ) {
                var productContextChangeData = {
                    newProductContextUID: appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid
                };
                updateURLAsPerCurrentProductBeingOpened( productContextChangeData );
            }
        }
    }
};

/**
 * This function will process Filter Categories for which no filter values were sent by the server.
 * The aim of this function is to render such categories as Collapsed by default.
 * @param {object} categories existing categories
 */
var updateEmptyAttributeFilterData = function( categories ) {
    _.forEach( categories, function( category ) {
        if( category.categoryType === 'Attribute' && category.filterValues.length === 0 ) {
            // Show the expansion twisty on the filter category widget.
            category.showExpand = true;

            //The Text Search widget within filter categories relies on this variable to make
            // to decide whether to make a performFacetSearch or not. Setting this to true
            // allows the widget to performFacetSearch if a textsearch box is present in he UI.
            category.isServerSearch = true;

            // This flag will set the filter category to be rendered as collapsed.
            category.expand = false;
        }
    } );
};

/**
 * Update the Filter data of all category when we switch to discovery indexed
 * This is for the use case when we are switching from ace indexed to discovery indexed
 * Currently, for discovery indexed we donot populate Awb0AlternateConfiguration. In future
 * if the design changes, then we might have to revisit this code again
 * @param {object} categories existing categories
 */
var updateSpatialFilterData = function( categories ) {
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext.context' );

  if ( aceActiveContext.productContextInfo.props.awb0AlternateConfiguration !== undefined && aceActiveContext.productContextInfo.props.awb0AlternateConfiguration.dbValues[0] === '' ) {
        _.forEach( categories, function( category ) {
            for ( var i = 0; i < category.filterValues.length; i++ ) {
                category.filterValues[i].showColor = false;
            }
        } );
    }
};

/**
 * Build a single string filter that is displayed as a text field.
 *
 * @returns {Object} The string filter
 */
var getFilterValue = function() {
    var filterValue = {};
    filterValue.internalName = '';
    filterValue.type = 'StringFilter';
    filterValue.showCount = false;
    if( filterValue.name === '' && filterValue.stringValue === '$NONE' ) {
        filterValue.name = 'Unassigned';
    }
    return filterValue;
};

/**
 * Initialize
 * @param {Object} data data object
 */
export let initialize = function( data ) {
    if( structureFilterEventSubscritpions.length === 0 ) {
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'ace.resetStructureStarted', function() {
            clearFilterInfoFromURL();
            clearRecipeFromContext();
        } ) );

        // We need to update URL when active product changes. This event is fired when a change in selection results in change in active product.
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'ace.productChangedEvent', function(
            eventData ) {
            updateURLAsPerCurrentProductBeingOpened( eventData );
        } ) );

        structureFilterEventSubscritpions.push( eventBus.subscribe( 'appCtx.update', function( context ) {
            if( context && context.name === 'aceActiveContext' && context.target === 'context.configContext' &&
                Object.keys( context.value.aceActiveContext.context.configContext ).length > 0 ) {
                clearFilterInfoFromURL();
            }

            if( context && appCtxSvc.ctx.aceActiveContext && context.name === appCtxSvc.ctx.aceActiveContext.key &&
                context.target === 'searchFilterMap' ) {
                var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
                if( activeContext.searchFilterMap ) {
                    updateFilterInfo( data );
                }
            }
        } ) );
        structureFilterEventSubscritpions.push( eventBus.subscribe(
            'structureFilter.syncFilter',
            function( eventData ) {
                // First make sure incontext state is cleared (set as null) when filterSync call is made.
                if( appCtxSvc.ctx.aceActiveContext.context.currentState !== undefined ) {
                    appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid = null;
                }

                appCtxSvc.ctx.aceActiveContext.context.requestPref.filterOrRecipeChange = true;
                
                var updatedRecipe = eventData;
                var effectiveFilterString = getEffectiveFilterStringFromRecipe( updatedRecipe );
                if( !_.isEmpty( effectiveFilterString ) ) {
                    var categoriesInfo = aceFilterService.extractFilterCategoriesAndFilterMap( effectiveFilterString );
                    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.appliedFilters', categoriesInfo );
                    appCtxSvc.updatePartialCtx( jitterFreeContextState, true );
                }                

                // Make sure we set empty value for filter as null. The same has been done at all the other places
                // and we should try and follow the same pattern. It was found that since, this value was set as
                // empty string and the newState value set from other places in this utility were explicitly making
                // sure to set same variable as NULL if empty. Due to this the ACE framework treated this discrepancy
                // as change is value and thus triggered an extra getOcc SOA call.
                var newFilterString = _.isEmpty( effectiveFilterString ) ? null : effectiveFilterString;
                var newState = { filter: newFilterString };
                contextStateMgmtService.syncContextState( appCtxSvc.ctx.aceActiveContext.key, newState );
                eventBus.publish( 'acePwa.reset' );
            } ) );

        eventBus.subscribe( 'ace.updateFilterPanel', function() {
            var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
            if( context && context.requestPref ) {
                context.requestPref.calculateFilters = true;
            }
        } );
        // Set recipe operator as filter when subset panel is opened initially.
        if( appCtxSvc.ctx.aceActiveContext.context !== undefined &&
            !appCtxSvc.ctx.aceActiveContext.context.recipeOperator ) {
            appCtxSvc.ctx.aceActiveContext.context.recipeOperator = 'Filter';
        }
        if( appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories && appCtxSvc.ctx.aceActiveContext.context.searchFilterMap ) {
            updateFilterInfo( data );
        }
    }
    proximityFilterService.initialize();
};

export let updateRecipeAndFilterInfoForReplay = function() {
    // Update the active context by clearing the recipe and filter info
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.recipe', [] );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.searchFilterCategories', {} );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.searchFilterMap', {} );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.currentState.filter', '' );
};

/**
 * persistCategoryFilterToUpdateState
 * @param {Object} context event data object
 */
export let persistCategoryFilterToUpdateState = function( context ) {
    // Persist the values on the search context. This will be used later to merge the filter values
    // This function is called when More... is clicked and before the SOA call is made.
    // Update the category(activeFilter) and the current filter values for that category (searchFilterMap
    // on the search context. These values are used while processing the SOA response to append the response
    // filter values with the exising filter values.
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = context.category;
    contextSearchCtx.searchFilterMap = {};

    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var filterValues = rawCategories.rawCategoryValues;
    for ( var filter in filterValues ) {
        if ( filter === context.category.internalName ) {
            contextSearchCtx.searchFilterMap[filter] = filterValues[filter];
            break;
        }
    }
};

/**
 * getDataProvider
 * @returns {Object} data provider for facet search
 */
export let getFacetSearchDataProvider = function() {
    return 'Awb0FullTextSearchProvider';
};

/**
 * getSearchCriteriaForFacetSearch
 * @param {Object} category category for facet search
 * @returns {Object} data provider for facet search
 */
export let getSearchCriteriaForFacetSearch = function( category ) {
    var searchCriteria = {};

    searchCriteria.categoryForFacetSearch = category.internalName;
    searchCriteria.facetSearchString = category.filterBy;

    searchCriteria.forceThreshold = false;
    searchCriteria.searchString = '$DefaultSearchProvider_STD$*';
    searchCriteria.productContextUids = appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid;

    return searchCriteria;
};

/**
 * getStartIndexForFacetSearch
 * @param {Object} category category for facet search
 * @returns {Object} start index for the facet search
 */
export let getStartIndexForFacetSearch = function( category ) {
    return awSearchFilterService.getStartIndexForFilterValueSearch( category );
};

/**
 * updateFilterMapForFacet
 * @param {Object} data filter map from facet search response
 * @returns {Object} updated filters in the category(facet)
 */
export let updateFilterMapForFacet = function( data ) {
    // This function is call to process the performFacetSearch SOA response.
    // This is called when More... is clicked and search within the facet.
    // The current category(activeFilter) need to be set on search context so that
    // awSearchFilterService.setMapForFilterValueSearch can compute the filtermap values correctly
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = contextSearchCtx.valueCategory;

    // Get the updated merged filter map values
    var updatedFilterMap = awSearchFilterService.setMapForFilterValueSearch( data.searchFilterMap, contextSearchCtx );

    // Update the local cache with updated merged filter values
    var updatedCatName;
    var updateFilterValues;
    for ( var updateFilter in updatedFilterMap ) {
        updatedCatName =  updateFilter;
        updateFilterValues = updatedFilterMap[ updatedCatName ];
    }

    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var rawCategoryValues = rawCategoriesInfo.rawCategoryValues;
    for ( var rawCategoryValue in rawCategoryValues ) {
        if ( rawCategoryValue === updatedCatName ) {
            rawCategoryValues[rawCategoryValue] = updateFilterValues;
            break;
        }
    }

    var processedCategories = processRawFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, data, false /*DO NOT PRCESS EMPTY FACETS*/ );
    exports.updateCategories( processedCategories, data, false /*DO NOT PRCESS EMPTY FACETS*/ );

    return updatedFilterMap;
};

/**
 * Destroy
 */
export let destroy = function() {
    clearCache();
    _.forEach( structureFilterEventSubscritpions, function( subDef ) {
        eventBus.unsubscribe( subDef );
        structureFilterEventSubscritpions = [];
    } );
};

export default exports = {
    computeFilterStringForNewProductContextInfo,
    selectACEFilter,
    getFilterData,
    updateCategories,
    updateRecipeAndFilterInfoForReplay,
    performPostProcessingOnLoad,
    selectCategory,
    updateContextOnRecipeUpdate,
    persistCategoryFilterToUpdateState,
    getFacetSearchDataProvider,
    getSearchCriteriaForFacetSearch,
    getStartIndexForFacetSearch,
    updateFilterMapForFacet,
    initialize,
    destroy
};
app.factory( 'structureFilterService', () => exports );
