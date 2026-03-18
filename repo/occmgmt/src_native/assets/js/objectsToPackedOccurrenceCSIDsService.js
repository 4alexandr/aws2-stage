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
 * Defines a service that can accept product and set of model objects return chain of Clone Stable Ids (CSIDs) of packed
 * occurrences corresponding to those.
 *
 * @module js/objectsToPackedOccurrenceCSIDsService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

let exports = {}; // eslint-disable-line no-invalid-this

var isPackedOccurrencePresentInParentHierarchy = function( selectedObject ) {

    if( !( selectedObject && selectedObject.props && selectedObject.props.awb0IsPacked ) ) {
        // awb0IsPacked is not present in property policy
        // decision can not be made whether selected object or its parent are packed occurrences
        // return true to make getPackedOccurrenceCSIDs SOA call
        return true;
    }

    var object = selectedObject;
    while( object && object.props && object.props.awb0Parent && !_.isEmpty( object.props.awb0Parent.dbValues[ 0 ] ) ) {
        if( object.props && object.props.awb0IsPacked ) {
            if( _.isEqual( object.props.awb0IsPacked.dbValues[ 0 ], "1" ) ) {
                // if any of the occurrence in parent hierarchy is packed
                // return true to make getPackedOccurrenceCSIDs SOA call
                return true;
            }
            var parentUid = object.props.awb0Parent.dbValues[ 0 ];
            object = _cdm.getObject( parentUid );
        } else {
            // if any of the parent do not have the awb0IsPacked property
            // decision can not be made whether selected object or its parent are packed occurrences
            // return true to make getPackedOccurrenceCSIDs SOA call
            return true;
        }
    }
    // we do not have any packed occurrences in parent hierarchy
    // return false, to avoid making getPackedOccurrenceCSIDs SOA call for selectedObject
    return false;
};

export let getCloneStableIDsWithPackedOccurrences = function( productContextInfo, selectedObjects ) {

    var packedOccurrenceInputObjects = [];
    _.forEach( selectedObjects, function( selectedObject ) {
        if( isPackedOccurrencePresentInParentHierarchy( selectedObject ) ) {
            packedOccurrenceInputObjects.push( selectedObject );
        }
    } );

    if( packedOccurrenceInputObjects.length === 0 ) {
        return;
    }

    return soaService.postUnchecked( 'Internal-ActiveWorkspaceBom-2017-12-OccurrenceManagement',
        'getPackedOccurrenceCSIDs', {
            "occurrences": packedOccurrenceInputObjects,
            "productContextInfo": productContextInfo
        } );
};

export default exports = {
    getCloneStableIDsWithPackedOccurrences
};
app.factory( 'objectsToPackedOccurrenceCSIDsService', () => exports );

/**
 * Enable loading of this module in GWT
 */
