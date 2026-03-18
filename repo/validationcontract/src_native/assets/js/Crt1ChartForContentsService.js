//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * This file populates data related to Reports Page
 *
 * @module js/Crt1ChartForContentsService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

var exports = {};

var flagForFilter;

export let createPieChartForContents = function( data ) {
    var paraPassCount = 0;
    var paraFailCount = 0;
    var paraUnprocessCount = 0;
    var noContents = false;
    var chartDataFromSOA = [];
    var displayLabels = [];
    appCtxSvc.unRegisterCtx( 'columnTableColumnFilters' );
    if( data.eventData && appCtxSvc.ctx.search !== undefined && appCtxSvc.ctx.search.contentChartData !== undefined ) {
        chartDataFromSOA = appCtxSvc.ctx.search.contentChartData;
        var value1 = chartDataFromSOA[ 0 ];
        var value2 = chartDataFromSOA[ 1 ];
        var value3 = chartDataFromSOA[ 2 ];

        const ndx1 = value1.indexOf( ':' );
        paraUnprocessCount = parseInt( value1.substring( ndx1 + 1 ) );

        const ndx2 = value2.indexOf( ':' );
        paraPassCount = parseInt( value2.substring( ndx2 + 1 ) );

        const ndx3 = value3.indexOf( ':' );
        paraFailCount = parseInt( value3.substring( ndx3 + 1 ) );

        if( paraPassCount === 0 && paraFailCount === 0 && paraUnprocessCount === 0 ) {
            noContents = true;
            appCtxSvc.registerCtx( 'noContents', noContents );
        } else {

            appCtxSvc.registerCtx( 'noContents', noContents );
            if( !( appCtxSvc.ctx.contentPiePass === paraPassCount && appCtxSvc.ctx.contentPieFail === paraFailCount &&
                    appCtxSvc.ctx.contentPieUnprocessed === paraUnprocessCount ) ) {
                var arrayOfSeriesDataForChart = [];
                var dummyValuesForFirstSeries = [];
                dummyValuesForFirstSeries = [ paraUnprocessCount, paraFailCount, paraPassCount ]; // values of pie chart
                if( data.i18n ) {
                    displayLabels = [ data.i18n.NoResult, data.i18n.Fail, data.i18n.Pass ];
                    appCtxSvc.registerCtx( 'output', data.i18n.output );
                }
                var keyValueDataForChart = [];

                for( var j = 0; j < dummyValuesForFirstSeries.length; j++ ) {
                    keyValueDataForChart.push( {
                        label: displayLabels[ j ],
                        value: dummyValuesForFirstSeries[ j ],
                        name: displayLabels[ j ],
                        y: dummyValuesForFirstSeries[ j ]
                    } );
                }

                arrayOfSeriesDataForChart.push( {
                    seriesName: data.i18n.Contents,
                    colorByPoint: true,
                    keyValueDataForChart: keyValueDataForChart
                } );

                _unsetUpdateFlag();
                appCtxSvc.registerCtx( 'contentPiePass', paraPassCount );
                appCtxSvc.registerCtx( 'contentPieFail', paraFailCount );
                appCtxSvc.registerCtx( 'contentPieUnprocessed', paraUnprocessCount );

                return arrayOfSeriesDataForChart;
            }
        }
    }
    appCtxSvc.unRegisterCtx( 'filtering' );
};

export let getUid = function( ctx ) {
    var uid = '';
    if( ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.client.search.SearchLocation' && ctx.selected.type === 'Crt0VldnContractRevision' ) {
        uid = ctx.selected.uid;
    } else if( ctx.state.params.s_uid ) {
        uid = ctx.state.params.s_uid;
    } else {
        uid = ctx.state.params.uid;
    }
    return uid;
};

export let setUpdateFlag = function() {
    appCtxSvc.ctx.isContentDataUpdated = true;
};

var _unsetUpdateFlag = function() {
    appCtxSvc.ctx.isContentDataUpdated = false;
};

export let checkAndReloadContentsChart = function( data ) {
    if( data.eventData !== undefined ) {
    var state = data.eventData.state;
    if( state === 'saved' && data.dataProviders.contentsTableProvider ) {
        eventBus.publish( 'Crt1ContentsTable.refreshTable' );
    }
}
};

export let resetColumnFilters = function( data ) {
    appCtxSvc.unRegisterCtx( 'columnTableColumnFilters' );
    appCtxSvc.unRegisterCtx( 'contentPiePass' );
    appCtxSvc.unRegisterCtx( 'contentPieFail' );
    appCtxSvc.unRegisterCtx( 'contentPieUnprocessed' );
};

/**
 * this function is used to filter the Parameters Table when a particular section of the pie chart is selected
 * @param {object} data data
 */
export let filterTable = function( data ) {
    if( data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Contents ) {
        appCtxSvc.registerCtx('filtering', true);
        var selectedLabel = data.eventMap[ 'undefined.selected' ].label;

        if( data.eventData.label !== selectedLabel ) {
            flagForFilter = true;
        } else {
            flagForFilter = false;
        }

        data.eventData.label = selectedLabel;
        if( data.eventData.label === data.i18n.Pass || data.eventData.label === data.i18n.Fail ) {
            var columnTableColumnFilters = [ {

                columnName: 'crt1Result',
                operation: 'contains',
                values: [ data.eventData.label ]

            } ];
        } else if( data.eventData.label === data.i18n.NoResult ) {
            columnTableColumnFilters = [ {

                columnName: 'crt1Result',
                operation: 'equals',
                values: [ '' ]

            } ];
        }
        appCtxSvc.registerCtx( 'columnTableColumnFilters', columnTableColumnFilters );
        eventBus.publish( 'Crt1ContentsTable.refreshTable' );
    }
};

/**
 * this function is used to filter the Parameters Table when a particular section of the pie chart is un-selected
 * @param {object} data data
 */
export let displayAll = function( data ) {
    if( data.eventMap[ 'undefined.unselected' ].seriesName === data.i18n.Contents) {
        appCtxSvc.registerCtx('filtering', true);
        if( flagForFilter ) {
            flagForFilter = false;
        } else {
            var columnTableColumnFilters = [];
            appCtxSvc.registerCtx( 'columnTableColumnFilters', columnTableColumnFilters );
            eventBus.publish( 'Crt1ContentsTable.refreshTable' );
        }
    }
};

export default exports = {
    createPieChartForContents,
    getUid,
    setUpdateFlag,
    checkAndReloadContentsChart,
    resetColumnFilters,
    filterTable,
    displayAll
};
/**
 * Register Crt1ChartForContentsService service
 *
 * @memberof NgServices
 * @member Ase0SettingsLabelService
 *
 * @param {Object} $q $q
 * @param {Object} $http Angular HTTP Service
 * @returns {Object} this
 */
app.factory( 'Crt1ChartForContentsService', () => exports );
