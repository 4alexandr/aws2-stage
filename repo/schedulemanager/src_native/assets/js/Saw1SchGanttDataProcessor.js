// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* eslint-disable class-methods-use-this */
/*global
 */

/**
 * @module js/Saw1SchGanttDataProcessor
 */
import app from 'app';
import dataSource from 'js/Saw1SchGanttDataSource';
import uiSchGanttTemplates from 'js/SMGantt/uiSchGanttTemplates';
import uiSchGanttOverrides from 'js/SMGantt/uiSchGanttOverrides';
import uiSchGanttEventHandler from 'js/SMGantt/uiSchGanttEventHandler';
import uiSchGanttUtils from 'js/SMGantt/uiSchGanttUtils';
import smConstants from 'js/ScheduleManagerConstants';
import eventBus from 'js/eventBus';
import GanttDataProcessor from 'js/GanttDataProcessor';
import schGanttUtils from 'js/SchGanttUtils';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

export default class Saw1SchGanttDataProcessor extends GanttDataProcessor {
    constructor() {
        super();
        this.propertyPolicyID = '';
    }

    getEventDateRanges() {
        return dataSource.instance.getAllEventDateRanges();
    }

    getDateFormat() {
        return smConstants.PROGRAM_VIEW_DATE_FORMAT;
    }

    getAllDateRanges() {
        return dataSource.instance.getAllDateRanges();
    }


    clearAndReInitGantt( ctx, data ) {
        if( ctx.smGanttCtx.searchStartIndex === 0 ) {
            schGanttUtils.clearGanttData();
        }
        let parentTask = dataSource.instance.getSourceScheduleSummary();
        let results = ctx.searchResponseInfo.searchResults;
        if( results && results.length > 0 ) {
            let scheduleTasks = results.filter( function( schTask ) {
                return schTask.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1;
            } );
            if( scheduleTasks ) {
                let parentTasks = _.fill( Array( scheduleTasks.length ), parentTask );
                let ganttTasks = dataSource.instance.constructGanttTasks( scheduleTasks, parentTasks, data.ganttColumns, null );
                ctx.smGanttCtx.searchStartIndex += 50;
                uiSchGanttEventHandler.updateGanttHeight();
                dataSource.instance.resetReferenceTaskForParent( parentTask );
                dataSource.instance.setReferenceTaskForPagination( true, parentTask, ganttTasks[ ganttTasks.length - 1 ] );
                schGanttUtils.parseGanttData( ganttTasks, null );
            }
        }else{
            dataSource.instance.resetReferenceTaskForParent( parentTask );
        }
    }

    initGanttCustomisations( data ) {
        uiSchGanttTemplates.addTemplates( dataSource.instance );
        uiSchGanttOverrides.addOverrides( dataSource.instance );

        let ganttZoomPreference =  data.preferences.AWC_SM_Gantt_Zoom_Level ? data.preferences.AWC_SM_Gantt_Zoom_Level[ 0 ] : undefined;
        //for case when only sublocation change occurs
        var ctxGanttZoomLevel = appCtxSvc.ctx.ganttZoomLevel;
        if( ganttZoomPreference ) {
            appCtxSvc.ctx.AWC_SM_Gantt_Zoom_Level = ganttZoomPreference;
        } else if( ctxGanttZoomLevel ) {
            ganttZoomPreference = ctxGanttZoomLevel;
        } else { //Preference is not set and ctx also does not have value
            ganttZoomPreference = 'unit_of_time_measure';
        }
        this.setScaleForGantt( ganttZoomPreference, true );

        uiSchGanttEventHandler.setDataSource( dataSource.instance );
        uiSchGanttEventHandler.registerGanttEvents( this, data );
        //uiSchGanttEventHandler.registerAWEvents();
    }

    setScaleForGantt( scale, isTransformValue ) {
        uiSchGanttUtils.setGanttZoomLevel( scale, false, isTransformValue );
    }

    getGanttColumnName( colName ) {
        return smConstants.PROGRAM_VIEW_GANTT_SERVER_PROPERTY_MAPPING[ colName ];
    }

    getServerColumnName( colName ) {
        return smConstants.PROGRAM_VIEW_SERVER_GANTT_PROPERTY_MAPPING[ colName ];
    }

    getReferenceTaskForPagination( visibleTasks ) {
        return dataSource.instance.getVisibleReferenceTask( visibleTasks );
    }

    getSummaryTasksInList( visibleTasks, parentNodeId ) {
        return dataSource.instance.getSummaryTasksInList( visibleTasks, parentNodeId );
    }

    idColumnRenderer( task ) {
        var value = '';
        value = dataSource.instance.getTaskIndex( task.id );
        return value;
    }

    predColumnRenderer( task ) {
        var value = '';
        var depInfo = dataSource.instance.getTaskPredDependencies( task.id );
        if( depInfo && depInfo.displayValues ) {
            value = depInfo.displayValues.toString();
        }
        return value;
    }

    succColumnRenderer( task ) {
        var value = '';
        var depInfo = dataSource.instance.getTaskSuccDependencies( task.id );
        if( depInfo && depInfo.displayValues ) {
            value = depInfo.displayValues.toString();
        }
        return value;
    }

    getAWColumnInfoList( colResponse, dataProvider ) {
        let columnArray = colResponse.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns;
        columnArray.forEach( col => {
            if( col.propDescriptor.propertyName === 'object_name' ) {
                col.showIcon = true;
            } else if( col.propDescriptor.propertyName === 'saw1RowNumberInGantt' ) {
                col.template = this.idColumnRenderer;
            } else if( col.propDescriptor.propertyName === 'saw1Predecessors' ) {
                col.template = this.predColumnRenderer;
            } else if( col.propDescriptor.propertyName === 'saw1Successors' ) {
                col.template = this.succColumnRenderer;
            }
        } );

        dataProvider.columnConfig = {
            columns: columnArray
        };
        return columnArray;
    }

    getGanttHeight() {
        var subLocHeight = document.getElementsByClassName( 'aw-layout-sublocationContent' )[ 0 ].clientHeight;
        var xrtTabs = document.getElementsByClassName( 'aw-xrt-tabsContainer' )[ 0 ];

        var xrtTabHeight = xrtTabs ? xrtTabs.clientHeight : 0;
        if( isNaN( xrtTabHeight ) ) {
            xrtTabHeight = 0;
        }

        var toolbar = document.getElementsByClassName( 'aw-schedulemanager-prgView-toolbar' );
        var toolbarHeight = toolbar && toolbar.length > 0 ? toolbar[ 0 ].clientHeight : 0;
        toolbarHeight += 28; // to compensate margins
        var columnHeight = 30;
        var height = subLocHeight - xrtTabHeight - toolbarHeight - columnHeight;
        if( height < 200 ) {
            height = 200;
        }

        if( appCtxSvc.ctx.activeSplit ) {
            height *= 0.6;
        }

        return height;
    }

    getConfigOptions() {
        let ganttConfig = super.getConfigOptions();
        ganttConfig.readOnly = false;
        ganttConfig.order_branch = true;
        ganttConfig.order_branch_free = true;
        ganttConfig.drag_move = true;
        ganttConfig.drag_resize = true;
        //ganttConfig.drag_progress = true;
        ganttConfig.drag_links = true;
        ganttConfig.start_date = new Date( dataSource.instance.getStartDateString() );
        //Pushing start date to extra days , so that start date is not partially visible
        ganttConfig.start_date.setDate( ganttConfig.start_date.getDate() - 21 );
        ganttConfig.end_date = new Date( dataSource.instance.getEndDateString() );
        ganttConfig.task_height = dataSource.instance.hasBaseline() ? 12 : 'full';
        ganttConfig.link_wrapper_width = dataSource.instance.hasBaseline() ? 10 : 20;
        return ganttConfig;
    }

    paginateForTaskOpened( parentTaskId, referenceTaskId ) {
        let isPaginationCompleted = dataSource.instance.isPaginationCompletedForParent( parentTaskId );
        if( !isPaginationCompleted ) {
            let parentTask = dataSource.instance.getTaskInfo( parentTaskId );
            if( !referenceTaskId && parentTask && dataSource.instance.getRefTaskForPagination( parentTask ) ) {
                referenceTaskId = dataSource.instance.getRefTaskForPagination( parentTask );
            }
            var eventData = {
                parentTaskId: parentTaskId,
                referenceTaskId: referenceTaskId
            };
            let searchContext = appCtxSvc.getCtx( 'search' );
            if( searchContext && searchContext.activeFilters && searchContext.activeFilters.length > 0 ) {
                eventBus.publish( 'updatePerformSearchSOAEvent' );
            }else{
                eventBus.publish( 'ScheduleGanttPaginate', eventData );
            }
        }
    }

    getActualPropFromGanttProp( ganttPropName ) {
        var name = ganttPropName;
        var updatedColName = smConstants.PROGRAM_VIEW_SERVER_GANTT_PROPERTY_MAPPING[ name ];
        if( updatedColName ) {
            name = updatedColName;
        }
        return name;
    }

    getColumnConfigId() {
        return 'Saw1GanttColumns';
    }

    deleteObjects( deletedObjectUids ) {
        schGanttUtils.removeDeletedObjectsOnGantt( deletedObjectUids );
        eventBus.publish( 'UpdateTaskIndexIds' );
    }

    createObjectsOnGantt( createdObjects, data ) {
        super.createObjectsOnGantt( createdObjects, data );
        eventBus.publish( 'UpdateTaskIndexIds' );
    }

    selectLink( taskDepUid ) {
        dataSource.instance.selectLink( taskDepUid );
        schGanttUtils.selectLink( taskDepUid );
    }

    createDependency( type, source, target ) {
        schGanttUtils.createDependency( type, source, target );
    }

    /**
     * This function will be invoked when we doube click on the link.
     *
     * @param {String} id - uid of the link.
     */
    deleteDependency( taskDepUid ) {
        let taskDep = dataSource.instance.getTaskDependency( taskDepUid );
        schGanttUtils.deleteDependency( taskDep );
    }

    isFinishDateScheduleForTask( taskUid ) {
        return schGanttUtils.isFinishDateScheduleForTask( taskUid );
    }

    onTaskDrag( id, startDate, endDate, mode ) {
        return schGanttUtils.onTaskDrag( id, startDate, endDate, mode );
    }

    onBeforeTaskReorder( srcTaskId ) {
        return schGanttUtils.onBeforeTaskReorder( srcTaskId );
    }

    onTaskReorder( srcTaskId, targetTaskId, parentId, taskIndexToMove ) {
        return schGanttUtils.onTaskReorder( srcTaskId, targetTaskId, parentId, taskIndexToMove );
    }

    getDataSource() {
        return dataSource.instance;
    }

    getSelectedTaskID() {
        return schGanttUtils.getSelectedTaskID();
    }

    getGanttChildTasks( parentId ) {
        return schGanttUtils.getGanttChildTasks( parentId );
    }

    fireExpandBelowEvent() {
        eventBus.publish( 'Saw1ExpandBelowOnGanttEvent' );
    }

    fireCollapseBelowEvent() {
        eventBus.publish( 'Saw1CollapseBelowOnGanttEvent' );
    }

    closeGanttTask( ganttTaskId ) {
        schGanttUtils.closeGanttTask( ganttTaskId );
    }

    openGanttTask( ganttTaskId ) {
        schGanttUtils.openGanttTask( ganttTaskId );
    }

    setExpandBelowFlag( data, parentTaskId ) {
        super.setExpandBelowFlag( data, parentTaskId );
    }

    collapseBelowNode( data, nodeId ) {
        super.collapseBelowNode( data, nodeId );
    }

    cleanup() {
        dataSource.instance.cleanup();
        dataSource.reset();
        uiSchGanttEventHandler.unregisterEventHandlers();
        schGanttUtils.ganttSummaryReset( true );
        schGanttUtils.unsubscribeGanttSummaryEvents();
        if( appCtxSvc.ctx.smGanttCtx.isGanttFilterEnabled ) {
            appCtxSvc.unRegisterCtx( 'search' );
        }
        appCtxSvc.unRegisterCtx( 'smGanttCtx' );
    }
}
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Saw1SchGanttDataProcessor
 */
app.factory( 'Saw1SchGanttDataProcessor', () => Saw1SchGanttDataProcessor.instance );
