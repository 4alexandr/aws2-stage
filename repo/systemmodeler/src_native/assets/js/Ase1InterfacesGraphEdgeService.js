//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Interfaces graph edge service
 *
 * @module js/Ase1InterfacesGraphEdgeService
 */
import * as app from 'app';
import interfacesGraphLegendManager from 'js/Ase1InterfacesGraphLegendManager';
import _ from 'lodash';
import graphLegendSvc from 'js/graphLegendService';

var exports = {};

/**
 * Process edge data and create edges for them
 * @param {Object} graphModel - graph model
 * @param {Object} edges - edges to draw
 * @param {Object} activeLegendView - active legend view
 *
 * @return {Array} addedEdges
 */
export let processEdgeData = function( graphModel, edges, activeLegendView ) {
    var addedEdges = [];
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    graphModel.edgeMap = {};

    _.forEach( edges,
        function( edgeInformation ) {
            var edgeObject = null;
            if( edgeInformation.edgeObject ) {
                edgeObject = edgeInformation.edgeObject;
            }

            var sourceNode = null;
            var targetNode = null;

            if( graphModel.nodeMap ) {
                sourceNode = graphModel.nodeMap[ edgeInformation.end1Element.uid ];
                targetNode = graphModel.nodeMap[ edgeInformation.end2Element.uid ];
            }

            var edge;
            var edgeCategory = interfacesGraphLegendManager.getCategoryType( "Connectivity", activeLegendView );
            var edgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory,
                activeLegendView );

            if( sourceNode && targetNode ) {
                edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, edgeStyle,
                    null );
            }

            if( edge && edgeObject ) {
                edge.category = "Edge";
                edge.modelObject = edgeObject;
                graphModel.edgeMap[ edgeObject.uid ] = edge;

                // record all added edges
                addedEdges.push( edge );
            }
        } );
    return addedEdges;
};

export default exports = {
    processEdgeData
};
app.factory( 'Ase1InterfacesGraphEdgeService', () => exports );
