// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0TasksUtils
 */
import * as app from 'app';
import viewModelObjSvc from 'js/viewModelObjectService';
import msgsvc from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import 'js/commandPanel.service';
import 'js/iconService';
import angular from 'angular';
import eventBus from 'js/eventBus';

var exports = {};
var _NULL_ID = 'AAAAAAAAAAAAAA';
/**
 * Return true/false based on allow_subgroups property on signoff profile object
 *
 * @param {Object} signoffProfileVMOObject - Signoff profileVMO obejct where decision required property needs to
 *            be populated
 * @return {Boolean} True/False value
 */
var isAllowSubGroup = function( signoffProfileVMOObject ) {
    if( signoffProfileVMOObject.props && signoffProfileVMOObject.props.allow_subgroups && signoffProfileVMOObject.props.allow_subgroups.dbValues ) {
        var allowSubGroupsValue = signoffProfileVMOObject.props.allow_subgroups.dbValues[ 0 ];

        if( allowSubGroupsValue === '1' ) {
            return true;
        }
    }
    return false;
};

/**
 * This method will return the group for the profile.
 */
var loadProfileGroup = function( profileObject, group ) {
    if( profileObject.props.group && profileObject.props.group.dbValues ) {
        var groupObject = soa_kernel_clientDataModel.getObject( profileObject.props.group.dbValues[ 0 ] );
        if( groupObject && groupObject.props.object_full_name && groupObject.props.object_full_name.dbValues ) {
            group = groupObject.props.object_full_name.dbValues[ 0 ];
        }
    }
    return group;
};

/**
 * This method will return the role for the profile.
 */
var loadProfileRole = function( profileObject, role ) {
    if( profileObject.props.role && profileObject.props.role.dbValues ) {
        var roleObject = soa_kernel_clientDataModel.getObject( profileObject.props.role.dbValues[ 0 ] );
        if( roleObject && roleObject.props.role_name && roleObject.props.role_name.dbValues ) {
            role = roleObject.props.role_name.dbValues[ 0 ];
        }
    }
    return role;
};

/**
 * Populate the signoff profile group role name property on signoff profile object
 *
 * @param {Object} signoffProfileVMOObject - Signoff profileVMO obejct where decision required property needs to
 *            be populated
 */
var populateSignoffProfileGroupRoleProp = function( signoffProfileVMOObject ) {
    var groupName = null;
    var roleName = null;

    if( signoffProfileVMOObject.props && signoffProfileVMOObject.props[ 'REF(group,Group).object_full_name' ] &&
        signoffProfileVMOObject.props[ 'REF(group,Group).object_full_name' ].uiValues ) {
        groupName = signoffProfileVMOObject.props[ 'REF(group,Group).object_full_name' ].uiValues[ 0 ];
    } else {
        groupName = loadProfileGroup( signoffProfileVMOObject, groupName );
    }

    if( !groupName ) {
        groupName = '*';
    }

    // Check for allow sub groups proeprty value and if that is true then append ++
    // to the group name to be displayed on UI.
    if( isAllowSubGroup( signoffProfileVMOObject ) ) {
        var finalGroupName = groupName + '++';
        groupName = finalGroupName;
    }


    if( signoffProfileVMOObject.props && signoffProfileVMOObject.props[ 'REF(role,Role).role_name' ] &&
        signoffProfileVMOObject.props[ 'REF(role,Role).role_name' ].uiValues ) {
        roleName = signoffProfileVMOObject.props[ 'REF(role,Role).role_name' ].uiValues[ 0 ];
    } else {
        roleName = loadProfileRole( signoffProfileVMOObject, roleName );
    }
    if( !roleName ) {
        roleName = '*';
    }

    if( groupName && roleName ) {
        var groupRoleName = groupName + '/' + roleName;
        signoffProfileVMOObject.groupRoleName = groupRoleName;
    }
};

/**
 * Get the created view model object.
 *
 * @param {Object} modelObject Profile obejct for VMO need to be created
 * @param {object} data - the data Object
 *
 * @returns {object} signoffProfileVMOObject - profile VMO object
 */
export let getSignoffProfileObject = function( modelObject, data ) {
    var signoffProfileVMOObject = null;
    if( modelObject && modelObject.uid && modelObject.uid !== _NULL_ID ) {
        signoffProfileVMOObject = viewModelObjSvc.createViewModelObject( modelObject.uid, 'EDIT', null, modelObject  );

        if( !signoffProfileVMOObject ) {
            return null;
        }
        var requiredString = null;
        if( data && data.i18n.required ) {
            requiredString = data.i18n.required;
        } else {
            var localeTextBundle = localeService.getLoadedText( 'WorkflowCommandPanelsMessages' );
            requiredString = localeTextBundle.required;
        }

        if( requiredString && signoffProfileVMOObject.props && signoffProfileVMOObject.props.number_of_signoffs &&
            signoffProfileVMOObject.props.number_of_signoffs.dbValues ) {
            var requiredReviewers = signoffProfileVMOObject.props.number_of_signoffs.dbValues[ 0 ] + ' ' + requiredString;

            signoffProfileVMOObject.requiredReviewers = requiredReviewers;
        }

        // Populate the signoff profile group role name proeprty on signoff profile object
        populateSignoffProfileGroupRoleProp( signoffProfileVMOObject );
    }
    return signoffProfileVMOObject;
};

/**
 * This will return the profile object
 * @param {JSONString} profileJSONString - Json String recieved by server
 * @param {Object} data  - data
 * @returns {array} signoffProfiles - array of profile objects.
 */
export let getProfiles = function( profileJSONString, data ) {
    var signoffProfiles = [];
    if( profileJSONString && profileJSONString.length > 0 ) {
        var profiles = JSON.parse( profileJSONString );

        _.forEach( profiles.objects, function( result ) {
            if( result ) {
                var updatedVMO = exports.getSignoffProfileObject( result, data );
                if( updatedVMO ) {
                    signoffProfiles.push( updatedVMO );
                }
            }
        } );
    }
    return signoffProfiles;
};
export let getDuplicateErrorMessage = function( objectsAlreadyAdded, data ) {
    var message = '';
    var finalMessage = '';
    if( objectsAlreadyAdded.length === 1 ) {
        message = objectsAlreadyAdded[ 0 ].props.object_string.dbValues[ 0 ];
        message = message.split( '(' );
        message = '"' + message[ 0 ] + '"';
        var localDuplicateErorMsg = msgsvc.applyMessageParams( data.i18n.duplicateReviewerMsg, [ '{{message}}' ], {
            message: message
        } );
        finalMessage = localDuplicateErorMsg;
    }
    if( objectsAlreadyAdded.length > 1 ) {
        for( var dup = 0; dup < objectsAlreadyAdded.length; ++dup ) {
            message = objectsAlreadyAdded[ dup ].props.object_string.dbValues[ 0 ];
            message = message.split( '(' );
            message = '"' + message[ 0 ] + '"';

            var localMsg = msgsvc.applyMessageParams( data.i18n.wasNotAdded, [ '{{message}}' ], {
                message: message
            } );
            finalMessage += localMsg + '</br>';
        }
        var cannotBeAddedCount = objectsAlreadyAdded.length;
        var totalSelectedObj = data.selectedObjects.length;
        var msg = msgsvc.applyMessageParams( data.i18n.multipleDuplicateMsg, [ '{{cannotBeAddedCount}}', '{{totalSelectedObj}}' ], {
            cannotBeAddedCount: cannotBeAddedCount,
            totalSelectedObj: totalSelectedObj
        } );
        finalMessage = msg + '</br>' + finalMessage;
    }
    return finalMessage;
};

export let registeringContext = function( cmdContext, data, ctx ) {
    cmdContext.selectionMode = 'multiple';
    if( cmdContext.name === 'assignerDataProvider' ) {
        cmdContext.selectionMode = 'single';
    }
    var context = {
        selectionModelMode: cmdContext.selectionMode,
        loadProjectData: true,
        dataProvider: cmdContext
    };
    if( ctx.assignAllTasks.parentData.additionalSearchCriteria ) {
        delete ctx.assignAllTasks.parentData.additionalSearchCriteria;
    }
    if( data.dataProviders && data.dataProviders.userPerformSearch ) {
        data.dataProviders.userPerformSearch.selectionModel.mode = cmdContext.selectionMode;
    }
    appCtxSvc.registerCtx( 'workflow', context );
};

/**
 * This method enables visibility of Future Task Table based on collapsed state of section.
 * This is
 * @param {Object} data - the data object
 * @param {String} viewName - name of the aw-command-panel-section
 * @param {Boolean} isCollapsed - collapsed state of aw-command-panel-section
 */
export let populateOrHideFutureTaskTable = function( data, viewName, isCollapsed ) {
    if( viewName === 'Awp0FutureTasks' ) {
        data.isFutureTaskTableVisible = !isCollapsed;
        if( data.isFutureTaskTableVisible ) {
            // Fire this event to close any popup panel if opened as open  popup panel
            // and upcoming task table both don't work together.
            eventBus.publish( 'workflow.closePopupPanel' );
        }
    }
};

/**
 * Collapse the input section with given name
 * @param {Object} data - the data object
 * @param {String} sectionName Section anme that need to be collapsed
 */
export let collapseGivenSection = function( data, sectionName ) {
    data.isFutureTaskTableVisible = false;
    var scope = angular.element( document.getElementById( sectionName ) ).isolateScope();
    if( scope && scope.collapsed === 'false' ) {
        scope.flipSectionDisplay();
    }
};

export default exports = {
    getProfiles,
    getDuplicateErrorMessage,
    registeringContext,
    populateOrHideFutureTaskTable,
    collapseGivenSection,
    getSignoffProfileObject
};
/**
 * This factory creates a service and returns exports
 * @member Awp0TasksUtils
 * @memberof NgServices
 */
app.factory( 'Awp0TasksUtils', () => exports );
