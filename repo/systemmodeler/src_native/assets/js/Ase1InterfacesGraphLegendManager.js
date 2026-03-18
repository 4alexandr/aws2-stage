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
 * Interfaces tab legend manager
 *
 * @module js/Ase1InterfacesGraphLegendManager
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import $ from 'jquery';
import _ from 'lodash';

var exports = {};

var _legendData = null;

/**
 * Method to get the legend information
 *
 * @param {String} viewName - Interfaces tab view name
 *
 * @returns {Promise} Resolved when ...
 */
export let getLegendData = function( viewName ) {
    var deferred = AwPromiseService.instance.defer();

    if( _legendData ) {
        deferred.resolve();
        return deferred.promise;
    }

    var soaInput = {
        "viewName": viewName
    };
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceSysEng-2018-05-DiagramManagement', 'getDiagramLegend5', soaInput )
        .then( function( response ) {
            // Process SOA response
            if( response.legendTypesJSON ) {
                _legendData = JSON.parse( response.legendTypesJSON );
                if( _legendData.legendViews[ 0 ] ) {
                    var interfacesViewModeCtx = appCtxSvc.getCtx( "interfacesViewModeCtx" );
                    interfacesViewModeCtx.activeLegendView = _legendData.legendViews[ 0 ];
                    appCtxSvc.updateCtx( "interfacesViewModeCtx", interfacesViewModeCtx );
                }
            }

            deferred.resolve();

        }, function( error ) {
            deferred.reject( error );
        } );

    return deferred.promise;
};

export let getCategoryType = function( type, legendViews ) {
    var categoryType = '';
    if( legendViews && legendViews.categoryTypes && legendViews.categoryTypes.length > 0 ) {
        for( var i = 0; i < legendViews.categoryTypes.length; i++ ) {
            var categories = legendViews.categoryTypes[ i ];
            for( var j = 0; j < categories.categories.length; j++ ) {
                var typeName = categories.categories[ j ].internalName;
                if( typeName === type ) {
                    return typeName;
                }
            }
        }
    }
    return categoryType;
};

export default exports = {
    getLegendData,
    getCategoryType
};
app.factory( 'Ase1InterfacesGraphLegendManager', () => exports );
