//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * Module for the Parameter in Requirement Documentation Page
 *
 * @module js/Arm0SplitPanelService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

export let changePanelLocation = function( panelLocation, data ) {
    appCtxSvc.ctx.showRequirementQualityData = undefined;
    if( data && data.eventData && data.eventData.paramid ) {
        data.selectParam = data.eventData.paramid;
    }
    var splitPanelLocation = { splitPanelLocation: panelLocation };
    var requirementCtx = appCtxSvc.getCtx( 'requirementCtx' );

    if( !requirementCtx ) {
        appCtxSvc.registerCtx( 'requirementCtx', splitPanelLocation );
        if( data ) {
        appCtxSvc.ctx.requirementCtx.objectsToSelect = data.eventData.objectsToSelect;
        }
    } else if( requirementCtx && requirementCtx.splitPanelLocation && requirementCtx.splitPanelLocation === 'bottom' ) {
        appCtxSvc.updatePartialCtx( 'requirementCtx.splitPanelLocation', 'off' );
    } else {
        appCtxSvc.updatePartialCtx( 'requirementCtx.splitPanelLocation', panelLocation );
    }

    // Event to resize Ckeditor
    eventBus.publish( 'requirementsEditor.resizeEditor' );
};

export default exports = {
    changePanelLocation
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Arm0SplitPanelService
 * @param {Object} appCtxSvc app context service
 * @return {Object} service exports exports
 */
app.factory( 'Arm0SplitPanelService', () => exports );
