// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/* eslint-disable class-methods-use-this */

/**
 * @module js/GanttDataSource
 */

import AwBaseService from 'js/awBaseService';
import dateTimeService from 'js/dateTimeService';
import selectionSvc from 'js/selection.service';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import awColumnSvc from 'js/awColumnService';
import ganttUtils from 'js/GanttUtils';

export default class GanttDataSource extends AwBaseService {
    constructor() {
        // To stop people doing new practice
        super();
        if( !this.constructor.__initializing ) {
            throw Error( `Please call '${this.constructor.name}.instance' instead of 'new ${this.constructor.name}()'` );
        } else {
            this.eventDateRanges = {};
            this._dateRanges = [];
            this._taskInfoArray = [];
            this._uid2TaskInfoMap = {};
            this._uid2TaskMap = {};
            this._uid2DependencyMap = {};
            this._uid2DependencyInfoMap = {};
            this._linkInfos = [];
            this._mockTaskForDependencies = [];
            this.isCriticalPathOn = false;
            this.criticalTasksUids = [];
        }
    }

    getEssentialColumns() {
        //To be implemented by child class
    }

    getGanttColumnName( colName ) {
        //To be implemented by child class
    }

    getDateFormat() {
        //To be implemented by child class
    }

    getParentTaskProp( task ) {
        //To be implemented by child class
    }

    getObjectType( taskObject ) {
        //To be implemented by child class
    }

    getSourceObject() {
        //To be implemented by child class
    }

    constructGanttTasks() {
        //To be implemented by child class
    }

    isSummaryTask( taskType ) {
        //To be implemented by child class
    }

    getServerColumnName( propName ) {
        //To be implemented by child class
    }

    updateSupportingPropsOnTask() {
        //To be implemented by child class
    }

    getGanttChildTasks( nodeId ) {
        //To be implemented by child class
    }

    getDisplayedColumns() {
        //To be implemented by child class
    }

    getSourceScheduleSummary() {
        //To be implemented by child class
    }

    updateTaskSupportingProperties() {
        //To be implemented by child class
    }

    hasBaseline() {
        //To be implemented by child class
    }

    isFetchInternalValue() {
        //To be implemented by child class
    }

    getSourceTask() {
        return appCtxSvc.ctx.xrtSummaryContextObject;
    }

    getTaskInfoFromNode( node, ganttColumns, parentTaskUid ) {
        let ganttTaskInfo = {};
        if( node ) {
            this.resetUnloadedProperties( ganttTaskInfo, ganttColumns );
            if( parentTaskUid && this.getTaskInfo( parentTaskUid ) ) {
                ganttTaskInfo.parent = parentTaskUid;
            }
            let nodeProperties = node.nodeProperties;
            if( nodeProperties ) {
                nodeProperties.forEach( function( nodeProp ) {
                    if( nodeProp && nodeProp.name && typeof nodeProp.stringValue !== undefined ) {
                        this.setPropertiesOnGanttTask( nodeProp.name, nodeProp.stringValue, ganttTaskInfo, true );
                    }
                }, this );
            }
        }
        return ganttTaskInfo;
    }

    resetUnloadedProperties( task, properties ) {
        if( task && properties ) {
            properties.forEach( function( property ) {
                task[ property ] = '';
            } );
        }
    }

    setPropertiesOnGanttTask( propName, propValue, ganttTaskInfo, isToSetDates, isToSetDateObject ) {
        let updatedPropName = this.getGanttColumnName( propName );
        if( updatedPropName ) {
            propName = updatedPropName;
        }

        if( propValue && ( propName === 'start_date' || propName === 'end_date' ) ) {
            if( isToSetDates ) {
                let dateObj = new Date( propValue );
                propValue = dateTimeService.formatNonStandardDate( dateObj, this.getDateFormat() );
            } else if( isToSetDateObject ) {
                propValue = new Date( propValue );
            } else {
                return;
            }
        }
        if( propValue && 'true' === propValue ) {
            propValue = true;
        } else if( propValue && 'false' === propValue ) {
            propValue = false;
        }

        ganttTaskInfo[ propName ] = propValue;
    }

    addTaskInfoToArray( taskInfo ) {
        if( taskInfo ) {
            let index = _.findIndex( this._taskInfoArray, ( task ) => {
                return task.id === taskInfo.id;
            } );
            //add if not found
            if( index < 0 ) {
                this._taskInfoArray.push( taskInfo );
            }
            this._uid2TaskInfoMap[ taskInfo.id ] = taskInfo;
        }
    }

    addToTaskMap( task ) {
        this._uid2TaskMap[ task.uid ] = task;
    }

    getDataForGanttInit() {
        let modelData = {};
        modelData.data = this._taskInfoArray;
        return modelData;
    }

    getTotalFoundCount() {
        let modelData = this.getDataForGanttInit();
        return modelData.data.length;
    }

    /**
     * This function will set the eventRanges.
     *
     * @param {Object} eventRanges - eventRanges Object.
     */
    setEventRanges( eventRanges ) {
        if( eventRanges ) {
            for( let current = 0; current < eventRanges.length; ++current ) {
                let currentRange = eventRanges[ current ];
                let eventDate = currentRange.eventDate;
                let ranges = currentRange.ranges;
                this.eventDateRanges[ eventDate ] = ranges;
            }
        }
    }

    /**
     * This function will return the AllEventDateRanges.
     *
     * @return {Object} getAllEventDateRanges - EventDateRanges Object.
     */
    getAllEventDateRanges() {
        return this.eventDateRanges;
    }

    setDayRanges( dayRanges ) {
        if( dayRanges && dayRanges.length === 7 ) {
            this._dateRanges.push( dayRanges[ 0 ] ); //Sunday - 0
            this._dateRanges.push( dayRanges[ 1 ] ); //Monday - 1
            this._dateRanges.push( dayRanges[ 2 ] ); //Tuesday - 2
            this._dateRanges.push( dayRanges[ 3 ] ); //Wednesday - 3
            this._dateRanges.push( dayRanges[ 4 ] ); //Thursday - 4
            this._dateRanges.push( dayRanges[ 5 ] ); //Friday - 5
            this._dateRanges.push( dayRanges[ 6 ] ); //Saturday - 6
        }
    }

    /**
     * This function will return the Date Ranges.
     *
     * @return {Object} _dateRanges - Date Ranges Object.
     */
    getAllDateRanges() {
        return this._dateRanges;
    }

    getVisibleReferenceTask( visibleTasks ) {
        let visibleReferenceTask;
        for( let index = 0; index < visibleTasks.length; index++ ) {
            let task = visibleTasks[ index ];
            if( this.isRefTaskForPagination( task ) ) {
                visibleReferenceTask = task;
                break;
            }
        }
        return visibleReferenceTask;
    }

    setRefTaskForPaginationFlag( ganttTask, value ) {
        if( ganttTask ) {
            ganttTask.isReferenceTask = value;
        }
    }

    isRefTaskForPagination( ganttTask ) {
        let flag = false;
        if( ganttTask && ganttTask.isReferenceTask ) {
            flag = ganttTask.isReferenceTask;
        }
        return flag;
    }

    setRefTaskForPagination( parentTask, refTaskUid ) {
        if( parentTask ) {
            if( refTaskUid ) {
                parentTask.refTaskForPagination = refTaskUid;
            }else{
                delete parentTask.refTaskForPagination;
            }
        }
    }

    getRefTaskForPagination( parentTask ) {
        let refTaskUid;
        if( parentTask && parentTask.refTaskForPagination ) {
            refTaskUid = parentTask.refTaskForPagination;
        }
        return refTaskUid;
    }

    isExpandBelowOnTask( ganttTask ) {
        let flag = false;
        if( ganttTask && ganttTask.expandBelowFlag ) {
            flag = ganttTask.expandBelowFlag;
        }
        return flag;
    }

    setExpandBelowOnTask( ganttTask, value ) {
        if( ganttTask ) {
            ganttTask.expandBelowFlag = value;
        }
    }

    isPaginationCompletedForParent( ganttTask ) {
        let isPaginationCompleted = false;
        if( typeof ganttTask === 'string' || ganttTask instanceof String ) {
            ganttTask = this.getTaskInfo( ganttTask );
        }
        if( ganttTask && ganttTask.areAllChildrenLoaded ) {
            isPaginationCompleted = ganttTask.areAllChildrenLoaded;
        }
        return isPaginationCompleted;
    }

    setPaginationCompletedForParent( ganttTask, value ) {
        if( ganttTask ) {
            ganttTask.areAllChildrenLoaded = value;
        }
    }

    getSummaryTasksInList( visibleTasks, parentNodeId ) {
        let summaryTaskList = [];
        for( let index = 0; index < visibleTasks.length; index++ ) {
            let task = visibleTasks[ index ];
            if( this.isExpandBelowOnTask( task ) ) {
                summaryTaskList.push( task.id );
            }
        }
        return summaryTaskList;
    }

    getTaskPreviousSibling( ganttTask ) {
        return ganttTask.prevId;
    }

    setTaskPreviousSibling( ganttTask, prevSiblingUID ) {
        ganttTask.prevId = prevSiblingUID;
    }

    updateGanttParent( taskArray ) {
        let parentChildMap = {};
        for( let index = 0; index < taskArray.length; index++ ) {
            let task = taskArray[index];
            if( task ) {
                let parentUid = this.getParentTaskProp( task );
                let ganttTask = this.getTaskInfo( task.uid );
                if( ganttTask && ganttTask.parent !== parentUid ) {
                    ganttTask.parent = parentUid;
                    let parentObject = cdm.getObject( parentUid );
                    if( parentObject && parentObject.props.child_task_taglist ) {
                        let childTasks = parentObject.props.child_task_taglist.dbValues;
                        let prevSiblingIndex = childTasks.indexOf( task.uid );
                        let parentTaskInfo = this.getTaskInfo( parentUid );
                        if( parentTaskInfo && prevSiblingIndex === 0 ) {
                            //First child's parent is different, so its indent case. mark the pagination as complete for parent
                            this.setPaginationCompletedForParent( parentTaskInfo, true );
                        }
                        if( prevSiblingIndex < 0 ) {
                            prevSiblingIndex = 0;
                        }
                        let prevSiblingTaskObj = {
                            prevIndex: prevSiblingIndex,
                            task: ganttTask
                        };
                        let siblingTaskArray = parentChildMap[parentUid];
                        if( !siblingTaskArray ) {
                            siblingTaskArray = [];
                        }
                        siblingTaskArray.push( prevSiblingTaskObj );
                        parentChildMap[parentUid] = siblingTaskArray;
                    }
                }
            }
        }
        //The moving of the task should be done in previous sibling index order to avoid incorrect order of tasks
        for( let parentUid in parentChildMap ) {
            let prevSiblingArray = parentChildMap[parentUid];
            if( !_.isEmpty( prevSiblingArray ) ) {
                let sortedSiblingTaskArray = _.sortBy( prevSiblingArray, [ 'prevIndex' ] );
                if( !_.isEmpty( sortedSiblingTaskArray ) ) {
                    sortedSiblingTaskArray.forEach( ( siblingTaskObj ) => {
                        if( siblingTaskObj ) {
                            ganttUtils.moveGanttTask( siblingTaskObj.task, siblingTaskObj.prevIndex, parentUid );
                        }
                    } );
                }
            }
        }
    }

    getUpdatedTasks( eventMap, taskArray, ganttColumns ) {
        let newColumns = [];
        let essentialCols = this.getEssentialColumns();
        if( essentialCols && essentialCols.length > 0 ) {
            newColumns = _.concat( [], essentialCols );
        }
        if( taskArray && ganttColumns && ganttColumns.length > 0 ) {
            //let essentialCols = this.getEssentialColumns();
            //newColumns = _.concat( [], essentialCols );
            ganttColumns.forEach( function( col ) {
                if( newColumns.indexOf( col ) < 0 ) {
                    newColumns.push( col );
                }
            } );
        }
        let ganttTasks = [];
        taskArray.forEach( ( task ) => {
            if( task && task.uid ) {
                let taskInfo = this.getTaskInfo( task.uid );
                if( taskInfo ) {
                    this.updateTaskProperties( task, newColumns, taskInfo );
                    ganttTasks.push( taskInfo );
                }
            }
        } );
        return ganttTasks;
    }

    constructTaskAndSetProps( taskArray, columns, parentTasks, proxyMap ) {
        let ganttTasks = [];
        for( let index = 0; index < taskArray.length; index++ ) {
            let task = taskArray[ index ];
            let ganttTaskInfoArray = this.constructSingleTask( task, columns, parentTasks[ index ], proxyMap );
            ganttTasks = _.concat( ganttTasks, ganttTaskInfoArray );
        }
        return ganttTasks;
    }

    /**
     * This will create task if not exists. This will also create proxies for the task
     * @param {Object} task The task to be created if not exists
     * @param {Array} columns The list of columns
     * @param {Object} parentTask The parent object
     * @param {Object} proxyMap The map of task uid to proxy tasks
     * @returns {Array} The list of gantt tasks
     */
    constructSingleTask( task, columns, parentTask, proxyMap ) {
        let ganttTasks = [];
        if( task && task.uid ) {
            let taskInfo = {};
            this.updateTaskProperties( task, columns, taskInfo );
            let parentUid = '';
            if( parentTask && parentTask.props && parentTask.uid !== 'AAAAAAAAAAAAAA' && appCtxSvc.ctx.state.params.filter === null ) {
                if( !this.getTaskInfo( parentTask.uid ) ) {
                    let parentTaskInfoList = this.constructSingleTask( parentTask, columns, null, proxyMap );
                    ganttTasks = _.concat( ganttTasks, parentTaskInfoList );
                }
                parentUid = parentTask.uid;
                taskInfo.parent = parentUid;
            }
            this.removeResolvedMockTask( taskInfo );
            ganttTasks.push( taskInfo );
            this.addTaskInfoToArray( taskInfo );
            this.addToTaskMap( task );
            if( proxyMap && proxyMap[ task.uid ] ) {
                let proxyTasks = proxyMap[ task.uid ];
                let proxyTaskInfoList = this.createProxyTasks( proxyTasks, parentUid, columns );
                taskInfo.proxies = proxyTaskInfoList;
                ganttTasks = _.concat( ganttTasks, proxyTaskInfoList );
            }
        }
        return ganttTasks;
    }

    updateTaskProperties( taskObject, propertiesArray, ganttTask ) {
        if( this.getObjectType( taskObject ) === 3 ) {
            let homeTaskUid = taskObject.props.fnd0task_tag.dbValues[ 0 ];
            taskObject = cdm.getObject( homeTaskUid );
        }
        if( taskObject ) {
            propertiesArray.forEach( function( propName ) {
                if( ganttTask && ganttTask.isProxyTask && propName === 'text' ) {
                    //Do not update proxy Task name as its already updated
                    return;
                }
                let updatedPropName = this.getServerColumnName( propName );
                if( updatedPropName ) {
                    propName = updatedPropName;
                }
                let propValue;
                if( taskObject.props.hasOwnProperty( propName ) ) {
                    propValue = taskObject.props[ propName ].uiValues[ 0 ];
                    if( this.isFetchInternalValue( propName ) ) {
                        propValue = taskObject.props[ propName ].dbValues[ 0 ];
                    }
                    let propDescMap = taskObject.modelType.propertyDescriptorsMap;
                    if( propDescMap && propDescMap[ propName ] ) {
                        let propDesc = propDescMap[ propName ];
                        if( propDesc && propDesc.anArray ) {
                            propValue = taskObject.props[ propName ].uiValues;
                            if( this.isFetchInternalValue( propName ) ) {
                                propValue = taskObject.props[ propName ].dbValues;
                            }
                        }
                    }
                } else if( ganttTask && !ganttTask.isProxyTask && propName === 'uid' ) {
                    propValue = taskObject.uid;
                }
                if( propValue !== undefined ) {
                    this.setPropertiesOnGanttTask( propName, propValue, ganttTask, false, true );
                }
            }, this );
        }
    }

    createProxyTasks( proxyTasks, parentUid, columns ) {
        let proxyTaskInfoArray = [];
        if( proxyTasks ) {
            proxyTasks.forEach( ( proxyTask ) => {
                if( !this.getTaskInfo( proxyTask.uid ) ) {
                    let homeTaskProp = proxyTask.props.fnd0task_tag.dbValues[ 0 ];
                    let homeTask = cdm.getObject( homeTaskProp );
                    if( homeTask ) {
                        let proxyTaskInfo = {};
                        this.updateTaskProperties( homeTask, columns, proxyTaskInfo );
                        proxyTaskInfo.id = proxyTask.uid;
                        proxyTaskInfo.text = proxyTask.props.object_name.dbValues[ 0 ];
                        let homeTaskSchUid = homeTask.props.schedule_tag.dbValues[ 0 ];
                        let homeTaskSchObj = cdm.getObject( homeTaskSchUid );
                        if( homeTaskSchObj ) {
                            let homeTaskSchName = homeTaskSchObj.props.object_name.dbValues[ 0 ];
                            if( homeTaskSchName ) {
                                proxyTaskInfo.text += '(' + homeTaskSchName + ')';
                            }
                        }
                        proxyTaskInfo.isProxyTask = true;
                        proxyTaskInfo.homeTaskUid = homeTaskProp;
                        proxyTaskInfo.parent = parentUid;
                        let refTaskUid = proxyTask.props.fnd0ref.dbValues[ 0 ];
                        let refTaskInfo = this.getTaskInfo( refTaskUid );
                        if( refTaskInfo && refTaskInfo.task_type === '6' ) {
                            //Proxy for a Schedule summary Task.
                            proxyTaskInfo.parent = refTaskUid;
                        }
                        this.removeResolvedMockTask( proxyTaskInfo );
                        this.addTaskInfoToArray( proxyTaskInfo );
                        this.addToTaskMap( proxyTask );
                        proxyTaskInfoArray.push( proxyTaskInfo );
                    }
                }
            } );
        }
        return proxyTaskInfoArray;
    }

    getGanttTaskDependencyType( type ) {
        /* Gantt Dependencies types:
           0: Finish to Start
           1: Start to Start
           2: Finish to Finish
           3: Start to Finish */

        let dependencyType = 0;
        switch ( type ) {
            case '1': //Finish to Finish
                dependencyType = '2';
                break;
            case '2': //The Start to Start
                dependencyType = '1';
                break;
            case '3': //The Start to Finish
                dependencyType = '3';
                break;
            case '4': //The Phase Gate
                dependencyType = '1';
                break;
        }
        return dependencyType;
    }
    /**
     * @param dependency The Dependency
     * @return {Object} linkInfo - The GanttLink info if resolved. The link is resolved if both predecessor and
     *         successor are found.
     */
    addLinkInfo( dependency ) {
        let uid = dependency.uid;
        let target = dependency.props.primary_object.dbValues[ 0 ];
        let source = dependency.props.secondary_object.dbValues[ 0 ];
        let dependencyType = dependency.props.dependency_type.dbValues[ 0 ];
        //let dependencyTypeInt = parseInt( dependencyType );
        //Cross schedule dependency
        let linkType = this.getGanttTaskDependencyType( dependencyType );

        let sourceObject = cdm.getObject( source );
        let targetObject = cdm.getObject( target );

        if( this.getObjectType( sourceObject ) === 3 && sourceObject.props.fnd0task_tag ) {
            var homeTaskPropSecondary = sourceObject.props.fnd0task_tag.dbValues[ 0 ];
            if( this.getTask( homeTaskPropSecondary ) ) {
                source = homeTaskPropSecondary;
            }
        }

        if( this.getObjectType( targetObject ) === 3 && targetObject.props.fnd0task_tag ) {
            var homeTaskPropPrimary = targetObject.props.fnd0task_tag.dbValues[ 0 ];
            if( this.getTask( homeTaskPropPrimary ) ) {
                target = homeTaskPropPrimary;
            }
        }

        let linkInfo = {
            id: uid,
            source: source,
            target: target,
            type: linkType
        };
        this._uid2DependencyMap[ uid ] = dependency;
        this.addLinkInfoToArray( linkInfo );
        this._uid2DependencyInfoMap[uid] = linkInfo;
        let predecessor = this.getTaskInfo( source );
        let successor = this.getTaskInfo( target );

        if( !predecessor && successor ) {
            let predecessorTask = cdm.getObject( source );
            let type = this.getObjectType( predecessorTask );
            this.updateMockTaskForDependency( type, predecessorTask );
        } else if( predecessor && !successor ) {
            let successorTask = cdm.getObject( target );
            let type = this.getObjectType( successorTask );
            this.updateMockTaskForDependency( type, successorTask );
        }
        return linkInfo;
    }

    addLinkInfoToArray( linkInfo ) {
        if( this._linkInfos.indexOf( linkInfo ) < 0 ) {
            //Filter out the dependency in master-sub scenario where 2 dependencies are created.
            let index = _.findIndex( this._linkInfos, ( existingLink )=> {
                return existingLink.source === linkInfo.source && existingLink.target === linkInfo.target;
            } );
            if( index === -1 ) {
                this._linkInfos.push( linkInfo );
            }
        }
    }

    getUpdatedLinks( dependencyArray ) {
        let ganttLinks = [];
        if( !_.isEmpty( dependencyArray ) ) {
            dependencyArray.forEach( ( dependency ) => {
                let depInfo = this.getTaskDependencyInfo( dependency.uid );
                if( depInfo ) {
                    let dependencyType = dependency.props.dependency_type.dbValues[ 0 ];
                    //let dependencyTypeInt = parseInt( dependencyType );
                    let linkType = this.getGanttTaskDependencyType( dependencyType );
                    depInfo.type = linkType;
                    ganttLinks.push( depInfo );
                }
            } );
        }
        return ganttLinks;
    }

    updateMockTaskForDependency( type, task ) {
        if( type === 3 ) {
            if( !this.isProxyResolved( task ) ) {
                this.mockTaskForDependency( task );
            }
        } else {
            this.mockTaskForDependency( task );
        }
    }

    /**
     * This function will resolve the proxy task.
     *
     * @param {Object} proxy - The proxy task.
     * @return true if the proxy is resolved.
     */
    isProxyResolved( proxy ) {
        return this.resolvedProxies && this.resolvedProxies.indexOf( proxy ) >= 0;
    }

    /**
     * This function will return the info related to mock Task.
     *
     * @param {Object} task - The task object.
     * @return {Object} taskInfo - The info of the task object.
     */
    mockTaskForDependency( task ) {
        let taskInfo = {};
        try {
            let taskToMock = task;
            let refTask = task;
            let type = this.getObjectType( task );
            if( type === 3 ) {
                let homeTaskProp = task.props.fnd0task_tag.dbValues[ 0 ];
                if( homeTaskProp ) {
                    taskToMock = cdm.getObject( homeTaskProp );
                }
                let refTaskProp = task.props.fnd0ref.dbValues[ 0 ];
                if( refTaskProp ) {
                    refTask = cdm.getObject( refTaskProp );
                }
            }
            let essentialCols = this.getEssentialColumns();
            essentialCols.push( 'object_name' );
            this.updateSupportingPropsOnTask( taskToMock, essentialCols, taskInfo, false );
            if( refTask && refTask.props.fnd0ParentTask ) {
                taskInfo.parent = refTask.props.fnd0ParentTask.dbValues[0];
            }
            if( type === 3 ) {
                taskInfo.id = task.uid;
            }
            if( this._mockTaskForDependencies.indexOf( taskInfo ) < 0 ) {
                this._mockTaskForDependencies.push( taskInfo );
            }
        } catch ( e ) {
            console.log( 'Error is ' + e );
        }
        return taskInfo;
    }

    /**
     * This function will create soaColumnsInfo.
     * @param {Object} eventData event data
     * @returns {Array} The columns list for saveUIColumnConfigs SOA
     */
    getArrangeCols( eventData ) {
        let soaColumnInfos = [];
        let index = 100;
        _.forEach( eventData.columns, function( col ) {
            let soaColumnInfo = awColumnSvc.createSoaColumnInfo( col, index );
            soaColumnInfos.push( soaColumnInfo );
            index += 100;
        } );
        return soaColumnInfos;
    }

    getTask( uid ) {
        return this._uid2TaskMap[ uid ];
    }

    getTaskInfo( uid ) {
        return this._uid2TaskInfoMap[ uid ];
    }

    getTaskInfoArray() {
        return this._taskInfoArray;
    }

    getTaskObjectArray() {
        return Object.keys( this._uid2TaskMap ).map( ( itm ) => { return this.getTask( itm ); } );
    }

    getTaskDependency( taskDepUid ) {
        return this._uid2DependencyMap[ taskDepUid ];
    }

    getTaskDependencyInfo( taskDepUid ) {
        return this._uid2DependencyInfoMap[ taskDepUid ];
    }


    getAllMockTasksForDependency() {
        return this._mockTaskForDependencies;
    }

    getLinks() {
        return this._linkInfos;
    }

    selectTask( uid ) {
        let task = this.getTask( uid );
        selectionSvc.updateSelection( task, appCtxSvc.ctx.xrtSummaryContextObject );
    }

    deselectTask() {
        let task = this.getSourceTask();
        selectionSvc.updateSelection( task, appCtxSvc.ctx.xrtSummaryContextObject );
    }

    /**
     * returns all the mock tasks for unloaded tasks
     * @returns {Array} The list of mock tasks
     */
    getAllMockTasks() {
        return this._mockTaskForDependencies;
    }

    /**
     * Deletes the mock task when actual task is loaded.
     * @param {Object} ganttTask The Gantt task to delete mock task
     */
    removeResolvedMockTask( ganttTask ) {
        //Check for presence of mock and if present remove the resolved mock.
        let mockTasksList = this.getAllMockTasks();
        if( mockTasksList.length > 0 ) {
            let index = _.findIndex( mockTasksList, ( mockTask )=> {
                return mockTask.id === ganttTask.id;
            } );
            if( index >= 0 ) {
                mockTasksList.splice( index, 1 );
                ganttUtils.deleteGanttTask( ganttTask );
            }
        }
    }

    /**
     * This function will sync selection from Gantt to Ctx.
     * @param {array} tasksList - List of Uid of the selected task.
     */
    multiSelectTask( tasksList ) {
        var selectedTasks = [];
        if( tasksList.length === 0 ) {
            selectionSvc.updateSelection( this.getSourceObject(), this.getSourceObject() );
        } else if( tasksList.length === 1 && appCtxSvc.ctx.mselected.length === 1 && tasksList[ 0 ] === appCtxSvc.ctx.mselected[ 0 ].uid ) {
            selectionSvc.updateSelection( this.getSourceTask(), appCtxSvc.ctx.xrtSummaryContextObject );
        } else {
            tasksList.forEach( ( id ) => {
                var task = this.getTask( id );
                selectedTasks.push( task );
            } );
            if( selectedTasks.length !== 0 ) {
                selectionSvc.updateSelection( selectedTasks, appCtxSvc.ctx.xrtSummaryContextObject );
            }
        }
    }

    selectLink( id ) {
        let link = this.getTaskDependency( id );
        selectionSvc.updateSelection( link, appCtxSvc.ctx.xrtSummaryContextObject );
    }

    cleanup() {
        this.eventDateRanges = {};
        this._dateRanges = [];
        this._taskInfoArray = [];
        this._uid2TaskInfoMap = {};
        this._uid2TaskMap = {};
        this._uid2DependencyMap = {};
        this._uid2DependencyInfoMap = {};
        this._linkInfos = [];
        this._mockTaskForDependencies = [];
        this.isCriticalPathOn = false;
        this.criticalTasksUids = [];
    }
}
