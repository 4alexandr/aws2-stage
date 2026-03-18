//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/Saw1InsertSubScheduleService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import smConstants from 'js/ScheduleManagerConstants';

var exports = {};

/**
 * Fills and returns the container for insert sub-schedule SOA
 *
 * @param {object} masterSchTask - Master schedule task
 * @param {object} masterSch - Master schedule
 * @param {object} data - Data of ViewModelObject
 * @return {array} array of input for insertSchedule SOA
 */
export let getInsertContainer = function( masterSchTask, masterSch, data ) {
    var input = [];
    var inputData;
    var isSame = false;

    if( masterSchTask !== null && masterSchTask.props.task_type.dbValues[ 0 ] === smConstants.TASK_TYPE.SS ) {
        masterSchTask = null;
    }

    for( var secondObj in data.sourceObjects ) {
        if( data.sourceObjects[ secondObj ].props.object_string.dbValues[ 0 ] === masterSch.props.object_string.dbValues[ 0 ] ) {
            isSame = true;
            break;
        }
        if( data.sourceObjects.hasOwnProperty( secondObj ) ) {
            inputData = {
                subSchedule: data.sourceObjects[ secondObj ],
                masterSchedule: masterSch,
                masterScheduleTask: masterSchTask,
                adjustMasterDates: true
            };
            input.push( inputData );
        }
    }
    if( isSame ) {
        throw 'sameSubScheduleErrorMsg';
    }
    return input;
};

/**
 * Activates insert sub schedule panel
 *
 * @param {string} commandId - Id of command
 * @param {string} location - Location of command
 */
export let getInsertSubSchedulePanel = function( commandId, location ) {
    var Object = 'object';
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;
        var valueJso;
        if( parent.props.fnd0SummaryTask.dbValues[ 0 ] === selection[ 0 ].props.fnd0ParentTask.dbValues[ 0 ] || selection[ 0 ].props.task_type.dbValues[ 0 ] === smConstants.TASK_TYPE.SS ) {
            valueJso = {
                masterScheduleTask: selection[ 0 ],
                masterSchedule: parent
            };
        } else {
            valueJso = {
                masterScheduleTask: null,
                masterSchedule: parent
            };
        }

        appCtxService.registerCtx( Object, valueJso );
        if( valueJso.masterScheduleTask !== null ) {
            commandPanelService.activateCommandPanel( commandId, location );
        }
    } else {
        appCtxService.unRegisterCtx( Object );
    }
};

exports = {
    getInsertContainer,
    getInsertSubSchedulePanel
};

export default exports;
app.factory( 'Saw1InsertSubScheduleService', () => exports );
