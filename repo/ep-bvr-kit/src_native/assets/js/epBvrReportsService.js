//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/**
 * APIs for epBvrReportsService
 *
 * @module js/epBvrReportsService
 */
import popupSvc from 'js/popupService';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import epSaveService from 'js/epSaveService';
import saveInputWriterService from 'js/saveInputWriterService';
import { constants as epSaveConstants } from 'js/epSaveConstants';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import _ from 'lodash';
import fmsUtils from 'js/fmsUtils';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
'use strict';

const REPORT_TYPE_SUBSTRING = "MBC_REPORT_";
const REPORT_GENERATED = "reportGenerated";
const EXCEL_REPORT = "EPExcelPAReport";
const EXCEL_REPORT_FILE_NAME = "Report.xlsm";
const PDF_REPORT_FILE_NAME = "Report.pdf";

export function generateReport( viewModelData ) {
    let saveInput = saveInputWriterService.get();
    const addReportInput = {
        reportType: viewModelData.reportTypes.dbValue,
        id: appCtxSvc.ctx.ep.scopeObject.uid
    };
    saveInput.addReportInput( addReportInput );
    const relatedObjects = {
        [ appCtxSvc.ctx.ep.scopeObject.uid ]: {
            uid: appCtxSvc.ctx.ep.scopeObject.uid,
            type: appCtxSvc.ctx.ep.scopeObject.type
        }
    };
    return epSaveService.saveChanges( saveInput, false, relatedObjects ).then( function( responseObj ) {
        const saveEvents = responseObj.saveEvents;
        if( !_.isEmpty( saveEvents ) && !_.isEmpty( saveEvents[ 0 ].eventData ) && saveEvents[ 0 ].eventType === REPORT_GENERATED ) {
            const fileTicket = saveEvents[ 0 ].eventData[ 0 ];
            const reportType = viewModelData.reportTypes.dbValue;
            if( reportType === EXCEL_REPORT ) {
                fmsUtils.openFile( fileTicket.toString(), EXCEL_REPORT_FILE_NAME );
            } else {
                fmsUtils.openFile( fileTicket.toString(), PDF_REPORT_FILE_NAME );
            }
            eventBus.publish( 'reports.closePopup' );
        }
        saveInputWriterService.resetDataEntrySection( epSaveConstants.CREATE_REPORT );
    } );
}

export function showCreateReportPopup( inputParameters ) {
    getReportTypeFromPreferences();
    popupSvc.show( inputParameters );
}

export function getReportTypeFromPreferences() {
    const scopeObjectType = mfeTypeUtils.isOfType( appCtxSvc.ctx.ep.scopeObject, epBvrConstants.MFG_PROCESS_LINE ) === false ? appCtxSvc.ctx.ep.scopeObject.type : epBvrConstants.MFG_PROCESS_AREA;
    const typeOfReportsToShow = appCtxSvc.ctx.preferences[ REPORT_TYPE_SUBSTRING + scopeObjectType ];
    let reportTypesList = [];
    if( typeOfReportsToShow ) {
        for( let i = 0; i < typeOfReportsToShow.length; i++ ) {
            const type = typeOfReportsToShow[ i ].split( ':' );
            reportTypesList.push( {
                propDisplayValue: type[ 1 ],
                propInternalValue: type[ 0 ]
            } );
        }
        //As the report type list needs to be present before the view is rendered hence using CTX for storing the report types.
        appCtxSvc.updateCtx( 'reportTypesList', reportTypesList );
    }
}

let exports = {};
export default exports = {
    generateReport,
    showCreateReportPopup,
    getReportTypeFromPreferences
};
