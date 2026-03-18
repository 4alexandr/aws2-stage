//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Service for secondary view in Architecture tab
 *
 * @module js/Ase0ArchitectureSecondaryViewService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import Ase0ArchitectureContributionService from 'js/Ase0ArchitectureContributionService';

var exports = {};

/**
 * Get contributing secondary panels
 */
export let handleArchitectureSecondaryPanelLoad = function() {
    Ase0ArchitectureContributionService.populateContributedSecondaryPanels();
};

/**
 * Update Bottom/Right split panel as per selection in diagram
 */
export let updateSplitPanelContent = function() {
    var architectureCtx = appCtxSvc.getCtx( "architectureCtx" );
    if( architectureCtx && architectureCtx.contributingSplitPanels ) {
        var activeSplitPanelId = null;
        var activeSplitPanel = Ase0ArchitectureContributionService.getActiveSpiltPanel( architectureCtx.contributingSplitPanels );
        if( activeSplitPanel ) {
            activeSplitPanelId = activeSplitPanel.splitPanelId;
        }

        if( architectureCtx.activeSplitPanelId !== activeSplitPanelId ) {
            architectureCtx.activeSplitPanelId = activeSplitPanelId;
            appCtxSvc.updateCtx( "architectureCtx", architectureCtx );
        }
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member Ase0ArchitectureSecondaryViewService
 */

export default exports = {
    handleArchitectureSecondaryPanelLoad,
    updateSplitPanelContent
};
app.factory( 'Ase0ArchitectureSecondaryViewService', () => exports );
