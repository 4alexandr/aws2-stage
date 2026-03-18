// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import app from 'app';
import ClipboardService from 'js/clipboardService';
import localeService from 'js/localeService';
import messagingSvc from 'js/messagingService';
import epTableService from 'js/epTableService';

/**
 * EP Cut Copy service
 *
 * @module js/epCutCopyService
 */
'use strict';

let isCutAction = false;

/**
 *
 * @param {ViewModelObject} objectsToCopy - objectsToCopy
 */
export function copy( objectsToCopy ) {
    removeExistingCutIndication();
    isCutAction = false;
    ClipboardService.instance.setContents( objectsToCopy );
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/epCopyMessages' );
    const addedToClipBoardMessage = getCopiedLocalizedMessage( resource, objectsToCopy );
    messagingSvc.showInfo( addedToClipBoardMessage );
}

/**
 * Get the message for given key from given resource file, replace the parameter and return the localized string
 *
 * @param {String} localTextBundle - The message bundles localized files
 * @param {String} objectsToDelete - The objects to delete
 * @returns {String} localizedValue - The localized message string
 */
function getCopiedLocalizedMessage( localTextBundle, objectsCopied ) {
    return objectsCopied && objectsCopied.length === 1 ? localTextBundle.copySingleSuccessful.format( objectsCopied[ 0 ].props.object_string.uiValues[ 0 ] ) :
        localTextBundle.copyMultipleSuccessful.format( objectsCopied.length );
}

/**
 *
 * @param {ViewModelObject} objectsToCut - objectsToCut
 */
export function cut( objectsToCut ) {
    isCutAction = true;
    removeExistingCutIndication();
    objectsToCut.forEach( treeNode => {
        epTableService.setIsOpaqueProperty( treeNode, true );
    });
    ClipboardService.instance.setContents( objectsToCut );
}

/**
 * Remove existing cut indication
 */
export function removeExistingCutIndication() {
    const  objects = ClipboardService.instance.getContents();
    objects.forEach( treeNode => {
        treeNode && treeNode.props && epTableService.setIsOpaqueProperty( treeNode, false );
    } );
}

/**
 * @returns {Boolean} isCutAction - Returns true if Objects are cut
 */
export function areObjectsCut() {
    return {
        isCutAction: isCutAction
    };
}

let exports = {};
export default exports = {
    copy,
    cut,
    removeExistingCutIndication,
    areObjectsCut
};
