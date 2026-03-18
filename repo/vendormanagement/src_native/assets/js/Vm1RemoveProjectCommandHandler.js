// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Vm1RemoveProjectCommandHandler
 */
import app from 'app';
import Vm1CreateVendorSvc from 'js/Vm1CreateVendorService';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

var _selectedProject = null;

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
        _selectedProject = vmo;
        Vm1CreateVendorSvc.removeProjectFromData( vmo );
        eventBus.publish( 'Vm1RemoveProjectCommand.remove' );
    }
};

/**
 * Remove Project from create vendor panel .Called when clicked on the remove cell.
 * @param {data} data - The qualified data of the viewModel
 */
export let removeVendorProject = function( data ) {
    var removeProjectUid = [];
    removeProjectUid.push( _selectedProject.uid );
    var memberModelObjects = data.dataProviders.getProjectsList.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeProjectUid ) === -1;
    } );
    data.dataProviders.getProjectsList.update( modelObjects );
};

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

export default exports = {
    execute,
    removeVendorProject,
    setCommandContext
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 * @returns {Object} exports
 */
app.factory( 'Vm1RemoveProjectCommandHandler', () => exports );
