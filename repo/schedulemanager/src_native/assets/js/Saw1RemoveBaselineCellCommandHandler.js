// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Saw1RemoveBaselineCellCommandHandler
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};
var _assignBaselines = null;

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {
    if( vmo && vmo.uid ) {
        _assignBaselines = vmo;
        eventBus.publish( 'Saw1RemoveBaselineCommand.removeBaseline' );
    }
};

/**
 * Remove User .Called when clicked on the remove cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let removeBaseline = function( data ) {
    data.saw1viewBtn = true;
    removeFromViewingBaseline( data, _assignBaselines );
    var updateAvailableList = data.dataProviders.getBaselines.viewModelCollection.loadedVMObjects;
    updateAvailableList.push( _assignBaselines );
    data.dataProviders.getBaselines.update( updateAvailableList );
    data.visibleSaveBtn = true;
};

/**
 * Method to remove Users from available section of panel
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
function removeFromViewingBaseline( data, vmo ) {
    var removeBaselineUid = [];
    removeBaselineUid.push( vmo.uid );
    var memberModelObjects = data.dataProviders.selectedBaseline.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeBaselineUid ) === -1;
    } );
    data.dataProviders.selectedBaseline.update( modelObjects );
}

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

exports = {
    execute,
    removeBaseline,
    setCommandContext
};

export default exports;

/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1RemoveBaselineCellCommandHandler', () => exports );
