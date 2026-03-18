// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/TimelineXRTService
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import uiTimeline from 'js/UITimeline';
import timelineManager from 'js/uiGanttManager';
import timelineDataSource from 'js/TimelineDataSourceService';
import timelineEventHandler from 'js/Timeline/uiTimelineEventHandler';
import localeSvc from 'js/localeService';
import _cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';

'use strict';

var exports = {};

/**
 * This function will call at the reveal action of Timeline.
 *
 * @param {Object} response - response of the SOA.
 * @param {Object} data - The data Object.
 */

export let populateTimelineDataSource = function( response, data ) {
    var plans = [];
    var tasks = [];
    var task;
    for( var newObj in response.planEventsData ) {
        var planEvent = response.planEventsData[ newObj ];
        var plan = _cdm.getObject( planEvent.plan.uid );
        task = timelineDataSource.addPlan( plan );
        tasks.push( task );
        plans.push( plan );
        var events = planEvent.events;
        for( var newEventObjIndex in events ) {
            var event = timelineDataSource.addEvent( _cdm.getObject( events[ newEventObjIndex ].uid ) );
            tasks.push( event );
        }
    }
    var hasMore = response.hasMorePlanObjects;
    timelineDataSource.setHasMoreData( hasMore );
    var input = {};
    input.data = tasks;
    uiTimeline.initialize( data, input );
    var previousSplitView = timelineDataSource.getPreviousActiveSplit();
    appCtxService.registerCtx( 'activeSplit', previousSplitView );
    appCtxService.registerCtx( 'sublocationLink', {} );
    appCtxService.registerCtx( 'selectUid' );
    appCtxService.registerCtx( 'navigatePageId' );
    appCtxService.registerCtx( 'pageId' );
    appCtxService.registerCtx( 'selectionFlag', false );
    appCtxService.registerCtx( 'modelObjectSelectionFlag', false );
    appCtxService.registerCtx( 'unSubEvents', [] );
    appCtxService.registerCtx( 'Psi0SplitTimelineObjDeletedFlag', false );
    appCtxService.registerCtx( 'timelineProgramBoard', [] );
    appCtxService.registerCtx( 'activeProgramBoard', false );

    if ( previousSplitView ) {
        var contextObj = appCtxService.ctx.locationContext.modelObject;
        if ( contextObj ) {
            timelineEventHandler.updateSplitXrtViewFromSelection( contextObj.uid );
        }
    }
};


export default exports = {
    populateTimelineDataSource
};
