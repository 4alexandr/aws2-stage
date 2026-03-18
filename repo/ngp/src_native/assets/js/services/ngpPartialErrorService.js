// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import soaSvc from 'soa/kernel/soaService';
import msgSvc from 'js/messagingService';

/**
 * The ngp page load service
 *
 * @module js/services/ngpPartialErrorService
 */
'use strict';

const ignorableErrors = [ {
        description: 'clone process, user cannot modify model views palette',
        errorNum: 160104,
        printError: true
    },
    {
        description: 'clone no subset in process',
        errorNum: 160076,
        printError: false
    },
    {
        description: 'clone PE error 1',
        errorNum: 160079,
        printError: false
    },
    {
        description: 'clone PE error 2',
        errorNum: 160080,
        printError: false
    },
    {
        description: 'clone PE error 3',
        errorNum: 160081,
        printError: false
    },
    {
        description: 'clone PE error 4',
        errorNum: 160082,
        printError: false
    },
    {
        description: 'clone no subset in activity',
        errorNum: 160086,
        printError: false
    }

];

/**
 *
 * @param {object} soaResponse - ther serviceData object from the soa response
 */
function displaySoaErrorMessages( soaResponse ) {
    let error;
    if( soaResponse.ServiceData && ( soaResponse.ServiceData.partialErrors || soaResponse.ServiceData.PartialErrors ) ) {
        error = soaSvc.createError( soaResponse.ServiceData );
    } else {
        error = soaSvc.createError( soaResponse );
    }

    const errMessage = msgSvc.getSOAErrorMessage( error );
    msgSvc.showError( errMessage );
}

/**
 *
 * @param {string} errorNum - the error number
 * @return {object} an object in the ingorableErrors array
 */
function getEquivalentIgnorableErrorObject( errorNum ) {
    //use filter
    for( let i = 0; i < ignorableErrors.length; i++ ) {
        if( ignorableErrors[ i ].errorNum === errorNum ) {
            return ignorableErrors[ i ];
        }
    }
}

/**
 *
 * @param {object[]} partialErrors - an array of objects which represent a partial error
 * @return {object[]} partial errors which aren't ignorable
 */
function splitErrorsToCategories( partialErrors ) {
    const partialErrorNumbers = [];
    partialErrors.forEach( ( error ) => {
        error.errorValues.forEach( ( errorValue ) => {
            partialErrorNumbers.push( errorValue.code );
        } );
    } );

    const ignore = [];
    const ignoreButDisplay = [];
    const notToIgnore = [];
    partialErrorNumbers.forEach( ( errorNum ) => {
        const ignorableErrorObj = getEquivalentIgnorableErrorObject( errorNum );
        if( ignorableErrorObj ) {
            if( ignorableErrorObj.printError ) {
                ignoreButDisplay.push( errorNum );
            } else {
                ignore.push( errorNum );
            }
        } else {
            notToIgnore.push( errorNum );
        }
    } );
    return {
        ignore,
        ignoreButDisplay,
        notToIgnore
    };
}

/**
 *
 * @param {object} soaResponse - the soa response
 * @return {object} an object which contains 3 arrays of errors: ignore, ignoreButDisplay, notToIgnore
 */
export function handlePartialErrors( soaResponse ) {
    let categorizedErrors = {
        ignore: [],
        ignoreButDisplay: [],
        notToIgnore: []
    };

    if ( soaResponse.ServiceData ) {
        if ( soaResponse.ServiceData.partialErrors ) {
            categorizedErrors = splitErrorsToCategories( soaResponse.ServiceData.partialErrors );
        } else if ( soaResponse.ServiceData.PartialErrors ) {
            categorizedErrors = splitErrorsToCategories( soaResponse.ServiceData.PartialErrors );
        }
    } else if ( soaResponse.partialErrors ) {
        categorizedErrors = splitErrorsToCategories( soaResponse.partialErrors );
    } else if ( soaResponse.PartialErrors ) {
        categorizedErrors = splitErrorsToCategories( soaResponse.PartialErrors );
    }
    if ( categorizedErrors.ignoreButDisplay.length > 0 || categorizedErrors.notToIgnore.length > 0 ) {
        //extract out error to ignore?
        displaySoaErrorMessages( soaResponse );
    }

    return categorizedErrors;
}

let exports;
export default exports = {
    handlePartialErrors
};
