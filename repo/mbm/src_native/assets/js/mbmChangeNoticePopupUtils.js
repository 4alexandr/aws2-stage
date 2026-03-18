// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmChangeNoticePopupUtils
 */

import app from 'app';
import popupService from 'js/popupService';
import awPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
'use strict';

let exports = {};
let _popupRef = null;
/**
 * show a manufacturing change popup with specified and options and binding context
 * @param {Object} param the popup configurations. Object with the following argument properties:
 *   {String} declView - declView, define your view in declView
 *   {Object} options - popup options
 *   {Object} subPanelContext - Optional. Used when some information needs to be passed on from parent context.
 * @returns {Promise} promise with the created popupRef element
 */
export let showManufacturingChangePopup = function( { declView,  options,  subPanelContext } ) {
    let popupWidth = window.innerWidth - 20;
    let popupHeight = window.innerHeight - 20;
    options.width = popupWidth;
    options.height = popupHeight;
    let deferred = awPromiseService.instance.defer();
      popupService.show( { declView,  options,  subPanelContext } ).then( function( popupRef ) {
        _popupRef = popupRef;
        appCtxService.updateCtx( 'mbmChangeNotice', {
            contextObject: subPanelContext.contextObject
        } );
         deferred.resolve( popupRef );
      } );

    return deferred.promise;
};

/**
 * close popup by the popupEl or target event. null to force close all popups
 *
 * @param {Object | String} popupEl - the popupEl to close. accept native Element element or css selector
 * @param {Object} targetEvent - the targetEvent which trigger the invocation, specified for declarative usage
 *
 * @returns {Promise} promise with the close result, true or false
 */
export let hideManufacturingChangePopup = function( popupEl, targetEvent ) {
    if ( !( popupEl || targetEvent ) ) {
        popupEl = _popupRef;
        _popupRef = null;
        let contextObject = appCtxService.getCtx( 'mbmChangeNotice.contextObject' );

        appCtxService.updateCtx( 'mselected', [ contextObject ] );
        appCtxService.updateCtx( 'selected', contextObject );
        appCtxService.unRegisterCtx( 'mbmChangeNotice' );
    }
    return popupService.hide( popupEl, targetEvent );
};


export default exports = {
    showManufacturingChangePopup,
    hideManufacturingChangePopup
};
app.factory( 'mbmChangeNoticePopupUtils',  function() {
    return exports;
} );

