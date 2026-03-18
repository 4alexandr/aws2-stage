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
 * @module js/mbmCompareUtils
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import {constants as mbmConstants} from 'js/mbmConstants';

var exports = {};
const _assignmentAndMismatchCoContextKey = 'mbmAssignmentAndMismatchContext';
const _openWithCnKey = 'mbmOpenWithCnKey';
const _cnInfoKey = 'mbmChangeNoticeInfo';
const _modificationInProgress = 'modificationInProgress';
/**
 * Get status if modification is in progress ie. add, remove
 * @return {boolean} true if modification is in progress otherwise false
 */
export let isModificationInProgress = function() {
    let context = getAssignmentAndMismatchContext();
    return context.hasOwnProperty( 'modificationInProgress' ) ? context[ _modificationInProgress ] : false;
};

/**
 *Set status if modification is in progress
 * @param {boolean} modificationInProgress if modification is in progress otherwise false
 */
export let setModificationInProgress = function( modificationInProgress ) {
    let context = getAssignmentAndMismatchContext();
    context[ _modificationInProgress ] = modificationInProgress;
};

/**
 * Get status of open with change notice
 * @return {boolean} true if open with change notice otherwise false
 */
export let isOpenWithChangeNotice = function () {
    let context = getAssignmentAndMismatchContext();
    return context[_openWithCnKey];
};

/**
 *Set status of open with change notice
 * @param {boolean} openWithCn if open with change notice otherwise false
 */
export let setOpenWithChangeNotice = function ( openWithCn ) {
    let context = getAssignmentAndMismatchContext();
    context[_openWithCnKey] = openWithCn;
};

/**
 * Get change notice info to calculate status
 * @return {Object} change notice info
 */
export let getChangeNoticeInfo = function() {
    let context = getAssignmentAndMismatchContext();
    return context[_cnInfoKey];
};

/**
 * Set change notice info to calculate status
 * @param {Object} changeNoticeInfo change notice info
 */
export let setChangeNoticeInfo = function( changeNoticeInfo ) {
    let context = getAssignmentAndMismatchContext();
    context[_cnInfoKey] = changeNoticeInfo;
};

/**
 * Get context of assignment and mismatch to calculate status
 * @return {Object} context
 */
export let getAssignmentAndMismatchContext = function () {
    let context = appCtxService.getCtx( _assignmentAndMismatchCoContextKey );
    if( !context ) {
        context = {};
        appCtxService.updateCtx( _assignmentAndMismatchCoContextKey, context );
    }
    return context;
};
/**
 * Update and get compare information of given context
 * @param {String} contextKey name of the context e.g ebomContext, mbomContext etc.
 * @param {Array} visibleVmos array of visible view model object
 * @param {Object} topElement top element
 * @param {Object} productContextInfo product context information
 * @return {Object} an object for given context
 */
export let updateAndGetCompareContext = function( contextKey, visibleVmos, topElement, productContextInfo ) {
    let context = getAssignmentAndMismatchContext();

    let compareInfo = context[ contextKey ];
    if( !compareInfo ) {
        compareInfo = {};
        context[ contextKey ] = compareInfo;
    }

    compareInfo.visibleVmos = visibleVmos;
    compareInfo.topElement = topElement;
    compareInfo.productContextInfo = productContextInfo;

    return context;
};

/**
 * find target uids for a given uid from the given context
 * @param {String} contextKey name of the context e.g ebomContext, mbomContext etc.
 * @param {String} uid of source object.
 * @return {Array}  uids of target objects
 */
export let findDifferencesFor = function( contextKey, uid ) {
    let context = getAssignmentAndMismatchContext();

    if( context ) {
       let compareInfo = context[ contextKey ];
       if( compareInfo && compareInfo.differences ) {
           let difference = compareInfo.differences[uid];
           if( difference && difference.mappingUids ) {
                return difference.mappingUids || [];
           }
       }
    }
    return [];
};

/**
 * Cleare compare context
 */
export let resetCompareContext = function() {
    appCtxService.unRegisterCtx( _assignmentAndMismatchCoContextKey );
};


/**
 * Get top element of given of object
 * @param  {Object}compareInfo compareInfo
 * @return {Object} top element
 */
export let getTopElement = function( compareInfo ) {
    return compareInfo ? compareInfo.topElement : null;
};

/**
 * Get view model objects of given object
 * @param  {Object}compareInfo compareInfo
 * @return {Array} view model objects
 */
export let getVmosToUpdate = function( compareInfo ) {
    return compareInfo ? compareInfo.visibleVmos : null;
};

/**
 * Get product context objects of given object
 * @param  {Object}compareInfo compareInfo
 * @return {Object} product context objects
 */
export let getProductContext = function( compareInfo ) {
    return compareInfo ? compareInfo.productContextInfo : null;
};

/**
 * Get cursor object of given object
 * @param  {Object}compareInfo compareInfo
 * @return {Object} cursor object
 */
export let getCursor = function( compareInfo ) {
    if( compareInfo && compareInfo.cursor ) {
        return compareInfo.cursor;
    }
    return {
        startReached: false,
        endReached: false,
        startIndex: -1,
        endIndex: 0,
        pageSize: 40,
        isForward: true
    };
};

/**
 * Update the difference in cache of given compare information
 * @param {Object} compareInfo comapare information
 * @param {Object} differences differences
 */
export let updateDifferencesInContext = function( compareInfo, differences ) {
    if( compareInfo ) {
        if( compareInfo.differences ) {
            _.forEach( differences, function( diff, paramName ) {
                compareInfo.differences[ paramName ] = diff;
            } );
        } else {
            compareInfo.differences = differences;
        }
    }
};

/**
 *Update the difference in cache for save use cases ie add , remove and fire event for updating indication
 * @param {Object} differences differences
 * @param {Object} indicationData data related to assignment indication
 * @param {String} contextKey view key that represent view
 */
export let updateDifferences = function( differences, indicationData, contextKey ) {
    let idsToUpdate = [];
    indicationData.forEach( element => {
        idsToUpdate.push( element.id );
        let elemStatus = {
            status: element.status
        };
        if( element.equiLines && element.equiLines.length > 0 ) {
            elemStatus.mappingUids = element.equiLines;

        }
        differences[ element.id ] = elemStatus;
    } );
    if( idsToUpdate.length > 0 ) {
        let eventData = {
            "contextKey": contextKey,
            "idsToUpdate": idsToUpdate
        };
        eventBus.publish( 'mbm.differenceUpdatedInContextSuccessEvent', eventData );
    }
};

/**
 *Update the difference in cache for save use cases ie add , remove
 @param {String} contextKey view key that represent view
 @param {String} actionType an action ie add, remove
 @param {Object} indicationData data related to assignment indication
 @param {Array} removedObjectUids uids of Removed objects
 */
export let updateDifferencesInContextForSave = function( contextKey, actionType, indicationData, removedObjectUids ) {
    let context = getAssignmentAndMismatchContext();
    let compareInfo = context[ contextKey ];
    if( compareInfo && compareInfo.differences ) {
        let differences = compareInfo.differences;
        if( actionType === mbmConstants.ADD) {
            updateDifferences( differences, indicationData, contextKey );
        } else if( actionType === mbmConstants.REMOVE || actionType === mbmConstants.MOVE || actionType === mbmConstants.PROPAGATE) {
            if( contextKey === 'mbomContext' ) {
                removedObjectUids.forEach( updatedObjectUid => {
                    delete differences[ updatedObjectUid ];
                } );
                updateDifferences( differences, indicationData, contextKey );
            } else if( contextKey === 'ebomContext' ) {
                updateDifferences( differences, indicationData, contextKey );
            }

        }
    }

};

/**
 *Update compare status
 @param {String} contextKey view key that represent view
 @param {Array} uids array of uids
 @param {Object} supportedStatuses supportedStatuses
 */
export let updateCompareStatus = function( contextKey, uids, supportedStatuses ) {
    let updatedCompareStatus = {};
    if( uids ) {
        let context = getAssignmentAndMismatchContext();
        let compareInfo = context[ contextKey ];
        if( compareInfo ) {
            _.forEach( uids, function( uid ) {
                let diff = compareInfo.differences ? compareInfo.differences[ uid ] : null;
                _.forEach( supportedStatuses, function( supportedStatus ) {
                    if( diff ) {
                        if( _.indexOf( supportedStatus.statuses, diff.status ) > -1 ) {
                            if( !updatedCompareStatus[ uid ] ) {
                                updatedCompareStatus[ uid ] = [ supportedStatus.columnName ];
                            } else if( !updatedCompareStatus[ uid ][ supportedStatus.columnName ] ) {
                                updatedCompareStatus[ uid ].push( supportedStatus.columnName );
                            }
                        }
                    } else {
                        // this required to remove status from column during unassigned
                        if( !updatedCompareStatus[ uid ] ) {
                            updatedCompareStatus[ uid ] = [ supportedStatus.columnName ];
                        } else if( !updatedCompareStatus[ uid ][ supportedStatus.columnName ] ) {
                            updatedCompareStatus[ uid ].push( supportedStatus.columnName );
                        }
                    }
                } );
            } );
        }
    }
    eventBus.publish( 'viewModelObject.propsUpdated', updatedCompareStatus );
};

/**
 *Get delimiter key
 @return {String} delimeter key
 */
export let getDelimiterKey = function() {
    return '##';
};

/**
 * Get status of given uid
 * @param {String} contextKey view key tat represent the view
 * @param {String} uid uid of the object
 * @return {number} status
 */
export let getStatus = function( contextKey, uid ) {
    let context = getAssignmentAndMismatchContext();
    if( context ) {
        let compareInfo = context[ contextKey ];
        if( compareInfo && compareInfo.differences ) {
            let diff = compareInfo.differences[ uid ];
            return diff ? diff.status : null;
        }
    }
};

export default exports = {
    getAssignmentAndMismatchContext,
    setOpenWithChangeNotice,
    isOpenWithChangeNotice,
    setChangeNoticeInfo,
    getChangeNoticeInfo,
    updateAndGetCompareContext,
    resetCompareContext,
    getTopElement,
    getVmosToUpdate,
    getProductContext,
    getCursor,
    updateDifferencesInContext,
    updateDifferencesInContextForSave,
    updateDifferences,
    updateCompareStatus,
    getDelimiterKey,
    getStatus,
    findDifferencesFor,
    setModificationInProgress,
    isModificationInProgress
};
app.factory( 'mbmCompareUtils', () => exports );
