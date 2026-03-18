// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the multiSelectionPlanPageKey occ mgmt page contribution.
 *
 * @module js/multiSelectionPlanPageKey.occMgmtPageKey
 */

import appCtxService from 'js/appCtxService';
import soaPrefSvc from 'soa/preferenceService';

'use strict';

var contribution = {
    label: {
        source: '/i18n/AnalysisRequestCommandPanelsMessages',
        key: 'planTitle'
    },
    priority: 5,
    pageNameToken: 'Crt1ShowPlanTable',
    condition: function( selection, $injector ) {
        var prefs = soaPrefSvc.getLoadedPrefs();
        var appCtxService = $injector.get( 'appCtxService' );

        if( selection.length > 1 && !( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) &&
          ( prefs.Enable_DCP && prefs.Enable_DCP[ 0 ] && prefs.Enable_DCP[ 0 ] === "true" && prefs.PLE_Display_AnalysisRequestPlanTable &&
            prefs.PLE_Display_AnalysisRequestPlanTable[ 0 ] && prefs.PLE_Display_AnalysisRequestPlanTable[ 0 ] === "true" &&
            prefs.PLE_Plan_Table_Allowed_Child_Types
            ) ) {
                var cdm = $injector.get( 'soa_kernel_clientDataModel' );
                var typesToCheck = [];
                typesToCheck = prefs.PLE_Plan_Table_Allowed_Child_Types;
                var matchingObjects = selection.map( function( mo ) {
                    if( mo.props.awb0UnderlyingObject ) {
                        return cdm.getObject( mo.props.awb0UnderlyingObject.dbValues[ 0 ] );
                    }
                } ).filter( function( mo ) {
                    if( mo ) {
                        for( var i = 0; i < typesToCheck.length; i++ ) {
                            if(mo.modelType.typeHierarchyArray.indexOf( typesToCheck[i] ) !== -1 ){
                                return true;
                                break;
                            }
                            else{
                                continue;
                            }
                        }
                    }
                } );
                return matchingObjects.length > 0;
        } else {
            return false;
        }
    }
};

/**
 *
 * @param {*} key
 * @param {*} deferred
 */
export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
