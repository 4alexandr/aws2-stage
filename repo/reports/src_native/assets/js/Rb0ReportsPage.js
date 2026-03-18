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
 * @module js/Rb0ReportsPage
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import AwHttpService from 'js/awHttpService';
import messagingService from 'js/messagingService';
import $ from 'jquery';
import _ from 'lodash';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';

/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/?ticket=';

var _file = null;
var _lastSelectedBOUid = null;

export let setReportsParameter = function( vmo, ticketURL ) {
    _lastSelectedBOUid = vmo.uid;
    _file = ticketURL;
};

/**
 * Gets the underlying object for the selection. For selection of an occurrence in a BOM, the underlying object is
 * typically an Item Revision object. If there is no underlying object, the selected object is returned.
 *
 * @param {object} ctx - Application Context
 *
 */
export let getUnderlyingObject = function( ctx ) {
    var underlyingObj = null;
    if( ctx ) {
        var underlyingObjProp = ctx.props.awb0UnderlyingObject;
        if(  !_.isUndefined( underlyingObjProp )  && underlyingObjProp.dbValues[ 0 ] ) {
            underlyingObj = cdm.getObject( underlyingObjProp.dbValues[ 0 ] );
        } else {
            underlyingObj = ctx;
        }
    }
    return underlyingObj;
};

var getFrameSize = function() {
    var body = $( 'body' );
    var pageHeight = body.height() * 0.68;
    var pageWidth = '100%';
    var framesize = {
        height: pageHeight,
        width: pageWidth
    };

    return framesize;
};

var checkIsOldTcRelease = function() {
    var $state = AwStateService.instance;
    if( $state.params.swa_tab ) {
        _file = $state.params.swa_tab;
        _lastSelectedBOUid = $state.params.uid;
        return true;
    }
        return false;
};

var buildTicketURL = function() {
    //update ticket..
    var urlFullPath = CLIENT_FMS_DOWNLOAD_PATH + _file;
    return urlFullPath;
};

/**
 * Put HTML ticket data into iframe.
 */
self.processResponse = function( response, data ) {
    var iFrameData = null;
    if( response && response.data.length > 2 ) {
        iFrameData = response.data;
    } else {
        iFrameData = data.i18n.showNoDataFoundMessage;
    }

    var iframe = $( 'iframe' );
    var iframedoc;
    if( iframe && iframe[ 0 ].contentDocument ) {
        iframedoc = iframe[ 0 ].contentDocument;
    } else if( iframe && iframe[ 0 ].contentWindow ) {
        iframedoc = iframe[ 0 ].contentWindow.document;
    }
    if( iframedoc ) {
        // Put the content in the iframe
        iframedoc.open();
        var iframedocContent = iFrameData;
        iframedoc.writeln( iframedocContent );
        iframedoc.close();
    }
};

export let validateReveal = function( data, selected ) {
    var ctxSelected = exports.getUnderlyingObject( selected );
    if( checkIsOldTcRelease() || _lastSelectedBOUid && ctxSelected.uid === _lastSelectedBOUid ) {
        data.urlFrameSize = getFrameSize();
        var promise = AwHttpService.instance.get( buildTicketURL() );
        promise.then( function( response ) {
            self.processResponse( response, data );
        } );
    }
};

export let refreshPanelData = function( vmo, ticketURL, data ) {
    _lastSelectedBOUid = vmo.uid;
    _file = ticketURL;

    var promise = AwHttpService.instance.get( buildTicketURL() );
    promise.then( function( response ) {
        self.processResponse( response, data );
    } );

    return {
        urlFrameSize: getFrameSize()
    };
};

export default exports = {
    setReportsParameter,
    getUnderlyingObject,
    validateReveal,
    refreshPanelData
};
/**
 * Reports panel service utility
 *
 * @memberof NgServices
 * @member reportstabpageservice
 */
app.factory( 'reportstabpageservice', () => exports );
