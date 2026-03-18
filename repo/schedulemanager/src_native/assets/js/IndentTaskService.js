// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/IndentTaskService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import userListService from 'js/userListService';
import messagingService from 'js/messagingService';

var exports = {};


var prepareIndentTaskErrorMessage = function( data, taskNotToBeUpdated, selection ){
    var finalMessage = data.i18n.allTaskDelete;
    finalMessage = messagingService.applyMessageParams( data.i18n.invalidIndentErrorMsg, [ '{{numberOfTasks}}' ], {
        numberOfTasks: selection.length
    } );

    if( taskNotToBeUpdated.length > 0){
        finalMessage = messagingService.applyMessageParams( data.i18n.smPreventUpdatePrefErrorMessge, [ '{{states}}' ], {
        states: data.statesMessage
        } );    

        taskNotToBeUpdated.forEach( function( task ) {
            finalMessage += '\n';
            let message = data.i18n.singleTaskDeleteErrorMessage;
            message = messagingService.applyMessageParams( data.i18n.singleTaskDeleteErrorMessage, [ '{{taskName}}', '{{taskStatus}}' ], {
                taskName: task.name,
                taskStatus: task.status
            } );
            finalMessage += message;
        });
    }
    return finalMessage;
};

/**
 * Get the validation for indent task and prepare the input for moveTask SOA.
 *
 * @param {Object} ctx - The context object.
 */
export let getIndentValidation = function( ctx, data ) {
    let seletcedTasks = ctx.mselected;

    let taskNotToBeUpdated = userListService.getTasksNotToBeUpdated( seletcedTasks, data, true );

    //This array will contains Uids of task whose parent is selected
    let selectionsToExclude = [];
    let selectedTasksUids = [];
    var moveRequests = [];
    var tasksToProcess = [];

    seletcedTasks.forEach( function( seletcedTask ) {
        selectedTasksUids.push( seletcedTask.uid );
    } );
    var parent;
    seletcedTasks.forEach( function( seletcedTask ) {
        var parentTaskProp = seletcedTask.props.fnd0ParentTask;
        var parentTask = cdm.getObject( parentTaskProp.dbValues[0] );
        if( !parentTask ) { 
            message = prepareIndentTaskErrorMessage( data, taskNotToBeUpdated, seletcedTasks );
            messagingService.showError( message );
            throw "";
        }

        let isParentSelected = selectedTasksUids.indexOf( parentTaskProp.dbValues[0] );
        if( isParentSelected !== -1 ){
            selectionsToExclude.push( seletcedTask.uid );
        } else {
            if( parent === undefined ) {
                parent = parentTask;
                tasksToProcess.push( seletcedTask.uid );
            } else if( parent === parentTask ) {
                tasksToProcess.push( seletcedTask.uid );
            } else{
                var message = messagingService.applyMessageParams( data.i18n.noContinousSelectionErrorMessage, [ '{{numberOfTasks}}' ], {
                    numberOfTasks: seletcedTasks.length
                } );
                messagingService.showError( message );
                throw "";
            }
        }
    } );

    var childTasks = parent.props.child_task_taglist;

    var newParent = null;
    let taskIndex = {};
    let indexArray = [];
    tasksToProcess.forEach( function( selected ) {
        if( childTasks.dbValues.indexOf( selected ) === -1 ) {
            var message = messagingService.applyMessageParams( data.i18n.noContinousSelectionErrorMessage, [ '{{numberOfTasks}}' ], {
                numberOfTasks: seletcedTasks.length
            } );
            messagingService.showError( message );
            throw "";
        }
        indexArray.push( childTasks.dbValues.indexOf( selected ) );
        taskIndex[ childTasks.dbValues.indexOf( selected )] = selected;
    } );
    indexArray.sort( function( a, b ) { return a - b; } );
    for( const index in indexArray ) {
        if( indexArray[index] - indexArray[index - 1] > 1 ) {
            var message = messagingService.applyMessageParams( data.i18n.noContinousSelectionErrorMessage, [ '{{numberOfTasks}}' ], {
                numberOfTasks: seletcedTasks.length
            } );
            messagingService.showError( message );
            throw "";
        }
    }
    
    let topChild = taskIndex[indexArray[0]];
    var topChildProp = cdm.getObject( topChild );
    var parentTaskProp = topChildProp.props.fnd0ParentTask;
    var parentTask = cdm.getObject( parentTaskProp.dbValues[0] );
    var childTasksProp = parentTask.props.child_task_taglist;
    let parentIndex = childTasksProp.dbValues.indexOf( topChild );
    if( parentIndex === 0 ){
        message = prepareIndentTaskErrorMessage( data, taskNotToBeUpdated, seletcedTasks );
        messagingService.showError( message );
        throw "";
    }

    newParent = cdm.getObject( childTasksProp.dbValues[parentIndex - 1] );

    if( newParent !== null ) {
        var newParentTask = {
            type: newParent.type,
            uid: newParent.uid
        };
    }
    var prevSiblingTask = {
        type: 'unknownType',
        uid: 'AAAAAAAAAAAAAA'
    };
    indexArray.forEach( function( index ) {
        var isExcluded = selectionsToExclude.indexOf( taskIndex[index] ) > -1;
        if( !isExcluded ) {
            //Summary Task cannot be indented.
            var seletcedTask = cdm.getObject( taskIndex[index] );
            if( seletcedTask.props.task_type.dbValues[0] === 6 ) {
                message = prepareIndentTaskErrorMessage( data, taskNotToBeUpdated, seletcedTasks );
                messagingService.showError( message );
                throw "";
            }
            
            var moveRequest;
            var taskToIndent = {
                type: seletcedTask.type,
                uid: seletcedTask.uid
            };

            if( typeof newParent !== typeof undefined && prevSiblingTask.type !== 'unknownType') {
                moveRequest = {
                    task: taskToIndent,
                    newParent: newParentTask,
                    prevSibling: prevSiblingTask
                };
                moveRequests.push( moveRequest );
            }else {
                moveRequest = {
                    task: taskToIndent,
                    newParent: newParentTask
                };
                moveRequests.push( moveRequest );
            }
            prevSiblingTask = {
                type: seletcedTask.type,
                uid: seletcedTask.uid
            };
        }
    });
    return moveRequests;
};

export let getParentTaskObject = function( ctx ) {
    var parentTaskObj;
    var parent = ctx.selected.props.fnd0ParentTask;
    if( parent ) {
        parentTaskObj = cdm.getObject( parent.dbValues[ 0 ] );
    }
    return parentTaskObj;
};

exports = {
    getIndentValidation,
    getParentTaskObject
};

export default exports;
/**
 * Service for Indent Task.
 *
 * @member IndentTaskService
 * @memberof NgServices
 */
app.factory( 'IndentTaskService', () => exports );
