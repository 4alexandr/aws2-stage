/* eslint-disable max-lines */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define CKEDITOR */

/**
 * Requirement Markup Util
 *
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Arm0MarkupUtil
 */
import app from 'app';
import markupData from 'js/MarkupData';
import markupReq from 'js/MarkupRequirement';
import markupService from 'js/Arm0MarkupService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import ckeditorOperations from 'js/ckeditorOperations';
import _ from 'lodash';

var _i18n = {};

//======================= exported vars and functions =========================
let exports;
export let i18n = _i18n;
/**
 * Get markup input to
 *  @return {Object} markupInput return markup input data
 */
export let getCreateMarkupInput = function( content ) {
    var reqMarkupsInputData = [];
    var reqMarkupsData = [];

    // To save only updated or newly created markups
    reqMarkupsData = _getOnlyUpdatedMarkups();
    if( reqMarkupsData && reqMarkupsData.length > 0 ) {
        _.forEach( reqMarkupsData, function( reqMarkup ) {
            // Remove markup before saving if page is -1
            var markupsToSave = [];
            _.forEach( reqMarkup.markups, function( markup ) {
                if( markup ) {
                    markupsToSave.push( markup );
                }
            } );
            reqMarkup.markups = markupsToSave;
            var specContentData = content.specContents;
            for( var i = 0; i < specContentData.length; i++ ) {
                var specContent = specContentData[ i ];
                if( reqMarkup.baseObject.uid === specContent.specElemRevision.uid ) {
                    if( !reqMarkup.properties ) {
                        reqMarkup.properties = {};
                    }
                    reqMarkup.properties.lastSavedDate = specContent.lastSavedDate;
                    break;
                }
            }

            var reqParseMarkup = _stringifyRequirementsMarkups( reqMarkup );
            if( reqParseMarkup ) {
                reqMarkupsInputData.push( reqParseMarkup );
            }
        } );
    }
    return reqMarkupsInputData;
};

/**
 * Get only updated markups
 *
 *  @return {Object} reqMarkupsData returns only updated markups
 */
var _filterRequirementMarkups = function( arrMarkups, baseReqUid ) {
    var reqMarkups = [];

    // check if there is new markup
    for( var i = 0; i < arrMarkups.length; i++ ) {
        if( arrMarkups[ i ].objId === baseReqUid ) {
            reqMarkups.push( arrMarkups[ i ] );
        }
    }
    return reqMarkups;
};

/**
 * Check the markup is newly created one
 *  @param {Array} arrMarkups - array of markups
 *  @param {Object} markup - markup
 */
var _CreateMarkupDataForNewObject = function( arrReqMarkups, markup ) {
    var isReqMarkupDataExist = false;
    _.forEach( arrReqMarkups, function( tmpReqMarkup ) {
        if( tmpReqMarkup.baseObject.uid === markup.objId ) {
            isReqMarkupDataExist = true;
        }
    } );
    if( !isReqMarkupDataExist ) {
        var revObject = cdm.getObject( markup.objId );
        if(revObject){
            var markupData = {
                baseObject: {
                    type: revObject.type,
                    uid: revObject.uid
                },
                markups: [],
                properties: {
                    message: 'author'
                },
                version: ''
            };
            arrReqMarkups.push( markupData );
        }
    }
};

/**
 * Check the markup is newly created one
 *  @param {Array} arrMarkups - array of markups
 *  @param {Object} markup - markup
 *  @return {boolean} return true if markup is already exist
 */
var _isMarkupExist = function( arrMarkups, markup ) {
    var isExist = false;
    _.forEach( arrMarkups, function( tmpMarkup ) {
        if( tmpMarkup.reqData.commentid === markup.reqData.commentid ) {
            isExist = true;
        }
    } );
    return isExist;
};

/**
 * Get only updated markups
 *  @param {Array} arrMarkups - array of markups on all objects
 *  @param {Object} reqMarkups - one requirement object with markups array
 *  @return {boolean} return true if markup data is updated.
 */
var _updateRequirementMarkups = function( arrMarkups, reqMarkups ) {
    var isUpdated = false;
    var markups = reqMarkups.markups;
    var markupCount = markups.length;

    for( var j = markupCount - 1; j >= 0; j-- ) {
        var isExist = false;
        _.forEach( arrMarkups, function( tmpMarkup ) {
            if( markups[ j ] && markups[ j ].reqData.commentid === tmpMarkup.reqData.commentid ) {
                isExist = true;

                if( markups[ j ].comment !== tmpMarkup.comment ||
                    markups[ j ].status !== tmpMarkup.status ||
                    markups[ j ].start.rch !== tmpMarkup.start.rch ||
                    markups[ j ].end.rch !== tmpMarkup.end.rch ) {
                    markups[ j ] = tmpMarkup;
                    isUpdated = true;
                }
            }
        } );
        if( !isExist && markups[ j ] ) {
            markups.splice( j, 1 );
            isUpdated = true;
        }
    }

    // check if there is new markup
    for( var i = 0; i < arrMarkups.length; i++ ) {
        var tmpMarkup = arrMarkups[ i ];
        if( !_isMarkupExist( markups, tmpMarkup ) ) { // new markup
            isUpdated = true;
            markups.push( tmpMarkup );
        }
    }
    return isUpdated;
};

/**
 * Get only updated markups
 *
 *  @return {Object} reqMarkupsData returns only updated markups
 */
var _getOnlyUpdatedMarkups = function() {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    var allMarkupsCurrent = markupCtx.reqMarkupsData;

    var serverReqMarkupsData = [];
    var updatedReqMarkupsData = [];

    serverReqMarkupsData = markupCtx.serverReqMarkupsData;

    for( var i = 0; i < allMarkupsCurrent.length; i++ ) {
        var tmpMarkup = allMarkupsCurrent[ i ];
        _CreateMarkupDataForNewObject( serverReqMarkupsData, tmpMarkup );
    }

    _.forEach( serverReqMarkupsData, function( reqOrigMarkups ) {
        var reqMarkups = _.cloneDeep( reqOrigMarkups );
        var baseReqUid = reqMarkups.baseObject.uid;
        var arrMarkups = _filterRequirementMarkups( allMarkupsCurrent, baseReqUid );

        if( _updateRequirementMarkups( arrMarkups, reqMarkups ) ) {
            updatedReqMarkupsData.push( reqMarkups );
        }
    } );

    return updatedReqMarkupsData;
};

/**
 * Stringify the markups
 *
 * @param {boolean} reqMarkups -  get all markups from string json
 * @return {Object} return requirement markups
 */
var parseRequirementMarkup = function( reqMarkups ) {
    var escaped = reqMarkups.replace( /[\u007f-\uffff]/g, function( c ) {
        return '\\u' + ( '0000' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
    } );
    var objs = JSON.parse( escaped );
    var reqParseMarkups = [];
    for( var i = 0; i < objs.length; i++ ) {
        var markup = objs[ i ];
        reqParseMarkups.push( markup );
    }
    return reqParseMarkups;
};
/**
 * parse the requirement markups
 *
 * @param {Array} reqMarkups the json representation of the markups
 * @return {Array} reqMarkups return requirement markups with parsing data ;
 */
var _parseRequirementsMarkups = function( reqMarkups ) {
    if( reqMarkups && reqMarkups.markups ) {
        var reqParseMarkups = parseRequirementMarkup( reqMarkups.markups );
        reqMarkups.markups = [];
        for( var i = 0; i < reqParseMarkups.length; i++ ) {
            var markup = reqParseMarkups[ i ];
            if( !markup.reqData ) {
                markup.reqData = {};
            }
            if( markup.commentid ) {
                markup.reqData.commentid = markup.commentid;
                delete markup.commentid;
            }

            if( markup.parentCommentid ) {
                markup.reqData.parentCommentid = markup.parentCommentid;
                delete markup.parentCommentid;
            }

            if( markup.isCommentOnTitle ) {
                markup.reqData.isCommentOnTitle = markup.isCommentOnTitle;
                delete markup.isCommentOnTitle;
            }

            reqMarkups.markups.push( markup );
        }
        return reqMarkups;
    }
    return [];
};

/**
 * Stringify one markup
 *
 * @param {Markup} markup - the markup to be stringified
 * @returns {String} the json string
 */
var _stringifyMarkup = function( markup ) {
    return JSON.stringify( markup );
};

/**
 * Stringify the requirement markups
 *
 * @param {Array} reqMarkups the json representation of the markups
 * @return {Array} reqMarkups reqMarkups return requirement markups;
 */
var _stringifyRequirementsMarkups = function( reqMarkups ) {
    var json = _stringifyRequirementMarkup( reqMarkups.markups );
    reqMarkups.markups = '';
    if( json !== '[]' ) {
        reqMarkups.markups = json;
    }
    return reqMarkups;
};

/**
 * Stringify the markups
 *
 * @param {boolean} markups -  get all markups
 *
 * @return {String} the json representation of the markups
 */
export let  _stringifyRequirementMarkup = function( markups ) {
    var json = '[';
    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        json += ( json === '[' ? '' : ',\n' ) + _stringifyMarkup( markup );
    }

    json += ']';
    return json.replace( /[\u007f-\uffff]/g, function( c ) {
        return '\\u' + ( '0000' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
    } );
};

/**
 * Update markup context
 *
 */
export let updateMarkupContext = function() {
    var markupsJson = ckeditorOperations.stringifyMarkups();
    var reqMarkupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    reqMarkupCtx.response = {
        version: '',
        baseObject: undefined,
        markups: markupsJson,
        properties: {
            message: 'author'
        }
     };
    reqMarkupCtx.reqMarkupsData = parseRequirementMarkup( markupsJson );
    return reqMarkupCtx;
};

/**
 * Internal function to set markup up context to Markup service
 *
 * @param {object} reqMarkupCtx -  Requirement markup Context
 *
 * @return {String} the json representation of the markups
 */
var _setMarkupContext = function( serverReqMarkupsData, allMarkups ) {
    var markupOutput = {
        version: '',
        baseObject: undefined,
        markups: allMarkups,
        properties: {
            message: 'author'
        }
    };
    var hideMarkups = false;

    var reqMarkupsData = _stringifyRequirementsMarkups( markupOutput );

    var reqMarkupCtx = {
        serverReqMarkupsData: serverReqMarkupsData,
        viewerType: 'aw-requirement-ckeditor',
        supportedTools: { highlight: true },
        response: allMarkups.length > 0 ? reqMarkupsData : undefined
    };

    appCtxSvc.registerCtx( 'reqMarkupCtx', reqMarkupCtx );
    ckeditorOperations.initializationForComments();
    ckeditorOperations.highlightComments( reqMarkupCtx );
    var activeCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeCommand && activeCommand.commandId === 'Arm0MarkupMain' ) {
        hideMarkups = false;
    }

    if( hideMarkups ) {
        markupService.hidePanel();
    }
};
/**
 * Set markup context
 *
 * @param {Object} data - view model data
 */
export let setMarkupContext = function( data ) {
    var reqMarkupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( reqMarkupCtx && reqMarkupCtx.reqMarkupsData ) {
        _setMarkupContext( reqMarkupCtx.serverReqMarkupsData, reqMarkupCtx.reqMarkupsData );
    }
    var serverReqMarkupsData = [];

    var allMarkups = [];
    if( data && data.content && data.content.markUpData ) {
        var markUpData = data.content.markUpData;
        _.forEach( markUpData, function( reqMarkup ) {
            var reqParseMarkup = _parseRequirementsMarkups( reqMarkup );
            if( reqParseMarkup && reqParseMarkup.markups && reqParseMarkup.markups.length > 0 ) {
                allMarkups = allMarkups.concat( reqParseMarkup.markups );
            }
            serverReqMarkupsData.push( reqParseMarkup );
        } );
        _setMarkupContext( serverReqMarkupsData, allMarkups );
    }
};
/**
 * Restore all markups, in case of Undo event
 */
export let attachCachedMarkupsToNode = function() {
    markupReq.attachCachedMarkupsToNode();
};

/**
 * Unselect the current selection
 */
export let clearMarkupSelection = function() {
    setTimeout( function() {
        markupService.unselectCurrent();
    }, 100 );
};

//======================= app factory and filters =========================

export default exports = {
    i18n,
    setMarkupContext,
    updateMarkupContext,
    getCreateMarkupInput,
    attachCachedMarkupsToNode,
    clearMarkupSelection,
    _stringifyRequirementMarkup
};
/**
 * The factory
 *
 * @memberof NgServices
 * @member Arm0MarkupUtil
 */
app.factory( 'Arm0MarkupUtil', () => exports );
