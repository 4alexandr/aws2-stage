// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global atob, define
 */

/**
 * This module is an NX Utility module. NX Specific Javascript will be injected from here.
 *
 * @module js/hostedNxUtils
 *
 * @namespace hostedNxUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import hostQueryService from 'js/hosting/hostQueryService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';

// eslint-disable-next-line valid-jsdoc

var exports = {};

/**
 *
 */
export let initializeNX = function() {
    exports.injectNxCSS();
    exports.subscribeInteropQueryEvent();
    exports.addDatasetTypesToAppContext();
};

/**
 *
 */
export let injectNxCSS = function() {
    var baseUrlPath = app.getBaseUrlPath();
    var link = document.createElement( 'link' );
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = baseUrlPath + '/css/nx_hosted.css';
    $( 'head' ).append( link );
};

/**
 *
 */
export let subscribeInteropQueryEvent = function() {
    eventBus.subscribe( 'appCtx.update', function( eventData ) {
        if( eventData.name === 'visibleServerCommands' ) {
            exports.updateCommandVisibilityContext( eventData );
        }
    } );
};

/**
 *
 */
export let addDatasetTypesToAppContext = function() {
    var foreignDatasetTypes = [ 'UGMASTER', 'UGPART', 'UGALTREP', 'UGSCENARIO', 'NXSimulation', 'NXMotion',
        'CAESolution', 'CAEMesh', 'CAEGeom', 'UGCAMPTP', 'UGCAMCLSF'
    ];

    var prefNames = [ 'TC_NX_Foreign_Datasets' ];

    preferenceSvc.getStringValues( prefNames ).then( function( values ) {
        if( values ) {
            for( var i = 0; i < values.length; i++ ) {
                var result = values[ i ];

                if( result !== null && result.length > 0 ) {
                    var DELIMS = '"';
                    var DATASET_TYPE = 'DatasetType';

                    var tokens = result.split( DELIMS );

                    for( var ii = 0; ii < tokens.length; ii++ ) {
                        var currToken = tokens[ ii ].trim();

                        if( ( function( str, searchString, position ) {
                                return str.substr( position, searchString.length ) === searchString;
                            } )( currToken, DATASET_TYPE, 0 ) ) {
                            if( ii < tokens.length - 1 ) {
                                var dataTypeVal = tokens[ ++ii ].trim();
                                foreignDatasetTypes.push( dataTypeVal );
                                break;
                            }
                        }
                    }
                }
            }
        }
    } );
    appCtxService.registerCtx( 'nxDatasetDelegateTypes', foreignDatasetTypes );
};

/**
 *
 */
export let updateCommandVisibilityContext = function() {
    // We will call the service here and update the context here. Right now it is a Sync service, but it
    // would be agood IDea to move to Async ASAP.

    var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

    var commandIdList = hostingConfig.nxCommandsList;

    for( var i = 0; i < commandIdList.length; i++ ) {
        var commandId = commandIdList[ i ];

        var ctxToUpdate = 'nxVisiblity_' + commandId;

        if( hostInteropSvc.isRemoteHostingEnabled() ) {
            hostQueryService.isQueryAvailableForCommandAsync( commandId ).then( function( canHostHandleQuery ) {
                var isCommandSupported = false;

                if( canHostHandleQuery ) {
                    var selectedObjects = appCtxService.getCtx( 'mselected' );

                    isCommandSupported = hostQueryService.areAnyObjectsSupported( commandId, selectedObjects );
                }

                appCtxService.updateCtx( ctxToUpdate, isCommandSupported );
            } );
        } else {
            var isCommandSupported = false;

            var canHostHandleQuery = hostQueryService.isQueryAvailableForCommand( commandId );

            if( canHostHandleQuery ) {
                var selectedObjects = appCtxService.getCtx( 'mselected' );

                isCommandSupported = hostQueryService.areAnyObjectsSupported( commandId, selectedObjects );
            }

            appCtxService.updateCtx( ctxToUpdate, isCommandSupported );
        }
    }
};

export default exports = {
    initializeNX,
    injectNxCSS,
    subscribeInteropQueryEvent,
    addDatasetTypesToAppContext,
    updateCommandVisibilityContext
};
/**
 * @member hostedNxUtils
 * @memberof NgServices
 */
app.factory( 'hostedNxUtils', () => exports );
