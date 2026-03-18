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
 * @module js/Cdm1ImpactedEventsService
 */
import app from 'app';

var exports = {};

/**
 * This function invokes SOA createOrUpdateSubDelSchedules to reschedule the selected DRIs
 * 
 * @param {ctx} ctx object
 * 
 * @return {selDRIs} selected DRIs
 */
export let getReschSOAInput = function( ctx ) {
    var selDRIs = [];
    for( var index = 0; index < ctx.mselected.length; index++ ) {
        if( ctx.mselected[ index ].modelType.typeHierarchyArray.indexOf( 'Cdm0DataReqItemRevision' ) > -1 ) {
            selDRIs[ index ] = {
                clientId: "ReschedulinginAW",
                businessObject: ctx.mselected[ index ].uid,
                updateImpactedOnly: true
            };
        }
    }
    return selDRIs;
};

/**
 * Cdm1ImpactedEventsService factory
 * @return {exports} variable for using in json
 */

export default exports = {
    getReschSOAInput
};
app.factory( 'Cdm1ImpactedEventsService', () => exports );

/**
 * Cdm1ImpactedEventsService returned as moduleServiceNameToInject
 * 
 */
