// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/openWPService
 */
import * as app from 'app';
import dataMgmtService from 'soa/dataManagementService';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';

/**
 * Evaluate the workpackage to verify compatibility to MBM alignment page
 * @param {Object} modelObject MECollaborationContext
 * @return {Object} promise
 */
export let evaluateToOpenWorkpackage = function( modelObject ) {
    let ebomPropName = 'mbm0EBOM';
    let mbomPropName = 'mbm0MBOM';
    let associatedCnPropName = 'mbm0AssociatedActiveCNs';
    let workPackageInfo = {
        workPackage : modelObject,
        isEbomMbomLinked:false,
        associatedCnObjects:[]
    };

   return dataMgmtService.getProperties( [ modelObject.uid ], [ ebomPropName, mbomPropName, associatedCnPropName ] ).then( function( response ) {
        let loadedCcObj = cdm.getObject( modelObject.uid );
        let ebom = loadedCcObj ? loadedCcObj.props[ebomPropName] : null;
        let mbom = loadedCcObj ? loadedCcObj.props[mbomPropName] : null;
        let associatedCNs = loadedCcObj ? loadedCcObj.props[associatedCnPropName] : [];
        if ( ebom && mbom && ebom.dbValues.length > 0 && !_.isEmpty( ebom.dbValues[0] ) && mbom.dbValues.length > 0 && !_.isEmpty( mbom.dbValues[0] ) ) {
            workPackageInfo.isEbomMbomLinked = true;
            _.forEach( associatedCNs.dbValues, function( uid ) {
                let cnObj = cdm.getObject( uid );
                if ( cnObj ) {
                    let cmClosureRule = cnObj.props.CMClosure;
                    if ( !cmClosureRule || cmClosureRule.dbValues[0] !== 'Closed' ) {
                        workPackageInfo.associatedCnObjects.push( cnObj );
                    }
                }
            } );
        }
        return workPackageInfo;
    } );
};
/**
 * Prepare data to show associated CN in the dropdown list of open popup
 * @param {Object} workPackageInfo data related to use in open Workpackage popup
 * @return {String} true if data preparation complete
 */
export let prepareAssociatedCnOptions = function(  workPackageInfo ) {
    _.forEach( workPackageInfo.associatedCnObjects, function( cn ) {
        cn.propInternalValue = cn.uid;
        cn.propDisplayValue = cn.props.object_name.uiValues[0];
        cn.propDisplayDescription = cn.props.object_string.uiValues[0];
        cn.iconName = cn.modelType.constantsMap.IconFileName;
    } );
  return true;
};

/**
 * Update slelectoin
 * @param {*} selectedOption active radio button object
 * @param {*} previousSelectedOption  previous active radio button object
 * @return {String} selected option
 */
export let mbmOpenWithCnOptionSelection = function( selectedOption, previousSelectedOption ) {
    let option = selectedOption.dbValue;
    if ( option ) {
        previousSelectedOption.dbValue = null;
    }


    return option;
};

/**
 * Update slelectoin
 * @param {*} selectedOption active radio button object
 * @param {*} previousSelectedOption  previous active radio button object
 * @return {String} selected option
 */
export let mbmOpenWithoutCnOptionSelection = function( selectedOption, previousSelectedOption ) {
    let option = selectedOption.dbValue;
    if ( option ) {
        previousSelectedOption.dbValue = null;
    }
    return option;
};

/**
 *Prepare data to use in navigation of workpackage
 * @param {String} workPackage CCobject
 * @param {String} sletectedCn selected Change Notice
 * @param {String} navigationType _self, newTab, newWindow
 * @return {Object} workpackage info required to navigate to MBM Alignment page
 */
export let processNavigation = function( workPackage, sletectedCn, navigationType ) {
    return {
        workPackage: workPackage,
        navigationType:navigationType,
        selectedCN: sletectedCn
    };
};

export default  {
    evaluateToOpenWorkpackage,
    prepareAssociatedCnOptions,
    mbmOpenWithCnOptionSelection,
    mbmOpenWithoutCnOptionSelection,
    processNavigation
};
