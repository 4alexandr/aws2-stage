//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/MrmPSPService
 */
import app from 'app';

var exports = {};

/**
 * Process propagation response data
 */
export let setPSPResponseData = function(response, data ) {
    data.toComponentName = response.toComponentName;
    data.fromComponentName = response.fromComponentName;
    data.ServiceData = response.ServiceData;
    return response.actionInfo;
};

/**
 * Add PSP service
 */

export default exports = {
    setPSPResponseData    
};
app.factory( 'MrmPSPService', () => exports );
