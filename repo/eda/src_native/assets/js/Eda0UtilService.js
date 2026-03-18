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
 * @module js/Eda0UtilService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import vmoService from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';
import 'angular';
import 'lodash';

var exports = {};

/**
 * Construct the name of CollaborationContextObject.
 */
export let constructCCObjectName = function( ctx ) {
    var name = '';
    if(ctx.locationContext['ActiveWorkspace:SubLocation'] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation') {
        name = 'Co-Design for ' + ctx.locationContext.modelObject.props.object_string.dbValues[0];
    }
    else {
        name = 'Co-Design for ' + ctx.selected.props.object_name.uiValues[0];
    }
    return name;
};
export let getUnderlyingObjectUid = function( ctx ) {
    var uid = '';
    if(ctx.locationContext['ActiveWorkspace:SubLocation'] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation') {
        uid = ctx.selected.props.awb0UnderlyingObject.dbValues[0];
    }
    else {
        uid = ctx.selected.uid;
    }
    return uid;
};

/**
 * Get selected objects from palette/search tab.
 * @param {Object} ctx - ctx
 * @param {Object} data - the viewmodel data for this panel
 * @returns {Array} selected objects from palette/search tab
 */
export let getSelectionFromAddPanel = function( ctx, data ) {

    var paletteSelection;

    if( data.selectedTab.panelId === "paletteTabPageSub" ) {

        if( ctx.getClipboardProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getClipboardProvider.selectedObjects[0].uid;
        } else if( ctx.getFavoriteProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getFavoriteProvider.selectedObjects[0].uid;
        } else if( ctx.getRecentObjsProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getRecentObjsProvider.selectedObjects[0].uid;
        }
    } else if( data.dataProviders.performSearch.selectedObjects.length > 0 ) {
        paletteSelection = data.dataProviders.performSearch.selectedObjects[0].uid;
    }
    var object = cdm.getObject(paletteSelection);
    data.objectAddedToCollaboration = object.props.object_name.dbValues[0];
    return paletteSelection;
};

export default exports = {
    constructCCObjectName,
    getUnderlyingObjectUid,
    getSelectionFromAddPanel
};
app.factory( 'Eda0UtilService', () => exports );
