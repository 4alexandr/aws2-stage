// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/epSearchObjectWithRevRuleService
 */
import mfeSyncUtils from 'js/mfeSyncUtils';
'use strict';

/**
 * Process SOA Response and creates array of business objects returned by SOA
 * @param {Object} response SOA Response
 * @return {object} returns array of bussiness object
 */
export function processSoaResponseForBOTypes( response ) {
    let typeNames = [];
    if( response && response.output ) {
        {
            for( let ii = 0; ii < response.output.length; ii++ ) {
                let displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
                for( let jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                    let SearchFilter = {
                        searchFilterType: 'StringFilter',
                        stringValue: ''
                    };
                    SearchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                    typeNames.push( SearchFilter );
                }
            }
        }
    }

    return typeNames;
}

/**
 * sets subBusinessObjects on data if context has objectTypesToSearch.
 * @param {Object} data dwviewModel
 * @param {context} context context
 */
export function getSpecifiedObjectType( data, context ) {
    if( data.objectSearchBox.dbValue !== '' ) {
        if( context && context.objectTypesToSearch && context.objectTypesToSearch.length > 0 ) {
            var typeNames = [];
            for( let i = 0; i < context.objectTypesToSearch.length; i++ ) {
                let SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = context.objectTypesToSearch[ i ];
                typeNames.push( SearchFilter );
            }
            data.subBusinessObjects = typeNames;
        }
    }
}

/**
 * sets selectedObject on data 
 * @param {Object} data dwviewModel
 */
export function searchObjectSelectionChanged( data ,subPanelContext) {
    let selectedObject = data.dataProviders.epSearchObjectProvider.getSelectedObjects()[ 0 ] || null;
    if( data.selectedObject && !selectedObject ) {
        data.selectedObject.selected = true;
        data.dataProviders.epSearchObjectProvider.selectedObjects[ 0 ] = data.selectedObject;
    } else {
        data.selectedObject = selectedObject;
        data.dataProviders.epSearchObjectProvider.selectedObjects[ 0 ] = selectedObject;
    }
    mfeSyncUtils.setInputObject(subPanelContext,{selectedObjects:data.selectedObject});
}

export default {
    processSoaResponseForBOTypes,
    searchObjectSelectionChanged,
    getSpecifiedObjectType
};
