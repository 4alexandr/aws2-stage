// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/OutdentTaskService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import userListService from 'js/userListService';

var exports = {};

var prepareOutdentTaskErrorMessage = function( data, taskNotToBeUpdated, selection ){
    var finalMessage = data.i18n.allTaskDelete;
    finalMessage = messagingService.applyMessageParams( data.i18n.invalidOutdentErrorMsg, [ '{{numberOfTasks}}' ], {
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
 * Get the validation for Outdent task and prepare the input for moveTask SOA.
 *
 * @param {Object} ctx - The context object.
 */
export let getOutdentValidation = function( ctx, data ) {
    let seletcedTasks = ctx.mselected;
    let selectionsToExclude = [];
    let selectedTasksUids = [];
    var tasksToProcess = [];
    var moveRequests = [];

    let taskNotToBeUpdated = userListService.getTasksNotToBeUpdated( seletcedTasks, data, false );

    seletcedTasks.forEach( function( seletcedTask ) {
        selectedTasksUids.push( seletcedTask.uid );
    } );
    var parent;
    var message = "";
    seletcedTasks.forEach( function( seletcedTask ) {
        var parentTaskProp = seletcedTask.props.fnd0ParentTask;
        var parentTask = cdm.getObject( parentTaskProp.dbValues[0] );
        if( !parentTask ) {
            message = prepareOutdentTaskErrorMessage( data, taskNotToBeUpdated, seletcedTasks );
            messagingService.showError( message );
            throw "";
        }

        let isParentSelected = selectedTasksUids.indexOf( parentTaskProp.dbValues[0] );
        if( !isParentSelected ) {
            selectionsToExclude.push( seletcedTask.uid );
        } else {
            if( parent === undefined ) {
                parent = parentTask;
                tasksToProcess.push( seletcedTask.uid );
            } else if( parent === parentTask ) {
                tasksToProcess.push( seletcedTask.uid );
            } else{
                var message = messagingService.applyMessageParams( data.i18n.noContinousSelectionOutdentErrorMsg, [ '{{numberOfTasks}}' ], {
                    numberOfTasks: seletcedTasks.length
                } );
                messagingService.showError( message );
                throw "";
            }
        }
    } );

    var superParentTask = cdm.getObject( parent.props.fnd0ParentTask.dbValues[ 0 ] );

    // This is an immediate child of Schedule Summary Task that cannot be outdented.
    if( superParentTask === null || typeof superParentTask === typeof undefined ) {
        message = prepareOutdentTaskErrorMessage( data, taskNotToBeUpdated, seletcedTasks );
        messagingService.showError( message );
        throw "";
    }

    var newParentTask = {
        type: superParentTask.type,
        uid: superParentTask.uid
    };
    var prevSiblingTask = {
        type: parent.type,
        uid: parent.uid
    };
    seletcedTasks.forEach( function( seletcedTask ) {
        var isExcluded = selectionsToExclude.indexOf( seletcedTask.uid ) > -1;
        if( !isExcluded ) {
            var taskToOutdent = {
                type: seletcedTask.type,
                uid: seletcedTask.uid
            };

            var moveRequest = {
                task: taskToOutdent,
                newParent: newParentTask,
                prevSibling: prevSiblingTask
            };
            moveRequests.push( moveRequest );
        }
    } );
    return moveRequests;
};

exports = {
    getOutdentValidation
};

export default exports;
/**
 * Service for Outdent Task.
 *
 * @member OutdentTaskService
 * @memberof NgServices
 */
app.factory( 'OutdentTaskService', () => exports );
