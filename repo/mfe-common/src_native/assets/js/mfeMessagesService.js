// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for mfe messages
 *
 * @module js/mfeMessagesService
 */
import _ from 'lodash';
import messagingService from 'js/messagingService';

'use strict';

/**
 * Evaluate each message with its parameters
 *
 * @param {Object} messagesData - All the messages data
 *
 * @return {Object} messages text after applying passed parameters
 */
export function applyMessagesParams( messagesData ) {
    const messagesToParseList = _.filter( messagesData, msg => msg.textParams );
    messagesToParseList.forEach( (msg) => { msg.text = msg.text.format( msg.textParams ); } );

    return messagesData;
}

/**
 * Set the loading parameter indicator
 *
 * @param {Boolean} isLoading
 */
export function setLoadingIndicator( isLoading ) {
    return isLoading;
}


let exports;
export default exports = {
    applyMessagesParams,
    setLoadingIndicator
};
