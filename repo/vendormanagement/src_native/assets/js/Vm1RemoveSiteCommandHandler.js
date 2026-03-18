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
 * @module js/Vm1RemoveSiteCommandHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};
var _assignSite = null;

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
        _assignSite = vmo;
        eventBus.publish( 'Vm1RemoveSiteCommand.removeVm1Site' );
    }
};

/**
 * Remove Site .Called when clicked on the remove cell.
 * @param {data} data - The qualified data of the viewModel
 */
export let removeVm1Site = function( data ) {
    removeAssignedSite( data, _assignSite );
    appCtxSvc.registerCtx( 'siteReferenceValue', '' );
};

/**
 * Method to remove assigned site from tile
 * @param {data} data - The qualified data of the viewModel
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
function removeAssignedSite( data, vmo ) {
    var removeSupplierUid = [];
    removeSupplierUid.push( vmo.uid );
    var memberModelObjects = data.dataProviders.vm1SiteRef.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeSupplierUid ) === -1;
    } );
    data.dataProviders.vm1SiteRef.update( modelObjects );
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

export default exports = {
    execute,
    removeVm1Site,
    setCommandContext
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 * @returns {Object} exports
 */
app.factory( 'Vm1RemoveSiteCommandHandler', () => exports );
