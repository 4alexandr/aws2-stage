//users/goyal/goyal_aw40_7/thinclient/workflowcommandpanelsjs/src/js/Awp0ParticipantService.js#1 - add change 7842622 (xtext)
// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0ParticipantService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import constantsService from 'soa/constantsService';
import cdmService from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import messagingService from 'js/messagingService';
import dataManagementService from 'soa/dataManagementService';
import localeService from 'js/localeService';
import cmmService from 'soa/kernel/clientMetaModel';
import wrkflwUtils from 'js/Awp0WorkflowUtils';
import _ from 'lodash';

var exports = {};

/**
 * Open the repalce particiapnt panel based on input selection and context
 *
 * @param {Object} selectedItemRevision - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {Object} selParticipantObject - Selected participant object that need to be replaced
 */
export let replaceParticipants = function( selectedItemRevision, commandContext, selParticipantObject, ctx ) {
    // Check if input item revision is null or comamnd context or obejct set source on command context is null
    // then no need to proceed further and return from here
    if( !selectedItemRevision || !commandContext || !commandContext.objectSetSource ) {
        return;
    }

    var objectSetSource = commandContext.objectSetSource;
    var participantType = objectSetSource.substring( objectSetSource.indexOf( '.' ) + 1, objectSetSource.length );

     //Popualte the particiapnt type contanst based on validate brign the panel or show the error to user
   _populateParticiapntTypesMap( selectedItemRevision, participantType, ctx ).then( function( result ) {
    var context = {
        selectedObject: selectedItemRevision,
        loadProjectData: 'true',
        participantType: participantType,
        selParticipantObject: selParticipantObject,
        resourceProvider: 'Awp0ResourceProvider',
        participantGroupRole:result.participantGroupRole,
        participantGroupRoleMap: result.participantGroupRoleMap
    };

    //check for single value constant. for single value need to show prepopulate group and role field
    if( result.participantGroupRole && result.participantGroupRole[ 0 ] && result.participantGroupRole[ 0 ].value ) {
        var splitValues = result.participantGroupRole[ 0 ].value.split( '::' );
            if( splitValues && splitValues.length === 2 && splitValues[ 0 ] && (  splitValues[ 0 ] !== '' && splitValues[ 0 ] !== '*'
            && ( splitValues[ 1 ] !== '' && splitValues[ 1 ] !== '*' )  && !splitValues[ 0 ].endsWith( '++' ) ) ) {
                context.defaultGroupRole = result.participantGroupRole[ 0 ].value;
            }
    }
    context.isVersionSupported = wrkflwUtils.isTcReleaseAtLeast131();

    // Set the value on app context serivce and activate the command panel
    appCtxSvc.registerCtx( 'workflow', context );
    commandPanelService.activateCommandPanel( 'Awp0ReplaceParticipant', 'aw_toolsAndInfo' );
} );
};

/**
 * Open the repalce particiapnt panel based on input selection and context
 *
 * @param {Object} selectedItemRevision - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {Object} selParticipantObject - Selected participant object that need to be replaced
 */
export let getItemRevisionObject = function( selectedObject, data ) {
    if( !selectedObject ) {
        return;
    }
    if( ( selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 || selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 )
    && selectedObject.props.root_target_attachments ) {
        var modelObject = cdmService.getObject( selectedObject.props.root_target_attachments.dbValues[ 0 ] );
        data.selectedItemRevisions[ 0 ] = modelObject;
    }
};

/**
 * extract type name from uid
 *
 * @param {string} uid model type uid
 * @returns {string}  Type name extraced from input
 */
var _getModelTypeNameFromUid = function( uid ) {
    var tokens = uid.split( '::' );
    if( tokens.length === 4 && tokens[ 0 ] === 'TYPE' ) {
        return tokens[ 1 ];
    }
    return null;
};

/**
 * Open the add particiapnt panel based on input selection and context
 *
 * @param {Object} selectedObject - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {ctx} ctx - The app context object
 *
 * @returns {object} Return null in case of invalid selection
 */
export let addParticipants = function( selectedObject, commandContext, ctx ) {
    // Check if input item revision is null or comamnd context or obejct set source on command context is null
    // then no need to proceed further and return from here
    if( !selectedObject || !commandContext || !commandContext.objectSetSource ) {
        return;
    }

    var objectSetSource = commandContext.objectSetSource;
    var participantType = objectSetSource.substring( objectSetSource.indexOf( '.' ) + 1, objectSetSource.length );

    // Check if Add particiapnt command is already active then panel should get closed
    if( ctx.activeToolsAndInfoCommand && ctx.activeToolsAndInfoCommand.commandId === 'AddParticipant' ) {
        commandPanelService.activateCommandPanel( 'AddParticipant', 'aw_toolsAndInfo' );
        return;
    }

    var objectsToLoad = [];
    objectsToLoad.push( selectedObject );
    var deferred = AwPromiseService.instance.defer();
    if( selectedObject.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        dataManagementService.getPropertiesUnchecked( objectsToLoad, [ 'allowable_participant_types', 'assignable_participant_types' ] ).then( function() {
            // This is needed to pass the correct updated object to other method
            var modelObject = cdmService.getObject( selectedObject.uid );
            exports.openAddParticiapntPanel( modelObject, commandContext, participantType, deferred, ctx );
        } );
    } else if( selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 ) {
        // This is needed to pass the correct updated object to other method
        var modelObject = cdmService.getObject( selectedObject.props.parent_process.dbValues[ 0 ] );
        exports.openAddTaskParticipantPanel( modelObject, commandContext, participantType, deferred, ctx );
    } else if( selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        var performSignoffmodelObject = cdmService.getObject( selectedObject.props.fnd0ParentTask.dbValues[ 0 ] );
        var jobObject = cdmService.getObject( performSignoffmodelObject.props.parent_process.dbValues[ 0 ] );
        exports.openAddTaskParticipantPanel( jobObject, commandContext, participantType, deferred, ctx );
    }
    return deferred.promise;
};

/**
 * Prepare group role map based on eligibility constant value
 *
 * @param {Object} participantEligibilityValue - value from Fnd0ParticipantEligibilty constant
 * @param {ctx} ctx - The app context object
 * @returns {object} Return group role map
 */
var _populateParticipantGroupRoleMap = function( participantEligibilityValue, ctx ) {
    var participantGroupRoleMap = {};
    if( !participantEligibilityValue || participantEligibilityValue.length <= 0 || !wrkflwUtils.isTcReleaseAtLeast131() ) {
        return participantGroupRoleMap;
    }
    var splitValues = [];
    if( ctx.preferences.EPM_ARG_target_user_group_list_separator && ctx.preferences.EPM_ARG_target_user_group_list_separator.length > 0 && ctx.preferences.EPM_ARG_target_user_group_list_separator[0].trim() !== '' ) {
        splitValues = participantEligibilityValue.split( ctx.preferences.EPM_ARG_target_user_group_list_separator[0] );
      }else{
        splitValues = participantEligibilityValue.split( ',' );
     }
    _.forEach( splitValues, function( groupRoleValue ) {
        var splitGroupRole = groupRoleValue.split( '::' );
        var groupName = 'allGroups';
        var roleName = 'allRoles';
        var isValid = false;
        var keyName = null;
        var keyValue = null;
        if( splitGroupRole[ 0 ] && (  splitGroupRole[ 0 ] !== '' && splitGroupRole[ 0 ] !== '*'
        && ( splitGroupRole[ 1 ] === '' || splitGroupRole[ 1 ] === '*' ) ) ) {
            if( splitGroupRole[ 0 ].endsWith( '++' ) ) {
                splitGroupRole[ 0 ] = splitGroupRole[ 0 ].replace( '++', '' );
            }
            groupName = splitGroupRole[ 0 ];
            isValid = true;
            keyName = groupName;
            keyValue = roleName;
        } else if( splitGroupRole[ 1 ] && (  splitGroupRole[ 1 ] !== '' && splitGroupRole[ 1 ] !== '*'
        && ( splitGroupRole[ 0 ] === '' || splitGroupRole[ 0 ] === '*' ) ) ) {
            roleName = splitGroupRole[ 1 ];
            keyName = roleName;
            keyValue = groupName;
            isValid = true;
        }
        if( keyName && keyValue ) {
            participantGroupRoleMap[ keyName ] = keyValue;
        }
    } );
    return participantGroupRoleMap;
};

/**
 * Populate the particiapnt type constant map that particiapnt can be added or not
 *
 * @param {Object} selectedItemRevision Selected ditem revision
 * @param {String} particiapntType Particiapnt type string
 *
 * @returns{Object} Partiticiapnt type map
 */
var _populateParticiapntTypesMap = function( selectedItemRevision, particiapntType, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var constantTypesToPopulated = [];

    var object1 = {
        typeName: particiapntType,
        constantName: 'ParticipantAllowMultipleAssignee'
    };

    var object2 = {
        typeName: particiapntType,
        constantName: 'Fnd0ParticipantEligibility'
    };

    constantTypesToPopulated.push( object1 );
    constantTypesToPopulated.push( object2 );

    if( constantTypesToPopulated.length > 0 ) {
        var multipleAllowedMap = [];
        var participantGroupRole = [];
        var participantGroupRoleMap = {};
        constantsService.getTypeConstantValues( constantTypesToPopulated ).then( function( response ) {
            if( response && response.constantValues && response.constantValues.length > 0 ) {
                var typeConstantValues = response.constantValues;

                _.forEach( typeConstantValues, function( constantValue ) {
                    var constantKey = constantValue.key;
                    var constantName = constantKey.constantName;

                    var object = {
                        typeName: constantKey.typeName,
                        value: constantValue.value
                    };

                    if( constantName === 'ParticipantAllowMultipleAssignee' ) {
                        multipleAllowedMap.push( object );
                    } else {
                        participantGroupRole.push( object );
                        participantGroupRoleMap = _populateParticipantGroupRoleMap( constantValue.value, ctx );
                    }
                } );

                var output = {
                    multipleAllowedMap: multipleAllowedMap,
                    participantGroupRole: participantGroupRole,
                    participantGroupRoleMap : participantGroupRoleMap
                };

                return deferred.resolve( output );
            }
        } );
    }
    return deferred.promise;
};

/**
 * Open the add particiapnt panel based on input selection and context
 *
 * @param {Object} selectedItemRevision - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {Object} participantType - The participant type where user want to add
 * @param {Object} multipleAllowedMap - The map object
 * @param {Object} deferred - The deferred object
 *
 */
var _openPanel = function( selectedItemRevision, commandContext, participantType, multipleAllowedMap, participantGroupRole, participantGroupRoleMap, deferred ) {
    var selectModelMode = 'single';
    if( multipleAllowedMap && multipleAllowedMap.length > 0 ) {
        for( var idx = 0; idx < multipleAllowedMap.length; idx++ ) {
            if( multipleAllowedMap[ idx ] && multipleAllowedMap[ idx ].typeName === participantType && multipleAllowedMap[ idx ].value === 'true' ) {
                selectModelMode = 'multiple';
                break;
            }
        }
    }

    if( selectModelMode === 'single' && commandContext.dataProvider.viewModelCollection.totalObjectsLoaded > 0 ) {
        var objectString = TypeDisplayNameService.instance.getDisplayName( selectedItemRevision );

        var resource = app.getBaseUrlPath() + '/i18n/WorkflowCommandPanelsMessages';
        var localTextBundle = localeService.getLoadedText( resource );

        var message = messagingService.applyMessageParams( localTextBundle.ParticipantNotAllowMultipleUserErrorMessages, [ 'objectString', '{{messageString}}' ], {
            objectString: objectString,
            messageString: participantType
        } );
        messagingService.showError( message );
        deferred.resolve();
    } else {
        var context = {
            selectedObject: selectedItemRevision,
            loadProjectData: 'true',
            participantType: participantType,
            resourceProvider: 'Awp0ResourceProvider',
            selectionModelMode: selectModelMode,
            participantObjectSetTitleKey: commandContext.objectSetTitleKey,
            participantGroupRole: participantGroupRole,
            participantGroupRoleMap : participantGroupRoleMap
        };

        //check for single value constant. for single value need to show prepopulate group and role field
        if( participantGroupRole && participantGroupRole[ 0 ] && participantGroupRole[ 0 ].value ) {
            var splitValues = participantGroupRole[ 0 ].value.split( '::' );
                if( splitValues && splitValues.length === 2 && splitValues[ 0 ] && (  splitValues[ 0 ] !== '' && splitValues[ 0 ] !== '*'
                && ( splitValues[ 1 ] !== '' && splitValues[ 1 ] !== '*' )  && !splitValues[ 0 ].endsWith( '++' ) ) ) {
                    context.defaultGroupRole = participantGroupRole[ 0 ].value;
                }
        }
        context.isVersionSupported = wrkflwUtils.isTcReleaseAtLeast131();
        // Set the value on app context serivce and activate the command panel
        appCtxSvc.registerCtx( 'workflow', context );
        commandPanelService.activateCommandPanel( 'AddParticipant', 'aw_toolsAndInfo' );
        deferred.resolve();
    }
};

/**
 * Get the property DB value based on input property name.
 *
 * @param {Object} modelObject Object properties need to be loaded
 * @param {String} propName Property name that need to be loaded
 *
 * @return {Object} Property DB value for object
 */
var _getPropDBValues = function( modelObject, propName ) {
    if( modelObject.props && modelObject.props[ propName ] && modelObject.props[ propName ].dbValues ) {
        return modelObject.props[ propName ].dbValues;
    }
    return null;
};

/**
 * Get allowable particiapnt type proeprty value list from input item revision.
 *
 * @param {Object} selectedItemRevision Selected item revision object
 *
 * @return {objectsArray} AllowableParticipantTypesList property value list
 *
 */
var _getAllowableParticipantTypesList = function( selectedItemRevision ) {
    var allowableParticipantTypesList = [];
    // Check if input model object is valid then get the latest model object
    // from client data model that will have latest properties loaded
    if( selectedItemRevision && selectedItemRevision.uid ) {
        selectedItemRevision = cdmService.getObject( selectedItemRevision.uid );
    }
    var allowableParticipantTypes = _getPropDBValues( selectedItemRevision, 'allowable_participant_types' );

    if( allowableParticipantTypes && allowableParticipantTypes.length > 0 ) {
        _.forEach( allowableParticipantTypes, function( type ) {
            var typeName = _getModelTypeNameFromUid( type );
            if( typeName ) {
                allowableParticipantTypesList.push( typeName );
            }
        } );
    }
    return allowableParticipantTypesList;
};

/**
 * Get allowable particiapnt type proeprty value list from input item revision.
 *
 * @param {Object} selectedItemRevision Selected item revision object
 *
 * @return {objectsArray} AllowableParticipantTypesList property value list
 *
 */
var _getAssignableParticipantTypesList = function( selectedItemRevision ) {
    var assignableParticipantTypesList = [];
    // Check if input model object is valid then get the latest model object
    // from client data model that will have latest properties loaded
    if( selectedItemRevision && selectedItemRevision.uid ) {
        selectedItemRevision = cdmService.getObject( selectedItemRevision.uid );
    }
    var assignableParticipantTypes = _getPropDBValues( selectedItemRevision, 'assignable_participant_types' );

    if( assignableParticipantTypes && assignableParticipantTypes.length > 0 ) {
        _.forEach( assignableParticipantTypes, function( type ) {
            var typeName = _getModelTypeNameFromUid( type );
            if( typeName ) {
                assignableParticipantTypesList.push( typeName );
            }
        } );
    }
    return assignableParticipantTypesList;
};

/**
 * Open the add particiapnt panel based on input selection and context
 *
 * @param {Object} selectedItemRevision - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {Object} participantType - The participant type where user want to add
 * @param {Object} deferred - The deferred object
 *
 */
export let openAddParticiapntPanel = function( selectedItemRevision, commandContext, participantType, deferred, ctx ) {
    // Get allowable and assignable particiapnt types for input item revision
    var allowableParticipantTypesList = _getAllowableParticipantTypesList( selectedItemRevision );
    var assignableParticipantTypesList = _getAssignableParticipantTypesList( selectedItemRevision );

    var isValidAllowable = true;
    var isValidAssignable = true;

    if( allowableParticipantTypesList && allowableParticipantTypesList.indexOf( participantType ) === -1 ) {
        isValidAllowable = false;
    }

    if( assignableParticipantTypesList && assignableParticipantTypesList.indexOf( participantType ) === -1 ) {
        isValidAssignable = false;
    }

    if( !isValidAllowable || !isValidAssignable ) {
        var objectString = TypeDisplayNameService.instance.getDisplayName( selectedItemRevision );
        var participantDisplayName = participantType;
        if( participantType ) {
            var participantTypeObject = cmmService.getType( participantType );
            if( participantTypeObject && participantTypeObject.displayName ) {
                participantDisplayName = participantTypeObject.displayName;
            }
        }
        var resource = app.getBaseUrlPath() + '/i18n/WorkflowCommandPanelsMessages';
        var localTextBundle = localeService.getLoadedText( resource );

        var message = messagingService.applyMessageParams( localTextBundle.allowableParticipantErrorMessages, [ '{{messageString}}', 'objectString' ], {
            messageString: participantDisplayName,
            objectString: objectString
        } );
        messagingService.showError( message );
        deferred.resolve();
        return;
    }

    //Popualte the particiapnt type contanst based on validate brign the panel or show the error to user
    _populateParticiapntTypesMap( selectedItemRevision, participantType, ctx ).then( function( result ) {
        _openPanel( selectedItemRevision, commandContext, participantType, result.multipleAllowedMap, result.participantGroupRole, result.participantGroupRoleMap, deferred );
    } );
};
/**
 * Open the add particiapnt panel based on input selection and context
 *
 * @param {Object} selectedItemRevision - Selected item revision where repalce action is initiated
 * @param {commandContext} commandContext - The qualified data of the viewModel
 * @param {Object} participantType - The participant type where user want to add
 * @param {Object} deferred - The deferred object
 *
 */
export let openAddTaskParticipantPanel = function( selectedItemRevision, commandContext, participantType, deferred, ctx ) {
    //Popualte the particiapnt type contanst based on validate brign the panel or show the error to user
    _populateParticiapntTypesMap( selectedItemRevision, participantType, ctx ).then( function( result ) {
        _openPanel( selectedItemRevision, commandContext, participantType, result.multipleAllowedMap, result.participantGroupRole, result.participantGroupRoleMap, deferred );
    } );
};

/**
 * Check whether participant can be removed or not.
 *
 * @param {Object} selectedItemRevision - Selected item revision where remove participant action is initiated
 * @param {Object} selectedParticipants - Selected Participants
 * @param {boolean} isReplaceCase - True or false based on user is doing remove or repalce
 *
 */
export let canRemoveOrReplaceParticipant = function( selectedItemRevision, selectedParticipants, isReplaceCase ) {
    var deferred = AwPromiseService.instance.defer();

    //Get assignable_participant_types property from server first because property might not be cached or value might be outdated.
    var objectsToLoad = [];
    objectsToLoad.push( selectedItemRevision );

    dataManagementService.getPropertiesUnchecked( objectsToLoad, [ 'assignable_participant_types' ] ).then( function() {
        var assignableParticipantTypesList = _getAssignableParticipantTypesList( selectedItemRevision );
        var isValidAssignable = true;

        var participantDisplayName = null;

        for( var idx = 0; idx < selectedParticipants.length; idx++ ) {
            var participantType = selectedParticipants[ idx ].type;
            participantDisplayName = participantType;
            if( selectedParticipants[ idx ].modelType && selectedParticipants[ idx ].modelType.displayName ) {
                participantDisplayName = selectedParticipants[ idx ].modelType.displayName;
            }

            if( assignableParticipantTypesList && assignableParticipantTypesList.indexOf( participantType ) === -1 ) {
                isValidAssignable = false;
                break;
            }
        }


        if( !isValidAssignable ) {
            var objectString = TypeDisplayNameService.instance.getDisplayName( selectedItemRevision );
            var resource = app.getBaseUrlPath() + '/i18n/WorkflowCommandPanelsMessages';
            var localTextBundle = localeService.getLoadedText( resource );
            if( !participantDisplayName ) {
                participantDisplayName = participantType;
            }
            var defaultMessage = localTextBundle.removeParticipantErrorMessages;
            if( isReplaceCase ) {
                defaultMessage = localTextBundle.replaceParticipantErrorMessages;
            }

            var message = messagingService.applyMessageParams( defaultMessage, [ '{{messageString}}', 'objectString' ], {
                messageString: participantDisplayName,
                objectString: objectString
            } );
            messagingService.showError( message );
            deferred.reject( message );
        } else {
            deferred.resolve();
        }
    } );
    return deferred.promise;
};

export default exports = {
    replaceParticipants,
    getItemRevisionObject,
    addParticipants,
    openAddParticiapntPanel,
    openAddTaskParticipantPanel,
    canRemoveOrReplaceParticipant
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member Awp0ParticipantService
 */
app.factory( 'Awp0ParticipantService', () => exports );
