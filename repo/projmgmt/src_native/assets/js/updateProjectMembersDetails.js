// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
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
 * @module js/updateProjectMembersDetails
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

/**
 * 
 */

var exports = {};

/**
 * Adds the selected group and group members to selected Project
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let removeSelectedMembers = function( uwDataProvider, context ) {

    var inputs = [];
    var gms = [];
    var groups = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoles = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "Group" ) {
            groups[ groupCount ] = uwDataProvider.selectedObjects[ i ].group;
            groupCount++;
        }
        if( uwDataProvider.selectedObjects[ i ].type === "GroupMember" ) {

            if( uwDataProvider.selectedObjects[ i ].group && uwDataProvider.selectedObjects[ i ].role ) {
                if( uwDataProvider.selectedObjects[ i ].isRemovable === false ) {
                    groupRoles[ roleCount ] = {
                        tcGroup: uwDataProvider.selectedObjects[ i ].group,
                        tcRole: uwDataProvider.selectedObjects[ i ].role,
                        isRemovable: false
                    };
                    roleCount++;
                } else {
                    groupRoles[ roleCount ] = {
                        tcGroup: uwDataProvider.selectedObjects[ i ].group,
                        tcRole: uwDataProvider.selectedObjects[ i ].role,
                        isRemovable: true
                    };
                    roleCount++;
                }
            } else {
                var currGroupMember = {
                    type: uwDataProvider.selectedObjects[ i ].type,
                    uid: uwDataProvider.selectedObjects[ i ].uid
                };
                gms[ gmCount ] = currGroupMember;
                gmCount++;
            }
        }
    }

    inputs[ 0 ] = {
        "project": context.pselected,
        "gms": gms,
        "groups": groups,
        "groupRoles": groupRoles,
        "addOrRemove": false
    };

    var input = {
        "inputs": inputs
    };

    soaService.post( 'Core-2020-01-ProjectLevelSecurity', 'addOrRemoveProjectMembers', input ).then(
        function( resp ) {
            eventBus.publish( 'ProjectTeamTreeGrid.plTable.reload' );
            return resp;
        },
        function( errObj ) {
            eventBus.publish( 'ProjectTeamTreeGrid.plTable.reload' );
        } );
};

/**
 * set non privilege for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setNonPrivilegeStatus = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 0;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );

    var input = {
        "inputs": inputs
    };
    exports.setUserPrivilege( input );
};

export let setUserPrivilege = function( input ) {
    soaService.post( 'Core-2020-01-ProjectLevelSecurity', 'setUserPrivilege', input ).then(
        function( resp ) {
            eventBus.publish( 'ProjectTeamTreeGrid.plTable.reload' );
            return resp;
        },
        function( errObj ) {
            eventBus.publish( 'ProjectTeamTreeGrid.plTable.reload' );
        } );
};

export let createInputStructure = function( uwDataProvider, privilegeStatus, context ) {
    var inputs = [];
    var users = [];
    var groupNode = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoleNode = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "Group" ) {

            groupNode[ groupCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].group,
                isRemovable: true
            };
            groupCount++;
        }
        if( uwDataProvider.selectedObjects[ i ].type === "GroupMember" ) {

            if( uwDataProvider.selectedObjects[ i ].group && uwDataProvider.selectedObjects[ i ].role ) {
                if( uwDataProvider.selectedObjects[ i ].isRemovable === false ) {
                    groupRoleNode[ roleCount ] = {
                        tcGroup: uwDataProvider.selectedObjects[ i ].group,
                        tcRole: uwDataProvider.selectedObjects[ i ].role,
                        isRemovable: false
                    };
                    roleCount++;
                } else {
                    groupRoleNode[ roleCount ] = {
                        tcGroup: uwDataProvider.selectedObjects[ i ].group,
                        tcRole: uwDataProvider.selectedObjects[ i ].role,
                        isRemovable: true
                    };
                    roleCount++;
                }
            } else {
                var currUser = {
                    type: "user",
                    uid: uwDataProvider.selectedObjects[ i ].user.dbValues[ 0 ]
                };
                users[ gmCount ] = currUser;
                gmCount++;
            }
        }
    }

    inputs[ 0 ] = {
        "project": context.pselected,
        "users": users,
        "groupNode": groupNode,
        "groupRoleNode": groupRoleNode,
        "privilegeStatus": privilegeStatus
    };
    return inputs;
};

/**
 * set privilege status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setPrivilegeStatus = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 1;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );

    var input = {
        "inputs": inputs
    };
    exports.setUserPrivilege( input );
};

/**
 * set project team admin status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setProjectTeamAdmin = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 2;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );

    var input = {
        "inputs": inputs
    };
    exports.setUserPrivilege( input );
};

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 * 
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

export default exports = {
    removeSelectedMembers,
    setNonPrivilegeStatus,
    setUserPrivilege,
    createInputStructure,
    setPrivilegeStatus,
    setProjectTeamAdmin,
    setCommandContext
};
/**
 * This service creates name value property
 * 
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'updateProjectMembersDetails', () => exports );
