// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * This service helps create the graph data to be displayed and also saves it.
 *
 * @module js/workinstrGraphService
 */
import * as app from 'app';

var exports = {};
/**
 * map where the object is key and graphNode is value
 */
var nodesMap = new Object();

/**
 * an array of graph nodes
 */
var myGraphNodes = [];

/**
 * an array of graph edges
 */
var myGraphEdges = [];

/**
 * the emtpy node rectangle style
 */
var EMPTY_NODE_RECT_STYLE = {};

/**
 * bindable graph properties that are being used in the graph html template
 */
export let bindableProperties = {
    NODE_ID_PROP: 'node_id',
    IMAGE_PROP: 'thumbnailURL',
    NODE_TITLE_PROP: 'node_title',
    NODE_PROPERTY_PROP: 'node_property',
    NODE_SECOND_PROPERTY_PROP: 'node_second_property',
    NODE_STROKE_WIDTH_PROP: 'node_stroke_width',
    NODE_ICON_WIDTH: 'node_icon_width',
    NODE_ICON_HEIGHT: 'node_icon_height',
    NODE_ICON_TRANSFORM: 'node_icon_transform'
};

/**
 * The draw graph method which creates nodes and edges
 *
 * @param {Object} graphModel the graph model object
 * @param {ObjectArray} nodesArray the nodes list to be added to the graph
 * @param {ObjectArray} edgesArray the edges list to be added to the graph
 */
export let drawGraph = function( graphModel, nodesArray, edgesArray ) {
    if( !graphModel.graphControl && graphModel.graphControl === null ) {
        return;
    }

    var graphControl = graphModel.graphControl;

    var graph = graphControl.graph;

    resetGraphData( graph );

    // Create all nodes in the graph
    var nodesLen = nodesArray.length;
    for( var nodeIndx = 0; nodeIndx < nodesLen; nodeIndx++ ) {
        var nodeObject = nodesArray[ nodeIndx ];
        var graphNode = graph.createNodeWithBoundsStyleAndTag( EMPTY_NODE_RECT_STYLE, null, nodeObject.bindData );
        myGraphNodes.push( graphNode );
        nodesMap[ nodeObject.nodeObject ] = graphNode;
    }

    // Create all edges in the graph
    var edgesLen = edgesArray.length;
    for( var edgeIndx = 0; edgeIndx < edgesLen; edgeIndx++ ) {
        var sourceObject = edgesArray[ edgeIndx ].source;
        var targetObject = edgesArray[ edgeIndx ].target;

        var graphEdge = graph.createEdgeWithNodesStyleAndTag( findNodeRepresentingGivenObject( sourceObject ),
            findNodeRepresentingGivenObject( targetObject ), null, null );
        myGraphEdges.push( graphEdge );
    }

    graphControl.layout.applyLayout();
    graphControl.fitGraph();
};

/**
 * This method applies the layout of the given graph located in the graphModel
 *
 * @param {Object} graphModel - the graph model
 * @param {String} layoutType - snake, hierarchy, balloon and etc.
 * @param {String} layoutDirection - from LeftToRight, TopToBottom and etc
 */
export let applyLayout = function( graphModel, layoutType, layoutDirection ) {
    var graphControl = graphModel.graphControl;
    if( layoutType ) {
        graphControl.layout.setLayoutType( layoutType );
    }
    if( layoutDirection ) {
        graphControl.layout.setLayoutDirection( layoutDirection );
    }
    graphControl.layout.applyLayout();
    graphControl.fitGraph();
};

/**
 * This method removes the current edges and replaces them with the new given edges
 *
 * @param {Object} graphModel - the graph model
 * @param {ObjectArray} listOfNewEdges - list of new edges to add to the graph model
 */
export let replaceOldEdgesWithNewEdges = function( graphModel, listOfNewEdges ) {
    var graph = graphModel.graphControl.graph;
    graph.removeEdges( myGraphEdges );
    myGraphEdges = [];
    var newEdgesLen = listOfNewEdges.length;
    for( var newEdgeIndx = 0; newEdgeIndx < newEdgesLen; newEdgeIndx++ ) {
        var sourceObject = listOfNewEdges[ newEdgeIndx ].source;
        var targetObject = listOfNewEdges[ newEdgeIndx ].target;

        var graphEdge = graph.createEdgeWithNodesStyleAndTag( findNodeRepresentingGivenObject( sourceObject ),
            findNodeRepresentingGivenObject( targetObject ), null, null );
        myGraphEdges.push( graphEdge );
    }
};

/**
 * Creates an edge in JSON format
 *
 * @param {Object} sourceObject - the edge source object
 * @param {Object} targetObject - the edge target object
 *
 * @return {Object} the created edge
 */
export let createEdgeJson = function( sourceObject, targetObject ) {
    if( sourceObject && targetObject ) {
        return {
            source: sourceObject,
            target: targetObject
        };
    }
    return null;
};

/**
 * This method creates a node in JSON format.
 *
 * @param {Object} object - the object represented by the node
 * @param {Object} bindableData - the bindable data that is saved based on the properties of the graph template html
 *
 * @return {Object} the created node
 */
export let createNodeJson = function( object, bindableData ) {
    if( object ) {
        return {
            nodeObject: object,
            bindData: bindableData
        };
    }
    return null;
};

/**
 * This method returns the data id of a given node. The data id value is binded when the node is created
 *
 * @param {Object} nodeItem - the given graph node item
 *
 * @return {String} the node uid
 */
export let getDataUidFromGivenNode = function( nodeItem ) {
    if( nodeItem ) {
        return nodeItem.getProperty( exports.bindableProperties.NODE_ID_PROP );
    }
    return null;
};

/**
 * Find node by the given object
 *
 * @param {Object} object - a given object
 *
 * @return {Object} the node which represents the object
 */
var findNodeRepresentingGivenObject = function( object ) {
    return nodesMap[ object ];
};

/**
 * Resets the graph data given the graph object
 *
 * @param {Object} graphObject - the graph object
 */
var resetGraphData = function( graphObject ) {
    if( myGraphNodes.length > 1 ) {
        graphObject.clear();
    }
    myGraphNodes = [];
    myGraphEdges = [];
    nodesMap = new Object();
};

/**
 * @member workinstrOverviewService
 */

export default exports = {
    bindableProperties,
    drawGraph,
    applyLayout,
    replaceOldEdgesWithNewEdges,
    createEdgeJson,
    createNodeJson,
    getDataUidFromGivenNode
};
app.factory( 'workinstrGraphService', () => exports );
