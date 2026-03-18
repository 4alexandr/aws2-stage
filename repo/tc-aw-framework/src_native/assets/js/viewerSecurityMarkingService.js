// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link NgServices.viewerSecurityMarkingService} which provides facility to register security marking
 *
 * @module js/viewerSecurityMarkingService
 * @requires app
 * @requires lodash
 */
import * as app from 'app';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import 'jscom';

import 'js/appCtxService';

/**
 * self object pointing to this instance
 */
let exports = {};

/**
 * Get viewer message for key
 *
 * @function setLoadingMsg
 */
var _getViewerMessage = function( key ) {
    var returnPromise = AwPromiseService.instance.defer();
    localeSvc.getTextPromise( 'Awv0threeDViewerMessages' ).then(
        function( localTextBundle ) {
            returnPromise.resolve( localTextBundle[ key ] );
        },
        function( error ) {
            returnPromise.reject( error );
        } );
    return returnPromise.promise;
};

/**
 * Posts user messages for security marking
 *
 * @param markings markings to represent to user
 * @param btnText button text
 * @param deferred promise that should be resolved when done
 */
function _getUserOpinionForMessages( markings, btnText, deferred ) {
    if( _.size( markings ) ) {
        var markInFront = _.pullAt( markings, [ 0 ] );
        var markDeferred = AwPromiseService.instance.defer();
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: btnText,
            onClick: function( $noty ) {
                $noty.close();
                markDeferred.resolve();
            }
        } ];
        if( Array.isArray( markInFront ) ) {
            msgSvc.showWarning( markInFront[0], buttons );
        }
        markDeferred.promise.then( function() {
            _getUserOpinionForMessages( markings, btnText, deferred );
        } );
    } else {
        deferred.resolve();
    }
}

/**
 * Default Security marking handler
 * @param  {String} markings
 * @returns {Object} promise that will resolve once marking is handled
 */
export let defaultSecurityMarkingHandlerFn = function( markings ) {
    var deferred = AwPromiseService.instance.defer();
    _getViewerMessage( 'securityMarkingAcknowledgement' ).then( function( ackButtonText ) {
        _getUserOpinionForMessages( markings, ackButtonText, deferred );
    } );
    return deferred.promise;
};

/**
 * Sets up security marking hook
 * @param  {Object} viewerView viewer view
 * @param  {Function} securityMarkingHandlerFn function that overrides default behaviour
 */
export let setupSecurityMarking = function( viewerView, securityMarkingHandlerFn ) {
    var handler = undefined;

    if( securityMarkingHandlerFn && typeof securityMarkingHandlerFn === 'function' ) {
        handler = securityMarkingHandlerFn;
    } else {
        handler = defaultSecurityMarkingHandlerFn;
    }

    viewerView.visibilityMgr.addSecurityMarkingListener( {
        securityMarkingsFound: handler
    } );
};

export default exports = {
    setupSecurityMarking,
    defaultSecurityMarkingHandlerFn
};
/**
 * Set of utility functions for viewer
 *
 * @class viewerSecurityMarkingService
 * @param appCtxService {Object} - appCtxService
 * @memberOf NgServices
 */
app.factory( 'viewerSecurityMarkingService', () => exports );
