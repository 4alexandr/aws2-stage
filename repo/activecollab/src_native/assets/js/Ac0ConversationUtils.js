// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0ConversationUtils
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import browserUtils from 'js/browserUtils';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import fmsUtils from 'js/fmsUtils';
import uwPropSvc from 'js/uwPropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var LESS_CHARACTER_LIMIT = 131;

export let processRichText = function( richText ) {
    var curtailedRichTextObj = {};
    curtailedRichTextObj.curtailRichText = '';
    curtailedRichTextObj.showMore = false;

    if( richText.length < LESS_CHARACTER_LIMIT ) {
        curtailedRichTextObj.curtailRichText = richText;
        return curtailedRichTextObj;
    }

    curtailedRichTextObj.showMore = true;

    //restricting richText length to LESS_CHARACTER_LIMIT
    var charLimitRichText = richText.substring( 0, LESS_CHARACTER_LIMIT + 1 );

    //edge case of mangled html due to cutting off text
    if( /<\w*$/.test( charLimitRichText ) || /<\/\w*$/.test( charLimitRichText ) ) {
        charLimitRichText = charLimitRichText.substring( 0, charLimitRichText.lastIndexOf( '<' ) );
    }

    //if text contains special html tags, split at where it begins
    charLimitRichText = charLimitRichText.split( /(?:<ul>)|(?:<ol>)|(?:<img)/ )[ 0 ];

    //check for open tags
    var openTags = [];
    var closeTags = [];
    var appendedTags = '';


    var openTagIt = charLimitRichText.matchAll( /\s*<\w+>\s*/g );
    var closeTagIt = charLimitRichText.matchAll( /\s*<\/\w+>\s*/g );

    for( var ot of openTagIt ) {
        openTags.push( ot[ 0 ].substring( ot[ 0 ].indexOf( '<' ) + 1, ot[ 0 ].indexOf( '>' ) ) );
    }

    for( var ct of closeTagIt ) {
        closeTags.push( ct[ 0 ].substring( ct[ 0 ].indexOf( '/' ) + 1, ct[ 0 ].indexOf( '>' ) ) );
    }

    if( openTags.length > 0 && closeTags.length > 0 ) {
        for( var ii = 0; ii < closeTags.length; ii++ ) {
            for( var jj = 0; jj < openTags.length; jj++ ) {
                if( closeTags[ ii ] === openTags[ jj ] ) {
                    openTags[ jj ] = null;
                    break;
                }
            }
        }
        for( var kk = openTags.length - 1; kk >= 0; kk-- ) {
            if( openTags[kk] !== null ) {
                appendedTags += '</' + openTags[kk] + '>';
            }
        }
    }
    curtailedRichTextObj.curtailRichText = charLimitRichText.trim() + appendedTags + ' ...';

    return curtailedRichTextObj;
};

export let processPlainText = function( plainText ) {
    var curtailedPlainTextObj = {};
    curtailedPlainTextObj.curtailPlainText = '';
    curtailedPlainTextObj.showMore = false;

    if( plainText.length < LESS_CHARACTER_LIMIT ) {
        curtailedPlainTextObj.curtailPlainText = plainText;
        curtailedPlainTextObj.showMore = false;
        return curtailedPlainTextObj;
    }

    curtailedPlainTextObj.showMore = true;
    var charLimitPlainText = plainText.substring( 0, LESS_CHARACTER_LIMIT + 1 );
    curtailedPlainTextObj.curtailPlainText = charLimitPlainText + ' ...';
    return curtailedPlainTextObj;
};

/**
 * getObjectUID - returns the object UID
 * @param {Object} object object whose uid is required
 * @returns {String} uid
 */
export let getObjectUID = function( object ) {
    var uid;

    if( object && object.uid ) {
        uid = object.uid;

        if( object.props && object.props.awb0UnderlyingObject ) {
            uid = object.props.awb0UnderlyingObject.dbValues[0];
        }
    }

    return uid;
};

/**
 * Return the cursor end index value
 * @param {Object} data Data
 * @returns {Integer} end index value
 */
export let getCursorEndIndexValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var endValue = cursorObjectVar.endIndex;
        if( typeof endValue !== 'undefined' && endValue !== null ) {
            return endValue;
        }
    }
    return 0;
};

/**
 * Return the cursor end reached value
 * @param {Object} data Data
 * @returns {Boolean} end reached value
 */
export let getCursorEndReachedValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var endReachedValue = cursorObjectVar.endReached;
        if( typeof endReachedValue !== 'undefined' && endReachedValue !== null ) {
            return endReachedValue;
        }
    }
    return false;
};

/**
 * Return the cursor start reached value
 * @param {Object} data Data
 * @returns {Boolean} start reached value
 */
export let getCursorStartReachedValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var startReachedValue = cursorObjectVar.startReached;
        if( typeof startReachedValue !== 'undefined' && startReachedValue !== null ) {
            return startReachedValue;
        }
    }
    return false;
};

/**
 * @param {Array} vmos selected vmos to be deleted
 * @param {Object} dataprovider dataprovider that contains list that needs to be updated
 */
export let removeObjectsFromDPCollection = function( vmos, dataprovider ) {
    var allLoadedObjects = dataprovider.viewModelCollection.getLoadedViewModelObjects();
    var loadedObjectsAfterRemove = _.difference( allLoadedObjects, vmos );
    dataprovider.update( loadedObjectsAfterRemove, loadedObjectsAfterRemove.length );
};

/**
 * getObjectUID - returns the object UID
 * @param {Object} subPanelCtx sub panel context
 * @returns {String} uid
 */
export let getConvObjectUID = function( subPanelCtx ) {
    return subPanelCtx.uid;
};

export let teardownCommentsPanel = function( vmData, convContext ) {
    vmData.hideMoreRepliesButton = true;
    vmData.loadMoreComments = false;
    vmData.hideReplyBox = true;
    vmData.moreCommentsAvailable = false;
    convContext.cursorStartIndx = convContext.props.numReplies.dbValue;
    convContext.cursorEndIndx = convContext.props.numReplies.dbValue;
};

export let initCommentsPanel = function( vmData, convContext ) {
    var dpMaxToLoad = vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad;
    if( convContext.cursorStartIndx === 0 && convContext.cursorEndIndx === 0 || convContext.cursorStartIndx === convContext.cursorEndIndx && convContext.cursorStartIndx <= dpMaxToLoad ) { //no comments available to load or available comments can be fetched in 1 load. No paging required, proceed naturally
        vmData.loadMoreComments = false;
        vmData.hideMoreRepliesButton = true;
        vmData.hideReplyBox = false;
        vmData.moreCommentsAvailable = false;
        return;
    }

    if( convContext.cursorStartIndx === convContext.cursorEndIndx ) { // comments available and first load. startIndex > maxToLoad
        //paging required, startIndex = totalNumReplies - maxToLoad, after this point, startIndex should always be < endIndex
        convContext.cursorStartIndx -= dpMaxToLoad;
        vmData.hideReplyBox = false;
        //assume more are available until searchIndex is 0. Taken care of as post action in Ac0ConversationService::modifyComments
        vmData.hideMoreRepliesButton = false;
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex = convContext.cursorStartIndx;
        return;
    }
    //paging required - not 1st load, startIndex has been changed by loadMore action
    vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex = convContext.cursorStartIndx;
    vmData.hideReplyBox = true;
    //assume more are available until searchIndex is 0. Taken care of as post action in Ac0ConversationService::modifyComments
    vmData.hideMoreRepliesButton = false;
    if( vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex === 0 ) { //last load after paging
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad = convContext.cursorEndIndx;
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToReturn = convContext.cursorEndIndx;
        vmData.loadMoreComments = false;
        vmData.hideReplyBox = true;     //panel of comments other than 1st. need to hide
        vmData.hideMoreRepliesButton = true;        //no more replies since last load
        vmData.moreCommentsAvailable = false;       //no more comments available since last load
    }
};

/**
 * setSelectedObjectInContext - returns the object name value
 * @param {Object} object object whose uid is required
 */
export let setSelectedObjectInContext = function( data ) {
    var dbStringValue;
    var uiStringValue;

    if( appCtxSvc.ctx.selected ) {
        if( appCtxSvc.ctx.selected.props && appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
            var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
            var underlyingObj = cdm.getObject( underlyingUid );
            appCtxSvc.ctx.Ac0ConvCtx.selected = underlyingObj;
        } else {
            appCtxSvc.ctx.Ac0ConvCtx.selected = appCtxSvc.ctx.selected;
        }
    }
};

/**
 * setObjectDisplayData - returns the object name value
 * @param {Object} object object whose uid is required
 */
export let setObjectDisplayData = function( data ) {
    if( appCtxSvc.ctx.selected ) {
        if( appCtxSvc.ctx.selected.props && 
            appCtxSvc.ctx.selected.props.awb0UnderlyingObject && appCtxSvc.ctx.Ac0ConvCtx.selected ) {
            var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
            dmSvc.getProperties( [ underlyingUid ], [ 'object_name' ] ).then( function( response ) {
                var underlyingObj = cdm.getObject( underlyingUid );
                var dbStringValue = underlyingObj.props.object_name.dbValues[0];
                var uiStringValue = underlyingObj.props.object_name.uiValues[0];
                appCtxSvc.ctx.Ac0ConvCtx.selected = underlyingObj;
                appCtxSvc.ctx.Ac0ConvCtx.selected.props.object_name.dbValue = dbStringValue;
                appCtxSvc.ctx.Ac0ConvCtx.selected.props.object_name.uiValue = uiStringValue;

                uwPropSvc.setValue( data.selectedObject, uiStringValue );
            } );
        } else {
            appCtxSvc.ctx.Ac0ConvCtx.selected = appCtxSvc.ctx.selected;
        }
    }
};

export let saveDeleteConvItemInContext = function( eventData ) {
    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    convCtx.deleteConvObj = [ eventData ];
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * Return FMS base url
 * @returns {String} url
 */
export let getFmsBaseURL = function() {
    return browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
};

/**
 * Ac0ConversationUtils factory
 */

export default exports = {
    processRichText,
    processPlainText,
    getObjectUID,
    getCursorEndIndexValue,
    getCursorEndReachedValue,
    getCursorStartReachedValue,
    removeObjectsFromDPCollection,
    getConvObjectUID,
    teardownCommentsPanel,
    initCommentsPanel,
    setSelectedObjectInContext,
    setObjectDisplayData,
    saveDeleteConvItemInContext,
    getFmsBaseURL
};
app.factory( 'Ac0ConversationUtils', () => exports );
