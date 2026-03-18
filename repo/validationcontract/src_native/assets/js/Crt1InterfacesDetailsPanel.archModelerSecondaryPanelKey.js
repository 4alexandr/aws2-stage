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
 * @module js/Crt1InterfacesDetailsPanel.archModelerSecondaryPanelKey
 */

'use strict';

var contribution = {
    id: 'Crt1InterfaceDetailsPanel',
    priority: 0,
    splitPanelId: 'Crt1InterfaceDetails',
    // TODO set to Sdf0SimArchRevision
    condition: 'ctx.openedARObject.modelType.typeHierarchyArray.indexOf(\'Crt0VldnContractRevision\') > -1 && ctx.architectureCtx.diagram.selection.portModels[0].modelType.typeHierarchyArray.indexOf(\'Awb0Interface\') > -1'
};
/**
 *
 * @param {String} key - The key
 * @param {Promise} deferred - Promise
 */
export default function( key, deferred ) {
    if( key === 'archModelerSecondaryPanelKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
