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
 * @module js/Timeline/uiTimelineTemplates
 */

import app from 'app';
import appCtx from 'js/appCtxService';
import dateTimeSvc from 'js/dateTimeService';
import timelineManager from 'js/uiGanttManager';
import iconSvc from 'js/iconService';
import 'dhtmlxgantt_tooltip';

'use strict';

var exports = {};

var iconObjectArray = [ {
        pageId: 'tc_xrt_Deliverables',
        icon: 'gantt_tooltip_deliverables_icon'
    },
    {
        pageId: 'tc_xrt_Changes',
        icon: 'gantt_tooltip_changes_icon'
    },
    {
        pageId: 'tc_xrt_eventSchedules',
        icon: 'gantt_tooltip_schedules_icon'
    },
    {
        pageId: 'tc_xrt_Risks',
        icon: 'gantt_tooltip_risks_icon'
    },
    {
        pageId: 'tc_xrt_Issues',
        icon: 'gantt_tooltip_issues_icon'
    },
    {
        pageId: 'tc_xrt_Opportunities',
        icon: 'gantt_tooltip_opportunities_icon'
    },
    {
        pageId: 'tc_xrt_Criteria',
        icon: 'gantt_tooltip_criteria_icon'
    },
    {
        pageId: 'tc_xrt_Checklists',
        icon: 'gantt_tooltip_checklist_icon'
    }
];

/**
 * Method for adding the template functions.
 *
 */
export let addTemplates = function() {
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.grid_folder = function( item ) {
        var icon = {};
        if( typeof item.objectType !== typeof undefined ) {
            var icon = iconSvc.getTypeIconURL( item.objectType );
        } else {
            var programIcon = iconSvc.getTypeIconURL( 'Prg0ProgramPlan' );
            var projectAndSubProjectIcon = iconSvc.getTypeIconURL( 'Prg0ProjectPlan' );
            // Since the Prject and SubProject are of same type hence, keeping the icons same.
            if( item.programType === 0 ) {
                icon = programIcon;
            } else if( item.programType === 1 ) {
                icon = projectAndSubProjectIcon;
            }
        }

        return '<div class=\'gantt_tree_icon\' style=\'background-image:url(' + icon + '\')></div>';
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.grid_file = function( item ) {
        var icon = {};
        if( typeof item.objectType !== typeof undefined ) {
            var icon = iconSvc.getTypeIconURL( item.objectType );
        } else {
            var programIcon = iconSvc.getTypeIconURL( 'Prg0ProgramPlan' );
            var projectAndSubProjectIcon = iconSvc.getTypeIconURL( 'Prg0ProjectPlan' );
            // Since the Prject and SubProject are of same type hence, keeping the icons same.
            if( item.programType === 0 ) {
                icon = programIcon;
            } else if( item.programType === 1 ) {
                icon = projectAndSubProjectIcon;
            }
        }

        return '<div class=\'gantt_tree_icon\' style=\'background-image:url(' + icon + '\')></div>';
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().date.quarter_start = function( date ) {
        timelineManager.getGanttInstance().date.month_start( date );
        var m = date.getMonth();
            var res_month;

        if( m >= 9 ) {
            res_month = 9;
        } else if( m >= 6 ) {
            res_month = 6;
        } else if( m >= 3 ) {
            res_month = 3;
        } else {
            res_month = 0;
        }

        date.setMonth( res_month );
        return date;
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().date.add_quarter = function( date, inc ) {
        return timelineManager.getGanttInstance().date.add( date, inc * 3, 'month' );
    };
    //-------------------------------------------------------------------------------------------------------------
    function quarterLabel( date ) {
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
    }
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().config.subscales = [ {
        unit: 'quarter',
        step: 1,
        template: quarterLabel
    }, {
        unit: 'month',
        step: 1,
        date: '%M'
    } ];
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.rightside_text = function( start, end, task ) {
        let returnVal = '';
        if( appCtx.ctx.showEventProperties === true ) {
            returnVal = '<div class="gantt_task_text">' + task.text + '</div>';
        }
        return returnVal;
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.leftside_text = function( start, end, task ) {
        let returnVal = '';
        if( appCtx.ctx.showEventProperties === true && timelineManager.getGanttInstance().config.scale_unit !== 'day' ) {
            returnVal = '<div class="gantt_task_date">' + dateTimeSvc.formatDate( task.start_date ) + '</div>';
        }
        return returnVal;
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.grid_open = function( item ) {
        if( item.programType === 'SubProject' ) {
            return '<div class=\'gantt_tree_icon gantt_blank\'></div>';
        }
            return '<div class=\'gantt_tree_icon gantt_' + ( item.$open ? 'close' : 'open' ) + '\'></div>';
    };
    //-------------------------------------------------------------------------------------------------------------
    timelineManager.getGanttInstance().templates.tooltip_text = function( start, end, task ) {
        var divElement = '<div class="gantt_tooltip_text"><table><tr>';
        if( task.programType === 'Event' ) {
            var forecastDateStr = '';
            if( typeof task.forecastDate !== 'undefined' && task.forecastDate !== null &&
                task.forecastDate !== '' ) {
                forecastDateStr = '<tr><td><strong>' +
                    timelineManager.getGanttInstance().locale.labels.timeline_label_forecastDate + ':</strong></td>' +
                    '<td>' + task.forecastDate + '</td></tr>';
            }
            var actualDateStr = '';
            if( typeof task.actualDate !== 'undefined' && task.actualDate !== null && task.actualDate !== '' ) {
                actualDateStr = '<tr><td><strong>' +
                    timelineManager.getGanttInstance().locale.labels.timeline_label_actualDate + ':</strong></td>' +
                    '<td>' + task.actualDate + '</td></tr>';
            }

            var icon = '<div class=\'gantt_tooltip_open_icon\' task_id=' + task.id + '></div>';
            var nameString = '';
            if( typeof task.eventCode !== 'undefined' && task.eventCode !== null ) {
                nameString = nameString + task.eventCode + ' - ';
            }

            if( nameString ) {
                divElement = divElement + '<td><strong>' + nameString + ' ' + '</strong></td>';
            }
            divElement = divElement + '<td style=\' padding-bottom: 5px;  max-width: 250px; text-overflow:ellipsis;\'><strong>' + task.text + '</strong></td><td><strong>' + ' - ' + task.status + '</strong></td><td>' + icon +
                '</td></tr></table><table style=\' max-width: 200px;\'><tr><td style=\'\'>' +
                '<strong>' + timelineManager.getGanttInstance().locale.labels.timeline_label_plannedDate + ':</strong></td>' +
                '<td>' +
                timelineManager.getGanttInstance().templates.tooltip_date_format( task.start_date ) +
                '</td></tr>' + forecastDateStr + actualDateStr + '</table></div>';
        } else {
            divElement += '<table><tr><td style=\'padding-bottom: 5px;  max-width: 250px; text-overflow:ellipsis;\'><strong>' + task.text + '</strong></td><td><strong>' + ' - ' + task.state + '</strong></td></tr></table></div>';
        }

        return divElement;
    };
};


export default exports = {
    addTemplates
};
