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
 * @module js/AddParticipant
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import messagingSvc from 'js/messagingService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import awp0WrkflwUtils from 'js/Awp0WorkflowUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the input data object that will be used in SOA
 * to add the respective participants
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 *
 * @return {Object} Input data object
 */
var getInputData = function( data, ctx ) {

    var inputData = {};
    var addParticipantInfo = [];

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( data && data.selectedObjects ) {

        var selObjects = [];
        var objectUids = [];

        // Filter out the duplicate elements if being added any
        _.forEach( data.selectedObjects, function( object ) {
            if( objectUids.indexOf( object.uid ) === -1 ) {
                selObjects.push( object );
                objectUids.push( object.uid );
            }
        } );

        var itemRevObject = ctx.workflow.selectedObject;
        var participantType = ctx.workflow.participantType;
        _.forEach( selObjects, function( object ) {

            // Check if object is selected then only create the input structure
            if( object.selected ) {
                var participantInfo = {
                    "itemRev": itemRevObject,
                    "participantInfo": [ {
                        "assignee": object,
                        "participantType": participantType
                    } ]
                };

                addParticipantInfo.push( participantInfo );
            }
        } );

    }
    inputData.addParticipantInfo = addParticipantInfo;
    return inputData;
};

/**
 * Get the input data object that will be used in SOA
 * to add the respective participants
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 *
 * @return {Object} Input data object
 */
var getTaskInputData = function( data, ctx ) {

    var inputData = {};
    var input = [];

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( data && data.selectedObjects ) {

        var selObjects = [];
        var objectUids = [];

        // Filter out the duplicate elements if being added any
        _.forEach( data.selectedObjects, function( object ) {
            if( objectUids.indexOf( object.uid ) === -1 ) {
                selObjects.push( object );
                objectUids.push( object.uid );
            }
        } );

        var taskObject = ctx.workflow.selectedObject;
        var participantType = ctx.workflow.participantType;
        _.forEach( selObjects, function( object ) {

            // Check if object is selected then only create the input structure
            if( object.selected ) {
                var participantInputData = {
                    "wso": {
                        "type": taskObject.type,
                        "uid": taskObject.uid
                    },
                    "additionalData": {
                        "SampleStringKey": []
                    },
                    "participantInputData": [ {
                        "clientId": "",
                        "assignee": {
                            "type": object.type,
                            "uid": object.uid
                        },
                        "participantType": participantType
                    } ]
                };

                input.push( participantInputData );
            }
        } );

    }
    inputData.input = input;
    return inputData;
};

/**
 * Get the error message string from SOA response that will be displayed to user
 * @param {Object} response - The SOA response object
 *
 * @return {Object} Error message string
 */
var getErrorMessage = function( response ) {
    var err = null;
    var message = "";

    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaSvc.createError( response.ServiceData );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.partialErrors ) {

        _.forEach( err.cause.partialErrors, function( partErr ) {

            if( partErr.errorValues ) {

                for( var idx = 0; idx < partErr.errorValues.length; idx++ ) {
                    var errVal = partErr.errorValues[ idx ];

                    if( errVal.code ) {
                        // Ignore the duplicate error and related error to that
                        if( errVal.code === 35010 ) {
                            break;
                        } else {
                            if( message && message.length > 0 ) {
                                message += '\n' + errVal.message;
                            } else {
                                message += errVal.message;
                            }
                        }
                    }
                }
            }
        } );
    }

    return message;
};

/**
 * Updated the required participant after addition if needed
 * @param {Object} ctx - The context object that will conatin all information to refresh required particiapnt tile
 *
 */
var updateRequiredParticipant = function( ctx ) {

    if( ctx.workflow.selectedObject && ctx.workflow.participantType ) {
        var itemRevObject = soa_kernel_clientDataModel.getObject( ctx.workflow.selectedObject.uid );

        if( itemRevObject && itemRevObject.props.awp0RequiredParticipants ) {
            var requiredParticipantsNames = itemRevObject.props.awp0RequiredParticipants.dbValues;
            if( requiredParticipantsNames && ( requiredParticipantsNames.indexOf( ctx.workflow.participantType ) === -1 ) || ( requiredParticipantsNames.length === 0 ) ) {
                eventBus.publish( 'workflow.updateRequiredParticipant', {
                    requiredParticipants: ctx.workflow.participantObjectSetTitleKey
                } );
            }
        }
    }
};

/**
 * Add the participants to selected object and show respective error if any
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 */
var addParticipantsInternal = function( data, ctx ) {

    var inputData = null;
    if( data.selectedObj && data.selectedObj[ 0 ].modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        inputData = getInputData( data, ctx );
        //ensure the required objects are loaded
        var policyId = policySvc.register( {
            "types": [ {
                    "name": "Participant",
                    "properties": [ {
                        "name": "assignee",
                        "modifiers": [ {
                            "name": "withProperties",
                            "Value": "true"
                        } ]
                    } ]
                },
                {
                    "name": "ItemRevision",
                    "properties": [ {
                        "name": "awp0RequiredParticipants"
                    } ]
                }
            ]
        } );

        // SOA call made to add the participant
        soaSvc.postUnchecked( 'Core-2008-06-DataManagement', 'addParticipants', inputData ).then( function( response ) {

            if( policyId ) {
                policySvc.unregister( policyId );
            }

            if( response && response.ServiceData && response.ServiceData.updated ) {
                var updatedObjects = [ ctx.workflow.selectedObject ];
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: updatedObjects
                } );
            }

            // Refresh the required participant if particiapnt type being added is required.
            updateRequiredParticipant( ctx );

            eventBus.publish( 'complete', {
                source: "toolAndInfoPanel"
            } );

            // Parse the SOA data to content the correct user or resource pool data
            var message = getErrorMessage( response );

            if( message && message.length > 0 ) {
                messagingSvc.showError( message );
            }
        } );
    } else if( data.selectedObj && ( data.selectedObj[ 0 ].modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 || data.selectedObj[ 0 ].modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) ) {
        inputData = getTaskInputData( data, ctx );

        // SOA call made to add the participant
        soaSvc.postUnchecked( 'Participant-2018-11-Participant', 'addParticipants', inputData ).then( function( response ) {

            if( response && response.ServiceData && response.ServiceData.updated ) {
                var updatedObjects = [ ctx.selected ];
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: updatedObjects
                } );
            }

            eventBus.publish( 'complete', {
                source: "toolAndInfoPanel"
            } );

            // Parse the SOA data to content the correct user or resource pool data
            var message = getErrorMessage( response );

            if( message && message.length > 0 ) {
                messagingSvc.showError( message );
            }
        } );
    }

};
/**
 * Add the participants to selected object and show respective error if any
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 */
export let addParticipants = function( data, ctx ) {

    awp0WrkflwUtils.getValidObjectsToAdd( data, data.selectedObjects ).then( function( validObjects ) {
        data.selectedObjects = validObjects;
        addParticipantsInternal( data, ctx );
    } );
};

/**
 * This factory creates a service and returns exports
 *
 * @member AddParticipant
 */

export default exports = {
    addParticipants
};
app.factory( 'AddParticipant', () => exports );
