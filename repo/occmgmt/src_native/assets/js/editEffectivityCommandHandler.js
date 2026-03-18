// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the command handler for "Edit Effectivity" cell command
 *
 * @module js/editEffectivityCommandHandler
 */
import app from 'app';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';

var exports = {};


var getViewModel = function( scope, setInScope ) {
    return viewModelService.getViewModel( scope, true );
};


/**
 * Execute the command.
 */
export let execute = function( vmo, $scope ) {

    var declViewModel = getViewModel( $scope, true );
    declViewModel.selectedCell = vmo;

    var context = {
        destPanelId: 'EditEffectivities',
        title: declViewModel.i18n.edit,
        recreatePanel: true,
        supportGoBack: true
    };

    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * "Edit Effectivity" cell command handler factory
 *
 * @member editEffectivityCommandHandler
 */

export default exports = {
    execute
};
app.factory( 'editEffectivityCommandHandler', () => exports );

/**
 */
