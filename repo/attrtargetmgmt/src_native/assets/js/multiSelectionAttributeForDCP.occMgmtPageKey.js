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
 * This is the multiSelectionAttributeForDCP occ mgmt page contribution.
 *
 * @module js/multiSelectionAttributeForDCP.occMgmtPageKey
 */

import soaPrefSvc from 'soa/preferenceService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';

'use strict';

var contribution = {
    label: {
        source: '/i18n/Att1Messages',
        key: 'attributeTitle'
    },
    id:'Att1ShowMappedAttribute',
    priority: 4,
    pageNameToken: 'Att1ShowMappedAttribute',
    condition: function( selection ) {
        if( selection.length > 1 && !( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) ) {
            var prefs = soaPrefSvc.getLoadedPrefs();
            var typesToCheck = [ 'Fnd0LogicalBlockRevision', 'Fnd0SystemModelRevision', 'Requirement Revision',
                'PSConnectionRevision', 'IAV0VerifReqmtRevision', 'IAV0AbsReqmtRevision'
            ].concat( prefs.PLE_MeasurableAttrParentObjectTypes );
            var matchingObjects = selection.map( function( mo ) {
                if( mo.props.awb0UnderlyingObject ) {
                    return cdm.getObject( mo.props.awb0UnderlyingObject.dbValues[ 0 ] );
                }
            } ).filter( function( mo ) {
                if( mo ) {
                    return typesToCheck.indexOf( mo.modelType.name ) !== -1 || mo.modelType.typeHierarchyArray.indexOf( 'IAV0AbsReqmtRevision' ) > -1;
                }
            } );
            return matchingObjects.length > 0;
        }
        return false;
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
