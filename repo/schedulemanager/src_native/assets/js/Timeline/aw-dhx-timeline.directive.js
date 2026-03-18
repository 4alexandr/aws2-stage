//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 document
 */

/**
 * @module js/Timeline/aw-dhx-timeline.directive
 */
import app from 'app';
import timelineManager from 'js/uiGanttManager';

'use strict';

/**
 * Defines the awDhxTimeline directive which can be used as a custom attribute. This directive will initialize
 * dhtmlxGantt in the target container.
 *
 * @member awDhxTimeline
 * @memberOf NgElementDirectives
 */

app.directive( 'awDhxTimeline', function() {
    return {
        restrict: 'A',
        scope: false,
        transclude: true,
        template: '<div ng-transclude></div>',

        link: function( $scope, $element, $attrs, $controller ) {
            timelineManager.getGanttInstance().templates.task_text = function( start, end, task ) {
                return '';
            };
            //This will display the name of event in timeline but it will be hidden by css file. This is done to validate the name of event from step def.
            timelineManager.getGanttInstance().templates.leftside_text = function( start, end, task ) {
                return task.text;
            };
            //following configurations should always be in the directive as they are needed to
            //set the initialization correctly.
            timelineManager.getGanttInstance().config.smart_rendering = false;
            timelineManager.getGanttInstance().config.multiselect = true;
            //sets the date format that is used to parse data from the data set.
            timelineManager.getGanttInstance().config.xml_date = '%Y-%m-%d %H:%i';
            timelineManager.getGanttInstance().config.grid_width = 200;
            timelineManager.getGanttInstance().keep_grid_width = true;
            timelineManager.getGanttInstance().config.work_time = true;
            timelineManager.getGanttInstance().config.correct_work_time = false;
            timelineManager.getGanttInstance().config.grid_resize = true;
            timelineManager.getGanttInstance().config.scale_height = 20 * 3;
            timelineManager.getGanttInstance().config.row_height = 30;
            timelineManager.getGanttInstance().config.scale_unit = 'year';
            timelineManager.getGanttInstance().config.date_scale = '%Y';
            timelineManager.getGanttInstance().keyboard_navigation = true;
            timelineManager.getGanttInstance().keyboard_navigation_cells = true;
            //-------------------------------------------------------------------------------------------------------------
            //Resize when the window size changes.
            var listener = $scope.$watch( function() {
                return $element[ 0 ].offsetWidth + '.' + $element[ 0 ].offsetHeight;
            }, function() {
                timelineManager.getGanttInstance().render();
            } );
            timelineManager.getGanttInstance().init( $element[ 0 ] );
            timelineManager.setWatchDeregistration( listener );

            $scope.$on( '$destroy', function() {
                // /**
                // * *** Important Debug Output *** Please keep this block (even if it's
                // commented out)
                // */
                console.log( 'aw-dhx-timeline.directive: Destroy scope=' + $scope.$id );
                $element.remove();
                $element = null;
            } );
        }
    };
} );
