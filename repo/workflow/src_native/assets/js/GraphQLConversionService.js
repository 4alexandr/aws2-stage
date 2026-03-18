// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/GraphQLConversionService
 */
import app from 'app';
import _ from 'lodash';

var exports = {};

/**
 * Converts the activeFilterMap into an array format that GraphQL can understand.
 *
 * @param {Object} activeFilterMap The active filter map to convert
 *
 * @return {Array} The converted filter map
 */
export let convertSearchFilterMap = function( activeFilterMap ) {
    var out = [];
    _.forEach( Object.keys( activeFilterMap ), function( value, index ) {
        out[ index ] = new Object();
        out[ index ].searchFilterName = value;
        out[ index ].searchFilters = activeFilterMap[ value ];
    } );
    return out;
};

export default exports = {
    convertSearchFilterMap
};
app.factory( 'GraphQLConversionService', () => exports );
