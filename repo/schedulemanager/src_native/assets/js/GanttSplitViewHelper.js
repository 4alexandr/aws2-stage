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
 * @module js/GanttSplitViewHelper
 */
import app from 'app';
import awColumnSvc from 'js/awColumnService';
import awTableService from 'js/awTableService';
import appCtxService from 'js/appCtxService';
import selectionService from 'js/selection.service';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let filterRows = function( data ) {
    var searchResults = JSON.parse( data.searchResultsJSON );
    var startIndex = 0;
    var loadResult = awTableService.createTableLoadResult( searchResults.length );
    loadResult.searchResults = searchResults;
    loadResult.searchIndex = startIndex + 1;
    return loadResult.searchResults;
};

export let buildSearchInput = function() {
    var ctx = appCtxService.ctx;
    var searchContentType = ctx.smGanttSplitContext.searchContentType;
    var types = [];
    if( searchContentType === 'SchTaskDeliverable' ) {
        types = [ {
            name: 'SchTaskDeliverable',
            properties: [ {
                    name: 'object_name'
                },
                {
                    name: 'fnd0DeliverableType'
                },
                {
                    name: 'fnd0SubmitTypeString'
                },
                {
                    name: 'fnd0DeliverableInstance'
                },
                {
                    name: 'fnd0InstanceReleaseStatus'
                },
                {
                    name: 'fnd0InstanceLastModfiedDate'
                },
                {
                    name: 'fnd0InstanceOwningUser'
                }
            ]
        } ];
    } else if( searchContentType === 'ResourceAssignment' ) {
        types = [ {
            name: 'ResourceAssignment',
            properties: [

                {
                    name: 'saw1AssigneeName'
                },
                {
                    name: 'saw1AssigneeType'
                },
                {
                    name: 'discipline'
                },
                {
                    name: 'resource_level'
                },
                {
                    name: 'saw1IsPrivilegedUser'
                }
            ]
        } ];
    }
    var policy = {};
    policy.types = types;
    appCtxService.updateCtx( 'smGanttSplitContext.policy', policy );
    var searchCriteria = {
        searchContentType: searchContentType,
        sublocationToken: 'tc_xrt_Gantt',
        parentUid: ctx.selected.uid
    };
    return searchCriteria;
};

export let syncGanttSplitSelection = function() {
    var selectionEvent = eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData.name === 'pselected' ) {
            eventBus.unsubscribe( selectionEvent );
            selectionService.updateSelection( appCtxService.ctx.smGanttSplitContext.selectedTask, appCtxService.ctx.selected );
        }
    } );
};

eventBus.subscribe( 'ganttSplitGridDataProvider.selectionChangeEvent', function( eventData ) {
    var selection = appCtxService.ctx.selected;
    var parentSelection = appCtxService.ctx.smGanttSplitContext.selectedTask;
    if( eventData.selectedObjects.length === 0 ) {
        selection = appCtxService.ctx.smGanttSplitContext.selectedTask;
        parentSelection = appCtxService.ctx.selected;
    } else {
        selection = eventData.selectedObjects;
    }
    selectionService.updateSelection( selection, parentSelection );
} );

export default exports = {
    filterRows,
    buildSearchInput,
    syncGanttSplitSelection
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member GanttSplitViewHelper
 */
app.factory( 'GanttSplitViewHelper', () => exports );
