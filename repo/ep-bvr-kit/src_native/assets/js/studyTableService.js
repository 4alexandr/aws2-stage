// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/*global*/

/**
 * @module js/studyTableService
 */
import _ from 'lodash';
import { constants as epSaveConstants } from 'js/epSaveConstants';
let exports = {};
let studyAndStudySCMap = new Map();

export let processResponse = function( response ) {
    let findStudiesOutput = response.findStudiesOutput;
    let filteredResponse = [];
    if( findStudiesOutput && findStudiesOutput.length > 0 ) {
        _.forEach( findStudiesOutput[ 0 ].results, function( result ) {
            if( result.study && result.studySC ) {
                studyAndStudySCMap.set( result.study.uid, result.studySC );
                filteredResponse.push( result.study );
            }
        } );
    }
    return filteredResponse;
};

export let getTotalFound = function( response ) {
    if( response.findStudiesOutput && response.findStudiesOutput.length > 0 ) {
        return response.findStudiesOutput[ 0 ].totalFound;
    }
    return 0;
};

export let getStartFrom = function( viewModelCollection, startIndex ) {
    let startFromObj = {
        uid: 'AAAAAAAAAAAAAA',
        type: 'unknownType'
    };
    if( startIndex !== 0 ) {
        let lastRowObj = viewModelCollection.getViewModelObject( startIndex - 1 );

        startFromObj.uid = lastRowObj.uid;
        startFromObj.type = lastRowObj.type;
    }
    return startFromObj;
};

export let getSortField = function( sortCriteria ) {
    if( sortCriteria && sortCriteria[ 0 ].fieldName ) {
        return sortCriteria[ 0 ].fieldName;
    }
    return '';
};

export let isAscending = function( sortCriteria ) {
    if( sortCriteria && sortCriteria[ 0 ].sortDirection === 'ASC' ) {
        return true;
    }
    return false;
};

export let getFilterMap = function( columnFilters ) {
    if( columnFilters ) {
        let filterMap = {};
        _.forEach( columnFilters, function( columnFilter ) {
            filterMap[ columnFilter.columnName ] = columnFilter.values[ 0 ];
        } );
        return filterMap;
    }
    return {};
};

export let getSCOfSelectedStudy = function( selection ) {
    return studyAndStudySCMap.get( selection );
};

export let updateSelectedStudy = function( subPanelContext, tableSelectedObjects ) {
    subPanelContext.selection = tableSelectedObjects;
};

/**
 * adds/deletes Study and study Sc mapping and also updated the selection
 * @param {Object} eventData - eventData
 *  @param {Object} subPanelContext - subPanelContext
 * @param {Object} dataProvider - dataProvider
 */
export function updateStudySCAndSelection( eventData, subPanelContext, dataProvider ) {
    const relatedEvents = eventData.relatedEvents;
    const objUidToRemoveList = relatedEvents[ epSaveConstants.REMOVED_FROM_RELATION ];
    const objUidToAddList = relatedEvents[ epSaveConstants.ADDED_TO_RELATION ];
    if( objUidToRemoveList && objUidToRemoveList.length > 0 ) {
        for( let uid of objUidToRemoveList ) {
            studyAndStudySCMap.delete( uid );
        }
    }
    if( objUidToAddList && objUidToAddList.length > 0 ) {
        for( let index = 0; index < objUidToAddList.length; index++ ) {
            studyAndStudySCMap.set( objUidToAddList[index], eventData.studySC[index] );
        }
    }
    updateSelectedStudy( subPanelContext, dataProvider.getSelectedObjects() );
}

export default exports = {
    processResponse,
    getTotalFound,
    getStartFrom,
    getSortField,
    isAscending,
    getFilterMap,
    getSCOfSelectedStudy,
    updateSelectedStudy,
    updateStudySCAndSelection
};
