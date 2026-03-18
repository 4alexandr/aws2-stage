// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/EVM1endItemConfigurationService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import 'lodash';

import eventBus from 'js/eventBus';

var exports = {};

/**
 * Update Config End Items
 * @param {Object} newItemSelected the selected item
 */
export let updateConfigEndItems = function( newItemSelected, eventData ) {
    if( newItemSelected ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

        if( recipeCtx ) {
            recipeCtx.builderConfigValues.endItems[ 0 ] = newItemSelected;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            var recipeCtx = {
                builderConfigValues : {
                    endItems : [ newItemSelected ]
                }
            };
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
    }

    eventBus.publish( 'configPanel.evm1endItemChanged', eventData );
};

var clearDataProvider = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getPreferredUnitEffectivities ) {
        data.dataProviders.getPreferredUnitEffectivities.viewModelCollection.clear();
        data.dataProviders.getPreferredUnitEffectivities.selectedObjects = [];
    }
};

export let clearEndItemConfigurationData = function( data ) {
    if( data ) {
        clearDataProvider( data );
        eventBus.publish( 'configPanel.revealEndItems' );
    }
};

export default exports = {
    updateConfigEndItems,
    clearEndItemConfigurationData
};
app.factory( 'EVM1endItemConfigurationService', () => exports );
