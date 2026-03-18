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
 * @module js/ProgramView/uiProgramViewEventHandler
 */
import app from 'app';
import ganttManager from 'js/uiGanttManager';
import eventBus from 'js/eventBus';

var exports = {};
var _events = [];
var _awEvents = [];
var _markerStack = [];

export let registerGanttEvents = function( dataProcessor, data ) {
    var taskOpenedEvent = ganttManager.getGanttInstance().attachEvent( 'onTaskOpened', function( id ) {
        if( data.ganttOptions.isBranchPagination ) {
            dataProcessor.paginateForTaskOpened( id );
        }
    } );
    _events.push( taskOpenedEvent );
    var onScaleClick = ganttManager.getGanttInstance().attachEvent(
        'onScaleClick',
        function( e, date ) {
            dataProcessor.setScaleForGantt( ganttManager.getGanttInstance().config.scale_unit );
            ganttManager.getGanttInstance().render();
        } );
    _events.push( onScaleClick );
    var taskSelectedEvent = ganttManager.getGanttInstance().attachEvent( 'onTaskSelected', function( id ) {
        dataProcessor.selectNode( id );
    } );
    _events.push( taskSelectedEvent );
    var taskUnselectedEvent = ganttManager.getGanttInstance().attachEvent( 'onTaskUnselected', function( id ) {
        dataProcessor.deselectNode( id );
    } );
    _events.push( taskUnselectedEvent );
    var onDataRender = ganttManager.getGanttInstance().attachEvent( 'onDataRender', function() {
        addWeekendMarkers();
    } );
    _events.push( onDataRender );
};

export let registerAWEvents = function( timelineDataSource ) {
    var paginationCompleteEvent = eventBus.subscribe( 'Saw1ProgramView.paginationComplete', function( eventData ) {
        var scrollState = ganttManager.getGanttInstance().getScrollState();
        var paginationData = eventData.saw1ProgramViewPaginationData;
        ganttManager.getGanttInstance().parse( paginationData );
        ganttManager.getGanttInstance().scrollTo( scrollState.x, scrollState.y );
    } );
    _awEvents.push( paginationCompleteEvent );

    // //listen to window resize event.
    // $(window).resize(resizer);
};

export let unregisterEvents = function() {
    for( var i = 0; i < _events.length; i++ ) {
        ganttManager.getGanttInstance().detachEvent( _events[ i ] );
    }
    _events = [];

    if( _awEvents.length > 0 ) {
        for( var i = 0; i < _awEvents.length; i++ ) {
            var event = _awEvents[ i ];
            if( event ) {
                eventBus.unsubscribe( event );
            }
        }
        _awEvents = [];
    }
};

var addWeekendMarkers = function() {
    removeWeekendMarkers();
    var marker_date_start = ganttManager.getGanttInstance().getState().min_date;
    while( marker_date_start < ganttManager.getGanttInstance().getState().max_date ) {
        if( !ganttManager.getGanttInstance().isWorkTime( marker_date_start ) ) {
            var markerId = ganttManager.getGanttInstance().addMarker( {
                start_date: marker_date_start,
                end_date: ganttManager.getGanttInstance().date.add( marker_date_start, 1, ganttManager.getGanttInstance().config.duration_unit ), //a Date object that sets the marker's date
                css: 'week_end'
            } );
            _markerStack.push( markerId );
        }
        marker_date_start = ganttManager.getGanttInstance().date.add( marker_date_start, 1, ganttManager.getGanttInstance().config.duration_unit );
    }
};

var removeWeekendMarkers = function() {
    for( var i = 0; i < _markerStack.length; i++ ) {
        ganttManager.getGanttInstance().deleteMarker( _markerStack[ i ] );
    }
    _markerStack = [];
};

export default exports = {
    registerGanttEvents,
    registerAWEvents,
    unregisterEvents
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member uiProgramViewTemplates
 */
app.factory( 'uiProgramViewEventHandler', () => exports );
