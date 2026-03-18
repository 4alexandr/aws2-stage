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
 * This represents the Clone Stable ID (CSID) generator module
 *
 *
 * @module js/objectToCSIDGeneratorService
 */
import app from 'app';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import logger from 'js/logger';

var exports = {};

// service and module references

/**
 * Function to compute the clone stable chain id for the given Awb0Element model object. The following
 * properties: awb0Parent and awb0CopyStableId are required to be loaded.
 *
 * @param modelObject Awb0Element instance for which the clone stable chain id need to be computed
 *
 * @return uid the clone stable uid
 */
export let getCloneStableIdChain = function( modelObject ) {

    if( modelObject && modelObject.props ) {
        var currModelObject = modelObject;
        var csid_path = '';
        while( currModelObject ) {
            var props = currModelObject.props;
            if( props.awb0Parent && props.awb0CopyStableId ) {
                csid_path = props.awb0CopyStableId.dbValues[ 0 ] + '/' + csid_path;
                currModelObject = clientDataModelSvc.getObject( props.awb0Parent.dbValues[ 0 ] );
                if( !currModelObject ) {
                    break;
                }
            } else {
                logger
                    .trace( 'CSID Generation failed:  The mandatory property awb0Parent or awb0CopyStableId is missing.' );
                throw 'The mandatory property awb0Parent or awb0CopyStableId is missing.';
            }
        }

        //Remove the leading and trailing /
        if( csid_path.length > 1 ) {
            csid_path = csid_path.slice( 1, csid_path.length - 1 );
        }
        return csid_path;
    }
    throw 'Invalid object passed as input.';
};

export default exports = {
    getCloneStableIdChain
};
/**
 * The native occmgmt Navigation service.
 *
 * @member occmgmtNavigationService
 * @memberof NgServices
 */
app.factory( 'objectToCSIDGeneratorService', () => exports );
