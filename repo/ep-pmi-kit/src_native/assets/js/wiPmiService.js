// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import epLoadSvc from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epPropCacheSvc from 'js/epObjectPropertyCacheService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import cdm from 'soa/kernel/clientDataModel';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import vmoSvc from 'js/viewModelObjectService';

const PMI_LOAD_TYPE = 'PMI_Info';

/**
 * WI PMI service
 *
 * @module js/wiPmiService
 */
'use strict';


/**
 *
 * @param {ViewModelObject[]} pmiVmos - an array of pmi ViewModelObjects
 * @param {string} connectedPartsDisplayName - display name for pmiConnectedParts
 */
export function extractConnectedParts( pmiVmos, connectedPartsDisplayName ) {
    if( pmiVmos ) {
        pmiVmos.forEach( ( pmi ) => {
            const connectedParts = epPropCacheSvc.getProperty( pmi.uid, 'connectedParts' ) || [];
            let displayValue = [];
            if( connectedParts ) {
                displayValue = connectedParts.map( ( uid ) => {
                    const modelObj = cdm.getObject( uid );
                    return modelObj.props.object_string.dbValues[ 0 ];
                } );
            }
            const connectedPartsProp = {
                value: connectedParts,
                displayValue,
                propType: 'OBJECTARRAY',
                isArray: true,
                labelPosition: 'PROPERTY_LABEL_AT_TOP',
                displayName: connectedPartsDisplayName
            };
            pmi.props.pmiConnectedParts = vmoSvc.constructViewModelProperty( connectedPartsProp, 'pmiConnectedParts', pmi, false );
        } );
    }
}
/**
 *
 * @param {modelObject[]} context - the context objects we need to load the pmi for
 * @param {object} viewModelData - the viewModel data
 * @param {Object} pmiPolicy - property policy
 * @return {promise} a promise object
 */
export function loadPmis( context, viewModelData, pmiPolicy ) {
    if( viewModelData && viewModelData.listOfPmis ) {
        viewModelData.listOfPmis = null;
    }
    if( context ) {
        propPolicySvc.register( pmiPolicy );
        const uid = context.uid;
        if( uid ) {
            const loadInputTypes = epLoadInputHelper.getLoadTypeInputs( [ PMI_LOAD_TYPE ], uid );
            return epLoadSvc.loadObject( loadInputTypes, false ).then(
                ( response ) => {
                    const pmiObjList = response.loadedObjectsMap;
                    const frmList = [];
                    if( pmiObjList && pmiObjList[ PMI_LOAD_TYPE ] ) {
                        pmiObjList[ PMI_LOAD_TYPE ].forEach( ( pmi ) => {
                            const forms = epPropCacheSvc.getProperty( pmi.uid, 'forms' );
                            if( forms ) {
                                const formObj = cdm.getObject( forms[ 0 ] );
                                if( formObj ) {
                                    const connectedParts = epPropCacheSvc.getProperty( pmi.uid, 'connectedParts' );
                                    epPropCacheSvc.addProperty( formObj.uid, 'connectedParts', connectedParts );
                                    frmList.push( formObj );
                                }
                            }
                        } );
                    }
                    return frmList;
                }
            );
        }
    }
    return new Promise( ( resolve ) => {
        resolve( null );
    } );
}

/**
 *
 * @param {modelObjects} modelObject - a given modelObject
 * @return {Object} an object which contains the context object to pass
 */
export function filterOnlyProcessOrOperation( modelObject ) {
    let context = null;
    if( mfeTypeUtils.isOfTypes( modelObject, [ epBvrConstants.MFG_BVR_PROCESS, epBvrConstants.MFG_BVR_OPERATION ] ) ) {
        context = modelObject;
    }
    return {
        context
    };
}

let exports = {};
export default exports = {
    loadPmis,
    extractConnectedParts,
    filterOnlyProcessOrOperation
};
