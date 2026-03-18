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
 * @module js/GanttUtils
 */

'use strict';

import app from 'app';
import ganttManager from 'js/uiGanttManager';
import _ from 'lodash';

var exports = {};

export let updateCreatedObjectsOnGantt = function( tasks, links ) {
    let hasUpdate = false;
    tasks.forEach( function( currentTask ) {
        if( currentTask.prevId ) {
            let prevSiblingIndex = ganttManager.getGanttInstance().getTaskIndex( currentTask.prevId );
            ganttManager.getGanttInstance().addTask( currentTask, currentTask.parent, prevSiblingIndex + 1 );
        }else if ( currentTask.taskType === 5 ) {
            // add proxy tasks as top children of the parent task
            ganttManager.getGanttInstance().addTask( currentTask, currentTask.parent, 0 );
        } else {
            ganttManager.getGanttInstance().addTask( currentTask, currentTask.parent );
        }

        hasUpdate = true;
    } );

    links.forEach( function( currentLink ) {
        ganttManager.getGanttInstance().addLink( currentLink );
        hasUpdate = true;
    } );

    if( hasUpdate === true ) {
        ganttManager.getGanttInstance().refreshData();
    }
};

/**
 * Checks whether the TaskDependency with predecessor same as successor and successor same as predecessor exists in the given array.
 * @param {Array} linksArray The array of TaskDepenency to be searched
 * @param {Array} newLink The new TaskDependency
 * @returns {Boolean} if the other side dependency is present or not
 */
export let isOtherSideLinkPresent = function( linksArray, newLink ) {
    let isPresent = false;
    if( linksArray && newLink ) {
        for( let index = 0; index < linksArray.length; index++ ) {
            let link = linksArray[index];
            if( link.source === newLink.target && link.target === newLink.source ) {
                isPresent = true;
                break;
            }
        }
    }
    return isPresent;
};

/**
 * Moves the Gantt task to specified index inside specified parent
 * @param {Object} ganttTask The Gantt task to move
 * @param {Number} index The index where task will be moved. The index is inside the parent.
 * @param {String} parentUid The parent task Uid
 */
export let moveGanttTask = function( ganttTask, index, parentUid ) {
    ganttManager.getGanttInstance().moveTask( ganttTask.id, index, parentUid );
    ganttManager.getGanttInstance().updateTask( ganttTask.id );
};

/**
 * Refresh the Gantt task
 * @param {Array} ganttTasksList The Uid of Gantt task to refresh
 */
export let refreshGanttTasks = function( ganttTasksList ) {
    if( !_.isEmpty( ganttTasksList ) ) {
        ganttTasksList.forEach( ( ganttTask )=>{
            ganttManager.getGanttInstance().refreshTask( ganttTask.id );
        } );
        ganttManager.getGanttInstance().refreshData();
    }
};

/**
 * Refresh the Gantt Link
 * @param {Array} ganttLinksArray The Uid of Gantt link to refresh
 */
export let refreshGanttLinks = function( ganttLinksArray ) {
    if( !_.isEmpty( ganttLinksArray ) ) {
        ganttLinksArray.forEach( ( ganttLink ) =>{
            ganttManager.getGanttInstance().refreshLink( ganttLink.id );
        } );
    }
};

/**
 * Deletes the Gantt Task
 * @param {Object} ganttTask The Gantt task to delete
 */
export let deleteGanttTask = function( ganttTask ) {
    var taskExists = ganttManager.getGanttInstance().isTaskExists( ganttTask.id );
    if( taskExists === true ) {
        //If second argument is true, then its silent deletion and no events will be fired
        //This can improve the performance drastically
        ganttManager.getGanttInstance()._deleteTask( ganttTask.id, true );
    }
};

exports = {
    updateCreatedObjectsOnGantt,
    isOtherSideLinkPresent,
    moveGanttTask,
    refreshGanttTasks,
    refreshGanttLinks,
    deleteGanttTask
};

export default exports;
/**
 * The factory to create the gantt utils.
 *
 * @member GanttUtils
 * @memberof NgServices
 */
app.factory( 'GanttUtils', () => exports );
