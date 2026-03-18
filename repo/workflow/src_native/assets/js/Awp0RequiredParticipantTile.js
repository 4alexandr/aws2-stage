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
 * @module js/Awp0RequiredParticipantTile
 */
import * as app from 'app';
import viewModelObjectService from 'js/viewModelObjectService';

var exports = {};

/**
 * Create the required view model object
 *
 * @param {Object} requiredValue - Required display string
 * @return {Object} View model object that need to be render as required view model object
 */
export let createRequiredParticipantData = function( requiredValue, data ) {
    if( !requiredValue ) {
        requiredValue = data.i18n.required;
    }
    var modelObject = viewModelObjectService.constructViewModelObjectFromModelObject( null, "" );
    modelObject.requiredDispValue = requiredValue;
    return modelObject;
};

/**
 * Refresh the required participant when particiapnt type matched
 *
 * @param {Object} data Qualified data object
 *
 */
export let refreshRequiredParticipant = function( data ) {

    if( data.eventData && data.requiredParticipant && data.eventData.requiredParticipants === data.requiredParticipant.particiapntType ) {
        data.requiredParticipant = null;
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member userPanelService
 */

export default exports = {
    createRequiredParticipantData,
    refreshRequiredParticipant
};
app.factory( 'Awp0RequiredParticipantTile', () => exports );
