// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/epAddObjectService
 */

import appCtxService from 'js/appCtxService';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import dataManagementService from 'soa/dataManagementService';
import cdmSvc from 'soa/kernel/clientDataModel';
import _epLoadInputHelper from 'js/epLoadInputHelper';
import manageWorkPackageService from 'js/manageWorkPackageService';
import popupService from 'js/popupService';

'use strict';

/**
 * Add's selected object to the current CC.
 *@param   {Object} data - declViewModel
 *@param   {Object} selectedObject - selected Object from search popup
 *@param   {Object} revisionRule - selected rev Rule
 */
export function addObject( data, selectedObject, revisionRule ) {
    let saveInputWriter = saveInputWriterService.get();
    let epPageContext = appCtxService.getCtx( 'epPageContext' );
    let ccUid = epPageContext.collaborationContext.uid;
    let objectToAdd = selectedObject.selectedObjects.uid;
    let revRule = revisionRule.dbValue;
    let ccObject ={
        id:[ccUid]
    };
    let objectToAddInCC ={
        Add:[objectToAdd],
        revisionRule: [ revRule ]
    };
    saveInputWriter.addObjectToCC(ccObject,objectToAddInCC);
    let objectToLoad = [ ccUid, objectToAdd, revRule ];

    dataManagementService.loadObjects( objectToLoad ).then( function() {
        let ccObject = cdmSvc.getObject( ccUid );
        let objectToAddObj = cdmSvc.getObject( objectToAdd );
        let revRuleObj = cdmSvc.getObject( revRule );
        let relatedObjects = [ ccObject, objectToAddObj, revRuleObj ];
        epSaveService.saveChanges( saveInputWriter, true, relatedObjects ).then( function() {
            manageWorkPackageService.loadObject( 'CC' );
            popupService.hide( data.popupId );
        } );
    } );
}

export default {
    addObject
};
