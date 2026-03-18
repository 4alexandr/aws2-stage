// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This service helps delete the graph data to be displayed and also saves it.
 *
 * @module js/epPertEditService
 */
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import _ from 'lodash';
import { constants as epSaveConstants } from 'js/epSaveConstants';
import eventBus from 'js/eventBus';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import epPertGraphRenderSevice from 'js/epPertGraphRenderService';
import epViewModelObjectSvc from 'js/epViewModelObjectService';
import graphModelService from 'js/graphModelService';

'use strict';

/**
 * Create PERT data for the recently created Process Area objects.
 *
 * @param {Object} eventData - Event data
 * @param {Object} graphModel - graphModel
 *
 */
export function createPertDataForObjects( eventData, graphModel ) {
    const contextModelObj = appCtxService.getCtx( 'ep.scopeObject' );
    //Load the PlantBOP on creation of only the first child node.
    if ( contextModelObj && contextModelObj.props && contextModelObj.props[epBvrConstants.MFG_SUB_ELEMENTS].dbValues.length === 0 ) {
        const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( 'ProcessArea', appCtxService.ctx.state.params.uid );
        epLoadService.loadObject( loadTypeInputs, true ).then( function() {
            createPublishPertData( eventData, graphModel );
        } );
    } else {
        createPublishPertData( eventData, graphModel );
    }
}

/**
 * Create and publish PERT data.
 * @param {*} eventData - Event data
 * @param {*} graphModel - graphModel
 */
function createPublishPertData( eventData, graphModel ) {
    let objectUids = [];
    _.forEach( eventData.saveEvents, function( event ) {
        if ( event.eventType === 'create' ) {
            objectUids.push( event.eventObjectUid );
        }
    } );
    if ( objectUids && objectUids.length > 0 ) {
        const pertData = {
            nodes: [],
            edges: [],
            ports: []
        };
        //create a relevant nodes
        const modelObjsCreated = _.map( objectUids, ( uid ) => epViewModelObjectSvc.createAndAddEpVmos( cdm.getObject( uid ) ) );
        pertData.nodes = modelObjsCreated;
        eventBus.publish( graphModel.graphDataProvider.name + '.graphDataLoaded', { graphData: pertData } );
    }
}

/**
 * Select the PERT node representing newly created Process Area object.
 *
 * @param {Object} data - Event map data
 * @param {Object} graphModel - the graph model
 */
export function selectRecentPertNode( data, graphModel ) {
    let nodes = _.uniq( data.nodes );

    if ( nodes.length === 1 ) {
        //Clear the node selection. 
        //We use graphModel.graphControl.setSelected() twice for selecting nodes because first we need to 
        //clear the graph selection and then we have to set the selection in graphModel. This causes the sync
        //action to call twice and Summary view breaks due to this as it checks if data is updated or not.
        //Hence to avoid this, we are caliing graphModel.graphControl._diagramView.setSelected() first to
        //clear the selection so that it does not fire selection event twice. This is a workaround.
        graphModel.graphControl._diagramView.setSelected( null );
        //Select the recently created node
        graphModel.graphControl.setSelected( nodes, true, null );
    }
}

export function removeNodes( deleteEventData, graphModel, tabContext ) {
    // check for the eventData and remove only those nodes which got deleted from server .
    let nodesToDelete = [];
    const graph = getGraph( graphModel );

    let selectedPertNodes = graphModel.graphControl.getSelected( 'Node' );
    if ( deleteEventData && deleteEventData.length > 0 ) {
        selectedPertNodes.forEach( node => {
            nodesToDelete = nodesToDelete.concat( selectedPertNodes.filter( d => deleteEventData.includes( _.get( d, 'model.nodeObject.uid' ) ) ) );
        } );
    }
    graph.removeNodes( nodesToDelete, true );
    setPertNodesSelection( graphModel, tabContext );
    if ( doesImplicitFlowExist( nodesToDelete, graphModel ) ) {
        eventBus.publish( 'awGraph.initialized' );
    } else {
        resetLayout( graphModel );
    }
}

/**
 * Check if the deleted node causes any implicit flow to be created
 * @param {Array} nodesToDelete nodesToDelete
 * @param {Object} graphModel graphModel
 * @returns {Boolean} true if implicit flow exists, false otherwise
 */
function doesImplicitFlowExist( nodesToDelete, graphModel ) {
    let hasPredecessor = false;
    let hasSuccessor = false;

    //check if it has a predecessor and successor so that implicit flow is created and we need to reload the Pert graph
    nodesToDelete.some( node => {
        if( node.model.nodeObject.props.Mfg0predecessors ) {
            hasPredecessor =  node.model.nodeObject.props.Mfg0predecessors.dbValues.length > 0;
        }

        //check if it has a successor
        for ( const obj in graphModel.dataModel.nodeModels ) {
            if( graphModel.dataModel.nodeModels[obj].nodeObject.props.Mfg0predecessors ) {
            hasSuccessor = graphModel.dataModel.nodeModels[obj].nodeObject.props.Mfg0predecessors.dbValues.includes( node.model.nodeObject.uid );
            if ( hasPredecessor && hasSuccessor ) {
                return hasPredecessor && hasSuccessor;
            }
        }
        }
    } );
    return hasPredecessor && hasSuccessor;
}


/**
 * This function sets selected nodes in ctx
 * @param {Object} graphModel graphModel
 */
export function setPertNodesSelection( graphModel, tabContext ) {
    let selectedPertNodes = graphModel.graphControl.getSelected( 'Node' );
    let selectedPertEdges = graphModel.graphControl.getSelected( 'Edge' );
    let nodeObjectIds = [];
    if ( selectedPertNodes && selectedPertNodes.length > 0 ) {
        selectedPertNodes.forEach( node => {
            nodeObjectIds.push( node.model.nodeObject );
        } );
    }
    tabContext.selection = nodeObjectIds;
    tabContext.edgeSelections = selectedPertEdges;
    tabContext.graphModel = graphModel;
    return nodeObjectIds;
}

/**
 * get graph from graphModel
 * @param {*} graphModel - graphModel
 * @return{*} graph - graph
 */
function getGraph( graphModel ) {
    return graphModel.graphControl.graph;
}

/**
 * Create Edge
 * @param {*} predModelObj - Predecessor Model Object
 * @param {*} succModelObject - Sucessor Model Object
 * @param {*} operationType - Operaion Type
 * @param {*} graphModel - graphModel
 */
function edgeOperations( predModelObj, succModelObject, operationType, graphModel, saveInputWriter ) {
    let relatedObjects = [];

    let edgeObject = {};
    if ( operationType === 'Add' ) {
        edgeObject.objectId = succModelObject.uid;
        edgeObject.predecessorId = predModelObj.uid;
        saveInputWriter.addPredecessor( edgeObject );
    } else {
        edgeObject.fromId = predModelObj.uid;
        edgeObject.toId = succModelObject.uid;
        saveInputWriter.deleteFlow( edgeObject );
    }
    relatedObjects.push( succModelObject );
    relatedObjects.push( predModelObj );
    saveInputWriter.addRelatedObjects( relatedObjects );
    return saveInputWriter;
}

/**
 * Function to be called to tell if the edge was permitted to create from this source
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} source - the source whether the edge can be created from
 * @return {boolean} flag whether the edge can be reconnected
 */
export function canCreateEdgeFrom( graphModel, source ) {
    if ( !source || !graphModel ) {
        return false;
    }
    if ( !_.isEmpty( source.getItemType() ) && ( source.getItemType() === 'Port' || source.getItemType() === 'Node' ) ) {
        return true;
    }
}

/**
 * Function to be called to tell if the edge was permitted to create from this source
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} target - the target whether the edge can be created to
 * @return {boolean} flag whether the edge can be reconnected
 */
export function canCreateEdgeTo( graphModel, target ) {
    if ( !target || !graphModel ) {
        return false;
    }
    if ( !_.isEmpty( target.getItemType() ) && ( target.getItemType() === 'Port' || target.getItemType() === 'Node' ) ) {
        return true;
    }
}

/**
 * This function checks whether the edge lready exists between given nodes
 * @param {*} graphModel 
 * @param {*} previewEdge 
 */
export function doesEdgeAlreadyExistBetweenNodes( edges, firstNodeUid, secondNodeUid ) {
    let edgeExists = false;
    for ( const edge in edges ) {
        if ( edges[edge].edgeObject.puid === firstNodeUid && edges[edge].edgeObject.suid === secondNodeUid ||
            edges[edge].edgeObject.suid === firstNodeUid && edges[edge].edgeObject.puid === secondNodeUid ) {
            edgeExists = true;
        }
    }
    return edgeExists;
}

/**
 * Function to create edge.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} previewEdge - the preview edge.
 */
export function createEdge( graphModel, previewEdge ) {
    let saveInputWriter = saveInputWriterService.get();
    edgeOperations( previewEdge.getSourceNode().model.modelObject,
        previewEdge.getTargetNode().model.modelObject, 'Add', graphModel, saveInputWriter );
    epSaveService.saveChanges( saveInputWriter, true ).then( function( response ) {
        if ( !response.saveResults ) {
            graphModel.graphControl.graph.removeEdges( [ previewEdge ] );
        }
        const loadedMOs = response.saveResults.map( obj => response.ServiceData.modelObjects[obj.saveResultObject.uid] );
        updateGraphModelWithLoadedModelObjects( graphModel, loadedMOs );
        updateGraphModelWithCreatedEdge( graphModel, previewEdge );
        resetLayout( graphModel );
    } );
}

/**
 * graphModel needs to updated when any modelObject for an object present in datamodel is changed
 * @param {*} graphModel 
 * @param {*} loadedMOs 
 */
function updateGraphModelWithLoadedModelObjects( graphModel, loadedMOs ) {
    loadedMOs.forEach( modelObj => {
        const vmo = epViewModelObjectSvc.createAndAddEpVmos( modelObj );
        let vindicators = graphModel.dataModel.nodeModels[ modelObj.uid ].nodeObject.indicators;
        vmo.indicators = vindicators;
        const nodeModel = new graphModelService.NodeModel( vmo.uid, vmo );
        const graphItem = graphModel.dataModel.nodeModels[vmo.uid].graphItem;
        graphModel.addNodeModel( graphItem, nodeModel );
    } );
}

/**
 * Update graphModel with newly created edge
 * @param {*} graphModel graphModel
 * @param {*} previewEdge previewEdge
 */
function updateGraphModelWithCreatedEdge( graphModel, previewEdge ) {
    const sourceNodeModel = previewEdge.getSourceNode();
    const targetNodeModel = previewEdge.getTargetNode();
    const edgeObject = {
            id: `edge_id${Math.random().toString()}`,
            puid: sourceNodeModel.model.id,
            suid: targetNodeModel.model.id,
            props: {}
    };
    const edgeModel = new graphModelService.EdgeModel( edgeObject.id, edgeObject, edgeObject.category, sourceNodeModel.model, targetNodeModel.model, edgeObject.edgeLabelText );
    graphModel.addEdgeModel( previewEdge, edgeModel );
}

/**
 * Removes the given edge from layout data model
 *
 * @param selectedEdges connection/edge reference to be removed from layout data model
 * @param graphModel graph model
 * @param tabContext context
 */
export function removeEdge( selectedEdges, graphModel, tabContext ) {
    const graph = getGraph( graphModel );
    let saveInputWriter = saveInputWriterService.get();
    if ( selectedEdges && selectedEdges.length > 0 ) {
        selectedEdges.forEach( edge => {
            edgeOperations( edge.getSourceNode().model.modelObject,
                edge.getTargetNode().model.modelObject, 'Remove', graphModel, saveInputWriter );
        } );
    }

    epSaveService.saveChanges( saveInputWriter, true ).then( function() {
        let layout = graphModel.graphControl.layout;
        graph.removeEdges( selectedEdges );
        resetLayout( graphModel );
        // TODO applyLayout again on server response layout.addEdge( previewEdge, true );
    } );

    setPertNodesSelection( graphModel, tabContext );
}

/**
 * Reset the PERT nodes to default layout.
 * @param {Object} graphModel - graphModel
 */
export function resetLayout( graphModel ) {
    const graphControl = graphModel.graphControl;
    graphControl.layout.applyLayout();
    graphControl.layout.activate();
    graphControl.fitGraph();
}

/**
 * Move graph items and update layout
 * @param {Array} items - moved graph items
 * @param {*} graphModel - graphModel
 */
export function moveGraphItems( items, graphModel ) {
    if ( items.length > 0 ) {
        const movedNodes = items.filter( ( item ) => item.getItemType() === 'Node' );
        const layout = graphModel.graphControl.layout;
        moveElements( movedNodes, layout );
    }
}

/**
 * Move elements with incremental / sorted layout update
 * @param {*} movedNodes - movedNodes
 * @param {*} layout - layout
 */
function moveElements( movedNodes, layout ) {
    if ( layout !== undefined && layout.isActive() && !_.isEmpty( movedNodes ) ) {
        layout.applyUpdate( () => {
            movedNodes.forEach( ( node ) => {
                layout.moveNode( node );
            } );
        } );
    }
}

/**
 * This method updates node bindData when save edit is performed in summary tab
 * @param {Array} modelObjects - modelObjects 
 * @param {Object} graphModel - graphModel
 */
export function updateNodeBindData( modelObjects, graphModel ) {
    if( modelObjects ) {
        modelObjects.forEach( obj => {
            if( obj.uid in graphModel.dataModel.nodeModels ) {
                let vmo = obj;
                /*
                SaveData of any kind will send the modelObjects to the pert. 
                This method will get the epVmo and update the graphModel
                */
                if( !obj.indicators ) {
                    vmo = epViewModelObjectSvc.createAndAddEpVmos( obj );
                    let vindicators = graphModel.dataModel.nodeModels[ obj.uid ].nodeObject.indicators;
                    vmo.indicators = vindicators;
                }
                const nodeModel = {
                    modelObject: vmo
                };
                const bindData = epPertGraphRenderSevice.getNodeBindData( graphModel, nodeModel );
                graphModel.graphControl.graph.updateNodeBinding( graphModel.dataModel.nodeModels[ obj.uid ].graphItem, bindData );
                graphModel.dataModel.nodeModels[vmo.uid].modelObject = vmo;
                graphModel.dataModel.nodeModels[vmo.uid].nodeObject = vmo;
            }
        } );
    }
}

/**
 * This method remove the nodes after sync in graph data model.
 * @param {Object} graphModel - graphModel
 */
export function removeNodesAfterSync( graphModel ) {
    let nodesToDeleteUids = [];
    const graph = getGraph( graphModel );
    const contextModelObj = appCtxService.getCtx( 'ep.scopeObject' );
    let actualSubElements = contextModelObj.props.Mfg0sub_elements.dbValues;
    let nodeModalElemets = [];
    for( const node in graphModel.dataModel.nodeModels ) {
        nodeModalElemets.push( node );
    }
    if( actualSubElements.length !== nodeModalElemets.length ) {
        nodesToDeleteUids = nodeModalElemets.filter( x => !actualSubElements.includes( x ) );
        let nodesToDelete = [];
        nodesToDeleteUids.forEach( ( nodeToDelete ) => {
            nodesToDelete.push( graphModel.dataModel.nodeModels[nodeToDelete].graphItem );
        } );
        graph.removeNodes( nodesToDelete, true );
    }
}

let exports = {};
export default exports = {
    createPertDataForObjects,
    selectRecentPertNode,
    removeNodes,
    setPertNodesSelection,
    canCreateEdgeFrom,
    canCreateEdgeTo,
    createEdge,
    removeEdge,
    resetLayout,
    moveGraphItems,
    updateNodeBindData,
    doesEdgeAlreadyExistBetweenNodes,
    removeNodesAfterSync
};
