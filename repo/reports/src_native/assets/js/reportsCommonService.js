// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This service implements commonly used functions by Reports module.
 *
 * @module js/reportsCommonService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';

//################# ALL STRING CONSTANTS ###################
var m_reportPersistCtx = 'ReportsPersistCtx';
var m_dashboardCtxList = 'ReportsPersistCtx.MyDashboardReportList';
var m_reportDashboardPrefName = 'REPORT_AW_MyDashboard_TC_Report';
var m_ctxPrefName = 'preferences.' + m_reportDashboardPrefName;
var m_awSourceName = 'Active Workspace';
var m_repCtxSearchInfo = 'ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo';
var m_reportChart1 = 'ReportChart1';
var m_reportChart2 = 'ReportChart2';
var m_reportChart3 = 'ReportChart3';

export let getReportDashboardPrefName = function() {
    return m_reportDashboardPrefName;
};

export let getAWReportSourceName = function() {
    return m_awSourceName;
};

export let getCtxForReportsPreference = function() {
    return m_ctxPrefName;
};

export let getCtxMyDashboardList = function() {
    return m_dashboardCtxList;
};

export let getReportsCtxSearchInfo = function() {
    return m_repCtxSearchInfo;
};

export let getReportChart1 = function() {
    return m_reportChart1;
};

export let getReportChart2 = function() {
    return m_reportChart2;
};

export let getReportChart3 = function() {
    return m_reportChart3;
};


//###################### END ################################
var exports = {};


export let setupReportPersistCtx = function() {
    if( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report !== null && appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report.length > 0 ) {
            var reports = appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report;
            var rdIdList = [];
            reports.forEach( element => {
                if( element.length !== 0 ) {
                var val = JSON.parse( element.substring( element.indexOf( ':' ) + 1, element.length ) );
                rdIdList.push( val.ID );
                }
            } );
            appCtxService.updatePartialCtx( m_dashboardCtxList, rdIdList );
        } else if( appCtxService.ctx.preferences.REPORT_AW_MyDashboard_TC_Report === null ) {
            appCtxService.updatePartialCtx( m_dashboardCtxList, [] );
        }
};

/**
 * reportsCommonService factory
 *
 */
export default exports = {
    getReportDashboardPrefName,
    getAWReportSourceName,
    getCtxForReportsPreference,
    getCtxMyDashboardList,
    getReportsCtxSearchInfo,
    setupReportPersistCtx,
    getReportChart1,
    getReportChart2,
    getReportChart3
};
app.factory( 'reportsCommonService', () => exports );
