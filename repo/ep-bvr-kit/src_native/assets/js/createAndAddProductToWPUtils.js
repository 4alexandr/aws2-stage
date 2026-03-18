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
 * @module js/createAndAddProductToWPUtils
 */
import popupService from 'js/popupService';
import awPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import manageWorkPackageService from 'js/manageWorkPackageService';

'use strict';

let _popupRef = null;
let _saveEvent = null;
let _closePopupEvent = null;

/**
 * show create Product popup with specified values,options and binding context
 *@param   {String} declView - declView, define your view in declView
 *@param   {Object} locals - title of the popup
 *@param   {Object} options - popup options
 *@param   {Object} subPanelContext - Optional. Used when some information needs to be passed on from parent context.
 *@returns {Promise} promise with the created popupRef element
 */
function showCreateProductPopup( { declView, locals, options, subPanelContext } ) {
    _saveEvent = eventBus.subscribe( 'ep.saveEvents', function( eventData ) {
        _reset();
        manageWorkPackageService.loadObject( 'CC' );
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
}

/**
 * resets the values
 */
function _reset() {
    if( _saveEvent ) {
        eventBus.unsubscribe( _saveEvent );
        _saveEvent = null;
    }
    if( _popupRef ) {
        popupService.hide( _popupRef );
        _popupRef = null;
    }
}

export default {
    showCreateProductPopup
};
