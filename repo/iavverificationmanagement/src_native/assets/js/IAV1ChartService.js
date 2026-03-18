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
 * @module js/IAV1ChartService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

var exports = {};

var flagForFilter;

export let createPieChart = function( data ) {
    var paraPassCount = 0;
    var paraFailCount = 0;
    var paraUnprocessCount = 0;
    var noOutputPara = false;
    var chartDataFromSOA = [];
    var displayLabels = [];
    appCtxSvc.unRegisterCtx( 'paramTableColumnFilters' );
    if( data.i18n && data.i18n.NoResult && data.i18n.Fail && data.i18n.Pass && data.i18n.Output && data.i18n.output ) {
        appCtxSvc.registerCtx( 'NoResult', data.i18n.NoResult );
        appCtxSvc.registerCtx( 'Fail', data.i18n.Fail );
        appCtxSvc.registerCtx( 'Pass', data.i18n.Pass );
        appCtxSvc.registerCtx( 'Output', data.i18n.Output );
        appCtxSvc.registerCtx( 'output', data.i18n.output );

        displayLabels = [ data.i18n.NoResult, data.i18n.Fail, data.i18n.Pass ];
    } else {
        displayLabels = [ appCtxSvc.ctx.NoResult, appCtxSvc.ctx.Fail, appCtxSvc.ctx.Pass ];
    }
    /*draw chart only if value of "_appCtxSvc.ctx.search.chartData" is present.
    "_appCtxSvc.ctx.search.chartData" value will get set when performSearchViewModel4 SOA of parameters table
    from (Att1ShowAttrProxyTableViewModel) is getting called. */
    if( appCtxSvc.ctx.search !== undefined && appCtxSvc.ctx.search.chartData !== undefined ) {
        chartDataFromSOA = appCtxSvc.ctx.search.chartData;
        if( chartDataFromSOA.length > 0 ) {
            var value1 = chartDataFromSOA[ 0 ];
            var value2 = chartDataFromSOA[ 1 ];
            var value3 = chartDataFromSOA[ 2 ];

            const ndx1 = value1.indexOf( ':' );
            paraUnprocessCount = parseInt( value1.substring( ndx1 + 1 ) );

            const ndx2 = value2.indexOf( ':' );
            paraPassCount = parseInt( value2.substring( ndx2 + 1 ) );

            const ndx3 = value3.indexOf( ':' );
            paraFailCount = parseInt( value3.substring( ndx3 + 1 ) );

            // Give informative message if pass,fail and unprossed parameters are empty.
            //e.g. no output parameters
            if( paraPassCount === 0 && paraFailCount === 0 && paraUnprocessCount === 0 ) {
                noOutputPara = true;
                appCtxSvc.registerCtx( 'noOutputPara', noOutputPara );
            } else {

                // If parameter chart is already present of same values then no need to redraw it again.
                if( !( appCtxSvc.ctx.piePass === paraPassCount && appCtxSvc.ctx.pieFail === paraFailCount &&
                        appCtxSvc.ctx.pieUnprocessed === paraUnprocessCount ) ) {
                    appCtxSvc.registerCtx( 'noOutputPara', noOutputPara );
                    appCtxSvc.registerCtx( 'chartDataFromSOA', chartDataFromSOA );
                    var arrayOfSeriesDataForChart = [];
                    var dummyValuesForFirstSeries = [];
                    dummyValuesForFirstSeries = [ paraUnprocessCount, paraFailCount, paraPassCount ]; // values of pie chart
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
                        seriesName: data.i18n.Parameters,
                        colorByPoint: true,
                        keyValueDataForChart: keyValueDataForChart
                    } );

                    _unsetUpdateFlag();
                    appCtxSvc.registerCtx( 'piePass', paraPassCount );
                    appCtxSvc.registerCtx( 'pieFail', paraFailCount );
                    appCtxSvc.registerCtx( 'pieUnprocessed', paraUnprocessCount );

                    return arrayOfSeriesDataForChart;
                }
            }
        }
    }
};

export let getUid = function( ctx ) {
    var uid = '';
    if( ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.client.search.SearchLocation' && ctx.selected.type === 'Crt0VldnContractRevision' ) {
        uid = ctx.selected.uid;
    } else if( ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.client.search.SearchLocation' && ctx.selected.type === 'Crt0StudyRevision' ) {
        uid = ctx.selected.uid;
    } else if( ctx.state.params.s_uid ) {
        uid = ctx.state.params.s_uid;
    } else {
        uid = ctx.state.params.uid;
    }
    return uid;
};

export let setUpdateFlag = function() {
    appCtxSvc.ctx.isparamDataUpdated = true;
};

var _unsetUpdateFlag = function() {
    appCtxSvc.ctx.isparamDataUpdated = false;
};

export let checkAndReloadParameterChart = function( data ) {
    if( data.eventData !== undefined ) {
    var state = data.eventData.state;
    if( state === 'saved' && data.dataProviders.showAttrProxyTableProvider ) {
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
}
};

export let resetColumnFilters = function( data ) {
    appCtxSvc.unRegisterCtx( 'paramTableColumnFilters' );
    appCtxSvc.unRegisterCtx( 'piePass' );
    appCtxSvc.unRegisterCtx( 'pieFail' );
    appCtxSvc.unRegisterCtx( 'pieUnprocessed' );
};

/**
 * this function is used to filter the Parameters Table when a particular section of the pie chart is selected
 * @param {object} data data
 */
export let filterTable = function( data ) {
    if( data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Parameters ) {
        var selectedLabel = data.eventMap[ 'undefined.selected' ].label;

        if( data.eventData.label !== selectedLabel ) {
            flagForFilter = true;
        } else {
            flagForFilter = false;
        }

        data.eventData.label = selectedLabel;
        if( data.eventData.label === data.i18n.Pass || data.eventData.label === data.i18n.Fail ) {
            var paramTableColumnFilters = [ {

                columnName: 'att1Result',
                operation: 'contains',
                values: [ data.eventData.label ]

            } ];
        } else if( data.eventData.label === data.i18n.NoResult ) {
            paramTableColumnFilters = [ {

                columnName: 'att1Result',
                operation: 'equals',
                values: [ '' ]

            }, {

                columnName: 'att1AttrInOut',
                operation: 'equals',
                values: [ data.i18n.Output ]

            } ];
        }
        appCtxSvc.registerCtx( 'paramTableColumnFilters', paramTableColumnFilters );
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
};

/**
 * this function is used to filter the Parameters Table when a particular section of the pie chart is un-selected
 * @param {object} data data
 */
export let displayAll = function( data ) {
    if( data.eventMap[ 'undefined.unselected' ].seriesName === data.i18n.Parameters ) {
        if( flagForFilter ) {
            flagForFilter = false;
        } else {
            var paramTableColumnFilters = [];
            appCtxSvc.registerCtx( 'paramTableColumnFilters', paramTableColumnFilters );
            eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
        }
    }
};

export default exports = {
    createPieChart,
    getUid,
    setUpdateFlag,
    checkAndReloadParameterChart,
    resetColumnFilters,
    filterTable,
    displayAll
};
/**
 * Register IAV1ChartService service
 *
 * @memberof NgServices
 * @member Ase0SettingsLabelService
 *
 * @param {Object} $q $q
 * @param {Object} $http Angular HTTP Service
 * @returns {Object} this
 */
app.factory( 'IAV1ChartService', () => exports );
