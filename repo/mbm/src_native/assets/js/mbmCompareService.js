// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
 
/**
 * @module js/mbmCompareService
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import mbmCompareUtils from 'js/mbmCompareUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * performCompare
 * @param {Object} vmos selectd view model object
 * @param {String } contextKey  view key that represent the view
 * @return {Promise} promise of  soa response
 */
export let performCompare = function( vmos, contextKey ) {
    let element = appCtxService.getCtx( contextKey + '.modelObject' );
    let productContextInfo = appCtxService.getCtx( contextKey + '.productContextInfo' );

    let comapreContext = mbmCompareUtils.updateAndGetCompareContext( contextKey, vmos, element, productContextInfo );
    let sourceContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 0 ];
    let targetContextKey = appCtxService.getCtx( 'splitView.viewKeys' )[ 1 ];
    let sourceCompareInfo = comapreContext[ sourceContextKey ];
    let targetCompareInfo = comapreContext[ targetContextKey ];
    let context = mbmCompareUtils.getAssignmentAndMismatchContext();

    if( context && mbmCompareUtils.isModificationInProgress() ) {
        mbmCompareUtils.setModificationInProgress( false );
        return AwPromiseService.instance.defer().promise;
    }
        return _performCompare( sourceContextKey, targetContextKey, sourceCompareInfo, targetCompareInfo );
};

/**
 * _performCompare
 * @param {Object} sourceContextKey context view key of source
 * @param {Object} targetContextKey context view key of source
 * @param {Object} sourceCompareInfo compare information of source
 * @param {Object} targetCompareInfo compare information of target
 * @return {promise} promise
 */
let _performCompare = function( sourceContextKey, targetContextKey, sourceCompareInfo, targetCompareInfo ) {
    let deferred = AwPromiseService.instance.defer();
    let sourceElement = appCtxService.getCtx( sourceContextKey + '.topElement' );
    let targetElement = appCtxService.getCtx( targetContextKey + '.topElement' );

    let srcVmosToUpdate = mbmCompareUtils.getVmosToUpdate( sourceCompareInfo );
    let trgVmosToUpdate = mbmCompareUtils.getVmosToUpdate( targetCompareInfo );

    let changeNoticeInfo = mbmCompareUtils.getChangeNoticeInfo();
    if( _isValidCompare( sourceElement, srcVmosToUpdate, targetElement, trgVmosToUpdate, changeNoticeInfo ) ) {
        let srcElement = mbmCompareUtils.getTopElement( sourceCompareInfo );
        let srcPciObject = mbmCompareUtils.getProductContext( sourceCompareInfo );
        let srcInput = _getInputFor( srcElement, srcPciObject, srcVmosToUpdate );

        let trgElement = mbmCompareUtils.getTopElement( targetCompareInfo );
        let trgPciObject = mbmCompareUtils.getProductContext( targetCompareInfo );
        let trgInput = _getInputFor( trgElement, trgPciObject, trgVmosToUpdate );

        let accCriteria = {};
        let compareInput = _getSoaInput( srcInput, trgInput, changeNoticeInfo || {}, accCriteria );
         _invokeCompareSoa( compareInput ).then( function( response ) {
            let sourceDifference = _processElementsStatus( response.eBOMElementsStatus );
            let targetDifference = _processElementsStatus( response.mBOMElementsStatus );

            mbmCompareUtils.updateDifferencesInContext( sourceCompareInfo, sourceDifference );
            mbmCompareUtils.updateDifferencesInContext( targetCompareInfo, targetDifference );

            let updatedCompareObject = {
                sourceIdsToUpdate: _getVisibleUidsFor( srcVmosToUpdate ),
                targetIdsToUpdate: _getVisibleUidsFor( trgVmosToUpdate )
            };

            eventBus.publish( 'mbm.compareComplete', updatedCompareObject );
            if ( mbmCompareUtils.isOpenWithChangeNotice() ) {
                eventBus.publish( 'mbm.changeRecordsStatusLoadedEvent', response.changeRecordsStatus );
            }
            deferred.resolve();
        } );
    }else{
        deferred.resolve();
    }


    return deferred.promise;
};

/**
 * Process the differences of given parameter
 * @param {Object} elementsStatus elementsStatus
 * @return {Object} differences
 */
let _processElementsStatus = function( elementsStatus ) {
    let statusMaping = {};
    if( elementsStatus ) {
        for( let key in elementsStatus ) {
            let elemStatus = {
                status : elementsStatus[key].status
            };
            if ( elementsStatus[key].equivalentElements ) {
                elemStatus.mappingUids = elementsStatus[key].equivalentElements;
            }
            statusMaping[key] = elemStatus;
        }
    }

    return statusMaping;
};

/**
 * Get input of given object
 * @param {Object} element comparable object
 * @param {Object} pci product context information
 * @param {Array} visibleVmos array of view model objects
 * @return {Object}  object
 */
let _getInputFor = function( element, pci, visibleVmos ) {
    return {
        scopeObject: {
            uid:element.uid,
            type:element.type
        },
        configInfo: {
            uid:pci.uid,
            type: pci.type
        },
        objectsToProcess: _getVisibleUidsFor( visibleVmos )
    };
};

/**
 * Get the  input for getAssignmentAndMismatchStatus soa
 * @param {Object} sourceInfo source object
 * @param {Object} targetInfo target object
 * @param {Object} changeNoticeInfo change notice info
 * @param {Object} acCriteria acc criteria
 * @return {Object} input data
 */
let _getSoaInput = function( sourceInfo, targetInfo, changeNoticeInfo, acCriteria ) {
    return {
        input: {
            eBOMInfo: sourceInfo,
            mBOMInfo: targetInfo,
            changeNoticeInfo: changeNoticeInfo,
            acCriteria:acCriteria
        }
    };
};
/**
 *Check the  validity of compare of given parameter
 * @param {Object} sourceElement top element of source view
 * @param {Array} sourceVmosToUpdate vmos to update of source view
 * @param {Object} targetElement top element of target view
 * @param {Array} targetVmosToUpdate vmos to update of target view
 * @param {boolean} compareMode true if freshCompare otherwise false
 * @return {boolean} true if valid otherwise false
 */
let _isValidCompare = function( sourceElement, sourceVmosToUpdate, targetElement, targetVmosToUpdate, changeNoticeInfo ) {
    if( !sourceElement || !targetElement || sourceElement && targetElement && sourceElement.uid === targetElement.uid ) {
        return false;
    }

    if ( mbmCompareUtils.isOpenWithChangeNotice() && !changeNoticeInfo ) {
        return false;
    }

    if( sourceVmosToUpdate && targetVmosToUpdate ) {
        return sourceVmosToUpdate.length > 0 || targetVmosToUpdate.length > 0;
    }

    return false;
};

let _invokeCompareSoa = function( soaInput ) {
    return soaSvc.postUnchecked( 'Internal-MultiBomManager-2020-05-MultiBOMChangeMgmt', 'getAssignmentAndMismatchStatus', soaInput );
};

/**
 *
 * @param {Array} vmos  array of view model object
 * @return {Array} array of uids
 */
let _getVisibleUidsFor = function( vmos ) {
    let uids = [];
    _.forEach( vmos, function( vmo ) {
        uids.push( vmo.uid );
    } );

    return uids;
};

export default exports = {
    performCompare
};

