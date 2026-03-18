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
 * This is the command handler for "Edit Group Effectivity" cell command
 *
 * @module js/editGroupEffectivityCommandHandler
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';

var exports = {};

/**
 * Set command context for "Edit Group Effectivity" cell command
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = isEditPermittedForGroupEffectivity( context );
    if( $scope.cellCommandVisiblilty ) {
        setCommandTitle( $scope );
    }
};

var getViewModel = function( scope, setInScope ) {
    return viewModelService.getViewModel( scope, true );
};

/**
 * @param {Object} scope - scope
 */
function setCommandTitle( scope ) {
    var declViewModel = getViewModel( scope, true );
    scope.command.title = declViewModel.i18n.edit;
}

/**
 * @param {Object} type - type
 * @returns {boolean} is edit permitted for given type of object?
 */
function isEditPermittedForGroupEffectivity( context ) {
    var isEditPermitted = false;
    if( context.props.is_modifiable.dbValues[ 0 ] ) {
        isEditPermitted = true;
    }
    return isEditPermitted;
}

/**
 * Execute the command.
 */
export let execute = function( vmo, $scope ) {
    var declViewModel = getViewModel( $scope, true );
    declViewModel.selectedCell = $scope.vmo;
    var context = {
        destPanelId: 'EditGroupEffectivity',
        title: declViewModel.i18n.editGroupEffTitle,
        recreatePanel: true,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * "Edit Group Effectivity" cell command handler factory
 *
 * @member editGroupEffectivityCommandHandler
 */

export default exports = {
    setCommandContext,
    execute
};
app.factory( 'editGroupEffectivityCommandHandler', () => exports );

/**
 */
