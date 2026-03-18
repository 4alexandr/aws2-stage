// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This implements the graph overlay handler for Architecture tab
 *
 * @module js/Ase0ArchitectureGraphOverlayHandler
 */
import * as app from 'app';

var exports = {};

export let setOverlayNode = function( graphModel, node, pointOnPage ) {
    if( graphModel && graphModel.graphControl ) {
        var nodeSize = {
            width: 312,
            height: 120
        };
        var nodeStyle = node.style;
        var nodeData = node.getAppObj();
        if( node.appData.isGroup ) {
            nodeSize.height = node.getAppObj().HEADER_HEIGHT;
        }
        graphModel.graphControl.setCustomOverlayNode( node, nodeStyle, nodeSize, nodeData, pointOnPage );
    }
};

export default exports = {
    setOverlayNode
};
/**
 * Define graph overlay handler
 *
 * @memberof NgServices
 * @member Ase0ArchitectureGraphOverlayHandler
 * @return {Object} service exports exports
 */
app.factory( 'Ase0ArchitectureGraphOverlayHandler', () => exports );
