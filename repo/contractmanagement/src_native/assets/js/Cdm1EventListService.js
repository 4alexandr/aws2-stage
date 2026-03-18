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
 * @module js/Cdm1EventListService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import addObjectUtils from 'js/addObjectUtils';
import appCtxService from 'js/appCtxService';
import listBoxSvc from 'js/listBoxService';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'soa/kernel/soaService';
import 'js/awColumnService';
import 'soa/kernel/propertyPolicyService';

var exports = {};

/**
 * Post getProperties SOA call, set the start date,end date,event name and Recurrence Date based on the selected LOV value on create Panel
 *
 * @param {object} selectedScheduleObject selected schedule task
 * @param {object} data object
 *
 */
export let updateScheduleTaskFields = function( selectedScheduleObject, data ) {
    var scheduleObject = selectedScheduleObject;

    uwPropertyService.setValue( data.cdm0EventName, scheduleObject.props.object_string.dbValues[ 0 ] );

    var startDate = new Date( scheduleObject.props.start_date.dbValues[ 0 ] );
    uwPropertyService.setValue( data.cdm0StartDate, startDate );
    data.cdm0StartDate.dateApi.setApiValues( startDate );

    var finishDate = new Date( scheduleObject.props.finish_date.dbValues[ 0 ] );
    uwPropertyService.setValue( data.cdm0EndDate, finishDate );
    data.cdm0EndDate.dateApi.setApiValues( finishDate );

    var fnd0ParentTaskUid = scheduleObject.props.fnd0ParentTask.dbValues[ 0 ];

    var recurrenceDate;
    if( fnd0ParentTaskUid !== '' ) {
        var fnd0ParentTaskObj = cdm.getObject( fnd0ParentTaskUid );

        recurrenceDate = new Date( fnd0ParentTaskObj.props.finish_date.dbValues[ 0 ] );
        uwPropertyService.setValue( data.cdm0RecurrenceEndDate, recurrenceDate );
        data.cdm0RecurrenceEndDate.dateApi.setApiValues( recurrenceDate );
    } else {
        recurrenceDate = new Date( scheduleObject.props.finish_date.dbValues[ 0 ] );
        uwPropertyService.setValue( data.cdm0RecurrenceEndDate, recurrenceDate );
        data.cdm0RecurrenceEndDate.dateApi.setApiValues( recurrenceDate );
    }
};

/**
 * Set the start date,end date,event name and Recurrence Date based on the selected LOV value in the table
 *
 * @param {object} data
 *
 */

export let updateScheduleTaskFieldsInRow = function( data ) {
    var selectedScheduleObject;
    if( data.selectedRow ) {
        selectedScheduleObject = data.selectedRow.props.cdm0ScheduleTask.dbValue;
    } else if( _.has( data, 'cdm0ScheduleTask.selectedLovEntries["0"].propInternalValue.uid' ) &&
        data.cdm0ScheduleTask.selectedLovEntries[ '0' ].propInternalValue.uid.length > 0 ) {
        selectedScheduleObject = data.cdm0ScheduleTask.selectedLovEntries[ '0' ].propInternalValue.uid;
    }
    if( selectedScheduleObject ) {
        var uidsToLoad = [];
        uidsToLoad.push( selectedScheduleObject );

        dmSvc.getProperties( uidsToLoad, [ 'fnd0ParentTask', 'start_date', 'finish_date', 'object_name' ] )
            .then(
                function() {
                    var eventList = cdm.getObject( selectedScheduleObject );

                    uwPropertyService.setValue( data.selectedRow.props.cdm0EventName,
                        eventList.props.object_string.dbValues[ 0 ] );
                    uwPropertyService.setValue( data.selectedRow.props.cdm0StartDate, new Date(
                        eventList.props.start_date.dbValues[ 0 ] ) );
                    uwPropertyService.setValue( data.selectedRow.props.cdm0EndDate, new Date(
                        eventList.props.finish_date.dbValues[ 0 ] ) );

                    var fnd0ParentTask = eventList.props.fnd0ParentTask.dbValues[ 0 ];
                    if( fnd0ParentTask !== '' ) {
                        dmSvc.getProperties( [ fnd0ParentTask ],
                            [ 'fnd0ParentTask', 'start_date', 'finish_date', 'object_name' ] ).then(
                            function() {
                                var fnd0ParentTaskObj = cdm.getObject( fnd0ParentTask );

                                uwPropertyService.setValue( data.selectedRow.props.cdm0RecurrenceEndDate,
                                    new Date( fnd0ParentTaskObj.props.finish_date.dbValues[ 0 ] ) );
                                eventBus.publish( 'eventListTableId.plTable.clientRefresh' );
                            } );
                    } else {
                        uwPropertyService.setValue( data.selectedRow.props.cdm0RecurrenceEndDate, new Date(
                            eventList.props.finish_date.dbValues[ 0 ] ) );
                        eventBus.publish( 'eventListTableId.plTable.clientRefresh' );
                    }
                } );
    }
};

/**
 * Method to publish the event for putting table in editable mode
 *
 * @param {object} data - the data object
 */
export let createAndSetSelectedRowData = function( data ) {
    if( data.eventData && data.eventData.vmo ) {
        data.selectedRow = data.eventData.vmo;
        data.selectedRow.props.cdm0EventName.isEnabled = false;
        data.selectedRow.props.cdm0StartDate.isEnabled = false;
        data.selectedRow.props.cdm0EndDate.isEnabled = false;
    }
};

/**
 * This js function creates cdm0EventTable object
 *
 * @param {Object} data from the Properties page
 * @return{Object} success or failure
 */
export let createEventsTable = function( data ) {
    var inputs = addObjectUtils.getCreateInput( data );
    //This is to set the cdm0ScheduleTask data if selected
    if( _.has( data, 'cdm0ScheduleTask.selectedLovEntries["0"].propInternalValue.uid' ) ) {
        inputs[ 0 ].createData.propertyNameValues.cdm0ScheduleTask = [ data.cdm0ScheduleTask.selectedLovEntries[ '0' ].propInternalValue.uid ];
    }
    return dmSvc.createRelateAndSubmitObjects( inputs );
};

/**
 * Get input data for Fnd0StaticTable set properties.
 *
 * @param {Object} data the view model data object
 * @return {Object} setProperties Input
 */
export let getStaticTableSetInput = function( data ) {
    var input = [];
    var selectedObject = appCtxService.ctx.selected.modelType.typeHierarchyArray
        .indexOf( 'Cdm0DataReqItemRevision' ) > -1 ? appCtxService.ctx.selected : appCtxService.ctx.pselected;
    var staticTableObj = cdm.getObject( selectedObject.props.cdm0EventList.dbValues[ 0 ] );
    var existingEventsTableData = staticTableObj.props.fnd0StaticTableData.dbValues;
    var newEventsTableData = _.cloneDeep( existingEventsTableData );
    newEventsTableData.push( data.createdEventsTable.objects[ 0 ].uid );
    var dataVal = {
        object: staticTableObj,
        vecNameVal: [ {
            name: 'fnd0StaticTableData',
            values: newEventsTableData
        } ]
    };
    input.push( dataVal );
    return input;
};

/**
 * Get input data for CreateOrUpdateStaticTableData.
 *
 * @param {Object} data the view model data object
 * @return {Object} setProperties Input
 */
export let getCreateOrUpdateStaticTableDataInput = function( data ) {
    var date = new Date( data.cdm0StartDate.dbValue );
    var startDateValue = dateTimeSvc.formatUTC( date );

    date = new Date( data.cdm0EndDate.dbValue );
    var endDateValue = dateTimeSvc.formatUTC( date );

    date = new Date( data.cdm0RecurrenceEndDate.dbValue );
    var recurrenceEndDateValue = dateTimeSvc.formatUTC( date );

    var rowAttrValueMap = {
        cdm0EventName: [ data.cdm0EventName.dbValue.toString() ],
        cdm0OffSet: [ data.cdm0OffSet.dbValue.toString() ],
        cdm0Recurrence: [ data.cdm0Recurrence.dbValue.toString() ],
        cdm0RelativeTo: [ data.cdm0RelativeTo.dbValue.toString() ],
        cdm0RecurrenceEndDate: [ recurrenceEndDateValue ],
        cdm0StartDate: [ startDateValue ],
        cdm0EndDate: [ endDateValue ]
    };

    if( _.has( data, 'cdm0ScheduleTask.selectedLovEntries["0"].propInternalValue.uid' ) ) {
        rowAttrValueMap.cdm0ScheduleTask = [ data.cdm0ScheduleTask.selectedLovEntries[ '0' ].propInternalValue.uid ];
    }
    var input = [ {
        rowType: 'Cdm0EventsTable',
        rowAttrValueMap: rowAttrValueMap
    } ];

    return input;
};

/**
 * Get Schedule tasks attached to latest contract revision.
 *
 * @return {Object} task
 */
export let getContractScheduleTasks = function() {
    var selectedObject = appCtxService.ctx.selected.modelType.typeHierarchyArray
        .indexOf( 'Cdm0DataReqItemRevision' ) > -1 ? appCtxService.ctx.selected : appCtxService.ctx.pselected;

    var driObj = cdm.getObject( selectedObject.props.items_tag.dbValues[ 0 ] );

    var contractObj = cdm.getObject( driObj.props.cdm0ContractTypedRef.dbValues[ 0 ] );
    //get latest revision
    var latestUid = contractObj.props.revision_list.dbValues[ contractObj.props.revision_list.dbValues.length - 1 ];
    var latestContractRevObj = cdm.getObject( latestUid );
    var scheduleTasksUids = latestContractRevObj.props.cdm0ContractScheduleTasks.dbValues;
    var scheduleTemplateObjects = [];

    if( scheduleTasksUids.length > 0 ) {
        for( var i in scheduleTasksUids ) {
            var scheduledTask = cdm.getObject( scheduleTasksUids[ i ] );
            scheduleTemplateObjects.push( scheduledTask );
        }
    }
    return listBoxSvc.createListModelObjects( scheduleTemplateObjects, 'props.object_string', true );
};

/**
 * Set Event Name, Start Date and End Date Enable false. i.e. read only.
 * @param {Object} data the view model data object
 */
export let makeEventNameStartDateEndDateReadOnly = function( data ) {
    data.cdm0EventName.isEnabled = false;
    data.cdm0StartDate.isEnabled = false;
    data.cdm0EndDate.isEnabled = false;
};

export default exports = {
    updateScheduleTaskFields,
    updateScheduleTaskFieldsInRow,
    createAndSetSelectedRowData,
    createEventsTable,
    getStaticTableSetInput,
    getCreateOrUpdateStaticTableDataInput,
    getContractScheduleTasks,
    makeEventNameStartDateEndDateReadOnly
};
/**
 * @member Cdm1EventListService
 * @memberof NgServices
 *
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {soa_dataManagementService} dmSvc - Service to use.
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 * @param {addObjectUtils} addObjectUtils - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {listBoxService} listBoxSvc - Service to use.
 * @param {dateTimeService} dateTimeSvc - Service to use.
 *
 * @returns {Cdm1EventListService} Instance of the service API object.
 */
app.factory( 'Cdm1EventListService', () => exports );

/**
 * Cdm1EventListService returned as moduleServiceNameToInject
 *
 */
