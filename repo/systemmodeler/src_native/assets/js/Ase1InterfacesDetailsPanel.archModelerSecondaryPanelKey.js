// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the system modeler Interfaces panel contribution to Architecture page
 *
 * @module js/Ase1InterfacesDetailsPanel.archModelerSecondaryPanelKey
 */

'use strict';

var contribution = {
    id: 'Ase1InterfaceDetailsPanel',
    priority: 1,
    splitPanelId: 'interfaceDetails',
    condition: '(( ctx.tcSessionData.tcMajorVersion===11 && ctx.tcSessionData.tcMinorVersion>=2 && ctx.tcSessionData.tcQRMNumber>=5 ) || ( ctx.tcSessionData.tcMajorVersion>=12 )) && (ctx.interfaceDetails.startEditOfInterfaceDefinition || ctx.architectureCtx.diagram.selection.edgeModels[0].modelType.typeHierarchyArray.indexOf(\'Awb0Connection\') > -1 || ctx.architectureCtx.diagram.selection.portModels[0].modelType.typeHierarchyArray.indexOf(\'Awb0Interface\') > -1 )'
};

/**
 *
 * @param {*} key
 * @param {*} deferred
 */
export default function( key, deferred ) {
    if( key === 'archModelerSecondaryPanelKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
