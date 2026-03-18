//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/TimelineDataSourceService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import timelineUtils from 'js/Timeline/uiTimelineUtils';
import prgTimelineUtils from 'js/TimelineUtils';
import timelineEventHandler from 'js/Timeline/uiTimelineEventHandler';
import _cmm from 'soa/kernel/clientMetaModel';
import _cdm from 'soa/kernel/clientDataModel';
import _dateTimeSvc from 'js/dateTimeService';
import selectionSvc from 'js/selection.service';
import ctxService from 'js/appCtxService';
import ganttManager from 'js/uiGanttManager';
import localStorage from 'js/localStorage';

'use strict';

var exports = {};

/**
 * The source schedule.
 */
var sourceObject;

/**
 * The Map of uid to time line info..
 */
var infoMap = new Object();

/**
 * The Map of uid to IModelObject.
 */
var infoToModelMap = new Object();

/**
 * The List of time line info.
 */
var timelineInfo = [];

/**
 * The boolean indicating if the Schedule has more tasks?
 */
var hasMoreData = false;

/**
 * Boolean indicating if a pagination request is in process?
 */
var paginationStarted = false;

/**
 * It will check if parent is same as target program selection when we do the Save As to the Project
 */
var isParentSame;

/**
 * Selection Object
 */
var selections = [];

/**
 * Parent Selection Object
 */
var parentSelection;


/**
 * Method to get the Value from infoMap.
 *
 * @param {var} key - key of infoMap.
 * @return value of the key.
 */
var getFromInfoMap = function( key ) {
    return infoMap[ key ];
};

/**
 * Method to get the Value from infoToModelMap.
 *
 * @param {var} key - key of infoToModelMap.
 * @return value of the key.
 */
var getFrominfoToModelMap = function( key ) {
    return infoToModelMap[ key ];
};

/**
 * Method to pass on the data to Timeline Util function for further processing
 * 
 * @param {var} id  - Id of the Event that is dragged
 * @param {date} plannedDate - New Date to be set after Event is dragged
 * @param {var} mode - The drag-and-drop Mode
 */
export let onEventDrag = function ( id, plannedDate, mode ) {
    return prgTimelineUtils.onEventDrag ( id, plannedDate, mode );
};

/**
 * This function will set the Event properties flag to true
 * It will then be used to show event properties in Timeline view
 */
export let showEventProperties = function() {
    if( ctxService.ctx.showEventProperties === true ) {
        ctxService.registerCtx( 'showEventProperties', false );
    } else {
        ctxService.registerCtx( 'showEventProperties', true );
    }
    ganttManager.getGanttInstance().render();
};

/**
 * This will reset the Context.
 *
 * @param {Object} ctx - Context object.
 */
export let revertCtx = function( ctx ) {
    var selected = ctx.locationContext.modelObject;
    var pSelected;
    if( typeof ctx.locationContext.modelObject.props.prg0ParentPlan.dbValues !== typeof undefined ||
        ctx.locationContext.modelObject.props.prg0ParentPlan.dbValues !== null ) {
        pSelected = _cdm.getObject( ctx.locationContext.modelObject.props.prg0ParentPlan.dbValues );
    }
    selectionSvc.updateSelection( selected, pSelected );
};

/**
 * Returns time in millseconds.
 *
 * @return {String} milliseconds - time in milliseconds.
 */
var getCurrentTimeInMillSecond = function() {
    var startDate = new Date();
    return startDate.getMilliseconds();
};

/**
 * Returns the difference between the end and start date.
 *
 * @param {String} end - The end time.
 * @param {String} start - The start time.
 * @return The difference in Long.
 */
var diffLong = function( end, start ) {
    return end - start;
};

/**
 * Calls the Load Plan Hierarchy Paginate Call.
 *
 * @param {Object} result - The response of SOA.
 */
export let paginatePlanAndEvents = function( result ) {
    var loadedInfos = [];
    var soaResponseGot = getCurrentTimeInMillSecond();
    console.log( '7. Pagination SOA response recieved. Processinf response:' );
    var timeLinesAndEvents = [];
    try {
        var planEventsData = result.planEventsData;
        for( var newIdx in planEventsData ) {
            var planEvent = planEventsData[ newIdx ];
            var plan = _cdm.getObject( planEvent.plan.uid );
            var planInfo = addPlanInfo( plan );
            loadedInfos.push( planInfo );

            var events = [];
            for( var newIdx in planEvent.events ) {
                var event = _cdm.getObject( planEvent.events[ newIdx ].uid );
                events.push( event );
            }

            for( var newEventIdx in events ) {
                var eventInfo = addEventInfo( events[ newEventIdx ] );
                loadedInfos.push( eventInfo );
            }
        }

        var hasMore = result.hasMorePlanObjects;
        hasMoreData = hasMore;

        for( var info in loadedInfos ) {
            var parent = loadedInfos[ info ].parent;
            var parentUID = null;
            if( parent !== null || typeof parent !== typeof undefined ) {
                parentUID = parent;
            }
            var objectInloadedInfos = _cdm.getObject( loadedInfos[ info ].uid );
            if( _cmm.isInstanceOf( 'Prg0AbsEvent', objectInloadedInfos.modelType ) ) {
                var plannedDateObj = new Date( loadedInfos[ info ].plannedDate );
                var plannedDate = _dateTimeSvc.formatNonStandardDate( plannedDateObj, 'yyyy-MM-dd HH:mm' );
                var forecastDateObj = null;
                if( loadedInfos[ info ].forecastDate ) {
                    forecastDateObj = new Date( loadedInfos[ info ].forecastDate );
                }
                var forecastDate = _dateTimeSvc.formatNonStandardDate( forecastDateObj, 'yyyy-MM-dd' );
                var actualDateObj = null;
                if( loadedInfos[ info ].actualDate ) {
                    actualDateObj = new Date( loadedInfos[ info ].actualDate );
                }
                var actualDate = _dateTimeSvc.formatNonStandardDate( actualDateObj, 'yyyy-MM-dd' );
                var event = constructEvent( loadedInfos[ info ].uid, loadedInfos[ info ].name, plannedDate,
                    'milestone', 'Event', parentUID, loadedInfos[ info ].colorCode, forecastDate, actualDate, loadedInfos[ info ].status, loadedInfos[ info ].eventCode );
                timeLinesAndEvents.push( event );
            } else {
                var timeline = constructTimeline( loadedInfos[ info ].uid, loadedInfos[ info ].name,
                    loadedInfos[ info ].type, parentUID, loadedInfos[ info ].status, loadedInfos[ info ].objectType );
                timeLinesAndEvents.push( timeline );
            }
        }
        //Call the native method to show more data.
        console.log( '8. SOA response processing finished preparing to render data: ' );
        var soaResponseProcessEnd = getCurrentTimeInMillSecond();
        var delta = diffLong( soaResponseProcessEnd, soaResponseGot );
        console.log( '9. Total time for processing SOA response took: ' + delta + ' milliseconds ' );
    } catch ( error ) {
        console.error( error );
    } finally {
        paginationStarted = false;
    }
    return timeLinesAndEvents;
};

/**
 * This will start the pagination in Timeline.
 */
export let paginate = function() {
    if( hasMoreData && !paginationStarted ) {
        console.log( '1. Paginate request started. Processing request : ' );
        var start = getCurrentTimeInMillSecond();
        paginationStarted = true;
        if( typeof timelineInfo !== typeof undefined && timelineInfo.length > 0 ) {
            var lastTimeLineinfo = timelineInfo[ timelineInfo.length - 1 ];
            var lastPlanUID = lastTimeLineinfo.uid;
            var lastPlan = getFrominfoToModelMap( lastPlanUID );
            if( lastPlan !== null || typeof lastPlan !== typeof undefined ) {
                var start = getCurrentTimeInMillSecond();
                console.log( '2. Pagination SOA request submit start : ' );
                eventBus.publish( 'callForPagination', lastPlan );
            }
        }
        console.log( '5. Paginate request ended and pagination request submitted : ' );
        var end = getCurrentTimeInMillSecond();
        var delta = diffLong( end, start );
        console.log( '6. Total time for paginate request submission took : ' + delta + ' milliseconds ' );
    }
};

/**
 * This will invoke when we select any item in Timeline.
 *
 * @param {String} id - The uid of the selected object.
 */
export let select = function( id ) {
    var task = _cdm.getObject( id );
    eventBus.publish( 'selectionChangedOnTimeline', selections );
    selectionSvc.updateSelection( task, ctxService.ctx.xrtSummaryContextObject );
};

/**
 * This will invoke when we deselect any item.
 */
export let deSelect = function() {
    exports.revertCtx( ctxService.ctx );
    eventBus.publish( 'selectionChangedOnTimeline', selections );
};

/**
 * This function will add the new plan items.
 *
 * @param {Object} object - The newly created plan object.
 * @param {Object} ctx - The Context Object
 * @return {Object} info - The TimeLineInfo representing the newly created plan object.
 */
var addNewPlanInfo = function( object, ctx ) {
    var info;
    info = getFromInfoMap( object.uid );
    if( info === null || typeof info === typeof undefined ) {
        var typeProp = isOfType( object );
        var nameProp = object.props.object_name.dbValues[ 0 ];
        var statusProp = object.props.prg0State.dbValues[ 0 ];
        var parentPlanProp = object.props.prg0ParentPlan.dbValues[ 0 ];
        var objectTypeProp = object.props.object_type.dbValues[ 0 ];

        var parentPlan = _cdm.getObject( parentPlanProp );
        var childs = [];

        //When we perform the Save As in Project, then this will check the Target Program ID is same as the Source/Parent Program.
        //And it will enable the flag isParentSame
        if( ctx.mselected[ 0 ].uid === parentPlanProp || ctx.state.params.uid === parentPlanProp ) {
            isParentSame = true;
        } else {
            isParentSame = false;
        }

        info = {
            uid: object.uid,
            name: nameProp,
            type: typeProp,
            status: statusProp,
            parent: '',
            children: childs,
            objectType: objectTypeProp
        };
        if( info !== null || typeof info !== typeof undefined ) {
            var parentPlanInfo;
            parentPlanInfo = getFromInfoMap( parentPlanProp );

            if( typeof parentPlanInfo !== typeof undefined ) {
                    timelineInfo.push( info );

                info.parent = parentPlanProp;

                for( var newObj in timelineInfo ) {
                    if( timelineInfo[ newObj ].uid === parentPlanInfo.uid ) {
                        for( var newIdx in timelineInfo ) {
                            if( timelineInfo[ newIdx ].uid === object.uid ) {
                                timelineInfo[ newObj ].children.push( timelineInfo[ newIdx ] );
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }
        var infoToPush = {
            uid: object.uid,
            modelObject: object
        };
        infoToModelMap[ object.uid ] = object;

        var infoMapToPut = {
            uid: object.uid,
            TimelineInfo: info
        };
        infoMap[ object.uid ] = info;
    }
    return info;
};

/**
 * This will add the Plan items.
 *
 * @param {Object} object - object to be added.
 * @return {Object} tasks - The task Object.
 */
export let addPlan = function( object ) {
    var info = addPlanInfo( object );
    var tasks;

    tasks = constructTimeline( info.uid, info.name, info.type, info.parent, info.status, info.objectType );
    return tasks;
};

/**
 * This will check the type of the model Object.
 *
 * @param {Object} modelObject - The model Object.
 * @return {Integer} type - The type of the Object.
 */
var isOfType = function( modelObject ) {
    var objType = modelObject.modelType;
    var type;
    if( _cmm.isInstanceOf( 'Prg0AbsProgramPlan', objType ) ) {
        type = 0;
    } else if( _cmm.isInstanceOf( 'Prg0AbsProjectPlan', objType ) ) {
        type = 1;
    } else if( _cmm.isInstanceOf( 'Prg0AbsEvent', objType ) ) {
        type = 4;
    } else {
        type = -1;
    }
    return type;
};

/**
 * This will set the previous sibling.
 *
 * @param {Object} plan - The Input plan object.
 * @param {String} prevID - The Previous Sibling ID.
 * @return {Object} plan - The Java Script object
 */
var setPlanPreviousSibling = function( plan, prevID ) {
    plan.prevID = prevID;
    return plan;
};

/**
 * The function will invoke when we create object in timeline.
 *
 * @param {Object} eventMap - eventData.
 * @param {Object} ctx - Context of the Object.
 * @return {Object} dataToReturn - Created data
 */
export let onObjectsCreated = function( eventMap, ctx ) {
    var isUpdateRequired = false;
    var createdObjects = eventMap[ 'cdm.created' ].createdObjects;

    var createdInfos = [];
    if( createdObjects !== null || typeof createdObjects !== typeof undefined ) {
        for( var newObj in createdObjects ) {
            var type = isOfType( createdObjects[ newObj ] );
            var timeline = null;
            switch ( type ) {
                case 1: {
                    var plan = addNewPlanInfo( createdObjects[ newObj ], ctx );
                    //If the new subproject is added then it will update the timeline or
                    //If the m_isParentSame is true it will update the timeline.
                    if( isParentSame ) {
                        if( ( plan !== null || typeof plan !== typeof undefined ) &&
                            ( plan.parent !== null || typeof plan.parent !== typeof undefined ) ) {
                            timeline = constructTimeline( plan.uid, plan.name, plan.type, plan.parent, plan.status, plan.objectType );
                            var parentPlanInfo = getFromInfoMap( plan.parent.uid );

                            if( typeof parentPlanInfo !== typeof undefined ) {
                                var childPlans = parentPlanInfo.children;
                                //the only child is this new plan.
                                if( childPlans !== null || typeof childPlans !== typeof undefined ) {
                                    if( childPlans.length > 1 ) {
                                        setPlanPreviousSibling( timeline, parentPlanInfo.uid );

                                        var idx;
                                        for( idx in parentPlanInfo.children ) {
                                            if( parentPlanInfo.children[ idx ].uid === plan.uid ) {
                                                break;
                                            }
                                        }
                                        //get last child
                                        --idx;
                                        if( idx > -1 ) {
                                            var prevSibling = parentPlanInfo.children[ idx ];
                                            setPlanPreviousSibling( timeline, prevSibling.uid );
                                        }
                                    }
                                }
                            }
                            createdInfos.push( timeline );
                        }
                    }
                    break;
                }
                case 4: {
                    var event = addEventInfo( createdObjects[ newObj ] );
                    var parentUID = event.parent;
                    var colorCode = event.colorCode;
                    var plannedDateObj = new Date( event.plannedDate );
                    var forecastDateObj = null;
                    if( event.forecastDate ) {
                        forecastDateObj = new Date( event.forecastDate );
                    }
                    var actualDateObj = null;
                    if( event.actualDate ) {
                        actualDateObj = new Date( event.actualDate );
                    }
                    var plannedDate = _dateTimeSvc.formatNonStandardDate( plannedDateObj, 'yyyy-MM-dd HH:mm' );
                    var forecastDate = _dateTimeSvc.formatNonStandardDate( forecastDateObj, 'yyyy-MM-dd' );
                    var actualDate = _dateTimeSvc.formatNonStandardDate( actualDateObj, 'yyyy-MM-dd' );
                    timeline = constructEvent( event.uid, event.name, plannedDate, 'milestone', 'Event', parentUID,
                        colorCode, forecastDate, actualDate, event.status, event.eventCode );
                    createdInfos.push( timeline );
                    break;
                }
                default: {
                    //
                }
            }
        }
        if( createdInfos.length > 0 ) {
            isUpdateRequired = true;
        }
        return {
            createdData: createdInfos,
            updateFlag: isUpdateRequired
        };
    }
};

/**
 * The function will invoke when we delete object in timeline.
 *
 * @param {Object} eventMap - eventData.
 * @return {Object} deletedObjects - deleted data
 */
export let onObjectsDeleted = function( eventMap ) {
    var deletedUids = eventMap[ 'cdm.deleted' ].deletedObjectUids;
    var deletedObjects = [];

    var deletedUid = deletedUids[ 0 ];
    var newObj;

    delete infoMap[ deletedUid ];

    if( timelineInfo !== null || typeof timelineInfo !== typeof undefined ) {
        var parent;
        for( newObj in timelineInfo ) {
            if( timelineInfo[ newObj ].uid === deletedUid ) {
                parent = timelineInfo[ newObj ].parent;
                timelineInfo.splice( newObj, 1 );
                break;
            }
        }

        for( newObj in timelineInfo ) {
            if( timelineInfo[ newObj ].uid === parent ) {
                for( var idx in timelineInfo[ newObj ].children ) {
                    if( timelineInfo[ newObj ].children.uid === deletedUid ) {
                        timelineInfo[ newObj ].children.splice( idx, 1 );
                        break;
                    }
                }
            }
        }
    }
    delete infoToModelMap[ deletedUid ];
    var deletedJSObject = objectToDelete( deletedUid );
    deletedObjects.push( deletedJSObject );

    if( deletedObjects.length > 0 ) {
        return deletedObjects;
    }
};

/**
 * This function will update the info related to plan items.
 *
 * @param {Object} modelObject - The updated Model object.
 * @return {Object} updatedTimelineInfo - Updated ITimeLineInfo.
 */
var updateTimelineInfo = function( modelObject ) {
    var updatedTimelineInfo = getFromInfoMap( modelObject.uid );
    if( typeof updatedTimelineInfo !== typeof undefined ) {
        var nameProp = modelObject.props.object_name.dbValues[ 0 ];
        var typeProp = isOfType( modelObject );
        var statusProp = modelObject.props.prg0State.dbValues[ 0 ];
        updatedTimelineInfo.name = nameProp;
        updatedTimelineInfo.type = typeProp;
        updatedTimelineInfo.status = statusProp;
        //replace the existing element.

        var index = timelineInfo.indexOf( updatedTimelineInfo );
        timelineInfo[ index ].name = updatedTimelineInfo.name;
        timelineInfo[ index ].status = updatedTimelineInfo.status;
        timelineInfo[ index ].type = updatedTimelineInfo.type;
        infoToModelMap[ modelObject.uid ] = modelObject;
        infoMap[ modelObject.uid ] = updatedTimelineInfo;
    }
    return updatedTimelineInfo;
};

/**
 * This function will update the info related to Event.
 *
 * @param modelObject The updated Model object.
 * @return Updated ITimeLineInfo.
 */
var updateEventInfo = function( modelObject ) {
    var updatedTimelineInfo = getFromInfoMap( modelObject.uid );
    if( typeof updatedTimelineInfo !== typeof undefined ) {
        var nameProp = modelObject.props.object_name.dbValues[ 0 ];
        var typeProp = isOfType( modelObject );
        var statusProp = modelObject.props.prg0State.dbValues[ 0 ];
        var prgPlanDateProp = modelObject.props.prg0PlannedDate.dbValues[ 0 ];
        var colorCode = modelObject.props.pgp0EventColor.dbValues[ 0 ];
        var prgForecastDateProp = modelObject.props.prg0ForecastDate.dbValues[ 0 ];
        var prgActualDateProp = modelObject.props.prg0ActualDate.dbValues[ 0 ];
        updatedTimelineInfo.name = nameProp;
        updatedTimelineInfo.type = typeProp;
        updatedTimelineInfo.status = statusProp;
        updatedTimelineInfo.colorCode = colorCode;
        updatedTimelineInfo.plannedDate = prgPlanDateProp;
        updatedTimelineInfo.forecastDate = prgForecastDateProp;
        updatedTimelineInfo.actualDate = prgActualDateProp;
        infoToModelMap[ modelObject.uid ] = modelObject;
        infoMap[ modelObject.uid ] = updatedTimelineInfo;
        return updatedTimelineInfo;
    }
    return updatedTimelineInfo;
};

/**
 * This function will update the Timeline Data.
 *
 * @param {Object} timelines - time line infos.
 * @return {Object} timelineArray - JsArray of time line info data.
 */
var updateTimelineData = function( timelines ) {
    var timelineArray = [];
    for( var newObj in timelines ) {
        if( typeof timelines[ newObj ] !== typeof undefined ) {
            var timeLineObj = updateTimeLineData( timelines[ newObj ] );
            timelineArray.push( timeLineObj );
        }
    }
    return timelineArray;
};

/**
 * This function will update the Event Data.
 *
 * @param {Object} events - event infos.
 * @return {Object} timelineArray - JsArray of event info data.
 */
var updateEventData = function( events ) {
    var timelineArray = [];
    for( var newObj in events ) {
        if( typeof events[ newObj ] !== typeof undefined ) {
            var plannedDateObj = new Date( events[ newObj ].plannedDate );
            var plannedDate = _dateTimeSvc.formatNonStandardDate( plannedDateObj,
                'yyyy-MM-dd HH:mm' );
            var forecastDateObj = null;
            if( events[ newObj ].forecastDate ) {
                forecastDateObj = new Date( events[ newObj ].forecastDate );
            }
            var forecastDate = _dateTimeSvc.formatNonStandardDate( forecastDateObj, 'yyyy-MM-dd' );
            var actualDateObj = null;
            if( events[ newObj ].actualDate ) {
                actualDateObj = new Date( events[ newObj ].actualDate );
            }
            var actualDate = _dateTimeSvc.formatNonStandardDate( actualDateObj, 'yyyy-MM-dd' );
            var timeLineObj = constructEvent( events[ newObj ].uid, events[ newObj ].name, plannedDate,
                'milestone', 'Event', events[ newObj ].parent, events[ newObj ].colorCode, forecastDate, actualDate,
                events[ newObj ].status, events[ newObj ].eventCode );
            timelineArray.push( timeLineObj );
        }
    }
    return timelineArray;
};

/**
 * This function will update the timeline Data.
 *
 * @param {Object} plan - The timeline
 * @return {Object} timeline - JS representation.
 */
var updateTimeLineData = function( plan ) {
    var parentUID = null;
    var parentInfo = plan.parent;
    if( parentInfo !== null || typeof parentInfo !== typeof undefined ) {
        parentUID = parentInfo;
    }
    return constructTimeline( plan.uid, plan.name, plan.type, plan.uid, plan.status, plan.objectType );
};

/**
 * The function will invoke when we update object in timeline.
 *
 * @param {Object} eventMap - eventData.
 * @return {Object} dataToRefresh - updated data
 */
export let onObjectsUpdated = function( eventMap ) {
    if( eventMap ) {
        var updatedObjects = eventMap[ 'cdm.updated' ].updatedObjects;
        var timelineInfos = [];
        var eventInfos = [];
        if( updatedObjects !== null || typeof updatedObjects !== typeof undefined ) {
            for( var newObj in updatedObjects ) {
                var type = isOfType( updatedObjects[ newObj ] );
                switch ( type ) {
                    case 0:
                    case 1: {
                        var timelineInfo = updateTimelineInfo( updatedObjects[ newObj ] );
                        timelineInfos.push( timelineInfo );
                        break;
                    }
                    case 4: {
                        var timelineInfo = updateEventInfo( updatedObjects[ newObj ] );
                        eventInfos.push( timelineInfo );
                        break;
                    }
                    default: {
                        //
                    }
                }
            }
            var timelines = [];
            var events = [];
            if( timelineInfos.length > 0 ) {
                timelines = updateTimelineData( timelineInfos );
            }
            if( eventInfos.length > 0 ) {
                events = updateEventData( eventInfos );
            }
            return {
                timelineData: timelines,
                eventData: events
            };
        }
    }
};

/**
 * This will create the container to delete the Object
 *
 * @param {String} deletedUID - uid to delete
 */
var objectToDelete = function( deletedUID ) {
    var deleted = {};
    deleted.id = deletedUID;
    return deleted;
};

/**
 * This will construct the timeline.
 *
 * @param id The id
 * @param name The name of the element.
 * @param programType type of program.
 * @param parent parent plan uid.
 * @param state state of the element.
 * @return the time line plan object
 */
var constructTimeline = function( id, name, type, parent, state, objectType ) {
    var timeline = {};
    timeline.id = id;
    timeline.text = name;
    timeline.type = 'milestone';
    timeline.order = 1;
    timeline.open = true;
    timeline.start_date = new Date();
    timeline.finish_date = new Date();
    timeline.programType = type;
    timeline.state = state;
    timeline.objectType = objectType;

    if( parent !== -1 ) {
        timeline.parent = parent;
    }
    return timeline;
};

/**
 * This will construct the Event.
 *
 * @param id Event UID
 * @param text name of event
 * @param startDate Planned Date of Event
 * @param taskType task type
 * @param programType Program Type
 * @param parent parent of event
 * @param color color
 * @param forecastDate Forecast Date of Event
 * @param actualDate Actual Date of Event
 * * @param status status of Event
 * @param eventCode Event Code of Event
 * @return Event object
 */
var constructEvent = function( id, text, startDate, taskType, programType, parent, color, forecastDate,
    actualDate, status, eventCode ) {
    var task = {};
    task.id = id;
    task.text = text;
    task.start_date = startDate;
    task.end_date = startDate;
    task.type = taskType;
    if( color.indexOf( '#' ) === 0 ) {
        task.color = color;
    } else {
        task.color = '#388ba6';
    }
    if( parent !== -1 ) {
        task.parent = parent;
    }
    task.programType = programType;
    task.forecastDate = forecastDate;
    task.actualDate = actualDate;
    task.status = status;
    task.eventCode = eventCode;

    return task;
};

/**
 * This function will add the event.
 *
 * @param {Object} event - Event Object.
 * @return {Object} events - Events Object
 */

export let addEvent = function( event ) {
    var info = addEventInfo( event );
    var events;
    var inputEvents;
    var milestoneType = 'milestone';
    var timelineEvent = 'Event';
    var plannedDateObj = new Date( info.plannedDate );
    var plannedDate = _dateTimeSvc.formatNonStandardDate( plannedDateObj, 'yyyy-MM-dd HH:mm' );
    var forecastDateObj = null;
    if( info.forecastDate ) {
        forecastDateObj = new Date( info.forecastDate );
    }
    var forecastDate = _dateTimeSvc.formatNonStandardDate( forecastDateObj, 'yyyy-MM-dd' );
    var actualDateObj = null;
    if( info.actualDate ) {
        actualDateObj = new Date( info.actualDate );
    }
    var actualDate = _dateTimeSvc.formatNonStandardDate( actualDateObj, 'yyyy-MM-dd' );

    events = constructEvent( info.uid, info.name, plannedDate, milestoneType, timelineEvent, info.parent,
        info.colorCode, forecastDate, actualDate, info.status, info.eventCode );
    return events;
};

/**
 * This will add the Event info.
 *
 * @param {Object} eventObject - eventObject
 * @return {Object} info - info related to added event.
 */

var addEventInfo = function( eventObject ) {
    var info;
    var ObjectUid = [];
    ObjectUid.push( eventObject.uid );

    if( info === null || typeof info === typeof undefined ) {
        var typeProp = isOfType( eventObject );
        var prg0PlanProp = eventObject.props.prg0PlanObject.dbValues[ 0 ];
        var nameProp = eventObject.props.object_name.dbValues[ 0 ];
        var statusProp = eventObject.props.prg0State.uiValues[ 0 ];
        var prgPlanDateProp = eventObject.props.prg0PlannedDate.dbValues[ 0 ];
        var prgForecastDateProp = eventObject.props.prg0ForecastDate.dbValues[ 0 ];
        var prgActualDateProp = eventObject.props.prg0ActualDate.dbValues[ 0 ];
        var eventColor = eventObject.props.pgp0EventColor.dbValues[ 0 ];
        var eventCodeProp = eventObject.props.prg0EventCode.dbValues[ 0 ];

        info = {
            uid: eventObject.uid,
            name: nameProp,
            type: typeProp,
            status: statusProp,
            plannedDate: prgPlanDateProp,
            forecastDate: prgForecastDateProp,
            actualDate: prgActualDateProp,
            colorCode: eventColor,
            parent: prg0PlanProp,
            eventCode: eventCodeProp
        };

        var uidPlanInfo = prg0PlanProp;
        var planInfo = getFromInfoMap( info.uid );
        infoToModelMap[ eventObject.uid ] = eventObject;
        infoMap[ eventObject.uid ] = info;
    }
    return info;
};

/**
 * This function will set the flag hasMoreData.
 *
 * @param {boolean} hasMore - flag to check hasMore Data.
 */
export let setHasMoreData = function( hasMore ) {
    hasMoreData = hasMore;
};

/**
 * This will add the Plan data.
 *
 * @param {Object} object - New Plan Object
 * @return {Object} info - info of the newly created Object.
 */
var addPlanInfo = function( object ) {
    var info = getFromInfoMap( object.uid );

    if( info === null || typeof info === typeof undefined ) {
        var typeProp = isOfType( object );
        var parentPlanProp = object.props.prg0ParentPlan.dbValues[ 0 ];
        var nameProp = object.props.object_name.dbValues[ 0 ];
        var statusProp = object.props.prg0State.uiValues[ 0 ];
        var objectTypeProp = object.props.object_type.dbValues[ 0 ];

        var parentPlanInfo = null;
        if( parentPlanProp !== null ) {
            parentPlanInfo = addPlanInfo( _cdm.getObject( parentPlanProp ) );
        }
        var childs = [];

        info = {
            name: nameProp,
            uid: object.uid,
            type: typeProp,
            status: statusProp,
            parent: parentPlanProp,
            children: childs,
            objectType: objectTypeProp
        };

        if( info !== null ) {
            if( parentPlanInfo !== null ) {
                for( var newObj in timelineInfo ) {
                    if( timelineInfo[ newObj ] === parentPlanInfo.uid ) {
                        parentPlanInfo.children.push( object.uid );
                        break;
                    }
                }
            }
            infoToModelMap[ object.uid ] = object;
            timelineInfo.push( info );
            infoMap[ object.uid ] = info;
        }
    }
    return info;
};

/**
 * This function will show or summary view in gantt
 */
export let toggleTimelineSummary = function() {
    var activeSPlit = ctxService.getCtx( 'activeSplit' );
    ctxService.updateCtx( 'activeSplit', !activeSPlit );

    localStorage.publish( 'TimelineSummaryViewState', activeSPlit? 'OFF' : 'ON' );

    var selectedTask = timelineUtils.getSelectedTaskID();
    if ( activeSPlit )
    {
        var xrtContext = ctxService.getCtx( 'ActiveWorkspace:xrtContext' );
        xrtContext.timelineWithDetails = 0;
        ctxService.updateCtx( 'ActiveWorkspace:xrtContext', xrtContext );
    }
    else {
        if ( ctxService.ctx.activeProgramBoard && ctxService.ctx.activeProgramBoard === true ) {
            ctxService.ctx.activeProgramBoard = false;
        }
    }

    timelineEventHandler.updateSplitXrtViewFromSelection( selectedTask );
};

/**
 * Return Split View active state.
 * @return {boolean} splitViewState - active state of split view.
 */
export let getPreviousActiveSplit = function() {
    let viewState = localStorage.get('TimelineSummaryViewState');
    return viewState !== null? viewState === 'ON' : false;
};

export let cleanup = function() {
    sourceObject = {};
    infoMap = {};
    infoToModelMap = {};
    timelineInfo = [];
    hasMoreData = false;
    paginationStarted = false;
    isParentSame = {};
    selections = [];
    timelineUtils.cleanup();

    if ( ctxService.ctx.unSubEvents ) {
        for( var index = 0; index < ctxService.ctx.unSubEvents.length; index++ ) {
            eventBus.unsubscribe( ctxService.ctx.unSubEvents[ index ] );
        }
    }

    ctxService.unRegisterCtx( 'activeSplit' );
    ctxService.unRegisterCtx( 'splitXrtViewModel' );
    ctxService.unRegisterCtx( 'linkProp' );
    ctxService.unRegisterCtx( 'selectUid' );
    ctxService.unRegisterCtx( 'navigatePageId' );
    ctxService.unRegisterCtx( 'pageId' );
    ctxService.unRegisterCtx( 'selectionFlag' );
    ctxService.unRegisterCtx( 'modelObjectSelectionFlag' );
    ctxService.unRegisterCtx( 'unSubEvents' );
    var xrtContext = ctxService.getCtx( 'ActiveWorkspace:xrtContext' );
    if ( xrtContext && xrtContext.timelineWithDetails )
    {
        xrtContext.timelineWithDetails = 0; 
    }

    // For ProgramBoard
    ctxService.unRegisterCtx( 'timelineProgramBoard' );
    ctxService.unRegisterCtx( 'activeProgramBoard' );
};

export default exports = {
    onEventDrag,
    showEventProperties,
    revertCtx,
    paginatePlanAndEvents,
    paginate,
    select,
    deSelect,
    addPlan,
    onObjectsCreated,
    onObjectsDeleted,
    onObjectsUpdated,
    addEvent,
    setHasMoreData,
    cleanup,
    toggleTimelineSummary,
    getPreviousActiveSplit
};
