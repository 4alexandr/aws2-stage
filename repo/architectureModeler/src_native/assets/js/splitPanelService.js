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
 *
 *
 * @module js/splitPanelService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import selectionService from 'js/selection.service';
import eventBus from 'js/eventBus';

var exports = {};

export let changePanelLocation = function( panelLocation ) {

    var splitPanelLocation = null;
    var context = appCtxSvc.getCtx( 'architectureCtx' );

    if( context ) {
        splitPanelLocation = context.splitPanelLocation;
        context.splitPanelLocation = panelLocation;
    }

    if( !splitPanelLocation ) {
        splitPanelLocation = "off";
    }
    var locationData = {
        "splitPanelLocation": splitPanelLocation,
        "selectedSplitPanelLocation": panelLocation
    };

    if( panelLocation === "off" ) {
        var interfaceDetailsCtx = appCtxSvc.getCtx( "interfaceDetails" );
        if( interfaceDetailsCtx ) {
            var parent = interfaceDetailsCtx.targetModelObject;
            if( parent ) {
                selectionService.updateSelection( parent );
            }
        }
    }

    eventBus.publish( "gwt.SwitchPanelLocationEvent", locationData );

};

export default exports = {
    changePanelLocation
};
app.factory( 'splitPanelService', () => exports );
