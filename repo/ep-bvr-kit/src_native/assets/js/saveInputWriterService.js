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
 * @module js/saveInputWriterService
 */

import _ from 'lodash';
import epReloadService from 'js/epReloadService';
import SaveInput from 'js/saveInputService';

'use strict';

/**
 * @param { Object } saveInput save input
 * @returns { Object } saveInput
 */
function convertToSaveInput( saveInput ) {
    return {
        saveInput: {
            sections: _.values( saveInput.sections ),
            relatedObjects: saveInput.relatedObjects
        }
    };
}

/**
 * @param { Object } saveInputObject save input object
 * @returns { Object } saveInput
 */
export function getSaveInput( saveInputObject ) {
    if( epReloadService.hasReloadInputs() ) {
        let reloadInputJSON = epReloadService.getReloadInputJSON();
        saveInputObject.addReloadSection( reloadInputJSON );
    }
    return convertToSaveInput( saveInputObject );
}

/**
 * returns new SaveInput instance
 * @returns {Object} SaveInput
 */
export function get() {
    return new SaveInput();
}

/**
 * @param { Object } sectionName save section name
 */
export function resetDataEntrySection( sectionName ) {
    if( SaveInput.sections && SaveInput.sections[ sectionName ].dataEntries ) {
        SaveInput.sections[ sectionName ].dataEntries = [];
    }
}

export default {
    getSaveInput,
    get,
    resetDataEntrySection
};
