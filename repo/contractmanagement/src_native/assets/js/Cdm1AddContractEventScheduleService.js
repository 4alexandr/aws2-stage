//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
define
 */

/**
 * @module js/Cdm1AddContractEventScheduleService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxSvc from 'js/listBoxService';
import cdm from 'soa/kernel/clientDataModel';
import tcVmoSrv from 'js/tcViewModelObjectService';
import selectionService from 'js/selection.service';
import eventBus from 'js/eventBus';
import 'lodash';

var exports = {};

/**
 * Populate default values from Schedule name and description
 *
 * @param {Object} View model data
 */
export let populateDefaultValues = function( data ) {
    var selectedSchTemplate = cdm.getObject( data.scheduleTemplate.dbValue.uid );

    if( appCtxSvc.ctx.mselected ) {
        var appStr = "_" + appCtxSvc.ctx.mselected[ 0 ].props.item_id.dbValues[ 0 ] + "_" + appCtxSvc.ctx.mselected[ 0 ].props.item_revision_id.dbValues[ 0 ];

        if( selectedSchTemplate && selectedSchTemplate.props && selectedSchTemplate.props.object_name &&
            selectedSchTemplate.props.object_name.uiValues ) {
            data.name.uiValue = selectedSchTemplate.props.object_name.uiValues[ 0 ] + appStr;
            data.name.dbValue = selectedSchTemplate.props.object_name.uiValues[ 0 ] + appStr;
        }
        if( selectedSchTemplate && selectedSchTemplate.props && selectedSchTemplate.props.object_desc &&
            selectedSchTemplate.props.object_desc.uiValues ) {
            data.description.uiValue = selectedSchTemplate.props.object_desc.uiValues[ 0 ];
            data.description.dbValue = selectedSchTemplate.props.object_desc.uiValues[ 0 ];
        }
    }

};

/**
 * This function gets the selected schedule from the various ClipboardProviders
 * @param {Object} ctx
 */
export let getSchedule = function( ctx ) {

    if( ctx.getClipboardProvider.selectedObjects.length > 0 ) {
        return ctx.getClipboardProvider.selectedObjects[ 0 ].uid;
    }
    if( ctx.getFavoriteProvider.selectedObjects.length > 0 ) {
        return ctx.getFavoriteProvider.selectedObjects[ 0 ].uid;
    }
    if( ctx.getRecentObjsProvider.selectedObjects.length > 0 ) {
        return ctx.getRecentObjsProvider.selectedObjects[ 0 ].uid;
    }

};

/**
 * This function returns the List Model Objects from listBoxSvc for displaying in list drop dropdown
 * @param {Object} response
 */
export let getScheduleTemplatesJS = function( response ) {
    var scheduleTemplateObjects = [];

    if( response && response.searchResults ) {
        var index = 0;
        for( var i in response.searchResults ) {
            scheduleTemplateObjects[ index++ ] = response.searchResults[ i ].modelObject;
        }
    }
    return listBoxSvc.createListModelObjects( scheduleTemplateObjects, 'props.object_string', false );
};

/**
 * This function gets the selected object and resets the other clip board providers
 * @param {Object} ctx
 * @param {Object} response
 */
export let getScheduleForContractFrmRec = function( ctx, provider ) {
    if( ctx && provider ) {
        var selectedObject = provider.selectedObjects[ 0 ];
        if( !selectedObject ) {
            return;
        }
        appCtxSvc.unRegisterCtx( "selectedSchedule" );
        appCtxSvc.registerCtx( "selectedSchedule", selectedObject );
        if( ctx.getClipboardProvider ) {
            ctx.getClipboardProvider.selectNone();
            ctx.getClipboardProvider.selectedObjects = [];
        }

        if( ctx.getFavoriteProvider ) {
            ctx.getFavoriteProvider.selectNone();
            ctx.getFavoriteProvider.selectedObjects = [];
        }
    }
};
/**
 * This function gets the selected object and resets the other clip board providers
 * @param {Object} ctx
 * @param {Object} response
 */
export let getScheduleForContractFrmFav = function( ctx, provider ) {
    if( ctx && provider ) {
        var selectedObject = provider.selectedObjects[ 0 ];
        if( !selectedObject ) {
            return;
        }
        appCtxSvc.unRegisterCtx( "selectedSchedule" );
        appCtxSvc.registerCtx( "selectedSchedule", selectedObject );
        if( ctx.getRecentObjsProvider ) {
            ctx.getRecentObjsProvider.selectNone();
            ctx.getRecentObjsProvider.selectedObjects = [];
        }

        if( ctx.getClipboardProvider ) {
            ctx.getClipboardProvider.selectNone();
            ctx.getClipboardProvider.selectedObjects = [];
        }
    }
};
/**
 * This function gets the selected object and resets the other clip board providers
 * @param {Object} ctx
 * @param {Object} response
 */
export let getScheduleForContractFrmClipboard = function( ctx, provider ) {
    if( ctx && provider ) {
        var selectedObject = provider.selectedObjects[ 0 ];
        if( !selectedObject ) {
            return;
        }
        appCtxSvc.unRegisterCtx( "selectedSchedule" );
        appCtxSvc.registerCtx( "selectedSchedule", selectedObject );
        if( ctx.getRecentObjsProvider ) {
            ctx.getRecentObjsProvider.selectNone();
            ctx.getRecentObjsProvider.selectedObjects = [];
        }

        if( ctx.getFavoriteProvider ) {
            ctx.getFavoriteProvider.selectNone();
            ctx.getFavoriteProvider.selectedObjects = [];
        }
    }
};
/**
 * This function is to unset selected object in the clipboard service as we do not want to naviagate to subpanel
 * automatically.
 *
 * @param {Object} ctx - context object
 *
 */
export let clearClipboardSelection = function( ctx ) {
    if( ctx && ctx.getClipboardProvider ) {
        ctx.getClipboardProvider.selectNone();
        ctx.getClipboardProvider.selectedObjects = [];
    }
};

/**
 * This function handles the tab selection change to unset the selections
 */
export let handleTabSelectionChange = function() {
    var ctx = appCtxSvc.ctx;
    if( ctx.getRecentObjsProvider ) {
        ctx.getRecentObjsProvider.selectNone();
        ctx.getRecentObjsProvider.selectedObjects = [];
    }
    if( ctx.getClipboardProvider ) {
        ctx.getClipboardProvider.selectNone();
        ctx.getClipboardProvider.selectedObjects = [];
    }
    if( ctx.getFavoriteProvider ) {
        ctx.getFavoriteProvider.selectNone();
        ctx.getFavoriteProvider.selectedObjects = [];
    }
};

/**
 * This function get the VMO for showing the Owning Porject section
 * @param {Object} uid
 * @param {Object} operationName
 */
export let getProgVMOJS = function( uid, operationName ) {
    //Get the ViewModelObject for the given UID
    var progVMO = tcVmoSrv.createViewModelObjectById( uid, operationName );
    return progVMO;
};

/**
 * Gets the selected objects
 *
 * @return {selectedObjects} selected Objects
 */
export let getSelectedObjects = function() {
    var selectedObjects = [];

    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        for( var i = 0; i < selection.length; i++ ) {
            var selectedRowUid = selection[ i ].uid;
            var objectToDelete = cdm.getObject( selectedRowUid );
            selectedObjects.push( objectToDelete );
        }
    }
    return selectedObjects;
};

/**
 * This function returns the events table selected object
 *
 * @return {pObj} parent object
 */
export let getParentObj = function() {
    var ctxObj = appCtxSvc.ctx;
    var pObj = {
        uid: ctxObj.pselected.props.cdm0EventList.dbValues[ 0 ],
        type: "Cdm0EventsTable"
    };
    return pObj;
};

/**
 * Cdm1AddContractEventScheduleService factory
 *
 */

export default exports = {
    populateDefaultValues,
    getSchedule,
    getScheduleTemplatesJS,
    getScheduleForContractFrmRec,
    getScheduleForContractFrmFav,
    getScheduleForContractFrmClipboard,
    clearClipboardSelection,
    handleTabSelectionChange,
    getProgVMOJS,
    getSelectedObjects,
    getParentObj
};
app.factory( 'Cdm1AddContractEventScheduleService', () => exports );

/**
 * Cdm1AddContractEventScheduleService returned as moduleServiceNameToInject
 *
 */
