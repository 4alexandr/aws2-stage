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
 * @module js/Mtw0ShowAddObjectService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import addObjectUtils from 'js/addObjectUtils';
import _ from 'lodash';

var exports = {};

/**
 * This method sets the Relation and the Secondary object in context when xrt object-set 'Add to' command is
 * clicked.
 *
 * @param {data}{ctx} data , ctx
 * @return {ObjectArray} input data
 */
export let activateShowAddObjectPanel = function( commandId, location, data, ctx, objectSetSource ) {
    var secondaryObjFromObjectSource = null;
    var secondaryObjForXrtCreate = null;
    var relationSecondaryObjArr = objectSetSource.split( '.' );
    secondaryObjFromObjectSource = relationSecondaryObjArr[ 1 ];
    if( _.endsWith( secondaryObjFromObjectSource, 'Revision' ) ) {
        var a = secondaryObjFromObjectSource.indexOf( 'Revision' );
        secondaryObjForXrtCreate = secondaryObjFromObjectSource.substring( 0, a ).trim();
    } else {
        secondaryObjForXrtCreate = secondaryObjFromObjectSource;
    }
    ctx.secondaryObjFromObjectSource = secondaryObjFromObjectSource;
    ctx.secondaryObjForXrtCreate = secondaryObjForXrtCreate;
    ctx.relation = relationSecondaryObjArr[ 0 ];
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * This method prepares secondary object and the relation object data when the 'New' panel comes up.
 *
 * @param {data}{ctx} data , ctx
 * @return {ObjectArray} input data
 */
export let prepareDataOnEachXrtLoad = function( data, ctx ) {
    if( data.objCreateInfo.createType !== ctx.relation ) {
        data.secondaryObjectInfo = data.objCreateInfo;
    } else {
        data.relationObjectInfo = data.objCreateInfo;
    }
};

/**
 * This method prepares input for Secondary object for createRelateAndSubmit SOA.
 *
 * @param {Object} data - The panel's view model object
 */
export let getSecondaryObjectCreateInput = function( data ) {
    data.objCreateInfo = data.secondaryObjectInfo;
    var inputs = addObjectUtils.getCreateInput( data );
    return inputs;
};

/**
 * This method returns output of createRelateAndSubmit SOA operation.
 *
 * @param {Object} data - The panel's view model object
 */
export let getCreatedSecondaryObject = function( response ) {
    var newObjects = [];
    newObjects = addObjectUtils.getCreatedObject( response );
    return newObjects;
};

/**
 * This private function gets the selected Secondary Object to be related from the various
 * Clipboard/Favourites/Recent Providers
 *
 * @param {Object} ctx
 */
var getClipboardFavouriteRecentSelection = function( ctx ) {
    var selectedPaletteObj = {};

    if( ctx.getClipboardProvider.selectedObjects.length > 0 ) {
        selectedPaletteObj = {
            uid: ctx.getClipboardProvider.selectedObjects[ 0 ].uid,
            type: ctx.getClipboardProvider.selectedObjects[ 0 ].type
        };
    }
    if( ctx.getFavoriteProvider.selectedObjects.length > 0 ) {
        selectedPaletteObj = {
            uid: ctx.getFavoriteProvider.selectedObjects[ 0 ].uid,
            type: ctx.getFavoriteProvider.selectedObjects[ 0 ].type
        };
    }
    if( ctx.getRecentObjsProvider.selectedObjects.length > 0 ) {
        selectedPaletteObj = {
            uid: ctx.getRecentObjsProvider.selectedObjects[ 0 ].uid,
            type: ctx.getRecentObjsProvider.selectedObjects[ 0 ].type
        };
    }
    return selectedPaletteObj;
};

/**
 * Private method to create input data required for "createObjects" SOA.
 *
 * @param {data}{ctx} data , ctx
 * @return {ObjectArray} input data
 */
var prepareDataForCreateObjectSOA = function( data, ctx ) {
    var doubleObj = {};
    var boolObj = {};
    var strObj = {};
    var tagObj = {};

    if( data.selectedTab.panelId === 'Mtw0ShowAddObjectPaletteTab' ||
        data.selectedTab.panelId === 'Mtw0ShowAddObjectSearchResultsTab' ) {
        data.relationObjectInfo = data.objCreateInfo;
    }

    _.forEach( data.relationObjectInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp.type === 'DOUBLE' ) {
            doubleObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
        if( vmProp.type === 'BOOLEAN' ) {
            boolObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
        if( vmProp.type === 'STRING' ) {
            strObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
    } );

    var primaryObjInfo = {
        uid: ctx.mselected[ 0 ].uid,
        type: ctx.mselected[ 0 ].type
    };
    var secondary_object = {};
    if( data.selectedTab.panelId === 'Mtw0ShowAddObjectNewTab' ) {
        if( _.endsWith( ctx.secondaryObjFromObjectSource, 'Revision' ) ) {
            secondary_object = {
                uid: data.createdObject.uid,
                type: data.createdObject.type
            };
        } else {
            secondary_object = {
                uid: data.createdMainObject.uid,
                type: data.createdMainObject.type
            };
        }
    } else if( data.selectedTab.panelId === 'Mtw0ShowAddObjectPaletteTab' ) {
        secondary_object = getClipboardFavouriteRecentSelection( ctx );
    } else if( data.selectedTab.panelId === 'Mtw0ShowAddObjectSearchResultsTab' ) {
        secondary_object = {
            uid: data.dataProviders.performSearch.selectedObjects[ 0 ].uid,
            type: data.dataProviders.performSearch.selectedObjects[ 0 ].type
        };
    }

    tagObj = {
        primary_object: primaryObjInfo,
        secondary_object: secondary_object
    };
    var createInputRelObject = {
        boName: ctx.relation,
        doubleProps: doubleObj,
        boolProps: boolObj,
        stringProps: strObj,
        tagProps: tagObj
    };
    return createInputRelObject;
};

/**
 * This method creates input data required for "createObjects" SOA for relating secondary object with primary
 * object.
 *
 * @param {data}{ctx} data , ctx
 * @return {ObjectArray} input data
 */
export let getInputForCreateObjectSOA = function( data, ctx ) {
    var inputData = [];
    var dataVal = prepareDataForCreateObjectSOA( data, ctx );
    var input = {
        clientId: '',
        data: dataVal
    };
    inputData.push( input );
    return inputData;
};

/**
 * JS function to set type filter to be used for search
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} typeFilter - object type
 */
export let setTypefilterAndSearch = function( data, typefilter ) {
    if( data ) {
        data.typeFilter = typefilter;
        addObjectUtils.findSubBusinessObjectsAndInvokeSearch( data );
    }
};

export default exports = {
    activateShowAddObjectPanel,
    prepareDataOnEachXrtLoad,
    getSecondaryObjectCreateInput,
    getCreatedSecondaryObject,
    getInputForCreateObjectSOA,
    setTypefilterAndSearch
};
/**
 * Show Add object panel service utility
 *
 * @memberof NgServices
 * @member Mtw0ShowAddObjectService
 */
app.factory( 'Mtw0ShowAddObjectService', () => exports );
