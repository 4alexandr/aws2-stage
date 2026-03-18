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
 * @module js/Saw1AddBaselineCellCommandHandler
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};
var _assignBaseline = null;

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
        _assignBaseline = vmo;

        eventBus.publish( 'Saw1BaselineCommand.addBaseline' );
    }
};

/**
 * Add Baseline .Called when clicked on the add cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let addBaseline = function( data ) {
    data.saw1viewBtn = true;
    var updateBaselineList = data.dataProviders.selectedBaseline.viewModelCollection.loadedVMObjects;
    if( updateBaselineList.length === 1 ) {
        throw 'assignmentsViewBaselineErrorMsg';
    } else {
        removeFromAvailableBaseline( data, _assignBaseline );

        updateBaselineList.push( _assignBaseline );

        data.dataProviders.selectedBaseline.update( updateBaselineList );
    }
    data.visibleSaveBtn = true;
};

/**
 * Method to remove  Baseline from available section of panel
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
function removeFromAvailableBaseline( data, vmo ) {
    var assignedBaselineUid = [];
    assignedBaselineUid.push( vmo.uid );
    var availModelObjects = data.dataProviders.getBaselines.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( availModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, assignedBaselineUid ) === -1;
    } );

    data.dataProviders.getBaselines.update( modelObjects );
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
    addBaseline,
    setCommandContext
};

export default exports;
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1AddBaselineCellCommandHandler', () => exports );
