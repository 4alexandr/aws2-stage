//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 console,
 define,
 document
 */

/**
 * @module js/Timeline/uiTimelineUtils
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';
import timelineManager from 'js/uiGanttManager';
import timelineEventHandler from 'js/Timeline/uiTimelineEventHandler';
import timelineOverrides from 'js/Timeline/uiTimelineOverrides';
import timelineTemplates from 'js/Timeline/uiTimelineTemplates';
import 'js/Timeline/aw.main.timeline.ctrl.controller';
import 'js/Timeline/aw-dhx-timeline.directive';
import 'dhtmlxgantt_multiselect';
import appCtx from 'js/appCtxService';


'use strict';
var exports = {};

/**
 * Initializes the Timeline by applying the CSS for the default skin, work time and custom style.
 */
export let assureCSSInitialization = function() {
    // This is check for CSS link which is used for Timeline
    // styling .
    var cssCheck = $( 'head:first > link' ).filter(
        '[href=\'' + app.getBaseUrlPath() + '/lib/dhtmlxgantt/skins/dhtmlxgantt_meadow.css\']' ).length;
    if( cssCheck === 0 ) {
        /**
         * Include the CSS for 'dhxgantt' module.
         */
        var link = document.createElement( 'link' );
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = app.getBaseUrlPath() + '/lib/dhtmlxgantt/skins/dhtmlxgantt_meadow.css';
        var linkNode = $( 'head:first > link' );
        document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
    }
};

/**
 * Initialize (i.e. 'bootstrap') the angular system and create an angular controller on a new 'child' of the given
 * 'parent' element.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 * @param {Object} data - Data object
 */
export let initTimelineWidget = function( parentElement, data, timelineDataSource ) {
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     * <P>
     * Include the DOM elements into the AngularJS system for AW and set the callback API function.
     */
    //function override should be added before the link is called so that the gantt is initialized correctly.
    timelineOverrides.addOverrides();

    var ctrlElement = $( '<div ng-controller="awMainTimelineCtrl"></div>' );

    var height = timelineEventHandler.getComputedHeight();
    ctrlElement.html( '<div data="tasks" class="prgTimeline" aw-dhx-timeline style="height:' + height + 'px; width:100%; margin-bottom:1px">' );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    var ctrlFn = ngUtils.include( parentElement, ctrlElement );
    if( ctrlFn ) {
        ctrlFn.parseData( data, timelineDataSource );
        timelineTemplates.addTemplates();
    }
};

/**
 * Sets the initial Timeline configuration.
 *
 * @param {object} timelineConfig - Configuration for Timeline.
 * @param {String} timelineZoomPreference - the value of preference to set the viewtype
 */
export let setTimelineConfig = function( timelineConfig, timelineZoomPreference ) {
    timelineManager.getGanttInstance().config.readonly = timelineConfig.readOnly;
    timelineManager.getGanttInstance().config.order_branch = timelineConfig.orderBranch;
    timelineManager.getGanttInstance().config.drag_move = timelineConfig.dragMove;
    timelineManager.getGanttInstance().config.drag_resize = timelineConfig.dragResize;
    timelineManager.getGanttInstance().config.drag_progress = timelineConfig.dragProgress;
    timelineManager.getGanttInstance().config.drag_links = timelineConfig.dragLinks;
    timelineManager.getGanttInstance().config.details_on_dblclick = timelineConfig.detailsOnDbClick;
    timelineManager.getGanttInstance().config.auto_scheduling = timelineConfig.autoScheduling;
    timelineManager.getGanttInstance().config.auto_scheduling_initial = timelineConfig.autoSchedulingInitial;
    timelineManager.getGanttInstance().config.auto_scheduling_strict = timelineConfig.autoSchedulingStrict;
    timelineManager.getGanttInstance().config.round_dnd_dates = timelineConfig.roundDndDates;
    timelineManager.getGanttInstance().config.fit_tasks = true;
    let viewType = 'month';
    if( timelineZoomPreference ) {
        viewType = timelineZoomPreference;
    }
    setTimelineZoomLevel( viewType, false );
};
/**
*
*For handling the case when sublocation is changed to honour the selection of viewType
*Here we have registered timelineZoomLevel to handle the case when a new user logs in and clicks on the command and just changes sublocations without refreshing the timeline.
* @param {object} data - Data object.
*/
export let updatePreferenceForTimelineZoom = function( data ) {
    if( data.preferences.AWC_Timeline_Zoom_Level ) {
        data.preferences.AWC_Timeline_Zoom_Level[0] = data.eventData.viewType;
    } else {
    appCtx.registerCtx( 'timelineZoomLevel', data.eventData.viewType );
    }
};

/**
*
* Transformation function for the viewType preference
* @param {String} viewType -Scale to load timeline.
* @param {boolean} flag - Flag to decide whether to render the timeline or not.
*/
export let setTimelineZoomLevel = function( viewType, flag ) {
    switch ( viewType ) {
        case 'day':
            viewType = 'week';
            break;
        case 'week':
            viewType = 'month';
            break;
        case 'month':
            viewType = 'day';
            break;
    }
    loadTimelineScale( viewType );
    if( flag ) {
        timelineManager.getGanttInstance().render();
    }
};

/**
*
* Function to decide the label of the timeline in case of month view
*this gives the quarter of the current month
* @param {Date} date - The current date to find the Quarter to be shown on the timeline
*/
export let quarterLabel = function( date ) {
    var month = date.getMonth();
    var q_num;
    if( month >= 9 ) {
        q_num = 4;
    } else if( month >= 6 ) {
        q_num = 3;
    } else if( month >= 3 ) {
        q_num = 2;
    } else {
        q_num = 1;
    }
    return 'Q' + q_num;
};

/**
* Method to load timeline based on scale.
*
* @param viewtype -Scale to load timeline.
*/
export let loadTimelineScale = function( viewType ) {
    switch ( viewType ) {
        case 'week':
            timelineManager.getGanttInstance().config.scale_unit = 'day';
            timelineManager.getGanttInstance().config.step = 1;
            timelineManager.getGanttInstance().config.date_scale = '%d, %D';
            timelineManager.getGanttInstance().config.scale_height = 60;
            var weekScaleTemplate = function( date ) {
                var weekText = timelineManager.getGanttInstance().locale.labels.weeks;
                var dateToStr = timelineManager.getGanttInstance().date.date_to_str( '%d %m' );
                var weekNum = timelineManager.getGanttInstance().date.date_to_str( '(' + weekText + ' %W)' );
                var endDate = timelineManager.getGanttInstance().date.add( timelineManager.getGanttInstance().date
                    .add( date, 1, 'week' ), -1, 'day' );
                return dateToStr( date ) + ' - ' + dateToStr( endDate ) + ' ' + weekNum( date );
            };
            timelineManager.getGanttInstance().config.subscales = [ {
                    unit: 'month',
                    step: 1,
                    date: '%F, %Y'
                }, {
                    unit: 'week',
                    step: 1,
                    template: weekScaleTemplate
                }

            ];
            timelineManager.getGanttInstance().config.row_height = 30;
            timelineManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                if( !timelineManager.getGanttInstance().isWorkTime( date ) ) {
                    return 'week_end';
                }
                return '';
            };
            break;
        case 'year':
        case 'month':
            timelineManager.getGanttInstance().config.scale_unit = 'week';
            timelineManager.getGanttInstance().config.step = 1;
            timelineManager.getGanttInstance().config.scale_height = 60;
            timelineManager.getGanttInstance().config.subscales = [ {
                    unit: 'month',
                    step: 1,
                    date: '%M'
                },
                {
                    unit: 'year',
                    step: 1,
                    date: '%Y'
                }
            ];
            timelineManager.getGanttInstance().config.row_height = 30;
            timelineManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                return '';
            };
            var weekScaleTemplate = function( date ) {
                var dateToStr = timelineManager.getGanttInstance().date.date_to_str( '%d' );
                var endDate = timelineManager.getGanttInstance().date.add( timelineManager.getGanttInstance().date
                    .add( date, 1, 'week' ), -1, 'day' );
                var weekNum = timelineManager.getGanttInstance().date.date_to_str( '(%W)' );
                return dateToStr( date ) + '-' + dateToStr( endDate ) + ' ' + weekNum( date );
            };
            timelineManager.getGanttInstance().templates.date_scale = weekScaleTemplate;
            break;
        case 'day':
            timelineManager.getGanttInstance().config.scale_unit = 'month';
            timelineManager.getGanttInstance().config.date_scale = '%M';
            timelineManager.getGanttInstance().config.scale_height = 60;
            timelineManager.getGanttInstance().config.subscales = [ {
                    unit: 'year',
                    step: 1,
                    date: '%Y'
                },
                {
                    unit: 'quarter',
                    step: 1,
                    template: quarterLabel
                }
            ];
            timelineManager.getGanttInstance().config.row_height = 30;
            timelineManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                return '';
            };
            break;
    }
};

/**
 * Method to set the default columns in the Timeline.
 *
 * @param {Array} columns -The gantt columns.
 */
export let setDefaultColumns = function( columns ) {
    timelineManager.getGanttInstance().config.columns = columns;
};

/**
 * Method to initialize the locale for the Timeline.
 *
 * @param {Array} date -The date information.
 * @param {Array} labels -The labels information.
 */
export let initLocale = function( date, labels ) {
    timelineManager.setLocalisedValues( date, labels );
    timelineManager.getGanttInstance().locale.date = date;
    timelineManager.getGanttInstance().locale.labels = labels;
};

/**
 * Method is callback from the GWT layer to show plans and events after a pagination request.
 *
 * @param {Array} plansAndEvents - Array of plan and event objects to be rendered in the timeline.
 */
export let showMoreData = function( plansAndEvents ) {
    plansAndEvents.forEach( function( planOrEvent ) {
        timelineManager.getGanttInstance().addTask( planOrEvent, planOrEvent.parent, planOrEvent.id );
    } );
    timelineManager.getGanttInstance().refreshData();
    timelineManager.getGanttInstance().render();
    var endTime = new Date().getTime();
    var startDate = timelineManager.startPaginate;
    var startTime = startDate.getTime();
    var delta = endTime - startTime;
    var total = plansAndEvents.length;
    timelineManager.debugMessage( '10. Total time for loading ' + total + ' objects took ' + delta +
        ' milliseconds' );
};
/**
 * Method is callback from the GWT layer to refresh tasks and links on the time-line after there is an update.
 *
 * @param {Array} timelines - Array of time-line objects to be rendered in the time line.
 * @param {Array} events - Array of event objects to be rendered in the time line.
 */
export let refreshTimeline = function( timelines, events ) {
    var hasUpdate = false;
    if( timelines ) {
        timelines.forEach( function( currentTimeline ) {
            var timeline = timelineManager.getGanttInstance().getTask( currentTimeline.id );
            timeline.text = currentTimeline.text;
            timeline.state = currentTimeline.state;
            timelineManager.getGanttInstance().refreshTask( timeline.id );
            hasUpdate = true;
        } );
    }

    if( events ) {
        events.forEach( function( currentEvent ) {
            var event = timelineManager.getGanttInstance().getTask( currentEvent.id );
            event.text = currentEvent.text;
            event.eventName = currentEvent.text;
            event.state = currentEvent.state;
            event.start_date = new Date( timelineManager.formatDate( currentEvent.start_date ) );
            event.forecastDate = currentEvent.forecastDate;
            event.actualDate = currentEvent.actualDate;
            event.end_date = new Date( timelineManager.formatDate( currentEvent.end_date ) );
            event.color = currentEvent.color;
            timelineManager.getGanttInstance().refreshTask( event.id );
            timelineManager.getGanttInstance().showDate( new Date( event.start_date ) );
            hasUpdate = true;
        } );
    }
    if( hasUpdate === true ) {
        timelineManager.getGanttInstance().refreshData();
    }

    timelineEventHandler.updateTodayMarkerHeight();
};

/**
 * Method is callback from the GWT layer to add newly created plans or events on the time-line.
 *
 * @param {Array} plansOrEvents - Array of newly created plan or event objects.
 *
 */
export let addCreatedObjectsOnTimeline = function( plansOrEvents ) {
    var hasUpdate = false;
    plansOrEvents.forEach( function( current ) {
        var prevSiblingIndex = null;
        if( current.programType === 'Event' ) {
            var startDateObject = new Date( timelineManager.formatDate( current.start_date ) );
            var endDateObject = new Date( timelineManager.formatDate( current.end_date ) );

            current.start_date = startDateObject;
            current.end_date = endDateObject;
        }
        if( typeof current.prevID !== 'undefined' ) {
            prevSiblingIndex = timelineManager.getGanttInstance().getTaskIndex( current.prevID );
            timelineManager.getGanttInstance().addTask( current, current.parent, prevSiblingIndex + 1 );
        } else {
            timelineManager.getGanttInstance().addTask( current, current.parent );
        }
        hasUpdate = true;
    } );
    if( hasUpdate === true ) {
        timelineManager.getGanttInstance().refreshData();
        timelineEventHandler.updateTodayMarkerHeight();
    }
};

/**
 * Method is callback from the GWT layer to remove timeline elements from the View.
 *
 * @param {Array} deletedObjects - Array of objects to be removed from the timeline.
 */
export let removeDeletedObjectsOnTimeline = function( deletedObjects ) {
    deletedObjects.forEach( function( deleted ) {
        var taskExists = timelineManager.getGanttInstance().isTaskExists( deleted.id );
        if( taskExists === true ) {
            timelineManager.getGanttInstance().deleteTask( deleted.id );
            timelineEventHandler.updateTodayMarkerHeight();
        }
    } );
    if( appCtx.ctx.activeSplit ) {
        for( var index = 0; index < appCtx.ctx.unSubEvents.length; index++ ) {
            eventBus.unsubscribe( appCtx.ctx.unSubEvents[ index ] );
        }

        timelineEventHandler.updateSplitXrtViewFromSelection();
    }
    appCtx.ctx.pgp0DeletedPlanObj = [];
};
/**
 * Method for getting the global task index. used in populating the rowNumber column.
 *
 * @param {Object} task - the task object.
 */
export let getGlobalTaskIndex = function( task ) {
    if( timelineManager.getGanttInstance().getGlobalTaskIndex( task.id ) === 0 ) {
        return '';
    }
    return timelineManager.getGanttInstance().getGlobalTaskIndex( task.id );
};

/**
 * Method for getting the ID of the Selected task.
 *
 * @return The id of the selected task.
 */
export let getSelectedTaskID = function() {
    return timelineManager.getGanttInstance().getSelectedId();
};

/**
 * Method for removing the selection of currently selected task.
 */
export let removeTaskSelection = function() {
    timelineManager.getGanttInstance().unselectTask();
};

/**
 * Method for cleanup. Like removing event handlers etc.
 */
export let cleanup = function() {
    timelineEventHandler.unregisterEventHandlers();
    timelineManager.destroyGanttInstance();
};

export default exports = {
    assureCSSInitialization,
    initTimelineWidget,
    setTimelineConfig,
    setDefaultColumns,
    initLocale,
    showMoreData,
    refreshTimeline,
    addCreatedObjectsOnTimeline,
    removeDeletedObjectsOnTimeline,
    getGlobalTaskIndex,
    getSelectedTaskID,
    removeTaskSelection,
    cleanup,
    quarterLabel,
    updatePreferenceForTimelineZoom,
    setTimelineZoomLevel,
    loadTimelineScale

};
