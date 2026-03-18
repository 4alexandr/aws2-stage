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
 * This is the attributes' mapping split panel contribution to Architecture page
 *
 * @module js/Att1MappedAttributePanel.archModelerSecondaryPanelKey
 */

'use strict';

var contribution = {
    id: 'Att1MappedAttributePanel',
    priority: 1,
    splitPanelId: 'Att1ShowMappedAttribute',
    condition: 'ctx.architectureCtx.diagram.selection.nodeModels[0].modelType.typeHierarchyArray.indexOf(\'Awb0ConditionalElement\') > -1  || ctx.architectureCtx.diagram.selection.edgeModels[0].modelType.typeHierarchyArray.indexOf(\'FND_TraceLink\') > -1'
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
