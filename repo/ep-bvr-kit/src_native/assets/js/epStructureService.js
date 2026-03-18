// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 *
 * @module js/epStructureService
 */
import cdm from 'soa/kernel/clientDataModel';
import { constants as epBvrConstants } from 'js/epBvrConstants';

'use strict';

/**
 * get Operation Parent Object
 * @param {Object} modelObject Object
 * @return {Object} scope object for Create Object
 */
export function getOperationParent ( modelObject ) {
    if( modelObject.type === epBvrConstants.MFG_BVR_OPERATION &&  modelObject.props.bl_parent ) {
        modelObject = cdm.getObject( modelObject.props.bl_parent.dbValues[0] );
    }
    return { modelObject:modelObject };
}

let exports = {};
export default exports = {
    getOperationParent
};
