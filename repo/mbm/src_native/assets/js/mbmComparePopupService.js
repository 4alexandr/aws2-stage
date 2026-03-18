// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
import mbmCompareUtils from 'js/mbmCompareUtils';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import dataMgmtService from 'soa/dataManagementService';
import occmgmtBackingObjectProviderSvc from 'js/occmgmtBackingObjectProviderService';
import soaService from 'soa/kernel/soaService';
import { constants as mbmConstants } from 'js/mbmConstants';
import inputHelper from 'js/epLoadInputHelper';

/**
 * @module js/mbmComparePopupService
 */

 /**
  * Get the popup title
  * @param {Object} viewModelObject  view model object
  * @param {String} title   title
  * @return {String} title
  */
export let getComparePopupTitle = function( viewModelObject, title ) {
    return title + ' | ' + viewModelObject.props.awb0Archetype.uiValues[0];
 };

 /**
  * Evaluate propagation of given view model objects
  * @param {Object} viewModelObjects array of view model object
  * @param {String} contextKey contex of view
  * @param {Boolean} isPullPropagate Flag to indicate pull or push changes
  * @returns {Object} object
  */
export let evaluatePropagateChanges = function( viewModelObjects, contextKey, isPullPropagate ) {
    let evalObject = {
        objectsToPropagate:[]
    };
    _.forEach( viewModelObjects, function( vmo ) {
        let status = mbmCompareUtils.getStatus( contextKey, vmo.uid );

        if ( !evalObject.hasOverAssigned && status === 6 ) {
            evalObject.hasOverAssigned = true;
        }
        if ( isPullPropagate ) {
            let equidUids = mbmCompareUtils.findDifferencesFor( contextKey, vmo.uid  );
            evalObject.objectsToPropagate = _.union( evalObject.objectsToPropagate, equidUids );
        }
    } );

    return evalObject;
};

/**
 * Load comparasion details for given view model object
 * @param {*} viewModelObject viewModelObject
 * @param {*} contextKey view key
 * @returns {Promise} promise of modified property details
 */
export let loadComparationDetails = function( viewModelObject, contextKey ) {
    let uid = viewModelObject.uid;
    let equivUid = mbmCompareUtils.findDifferencesFor( contextKey, uid  )[0];
   return  dataMgmtService.loadObjects( [ equivUid ] ).then( function() {
        let objsToConvert = [ viewModelObject ];
        objsToConvert.push( cdm.getObject( equivUid ) );

        return occmgmtBackingObjectProviderSvc.getBackingObjects( objsToConvert ).then( function( response ) {
            let targetObjects =  [ response[0] ];
            let sourceObjects = [ response[1] ];

            return loadPropertyNames().then( function( propNames ) {
               return loadModifiedPropertiesFor( sourceObjects, targetObjects, propNames ).then( function( modifiedProperties ) {
                    return loadModifiedPropertiesDetailsFor( sourceObjects[0].uid, targetObjects[0].uid, modifiedProperties );
               } );
            } );
        } );
    } );
 };
/**
 * Load properties name
 * @returns{Promise} promise object
 */
let loadPropertyNames = function() {
     let inputTypeLoad = inputHelper.getLoadTypeInputs( [ mbmConstants.MBM_ACC_SETTINGS ] );
     let input = inputHelper.getLoadInputJSON( inputTypeLoad );
    return  soaService.post( 'Internal-MfgBvrCore-2015-03-DataManagement', 'loadObjectData3', input ).then( function( response ) {
        let additionalPropertiesMap2 = getAdditionalPropsMap( response );
        return additionalPropertiesMap2 ? additionalPropertiesMap2.propNames : [];
    } );
};
/**
 * Get modified properties of given source trget and properties
 * @param {Array} sourceObjects source objects
 * @param {Array} targetObjects target objects
 * @param {Array} propNames properties name
 * @returns{Promise} promise object
 */
let loadModifiedPropertiesFor = function( sourceObjects, targetObjects, propNames ) {
    let soaInput = getPropertyComparisonDetailsSoaInput( sourceObjects,  targetObjects, propNames );
    return soaService.post( 'StructureManagement-2012-02-StructureVerification', 'getPropertyComparisonDetails', soaInput ).then( function( response2 ) {
        let modifiedProps = [];
        if ( response2.details && response2.details.length > 0 ) {
            _.forEach( response2.details[0].details, function( details ) {
                if ( details.isDifferent ) {
                    modifiedProps.push( details.propertyName );
                }
            } );
        }
        return modifiedProps;
    } );
  };

/**
 * Load properties details of given source and target
 * @param {String} sourceUid uid of source object
 * @param {String} targetUid uid of target object
 * @param {Array} modifiedProperties arrays of modifiedvproperties
 * @returns {Promise} promise object
 */
let loadModifiedPropertiesDetailsFor = function( sourceUid, targetUid, modifiedProperties ) {
    let inputTypeLoad = inputHelper.getLoadTypeInputs( [ mbmConstants.MBM_BOMLINE_PROPERTIES ], null, modifiedProperties );

    inputTypeLoad[0].sourceObject = sourceUid;
    inputTypeLoad[0].targetObject = targetUid;
    let input = inputHelper.getLoadInputJSON( inputTypeLoad );

    return soaService.post( 'Internal-MfgBvrCore-2015-03-DataManagement', 'loadObjectData3', input ).then( function( response ) {
        let additionalPropertiesMap2 = getAdditionalPropsMap( response );
        if ( additionalPropertiesMap2 ) {
            let propsInfo = additionalPropertiesMap2.propNames;
            let sourceInfo = additionalPropertiesMap2[sourceUid];
            let targetInfo = additionalPropertiesMap2[targetUid];
            let compareInfoSummary = {
                propertyInfo:[],
                occPropertyInfo:[]
            };
            _.forEach( propsInfo, function( propInfo, index ) {
                let values = propInfo.split( '##' );
                let info = {
                    propertyName:values[0],
                    propertyDisplayName:values[1],
                    propertyCurrentValue:sourceInfo[index],
                    propertyOldValue:targetInfo[index]
                };

                if ( values[2] === 'REV_PROP' ) {
                    compareInfoSummary.propertyInfo.push( info );
                }else if ( values[2] === 'OCC_PROP' ) {
                    compareInfoSummary.occPropertyInfo.push( info );
                }
            } );
            return compareInfoSummary;
        }
    } );
};

/**
 * Get prop map infor from given response
 * @param {Object} response response of loadObjectData3 soa
 * @return {Object} prop map
 */
let getAdditionalPropsMap = function( response ) {
    return response.relatedObjectsMap && response.relatedObjectsMap.Mfg0properties ? response.relatedObjectsMap.Mfg0properties.additionalPropertiesMap2 : null;
};

/**
 *
 * @param {Array} sourceObjects array of source
 * @param {Array} targetObjects array of target
 * @param {Array} propNames array of property name
 *
 * @returns {Object} object
 */
let getPropertyComparisonDetailsSoaInput = function( sourceObjects, targetObjects, propNames ) {
    return {
        equivalentObjects:[
            {
                eqvSrcLines:sourceObjects,
                eqvTargetLines:targetObjects,
                criteria:
                {
                    Mfg0properties:
                    {
                        strMap:
                        {
                            propNames : propNames
                        }
                    }
                }
            }
        ]
    };
};

 export default  {
    getComparePopupTitle,
    evaluatePropagateChanges,
    loadComparationDetails
 };
