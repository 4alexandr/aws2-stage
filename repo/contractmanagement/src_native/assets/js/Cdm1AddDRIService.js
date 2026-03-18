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
 * @module js/Cdm1AddDRIService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import addObjectUtils from 'js/addObjectUtils';

var exports = {};

/**
 * createRelateAndSubmitObjects SOA input data.
 * 
 * @param {object} data the view model data object
 * 
 * @return {inputs} create input.
 */
export let getDRICreateInput = function( data ) {

    var inputs = addObjectUtils.getCreateInput( data );
    //set the contract reference id
    inputs[ 0 ].createData.propertyNameValues.cdm0ContractReference = [ appCtxSvc.ctx.selected.props.item_id.dbValues[ 0 ] ];
    return inputs;

};

export default exports = {
    getDRICreateInput
};
/**
 * @member Cdm1AddDRIService
 * @memberof NgServices
 * 
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {addObjectUtils} addObjectUtils - Service to use.
 * 
 * 
 * @returns {Cdm1EventListService} Instance of the service API object.
 */
app.factory( 'Cdm1AddDRIService', () => exports );

/**
 * Cdm1AddDRIService returned as moduleServiceNameToInject
 * 
 */
