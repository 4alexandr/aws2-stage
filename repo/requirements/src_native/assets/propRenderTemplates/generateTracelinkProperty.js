// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateTracelinkProperty
 * @requires app
 */
import app from 'app';
import arm0CreateTraceLink from 'js/Arm0CreateTraceLink';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';

var exports = {};

/**
 * Generates Tracelink DOM Element for Awb0Element or Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Tracelink is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Tracelink will be rendered
 */
export let generateAwb0TraceLinkFlagRendererFn = function( vmo, containerElem ) {
    if( cmm.isInstanceOf( 'Awb0Element', vmo.modelType ) && vmo.props && vmo.props.awb0TraceLinkFlag ) {
        var has_trace_link = vmo.props.awb0TraceLinkFlag.dbValues[ 0 ];
        _renderTracelinkIndicator( vmo, containerElem, has_trace_link );
    }else if( cmm.isInstanceOf( 'Arm0SummaryTableProxy', vmo.modelType ) && vmo.props && vmo.props['REF(arm0SourceElement,Awb0Element).awb0TraceLinkFlag'] ) {
        var has_trace_link = vmo.props['REF(arm0SourceElement,Awb0Element).awb0TraceLinkFlag'].dbValues[ 0 ];
        _renderTracelinkIndicator( vmo, containerElem, has_trace_link );
    }
};


/**
 * Generates Tracelink DOM Element for workspace object
 * @param { Object } vmo - ViewModelObject for which Tracelink is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Tracelink will be rendered
 */
export let generateHasTraceLinkRendererFn = function( vmo, containerElem ) {
    if( vmo && vmo.props && vmo.props.has_trace_link ) {
        var has_trace_link = vmo.props.has_trace_link.dbValues[ 0 ];
        _renderTracelinkIndicator( vmo, containerElem, has_trace_link );
    }
};

/**
 * @param { Object } vmo - ViewModelObject for which Tracelink is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Tracelink will be rendered
 * @param {String} hasTracelinkflag - 1 or 0
 */
var _renderTracelinkIndicator = function( vmo, containerElem, hasTracelinkflag ) {
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon';
    cellImg.title = 'Tracelink';
    var imgSrc = null;
    if( hasTracelinkflag === '1' || hasTracelinkflag === '2' ) {
        imgSrc = app.getBaseUrlPath() + '/image/indicatorTraceLink16.svg';
    } else {
        imgSrc = app.getBaseUrlPath() + '/image/cmdCreateTraceLink24.svg';
    }
    var objectUid = vmo.uid;
    if( vmo.type === 'Arm0SummaryTableProxy' && vmo.props.arm0SourceElement ) {
        objectUid = vmo.props.arm0SourceElement.dbValues[0];
    }
    // Add click event to open the Tracelink panel
    cellImg.addEventListener( 'click', function() {
        var eventData = {
            sourceObject: {
                uid: objectUid
            }
        };
        if( arm0CreateTraceLink ) {
            arm0CreateTraceLink.addObjectToTracelinkPanel( eventData );
        }
    }, objectUid );

    cellImg.src = imgSrc;
    containerElem.appendChild( cellImg );
};

export default exports = {
    generateAwb0TraceLinkFlagRendererFn,
    generateHasTraceLinkRendererFn
};
app.factory( 'generateTracelinkProperty', () => exports );
