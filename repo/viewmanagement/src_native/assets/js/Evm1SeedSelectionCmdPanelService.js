// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Evm1SeedSelectionCmdPanelService
 */
import * as app from 'app';
import eventBus from 'js/eventBus';

var exports = {};

/** This method is used add the selected objects from the ADD command panel
 * @param {object} data the viewModel data of the command panel
 */
export let addSeedSelection = function( data ) {
    if( data && data.sourceObjects ) {
        var selectedObjects = [];
        data.sourceObjects.forEach( sourceObject => {
            if( sourceObject.type !== 'Fnd0SearchRecipe' ) {
                selectedObjects.push( sourceObject );
            }
        } );
        eventBus.publish( 'evm1SeedSelectionAdded', selectedObjects );
    }
};

export default exports = {
    addSeedSelection
};
app.factory( 'Evm1SeedSelectionCmdPanelService', () => exports );
