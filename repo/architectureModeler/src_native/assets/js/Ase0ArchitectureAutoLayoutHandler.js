//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 *AutoLayout command handler
 *
 * @module js/Ase0ArchitectureAutoLayoutHandler
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * Disable auto layout
 */
export let disableAutoLayout = function() {
    //Need to return autoLayoutState to avoid execution of enable and disable auto layout in one flow
    var autoLayoutState = appCtxService.ctx.architectureCtx.diagram.isAutoLayoutOn;
    var graphModel = appCtxService.ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var alignPreferences = graphControl.alignment.preferences;
    var graph = graphControl.graph;
    var layout = graphControl.layout;
    if( layout ) {
        layout.deactivate();
        graph.update( function() {
            //Enable auto alignment on auto layout OFF
            alignPreferences.enabled = true;
        } );
        appCtxService.ctx.architectureCtx.diagram.isAutoLayoutOn = false;
    }
    return autoLayoutState;
};
/*
 * Enable auto layout
 */
export let enableAutoLayout = function() {
    var graphControl = appCtxService.ctx.graph.graphModel.graphControl;
    var gridPreferences = graphControl.grid.preferences;
    var alignPreferences = graphControl.alignment.preferences;
    var graph = graphControl.graph;
    var diagram = appCtxService.ctx.architectureCtx.diagram;
    var layout = graphControl.layout;
    if( layout ) {
        layout.activate();
        diagram.Ase0SnapToGrid = false;
        graph.update( function() {
            //Disable auto alignment and snapping on auto layout ON
            gridPreferences.enableSnapping = false;
            alignPreferences.enabled = false;
        } );
        appCtxService.ctx.architectureCtx.diagram.isAutoLayoutOn = true;
    }
};

export default exports = {
    disableAutoLayout,
    enableAutoLayout
};
app.factory( 'Ase0ArchitectureAutoLayoutHandler', () => exports );
