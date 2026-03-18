// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define Promise */

/**
 * @module js/showProjectTeamTableTree
 */
import app from 'app';
import awTableSvc from 'js/awTableService';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import localeSvc from 'js/localeService';
import _ from 'lodash';

var exports = {};

var vmoID = 1;

export let inputNodeForChild = function( treeLoadInput ) {
    var rootNode = treeLoadInput.parentNode;
    var group = {
        type: rootNode.group.type,
        uid: rootNode.group.uid
    };
    var role = '';
    if( rootNode.role !== '' ) {
        role = {
            type: rootNode.role.type,
            uid: rootNode.role.uid
        };
    }
    var node = {
        tcGroup: group,
        tcRole: role,
        isRemovable: rootNode.isRemovable
    };
    return node;

};

export let loadChildNodes = function( searchResults, treeLoadInput ) {

    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];

    for( var childNdx = 0; childNdx < searchResults.childGroupMembers.length; childNdx++ ) {

        //var object = searchResults[ childNdx ];
        var proxyObject = searchResults.childGroupMembers[ childNdx ];

        var displayName = proxyObject.groupmember.props.user.uiValues[ 0 ];
        var objType = proxyObject.groupmember.type;
        var objUid = proxyObject.groupmember.uid;

        var groupMemberStatus = proxyObject.groupmember.props.status.uiValues[ 0 ];
        var userUid = proxyObject.groupmember.props.user.dbValues[ 0 ];
        var userStatus = searchResults.ServiceData.modelObjects[ userUid ].props.status.uiValues[ 0 ];

        if( userStatus === "1" ) // User is inactive
        {
            iconURL = app.getBaseUrlPath() + "/image/indicatorInactiveUser16.svg";
        } else if( groupMemberStatus === "True" ) // groupMember is inactive
        {
            iconURL = app.getBaseUrlPath() + "/image/indicatorInactiveUserInGroup16.svg";
        } else {
            if( proxyObject.privilege === 0 ) // non-privileged user
            {
                iconURL = app.getBaseUrlPath() + "/image/cmdSetNonPrivilegedUser16.svg";
            } else if( proxyObject.privilege === 1 ) // Privileged User
            {
                iconURL = app.getBaseUrlPath() + "/image/cmdSetPrivilegedUser16.svg";
            } else if( proxyObject.privilege === 2 ) // Project Team Administrator
            {
                iconURL = app.getBaseUrlPath() + "/image/cmdSetProjectTeamAdmin16.svg";
            } else if( proxyObject.privilege === 3 ) // Project Administrator
            {
                iconURL = app.getBaseUrlPath() + "/image/cmdSetProjectTeamAdmin16.svg";

            }
        }

        var resource = 'ProjmgmtConstants';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var statuses = [ localTextBundle.NonPrivilegedKey, localTextBundle.PrivilegedKey, localTextBundle.TeamAdminKey, localTextBundle.ProjectAdminKey ];
        /* 0 = regular member
         1 = privileged member
         2 = project team administrator
         3 = project administrator*/
        var vmNode = awTableSvc
            .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );
        vmNode.isLeaf = true;
        vmNode.props = {};
        vmNode.props.status = {
            value: proxyObject.privilege,
            uiValue: statuses[ proxyObject.privilege ]
        };
        vmNode.user = proxyObject.groupmember.props.user;
        vmNode.isRemovable = proxyObject.isRemovable;

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    for( var childNdx = 0; childNdx < searchResults.childRoles.length; childNdx++ ) {

        //var object = searchResults[ childNdx ];
        var proxyObject = searchResults.childRoles[ childNdx ].groupRole;

        var displayName = proxyObject.tcGroup.props.object_full_name.uiValues[ 0 ] + "." + proxyObject.tcRole.props.role_name.uiValues[ 0 ];
        var objType = "GroupMember";
        var objUid = "Test" + vmoID++;
        var iconURL = app.getBaseUrlPath() + "/image/typeRole48.svg";

        var vmNode = awTableSvc
            .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

        var hasChildren = 0;
        vmNode.isLeaf = hasChildren === "0";
        vmNode.group = proxyObject.tcGroup;
        vmNode.role = proxyObject.tcRole;
        vmNode.isRemovable = proxyObject.isRemovable;
        vmNode.props = {};
        vmNode.props.status = {
            value: "",
            uiValue: ""
        };

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    for( var childNdx = 0; childNdx < searchResults.childGroups.length; childNdx++ ) {

        //var object = searchResults[ childNdx ];
        var proxyObject = searchResults.childGroups[ childNdx ].groupNode;

        var displayName = proxyObject.tcGroup.props.object_full_name.uiValues[ 0 ];
        var objType = proxyObject.tcGroup.type;
        var objUid = proxyObject.tcGroup.uid;
        var iconURL = app.getBaseUrlPath() + "/image/typeProjectTeam48.svg";

        var vmNode = awTableSvc
            .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

        var hasChildren = 0;
        vmNode.isLeaf = hasChildren === "0";
        vmNode.group = proxyObject.tcGroup;
        vmNode.role = '';
        vmNode.isRemovable = proxyObject.isRemovable;
        vmNode.props = {};
        vmNode.props.status = {
            value: "",
            uiValue: ""
        };

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }
    treeLoadInput.pageSize = vmNodes.length;
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, false, true, true, null );
};

/**
 * load Properties required to show in tables'
 * @param {Object} propertyLoadInput - Property Load Input
 * @param {Array} loadedVMOs - Loaded View Model Objects
 * @return {Object} propertyLoadResult
 */
export let loadTableProperties = function( propertyLoadInput ) {
    var allChildNodes = [];
    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            if( childNode.id !== 'top' ) {
                allChildNodes.push( childNode );
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: propertyLoadResult
    } );
};

/**
 * Load properties to be shown in the tree structure
 * @param {object} data The view model data object
 * @return {object} Output of loadTableProperties
 */
export let loadPropertiesJS = function( data ) {
    var viewModelCollection = data.dataProviders.exampleDataProvider.getViewModelCollection();
    var loadedVMOs = viewModelCollection.getLoadedViewModelObjects();
    /**
     * Extract action parameters from the arguments to this function.
     */
    var propertyLoadInput = awTableSvc.findPropertyLoadInput( arguments );

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( propertyLoadInput !== null &&
        propertyLoadInput !== undefined &&
        propertyLoadInput !== 'undefined' ) {
        return exports.loadTableProperties( propertyLoadInput, loadedVMOs );
    }
};

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {searchResults} searchResults new TreeLoadResult object containing result/status information.
 *
 * @return {object} response
 */
export let loadRootNode = function( searchResults, treeLoadInput ) {

    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];

    for( var childNdx = 0; childNdx < searchResults.groups.length; childNdx++ ) {

        //var object = searchResults[ childNdx ];
        var proxyObject = searchResults.groups[ childNdx ];

        var displayName = proxyObject.tcGroup.props.object_full_name.uiValues[ 0 ];
        var objType = "Group";
        var objUid = proxyObject.tcGroup.uid;
        var iconURL = app.getBaseUrlPath() + "/image/typeProjectTeam48.svg";

        var vmNode = awTableSvc
            .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

        var hasChildren = 0;
        vmNode.isLeaf = hasChildren === "0";
        vmNode.group = proxyObject.tcGroup;
        vmNode.role = '';
        vmNode.isRemovable = proxyObject.isRemovable;
        vmNode.props = {};
        vmNode.props.status = {
            value: "",
            uiValue: ""
        };

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }

    for( var childNdx = 0; childNdx < searchResults.structuredGroupMembers.length; childNdx++ ) {

        var proxyObject = searchResults.structuredGroupMembers[ childNdx ];

        var displayName = proxyObject.tcGroup.props.object_full_name.uiValues[ 0 ] + "." + proxyObject.tcRole.props.role_name.uiValues[ 0 ];
        var objType = "GroupMember";
        var objUid = "Test" + vmoID++;
        var iconURL = app.getBaseUrlPath() + "/image/typeRole48.svg";

        var vmNode = awTableSvc
            .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

        var hasChildren = 0;
        vmNode.isLeaf = hasChildren === "0";
        vmNode.group = proxyObject.tcGroup;
        vmNode.role = proxyObject.tcRole;
        vmNode.isRemovable = proxyObject.isRemovable;
        vmNode.props = {};
        vmNode.props.status = {
            value: "",
            uiValue: ""
        };

        if( vmNode ) {
            vmNodes.push( vmNode );
        }
    }
    treeLoadInput.pageSize = vmNodes.length;
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, false, true, true, null );
};

export default exports = {
    inputNodeForChild,
    loadChildNodes,
    loadTableProperties,
    loadPropertiesJS,
    loadRootNode
};
/**
 * @memberof NgServices
 * @member showProjectTeamTableTree
 *
 * @returns {Object} Exported methods
 */
app.factory( 'showProjectTeamTableTree', () => exports );
