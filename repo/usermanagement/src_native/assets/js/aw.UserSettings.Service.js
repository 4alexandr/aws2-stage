// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define Promise */

/**
 * @module js/aw.UserSettings.Service
 */
import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import soaSvc from 'soa/kernel/soaService';
import tcServerVersion from 'js/TcServerVersion';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var _dataProvider;
var _data;

var groupMemberArray;
var selectedGroup;
var selectedDafaultGroup;

eventBus.subscribe( 'tableDestroyed', function() {
    _dataProvider = null;
} );

var exports = {};

/**
 * The function will get all the role object from the group members. This logic is same as the getGroupMembers
 *
 * @param {Object} response - Response object from the getGroup SOA
 * @return {object} Array of the unique roles under particular group
 */
export let getRoles = function( response ) {
    var groupArray = response.ServiceData.modelObjects;
    groupMemberArray = response.ServiceData.modelObjects;
    var uniqueRoles = [];
    var listRoles = [];

    var currentGroup = selectedGroup.ModelObject.props.group.uiValues[ 0 ];

    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var groupStatus = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStatus = !( groupStatus.dbValues[ 0 ] === '0' );
            if( groupStatus && !isFalseStatus ) { // process only active grp members
                if( group && role ) {
                    // prepare the role list
                    if( group.uiValues[ 0 ] === currentGroup ) {
                        if( role.uiValues[ 0 ] ) {
                            listRoles[ role.uiValues[ 0 ] ] = groupObject;
                        }
                    }
                }
            }
        }
    } );

    for( var role in listRoles ) {
        uniqueRoles.push( role );
    }

    var roles = [];
    var roleObjects = {};

    for( var i = 0; i < uniqueRoles.length; i++ ) {
        roleObjects = {
            propDisplayValue: uniqueRoles[ i ],
            propInternalValue: uniqueRoles[ i ]
        };
        roles.push( roleObjects );
    }

    return roles;
};

export let getListofRoles = function( prop ) {
    selectedGroup = prop;
};

export let initializeTabledata = function( eventData ) {
    if( eventData && !_dataProvider ) {
        _data = eventData.scope.data;
    }
};

/**
 * Get ViewModelRows of required Object
 *
 * @param {Object} response of the getGroupRoleViewModelRows SOA
 */
export let getGroupRoleViewModelRows = function( response ) {
    var displayedRows = [];

    _.forEach( response.viewModelRows, function( inputRow ) {
        var displayRow = viewModelObjectSvc
            .constructViewModelObjectFromModelObject( inputRow.modelObject, 'Edit' );

        _.forEach( inputRow.viewModelProperties, function( logicalViewModelProperty ) {
            var displayedLogicalProp = uwPropertySvc.createViewModelProperty(
                logicalViewModelProperty.propInternalName, logicalViewModelProperty.propDisplayName,
                logicalViewModelProperty.propDataType, logicalViewModelProperty.propDBValue, [ logicalViewModelProperty.propUIValue ] );

            uwPropertySvc.setIsPropertyModifiable( displayedLogicalProp, logicalViewModelProperty.isModifiable );

            if( logicalViewModelProperty.propInternalName === 'default_role' ) {
                displayedLogicalProp.dataProvider = 'regionProvider';
            }

            displayedLogicalProp.ModelObject = inputRow.modelObject;
            uwPropertySvc.setIsEditable( displayedLogicalProp, logicalViewModelProperty.isEditable );
            uwPropertySvc.setHasLov( displayedLogicalProp, logicalViewModelProperty.hasLOV );

            displayedLogicalProp.dbValues = [ logicalViewModelProperty.propDBValue ];
            if( logicalViewModelProperty.propInternalName === 'group' ) {
                var groupDisplayName = displayedLogicalProp.ModelObject.props.object_string.uiValues[ 0 ].split( '/' );
                displayedLogicalProp.uiValues = [ groupDisplayName[ 0 ] ];
                displayedLogicalProp.uiValue = groupDisplayName[ 0 ];
            }

            displayedLogicalProp.getViewModel = function() {
                return _data;
            };

            displayRow.props[ logicalViewModelProperty.propDisplayName ] = displayedLogicalProp;
        } );
        displayedRows.push( displayRow );
    } );

    return displayedRows;
};

/**
 * Update edit state for attribute table and update the commands on the table
 *
 * @param {object} dataprovider - the data provider Object
 * @param {object} eventData - the eventdata object of editHandlerStateChange
 */

export let updateState = function( dataProvider, eventData, context ) {
    if( eventData.state === 'starting'  ) {
        _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( virtualGroupMemberObject ) {
            virtualGroupMemberObject.props.default_role.type = 'STRING';
            virtualGroupMemberObject.props.default_role.isEditable = true;
        } );
        if( eventData.dataSource !== dataProvider ) {
            eventBus.publish( 'editHandlerStateChange', { dataSource: dataProvider, state: 'starting' } );
        }
    } else if( eventData.state === 'canceling' ) {
        _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( virtualGroupMemberObject ) {
            virtualGroupMemberObject.props.default_role.isEditable = false;
        } );
        if( eventData.dataSource !== dataProvider ) {
            eventBus.publish( 'editHandlerStateChange', { dataSource: dataProvider, state: 'canceling' } );
        }
    } else if( eventData.state === 'saved' ) {
        var storeVmos = [];
        var vmoswithDefaultRoleZero = [];
        var forDefaultGroupToOne = [];

        _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( virtualGroupMemberObject ) {
            virtualGroupMemberObject.props.default_role.isEditable = false;
        } );

        _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( virtualGroupMemberObject ) {
            _.forEach( groupMemberArray, function( groupMemberObject ) {
                if( groupMemberObject && groupMemberObject.props && groupMemberObject.type === 'GroupMember' ) {
                    if(  virtualGroupMemberObject.props.group.uiValue === groupMemberObject.props.group.uiValues[ 0 ]  &&
                         virtualGroupMemberObject.props.default_role.dbValue === groupMemberObject.props.role.uiValues[ 0 ]  ) {
                        groupMemberObject.props.default_role.dbValues[ 0 ] = '1';
                        forDefaultGroupToOne.push( groupMemberObject );
                    }
                }
            } );
        } );

        var inputObjects = [];
        var j = 0;

        _.forEach( forDefaultGroupToOne, function( forDefaultGroupToOneObject ) {
            inputObjects[ j ] = {
                groupMember: forDefaultGroupToOneObject,
                groupMemberPropValuesMap: {
                    default_role: forDefaultGroupToOneObject.props.role.dbValues
                }

            };
            j++;
        } );

        var input = {
            inputObjects: inputObjects
        };

        if( inputObjects.length !== 0 ) {
            soaSvc.post( 'Administration-2012-09-UserManagement', 'setGroupMemberProperties', input ).then(
                function( resp ) {
                    if( eventData.dataSource !== dataProvider ) {
                        eventBus.publish( 'editHandlerStateChange', { dataSource: dataProvider, state: 'saved' } );
                    }
                    return resp;
                },
                function( errObj ) {

                } );
        } else {
            if( eventData.dataSource !== dataProvider ) {
                eventBus.publish( 'editHandlerStateChange', { dataSource: dataProvider, state: 'saved' } );
            }
        }
    }
};

/**
 * The function will get all the group object from the group members.
 *
 * @param {Object} response - Response object from the getGroup SOA
 * @return {object} Array of the unique groups
 */
export let getGroups = function( response ) {
    var groupArray = response.groupMembers;
    var defaultGropus = [];
    var uniqueGroups = [];
    var listGroups = [];
    var group_list = [];

    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var group_status = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStaus = !( group_status.dbValues[ 0 ] === '0' );
            if( group_status && !isFalseStaus ) // process only active group members
            {
                if( group && role ) {
                    var default_role = groupObject.props.default_role;
                    var grp_value = group.uiValues[ 0 ];
                    var isFalseRole = !( default_role.dbValues[ 0 ] === '0' );
                    if( default_role && isFalseRole ) {
                        defaultGropus[ grp_value ] = groupObject;
                        listGroups[ grp_value ] = groupObject;
                    } else {
                        var gobj = _.get( defaultGropus, group );
                        if( gobj ) {
                            listGroups[ grp_value ] = gobj;
                        } else {
                            listGroups[ grp_value ] = groupObject;
                        }
                    }
                }
            }
        }
    } );

    for( var group in listGroups ) {
        uniqueGroups.push( listGroups[ group ] );
    }

    var arr = [];
        var obj = {};

    for( var i = 0; i < uniqueGroups.length; i++ ) {
        obj = {
            propDisplayValue: uniqueGroups[ i ].props.group.uiValues[ 0 ],
            propInternalValue: uniqueGroups[ i ].props.group.uiValues[ 0 ]
        };
        arr.push( obj );
    }

    group_list.dbValue = arr;

    return arr;
};

/**
 * Fetch Selected Default Group from data to Commit it to Database
 *
 * @param {object} data - Data of Object
 */
export let setSelectedDefaultGroup = function( data ) {
    selectedDafaultGroup = data.currentGroup.dbValue;
    return selectedDafaultGroup;
};

/**
 * Update edit state for attribute Default Group Widget
 *
 * @param {object} data - Data of Object
 * @param {object} context - context object
 */
export let updateDefaultGroup = function( context ) {
    var inputData = [ {

        userId: context.selected.props.user_id.dbValues[ 0 ],
        person: '',
        password: '',
        defaultGroup: selectedDafaultGroup,
        newOwner: '',
        newOwningGroup: '',
        userPropertyMap: {
            Allow_Login_User_To_Update: [ 'true' ]
        },
        userAddlPropertyMap: {

        }
    } ];

    soaSvc.post( 'Administration-2015-07-UserManagement', 'createOrUpdateUser', { userInputs: inputData } ).then(
        function( resp ) {},
        function( errObj ) {

        } );
};

export let checkVersionSupportForGroupRole = function( major, minor, qrm ) {
    if( tcServerVersion.majorVersion > major ) {
        // For TC versions like TC12
        return true;
    }
    if( tcServerVersion.majorVersion < major ) {
        // For TC versions like TC10
        return false;
    }
    if( tcServerVersion.minorVersion > minor ) {
        // For TC versions like TC11.3
        return true;
    }
    if( tcServerVersion.minorVersion < minor ) {
        // For TC versions like TC11.1
        return false;
    }
    //compare only versions like TC11.2.2, TC11.2.3....
    return tcServerVersion.qrmNumber >= qrm;
};

/**
 * Update edit state for attribute Default Group Widget
 *
 * @param {object} data - Data of Object
 * @param {object} eventData - the eventdata object of editHandlerStateChange
 * @param {object} context - context object
 */

export let modifyUserDefaultGroup = function( data, eventData, context ) {
    if( eventData.state === 'starting' &&  context.user.uid === context.selected.uid  ) {
        data.currentGroup.type = 'STRING';
        data.currentGroup.isEnabled = true;
        data.currentGroup.isRequired = true;
        data.currentGroup.isEditable = true;
    } else if( eventData.state === 'canceling' ) {
        data.currentGroup.isRequired = false;
        data.currentGroup.isEditable = false;
    } else if( eventData.state === 'saved' ) {
        exports.updateDefaultGroup( context );
        data.currentGroup.isRequired = false;
        data.currentGroup.isEditable = false;
    }
};

/**
 * The function will get the default Group for the logged in user
 *
 * @param {Object} response - Response object from the getProperties SOA
 * @return {object} Default group value for the User currently set in the DB
 */
export let getCurrentDefaultGroup = function( response ) {
    var currentdefaultGroupVal;
    var userObjectArray = response.modelObjects;

    _.forEach( userObjectArray, function( userObject ) {
        if( userObject.modelType.name === 'Group' ) {
            currentdefaultGroupVal = userObject.props.object_string.uiValues[ 0 ];
        }
    } );

    return currentdefaultGroupVal;
};

export default exports = {
    getRoles,
    getListofRoles,
    initializeTabledata,
    getGroupRoleViewModelRows,
    updateState,
    getGroups,
    setSelectedDefaultGroup,
    updateDefaultGroup,
    checkVersionSupportForGroupRole,
    modifyUserDefaultGroup,
    getCurrentDefaultGroup
};
/**
 * @memberof NgServices
 * @member awUserSettingsService
 */
app.factory( 'awUserSettingsService', () => exports );
