//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/* global */

/**
 * @module js/mfeHeaderService
 */
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import localeService from 'js/localeService';
import _ from 'lodash';
import logger from 'js/logger';

const STRING = 'string';

/**
 * Sets display text for Task List dropdown using Current page/state
 *
 * @param {Object} taskTextLink - Reference to task list dropdown link
 */
export function setCurrentTask( taskTextLink ) {
    const label = AwStateService.instance.current.data.label;
    if( typeof label === STRING ) {
        taskTextLink.propertyDisplayName = label;
    } else {
        localeService.getLocalizedText( label.source, label.key ).then( ( result ) => {
            taskTextLink.propertyDisplayName = result;
        } );
    }
    return;
}

/**
 * Sets display text for Task List Widget using Selected page/state
 *
 * @param {Object} taskToSelect - Task to Select
 * @param {Object} taskTextLink - Reference to task list dropdown link
 */
export function setSelectedTask( taskToSelect, taskTextLink ) {
    taskTextLink.propertyDisplayName = taskToSelect.selectedObjects[ 0 ].taskName;
}

function constructTaskFromState( name, isSelected, stateName ) {
    return {
        taskName: name,
        stateName: stateName,
        selected: isSelected
    };
}

/**
 * Constructs the Task List using available pages/states
 *
 * @param {Object} availablePages - List of available pages/states
 */
export function constructTaskList( availablePages ) {
    let subLocationTasks = [];
    let promises = [];

    availablePages.sort( ( obj1, obj2 ) => {
        return obj1.data.priority - obj2.data.priority;
    } );

    availablePages.filter( page => page.data.label !== null ).forEach( ( page ) => {
        const label = page.data.label;
        const isSelectedTask = page === AwStateService.instance.current;
        const stateName = page.name;
        if( typeof label === STRING ) {
            subLocationTasks.push( constructTaskFromState( label, isSelectedTask, stateName ) );
            promises.push( AwPromiseService.instance.when() );
        } else {
            promises.push( localeService.getLocalizedText( label.source, label.key ).then( ( result ) => {
                subLocationTasks.push( constructTaskFromState( result, isSelectedTask, stateName ) );
            } ) );
        }
    } );

    return AwPromiseService.instance.all( promises ).then( () => {
        return subLocationTasks;
    } );
}

/**
 * Switches/Navigates to the Selected Task/SubLocation
 *
 * @param {Object} selectedTask - Selected Task
 * @param {Object} taskList - List of available tasks
 */
export function switchSubLocation( selectedTask, taskList ) {
    let taskToSelect = _.find( taskList, ( task ) => {
        return task.taskName === selectedTask.taskName;
    } );

    if( taskToSelect ) {
        if( taskToSelect.stateName !== AwStateService.instance.current.name ) {
            if( taskToSelect.params ) {
                AwStateService.instance.go( taskToSelect.stateName, taskToSelect.params );
            } else {
                AwStateService.instance.go( taskToSelect.stateName );
            }
        }
    } else {
        logger.error( 'Missing task was selected: ' + selectedTask );
    }
}

// eslint-disable-next-line no-unused-vars
let exports = {};
export default exports = {
    constructTaskList,
    switchSubLocation,
    setCurrentTask,
    setSelectedTask
};
