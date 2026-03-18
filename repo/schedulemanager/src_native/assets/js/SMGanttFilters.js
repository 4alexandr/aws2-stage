// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/SMGanttFilters
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import filterPanelUtils from 'js/filterPanelUtils';
import searchFilterService from 'js/aw.searchFilter.service';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let buildFilters = function( ctx ) {
    if( ctx.smGanttCtx ) {
        ctx.smGanttCtx.searchStartIndex = 0;
        appCtxService.updateCtx( 'smGanttCtx', ctx.smGanttCtx );
    }

    let searchContext =  searchFilterService.buildSearchFilters( ctx.search );

    //Otherwise just update the context
    let contextChanged = !ngModule.equals( appCtxService.getCtx( 'search' ), searchContext );
    if( contextChanged ) {
        appCtxService.registerCtx( 'search', searchContext );
    }

    return searchContext;
};

export let ganttXRTFilter = function( activeFilters ) {
    eventBus.publish( 'ganttFilterEvent', activeFilters );
};

var refreshBreadcrumbProvider = function( data, search, searchFilterService ) {
    var breadcrumbConfig;
    var label = data.i18n.all;
    var pwaSelectionModel;
    var searchFilterMap = search.filterMap;
    var searchFilterCategories = search.filterCategories;
    var totalFound = search.totalFound;
    if( data.breadCrumbConfig && data.breadCrumbConfig.saw1GanttBreadcrumbConfig ) {
        breadcrumbConfig = data.breadCrumbConfig.saw1GanttBreadcrumbConfig;
    }
    return searchFilterService.buildBreadcrumbProvider( breadcrumbConfig, label, totalFound, pwaSelectionModel, searchFilterCategories, searchFilterMap );
};

export let updateBreadcrumData = function( data, ctx ) {
    data.provider = refreshBreadcrumbProvider( data, ctx.search, searchFilterService );
};

export let updateGanttBreadcrumb = function( ctx ) {
    eventBus.publish( 'updateBreadcrumbEvent', ctx );
};

exports = {
    buildFilters,
    ganttXRTFilter,
    updateBreadcrumData,
    updateGanttBreadcrumb
};

export default exports;
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member SMGanttFilters
 */
app.factory( 'SMGanttFilters', () => exports );
