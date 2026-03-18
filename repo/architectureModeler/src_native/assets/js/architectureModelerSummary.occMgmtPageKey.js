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
 * This is the architectureModeler occ mgmt page contribution.
 *
 * @module js/architectureModelerSummary.occMgmtPageKey
 */

'use strict';

var contribution = {
    //TODO: May need label function
    label: {
        source: '/i18n/ArchitectureModelerConstants',
        key: 'architectureModelerPageTitle'
    },
    id: 'Ase0ArchitectureFeature',
    priority: 2,
    pageNameToken: 'Ase0ArchitecturePage',
    condition: 'ctx.occmgmtContext.supportedFeatures.Ase0ArchitectureFeature && !ctx.splitView.mode && !(ctx.workspace.workspaceId === "TcRMWorkspace" && (ctx.selected.modelType.typeHierarchyArray.indexOf( "Arm0RequirementElement" ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf( "Arm0RequirementSpecElement" ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf( "Arm0ParagraphElement" ) > -1))'
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
