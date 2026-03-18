// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/epReviseHelper
 */
import app from 'app';
import localeService from 'js/localeService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfgNotificationUtils from 'js/mfgNotificationUtils';

'use strict';

let resource = null;

export const displayConfirmationMessage = function( result ) {
    resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/EPServicesMessages' );
    return mfgNotificationUtils.displayConfirmationMessage( getErrorMessage( result ), resource.confirmButton, resource.cancelButton );
};

export const getErrorMessage = function( result ) {
    return resource.reviseMessage.format( getReleasedObjects( result ) );
};

export const getReleasedObjects = function( result ) {
    let modelObjects = result.ServiceData.modelObjects;

    let releasedObjectList = [];
    for( let index in result.saveResults ) {
        let modelObject = modelObjects[ result.saveResults[ index ].clientID ];
        if( modelObject ) {
            releasedObjectList.push( modelObject.props[ epBvrConstants.BL_REV_OBJECT_NAME ].uiValues[ 0 ] );
        }
    }

    return '<br>' + releasedObjectList.join( ',<br>' ) + '<br>';
};

export default {
    displayConfirmationMessage,
    getErrorMessage,
    getReleasedObjects
};
