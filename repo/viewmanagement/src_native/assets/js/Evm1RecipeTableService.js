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
 *
 *
 * @module js/Evm1RecipeTableService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import Evm1RecipeBuilderService from 'js/Evm1RecipeBuilderService';
import ClipboardService from 'js/clipboardService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

/**
 * This method is used to set the showtable flag to display execute recipe table.
 * We need to maintain this flag because if the execute Recipe output is zero
 * then no table will be displayed.
 * @param {Object} data the view model data
 */
export let showTable = function( data ) {
    if( !data.showTable ) {
        data.showTable = true;
    } else {
        if( data.currentDisplay === "treeView" ) {
            eventBus.publish( 'view.executeRecipeTree', {} );
        } else {
            eventBus.publish( 'view.executeRecipe', {} );
        }
    }
};

/**
 * This method is used to hide the execute reciep table if the result is 0.
 * if the totalFound is 0 then will hide the table and messege will be displayed.
 * @param {Object} data the view model data
 */
export let evaluateShowTable = function( data ) {
    var totalFound = _.get( data, 'totalFound', 0 );
    if( totalFound === 0 ) {
        data.showTable = false;
        eventBus.publish( 'view.hideRecipeResultTable', {} );
        // If there are any columnFilters then we should clear it.
        // Because user have no option to clear filter as we show "No result found" messege for 0 result.
        if( data.columnProviders.recipeSearchColumnDataProvider && data.columnProviders.recipeSearchColumnDataProvider.columnFilters ) {
            data.columnProviders.recipeSearchColumnDataProvider.columnFilters = undefined;
        }
    }
    // Recipe Execution is done so now Enable Show Result Button.
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        recipeCtx.isRecipeExecuting = false;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        recipeCtx = {};
        recipeCtx.isRecipeExecuting = false;
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }

};

/**
 *   The copy command delegate for the user assignment objects in the surrogates table
 */
export let copyUnderlyingObject = function( objectToCopy ) {
    if( objectToCopy ) {
        var underlyingObjs = [];

        objectToCopy.forEach( function( obj ) {
            var underlyingobjectUid = _.get( obj, 'props.evm1UnderlyingObject.dbValues[0]', undefined );

            if( underlyingobjectUid ) {
                var underlyingobject = cdm.getObject( underlyingobjectUid );
                if( underlyingobject ) {
                    underlyingObjs.push( underlyingobject );
                }
            }
        } );

        // Copy userObjects to the clipboard
        ClipboardService.instance.setContents( underlyingObjs );
    }
};

/**
 * This method is used to process the selections made in the Recipe result table
 * @param {object} data the view-model data
 * @param {object} eventData the event-data which has the selected node in the Recipe result table
 */
export let processRecipeResultSelection = function( data, eventData ) {

    if( eventData && eventData.selectedObjects && eventData.selectedObjects.length > 0 ) {
        //Update the selections with the current selected seed
        var parentSelection = selectionService.getSelection().parent;
        if( !parentSelection ) {
            parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
        }

        var selection = [];
        for( var idx = 0; idx < eventData.selectedObjects.length; idx++ ) {
            var selectedNode = cdm.getObject( eventData.selectedObjects[ idx ].uid );
            selection.push( selectedNode );
        }
        selectionService.updateSelection( selection, parentSelection );

    } else {
        // For deselect move selection back to recipe.
        var parentSelection = selectionService.getSelection().parent;

        if( !parentSelection ) {
            parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
        }
        selectionService.updateSelection( parentSelection );
    }
};

/**
 * This method is used to get ViewModel data of Evm1RecipeResultsTableView
 */
export let evm1ExportToExcel = function() {
    eventBus.publish( 'view.EventForExcelExport', {} );
};

/**
 * This method is used to process the selected columns from recipe table.
 * @param {Object} data the view model data
 */
export let processExportToExcel = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        if( recipeCtx.recipeSearchCriteriaProvider ) {
            // LCS-350795 - For Export to Excel the view type needs to be tableView always.
            recipeCtx.recipeSearchCriteriaProvider.viewType = 'tableView';
        }
        var context = {
            "providerName": "Evm1ShowRecipeRsltsProvider",
            "dataProvider": data.dataProviders.recipeSearchDataProvider,
            "columnProvider": data.columnProviders.recipeSearchColumnDataProvider,
            "searchCriteria": recipeCtx.recipeSearchCriteriaProvider,
            "displayTitle": data.i18n.ExportToExcel,
            "vmo": appCtxSvc.ctx.xrtSummaryContextObject
        };
        commandPanelService.activateCommandPanel( 'Awp0ExportToExcel', 'aw_toolsAndInfo', context );
    }
};

/**
 * This method is used to set the showTable and totalFound flag to display execute recipe table.
 * We need to maintain showTable flag because if the totalFound is 0 then no table will be displayed.
 * We also need to maintain totalFound flag because if it is 0 then we have to display no results lable.
 * @param {Object} data the view model data
 */
export let hideRecipeResultTable = function( data ) {
    data.showTable = false;
    data.totalFound = 0;
};

export default exports = {
    showTable,
    evaluateShowTable,
    copyUnderlyingObject,
    processRecipeResultSelection,
    evm1ExportToExcel,
    processExportToExcel,
    hideRecipeResultTable
};
app.factory( 'Evm1RecipeTableService', () => exports );
