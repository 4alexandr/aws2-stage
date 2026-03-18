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
 * @module js/Vm1RemoveContactCommandHandler
 */
import app from 'app';
import Vm1CreateVendorSvc from 'js/Vm1CreateVendorService';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

var _selectedContact = null;

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
        _selectedContact = vmo;
        Vm1CreateVendorSvc.removeContactFromData( vmo );
        eventBus.publish( 'Vm1RemoveContactCommand.remove' );
    }
};

/**
 * Remove Contact from create vendor panel .Called when clicked on the remove cell.
 * @param {data} data - The qualified data of the viewModel
 */
export let removeVendorContact = function( data ) {
    var removeContactUid = [];
    removeContactUid.push( _selectedContact.uid );
    var memberModelObjects = data.dataProviders.getVendorContactsList.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeContactUid ) === -1;
    } );
    data.dataProviders.getVendorContactsList.update( modelObjects );
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
    removeVendorContact,
    setCommandContext
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 * @returns {Object} exports
 */
app.factory( 'Vm1RemoveContactCommandHandler', () => exports );
