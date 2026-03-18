// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * JS Service defined to handle Add Report related method execution only.
 *
 * @module js/myDashboardTileService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import showReportSrvc from 'js/showReportService';
import graphQLSvc from 'js/graphQLService';
import logger from 'js/logger';

var exports = {};

/**
 * Get information related to search string, filters ,thumbnail chart,
 * data provider and search criterias.
 * @param  {any} selectedReportDef - the report object
 * @returns {any} reportTileInfo -
 */
var getReportSearchAndChartParametersForTile = function( selectedReportDef ) {
    var rd_params = selectedReportDef.props.rd_parameters.dbValues;
    var rd_paramValues = selectedReportDef.props.rd_param_values.dbValues;
    var reportTileInfo = {
        activeFilterMap: {}
    };
    var thumbnailChartFound = false;
    var thumbnailChart = null;
    for( var index = 0; index < rd_params.length; index++ ) {
        if( rd_params[ index ].startsWith( 'ReportFilter' ) ) {
            var filtrSplit = rd_params[ index ].split( '_' );
            if( filtrSplit[ 0 ] === 'ReportFilterLargeValue' ) {
                // If multiple filter values they are stored as ReportFilterLargeValue_1_1
                //filterName key will be always at constant location in
                var filtIndex = index - 1 - parseInt( filtrSplit[ 2 ] );
                var filtKey = rd_paramValues[ filtIndex ];
                var value = [];
                if( reportTileInfo.activeFilterMap.hasOwnProperty( filtKey ) ) {
                    value = reportTileInfo.activeFilterMap[ filtKey ];
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    reportTileInfo.activeFilterMap[ filtKey ] = value;
                } else {
                    value.push( JSON.parse( rd_paramValues[ index ] ) );
                    reportTileInfo.activeFilterMap[ filtKey ] = value;
                }
            } else if( filtrSplit[ 0 ] === 'ReportFilterValue' ) {
                reportTileInfo.activeFilterMap[ rd_paramValues[ index - 1 ] ] = JSON.parse( rd_paramValues[ index ] );
            }
        } else if( rd_params[ index ] === 'DataProvider' ) {
            reportTileInfo.dataProviderName = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'AdditionalSearchCriteria' ) {
            reportTileInfo.additionalSearchCriteria = JSON.parse( rd_paramValues[ index ] );
        } else if( rd_params[ index ] === 'ReportSearchCriteria' ) {
            reportTileInfo.SearchCriteriaString = rd_paramValues[ index ];
        } else if( rd_params[ index ] === 'ThumbnailChart' ) {
            thumbnailChartFound = true;
            var selectThumbChart = rd_paramValues[ index ];
            selectThumbChart += '_0';
            var thumbIndex = rd_params.indexOf( selectThumbChart );
            var reportChart = JSON.parse( rd_paramValues[ thumbIndex ] );
            reportChart.ChartPropInternalName = JSON.parse( rd_paramValues[ thumbIndex + 1 ] );
            thumbnailChart = reportChart;
        }
    }
    if( !thumbnailChartFound && rd_params.length > 0 ) {
        thumbIndex = rd_params.indexOf( 'ReportChart1_0' );
        var ReportChart1 = JSON.parse( rd_paramValues[ thumbIndex ] );
        ReportChart1.ChartPropInternalName = JSON.parse( rd_paramValues[ thumbIndex + 1 ] );
        thumbnailChart = ReportChart1;
    }

    //set data provider name and construct search criteria
    setDataProviderName( reportTileInfo );
    constructSearchCriteria( reportTileInfo );

    reportTileInfo.ChartConfiguration = thumbnailChart;
    return reportTileInfo;
};

/**
 * Sets the Data provider name for reportTileInfo object to
 * be used as input for performSearch SOA call.
 * @param  {any} reportTileInfo - the report tile info object
 */
var setDataProviderName = function( reportTileInfo ) {
    if( !reportTileInfo.dataProviderName ) {
        reportTileInfo.dataProviderName = 'Awp0FullTextSearchProvider';
    }
};

/**
 * Constructs searchCriteria to be used as input for performSearch SOA call.
 * @param  {any} reportTileInfo - the report tile info object
 */
var constructSearchCriteria = function( reportTileInfo ) {
    var searchCriteria = {
        searchString: reportTileInfo.SearchCriteriaString
    };

    // Iterate for all entries in additional search criteria and add to main search criteria
    for( var searchCriteriaKey in reportTileInfo.additionalSearchCriteria ) {
        if( searchCriteriaKey !== 'SearchCriteria' && searchCriteriaKey !== 'activeFilterMap' ) {
            searchCriteria[ searchCriteriaKey ] = reportTileInfo.additionalSearchCriteria[ searchCriteriaKey ];
        }
    }
    reportTileInfo.searchCriteria = searchCriteria;
};

/**
 * Returns input for performSearchViewModel SOA call
 *
 * @param {*} searchAndChartInfo - subPanelContext
 * @returns {*} input for SOA performSearchViewModel
 */
var getPerformSearchSOAInput = function( searchAndChartInfo ) {
    return {
        searchInput: {
            attributesToInflate: [],
            internalPropertyName: '',
            maxToLoad: 1,
            maxToReturn: 0,
            providerName: searchAndChartInfo.dataProviderName,
            searchCriteria: searchAndChartInfo.searchCriteria,
            searchFilterFieldSortType: 'Priority',
            cursor: {
                startIndex: 0
            },
            searchFilterMap6: searchAndChartInfo.activeFilterMap,
            searchSortCriteria: ''
        },
        columnConfigInput: {
            clientName: '',
            clientScopeURI: ''
        }
    };
};

/**
 * Call to graphql query
 *
 /*"searchFilterContext": "<searchCommonParameters.UserSessionQuery>"
 "chartSearchCriteria": [{
 "chartID": <Unique Idenfier for this Report eg UID> : Useful in case of multiseries charts,
 "searchCriteria": {
         "searchQueryString": <base criteria>,
         "searchFilters": [
             <list of filters -- add RevRuleFitler here.>
         ]},
 "categoriesToChartOn": {
     "typeName": <Teamcenter Type>
     "propertyName": <Teamcenter Property>,
     "propertyType": <Property Type> -- optional
     "locale" : <current locale> : only in case of localized properties -- optional
     }
 }
 * @param {*} reportDefObject
 * @param {*} data
 */

var callChartInfoGql = function( reportDefObject, data ) {
    //Prepare Request for GraphQL API
    var searchCommonParameters = appCtxService.getCtx( 'ReportsContext.SearchParameters' );
    var userSession = appCtxService.getCtx( 'userSession' );
    var currentLocale = userSession.props.fnd0locale.dbValue;

    //1. searchCriteria and search filters
    let searchCriteria = {};
    searchCriteria.searchQueryString = reportDefObject.props.translatedBaseCriteria.dbValue;
    let searchFilters = [];
    if( reportDefObject.props.translatedFilterQueries && reportDefObject.props.translatedFilterQueries.dbValues.length > 0 ) {
        reportDefObject.props.translatedFilterQueries.dbValues.map( filterQuery => {
            searchFilters.push( filterQuery );
        } );
    }
    searchFilters.push( searchCommonParameters.RevRuleQuery );
    searchCriteria.searchFilters = searchFilters;

    //2. Categories to chart on
    let categoriesToChartOn = [];
    if( reportDefObject.props.reportChartObjects && reportDefObject.props.reportChartObjects.dbValues.length > 0 ) {
        reportDefObject.props.reportChartObjects.dbValues.map( reportChartObject => {
            let categoryToChartOn = {};
            categoryToChartOn.typeName = reportChartObject.chartTypeName;
            categoryToChartOn.propertyName = reportChartObject.chartPropertyName;
            categoryToChartOn.propertyType = reportChartObject.chartPropertyType === 'Date' ? 'DateType' : 'StringType';
            categoryToChartOn.locale = reportChartObject.isPropertyLocalized ? currentLocale : '';
            categoriesToChartOn.push( categoryToChartOn );
        } );
    }

    //3. Search filter context
    let searchFilterContext = searchCommonParameters.UserSessionQuery;

    //4. Put the request together

    let chartSearchCriteria = {};
    chartSearchCriteria.chartID = reportDefObject.uid;
    chartSearchCriteria.searchCriteria = searchCriteria;
    chartSearchCriteria.categoriesToChartOn = categoriesToChartOn;

    let graphQLInput = {};
    graphQLInput.searchFilterContext = searchFilterContext;
    graphQLInput.chartSearchCriteria = [ chartSearchCriteria ];

    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'query ChartInfo($input:ChartDataInput!){chartInfo(chartDataInput:$input){chartID,totalCount,chartData{categoryName,chartValues{label,value}}}}',
            variables: {
                input: graphQLInput
            }
        }
    };

    var searchAndChartInfo = getReportSearchAndChartParametersForTile( reportDefObject );

    return graphQLSvc.callGraphQL( graphQLQuery ).then(
        function( response ) {
            if( response.errors === undefined ) {
                return response.data.chartInfo.map( chartInfoObject => {
                    if( chartInfoObject.chartID === reportDefObject.uid ) {
                        var chartPoints = createChartGraphQLData( chartInfoObject.chartData[ 0 ].chartValues, searchAndChartInfo.ChartConfiguration );
                        data.chartPoints = chartPoints;
                        data.totalObjectFound = data.i18n.totalObjectFound + ': ' + chartInfoObject.totalCount;
                        data.displayChart = true;
                        data.ChartConfiguration = searchAndChartInfo.ChartConfiguration;
                    }
                    return true;
                } );
            }
            logger.error( response.errors[ 0 ].message + '..initiating SOA call.' );
            callPerformSearchForChartInfo( reportDefObject, data );
        } );
};

/**
 * Makes a SOA call to get required Chart Info.
 * @param {*} reportDefObject -
 * @param {*} data -
 * @returns {*} chart info
 */
var callPerformSearchForChartInfo = function( reportDefObject, data ) {
    var searchAndChartInfo = getReportSearchAndChartParametersForTile( reportDefObject );
    var searchSOAInput = getPerformSearchSOAInput( searchAndChartInfo );
    return soa_kernel_soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
        columnConfigInput: searchSOAInput.columnConfigInput,
        inflateProperties: false,
        saveColumnConfigData: {},
        noServiceData: true,
        searchInput: searchSOAInput.searchInput
    } ).then(
        function( response ) {
            appCtxService.updatePartialCtx( 'searchIncontextInfo', {} );
            var filterCat = showReportSrvc.callRepGetCategories( response );
            var searchResultFilters = undefined;
            if( appCtxService.ctx.searchIncontextInfo && appCtxService.ctx.searchIncontextInfo.searchResultFilters ) {
                searchResultFilters = appCtxService.ctx.searchIncontextInfo.searchResultFilters;
            }
            var searchFiltMap = response.searchFilterMap6;
            var chartPoints = showReportSrvc.createChartFromArrayOfSeriesInternal( searchResultFilters, filterCat, searchFiltMap, searchAndChartInfo.ChartConfiguration );

            data.chartPoints = chartPoints;
            data.totalObjectFound = data.i18n.totalObjectFound + ': ' + response.totalFound;
            data.displayChart = true;
            data.ChartConfiguration = searchAndChartInfo.ChartConfiguration;
            return true;
        },
        function( error ) {
            logger.error( 'Error occurred ' + error );
        }
    );
};

/**
 * Initializes Report Tile rendering.
 *
 * @param {*} subPanelContext - subPanelContext
 * @param {*} data - data
 * @returns {*} reportName
 */
export let dashboardTileRevealed = function( subPanelContext, data ) {
    data.tileReportObject = subPanelContext;
    if( subPanelContext.props.translatedBaseCriteria && subPanelContext.props.translatedBaseCriteria.dbValue !== null ) {
        return callChartInfoGql( subPanelContext, data );
    } else if( subPanelContext ) {
        return callPerformSearchForChartInfo( subPanelContext, data );
    }
};

/**
 * createChartGraphQLData
 *
 /*
        Format of searchResultFilters:
        dataPoints: [
            {
                categoryName: categoryName,
                facetValues: [
                    {
                    "label": "Tcadmin, testuser ( tcadmin )",
                    "value": 49259
                    },
                    {
                    "label": "Bhardwaj, Sudhir ( bhardwaj )",
                    "value": 36715
                    }...]
            },{},{}]
 *
 * @function createChartGraphQLData
 * @param {ObjectArray} searchResultFilters searchResultFilters
 * @param {*} reportConfig reportConfig
 * @returns {*} chart series data
 */
export let createChartGraphQLData = function( searchResultFilters, reportConfig ) {
    let arrayOfSeriesDataForChart = [];

    if( searchResultFilters === undefined ) {
        return arrayOfSeriesDataForChart;
    }
    let keyValueDataForChart = [];

    // for every data point create a label and value
    searchResultFilters.forEach( element => {
        keyValueDataForChart.push( {
            label: element.label,
            name: element.label,
            value: element.value
        } );
    } );

    // push series of datapoints to entire chart series array
    arrayOfSeriesDataForChart.push( {
        seriesName: Array.isArray( reportConfig.ChartPropName ) ? reportConfig.ChartPropName[ 0 ] : reportConfig.ChartPropName,
        keyValueDataForChart: keyValueDataForChart
    } );
    return arrayOfSeriesDataForChart;
};

/**
 * Returns chart
 * @param {*} data -
 * @return {*} chart points
 */
export let getChartDataAction = function( data ) {
    data.chartProviders.myChartProvider.title = data.ChartConfiguration.ChartTitle;
    data.chartProviders.myChartProvider.chartType = data.ChartConfiguration.ChartTpIntName;
    return data.chartPoints;
};

export default exports = {
    getChartDataAction,
    dashboardTileRevealed
};
app.factory( 'mydashboardtileservice', () => exports );
