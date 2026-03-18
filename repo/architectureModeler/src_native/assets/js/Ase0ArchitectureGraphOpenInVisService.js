// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Service to provide Architecture graph content for Opening in Vis
 *
 * @module js/Ase0ArchitectureGraphOpenInVisService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import occmgmtUtils from 'js/occmgmtUtils';
import AwPromiseService from 'js/awPromiseService';
import openInVisProductContextInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _architectureGraphUnloadedEventListener;

/**
 * Get Product Launch Info to be used by Open In Vis action
 * If nothing is selected in Architecture Tab, all visible objects in Architecture
 * are returned.
 * If one or more nodes are selected in Architecture Tab, only selected objects in Architecture
 * are returned.
 *
 * @return {Array} Product Context and Occurreneces
 */
var getOpenInVisLaunchInfo = function() {
    var deferred = AwPromiseService.instance.defer();
    var productOccMap = {};
    var productOccArray = [];

    var graphCtx = appCtxSvc.getCtx( "graph" );
    if( graphCtx && graphCtx.graphModel && graphCtx.graphModel.graphControl ) {
        var graphControl = graphCtx.graphModel.graphControl;
        var nodes = graphControl.getSelected( "Node" );
        if( !nodes || nodes.length < 1 ) {
            nodes = graphControl.graph.getVisibleNodes();
        }

        _.forEach( nodes, function( nodeItem ) {
            var productContextUid = occmgmtUtils.getProductContextForProvidedObject( nodeItem.modelObject );
            if( !productOccMap[ productContextUid ] ) {
                productOccMap[ productContextUid ] = [];
            }
            productOccMap[ productContextUid ].push( nodeItem.modelObject );
        } );

        _.forOwn( productOccMap, function( value, key ) {
            var productContextObj = cdm.getObject( key );
            if( productContextObj ) {
                var productOccObj = {
                    "productContextInfo": productContextObj,
                    "selections": value
                };
                productOccArray.push( productOccObj );
            }
        } );
    }
    deferred.resolve( productOccArray );
    return deferred.promise;
};

/**
 * Unregister context on Architecture Graph view unload.
 */
function handleArchitectureGraphUnloaded() {
    eventBus.unsubscribe( _architectureGraphUnloadedEventListener );
    _architectureGraphUnloadedEventListener = null;
    openInVisProductContextInfoProvider.resetProductContextInfo();
}

/**
 * Unregister context on Architecture view load.
 */
export let handleArchitectureGraphLoad = function() {
    openInVisProductContextInfoProvider.registerProductContextToLaunchVis( getOpenInVisLaunchInfo );

    if( !_architectureGraphUnloadedEventListener ) {
        _architectureGraphUnloadedEventListener = eventBus.subscribe( 'Ase0ArchitectureGraph.contentUnloaded', function() {
            handleArchitectureGraphUnloaded();
        }, 'Ase0ArchitectureGraphOpenInVisService' );
    }
};

export default exports = {
    handleArchitectureGraphLoad
};
app.factory( 'Ase0ArchitectureGraphOpenInVisService', () => exports );
