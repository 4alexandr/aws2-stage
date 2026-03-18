// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Arm0RequirementSummaryTable
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import reqUtils from 'js/requirementsUtils';


var exports = {};

export let getColumnFilters = function( data ) {
    return data.columnProviders.reqSummaryTableColumnProvider.columnFilters;
};

export let clearProviderSelection = function( data ) {
    if ( data && data.dataProviders ) {
        var dataProvider = data.dataProviders.showReqSummaryTableProvider;
        if ( dataProvider ) {
            dataProvider.selectNone();
        }
    }
};
/**
 * Refresh linked objects post tracelink creation
 * @param {object} data view model
 *  @param {object} ctx context
 */
export let postTracelinkCreated = function( data ) {
    var eventData = data.eventData;
    if ( !eventData.startItems || !eventData.endItems ) {
        return;
    }
    if ( eventData.startItems.length <= 0 || eventData.endItems.length <= 0  ) {
        return;
    }

    var arrModelObjs = [];

    for ( var i = 0; i < eventData.startItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.startItems[ i ].uid ) );
    }
    for ( i = 0; i < eventData.endItems.length; i++ ) {
        arrModelObjs.push( cdm.getObject( eventData.endItems[ i ].uid ) );
    }

    if( arrModelObjs.length > 0 ) {
        soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: arrModelObjs
        } );
    }
};

/**
 * load the mathjax and fonts data
 *
 * @param {Object} data - The panel's view model object
 */
export let loadEquationFonts = function( data ) {
    reqUtils.loadEquationFonts( document );
};

/**
 * Returns the Arm0RequirementSummaryTable instance
 *
 * @member Arm0RequirementSummaryTable
 */

export default exports = {
    getColumnFilters,
    clearProviderSelection,
    postTracelinkCreated,
    loadEquationFonts
};
app.factory( 'Arm0RequirementSummaryTable', () => exports );
