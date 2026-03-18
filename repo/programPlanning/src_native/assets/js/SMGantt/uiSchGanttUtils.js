//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/SMGantt/uiSchGanttUtils
 */

'use strict';

import app from 'app';
import ganttManager from 'js/uiGanttManager';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * Method to get scale based on preference(AWC_SM_Unit_Of_Measure) value
 * @param scale -Scale to map.
 * @returns mapping for UOM to gantt scale
 */

let getGanttScaleMapping = function( scale ) {
    switch ( scale ) {
        case 'h':
            return 'year';
        case 'd':
            return 'year';
        case 'w':
            return 'day';
        case 'mo':
            return 'week';
    }
};

/**
 * Transformation function for the viewType preference value to Gantt scale
 * @param {String} viewType preference value
 * @param {Boolean} isToRefresh flag to refresh Gantt
 * @param {Boolean} isTransformValue flag to transform the value for Gantt or not
 */
export let setGanttZoomLevel = function( viewType, isToRefresh, isTransformValue ) {
    if( isTransformValue ) {
        switch ( viewType ) {
            case 'day':
                viewType = 'year';
                break;
            case 'week':
                viewType = 'day';
                break;
            case 'month':
                viewType = 'week';
                break;
            case 'year':
                viewType = 'month';
                break;
            case 'unit_of_time_measure':
                var contextObj = appCtxSvc.ctx.xrtSummaryContextObject;
                if( !contextObj ) {
                    contextObj = appCtxSvc.ctx.selected;
                }

                if( contextObj.modelType && contextObj.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1) {
                    let schedUid = contextObj.props.schedule_tag.dbValues[0];
                    contextObj = cdm.getObject( schedUid );
                }

                viewType = getGanttScaleMapping( contextObj.props.saw1UnitOfTimeMeasure.dbValues[ 0 ] );
                break;
        }
    }
    exports.loadGanttScale( viewType );
    if( isToRefresh ) {
        ganttManager.getGanttInstance().render();
    }
};

/**
 * Update the AWC_SM_Gantt_Zoom_Level zoom level preference value in data
 * @param {Object} data Declarative viewModel
 */
export let updatePreferenceForGanttZoom = function( data ) {
    if( data.preferences.AWC_SM_Gantt_Zoom_Level === undefined ) {
        appCtxSvc.registerCtx( 'ganttZoomLevel', data.eventData.viewType );
    } else {
        data.preferences.AWC_SM_Gantt_Zoom_Level[ 0 ] = data.eventData.viewType;
    }
};

/**
 * This function will set the Task properties flag to true
 * It will then be used to show task properties on Gantt task bar
 */
export let showGanttTaskProperties = function() {
    if ( appCtxSvc.ctx.showGanttTaskProperties === true ) {
        appCtxSvc.registerCtx( 'showGanttTaskProperties', false );
    } else {
        appCtxSvc.registerCtx( 'showGanttTaskProperties', true );
    }
    ganttManager.getGanttInstance().render();
};

/**
 * Load the Gantt scale for given scale value
 * @param {String} viewType The scale value
 */
export let loadGanttScale = function( viewType ) {
    switch ( viewType ) {
        case 'year': {
            ganttManager.getGanttInstance().config.scale_unit = 'day';
            ganttManager.getGanttInstance().config.step = 1;
            ganttManager.getGanttInstance().config.date_scale = '%d, %D';
            ganttManager.getGanttInstance().config.scale_height = 60;
            let weekScaleForYear = function( date ) {
                let weekText = ganttManager.getGanttInstance().locale.labels.weeks;
                let dateToStr = ganttManager.getGanttInstance().date.date_to_str( '%d %m' );
                let weekNum = ganttManager.getGanttInstance().date.date_to_str( '(' + weekText + ' %W)' );
                let endDate = ganttManager.getGanttInstance().date.add( ganttManager.getGanttInstance().date
                    .add( date, 1, 'week' ), -1, 'day' );
                return dateToStr( date ) + ' - ' + dateToStr( endDate ) + ' ' + weekNum( date );
            };
            ganttManager.getGanttInstance().config.subscales = [ {
                unit: 'month',
                step: 1,
                date: '%F, %Y'
            }, {
                unit: 'week',
                step: 1,
                template: weekScaleForYear
            } ];
            ganttManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                if( !ganttManager.getGanttInstance().isWorkTime( date ) ) {
                    return 'week_end';
                }
                return '';
            };
            break;
        }
        case 'day': {
            ganttManager.getGanttInstance().config.scale_unit = 'week';
            ganttManager.getGanttInstance().config.step = 1;
            ganttManager.getGanttInstance().config.scale_height = 60;
            ganttManager.getGanttInstance().config.subscales = [ {
                unit: 'month',
                step: 1,
                date: '%M'
            } ];
            ganttManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                return '';
            };
            let weekScaleForDay = function( date ) {
                let dateToStr = ganttManager.getGanttInstance().date.date_to_str( '%d' );
                let endDate = ganttManager.getGanttInstance().date.add( ganttManager.getGanttInstance().date
                    .add( date, 1, 'week' ), -1, 'day' );
                let weekNum = ganttManager.getGanttInstance().date.date_to_str( '(%W)' );
                return dateToStr( date ) + '-' + dateToStr( endDate ) + ' ' + weekNum( date );
            };
            ganttManager.getGanttInstance().templates.date_scale = weekScaleForDay;
            break;
        }
        case 'week': {
            ganttManager.getGanttInstance().config.scale_unit = 'month';
            ganttManager.getGanttInstance().config.date_scale = '%M';
            ganttManager.getGanttInstance().config.scale_height = 60;
            ganttManager.getGanttInstance().config.subscales = [ {
                unit: 'year',
                step: 1,
                date: '%Y'
            } ];
            ganttManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                return '';
            };
            break;
        }
        case 'month': {
            ganttManager.getGanttInstance().config.scale_unit = 'year';
            ganttManager.getGanttInstance().config.step = 1;
            ganttManager.getGanttInstance().config.date_scale = '%Y';
            ganttManager.getGanttInstance().config.scale_height = 60;
            ganttManager.getGanttInstance().config.subscales = [];
            ganttManager.getGanttInstance().config.row_height = 30;
            ganttManager.getGanttInstance().templates.task_cell_class = function( task, date ) {
                return '';
            };
            break;
        }
    }
};

exports = {
    loadGanttScale,
    setGanttZoomLevel,
    showGanttTaskProperties,
    updatePreferenceForGanttZoom
};

export default exports;
/**
 * The factory to create the gantt utils.
 *
 * @member uiSchGanttUtils
 * @memberof NgServices
 */
app.factory( 'uiSchGanttUtils', () => exports );
