// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/epStartEditCommandService
 */
import appCtxService from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import epSaveConstants from 'js/epSaveConstants';

'use strict';

/**
 * execute the start edit command handler
 *
 * @param {String} handler context
 */
export function execute( handler, object ) {
    //check for autorevise
    let saveInputWriter = saveInputWriterService.get();
    if( object ) {
        saveInputWriter.addReviseInput( object );
        epSaveService.saveChanges( saveInputWriter, true, [ object ] )
            .then( function( result ) {
                // this is required to let save edit know which handler is active.
                if( !handler ) {
                    handler = 'NONE';
                }
                editHandlerService.setActiveEditHandlerContext( handler );
                if( !editHandlerService.isEditEnabled() ) {
                    var editHandler = editHandlerService.getEditHandler( handler );
                    if( !editHandler.editInProgress() ) {
                        editHandler.startEdit();
                    }
                }
            } );
    }
}
let exports = {};
export default exports = {
    execute
};
