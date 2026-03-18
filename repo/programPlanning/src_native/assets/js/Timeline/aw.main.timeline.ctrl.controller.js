//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Timeline/aw.main.timeline.ctrl.controller
 */
import app from 'app';
import $ from 'jquery';
import timelineManager from 'js/uiGanttManager';
import timelineEventHandler from 'js/Timeline/uiTimelineEventHandler';
import 'dhtmlxgantt_marker';

'use strict';
/**
 * Defines the awMainTimelineCtrl controller which is used for initializing the timeline with data and a place to
 * attach events to the dhtmlxgantt and invoke methods in the View-Model.
 *
 * @member awMainTimelineCtrl
 * @memberOf NgControllers
 */

app.controller( 'awMainTimelineCtrl', [
    '$scope',
    function( $scope ) {
        var self = {};
        self = this;
        self.whatamI = 'awMainTimelineCtrl'; //debug aid

        self.parseData = function( tasks, timelineDataSource ) {
            $scope.$evalAsync( function() {
                timelineManager.getGanttInstance().clearAll();
                addMarkers();
                timelineManager.getGanttInstance().parse( tasks, 'json' );
                timelineManager.getGanttInstance().scrollTo( 0, 0 );
            } ); // evalAsync

            //Scroll event has to be handled by the controller as it requires the scope for executing the
            // expression on the current scope at a later point in time.
            var ganttScrollEvent = timelineManager.getGanttInstance().attachEvent(
                'onGanttScroll',
                function( left, top ) {
                    var buffer = 40; // # of pixels from bottom of scroll to fire your function. Can be 0
                    if( $( 'div.gantt_ver_scroll' ).prop( 'scrollHeight' ) -
                        $( 'div.gantt_ver_scroll' ).scrollTop() <= $( 'div.gantt_ver_scroll' ).height() + buffer ) {
                        $scope.$evalAsync( function() {
                            timelineManager.startPaginate = new Date();
                            timelineDataSource.paginate();
                        } ); // evalAsync
                    }
                } );
            timelineEventHandler.registerEvent( ganttScrollEvent );
            timelineEventHandler.addDefaultEvents( timelineDataSource );
            timelineEventHandler.registerAWEvents( timelineDataSource );
        };
    }
] );

/**
 * Method for adding Markers.
 */
var addMarkers = function() {
    var date_to_str = timelineManager.getGanttInstance().date
        .date_to_str( timelineManager.getGanttInstance().config.task_date );
    var today = new Date();
    var todayMarker = {};
    todayMarker.start_date = today;
    var todayText = timelineManager.getGanttInstance().locale.labels.today;
    todayMarker.css = 'today';
    todayMarker.text = '';
    todayMarker.title = todayText + ': ' + date_to_str( today );
    var ganttInstance = timelineManager.getGanttInstance();
    var todayId = timelineManager.getGanttInstance().addMarker( todayMarker );
    setInterval( function() {
        if( ganttInstance ) {
            var today = ganttInstance.getMarker( todayId );
            if( typeof today !== 'undefined' ) {
                today.start_date = new Date();
                today.title = date_to_str( today.start_date );
                ganttInstance.updateMarker( todayId );
                timelineEventHandler.updateTodayMarkerHeight();
            }
        }
    }, 1000 * 60 );
};
