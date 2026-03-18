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
 * JS Service defined to handle Show Report related method execution only.
 *
 * @module js/showReportService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import soa_kernel_propertyPolicyService from 'soa/kernel/propertyPolicyService';
import localeService from 'js/localeService';
import searchCommonUtils from 'js/searchCommonUtils';
import filterPanelUtils from 'js/filterPanelUtils';
import messagingService from 'js/messagingService';
import awChartDataProviderService from 'js/awChartDataProviderService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import angular from 'angular';
import commandPanelService from 'js/commandPanel.service';
import viewModelObjectService from 'js/viewModelObjectService';
import reportsCommSrvc from 'js/reportsCommonService';

var exports = {};
var arrayOfSeriesDataForChart = [];
var keyValueDataForChart = [];

var localTextBundle = null;
var _runtimeFilterApplied = false;
var _reportexistingFil = {};


/**
 * gets the translated search criteria from server with the current locale's display value of the property in case of property specific search
 * @function fetchAndUpdateTranslatedSearchCriteria
 */
export let fetchAndUpdateTranslatedSearchCriteria = function( ) {
    let translatedSearchCriteria = appCtxService.getCtx( 'ReportsContext.reportParameters.searchTraslatedCriteria' );
    soa_kernel_soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: {
            inputSettings: {
                getTranslatedSearchCriteriaForCurrentLocale: translatedSearchCriteria
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale
            && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale.length === 1 && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
            translatedSearchCriteria = result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
        }
        if( translatedSearchCriteria && translatedSearchCriteria.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
            appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = translatedSearchCriteria;
            appCtxService.ctx.searchCriteria = translatedSearchCriteria;
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    } );
};

/**
 * rd_params:
 [
    0: "ReportTitle"
    1: "ReportFilter_0"
    2: "ReportFilterValue_0"
    3: "ReportFilter_1"
    4: "ReportFilterLargeValue_1_0"
    5: "ReportFilterLargeValue_1_1"
    6: "ReportFilterLargeValue_1_2"
    7: "ReportFilterLargeValue_1_3"
    8: "ReportSearchCriteria"
]
 * rd_param_values:
 [
    0: "{"TitleText":"Numeric filters...","TitleColor":"#000000","TitleDispColor":"","TitleFont":"Segoe UI","TitleDispFont":""}"
    1: "WorkspaceObject.object_type"
    2: "[{"searchFilterType":"StringFilter","stringValue":"AW2_Prop_SupportRevision"}]"
    3: "AW2_Prop_SupportRevision.aw2_Double"
    4: "{"searchFilterType":"NumericFilter","stringValue":"1.0E-4","startNumericValue":0.0001,"endNumericValue":0.0001}"
    5: "{"searchFilterType":"NumericFilter","stringValue":"0.007","startNumericValue":0.007,"endNumericValue":0.007}"
    6: "{"searchFilterType":"NumericFilter","stringValue":"0.2","startNumericValue":0.2,"endNumericValue":0.2}"
    7: "{"searchFilterType":"NumericFilter","stringValue":"0.37","startNumericValue":0.37,"endNumericValue":0.37}"
    8: "Search*"
]
 *
 *
 *
 * @param  {any} selectedReportDef - the report object
 */
export let rebuildReportDefProps = function( selectedReportDef ) {
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var searchTraslatedCriteria = [];
    var initRepDisplay = true;
    var ReportDefProps = {};
    var ReportSearchInfo = {
        activeFilterMap: {}
    };
    var ReportTable1 = {};
    var ChartVisibility = {
        chart1Visible: false,
        chart2Visible: false,
        chart3Visible: false
    };
    for( var index = 0; index < rd_params.length; index++ ) {
        if( rd_params[ index ] === 'ReportTitle' ) {
            ReportDefProps[ rd_params[ index ] ] = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ].startsWith( 'ReportFilter' ) ) {
            var filtrSplit = rd_params[ index ].split( '_' );
            if( filtrSplit[ 0 ] === 'ReportFilter' ) {
                //ReportSearchInfo.activeFilterMap.push( rd_paramValues[ index ] );
            } else if( filtrSplit[ 0 ] === 'ReportFilterLargeValue' ) {
                // If multiple filter values they are stored as ReportFilterLargeValue_1_1
                //filterName key will be always at constant location in
                var filtIndex = index - 1 - parseInt( filtrSplit[ 2 ] );
                var filtKey = rd_paramValues[ filtIndex ];
                var value = [];
                if( ReportSearchInfo.activeFilterMap.hasOwnProperty( filtKey ) ) {
                    value = ReportSearchInfo.activeFilterMap[ filtKey ];
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    ReportSearchInfo.activeFilterMap[ filtKey ] = value;
                } else {
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    ReportSearchInfo.activeFilterMap[ filtKey ] = value;
                }
            } else if( filtrSplit[ 0 ] === 'ReportFilterValue' ) {
                ReportSearchInfo.activeFilterMap[ rd_paramValues[ index - 1 ] ] = JSON.parse( rd_paramValues[ index ] );
            }
        } else if( rd_params[ index ] === 'ReportSearchCriteria' ) {
            ReportSearchInfo.SearchCriteria = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'DataProvider' ) {
            ReportSearchInfo.dataProviderName = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'AdditionalSearchCriteria' ) {
            ReportSearchInfo.additionalSearchCriteria = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ].startsWith( 'ReportTable1' ) ) {
            if( rd_params[ index ] === 'ReportTable1ColumnPropName' ) {
                ReportTable1.ColumnPropName = JSON.parse( rd_paramValues[ index ] );
            } else if( rd_params[ index ].startsWith( 'ReportTable1ColumnPropInternalName_0' ) ) {
                var strClProps = [];
                strClProps = JSON.parse( rd_paramValues[ index ] );
                strClProps.push.apply( strClProps, JSON.parse( rd_paramValues[ index + 1 ] ) );
                ReportTable1.ColumnPropInternalName = strClProps;
            }
        } else if( rd_params[ index ] === 'ReportChart1_0' ) {
            var ReportChart1 = JSON.parse( rd_paramValues[ index ] );
            ReportChart1.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart1Visible = true;
            ReportChart1.ChartPropInternalName = Array.isArray( ReportChart1.ChartPropInternalName ) ? ReportChart1.ChartPropInternalName[ 0 ] : ReportChart1.ChartPropInternalName;
            ReportChart1.ChartPropName = Array.isArray( ReportChart1.ChartPropName ) ? ReportChart1.ChartPropName[ 0 ] : ReportChart1.ChartPropName;
            ReportDefProps.ReportChart1 = ReportChart1;
        } else if( rd_params[ index ] === 'ReportChart2_0' ) {
            var ReportChart2 = JSON.parse( rd_paramValues[ index ] );
            ReportChart2.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart2Visible = true;
            ReportChart2.ChartPropInternalName = Array.isArray( ReportChart2.ChartPropInternalName ) ? ReportChart2.ChartPropInternalName[ 0 ] : ReportChart2.ChartPropInternalName;
            ReportChart2.ChartPropName = Array.isArray( ReportChart2.ChartPropName ) ? ReportChart2.ChartPropName[ 0 ] : ReportChart2.ChartPropName;
            ReportDefProps.ReportChart2 = ReportChart2;
        } else if( rd_params[ index ] === 'ReportChart3_0' ) {
            var ReportChart3 = JSON.parse( rd_paramValues[ index ] );
            ReportChart3.ChartPropInternalName = JSON.parse( rd_paramValues[ index + 1 ] );
            ChartVisibility.chart3Visible = true;
            ReportChart3.ChartPropInternalName = Array.isArray( ReportChart3.ChartPropInternalName ) ? ReportChart3.ChartPropInternalName[ 0 ] : ReportChart3.ChartPropInternalName;
            ReportChart3.ChartPropName = Array.isArray( ReportChart3.ChartPropName ) ? ReportChart3.ChartPropName[ 0 ] : ReportChart3.ChartPropName;
            ReportDefProps.ReportChart3 = ReportChart3;
        } else if( rd_params[ index ] === 'ThumbnailChart' ) {
            ReportDefProps.ThumbnailChart = {
                ChartName: rd_paramValues[ index ]
            };
        }else if(rd_params[ index ] === 'ReportTranslatedSearchCriteria'){
            searchTraslatedCriteria.push(rd_paramValues[ index ]);
            //Report initiation should start, only when translated query is returned
            initRepDisplay = false;
        }
    }

    ReportDefProps.ReportSearchInfo = ReportSearchInfo;
    if( ReportTable1.ColumnPropName !== undefined ) {
        ReportDefProps.ReportTable1 = ReportTable1;
    }
    var reportParams = {};
    reportParams.ReportDefProps = ReportDefProps;
    reportParams.ChartVisibility = ChartVisibility;
    if(searchTraslatedCriteria.length > 0){
        reportParams.searchTraslatedCriteria = searchTraslatedCriteria;
    }

    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
    appCtxService.updatePartialCtx( 'searchIncontextInfo', {} );
    return initRepDisplay;
};

/**
 *
 * @param  {any} params - the
 */
export let updateSelectedReport = function( data, params ) {
    var selectedReportDef = null;
    if( selectedReportDef === null ) {
        //not live in current session.. get it from SOA
        var policyId = soa_kernel_propertyPolicyService.register( {
            types: [ {
                name: 'ReportDefinition',
                properties: [ {
                    name: 'rd_parameters'
                }, {
                    name: 'rd_param_values'
                }, {
                    name: 'owning_user'
                } ]
            } ]
        } );
        var soaInput = [];
        soaInput.push( {
            source: 'Active Workspace',
            reportDefinitionId: params.reportId
        } );
        soa_kernel_soaService.postUnchecked( 'Reports-2008-06-CrfReports', 'getReportDefinitions', {
            inputCriteria: soaInput
        } ).then(
            function( response ) {
                exports.showReportInstructions( data, params.title );

                soa_kernel_propertyPolicyService.unregister( policyId );
                selectedReportDef = response.reportdefinitions[ 0 ].reportdefinition;

                appCtxService.updatePartialCtx( 'ReportsContext.selected', selectedReportDef );
                var reportObj = response.ServiceData.modelObjects[ selectedReportDef.uid ];
                if( reportObj.props.rd_parameters.dbValues.length > 0 && selectedReportDef ) {
                    var initRepDisplay = true;
                    //this is a execution of saved report.fetch rd_param_values and rd_parameters from selected report def
                    //and setup the ReportDefProps in report ctx.use ReportObject from response.ServiceData.
                    initRepDisplay = exports.rebuildReportDefProps( reportObj );

                    if( params.configure === 'false' && initRepDisplay ) {
                        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
                        appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
                    } else if( params.configure === 'false' ) {
                        eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
                    }

                }
                if( params.configure === 'true' ) {
                    var commandId = 'Rb0ConfigureReport';
                    var location = 'aw_toolsAndInfo';
                    //Shows Configure Report panel with search string.
                    commandPanelService.activateCommandPanel( commandId, location );
                }

                return selectedReportDef;
            } );
    }
};

/**
 * processFinalColumnsForChart
 *
 * @function filterUpdated
 * @param {int} totalObjsFound totalObjsFound
 * @returns {Object} containing boolean indicating whether a refresh on a table is needed
 */
export let filterUpdated = function( data ) {
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    var showPreview = appCtxService.getCtx( 'ReportsContext.showPreview' );
    var updateTable = false;
    // check to see if showpreview has been click
    // if it has not been clicked, we do not want to auto refresh charts
    if( showPreview ) {
        if( repParameters.ChartVisibility.chart1Visible ) {
            eventBus.publish( 'updateChartGen1' );
        }
        if( repParameters.ChartVisibility.chart2Visible ) {
            eventBus.publish( 'updateChartGen2' );
        }
        if( repParameters.ChartVisibility.chart3Visible ) {
            eventBus.publish( 'updateChartGen3' );
        }

        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            // conditions in order to properly destroy and recreate the table with new specifications
            //updateTable = true;
            //appCtxService.updatePartialCtx( 'updateTable', updateTable );
            eventBus.publish( 'gridView.plTable.reload' );
        }
        eventBus.publish( 'showReportService.updateTotalFoundOnCtx' );
        var output = {
            updateTable
        };
        exports.updateTimeOfRequest();
        exports.updateTotalFound( data );
        return output;
    }
};

var getNumericFilterValue = function( filter ) {
    if( filter.categoryType === 'NumericRangeFilter' ) {
        var range = filter.name.split( ' - ' );
        return {
            searchFilterType: 'NumericFilter',
            stringValue: '',
            selected: true,
            stringDisplayValue: '',
            startDateValue: '',
            endDateValue: '',
            startNumericValue: Number( range[ 0 ] ),
            endNumericValue: Number( range[ 1 ] ),
            count: filter.count,
            startEndRange: 'NumericRange'
        };
    }
    return {
        searchFilterType: 'NumericFilter',
        stringValue: filter.internalName,
        selected: true,
        stringDisplayValue: filter.name,
        startDateValue: '',
        endDateValue: '',
        startNumericValue: filter.startNumericValue,
        endNumericValue: filter.endNumericValue,
        count: filter.count,
        startEndRange: ''
    };
};

/**
 * getSearchFilterMap
 *
 * @function getSearchFilterMap
 * @param {Object} ctx ctx
 * @returns {Object} containing filters to be processed by table
 */
export let getSearchFilterMap = function( ctx ) {
    var output = {};
    // retrieve filters
    var filters = ctx.searchIncontextInfo.searchResultFilters;
    if( filters && filters.length > 0 ) {
        var dateFilterToProcess = [];
        for( var y = 0; y < filters.length; y++ ) {
            var keyValueData = [];
            var filterCategory = null;
            // iterate on each filterValue per filter
            for( var x = 0; x < filters[ y ].filterValues.length; x++ ) {
                filterCategory = filters[ y ].filterValues[ x ].categoryName === undefined ? filters[ y ].searchResultCategoryInternalName : filters[ y ].filterValues[ x ].categoryName;
                if( filters[ y ].filterValues[ x ].type !== 'DateFilter' && filters[ y ].filterValues[ x ].type !== 'DrilldownDateFilter' ) {
                    if( filters[ y ].filterValues[ x ].type === 'NumericFilter' ) {
                        keyValueData.push( getNumericFilterValue( filters[ y ].filterValues[ x ] ) );
                    } else {
                        keyValueData.push( {
                            searchFilterType: 'StringFilter',
                            stringValue: filters[ y ].filterValues[ x ].internalName,
                            selected: true,
                            stringDisplayValue: filters[ y ].filterValues[ x ].name,
                            startDateValue: '',
                            endDateValue: '',
                            startNumericValue: 0,
                            endNumericValue: 0,
                            count: filters[ y ].filterValues[ x ].count,
                            startEndRange: ''
                        } );
                    }
                    output[ filterCategory ] = keyValueData;
                } else {
                    if( !dateFilterToProcess.includes( filters[ y ] ) ) {
                        dateFilterToProcess.push( filters[ y ] );
                    }
                }
            }
        }

        if( dateFilterToProcess.length > 0 ) {
            dateFilterToProcess.forEach( element => {
                element.filterValues.forEach( selectedFilter => {
                    var tempArray = [];
                    var filterType = 'DateFilter';
                    var startDateValue = '';
                    var endDateValue = '';
                    var filterCategory = selectedFilter.categoryName;
                    if( ( selectedFilter.type === 'DrilldownDateFilter' || selectedFilter.type === 'DateFilter' ) && selectedFilter.categoryName !== undefined && ( selectedFilter
                            .categoryName.endsWith( '0Z0_week' ) || selectedFilter.categoryName.endsWith( '0Z0_year_month_day' ) ||
                            selectedFilter.categoryName.endsWith( '0Z0_year' ) || selectedFilter.categoryName.endsWith( '0Z0_year_month' ) ) ) {
                        filterType = 'StringFilter';
                    } else if( selectedFilter.categoryType !== undefined && selectedFilter.categoryType === 'DateRangeFilter' ) {
                        var dateCat = ctx.searchIncontextInfo.searchFilterCategories.filter( function( category ) {
                            return category.internalName === element.searchResultCategoryInternalName;
                        } );
                        var startValue = dateCat[ 0 ].daterange.startDate.dateApi.dateObject;
                        var endValue = dateCat[ 0 ].daterange.endDate.dateApi.dateObject;
                        var internalName = filterPanelUtils.getDateRangeString( startValue, endValue );
                        var dateRangeFilter = filterPanelUtils.getDateRangeFilter( internalName.substring( 12, internalName.length ) );
                        startDateValue = dateRangeFilter.startDateValue;
                        endDateValue = dateRangeFilter.endDateValue;
                        filterCategory = element.searchResultCategoryInternalName;
                    }

                    var filter = {
                        searchFilterType: filterType,
                        stringValue: selectedFilter.internalName,
                        selected: true,
                        stringDisplayValue: selectedFilter.name,
                        startDateValue: startDateValue,
                        endDateValue: endDateValue,
                        startNumericValue: 0,
                        endNumericValue: 0,
                        count: selectedFilter.count,
                        startEndRange: ''
                    };
                    tempArray.push( filter );

                    if( output.hasOwnProperty( filterCategory ) ) {
                        var existArray = output[ filterCategory ];
                        existArray.push( filter );
                        output[ filterCategory ] = existArray;
                    } else {
                        output[ filterCategory ] = tempArray;
                    }
                } );
            } );
        }
    }
    return output;
};

// Method to disable condition for chart visibility
export let chartRemoveGen1 = function() {
    return {
        dataIsReadyChartGen1: false
    };
};

// Method to disable condition for chart visibility
export let chartRemoveGen2 = function() {
    return {
        dataIsReadyChartGen2: false
    };
};

// Method to disable condition for chart visibility
export let chartRemoveGen3 = function() {
    return {
        dataIsReadyChartGen3: false
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen1 = function() {
    return {
        dataIsReadyChartGen1: true
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen2 = function() {
    return {
        dataIsReadyChartGen2: true
    };
};

// Method to enable condition for chart visibility
export let chartReadyGen3 = function() {
    return {
        dataIsReadyChartGen3: true
    };
};

export let createChartFromArray1 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart1.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart1.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart1.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;

        // Add logic to set chart custom config from set layout
        var chartPoints = createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart1NoData = true;
            data.chartProviders.genericChart1.title = '';
        } else {
            data.chart1NoData = false;
        }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 1 for ' + reportConfig );
    }
};

export let createChartFromArray2 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart2.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart2.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart2.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
        // Add logic to set chart custom config from set layout
        var chartPoints = createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart2NoData = true;
            data.chartProviders.genericChart2.title = '';
        } else {
            data.chart2NoData = false;
        }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 2 for ' + reportConfig );
    }
};

export let createChartFromArray3 = function( searchResultFilters, filterCategories, filterMap, data, reportConfig ) {
    try {
        data.chartProviders.genericChart3.title = reportConfig.ChartTitle;
        data.chartProviders.genericChart3.chartType = reportConfig.ChartTpIntName !== undefined ? reportConfig.ChartTpIntName : reportConfig.ChartType.toLowerCase();
        data.chartProviders.genericChart3.seriesInternalName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
        // Add logic to set chart custom config from set layout
        var chartPoints = createChartFromArrayOfSeriesInternal( searchResultFilters, filterCategories, filterMap, reportConfig );
        if( chartPoints.length === 0 ) {
            data.chart3NoData = true;
            data.chartProviders.genericChart3.title = '';
        } else {
            data.chart3NoData = false;
        }
        return chartPoints;
    } catch ( error ) {
        console.log( 'Failure occurred in Chart 3 for ' + reportConfig );
    }
};

export let _dateFilterMarker = '_0Z0_';

/**
 * createChartFromArrayOfSeriesInternal
 *
 * @function createChartFromArrayOfSeriesInternal
 * @param {ObjectArray} searchResultFilters searchResultFilters
 * @param {ObjectArray} filterCategories filterCategories
 * @param {Object} filterMap filterMap
 * @param {Object} reportConfig reportConfig
 * @returns {ObjectArray} array series for entire chart
 */
export let createChartFromArrayOfSeriesInternal = function( searchResultFilters, filterCategories, filterMap, reportConfig ) {
    arrayOfSeriesDataForChart = [];
    keyValueDataForChart = [];
    var internalNameData;
    var searchFilterColumns3 = [];

    // Programatic generation of series
    var searchFilterName = Array.isArray( reportConfig.ChartPropInternalName ) ? reportConfig.ChartPropInternalName[ 0 ] : reportConfig.ChartPropInternalName;
    keyValueDataForChart = [];
    _.forEach( filterCategories, function( category ) {
        // extract internal data for appropriate category to use later
        if( category.internalName === searchFilterName ) {
            internalNameData = category;
        }
    } );

    if( internalNameData === undefined || filterMap === undefined ) {
        return arrayOfSeriesDataForChart;
    }

    //Merge filters that have multiple keys (typically date filters)
    var groupedFilters = awChartDataProviderService.groupByCategory( filterMap );

    //Create a column for each filter option in that category
    var searchFilterColumns1 = groupedFilters[ internalNameData.internalName ];

    searchFilterColumns3 = [];
    // if no searchResultFilters no need to filter out results
    var count = 1;

    if( searchResultFilters !== undefined && searchResultFilters.length !== 0 ) {
        // need to check filter matched column category
        _.every( searchResultFilters, function( searchFilter ) {
            var columnFound = false;
            if( searchFilter.searchResultCategoryInternalName === internalNameData.internalName ) {
                _.forEach( searchFilterColumns1, function( column ) {
                    // filtering from selected columns when filter should apply to category
                    if( column.selected ) {
                        searchFilterColumns3.push( column );
                        columnFound = true;
                    }
                } );

                //check if columns found, if true- don't need to process other filters break the loop.
                if( columnFound ) {
                    //returning false to break
                    return false;
                }
                return true;
            } else if( count === searchResultFilters.length ) {
                // condition to add those that do not need to be filtered out
                // if there are no filters left but there is data still, we need to add it to graph
                _.forEach( searchFilterColumns1, function( column ) {
                    searchFilterColumns3.push( column );
                } );
                return false; // so that every() will break
            }
            count++;
            return true;
        } );
    } else {
        // if nothing has to be filtered out:
        searchFilterColumns3 = searchFilterColumns1;
    }
    var dataPointsChart = searchFilterColumns3;

    //Remove non string filter values
    //The "merged" date filters will be string filters
    if( internalNameData.type === 'DateFilter' ) {
        var searchFilterColumns2 = searchFilterColumns1.filter( function( option ) {
            return option.searchFilterType === 'StringFilter';
        } );
        searchFilterColumns3 = [];
        _.forEach( internalNameData.filterValues, function( searchFilter ) {
            _.forEach( searchFilterColumns2, function( option ) {
                if( option.stringValue === searchFilter.internalName ) {
                    searchFilterColumns3.push( option );
                }
            } );
        } );
        dataPointsChart = searchFilterColumns3;
        // case for numeric filter
    } else if( internalNameData.type === 'NumericFilter' ) {
        var isRangeFilter = false;
        searchFilterColumns3 = searchFilterColumns1.filter( function( option ) {
            if( option.startEndRange === 'NumericRange' ) {
                isRangeFilter = true;
            }
            return option.startEndRange !== 'NumericRange';
        } );
        if( isRangeFilter ) {
            dataPointsChart = searchFilterColumns3;
        }
    }
    //  should handle NONE values still
    exports.processUnassignedColumnsForChart( dataPointsChart );
    //Build a column for each of the remaining filters
    dataPointsChart = exports.processFinalColumnsForChart( dataPointsChart );

    //This is additional processing in case of Date filter..
    //We need to keep only leaf level columns which are not selected. Like Keep only Month if YEAR is also available.
    //One more additional step required when leaf level Day value filter is applied.
    //Only selected Day value should be shown on chart.
    var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
    var dayFilterApplied = false;
    if( reportSearchInfo && reportSearchInfo.activeFilterMap.hasOwnProperty( searchFilterName + '_0Z0_year_month_day' ) ) {
        dayFilterApplied = true;
    }
    if( internalNameData.type === 'DateFilter' ) {
        dataPointsChart = dataPointsChart.filter( function( dataPoint ) {
            if( dayFilterApplied && dataPoint.internalExtension === '_0Z0_year_month_day' ) {
                return dataPoint.selected;
            }
            return !dataPoint.selected;
        } );
    }

    // for every data point create a label and value
    for( var i = 0; i < dataPointsChart.length; i++ ) {
        keyValueDataForChart.push( {
            label: dataPointsChart[ i ].stringDisplayValue,
            name: dataPointsChart[ i ].stringDisplayValue,
            value: dataPointsChart[ i ].count
        } );
    }
    // push series of datapoints to entire chart series array
    arrayOfSeriesDataForChart.push( {
        seriesName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName,
        keyValueDataForChart: keyValueDataForChart
    } );
    return arrayOfSeriesDataForChart;
};

/**
 * processFinalColumnsForChart
 *
 * @function processFinalColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 * @returns {ObjectArray} processed final columns
 */
export let processFinalColumnsForChart = function( searchFilterColumns5 ) {
    return searchFilterColumns5.map( function( option ) {
        //Add an extension to date filters
        option.internalExtension = awChartDataProviderService.getFilterExtension( option );
        //Give a label and value
        option.value = option.count;
        option.label = option.stringDisplayValue;
        //Append a checkmark if the filter is active
        if( option.selected ) {
            option.label = '\u2713 ' + option.label;
        }
        return option;
    } );
};

/**
 * processUnassignedColumnsForChart
 *
 * @function processUnassignedColumnsForChart
 * @param {ObjectArray} dataPointsChart dataPointsChart
 */
export let processUnassignedColumnsForChart = function( dataPointsChart ) {
    _.forEach( dataPointsChart, function( option ) {
        if( option.stringValue === '$NONE' && option.stringDisplayValue === '' ) {
            option.stringDisplayValue = localTextBundle.noFilterValue;
        }
    } );
};

export let showReportInstructions = function( data, title ) {
    var reportName = data.i18n.instructionsTitle;
    reportName = reportName.replace( '{0}', title );
    //instructionswidget
    var titleElement = document.getElementById( 'instructionswidget' );
    titleElement.innerText = reportName;
};

/**
 * initiateReportDisplay
 *
 * @function initiateReportDisplay
 * @param {Object} data data
 * @param {Object} ctx ctx
 * @returns {Object} containing boolean indicating we need to show instructions
 */
export let initiateReportDisplay = function( data, ctx ) {
    appCtxService.updatePartialCtx( 'ReportsContext.showPreview', false );
    var params = ctx.state.params;
    var title = params.title;
    if( params.configure === 'true' ) {
        data.instructions = true;
    }
    if( ctx.selected && ctx.selected.type === 'ReportDefinition' ) {
        appCtxService.updatePartialCtx( 'ReportsContext.selected', ctx.selected );
        var initRepDisplay = exports.rebuildReportDefProps( ctx.selected );
        if( initRepDisplay ) {
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
            appCtxService.ctx.searchCriteria = appCtxService.ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        }
        else{
            eventBus.publish( 'initiateCalltoFetchTranslatedSearchCriteria' );
        }
    } else if( ctx.selected === null ) {
        angular.element( '.aw-layout-locationTitle' ).scope().headerTitle = title;
        document.getElementsByTagName( 'aw-sublocation-title' )[ 0 ].style.display = 'none';

        //get ReportDefinition Object and update it in reports ctx
        exports.updateSelectedReport( data, params );
    }
};

/**
 * Register the policy
 * @returns {any} policyId
 */
export let registerPolicy = function() {
    var reportDefs = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    var types = {};
    var typeList = [];
    if( reportDefs && reportDefs.ReportTable1 ) {
        var propList = reportDefs.ReportTable1.ColumnPropInternalName;
        for( var x = 0; x < propList.length; x++ ) {
            var propAndObj = propList[ x ].split( '.' );
            var typePropList = {};
            typePropList.name = propAndObj[ 0 ];
            var prop = {};
            prop.name = propAndObj[ 1 ];
            typePropList.properties = [ prop ];
            typeList.push( typePropList );
        }
        types.types = typeList;
        return soa_kernel_propertyPolicyService.register( types );
    }
};

export let getValidSortCriteriaField = function( sortCriteria, data ) {
    if( data.columns ) {
        var propName = sortCriteria.fieldName;
        var selColumn = data.columns.filter( function( column ) {
            return column.name === propName;
        } );
        return selColumn.length > 0 ? selColumn[ 0 ].typeName + '.' + propName : propName;
    }
};

/**
 *
 * Load Table
 * @param {any} data - Data
 * @param  {any} searchInput - The Search Input
 * @param  {any} columnConfigInput - The Column Config Input
 * @param  {any} saveColumnConfigData - Save Column Config Data
 *
 * @returns {any} response
 */
export let loadData = function( data, searchInput, columnConfigInput, saveColumnConfigData ) {
    //register property policy
    var policyId = exports.registerPolicy();

    if( searchInput.searchSortCriteria !== undefined && searchInput.searchSortCriteria.length > 0 && searchInput.cursor !== undefined && searchInput.cursor.startIndex === 0 ) {
        var fieldName = exports.getValidSortCriteriaField( searchInput.searchSortCriteria[ 0 ], data );
        searchInput.searchSortCriteria[ 0 ].fieldName = fieldName;
    }

    return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
        columnConfigInput: columnConfigInput,
        inflateProperties: false,
        noServiceData: false,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput
    } ).then(
        function( response ) {
            soa_kernel_propertyPolicyService.unregister( policyId );
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }

            // Create view model objects
            response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects
                .map( function( vmo ) {
                    return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                } ) : [];

            return response;
        } );
};

/**
 * loadColumns
 *
 * @function loadColumns
 * @param {Object} dataprovider dataprovider
 * @param {Object} reportTable reportTable
 */
export let loadColumns = function( dataprovider, reportTable ) {
    var corrected = [];

    var typeN = reportTable.ColumnPropInternalName[ 0 ].split( '.' );
    var initialCol = {
        name: typeN[ 1 ],
        displayName: reportTable.ColumnPropName[ 0 ],
        typeName: typeN[ 0 ],
        width: 250,
        pinnedLeft: true,
        enableColumnMenu: true
    };

    corrected.push( initialCol );

    for( var x = 1; x < reportTable.ColumnPropInternalName.length; x++ ) {
        typeN = reportTable.ColumnPropInternalName[ x ].split( '.' );
        var obj = {
            name: typeN[ 1 ],
            displayName: reportTable.ColumnPropName[ x ],
            typeName: typeN[ 0 ],
            width: 300
        };
        if( typeN[ 1 ] === 'release_status_list' || typeN[ 1 ] === 'release_statuses' ) {
            obj.enableSorting = false;
        }
        corrected.push( obj );
    }
    dataprovider.columnConfig = {
        columns: corrected
    };
    return corrected;
};

/**
 * removeDataTable
 *
 * @function removeDataTable
 * @return {Object} object with dataIsReadyTable boolean to trigger condition for removind the data table
 */
export let removeDataTable = function() {
    return {
        dataIsReadyTable: false
    };
};

/**
 * updateDataTable - set boolean to trigger condition for when table has already been updated
 *
 * @function updateDataTable
 */
export let updateDataTable = function() {
    var updateTable = appCtxService.getCtx( 'updateTable' );
    if( updateTable ) {
        appCtxService.updatePartialCtx( 'updateTable', false );
    }
};

/**
 * updateTitle
 *
 * @function updateTitle
 * @param {Object} titleProps with title configurations
 */
export let updateTitle = function( titleProps ) {
    var titleElement = document.getElementById( 'titleReport' );
    if( titleProps ) {
        titleElement.innerText = titleProps.TitleText;
        titleElement.style.fontSize = 'x-large';
        titleElement.style.color = titleProps.TitleColor;
        titleElement.style.fontFamily = titleProps.TitleFont;
    } else {
        titleElement.innerText = '';
    }
};

/**
 *
 * @function updateTotalFound
 * @param {any} data -
 */
export let updateTotalFound = function( data ) {
    var totFnd = appCtxService.ctx.ReportsContext.reportParameters.totalFound;
    var strTotalFnd = data.totalFoundString.propertyDisplayName + totFnd;
    var foundElement = document.getElementById( 'totalFoundLabel' );
    foundElement.innerText = strTotalFnd;
    foundElement.style.fontSize = 'medium';
};

/**
 * updateTimeOfRequest
 *
 * @function updateTimeOfRequest
 */
export let updateTimeOfRequest = function() {
    var currentdate = new Date();
    var datetime = 'Last Updated: ' + currentdate.getDate() + '/' +
        ( currentdate.getMonth() + 1 ) + '/' +
        currentdate.getFullYear() + ' @ ' +
        currentdate.getHours() + ':' +
        currentdate.getMinutes() + ':' +
        currentdate.getSeconds();
    var foundElement = document.getElementById( 'timeOfRequestLabel' );
    foundElement.innerText = datetime;
    foundElement.style.fontSize = 'small';
};

/**
 * getNumCharts
 *
 * @function getNumCharts
 * @param {Object} charts charts config objects
 * @return {int} number of chosen charts
 */
export let getNumCharts = function( charts ) {
    var numCharts = 0;
    if( charts.chart1Visible ) {
        numCharts++;
    }
    if( charts.chart2Visible ) {
        numCharts++;
    }
    if( charts.chart3Visible ) {
        numCharts++;
    }
    return numCharts;
};

/**
 *
 * @function showPreviewClicked
 * @param {Object} data data variable from config panel scope
 * @return {Object} containing configuration for show preview panel
 */
export let showPreviewClicked = function( data ) {
    // showPreviewClicked aknowledgement
    var previewShown = appCtxService.ctx.ReportsContext.showPreview;

    // Handle Condition for when nothing is updated:
    var repParameters = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    // var repParameters = appCtxService.getCtx( 'ReportParameters' );

    var updateTable = false;
    // Checks if there are items to update
    if( previewShown && repParameters !== undefined && repParameters.UpdatedLayoutElement !== undefined &&
        ( repParameters.UpdatedLayoutElement.ElementToUpdate.length > 0 || repParameters.UpdatedLayoutElement.ElementToRemove.length > 0 ) ) {
        var updateElem = repParameters.UpdatedLayoutElement;
        var output = {};

        var charts = repParameters.ChartVisibility;
        // Check to see if there are no elements to update

        _.forEach( updateElem.ElementToUpdate, function( element ) {
            if( element === 'ReportChart1' ) {
                eventBus.publish( 'updateChartGen1' );
            }

            if( element === 'ReportChart2' ) {
                eventBus.publish( 'updateChartGen2' );
            }

            if( element === 'ReportChart3' ) {
                eventBus.publish( 'updateChartGen3' );
            }

            if( element === 'ReportTitle' ) {
                exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
            }

            if( element === 'ReportTable1' ) {
                // eventBus.publish( 'updateTableProvider' );
                updateTable = true;
            }
        } );

        _.forEach( updateElem.ElementToRemove, function( element ) {
            if( element === 'ReportChart1' ) {
                eventBus.publish( 'chartRemovedGen1' );
            }
            if( element === 'ReportChart2' ) {
                eventBus.publish( 'chartRemovedGen2' );
            }
            if( element === 'ReportChart3' ) {
                eventBus.publish( 'chartRemovedGen3' );
            }
            if( element === 'ReportTitle' ) {
                exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
            }
            if( element === 'ReportTable1' ) {
                eventBus.publish( 'removeTable' );
            }
        } );

        // get number of charts to persist layout correctly
        var numCharts = exports.getNumCharts( charts );
        if( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
        }

        var tableChosen = false;
        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            tableChosen = true;
        }

        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: charts.chart1Visible,
            dataIsReadyChart2: charts.chart2Visible,
            dataIsReadyChart3: charts.chart3Visible,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen
        };
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    } else if( !previewShown && repParameters.ReportDefProps !== undefined ) {
        var titleChosen = false;

        if( repParameters.ReportDefProps.ReportTitle !== undefined ) {
            titleChosen = true;
            exports.updateTitle( repParameters.ReportDefProps.ReportTitle );
        }

        // need check number of charts
        var chartVisibility = repParameters.ChartVisibility;
        // var numCharts = 2;
        numCharts = 0;

        if( chartVisibility.chart1Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen1' );
            // call exports directly
        }
        if( chartVisibility.chart2Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen2' );
        }
        if( chartVisibility.chart3Visible ) {
            numCharts++;
            eventBus.publish( 'updateChartGen3' );
        }

        tableChosen = false;
        if( repParameters.ReportDefProps.ReportTable1 !== undefined ) {
            tableChosen = true;
        }
        output = {
            updateTable,
            dataIsReady: true,
            numCharts,
            dataIsReadyChart1: chartVisibility.chart1Visible,
            dataIsReadyChart2: chartVisibility.chart2Visible,
            dataIsReadyChart3: chartVisibility.chart3Visible,
            dataIsReadyTable: tableChosen,
            dataIsReadyTitle: titleChosen
        };
        appCtxService.updatePartialCtx( 'ReportsContext.showPreview', true );
        appCtxService.updatePartialCtx( 'updateTable', output.updateTable );
    }
    exports.updateTimeOfRequest();
    exports.updateTotalFound( data );
    return output;
};

export let clearReportsCtx = function() {
    appCtxService.unRegisterCtx( 'ReportsContext' );
};

export let callRepGetCategories = function( response ) {
    return searchCommonUtils.callGetCategories( response );
};

/**
 *
 * @function callRepGetProviderName
 * @param {Object} ctx - ctx
 * @return {Object} data provider name
 */
export let callRepGetProviderName = function( ctx ) {
    if( ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName ) {
        return ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.dataProviderName;
    }
    return 'Awp0FullTextSearchProvider';
};

/**
 *
 * @function callRepGetSearchCriteria
 * @param {Object} ctx - ctx
 * @return {Object} additional search criteria to perform search
 */
export let callRepGetSearchCriteria = function( ctx ) {
    var searchCriteria = {
        searchString: ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria
    };
    var reportSearchInfo = ctx.ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo;
    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportSearchInfo.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportSearchInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }
    return searchCriteria;
};

var updateFiltersAndInitiateReportDisplay = function( reportSearchInfo, filterVals, filter, data ) {
    appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
    appCtxService.updatePartialCtx( 'ReportsContext.filterApplied', true );
    var filterChip = {
        uiIconId: 'miscRemoveBreadcrumb',
        chipType: 'BUTTON',
        labelDisplayName: filter.displayName + ': ' + filterVals.name,
        labelInternalName: filterVals.categoryName
    };
    data.filterChips.push( filterChip );
    _runtimeFilterApplied = true;
    eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
};

export let applyFilterAndInitiateReportUpdate = function( filterValue, filterProperty, data ) {
    var searchFiltCat = appCtxService.getCtx( 'searchIncontextInfo.searchFilterCategories' );
    var filterPropertyInternalName = null;
    if( data.chartProviders ) {
        // Get the selected chart provider and from chart provider get the series internal name
        // if present and then it will be used to filter based on internal name
        var selChartProvider = _.find( data.chartProviders, {
            title: filterProperty
        } );
        if( selChartProvider && selChartProvider.seriesInternalName ) {
            filterPropertyInternalName = selChartProvider.seriesInternalName;
        }
    }

    if( searchFiltCat && searchFiltCat.length !== 0 ) {
        _.every( searchFiltCat, function( filter ) {
            // Compare if property display name is matching and if not then try to match the internal name
            if( filter.displayName === filterProperty ||
                filterPropertyInternalName && filter.internalName === filterPropertyInternalName ) {
                _.every( filter.filterValues, function( filterVals ) {
                    if( filterVals.name === filterValue ) {
                        var selectedFilter = {};
                        if( filterVals.type === 'NumericFilter' ) {
                            selectedFilter = {
                                searchFilterType: 'NumericFilter',
                                stringDisplayValue: filterVals.name,
                                stringValue: filterVals.internalName,
                                startNumericValue: filterVals.startNumericValue,
                                endNumericValue: filterVals.endNumericValue
                            };
                        } else {
                            selectedFilter = {
                                searchFilterType: 'StringFilter',
                                stringDisplayValue: filterVals.name,
                                stringValue: filterVals.internalName
                            };
                        }
                        var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
                        //check if report has existing filters
                        if( !_runtimeFilterApplied && Object.keys( reportSearchInfo.activeFilterMap ).length !== 0 ) {
                            _reportexistingFil = JSON.parse( JSON.stringify( reportSearchInfo.activeFilterMap ) );
                            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation.ReportExistingFilters', _reportexistingFil );
                        }
                        var tempArray = [];
                        tempArray.push( selectedFilter );
                        if( !reportSearchInfo.activeFilterMap.hasOwnProperty( filterVals.categoryName ) ) {
                            reportSearchInfo.activeFilterMap[ filterVals.categoryName ] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        } else if( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( filterVals.categoryName ) ) {
                            delete reportSearchInfo.activeFilterMap[ filterVals.categoryName ];
                            reportSearchInfo.activeFilterMap[ filterVals.categoryName ] = tempArray;
                            updateFiltersAndInitiateReportDisplay( reportSearchInfo, filterVals, filter, data );
                        }
                        return false;
                    }
                    return true;
                } );
                return false;
            }
            return true;
        } );
    }
};

export let removeReportFilter = function( data, filterChips, chipToRemove ) {
    filterChips.splice( filterChips.indexOf( chipToRemove ), 1 );
    data.filterChips = filterChips;
    var reportSearchInfo = appCtxService.getCtx( reportsCommSrvc.getReportsCtxSearchInfo() );
    if( reportSearchInfo.activeFilterMap.hasOwnProperty( chipToRemove.labelInternalName ) ) {
        delete reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ];
        //check if there are any stored existing filters stored.
        if( _reportexistingFil !== undefined && _reportexistingFil.hasOwnProperty( chipToRemove.labelInternalName ) ) {
            reportSearchInfo.activeFilterMap[ chipToRemove.labelInternalName ] = JSON.parse( JSON.stringify( _reportexistingFil[ chipToRemove.labelInternalName ] ) );
        }
        appCtxService.updatePartialCtx( reportsCommSrvc.getReportsCtxSearchInfo(), reportSearchInfo );
        eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
    }
};

var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};

loadConfiguration();

export default exports = {
    rebuildReportDefProps,
    updateSelectedReport,
    filterUpdated,
    getSearchFilterMap,
    chartRemoveGen1,
    chartRemoveGen2,
    chartRemoveGen3,
    chartReadyGen1,
    chartReadyGen2,
    chartReadyGen3,
    createChartFromArray1,
    createChartFromArray2,
    createChartFromArray3,
    _dateFilterMarker,
    createChartFromArrayOfSeriesInternal,
    processFinalColumnsForChart,
    processUnassignedColumnsForChart,
    showReportInstructions,
    initiateReportDisplay,
    registerPolicy,
    getValidSortCriteriaField,
    loadData,
    loadColumns,
    removeDataTable,
    updateDataTable,
    updateTitle,
    updateTotalFound,
    updateTimeOfRequest,
    getNumCharts,
    showPreviewClicked,
    clearReportsCtx,
    callRepGetCategories,
    applyFilterAndInitiateReportUpdate,
    removeReportFilter,
    callRepGetProviderName,
    callRepGetSearchCriteria,
    fetchAndUpdateTranslatedSearchCriteria
};
/**
 * Marker for date filters
 *
 * @member _dateFilterMarker
 * @memberOf NgServices.awChartDataProviderService
 */
app.factory( 'showreportservice', () => exports );
