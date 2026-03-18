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
 * This is a service for loading and saving data for PERT
 * 
 * @module js/epPertGraphDataProviderService
 */
'use strict';
import cdm from 'soa/kernel/clientDataModel';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import eventBus from 'js/eventBus';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import appCtxService from 'js/appCtxService';
import epViewModelObjectSvc from 'js/epViewModelObjectService';
import AwPromiseService from 'js/awPromiseService';

/**
 * Load PERT data to be passed to graphDataProvider
 * 
 * @param {Object} graphModel - graphModel
 * @param {Object} subPanelContext - subPanelContext
 */
export const loadPertData = function( graphModel, subPanelContext ) {
    const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( 'Pert', appCtxService.ctx.state.params.uid );
    const pertData = {
        nodes: [],
        edges: [],
        ports: []
    };
    epLoadService.loadObject( loadTypeInputs, true ).then( function() {
        updatePertDataProvider( graphModel, subPanelContext ).then( function( res ) {
            pertData.nodes = Object.assign( pertData.nodes, res );
            eventBus.publish( graphModel.graphDataProvider.name + '.graphDataLoaded', { graphData: pertData } );
        } );
    } );
    subPanelContext.graphModel = graphModel;
};

/**
 * Update PERT dataProvider to be passed to graphDataProvider
 * 
 * @param {Object} graphModel - graphModel
 * @param {Object} subPanelContext - subPanelContext
 */
export const updatePertDataProvider = function( graphModel, subPanelContext ) {
    const contextModelObj = appCtxService.getCtx( 'ep.scopeObject' );
    var instance = AwPromiseService.instance;
    var deferred = AwPromiseService.instance.defer();
    let promiseAll = [];

    //create all of the relevant nodes
    if( contextModelObj && contextModelObj.props && contextModelObj.props[ epBvrConstants.MFG_SUB_ELEMENTS ] ) {
        var graphNodeUids = contextModelObj.props[ epBvrConstants.MFG_SUB_ELEMENTS ].dbValues;
    }

    if( graphNodeUids ) {
        graphNodeUids.forEach( function( uid ) {
            var modelObj = cdm.getObject( uid );
            let promise = epViewModelObjectSvc.createViewModelObjectFromModelObject( modelObj );
            promiseAll.push( promise );
        } );
    }

    return instance.all( promiseAll );
};

/**
 * Update node binding data of node on hover for showing Open command
 * @param {Object} hoveredItem - hoveredItem
 * @param {Object} unHoveredItem - unHoveredItem
 * @param {Object} graphModel - graphModel
 */
export const showOpenCommandOnHover = function( hoveredItem, unHoveredItem, graphModel ) {
    if( hoveredItem && hoveredItem.getItemType() === 'Node' ) {
        const bindData = {
            isNodeHovered: true
        };
        graphModel.graphControl.graph.updateNodeBinding( hoveredItem, bindData );
    }
    if( unHoveredItem && unHoveredItem.getItemType() === 'Node' ) {
        const bindData = {
            isNodeHovered: false
        };
        graphModel.graphControl.graph.updateNodeBinding( unHoveredItem, bindData );
    }
};

// eslint-disable-next-line no-unused-vars
let exports = {};
export default exports = {
    loadPertData,
    showOpenCommandOnHover,
    updatePertDataProvider
};
