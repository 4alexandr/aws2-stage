//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * Ase0GridHandler command handler
 *
 * @module js/Ase0GridHandler
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * Toggle on off grid
 */
export let toggleGrid = function() {
    var diagram = appCtxService.ctx.architectureCtx.diagram;
    var graphModel = appCtxService.ctx.graph.graphModel;
    var preferences = graphModel.graphControl.grid.preferences;
    var graph = graphModel.graphControl.graph;
    //If major/minor lines not present on graph then toggle both ON else OFF
    if( !diagram.Ase0MajorLines && !diagram.Ase0MinorLines ) {
        graph.update( function() {
            preferences.enabled = true;
            preferences.showMajorLines = true;
            preferences.showMinorLines = true;
        } );
    } else {
        graph.update( function() {
            preferences.enabled = !preferences.enabled;
        } );
    }
    diagram.gridOptions = preferences.enabled;
    diagram.Ase0MajorLines = preferences.showMajorLines;
    diagram.Ase0MinorLines = preferences.showMinorLines;
    diagram.Ase0SnapToGrid = preferences.enableSnapping;
};
/*
 * Update Grid Setting @param {data} data - The qualified data of the viewModel
 */
export let applyGridSetting = function( data ) {
    var diagram = appCtxService.ctx.architectureCtx.diagram;
    var graphModel = appCtxService.ctx.graph.graphModel;
    var preferences = graphModel.graphControl.grid.preferences;
    if( preferences ) {
        var graph = graphModel.graphControl.graph;
        graph.update( function() {
            preferences.enabled = data.showGridData.dbValue;
            preferences.showMajorLines = data.majorLines.dbValue;
            preferences.showMinorLines = data.minorLines.dbValue;
            preferences.enableSnapping = data.snapToGridData.dbValue;
        } );
    }
    diagram.gridOptions = data.showGridData.dbValue;
    diagram.Ase0MajorLines = data.majorLines.dbValue;
    diagram.Ase0MinorLines = data.minorLines.dbValue;
    diagram.Ase0SnapToGrid = data.snapToGridData.dbValue;
};

export default exports = {
    toggleGrid,
    applyGridSetting
};
/**
 * Register Grid Handler service
 *
 * @memberof NgServices
 * @member Ase0GridHandler
 * @param {Object} appCtxService appCtxService
 * @return {Object} service exports exports
 */
app.factory( 'Ase0GridHandler', () => exports );
