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
 * Ase0ArchitectureGraphAlignmentService
 *
 * @module js/Ase0ArchitectureGraphAlignmentService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * Change Alignment
 * @param {eventData} eventData - The qualified event data
 */
export let changeAlignment = function( eventData ) {
    var alignSide = eventData.userAction;
    var graphModel = appCtxService.ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var nodes = graphControl.getSelected( "Node" );
    var edges = graphControl.getSelected( "Edge" );
    var ports = graphControl.getSelected( "Port" );
    var itemsToAlignment = [].concat( nodes, edges, ports );
    if( itemsToAlignment.length > 0 ) {
        graphControl.alignment.quickAlignment( itemsToAlignment, alignSide, "BOUNDING_BOX" );
    }
};

export default exports = {
    changeAlignment
};
/**
 * Register Alignment service
 *
 * @memberof NgServices
 * @member Ase0ArchitectureGraphAlignmentService
 * @param {Object} appCtxService appCtxService
 * @return {Object} service exports exports
 */
app.factory( 'Ase0ArchitectureGraphAlignmentService', () => exports );
