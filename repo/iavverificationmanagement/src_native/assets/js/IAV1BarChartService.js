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
 * @module js/IAV1BarChartService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

import 'soa/dataManagementService';

var exports = {};
var flagForFilter;

export let loadStudyObjects = function( arUID ) {
    var arObj = cdm.getObject( arUID );
    var studyNames = [];
    var studies = arObj.props.crt0ChildrenStudies.dbValues;
    for( var i = 0; i < studies.length; i++ ) {
        var studyObject = cdm.getObject( studies[ i ] );
        if( studyObject ) {
            var studyName = studyObject.props.object_name.dbValues[ 0 ];
            studyNames.push( studyName );
        }
    }
    appCtxSvc.registerCtx( 'ARStudyNames', studyNames );
    appCtxSvc.registerCtx( 'ARStudyUids', studies );

    if( studies.length === 1 || studies.length > 1 ) {
        var parentUids = studies[ 0 ];
        for( var j = 1; j < studies.length; j++ ) {
            parentUids = parentUids.concat( '#', studies[ j ] );
        }
        appCtxSvc.registerCtx( 'ARStudies', parentUids );
        eventBus.publish( 'getParamOfStudies' );
    }
};

export let createBarChart = function(data) {
    var arrayOfSeriesDataForChart = [];
    var StudyNames = appCtxSvc.ctx.ARStudyNames;
    var studytObjectName = null;
    var pass = [];
    var fail = [];
    var unprocess = [];

    for( var j = 0; j < StudyNames.length; j++ ) {
        var paraPassCount = 0;
        var paraFailCount = 0;
        var paraUnprocessCount = 0;

        pass[ j ] = 0;
        fail[ j ] = 0;
        unprocess[ j ] = 0;

        if( appCtxSvc.ctx.selectedAttrProxyObjects2 && appCtxSvc.ctx.selectedAttrProxyObjects2.ServiceData.plain ) {
            for( var i = 0; i < appCtxSvc.ctx.selectedAttrProxyObjects2.ServiceData.plain.length; i++ ) {
                var proxyObject = cdm.getObject( appCtxSvc.ctx.selectedAttrProxyObjects2.ServiceData.plain[ i ] );
                if( proxyObject.props && proxyObject.props.att1ContextObject ) {
                    var studytObject = cdm.getObject( proxyObject.props.att1ContextObject.dbValues[ 0 ] );
                    studytObjectName = studytObject.props.object_name.dbValues[ 0 ];
                }

                if( studytObjectName && StudyNames[ j ] === studytObjectName ) {
                    if( proxyObject.type === 'Att1AttributeAlignmentProxy' ) {
                        if( proxyObject.props.att1AttrInOut.dbValues[ 0 ] === data.i18n.output ) {
                            if( proxyObject.props.att1Result.dbValues[ 0 ] === '200' ) {
                                pass[ j ] = paraPassCount++;
                            } else if( proxyObject.props.att1Result.dbValues[ 0 ] === '100' ) {
                                fail[ j ] = paraFailCount++;
                            } else if( proxyObject.props.att1Result.dbValues[ 0 ] === '' ) {
                                unprocess[ j ] = paraUnprocessCount++;
                            }
                        }
                    }
                }
            }
        }
        pass[ j ] = paraPassCount;
        fail[ j ] = paraFailCount;
        unprocess[ j ] = paraUnprocessCount;
    }
    var keyValueDataForChart1 = [];
    var keyValueDataForChart2 = [];
    var keyValueDataForChart3 = [];

    for( var n = 0; n < unprocess.length; n++ ) {
        keyValueDataForChart1.push( {
            label: StudyNames[ n ],
            value: unprocess[ n ],
            y: unprocess[ n ]
        } );
    }

    arrayOfSeriesDataForChart.push( {
        seriesName: data.i18n.NoResult,
        colorByPoint: true,
        keyValueDataForChart: keyValueDataForChart1
    } );

    for( var k = 0; k < fail.length; k++ ) {
        keyValueDataForChart2.push( {
            label: StudyNames[ k ],
            value: fail[ k ],
            y: fail[ k ]
        } );
    }

    arrayOfSeriesDataForChart.push( {
        seriesName: data.i18n.Fail,
        colorByPoint: true,
        keyValueDataForChart: keyValueDataForChart2
    } );

    for( var m = 0; m < pass.length; m++ ) {
        keyValueDataForChart3.push( {
            label: StudyNames[ m ],
            value: pass[ m ],
            y: pass[ m ]
        } );
    }

    arrayOfSeriesDataForChart.push( {
        seriesName: data.i18n.Pass,
        colorByPoint: true,
        keyValueDataForChart: keyValueDataForChart3
    } );

    return arrayOfSeriesDataForChart;
};

/**
 * this function is used to filter the Study Parameters Table when a particular section of the bar chart is selected
 * @param {object} data data
 */
export let filterStudyTable = function( data ) {
    if( data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Pass ||
        data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Fail ||
        data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.NoResult ) {
        var selectedSeriesName = data.eventMap[ 'undefined.selected' ].seriesName;
        var selectedLabel = data.eventMap[ 'undefined.selected' ].label;
        if( data.eventData.seriesName !== selectedSeriesName || data.eventData.label !== selectedLabel ) {
            flagForFilter = true;
        } else {
            flagForFilter = false;
        }
        data.eventData.seriesName = selectedSeriesName;
        data.eventData.label = selectedLabel;
        if( data.eventData.seriesName === data.i18n.Pass || data.eventData.seriesName === data.i18n.Fail ) {
            var studyTableColumnFilters = [ {
                columnName: 'att1Result',
                operation: 'contains',
                values: [ data.eventData.seriesName ]
            } ];
        } else if( data.eventData.seriesName === data.i18n.NoResult ) {
            studyTableColumnFilters = [ {
                columnName: 'att1Result',
                operation: 'equals',
                values: [ '' ]
            }, {
                columnName: 'att1AttrInOut',
                operation: 'equals',
                values: [ data.i18n.Output ]
            } ];
        }
        for( var i = 0; i < appCtxSvc.ctx.ARStudyNames.length; i++ ) {
            if( appCtxSvc.ctx.ARStudyNames[ i ] === data.eventData.label ) {
                var studies = appCtxSvc.ctx.ARStudyUids[ i ];
            }
        }
        var parentUids = studies;
        appCtxSvc.registerCtx( 'parentUids', parentUids );
        appCtxSvc.registerCtx( 'studyTableColumnFilters', studyTableColumnFilters );
        eventBus.publish( 'Att1ShowStudyAttrsTable.refreshStudyTable' );
    }
};

/**
 * this function is used to filter the Study Parameters Table when a particular section of the bar chart is un-selected
 * @param {object} data data
 */
export let displayAll = function( data ) {
    if( data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Pass ||
        data.eventMap[ 'undefined.selected' ].seriesName === data.i18n.Fail ||
        data.eventMap[ 'undefined.unselected' ].seriesName === data.i18n.Pass ||
        data.eventMap[ 'undefined.unselected' ].seriesName === data.i18n.Fail ||
        data.eventMap[ 'undefined.unselected' ].seriesName === data.i18n.NoResult ) {
        if( flagForFilter ) {
            flagForFilter = false;
        } else {
            var studyTableColumnFilters = [];
            appCtxSvc.registerCtx( 'studyTableColumnFilters', studyTableColumnFilters );
            eventBus.publish( 'Att1ShowStudyAttrsTable.refreshStudyTable' );
        }
    }
};

export let resetColumnFilters = function( data ) {
    appCtxSvc.unRegisterCtx( 'studyTableColumnFilters' );
};

export let checkAndReloadBarChart = function( data ) {
    if( data.eventData !== undefined ) {
    var state = data.eventData.state;
    if( state === 'saved' && data.dataProviders.studyAttrsDataProvider ) {
        eventBus.publish( 'getParamOfStudies' );
    }
}
};

export default exports = {
    loadStudyObjects,
    createBarChart,
    filterStudyTable,
    displayAll,
    resetColumnFilters,
    checkAndReloadBarChart
};
/**
 * Register IAV1BarChartService service
 *
 * @memberof NgServices
 * @member Ase0SettingsLabelService
 *
 * @param {Object} $q $q
 * @param {Object} $http Angular HTTP Service
 * @returns {Object} this
 */
app.factory( 'IAV1BarChartService', () => exports );
