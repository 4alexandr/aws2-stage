//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 console,
 window,
 navigator,
 define,
 document
 */

/**
 * @module js/TimelineUtils
 */
import app from 'app';
import _cdm from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import eventBus from 'js/eventBus';
import timelineEventHandler from 'js/Timeline/uiTimelineEventHandler';

var exports = {};

/**
 * This function formats the planned date of event 
 * @param {data} data 
 */
export let formatPlannedDateForEvent = function( data ) {
    return dateTimeSvc.formatUTC( data.eventData.plannedDate );
};

/**
 * @param {var} id  - Id of the Event that is dragged
 * @param {date} plannedDate - New Date to be set after Event is dragged
 * @param {var} mode - The drag-and-drop Mode
 */
export let onEventDrag = function( id, plannedDate, mode ) {
    if( id ) {
        let eventObject = _cdm.getObject( id );
        let pd = new Date( plannedDate );
        if( mode === 'move' ) {
            let plannedDateProp = eventObject.props.prg0PlannedDate.dbValues[ 0 ];
            let oldPlannedDate = new Date( plannedDateProp );
            //This will read the hours and minute before drag and will assign to new date.
            //This way it will not have different hours depending on the amount of drag
            pd.setHours( oldPlannedDate.getHours() );
            pd.setMinutes( oldPlannedDate.getMinutes() );
        }
        let updateTasksInfo = {
            event: eventObject,
            plannedDate: pd
        };
        eventBus.publish( 'TimelineDragEvent', updateTasksInfo );
    }
};


export let setTimelineHeight = function( ctx ) {
    var prgTimelineEle = document.getElementsByClassName( 'prgTimeline' );
    if( ctx.activeProgramBoard && prgTimelineEle ) {
        var height = timelineEventHandler.getComputedHeight();
        prgTimelineEle[ 0 ].style.height = height / 2 + 'px';
        var programBoardElement = document.getElementsByClassName( 'aw-programPlanning-programBoard' );
        if( programBoardElement && programBoardElement[ 0 ] ) {
            var prgBoard = programBoardElement[ 0 ];
            prgBoard.style.height = height / 2 - 60 + 'px';
            prgBoard.style.width = '100%';
        }
    }
};

export let updateTimelineHeight = function() {
    var prgTimelineEle = document.getElementsByClassName( "prgTimeline" );
    if( prgTimelineEle ) {
        var height = timelineEventHandler.getComputedHeight();
        prgTimelineEle[ 0 ].style.height = height + "px";
        timelineEventHandler.getTimelineManeger().setSizes();
        timelineEventHandler.getTimelineManeger().render();
    }
};

export default exports = {
    formatPlannedDateForEvent,
    onEventDrag,
    setTimelineHeight,
    updateTimelineHeight
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member TimelineGanttUtils
 */
app.factory( 'TimelineUtils', () => exports );
