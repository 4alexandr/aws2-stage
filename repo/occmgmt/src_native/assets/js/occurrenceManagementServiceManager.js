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
 * @module js/occurrenceManagementServiceManager
 */
import app from 'app';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import backgroundWorkingCtxTimer from 'js/backgroundWorkingContextTimer';
import backgroundWorkingCtxSvc from 'js/backgroundWorkingContextService';
import toggleIndexConfigurationService from 'js/toggleIndexConfigurationService';
import globalRevRuleConfigurationService from 'js/globalRevRuleConfigurationService';
import occmgmtUpdatePwaDisplayService from 'js/occmgmtUpdatePwaDisplayService';
import aceColorDecoratorService from 'js/aceColorDecoratorService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import structureFilterService from 'js/structureFilterService';
import occmgmtTreeTableDataService from 'js/occmgmtTreeTableDataService';
import occmgmtStructureEditService from 'js/occmgmtStructureEditService';
import aceExpandBelowService from 'js/aceExpandBelowService';
import appCtxService from 'js/appCtxService';
import aceInteractiveDuplicateService from 'js/aceInteractiveDuplicateService';
import changeService from 'js/changeService';
import aceDefaultCutCopyService from 'js/aceDefaultCutCopyService';
import aceRestoreBWCStateService from 'js/aceRestoreBWCStateService';

var exports = {};

/**
 * Initialize occurrence management services
 */
export let initializeOccMgmtServices = function() {
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;

    occMgmtStateHandler.initializeOccMgmtStateHandler();
    if( !skipAutoBookmark ) {
        backgroundWorkingCtxTimer.initialize();
        backgroundWorkingCtxSvc.initialize();
    }

    globalRevRuleConfigurationService.initialize();
    occmgmtUpdatePwaDisplayService.initialize();
    aceColorDecoratorService.initializeColorDecors();
    toggleIndexConfigurationService.initialize();
    aceStructureConfigurationService.initialize();
    occmgmtTreeTableDataService.initialize();
    occmgmtStructureEditService.initialize();
    aceInteractiveDuplicateService.initialize();
    changeService.initialize();
    aceRestoreBWCStateService.initialize();
};

/**
 * Destroy occurrence management services
 */
export let destroyOccMgmtServices = function() {
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    if( !skipAutoBookmark ) {
        backgroundWorkingCtxTimer.reset();
        backgroundWorkingCtxSvc.reset();
    }

    toggleIndexConfigurationService.reset();
    globalRevRuleConfigurationService.destroy();
    occmgmtUpdatePwaDisplayService.destroy();
    occMgmtStateHandler.destroyOccMgmtStateHandler();
    aceColorDecoratorService.destroyColorDecors();
    aceStructureConfigurationService.destroy();
    structureFilterService.destroy();
    occmgmtTreeTableDataService.destroy();
    occmgmtStructureEditService.destroy();
    aceExpandBelowService.destroy();
    aceInteractiveDuplicateService.destroy();
    changeService.destroy();
    aceDefaultCutCopyService.destroy();
    aceRestoreBWCStateService.destroy();
};

/**
 * Occurrence Management Service Manager
 */

export default exports = {
    initializeOccMgmtServices,
    destroyOccMgmtServices
};
app.factory( 'occurrenceManagementServiceManager', () => exports );
