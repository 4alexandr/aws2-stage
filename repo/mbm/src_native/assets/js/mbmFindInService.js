// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/mbmFindInService
 */
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import dataMgmtService from 'soa/dataManagementService';
import compUtils from 'js/mbmCompareUtils';

const packPropName = 'awb0IsPacked';
const quantityPropName = 'awb0Quantity';
/**
 * Get target info of given uid
 * @param {String} uid uid of which traget to find target line
 * @param {String} contextKey context of uid
 * @param {*} displayPropName  dispaly name property main property name in display name
 * @param {*} additionalPropNames  property name which will be comma separated displayable property in bracket in display name
 * @return {Promise} promise which will return array of object
 */
export function findEquivalentTargetInfo( uid, contextKey,  displayPropName,  additionalPropNames ) {
    let targetUids = compUtils.findDifferencesFor( contextKey, uid );
    let status  = compUtils.getStatus( contextKey, uid );
    let srcObj = cdm.getObject( uid );
    let isPacked = srcObj.props[packPropName].dbValues[0] !== '0';
    let parentUid = srcObj.props.awb0Parent.dbValues[0];
    while ( targetUids.length === 0 && parentUid ) {
        targetUids = compUtils.findDifferencesFor( contextKey, parentUid );
        srcObj = cdm.getObject( parentUid );
        parentUid = srcObj.props.awb0Parent.dbValues[0];
    }

    return getObjectsToFind( targetUids, displayPropName, isPacked, additionalPropNames ).then( function( objectsTofind ) {
        return {
            objectsTofind: objectsTofind,
            isPacked : isPacked,
            status: status
        };
    } );
}

/**
 *
 * @param {*} uids uids of object to load
 * @param {*} displayPropName  dispaly name property main property name in display name
 * @param {boolean}  showAdditionalProp if true show addtional properties in ()
 * @param {*} additionalPropNames  property name which will be comma separated displayable property in bracket in display name
 * @return {Promise} promise which will return array of object
 */
 export  function getObjectsToFind( uids, displayPropName, showAdditionalProp, additionalPropNames ) {
    return dataMgmtService.loadObjects( uids ).then( function() {
        let propNames = [ packPropName ];
        if ( additionalPropNames ) {
            propNames = [ ...additionalPropNames ];
        }

        if ( displayPropName &&  propNames.indexOf( displayPropName ) < 0  ) {
            propNames.push( displayPropName );
        }

        return dataMgmtService.getProperties( uids, propNames ).then( function() {
            let objsToFind = [];
            _.forEach( uids, function( uid ) {
                let obj = cdm.getObject( uid );
                let displayName = displayPropName ? obj.props[displayPropName].uiValues[0] : null;
                let packStatus = obj.props[packPropName].dbValues[0] !== '0';
                if ( displayName && showAdditionalProp && additionalPropNames ) {
                    let values = [];
                    _.forEach( additionalPropNames, function( propName ) {
                        let value = obj.props[propName].uiValues[0];
                        if ( propName === quantityPropName && _.isEmpty( value ) ) {
                            value = 1;
                        }
                        if ( value ) {
                            values.push( value );
                        }
                    } );
                    if ( values.length > 0 ) {
                        displayName = displayName + ' (' + _.toString( values ) + ')';
                    }
                }
                objsToFind.push( {
                    objectToFind: obj,
                    displayName:displayName,
                    isPacked:packStatus
                } );
            } );

            return objsToFind;
        } );
    } );
 }

export default  {
    getObjectsToFind,
    findEquivalentTargetInfo
};
