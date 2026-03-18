// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 document
 */

/**
 * service for toggling the labels
 *
 * @module js/commandLabelToggleService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import prefSvc from 'soa/preferenceService';

var exports = {};

var SHOW_COMMAND_LABEL_PREF = 'AW_show_command_labels';
var toggleLabelCtx = 'toggleLabel';
var toggleLabelClass = 'aw-commands-showIconLabel';

/**
 * Execute the command.
 */
export let toggle = function( newState, updatePref ) {
    var newStates = [];
    newStates.push( newState.toString() );

    if( newState ) {
        appCtxSvc.registerCtx( toggleLabelCtx, newState );
        document.body.classList.add( toggleLabelClass );
    } else {
        appCtxSvc.updateCtx( toggleLabelCtx, newState );
        document.body.classList.remove( toggleLabelClass );
    }

    if( updatePref ) {
        prefSvc.setStringValue( SHOW_COMMAND_LABEL_PREF, newStates );
    }
};
/**
 * Execute the command.
 */
export let execute = function() {
    if( appCtxSvc.getCtx( toggleLabelCtx ) ) {
        exports.toggle( false, true );
    } else {
        exports.toggle( true, true );
    }
};

/*eslint-disable-next-line valid-jsdoc*/
/**
 * This command is visible for all the object types
 *
 * @member commandLabelToggleService
 */

export default exports = {
    toggle,
    execute
};
app.factory( 'commandLabelToggleService', () => exports );
