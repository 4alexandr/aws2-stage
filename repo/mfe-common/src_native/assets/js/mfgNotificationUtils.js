// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Utilities to show notification (confirmation) messages
 *
 * @module js/mfgNotificationUtils
 */
'use strict';

import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';

let deferred;

/**
 * Display confirmation message
 * @param {String} message the message text
 * @param {String} confirmButtonName the text to display for the confirm button
 * @param {String} cancelButtonName the text to display for the cancel button
 * @returns {Promise} promise
 */
export function displayConfirmationMessage( message, confirmButtonName, cancelButtonName ) {
    deferred = AwPromiseService.instance.defer();
    let buttonArray = [];

    buttonArray.push( createButton( cancelButtonName, function( $noty ) {
        $noty.close();
        deferred.reject();
        deferred = null;
    } ) );

    buttonArray.push( createButton( confirmButtonName, function( $noty ) {
        $noty.close();
        deferred.resolve();
        deferred = null;
    } ) );

    messagingService.showWarning( message, buttonArray );
    return deferred.promise;
}

/**
 * Create button for use in notification messages
 *
 * @param {String} label label
 * @param {Function} callback callback
 * @return {Object} button
 */
export function createButton( label, callback ) {
    return {
        addClass: 'btn btn-notify',
        text: label,
        onClick: callback
    };
}

export default {
    displayConfirmationMessage,
    createButton
};
