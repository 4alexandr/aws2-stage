// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/SMGantt/GanttConstants
 */
import app from 'app';

'use strict';

var exports = {};

export let GANTT_TOOLTIP_TASK_STATUS = {
    not_started: "gantt_tooltip_not_started_task",
    in_progress: "gantt_tooltip_in_progress_task",
    needs_attention: "gantt_tooltip_needs_attention_task",
    late: "gantt_tooltip_late_task",
    complete: "gantt_tooltip_complete_task",
    abandoned: "gantt_tooltip_abandoned_task",
    aborted: "gantt_tooltip_aborted_task"
};
//Icon size (16)+padding(8) , so 24
export let GANTT_TASK_STATUS_ICON_SIZE = '24' ;

export default exports= {
    GANTT_TOOLTIP_TASK_STATUS,
    GANTT_TASK_STATUS_ICON_SIZE
};