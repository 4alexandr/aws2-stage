// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global
define,
CKEDITOR
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0CreateCollabObjectService
 */
import app from 'app';
import ac0CkeditorService from 'js/Ac0CkeditorService';
import notyService from 'js/NotyModule';
import eventBus from 'js/eventBus';
import messageSvc from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import Ac0CkeditorConfigProvider from 'js/Ac0CkeditorConfigProvider';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import $ from 'jquery';

var exports = {};
var _isTextValid = false;
var _plainText = '';
var _richText = '';
var ckeditor;
var eventInsertImageInCKEditor = null;

export let showRichTextEditor = function( data ) {
    var config = new Ac0CkeditorConfigProvider();
    ac0CkeditorService.create( 'ckeditor', config ).then( cke => {
        ckeditor = cke;
        cke._instance.eventBus = eventBus;
        cke._instance.getBaseURL = browserUtils.getBaseURL();
        cke._instance.getBaseUrlPath = app.getBaseUrlPath();

        var theData = cke.getData().replace( /&nbsp;/g, '' );
        theData = theData.replace( /<p>( )*<\/p>/g, '' );
        if ( theData.trim() !== '' ) {
            _isTextValid = true;
        } else {
            _isTextValid = false;
        }
        exports.setIsTextValid( _isTextValid );

        cke.on( 'change', function() {
            var theData = cke.getData().replace( /&nbsp;/g, '' );
            theData = theData.replace( /<p>( )*<\/p>/g, '' );
            if ( theData.trim() !== '' ) {
                _isTextValid = true;
            } else {
                _isTextValid = false;
            }
            exports.setIsTextValid( _isTextValid );
            exports.setRichText( cke.getData() );
            exports.setPlainText( cke.getText() );
        } );
        cke.on( 'notificationShow', function( evt ) {
            notyService.showInfo( evt.data.notification.message );
            evt.cancel();
        } );
    } );
    // Insert Image Event
    if ( eventInsertImageInCKEditor !== null ) {
    eventBus.unsubscribe( eventInsertImageInCKEditor );
    eventInsertImageInCKEditor = null;
    }
    eventInsertImageInCKEditor = eventBus.subscribe( 'ac0activeCollaboration.InsertImageInCKEditor',
        function( eventData ) {
            var fileName = 'fakepath\\' + eventData.file.name;

            data.form = eventData.form;

            var datasetInfo = {
                clientId: eventData.clientid,
                namedReferenceName: 'Image',
                fileName: fileName,
                name: eventData.clientid,
                type: 'Image'
            };

            data.datasetInfo = datasetInfo;

            eventBus.publish( 'ac0activeCollaboration.InsertObjInCKEditor' );
    }  );
};

/**
 * set FullText object of Requirement Revision
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let insertImage = function( data ) {
    if( data.fmsTicket ) {
        var imageURL = _getFileURL( data.fmsTicket );
        const content = '<img src="' + imageURL + '"/>';
        if( ckeditor._instance.data ) {
            const viewFragment = ckeditor._instance.data.processor.toView( content );
            const modelFragment = ckeditor._instance.data.toModel( viewFragment );
            ckeditor._instance.model.insertContent( modelFragment );
        } else {
          var imgHtml = CKEDITOR.dom.element.createFromHtml( content );
            ckeditor._instance.insertElement( imgHtml );
        }
    }
};

/**
 * Get file URL from ticket.
 *
 * @param {String} ticket - File ticket.
 * @return file URL
 */

var _getFileURL = function( ticket ) {
    if( ticket ) {
        return browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) +
            '?ticket=' + ticket;
    }
    return null;
};

/**
 * update data for fileData
 *
 * @param {Object} fileData - key string value the location of the file
 * @param {Object} data - the view model data object
 */
export let updateFormData = function( fileData, data ) {
    if( fileData && fileData.value ) {
        var form = data.form;
        data.formData = new FormData( $( form )[ 0 ] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * The rich text that was entered into editor
 *
 * @param {Object} text the rich text
 */
export let setRichText = function( text ) {
    _richText = text;
};

/**
 * The plain text that was entered into editor
 *
 * @param {Object} text the plain text
 */
export let setPlainText = function( text ) {
    _plainText = text;
};

/**
 * Returns rich text
 *
 * @return {Object} text string
 */
export let getRichText = function() {
    if ( _richText.includes( '<img' ) ) {
        if ( !_richText.includes( 'style=\"width:100%\"' ) ) {
            if( browserUtils.isIE ) {
                _richText = _richText.replace( /<(\s*)img(.*?)\s*\/>/g, '<$1img$2 style=\"width:100%\"/>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\/\s*>/g, '<$1img$2></img>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\s*>/g, '<$1img$2></img>' );
            } else {
                _richText = _richText.replace( /<(\s*)img(.*?)\s*>/g, '<$1img$2 style=\"width:100%\"/>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\/\s*>/g, '<$1img$2></img>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\s*>/g, '<$1img$2></img>' );
            }
        }
    }
    return _richText;
};

/**
 * Returns plain text
 *
 * @return {Object} text string
 */
export let getPlainText = function() {
    return _plainText;
};


export let setIsTextValid = function( valid ) {
    _isTextValid = valid;
    eventBus.publish( 'isInputTextValidEvent', null );
};

/**
 * Sets variable with whether text was entered. Called by action and value is used by condition to set visibility of
 * post button.
 * @param {String} data vmdata
 */
export let isInputTextValid = function( data ) {
    data.isInputTextValid = _isTextValid;
};
export let warnParticipantSourceNoReadAccess = function() {
    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );

    var sourceParticipantMap = constructSrcObjUsrJSObj( convCtx.objectUserMap );
    var participantSourceMap = constructSrcObjUsrJSObj( convCtx.userObjectMap );
    var participantNames = [];
    var sourceObjNames = [];

    _.forEach( Object.keys( participantSourceMap ), function( participantUid ) {
        var part = cdm.getObject( participantUid ).props.object_string.dbValues[0].split( '(' )[0].trim();
        var sourceObjName = '';
        for( var ii = 0; ii < participantSourceMap[participantUid].length; ii++ ) {
            sourceObjName += cdm.getObject( participantSourceMap[participantUid][ii].uid ).props.object_string.dbValues[0];
            sourceObjName += ', ';
        }
        sourceObjName = sourceObjName.slice( 0, -2 );
        sourceObjNames.push( sourceObjName );
        participantNames.push( part );
    } );

    convCtx.warnMsgText = '';
    for( var jj = 0; jj < participantNames.length; jj++ ) {
        convCtx.warnMsgText += messageSvc.applyMessageParamsWithoutContext( convCtx.i18nindividualReadAccessWarnDesc, [ participantNames[jj], sourceObjNames[jj] ] );
        convCtx.warnMsgText += '\n';
    }
    convCtx.warnMsgText.trim();
    if( participantNames.length > 0 && sourceObjNames.length > 0 ) {
        convCtx.showWarnMsg = true;
    }else {
        convCtx.showWarnMsg = false;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

var constructSrcObjUsrJSObj = function( soaMap ) {
    var jsObjFromSoaMap = {};
    if( !soaMap || soaMap[0].length <= 0 || soaMap[1].length <= 0 || soaMap[0].length !== soaMap[1].length ) {
        return jsObjFromSoaMap;
    }
    for( var ii = 0; ii < soaMap[0].length; ii++ ) {
        jsObjFromSoaMap[soaMap[0][ii].uid] = soaMap[1][ii];
    }
    return jsObjFromSoaMap;
};

export let changeConvType = function( data ) {
    if( data.convType && data.convType.dbValue === '' ) {
        data.convType.dbValue = 'message';
        return;
    }
    data.convType.dbValue = '';
};

export let initCreateCollabObjectPanel = function( data ) {
    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    convCtx.collabDataProviders = data.dataProviders;
    convCtx.showWarnMsg = false;
    convCtx.warnMsgText = '';
    convCtx.i18nparticipantReadAccessWarningMsg = data.i18n.participantReadAccessWarningMsg;
    convCtx.i18nindividualReadAccessWarnDesc = data.i18n.individualReadAccessWarnDesc;
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * Ac0CreateCollabObjectService factory
 */

export default exports = {
    setIsTextValid,
    showRichTextEditor,
    updateFormData,
    insertImage,
    setRichText,
    setPlainText,
    getRichText,
    getPlainText,
    isInputTextValid,
    warnParticipantSourceNoReadAccess,
    changeConvType,
    initCreateCollabObjectPanel

};
app.factory( 'Ac0CreateCollabObjectService', () => exports );
