// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Interfaces graph node service
 *
 * @module js/Ase1IntefacesGraphNodeService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import interfacesGraphLegendManager from 'js/Ase1InterfacesGraphLegendManager';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import templateService from 'js/Ase1InterfacesGraphTemplateService';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';

var exports = {};

/**
 * Process node data
 *
 * @param {Object} nodes - nodes to add in graph
 * @param {Object} isSystemOfInterest - if node to added is system of interest
 * @param {Object} activeLegendView - Active Legend View
 */
export let processNodeData = function( nodes, isSystemOfInterest, activeLegendView ) {
    var graphContext = appCtxSvc.getCtx( "graph" );
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    var graphModel = graphContext.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
    }

    _.forEach( nodes, function( nodeData ) {
        var nodeObject = nodeData.nodeObject;

        if( !graphModel.nodeMap[ nodeObject.uid ] && interfacesCtx.nodeMap[ nodeObject.uid ] ) {
            var labelText = interfacesCtx.nodeMap[ nodeObject.uid ].nodeLabel;
            var template = null;
            var nodeRect = null;
            var bindData = [];
            var nodeCategory = interfacesGraphLegendManager.getCategoryType( "Node", activeLegendView );
            var nodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory,
                activeLegendView );

            template = templateService.getNodeTemplate( graphModel.nodeTemplates, isSystemOfInterest );

            if( !template ) {
                logger.error( "Failed to get SVG template for node object. Skip drawing the node. Object UID: " +
                    nodeObject.uid );
                return;
            }

            bindData = templateService.getBindProperties( nodeObject, labelText );

            if( bindData ) {
                bindData[ 'node_fill_color' ] = "rgb(121,121,121)";
            }

            //get node style from graph legend
            if( nodeStyle ) {
                bindData[ 'bar_fill_color' ] = nodeStyle.color;
            }
            if( isSystemOfInterest ) {
                nodeRect = {
                    width: 132,
                    height: 132
                };
            } else {
                nodeRect = {
                    width: 300,
                    height: 32
                };
            }

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }

            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );

            node.modelObject = nodeObject;
            node.category = "Node";

            //build node map to help create edges
            graphModel.nodeMap[ nodeObject.uid ] = node;

            var labelConfiguration;

            //simulate application's root node
            if( isSystemOfInterest ) {

                labelConfiguration = {
                    hasBorder: true,
                    orientation: "BOTTOM",
                    margin: [ 3, 2, 2, 2 ],
                    maxWidth: 300,
                    contentStyleClass: 'aw-widgets-cellListCellTitle',
                    backgroundStyleClass: 'aw-systemmodeler-circleNodeLabelBackground',
                    textAlignment: 'MIDDLE',
                    allowWrapping: true
                };
                node.setMinNodeSize( [ 132, 132 ] );
            } else {
                labelConfiguration = {
                    margin: [ 3, 10, 2, 2 ],
                    maxWidth: 300,
                    sizeBinding: true,
                    contentStyleClass: 'aw-widgets-cellListCellTitle',
                    allowWrapping: true
                };
                node.setMinNodeSize( [ 180, 32 ] );
            }
            graph.setLabel( node, labelText, labelConfiguration );
        }
    } );
};

export default exports = {
    processNodeData
};
app.factory( 'Ase1IntefacesGraphNodeService', () => exports );
