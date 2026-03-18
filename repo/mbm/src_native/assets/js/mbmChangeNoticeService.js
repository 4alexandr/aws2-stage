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
 * @module js/mbmChangeNoticeService
 */

import app from 'app';
import awPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
'use strict';
let exports = {};

/**
 * Load  workpackages impacted by the current change notice
 * @param {Array} currentECN  current change notice
 * @return {promise} promise of soa response
 */
export let loadImpactedWorkPackage = function( currentECN ) {
    return soaSvc.postUnchecked( 'Query-2014-11-Finder', 'performSearch', getImpactedWorkPackageInput( currentECN ), getPolicyForWorkPackage() ).then( function( response ) {
        let deferred = awPromiseService.instance.defer();
        //check partial error if exists reject it
        if( response.ServiceData && response.ServiceData.partialErrors ) {
            let licenseError = _.find( response.ServiceData.partialErrors[ 0 ].errorValues, function( error ) {
                return  error.code === 26025;
            } );
            if( licenseError ) {
                let error = soaSvc.createError( licenseError );
                deferred.reject( error );
            } else {
                let error = soaSvc.createError( response.ServiceData );
                deferred.reject( error );
            }
        }

        let mbmImpactedWpResponse = {
            activeChangeNotice: currentECN
        };
        mbmImpactedWpResponse.totalFound = response.totalFound || 0;
        mbmImpactedWpResponse.impactedWorkPackages = response.searchResults || [];
        deferred.resolve( mbmImpactedWpResponse );
        return deferred.promise;
    }, function( error ) {
        throw soaSvc.createError( error );
    } );
};
/**
 *
 * @param {Object} activeECN  activeECN
 * @param {Object} workPackages work packages impacted by active ecn
 * @return {promise} promise
 */
export let initialLoadData = function( activeECN, workPackages ) {
    let deferred = awPromiseService.instance.defer();
    deferred.resolve( {
        workPackages: workPackages,
        totalFound: workPackages.length
    } );
    return deferred.promise;
};

/**
 * Get soa input for workpackages
 * @param {Object} currentECN current change notice object
 * @return {Object} input object of soa
 */
let getImpactedWorkPackageInput = function( currentECN ) {
    return {
        searchInput: {
            providerName: 'Mbm0ImpactedCCObjProvider',
            searchCriteria: {
                ECNUid: currentECN.uid
            },
            maxToLoad: 50
        }
    };
};

/**
 * Get policy object for workpackage
 * @return {Object} policy object
 */
let getPolicyForWorkPackage = function() {
    return {
        types: [ {
            name: 'MECollaborationContext',
            properties: [ {
                    name: 'object_string'
                },
                {
                    name: 'object_name'
                },
                {
                    name: 'owning_group'
                },
                {
                    name: 'owning_user'
                },
                {
                    name: 'mbm0EBOM'
                },
                {
                    name: 'mbm0MBOM'
                },
                {
                    name: 'mbm0AssociatedActiveCNs'
                }
            ]
        } ]
    };
};
/**
 *Update impact status nad changes of given workpackage
 * @param {Object} eventData workpackage
 */
export let mbmUpdateChangeNoticeStatus = function( eventData ) {
    let propsToUpdateEventData = {};
    propsToUpdateEventData[ eventData.workpackageToUpdate.uid ] = [ 'cnStatusIndication', 'mbm0AssociatedActiveCNs' ];
    eventBus.publish( 'viewModelObject.propsUpdated', propsToUpdateEventData );
};

/**
 * Evaluate the workpackage open condition
 * @param {Object} activeCN current engineering change notice
 * @param {Object} workpackageToOpen cc object to open
 * @returns {Object} object
 */
export let mbmEvaluateToNavigateWorkpackage = function( activeCN, workpackageToOpen ) {
    let evaluationInfo = {
        ecn: activeCN,
        workpackage: workpackageToOpen
    };
    if( activeCN && workpackageToOpen ) {
        if( workpackageToOpen.props.mbm0AssociatedActiveCNs.dbValues.indexOf( activeCN.uid ) > -1 && activeCN.props.is_modifiable.dbValues[ 0 ] === '1' ) {
            evaluationInfo.status = 'mbmWorkpackageAssociated';
        } else if( workpackageToOpen.props.mbm0AssociatedActiveCNs.dbValues.indexOf( activeCN.uid ) < 0 && activeCN.props.is_modifiable.dbValues[ 0 ] === '1' ) {
            evaluationInfo.status = 'mbmWorkpackageNotAssociated';
        } else if( workpackageToOpen.props.mbm0AssociatedActiveCNs.dbValues.indexOf( activeCN.uid ) > -1 && activeCN.props.is_modifiable.dbValues[ 0 ] === '0' ) {
            evaluationInfo.status = 'mbmReadOnlyAndWorkpackageAssociated';
        } else if( activeCN.props.is_modifiable.dbValues[ 0 ] === '0' ) {
            evaluationInfo.status = 'mbmReadOnly';
        }
    }
    return evaluationInfo;
};

export default exports = {
    loadImpactedWorkPackage,
    initialLoadData,
    mbmUpdateChangeNoticeStatus,
    mbmEvaluateToNavigateWorkpackage
};

app.factory( 'mbmChangeNoticeService', function() {
    return exports;
} );
