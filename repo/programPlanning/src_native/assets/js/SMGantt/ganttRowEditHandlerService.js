// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 */

/**
 * Gantt Inline Edit handler Service
 *
 * @module js/SMGantt/ganttRowEditHandlerService
 */
import app from 'app';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import editHandlerService from 'js/editHandlerService';
import $ from 'jquery';
import ganttManager from 'js/uiGanttManager';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import ganttDepUtils from 'js/Saw1GanttDependencyUtils';
import _ from 'lodash';
import smConstants from 'js/ScheduleManagerConstants';
import localeSvc from 'js/localeService';
import messagingService from 'js/messagingService';

var exports = {};

var EDIT_HANDLER_CONTEXT = 'GANTT_ROW_EDIT';

/**
 * Creates an edit handler for the view model object.
 *
 * @param {Object} vmo - The view model object in context
 */
export let addEditHandler = function( vmo ) {
    var declViewModel = {};
    declViewModel.vmo = vmo;
    var editHandler = editHandlerFactory.createEditHandler(
        dataSourceService.createNewDataSource( {
            declViewModel: declViewModel
        } )
    );

    if( editHandler ) {
        editHandlerService.setEditHandler( editHandler, EDIT_HANDLER_CONTEXT );
        editHandler.cancelEdits();
    }
};

/**
 * Returns the current edit handler
 *
 * @returns {Object} The edit handler
 */
export let getEditHandler = function() {
    return editHandlerService.getEditHandler( EDIT_HANDLER_CONTEXT );
};

/**
 * Removes the current edit handler
 *
 * @param {boolean} cancelEdits Cancel any edits before removing the handler?
 */
export let removeEditHandler = function( cancelEdits ) {
    var editHandler = editHandlerService.getEditHandler( EDIT_HANDLER_CONTEXT );

    if( editHandler ) {
        if( cancelEdits ) {
            editHandler.cancelEdits( false );
        }

        editHandlerService.removeEditHandler( EDIT_HANDLER_CONTEXT );
    }
};

/**
 * Returns the name of the property whose value is displayed in the cell node.
 *
 * @param {Object} cellNode The gantt cell node.
 * @returns {String} The name of the property.
 */
export let getCellPropertyName = function( cellNode ) {
    var cellIndex = $( cellNode ).prevAll().length;
    let gridCols = ganttManager.getGanttInstance().getGridColumns();
    return gridCols[ cellIndex ].name;
};

export let getViewModelPropertyForDependencyInfo = function( taskUid, propName ) {
    return ganttDepUtils.getViewModelPropertyForDependencyInfo( taskUid, propName );
};


export let saveDependencyEdits = function( dataSource ) {
    var defer = AwPromiseService.instance.defer();

    try {
    // Get all properties that are modified
        let modifiedViewModelProperties = dataSource.getAllModifiedProperties();

        if( modifiedViewModelProperties.length > 0 ) {
            var modifiedProp = modifiedViewModelProperties[ 0 ];
            var propertyName = modifiedProp.propertyName;
            if( propertyName === 'saw1Successors' || propertyName === 'saw1Predecessors' ) {
                //Selected Task
                var selectedTask = cdm.getObject( dataSource.getContextVMO().uid );
                var scheduleVMO = null;

                //Get schedule from selected  taask
                if( selectedTask ) {
                    scheduleVMO = cdm.getObject( selectedTask.props.schedule_tag.dbValues[ 0 ] );
                }

                //Get DB value property which has Dependency Uid information.
                var depInfo = {};
                if( propertyName === 'saw1Successors' ) {
                    depInfo = ganttDepUtils.getTaskSuccDependencies( selectedTask.uid );
                }

                if( propertyName === 'saw1Predecessors' ) {
                    depInfo = ganttDepUtils.getTaskPredDependencies( selectedTask.uid );
                }

                var stringNewValue = modifiedProp.newValue;
                var stringOldValue = '';
                if( modifiedProp.value && modifiedProp.value.length > 0 ) {
                    stringOldValue = modifiedProp.value.toString();
                }

                //Assume all New values are newly added dependencies and old values are removed dependencies.
                var stringNewValueArray = stringNewValue.trim().split( ',' );
                var stringOldValueArray = stringOldValue.trim().split( ',' );

                var depToAdd = [];
                if( stringNewValue ) {
                    var validStr = validateChars( stringNewValue );
                    if( !validStr ) {
                        throw '';
                    }
                    depToAdd = stringNewValueArray;
                }
                var depToRemove = [];
                if( stringOldValue ) {
                    depToRemove = stringOldValueArray;
                }

                //If Added dependency is also present in old property values, means it's not newly added. Remove from array
                for( var i = 0; i < stringOldValueArray.length; ++i ) {
                    depToAdd = depToAdd.filter( function( dep ) {
                        return dep !== stringOldValueArray[ i ];
                    } );
                }

                //If Removed dependency is also present in New property values, means it's not removed. Remove from array
                for( var j = 0; j < stringNewValueArray.length; ++j ) {
                    depToRemove = depToRemove.filter( function( dep ) {
                        return dep !== stringNewValueArray[ j ];
                    } );
                }

                //Process Dependency Delete
                var depDeleteInput = processDepDeletes( depToRemove, depInfo, scheduleVMO );

                //Process Dependency Add
                var depAddInput = processDepAdds( depToAdd, propertyName, selectedTask, scheduleVMO );

                //Execute Dependency Delete
                if( depDeleteInput.dependencyDeletes ) {
                    eventBus.publish( 'InlineDependencyDelete', depDeleteInput );
                    eventBus.subscribe( 'InlineDependencyDeleteSuccess', function() {
                        defer.resolve();
                    } );
                }

                //Execute Dependency Add
                if( depAddInput.newDependencies ) {
                    eventBus.publish( 'InlineDependencyCreate', depAddInput );
                    eventBus.subscribe( 'InlineDependencyCreateSuccess', function() {
                        defer.resolve();
                    } );
                }
            }
        }
    } catch( error ) {
        let msg = 'inlineDepFormatPredError';
        if( propertyName === 'saw1Successors' ) {
            msg = 'inlineDepFormatSuccError';
        }
        localeSvc.getLocalizedText( 'ScheduleManagerMessages', msg ).then( function( result ) {
            var err = result.replace( '{0}', '\'' + stringNewValue + '\'' );
            messagingService.showError( err );
        } );
    }

    return defer.promise;
};

var validateChars = function( depStr ) {
    return /^[0-9,F,S,D,H,P,G,\-,+,.,,]+$/i.test( depStr );
};


var processDepDeletes = function( depToRemove, depInfo, scheduleVMO ) {
    var uidDepToDeleteVMO = [];
    var depDeleteInput = {};
    for( var inx = 0; inx < depToRemove.length; ++inx ) {
        //Get Uid from DBValue property.
        var existingDepUiValues = depInfo.displayValues;
        var indexOfDep = existingDepUiValues.indexOf( depToRemove[ inx ] );
        if( indexOfDep !== -1 && depToRemove[ inx ] !== '' ) {
            var depVMOToDelete = cdm.getObject( depInfo.dependencyUids[ indexOfDep ] );
            if( depVMOToDelete ) {
                uidDepToDeleteVMO.push( depVMOToDelete );
            }
        }
    }

    if( uidDepToDeleteVMO.length > 0 ) {
        depDeleteInput = {
            schedule: scheduleVMO,
            dependencyDeletes: uidDepToDeleteVMO
        };
    }

    return depDeleteInput;
};


var processDepAdds = function( depToAdd, propertyName, selectedTask, scheduleVMO ) {
    var dependencyInfo = [];
    var inputData = {};
    for( var inx = 0; inx < depToAdd.length; ++inx ) {
        var typeString = '';
        var indexOfTaskStr = '';
        var stringWithTypeAndIndex = '';
        var lagTimeString = '';

        var depToAddString = depToAdd[ inx ];
        if( depToAddString === '' ) {
            continue;
        }

        //Remove white space
        var stringValue = depToAddString.replace( /\s/g, '' );

        // The expected format is TaskIndex[Type][+/-lag].
        // '5','3SS+3','7FS-2',and '4FF'are examples of valid entries.
        var hasPlusDelimeter = stringValue.includes( '+' );
        var hasMinusDelimeter = stringValue.includes( '-' );

        var stringValueArray = [];
        if( hasPlusDelimeter ) {
            stringValueArray = stringValue.split( '+' );
        } else if( hasMinusDelimeter ) {
            stringValueArray = stringValue.split( '-' );
        } else {
            stringValueArray.push( stringValue );
        }

        //If String doesn't have Delimeter, stringValueArray should have one entry.
        if( stringValueArray && stringValueArray.length === 1 ) {
            stringWithTypeAndIndex = stringValueArray[ 0 ].trim(); //remove white space in case
            if( !/^[0-9,F,S,P,G]+$/i.test( stringWithTypeAndIndex ) ) {
                throw '';
            }
        }

        //If String has Delimeter, stringValueArray should have two entry.
        if( stringValueArray && stringValueArray.length === 2 ) {
            stringWithTypeAndIndex = stringValueArray[ 0 ].trim(); //remove white space in case
            lagTimeString = stringValueArray[ 1 ].trim(); //remove white space in case
            if( !/^[0-9,d,h]+$/i.test( lagTimeString ) ) {
                throw '';
            }
            if( lagTimeString && lagTimeString.indexOf( 'd' ) === -1 && lagTimeString.indexOf( 'h' ) === -1 ) {
                lagTimeString = lagTimeString.concat( 'd' );
            }
        }

        //Find type of dependency from stringWithTypeAndIndex. If it's not present, default is "FS".
        var indexofType = -1;
        indexofType = stringWithTypeAndIndex.indexOf( 'FS' );
        if( indexofType === -1 ) {
            indexofType = stringWithTypeAndIndex.indexOf( 'FF' );
        }
        if( indexofType === -1 ) {
            indexofType = stringWithTypeAndIndex.indexOf( 'SF' );
        }
        if( indexofType === -1 ) {
            indexofType = stringWithTypeAndIndex.indexOf( 'SS' );
        }
        if( indexofType === -1 ) {
            indexofType = stringWithTypeAndIndex.indexOf( 'PG' );
        }

        // One of the Dep type is found
        if( indexofType !== -1 ) {
            typeString = stringWithTypeAndIndex.substring( indexofType, indexofType + 2 ); //Two Character from type char index is type of Dependency
            if( indexofType !== 0 ) {
                indexOfTaskStr = stringWithTypeAndIndex.substring( 0, indexofType ); // Start to type char index is Task Index.
            }
        } else { //If it's not present, default is "FS".
            typeString = 'FS';
            indexOfTaskStr = stringWithTypeAndIndex;
        }

        if( !indexOfTaskStr ) {
            throw '';
        }

        //process lagtime
        var inputLagime = processLagTime( lagTimeString, hasPlusDelimeter, hasMinusDelimeter );

        //Get task from view model for an index.
        var taskUidFromIndex = ganttDepUtils.getTaskByIndex( indexOfTaskStr );
        var taskFromIndex = cdm.getObject( taskUidFromIndex );
        if( !taskFromIndex ) {
            localeSvc.getLocalizedText( 'ScheduleManagerMessages', 'taskNotFoundError' ).then( function( result ) {
                var err = result.replace( '{0}', '\'' + indexOfTaskStr + '\'' );
                messagingService.showError( err );
            } );
        } else {
            // Prepare SOA input.
            var depType = getDependencyTypeFromString( typeString );

            var sourceVMO = '';
            var targetVMO = '';
            if( propertyName === 'saw1Successors' ) {
                sourceVMO = selectedTask;
                targetVMO = taskFromIndex;
            } else {
                sourceVMO = taskFromIndex;
                targetVMO = selectedTask;
            }

            var info = {
                predTask: sourceVMO,
                succTask: targetVMO,
                depType: depType,
                lagTime:inputLagime
            };

            dependencyInfo.push( info );
        }
    }


    if( dependencyInfo.length > 0 ) {
        inputData = {
            schedule: scheduleVMO,
            newDependencies: dependencyInfo
        };
    }
    return inputData;
};


var processLagTime = function( lagTimeString, hasPlusDelimeter, hasMinusDelimeter ) {
    var inputLagime = 0;
    if( lagTimeString !== '' && ( hasPlusDelimeter || hasMinusDelimeter ) ) {
        var hasHour = false;
        var hasDay = false;
        var indexOfTimeUnit = 0;
        var indexOfDayUnit = 0;
        indexOfTimeUnit = lagTimeString.indexOf( 'h' );
        indexOfDayUnit = lagTimeString.indexOf( 'd' );
        if( indexOfTimeUnit !== -1 ) {
            hasHour = true;
        }
        if( indexOfDayUnit !== -1 ) {
            hasDay = true;
        }

        //If both are false, default is "d"
        if( !hasDay && !hasHour ) {
            hasDay = true;
        }

        var dayStartIndex = 0;
        var timeStartIndex = 0;
        if( hasDay && indexOfDayUnit > indexOfTimeUnit ) {
            dayStartIndex = indexOfTimeUnit + 1;
        } else if ( indexOfTimeUnit > indexOfDayUnit ) {
            timeStartIndex = indexOfDayUnit + 1;
        }

        var timeString = '';
        var timeInt = 0;
        if( indexOfTimeUnit !== -1 && hasHour ) {
            timeString = lagTimeString.substring( timeStartIndex, indexOfTimeUnit );
            if( !isNaN( timeString ) ) {
                timeInt = parseInt( timeString );
                timeInt *= 60;
                if( timeInt > 0 ) {
                    if( hasMinusDelimeter ) {
                        inputLagime -= timeInt;
                    } else {
                        inputLagime += timeInt;
                    }
                }
            }
        }

        var dayString = '';
        var dayInt = 0;
        if( indexOfDayUnit !== -1 && hasDay ) {
            dayString = lagTimeString.substring( dayStartIndex, indexOfDayUnit );
            if( !isNaN( dayString ) ) {
                dayInt = parseInt( dayString );
                dayInt *= 480;
                if( dayInt > 0 ) {
                    if( hasMinusDelimeter ) {
                        inputLagime -= dayInt;
                    } else {
                        inputLagime += dayInt;
                    }
                }
            }
        }
    }
    return inputLagime;
};


var getDependencyTypeFromString = function( typeString ) {
    var typeInt = smConstants.DEPENDENCY_TYPE[ typeString ];
    if( typeInt === undefined ) {
        typeInt = -1;
    }
    return typeInt;
};

export default exports = {
    addEditHandler,
    getEditHandler,
    removeEditHandler,
    getCellPropertyName,
    saveDependencyEdits,
    getViewModelPropertyForDependencyInfo
};
/**
 * Edit handler for for inline editing in Gantt
 *
 * @memberof NgServices
 * @member ganttRowEditHandlerService
 */
app.factory( 'ganttRowEditHandlerService', () => exports );
