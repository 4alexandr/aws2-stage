// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines a service that can accept a chain of Clone Stable Ids (CSIDs) and fetch and return model objects
 * corresponding to those.
 *
 * @module js/csidsToObjectsConverterService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

//eslint-disable-next-line valid-jsdoc

let exports = {}; // eslint-disable-line no-invalid-this

/**
 * Use the 'productContext' of the 'active' context or 't_uid' as the 'productContext' to locate the object.
 *
 * @param {StringArray} csidsToBeSelected - UIDs that form a top-down path to the object to search for.
 *
 * @returns {Object} Response object from SOA 'Internal-AWS2-2016-03-Finder:performSearch'
 */
export let doPerformSearchForProvidedCSIDChains = function( csidsToBeSelected, shouldFocusOnHiddenPackedElements ) {
    /**
     * LCS-101682 & LCS-89033
     * <P>
     * Note: When there is a single CSID the server seems to not return any search results. We are only
     * going to use the 1st one, so just bump the max up by one to avoid the (probable) server problem.
     */
    var maxToReturn = csidsToBeSelected.length + 1;

    var searchInput = {
        internalPropertyName: null,
        maxToLoad: maxToReturn,
        maxToReturn: maxToReturn,
        providerName: 'Awb0CSIDsToElementsProvider',
        searchFilterFieldSortType: 'Alphabetical',
        startIndex: 0
    };

    var columnConfigInput = {
        clientName: 'AWClient',
        hostingClientName: '',
        clientScopeURI: 'Awp0SearchResults',
        operationType: null,
        columnsToExclude: []
    };

    var context = appCtxService.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$

    //check if this API can be enhance to take the input product and for this input product get the PCI and then pass.

    var productContextInfoId = context.productContextInfo.uid;

    var chainedCSIDs = csidsToBeSelected.join( ';' );

    chainedCSIDs += ';';

    var searchCriteria = {
        listOfCSIDChains: chainedCSIDs
    };

    searchCriteria.searchContext = productContextInfoId; //$NON-NLS-1$
    if( shouldFocusOnHiddenPackedElements ) {
        searchCriteria.shouldFocusOnHiddenPackedElements = shouldFocusOnHiddenPackedElements;
    }

     //If there is alternate PCI exit then use the same
     if( context.productContextInfo.props && context.productContextInfo.props.awb0AlternateConfiguration ) {
        var alternatePCIUid = context.productContextInfo.props.awb0AlternateConfiguration.dbValues[ 0 ];
        if( !_.isNull( alternatePCIUid ) && !_.isUndefined( alternatePCIUid ) && !_.isEmpty( alternatePCIUid ) ) {
            searchCriteria.useAlternateConfig  = 'true';
        }
    }
    searchInput.searchCriteria = searchCriteria;

    return soaService.postUnchecked( 'Internal-AWS2-2016-03-Finder', 'performSearch', { //$NON-NLS-1$
        columnConfigInput: columnConfigInput,
        searchInput: searchInput
    } );
};

export default exports = {
    doPerformSearchForProvidedCSIDChains
};
/**
 * @member csidsToObjectsConverterService
 * @memberof NgServices
 */
app.factory( 'csidsToObjectsConverterService', () => exports );

/**
 * Enable loading of this module in GWT
 */
