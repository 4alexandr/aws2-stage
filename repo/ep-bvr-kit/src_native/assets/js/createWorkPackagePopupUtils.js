// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/createWorkPackagePopupUtils
 */  
import popupService from 'js/popupService';
import awPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import cdm from 'soa/kernel/clientDataModel';
import epNavigationService from 'js/epNavigationService';

'use strict';

let exports = {};
let _popupRef = null;
let _saveEvent=null;
let _imanObjectTypePolicyId=null;
let _closePopupEvent=null;

/**
 * show create work package popup with specified values,options and binding context
 *@param   {String} declView - declView, define your view in declView
 *@param   {Object} locals - title of the popup
 *@param   {Object} options - popup options
 *@param   {Object} subPanelContext - Optional. Used when some information needs to be passed on from parent context.
 *@returns {Promise} promise with the created popupRef element
 */
export let showNewWorkPackagePopup = function( { declView, locals, options, subPanelContext } ) {

    _imanObjectTypePolicyId = propertyPolicySvc.register( {
        types: [ {
            name: 'ImanType',
            properties: [ {
                name: 'type_name'
            } ]
        } ]
    } );

    _saveEvent = eventBus.subscribe( 'ep.saveEvents', function( eventData ) {
        _reset();
        let objectToNavigate = cdm.getObject( eventData.saveResults[ 0 ].saveResultObject.uid );
        epNavigationService.navigateToManagePage( objectToNavigate );

    } );

    _closePopupEvent = eventBus.subscribe( 'ep.createWpPopupCancel', function( eventData ) {
        _reset();
    } );

    let deferred = awPromiseService.instance.defer();
    popupService.show( { declView, locals, options, subPanelContext } ).then( function( popupRef ) {
        _popupRef = popupRef;
        deferred.resolve( popupRef );
    } );

    return deferred.promise;
};

/**
 * resets the values
 */
let _reset = function() {
    if( _imanObjectTypePolicyId ) {
        propertyPolicySvc.unregister( _imanObjectTypePolicyId );
        _imanObjectTypePolicyId = null;
    }
    if( _saveEvent ) {
        eventBus.unsubscribe( _saveEvent );
        _saveEvent = null;
    }
    if( _popupRef ) {
        popupService.hide( _popupRef );
        _popupRef = null;
    }

};


export default exports = {
    showNewWorkPackagePopup
};


