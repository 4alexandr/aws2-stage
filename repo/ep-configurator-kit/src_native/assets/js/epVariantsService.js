// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for variants
 *
 * @module js/epVariantsService
 */
import epSaveService from 'js/epSaveService';
import { get } from 'js/saveInputWriterService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import _ from 'lodash';

'use strict';

/*
AW input:
{
    affectedObject: 'id1',
    userSelections: {
        family3: {
            [ {
                    optionValue: 'feature31',
                    selectionState: 3
                },
                {
                    optionValue: 'feature32',
                    selectionState: 1
                }
            ]
        }
    },
    familySelections: {
        family1: 1,
        family2: 2
    }
}

*/
/**
 * @param {Object} awSaveInput input from AW component
 * 
 * @returns {Object} get input for EP save SOA from AW input
 */
function getEpSaveInputFromAwSaveInput( awSaveInput ) {
    const inputArray = _.map( awSaveInput, inputObject => {
        const expression = {};
        _.forEach( inputObject.familySelections, ( selection, family ) => expression[ family ] = [ _.toString( selection ) ] );
        _.forEach( inputObject.userSelections, ( selection, family ) => {
            expression[ family ] = _.reduce( selection, ( result, optionSelection ) => {
                result.push( optionSelection.optionValue );
                result.push( _.toString( optionSelection.selectionState ) );
                return result;
            }, [] );
        } );

        return {
            uid: inputObject.affectedObject,
            expression
        };
    } );
    const saveInput = get();
    saveInput.addVariantFormula( inputArray );
    const relatedObjects = _.map( inputArray, inputObject => cdm.getObject( inputObject.uid ) );
    return { saveInput, relatedObjects };
}

/**
 * @param { Object } awSaveInput input from AW component
 * @returns {Object} ep save handler for variant formula
 */
export function saveVariantFormula( awSaveInput ) {
    const PROMISE_SERVICE = AwPromiseService.instance;
    const epSaveInput = getEpSaveInputFromAwSaveInput( awSaveInput );
    return epSaveService.saveChanges( epSaveInput.saveInput, true, epSaveInput.relatedObjects ).then( () => { PROMISE_SERVICE.resolve(); },
        () => { PROMISE_SERVICE.resolve(); } );
}

// eslint-disable-next-line no-unused-vars
let exports;
export default exports = {
    saveVariantFormula
};
