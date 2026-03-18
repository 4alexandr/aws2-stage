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
 * Ase0ArchitectureSetUnsetAnchorService command handler
 *
 * @module js/Ase0ArchitectureSetUnsetAnchorService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import utilSvc from 'js/Ase0ArchitectureUtilService';
import _ from 'lodash';
import graphUtils from 'js/graphUtils';
import eventBus from 'js/eventBus';

var exports = {};

/*
 * Set anchor nodes
 */
export let setAnchorNodes = function( nodeModels ) {
    _.forEach( nodeModels, function( selectedNode ) {
        var nodeUid = selectedNode.uid;
        var nodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ nodeUid ];
        nodeItem.isRoot( true );
        //To keep root node list updated with current changes, add node to root node list
        var rootNodeList = appCtxService.ctx.graph.graphModel.rootNodeList;
        if( rootNodeList.indexOf( nodeUid ) < 0 ) {
            rootNodeList.push( nodeUid );
        }
        nodeItem.getSVG().bindNewValues( "isRoot" );
    } );
};

/*
 * Set anchor nodes
 */
export let setAnchor = function() {
    var selectedNodes = appCtxService.ctx.architectureCtx.diagram.selection.nodeModels;
    //Need to maintain return anchor state to avoid execution of setAnchor and unsetAnchor in one flow
    var returnAnchorState = appCtxService.ctx.architectureCtx.diagram.anchorState;
    if( !appCtxService.ctx.architectureCtx.diagram.anchorState ) {
        exports.setAnchorNodes( selectedNodes );
        appCtxService.ctx.architectureCtx.diagram.anchorState = true;
    }
    return returnAnchorState;
};

/*
 * Unset anchor nodes
 */
export let unsetAnchorNodes = function( nodeModels ) {
    var elementsToRemove = [];
    _.forEach( nodeModels, function( selectedNode ) {
        var nodeUid = selectedNode.uid;
        var nodeItem = appCtxService.ctx.graph.graphModel.nodeMap[ nodeUid ];
        nodeItem.isRoot( false );
        //To keep root node list updated with current changes, remove node from root node list
        var rootNodeList = appCtxService.ctx.graph.graphModel.rootNodeList;
        var index = rootNodeList.indexOf( nodeUid );
        if( index > -1 ) {
            rootNodeList.splice( index, 1 );
        }

        nodeItem.getSVG().bindNewValues( "isRoot" );
        var unconnectedItems = [];
        if( rootNodeList.length === 0 ) {
            unconnectedItems = appCtxService.ctx.graph.graphModel.graphControl.graph.getVisibleNodes();
        } else {
            unconnectedItems = utilSvc.getUnconnectedItems( appCtxService.ctx.graph.graphModel );
        }
        var elementsToRemove = getModelObjects( unconnectedItems );
        if( elementsToRemove.length > 0 ) {
            var eventData = {
                elementsToRemove: elementsToRemove
            };
            eventBus.publish( "AM.toggleOffEvent", eventData );
        }
    } );
    return elementsToRemove;
};

/*
 * Unset anchor nodes
 */
export let unsetAnchor = function() {
    if( appCtxService.ctx.architectureCtx.diagram.anchorState ) {
        var selectedNodes = appCtxService.ctx.architectureCtx.diagram.selection.nodeModels;
        exports.unsetAnchorNodes( selectedNodes );
        appCtxService.ctx.architectureCtx.diagram.anchorState = false;
    }
};

var getModelObjects = function( nodeItems ) {
    var removeElements = [];
    _.forEach( nodeItems, function( item ) {
        removeElements.push( item.modelObject );
    } );
    return removeElements;
};

export default exports = {
    setAnchorNodes,
    setAnchor,
    unsetAnchorNodes,
    unsetAnchor
};
/**
 * Register Ase0ArchitectureSetUnsetAnchorService
 *
 * @memberof NgServices
 * @member Ase0ArchitectureSetUnsetAnchorService
 * @param {Object} appCtxService appCtxService
 * @param {Object} utilSvc Ase0ArchitectureUtilService
 * @return {Object} service exports exports
 */
app.factory( 'Ase0ArchitectureSetUnsetAnchorService', () => exports );
