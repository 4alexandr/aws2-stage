//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 console
 */
'use strict';

/**
 * @module js/Timeline/uiTimelineEventHandler
 */
import $ from 'jquery';
import timelineManager from 'js/uiGanttManager';
import eventBus from 'js/eventBus';
import appCtx from 'js/appCtxService';
import selectionSvc from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';
import navigationSvc from 'js/locationNavigation.service';
import timelineUtils from 'js/Timeline/uiTimelineUtils';

var exports = {};
var _events = [];
var _awEvents = [];
var timelineHeightInPercentage = 0.6;
var splitterUpdate;
var summaryViewLoaded = false;

/**
 * Adds the default events.
 * @param {Object} timelineDataSource Instance of TimelineDataSource
 */
export let addDefaultEvents = function( timelineDataSource ) {
   // Event Drag Handler
   var afterTaskDragEvent = timelineManager.getGanttInstance().attachEvent( 'onAfterTaskDrag', function( id, mode ) {
       var taskExists = timelineManager.getGanttInstance().isTaskExists( id );
       if( taskExists ) {
           var task = timelineManager.getGanttInstance().getTask( id );
           var plannedDate = task.start_date.toGMTString();
           timelineDataSource.onEventDrag( id, plannedDate, mode );
       }
   } );
   _events.push( afterTaskDragEvent );

    //-------------------------------------------------------------------------------------------------------------
    //selection Event handlers
    var selectedEvent = timelineManager.getGanttInstance().attachEvent( 'onTaskSelected', function( id, item ) {
        console.log( 'Selected ID :' + id );
        timelineDataSource.select( id );
        var timelineContext = appCtx.getCtx('timelineContext');
        timelineContext.selected = appCtx.ctx.selected;
        appCtx.updateCtx( 'timelineContext', timelineContext);        
    });
    _events.push( selectedEvent );
    var unSelectedEvent = timelineManager.getGanttInstance().attachEvent( 'onTaskUnselected', function( id, item ) {
        console.log( 'Selected ID :' + id );
        timelineDataSource.deSelect();
        var timelineContext = appCtx.getCtx('timelineContext');
        timelineContext.selected = appCtx.ctx.selected;
        appCtx.updateCtx( 'timelineContext', timelineContext);     
    } );
    _events.push( unSelectedEvent );

    //-------------------------------------------------------------------------------------------------------------
    var onTaskClick = timelineManager.getGanttInstance().attachEvent(
        'onTaskClick',
        function( id, e ) {
            var target = e.target || e.srcElement;
            appCtx.ctx.selectionFlag = false;
            appCtx.ctx.modelObjectSelectionFlag = false;

            if ( appCtx.ctx.unSubEvents ) {
                for( var index = 0; index < appCtx.ctx.unSubEvents.length; index++ ) {
                    eventBus.unsubscribe( appCtx.ctx.unSubEvents[ index ] );
                }
            }
            if( target.className.indexOf( 'gantt_tooltip_open_icon' ) !== -1 || target.className.indexOf( 'gantt_tree_open_icon' ) !== -1 ) {
                openObject( id );
                return false;
            } else if( appCtx.ctx.activeSplit === true ) {
                updateSplitXrtViewFromSelection( id );
            } else if( timelineManager.getGanttInstance().getSelectedId() === id &&
                target.className.indexOf( 'gantt_tree_icon' ) === -1 ) {
                timelineManager.getGanttInstance().unselectTask( id );
                return false;
            }
            // Publish event for setup the Program Board
            eventBus.publish( 'setupProgramBoard.selectionChanged', id );

            return true;
        } );
    _events.push( onTaskClick );

    //-------------------------------------------------------------------------------------------------------------
    var onGanttRender = timelineManager.getGanttInstance().attachEvent(
        'onGanttRender',
        function() {
            exports.updateTodayMarkerHeight();
            return;
        } );
    _events.push( onGanttRender );

    //-------------------------------------------------------------------------------------------------------------
    var onTaskOpened = timelineManager.getGanttInstance().attachEvent(
        'onTaskOpened',
        function() {
            exports.updateTodayMarkerHeight();
            return;
        } );
    _events.push( onTaskOpened );

    //-------------------------------------------------------------------------------------------------------------
    var onTaskClosed = timelineManager.getGanttInstance().attachEvent(
        'onTaskClosed',
        function() {
            exports.updateTodayMarkerHeight();
            return;
        } );
    _events.push( onTaskClosed );

    //--------------------------------------------------
    var onScaleClick = timelineManager.getGanttInstance().attachEvent(
        'onScaleClick',
        function( e, date ) {
            timelineUtils.loadTimelineScale( timelineManager.getGanttInstance().config.scale_unit );
                var eventData = {
                    viewType: timelineManager.getGanttInstance().config.scale_unit
                };
            timelineManager.getGanttInstance().render();
            eventBus.publish( 'onScaleClickEvent', eventData );
        } );
    _events.push( onScaleClick );

    //register event for click on open icon on tooltip
    timelineManager.getGanttInstance()._click.gantt_tooltip_open_icon = timelineManager.getGanttInstance().bind(
        function( t, e, i ) {
            return openObject( e );
        }, timelineManager.getGanttInstance() );
};

/**
 * Registers AW generic events
 * @param {Object} timelineDataSource  Instance of TimelineDataSource
 */
export let registerAWEvents = function( timelineDataSource ) {
    // push this event as last in _events to differentiate from Gantt related events
    var subLocationChangeEvent = eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData.name === 'sublocation' ) {
            timelineDataSource.cleanup();
        }
    } );
    _awEvents.push( subLocationChangeEvent );

    // listen to  location change start event.
    var subLocationChangeStartEvent = eventBus.subscribe( '$locationChangeStart', function( eventData ) {
        if ( eventData.oldUrl && eventData.oldUrl.includes( 'pageId=' ) === false ) {
            var xrtContext = appCtx.getCtx( 'ActiveWorkspace:xrtContext' );
            if( xrtContext && xrtContext.timelineWithDetails !== 0 ) {
                xrtContext.timelineWithDetails = 0;
                appCtx.updateCtx( 'ActiveWorkspace:xrtContext', xrtContext );
            }
        }
    } );
    _awEvents.push( subLocationChangeStartEvent );

    var selectionEvent = eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if ( eventData.name === 'xrtSummaryContextObject' ) {
            let taskId = timelineManager.getGanttInstance().getSelectedId();

            if ( eventData.value && eventData.value.uid === taskId ) {
                let task = cdm.getObject( taskId );
                let pSelected;
                if ( task.modelType.typeHierarchyArray.indexOf( 'Prg0AbsPlan' ) > -1 && task.props.prg0ParentPlan.dbValues ) {
                    pSelected = cdm.getObject( task.props.prg0ParentPlan.dbValues[0] );
                } else if ( task.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 && task.props.prg0PlanObject.dbValues ) {
                    pSelected = cdm.getObject( task.props.prg0PlanObject.dbValues[0] );
                }
                selectionSvc.updateSelection( task, pSelected );
            }
        }
    } );

    _awEvents.push( selectionEvent );

    //add this workaround to fix objectset table unselection issue
    var objectSetSelectEvent = eventBus.subscribe( 'objectSet.selectionChangeEvent', function( eventData ) {
        var xrtContextObject = appCtx.getCtx( 'xrtPageContext' );
        if ( xrtContextObject.primaryXrtPageID === 'tc_xrt_Timeline' && xrtContextObject.secondaryXrtPageID ) {
            if ( eventData.source && eventData.source === 'primaryWorkArea' ) {
                let taskUid = timelineManager.getGanttInstance().getSelectedId();
                let task = cdm.getObject( taskUid );
                if ( !task ) {
                    task = appCtx.ctx.locationContext.modelObject;
                }
                var selectedObjects = eventData.selected;
                if (selectedObjects.length === 0) {
                    let pSelected;
                    if (task.modelType.typeHierarchyArray.indexOf('Prg0AbsPlan') > -1 && task.props.prg0ParentPlan.dbValues) {
                        pSelected = cdm.getObject(task.props.prg0ParentPlan.dbValues[0]);
                    } else if (task.modelType.typeHierarchyArray.indexOf('Prg0AbsEvent') > -1 && task.props.prg0PlanObject.dbValues) {
                        pSelected = cdm.getObject(task.props.prg0PlanObject.dbValues[0]);
                    }

                    selectionSvc.updateSelection(task, pSelected);
                } else {
                    selectionSvc.updateSelection(selectedObjects, task);
                }
            }
        }
    } );
    _awEvents.push( objectSetSelectEvent );
 
    //subscribe to awXRT2.contentLoaded event to reset size of timeline and summary view.
    var contentLoadedHandler =   eventBus.subscribe( 'awXRT2.contentLoaded', function( ) {
        var xrtContextObject = appCtx.getCtx( 'xrtPageContext' );
        if ( xrtContextObject.primaryXrtPageID === 'tc_xrt_Timeline' && xrtContextObject.secondaryXrtPageID ) {
            if ( !summaryViewLoaded )
            {
                resizer();
                summaryViewLoaded = true;
            }
        }
    } );
    _awEvents.push( contentLoadedHandler );

    //listen to window resize event.
    $( window ).resize( resizer );
};

splitterUpdate = eventBus.subscribe( 'aw-splitter-update', function( eventData ) {
    var height = exports.getComputedHeight();
    var timelineEle = document.getElementsByClassName( 'prgTimeline' );
    var splitTimelineEle = document.getElementById( 'splitTimeline' );
    let timelineHeight = 0;
    if( timelineEle ) {
        timelineHeight = eventData.area1.clientHeight - 2;
        if( appCtx.ctx.xrtPageContext.secondaryXrtPageID && appCtx.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Timeline' ) {
            timelineHeight = eventData.area1.clientHeight - 33; //offset for list in summary view
        }
        timelineEle[ 0 ].style.height = timelineHeight + 'px';
        timelineEle[ 0 ].parentElement.parentElement.style.flexBasis = 'auto';

        var programBoardElement = document.getElementsByClassName( 'aw-programPlanning-programBoard' );
        var programBoardWithSplitter = document.getElementById( 'programBoard' );
        if( appCtx.ctx.activeProgramBoard && programBoardElement && programBoardElement[ 0 ] && programBoardWithSplitter ) {
            var kanbanHeight = height - eventData.area1.clientHeight - 60;
            var kanbanWidth = eventData.area2.clientWidth;
            var resizeOptions = {
                height: kanbanHeight,
                width: kanbanWidth
            };
            programBoardElement[ 0 ].style.height = kanbanHeight + 'px';
            programBoardWithSplitter.style.height = kanbanHeight + 'px';
            programBoardElement[ 0 ].style.flexBasis = 'auto';
            eventBus.publish( 'ProgramBoard.resizeKanban', resizeOptions );
        }
    }

    if( splitTimelineEle ) {
        var updatedSplitHeight = height - parseInt( timelineHeight ) - 25;
        splitTimelineEle.style.height = updatedSplitHeight + 'px';
    }
    timelineHeightInPercentage = ( eventData.area1.clientHeight - 2 ) / height;

    timelineManager.getGanttInstance().setSizes();
    timelineManager.getGanttInstance().render();
} );

/**
 * This will resize the Gantt when the screen/browser size is changed.
 */
function  resizer() {
    var height = exports.getComputedHeight();
    var timelineElement = document.getElementsByClassName( 'prgTimeline' );

    if( timelineElement && timelineElement.length > 0 ) {
        var splitTimelineEle = document.getElementById( 'splitTimeline' );
        var programBoardElement = document.getElementsByClassName( 'aw-programPlanning-programBoard' );
        var splittedElement;
        if( appCtx.ctx.activeSplit && splitTimelineEle ) {
            splittedElement = splitTimelineEle;
        } else if( appCtx.ctx.activeProgramBoard && programBoardElement && programBoardElement[ 0 ] ) {
            splittedElement = programBoardElement[ 0 ];
        }

        if( splittedElement ) {
            var element = $( splittedElement );
            var timelineHeight = Math.round( timelineHeightInPercentage * height );

            timelineElement[ 0 ].style.height =  timelineHeight - 10 + 'px';
            timelineElement[ 0 ].parentElement.parentElement.style.flexBasis = 'auto';

            element[ 0 ].style.height =  height - timelineHeight - 10  + 'px';
            element[ 0 ].style.flexBasis = 'auto';
        } else {
            timelineElement[ 0 ].style.height = height + 'px';
        }
    }
    timelineManager.getGanttInstance().setSizes();
    timelineManager.getGanttInstance().render();
}

/**
 * update split xrt view based on timeline selection.
 * @param {String} taskUid selected object uid.
 */
export let  updateSplitXrtViewFromSelection = function( taskUid ) {
    summaryViewLoaded = false;
    var activeSplit = appCtx.getCtx( 'activeSplit' );
    if ( activeSplit ) {

        let task = cdm.getObject(taskUid);
        let xrtContext = appCtx.getCtx('ActiveWorkspace:xrtContext');
        let xrtContextValue;
        let contextModelObject = appCtx.ctx.locationContext.modelObject;

        if ( task && taskUid !== contextModelObject.uid ) {
            xrtContextValue = 1;  
        }
        else {
            xrtContextValue = 2;
        }

        //set AW client context ActiveWorkspace:xrtContext.timelineWithDetails
        //1: return summary xrt with all pages in split summary view
        //2: return summary xrt with only overview page in split summary view
        //0 or other including undefined: return regular timeline object summary view xrt
        if ( !xrtContext ) {
            xrtContext = {
                timelineWithDetails: xrtContextValue
            };
            appCtx.registerCtx('ActiveWorkspace:xrtContext', xrtContext);
        }
        else if ( xrtContext.timelineWithDetails !== xrtContextValue ) {
            xrtContext.timelineWithDetails = xrtContextValue;
            appCtx.updateCtx( 'ActiveWorkspace:xrtContext', xrtContext );
        }

        if ( task )  {
            appCtx.updateCtx( 'splitXrtViewModel', task );
        } else {
            appCtx.updateCtx( 'splitXrtViewModel', appCtx.ctx.locationContext.modelObject );
        }
    }
    else {
        resizer();
    }
};

/**
 * Method for opening an object.
 *
 * @param {object} taskUid - The Uid of object to be opened.
 */
var openObject = function( taskUid ) {
    var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
    var toParams = {};
    var options = {};

    toParams.uid = taskUid;
    options.inherit = false;

    var xrtContext = appCtx.getCtx( 'ActiveWorkspace:xrtContext' );
    if ( xrtContext )
    {
        xrtContext.timelineWithDetails = 0;
        appCtx.updateCtx( 'ActiveWorkspace:xrtContext', xrtContext );
    }

    navigationSvc.instance.go( showObject, toParams, options );
};

/**
 * Method for registering an event.
 *
 * @param {object} event - The event object.
 */
export let registerEvent = function( event ) {
    _events.push( event );
};

/**
 * Method for to unregister the events.
 */
export let unregisterEventHandlers = function() {
    if( _events.length > 0 ) {
        for( var i = 0; i < _events.length; i++ ) {
            timelineManager.getGanttInstance().detachEvent( _events[ i ] );
        }
        _events = [];
    }
    //unsubscribe subLocation change event
    _awEvents.push( splitterUpdate );
    if( _awEvents.length > 0 ) {
        for( var i = 0; i < _awEvents.length; i++ ) {
            var event = _awEvents[ i ];
            if( event ) {
                eventBus.unsubscribe( event );
            }
        }
        _awEvents = [];
    }
    //unregister the window resize event.
    $( window ).off( 'resize', resizer );
};

export let updateTodayMarkerHeight = function() {
    if( timelineManager.getGanttInstance().$marker_area && timelineManager.getGanttInstance().$marker_area.childNodes.length > 0 ) {
        timelineManager.getGanttInstance().$marker_area.childNodes[ '0' ].style.height = Math.max( timelineManager.getGanttInstance()._y_from_ind( timelineManager.getGanttInstance()._planOrder.length ), 0 ) + 'px';
    }
};

/**
 * This will compute the available height.
 * @returns The available height
 */
export let getComputedHeight = function() {
    var subLocHeight = document.getElementsByClassName( 'aw-layout-sublocationContent' )[ 0 ].clientHeight;

    //XRT tabs will be part of sublocationContent only when the Program is selected and Timeline is opened in summary
    // instead of directly opening Program and navigating to Timeline sublocation. So reduce that height as well.
    let xrtTabHeight = 0;
    if( appCtx.ctx.xrtPageContext.secondaryXrtPageID && appCtx.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Timeline' ) {
        var xrtTabs = document.getElementsByClassName( 'aw-xrt-tabsContainer' );

        xrtTabHeight = xrtTabs ? xrtTabs[ 0 ] ? xrtTabs[ 0 ].clientHeight : 0 : 0;
        if( isNaN( xrtTabHeight ) ) {
            xrtTabHeight = 0;
        }
    }
    var prgBreadCrumb = $( '#prgBreadCrumbs' );

    var breadCrumbHeight = prgBreadCrumb ? prgBreadCrumb[ 0 ] ? prgBreadCrumb[ 0 ].clientHeight : 0 : 0;
    if( isNaN( breadCrumbHeight ) ) {
        breadCrumbHeight = 0;
    }
    breadCrumbHeight += 80; //80 to offset  for margins at top and bottom

    if( appCtx.ctx.xrtPageContext.secondaryXrtPageID && appCtx.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Timeline' ) {
        breadCrumbHeight += 16; //offset for list in summary view
    }

    var height = subLocHeight - breadCrumbHeight - xrtTabHeight;
    if( height < 200 ) {
        height = 200;
    }
    return height;
};

export let getTimelineManeger = function() {
    return timelineManager.getGanttInstance();
};

export default exports = {
    addDefaultEvents,
    registerAWEvents,
    registerEvent,
    unregisterEventHandlers,
    updateTodayMarkerHeight,
    getComputedHeight,
    getTimelineManeger,
    updateSplitXrtViewFromSelection
};
