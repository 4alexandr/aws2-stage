// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Vm1SortFilterUtilService
 */
import * as app from 'app';
var exports = {};

/**
 * Update the sort filter result in data provider
 * @param {Object} dataProvider data provider
 * @param {Array} result result of the sort filter SOA
 */
export let updateSortFilterResultInTable = function( dataProvider, result ) {
    dataProvider.update( result, result.length );
};


export let getFilterFacetValues = function( columnName, viewModelRows, data ) {
    var values = new Set();
    for ( var i = 0; i < viewModelRows.length; i++ ) {
        if ( viewModelRows[i].props[columnName] ) {
            for ( var j = 0; j < viewModelRows[i].props[columnName].displayValues.length; j++ ) {
                values.add( viewModelRows[i].props[columnName].displayValues[j] );
            }
        } else {
            values.add( '' );
        }
    }
    var facetValues = {
        values: Array.from( values ),
        totalFound: Array.from( values ).length
    };
    data.filterFacetResults = facetValues;
};

export default exports = {
    updateSortFilterResultInTable,
    getFilterFacetValues
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1SortFilterUtilService
 */
app.factory( 'Vm1SortFilterUtilService', () => exports );
