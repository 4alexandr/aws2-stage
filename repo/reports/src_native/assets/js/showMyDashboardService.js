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
 * JS Service defined to handle Show My Dashboard related method execution only.
 *
 * @module js/showMyDashboardService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import soaService from 'soa/kernel/soaService';
import reportsCommSrvc from 'js/reportsCommonService';
import modelPropertySvc from 'js/modelPropertyService';

var exports = {};
var _reportsList = null;
var _pageSize = 8;

export let getReportDefinitionSOAInput = function( data, reportIdInput = 'reportDefinitionId' ) {
    var repIdList = [];
    if( 'preferences' in data && reportsCommSrvc.getReportDashboardPrefName() in data.preferences ) {
        repIdList.push.apply( repIdList, data.preferences.REPORT_AW_MyDashboard_TC_Report );
    }

    //scenario for no report configured
    if( repIdList.length === 1 && repIdList[0].length === 0 ) {
        repIdList = [];
    }

    var soaInput = [];
    if( repIdList.length > 0 ) {
    repIdList.forEach( idVal => {
               var val = JSON.parse( idVal.substring( idVal.indexOf( ':' ) + 1, idVal.length ) );
               var inputStr = {};
               inputStr[reportIdInput] = val.ID;
               if( reportIdInput === 'reportID' ) {
                inputStr.reportUID = '';
                inputStr.reportSource = '';
            }
        soaInput.push( inputStr );
    } );
} else{
    var inputStr = {};
    inputStr[reportIdInput] = 'RANDOME###$$$$';
    soaInput.push( inputStr );
}
    reportsCommSrvc.setupReportPersistCtx();
    return soaInput;
};

export let getReportDefinitionValList = function( response ) {
    _reportsList = response.reportdefinitions.map( function( rDef ) {
        return response.ServiceData.modelObjects[ rDef.reportdefinition.uid ];
    } );
    appCtxService.updatePartialCtx( 'search.totalFound', _reportsList.length );
    return {
        reportdefinitions: _reportsList
    };
};

export let setupDashboardReportViewer = function( data ) {
    data.urlFrameSize = getFrameSize();
    $( 'aw-secondary-workarea' ).find( '.aw-jswidget-tabBar' ).addClass( 'aw-viewerjs-hideContent' );
};

var getFrameSize = function() {
    var areas = document.getElementsByTagName( 'aw-secondary-workarea' );
    if( areas.length > 0 ) {
        var totalHeight = areas[ 0 ].clientHeight - 23;
        var totalWidth = areas[ 0 ].clientWidth - 20;
    }
    return {
        height: totalHeight,
        width: totalWidth
    };
};

//
export let getPreferenceIndex = function( prefvalList, rd_id ) {
    for ( var j = 0; j < prefvalList.length; j++ ) {
        if ( prefvalList[j].match( rd_id ) ) {
            return j;
        }
    }
    return -1;
};

//TODO Refactor
export let removeSelectedDashboardReport = function( selectedReportDef, ctxReportDef ) {
    var currentPrefValList = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    var index = getPreferenceIndex( currentPrefValList, selectedReportDef !== null ? selectedReportDef.props.rd_id.dbValues[0] :  ctxReportDef.props.rd_id.dbValues[0] );
    currentPrefValList.splice( index, 1 );

    var setLocation = [];
    setLocation.push( {
        location: {
            object: '',
            location: 'User'
        },
        preferenceInputs: {
            preferenceName: reportsCommSrvc.getReportDashboardPrefName(),
            values: currentPrefValList.length === 0 ? null : currentPrefValList
        }
    } );
    var inputData = {
        setPreferenceIn: setLocation
    };
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', inputData ).then(
        function( response ) {
            appCtxService.updatePartialCtx( reportsCommSrvc.getCtxForReportsPreference(), currentPrefValList.length === 0 ? null : currentPrefValList );
            var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
            crntList.splice( index, 1 );
            appCtxService.updatePartialCtx( reportsCommSrvc.getCtxMyDashboardList(), crntList );
            eventBus.publish( 'primaryWorkarea.reset' );
        } );
};

//TODO Refactor
export let addSelectedReportToDashboard = function( selectedReportDef, reportId, source ) {
    var currentPrefValList = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
    if( currentPrefValList === null || currentPrefValList.length === 1 && currentPrefValList[0].length === 0  ) {
        currentPrefValList = [];
    }

    //Compile preference value in case of TC report
    var reportIdVal = selectedReportDef !== null ? selectedReportDef.props.rd_id.dbValues[0] : reportId;
    if( source === 'TC' ) {
        currentPrefValList[currentPrefValList.length] = reportIdVal + ':{"ID":"' + reportIdVal + '"}';
    }else if( source === 'TcRA' ) {
        currentPrefValList[currentPrefValList.length] = reportId;
    }

    var setLocation = [];
    setLocation.push( {
        location: {
            object: '',
            location: 'User'
        },
        preferenceInputs: {
            preferenceName: reportsCommSrvc.getReportDashboardPrefName(),
            values: currentPrefValList
        }
    } );
    var inputData = {
        setPreferenceIn: setLocation
    };
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesAtLocations', inputData ).then(
        function( response ) {
            appCtxService.updatePartialCtx( reportsCommSrvc.getCtxForReportsPreference(), currentPrefValList );
            var crntList = appCtxService.getCtx( reportsCommSrvc.getCtxMyDashboardList() );
            crntList.push( reportIdVal );
            appCtxService.updatePartialCtx( reportsCommSrvc.getCtxMyDashboardList(), crntList );
        } );
};


//################# MY DASHBOARD TILE VIEW METHODS ####################
/**
 *  fsd
 * @param {*} startIndex -
 * @returns {*} cursorObject
 */
var getCursorObject = function( startIndex ) {
    var totalFound = _reportsList.length;
    var mEndIndex = null;
    var mEndReached = null;

    if( startIndex === 0 ) {
        if( totalFound >= _pageSize ) {
            mEndIndex = _pageSize;
            mEndReached = false;
        } else {
            mEndIndex = totalFound;
            mEndReached = true;
        }
    } else {
        if( _pageSize + startIndex > totalFound ) {
            mEndIndex = totalFound;
            mEndReached = true;
        } else {
            mEndIndex = _pageSize + startIndex;
            mEndReached = false;
        }
    }
    return {
        endIndex: mEndIndex,
        endReached: mEndReached,
        startIndex: startIndex,
        startReached: true
    };
};

/**
 *
 * @param {*} data -
 */
var updateDashboardLastRefreshTime = function( data ) {
    var currentdate = new Date();
    var datetime = ' ' + currentdate.getDate() + '/' +
        ( currentdate.getMonth() + 1 ) + '/' +
        currentdate.getFullYear() + ' @ ' +
        currentdate.getHours() + ':' +
        currentdate.getMinutes() + ':' +
        currentdate.getSeconds();
    data.dashboardLastRefresh.displayValues = [ datetime  ];
    data.dashboardLastRefresh.uiValue = datetime;
    data.dashboardLastRefresh.dbValue =  datetime;
};

var addSearchRecipeProps = function( reportDef, recipe ) {
    var props = [ 'reportChartObjects', 'translatedBaseCriteria', 'translatedFilterQueries' ];

    props.forEach( propName => {
        //set search receipe as a property value..
        var propAttrHolder = {
            displayName: propName,
            type: 'STRING',
            dbValue: recipe[ propName ]
        };
        var property = modelPropertySvc.createViewModelProperty( propAttrHolder );
        reportDef.props[propName] = property;
    } );

    return reportDef;
};

var getReportDefinitions = function( response ) {
    _reportsList = response.reportSearchRecipeObjects.map( function( receipe ) {
        var reportDef = response.ServiceData.modelObjects[ receipe.reportObject.uid ];
        return addSearchRecipeProps( reportDef, receipe );
    } );
    appCtxService.updatePartialCtx( 'search.totalFound', _reportsList.length );
    return {
        reportdefinitions: _reportsList
    };
};

/**
 * Main entry point for Rendering Report Tiles.
 * Performs the SOA call to get required ReportDefinition BO's.
 * For Sub-sequent scroll, next set of RD are returned.
 * @param {*} data - data
 * @param {*} startIndex - Scroll index value
 * @returns {*} List of ReportDefinition and cursor object.
 */
export let getReportDefinitionsForTileView = function( data, startIndex ) {
    //Get dashboard update time..
    updateDashboardLastRefreshTime( data );
    if( data.preferences.REPORT_AW_MyDashboard_PageSize ) {
        _pageSize = parseInt( data.preferences.REPORT_AW_MyDashboard_PageSize[0] );
    }
    console.log( 'New call with startIndex ' + startIndex );

    //Tile config ReportDefinition processing
    if( startIndex === 0 ) {
        ////get SOA input
        var soaInput = getReportDefinitionSOAInput( data, 'reportID' );
        return soaService.postUnchecked( 'Internal-Search-2020-12-SearchFolder', 'getTranslatedReportSearchRecipe', {
            reportDefinitionCriteria: soaInput
        } ).then(
            function( response ) {
                var repDefList = getReportDefinitions( response );
                var finalRepList = repDefList.reportdefinitions.slice( 0, _pageSize );
                appCtxService.updatePartialCtx( 'ReportsContext.SearchParameters', response.commonSearchParameters );
                return {
                    reportdefinitions: finalRepList,
                    cursor: getCursorObject( startIndex )
                };
            } );
    } else if( startIndex > 0 ) {
        var tempRepList = _reportsList.slice( startIndex, startIndex + _pageSize );
        return {
            reportdefinitions: tempRepList,
            cursor: getCursorObject( startIndex )
        };
    }
};


//################# MY DASHBOARD TILE VIEW METHODS END #################

export default exports = {
    getReportDefinitionValList,
    getReportDefinitionSOAInput,
    setupDashboardReportViewer,
    removeSelectedDashboardReport,
    addSelectedReportToDashboard,
    getPreferenceIndex,
    getReportDefinitionsForTileView
};

app.factory( 'showmydashboardservice', () => exports );
