// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the markup view model for highlighting or drawing markups on the viewer panel
 *
 * @module js/Arm0MarkupViewModel
 */
import markupData from 'js/MarkupData';
import markupThread from 'js/MarkupThread';
import markupCanvas from 'js/MarkupCanvas';
import appCtxSvc from 'js/appCtxService';
import markupRequirement from 'js/MarkupRequirement';
import ckeditorOperations from 'js/ckeditorOperations';
import msgSvc from 'js/messagingService';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import _ from 'lodash';

'use strict';
//==================================================
// private variables
//==================================================
/** All markups */
var markups = markupData.markups;
/** All users */
var users = markupData.users;
/** The list of markups to be shown */
var markupList = [];
/** The list of stamps to be shown */
var stampList = [];
/** The version */
var version = '';
/** The message */
var message = '';
/** The role */
var role = '';
/** The sort by */
var sortBy = 'all';
/** The filter text */
var filter = '';
/** The list of filters */
var filterList = [];
/** The login user id */
var loginUserId = '';
/** The login user name */
var loginUserName = '';

var usersMap = new Map();

var commentsMap = new Map();

var replyCommentsMap = new Map();

//==================================================
// public functions
//==================================================
/**
 * Set the login user
 *
 * @param {String} id the login user id
 * @param {String} name the login user name
 */
export function setLoginUser( id, name ) {
    loginUserId = id;
    loginUserName = name;
}

/**
 * Clear the markup list
 */
export function clearMarkupList( isCk5 ) {
    for( var i = 0; i < markups.length; i++ ) {
        markups[ i ].visible = false;
    }
    if( !isCk5 ) {
        // remove all markups
        markupRequirement.showAll( 2 );
    }
    markupList.length = 0;
}

/**
 * Process the markups
 *
 * @param {String} ver the version
 * @param {String} mes the message
 * @param {String} json the markups in json
 */
export function processMarkups( ver, mes, json ) {
    version = ver;
    message = mes;
    role = mes ? mes.split( ' ' )[0] : '';

    if( message.indexOf( 'up_to_date' ) < 0 ) {
        if( message.indexOf( 'append' ) < 0 ) {
            markupData.clearMarkups();
            markupData.clearUsers();
            markupThread.clear();
            markupData.addUser( loginUserId, loginUserName, loginUserId );
        }

        var start = markups.length;
        markupData.parseMarkups( json );
        markupData.addUsersFromMarkups();

        var end = markups.length;
        markupThread.addToThreads( markups, start, end );
    }
    sortBy = 'all';
    filterList = [];
}

/**
 * Update the markup list
 *
 * @return {Markup} the updated markup list
 */
export function updateMarkupList( isCk5 ) {
    clearMarkupList( isCk5 );

    // Show all markups that are visible
    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        markup.visible = markup.editMode || !markup.deleted && filterMarkup( markup );
        if( markup.visible ) {
            markupList.push( markup );
        }
    }
    var reqMarkupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( reqMarkupCtx && reqMarkupCtx.viewerType === 'aw-requirement-ckeditor' ) {
        var flagForComments;
        flagForComments = markupList.length <= 0;
        reqMarkupCtx.flagForComments = flagForComments;
        appCtxSvc.updateCtx( 'reqMarkupCtx', reqMarkupCtx );
    }
    if( !isCk5 ) {
        // show all visible markups
        markupRequirement.showAll();
    }
    return sortMarkupList();
}

/**
 * Set the current sort by choice
 *
 * @param {String} inSortBy the sort by "all", "user", "date", or "status"
 *
 * @return {boolean} true if set to a different value
 */
export function setSortBy( inSortBy ) {
    if( inSortBy && inSortBy !== sortBy ) {
        sortBy = inSortBy;
        return true;
    }
    return false;
}

/**
 * Sort the markup list
 *
 * @return {Markup} the sorted markup list
 */
export function sortMarkupList() {
    clearGroups();
    markupList.sort( function( markup0, markup1 ) {
        if( markup0 === markup1 ) {
            return 0;
        }

        if( sortBy === 'status' ) {
            var statusOrder = markupThread.compareStatus( markup0, markup1 );
            if( statusOrder !== 0 ) {
                return statusOrder;
            }
        }

        if( sortBy === 'status' || sortBy === 'page' || sortBy === 'all' ) {
            var posOrder = markupThread.comparePosition( markup0, markup1 );
            if( posOrder !== 0 ) {
                return posOrder;
            }

            return markupThread.compareDate( markup0, markup1 );
        }

        if( sortBy === 'user' ) {
            var nameOrder = compareUser( markup0, markup1 );
            if( nameOrder !== 0 ) {
                return nameOrder;
            }
        }

        if( sortBy === 'user' || sortBy === 'date' ) {
            return markupThread.compareDate( markup1, markup0 );
        }

        return 0;
    } );

    insertGroups();
    return markupList;
}

/**
 * Toggle the group between expanded and collapsed
 *
 * @param {Markup} group to be toggled
 * @param {boolean} inStamps optional true for stamps, otherwise for markups
 * @return {Markup} the updated markup or stamp list
 */
export function toggleGroup( group, inStamps ) {
    var list = inStamps ? stampList : markupList;
    var index = list.indexOf( group );

    group.expanded = !group.expanded;
    if( group.expanded ) {
        for( var i = 0; i < group.list.length; i++ ) {
            var markup = group.list[ i ];
            markup.visible = true;
            list.splice( index + i + 1, 0, markup );
        }
    } else {
        if( index >= 0 && index + group.list.length < list.length ) {
            var removed = list.splice( index + 1, group.list.length );
            for( var j = 0; j < removed.length; j++ ) {
                removed[ j ].visible = false;
            }
        }
    }

    if( !inStamps ) {
        markupRequirement.showAll();
    }

    return list;
}

/**
 * Generate and return the random alphanumeric ID for the newly created markup
 */
function getReqData( markup ) {
    var commentId = 'RM::Markup::' + Math.random().toString( 36 ).substr( 2, 10 );

    var reqData = { };
    reqData.commentid = commentId;

    var reqMarkupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( reqMarkupCtx && reqMarkupCtx.viewerType === 'aw-requirement-ckeditor' ) {
        if( reqMarkupCtx.markupHeader ) {
        reqData.markupHeader = reqMarkupCtx.markupHeader;
        } else {
            reqData.markupHeader = markup.reqData.markupHeader;
        }
    }

    return reqData;
}
/**
 * Add new markup
 *
 * @return {Markup} the newly added markup
 */
export function addNewMarkup() {
    var userSelection = markupRequirement.getUserSelection();
    if( !userSelection || !userSelection.reference && !userSelection.geometry ) {
        return null;
    }

    var type = userSelection.geometry ? '2d' : 'text';
    var newMarkup = markupData.addMarkup( loginUserId, loginUserName, loginUserId, userSelection.start,
        userSelection.end, type );

    newMarkup.reference = userSelection.reference;
    newMarkup.geometry = userSelection.geometry;
    newMarkup.objId = userSelection.objId;
    newMarkup.viewParam = markupRequirement.getViewParam();
    if( users.length > 0 ) {
        newMarkup.userObj = users[ 0 ].userObj;
    }
    if( newMarkup.objId ) {
        newMarkup.reqData = getReqData();
    }else {
        var index = markups.indexOf( newMarkup );
        if ( index >= 0 ) {
            markups.splice( index, 1 );
        }
        var resource = 'RichTextEditorCommandPanelsMessages';
        var localTextBundle = localeService.getLoadedText( resource );
        var commentMessage = localTextBundle.commentMsg;
        msgSvc.showError( commentMessage );
        var markupCtx = appCtxSvc.getCtx( 'markup' );
        if( markupCtx ) {
            markupCtx.selectedTool = null;
        }
        eventBus.publish( 'requirementDocumentation.selectionChangedinCkEditor', { isSelected : false } );
        return;
    }
    newMarkup.editMode = 'new';
    putComment( newMarkup );
    ckeditorOperations.renderComment( newMarkup, markupList, markups );
    return newMarkup;
}

/**
 * Add reply markup
 *
 */
export function populateMarkupList( allMarkups, json ) {
    markupList = _.cloneDeep( allMarkups );
    markupData.parseMarkups( json );
    markupData.addUsersFromMarkups();
    var users = markupData.users;
    for( var i = 0; i < users.length; i++ ) {
        var faintColor  = users[i].color;
        var darkColor = faintColor.replace( '0.125', '0.25' );
        users[i].darkColor = darkColor;
        if( !usersMap.has( users[i].initial ) ) {
            usersMap.set( users[i].initial, users[i] );
        }
    }
    createCommentsMap( allMarkups );
    createReplyCommentsMap( allMarkups );
    markups = _.cloneDeep( allMarkups );
}

/**
 * Method to create map of comments
 * @param {Array} allMarkups the markups array
 */
function createCommentsMap( allMarkups ) {
    for( var i = 0; i < allMarkups.length; i++ ) {
        var markup = allMarkups[i];
        commentsMap.set( markup.reqData.commentid, markup );
    }
}

/**
 * Method to create map of reply comments
 * @param {Array} allMarkups the markups array
 */
function createReplyCommentsMap( allMarkups ) {
    for( var i = 0; i < allMarkups.length; i++ ) {
        var markup = allMarkups[i];
        insertReplyComment( markup );
    }
}

/**
 * Method to create map of comments
 * @param {Array} allMarkups the markups array
 */
export function getComment( id ) {
    if( commentsMap.has( id ) ) {
        return commentsMap.get( id );
    }
    return null;
}

/**
 * Method to create map of comments
 * @param {JSON} markup the markup to add in map
 */
export function putComment( markup ) {
    if( !commentsMap.has( markup.reqData.commentid ) ) {
        commentsMap.set( markup.reqData.commentid, markup );
    }
}

/**
 * Method to create map of reply comments
 * @param {JSON} markup the markup to add in map
 */
export function insertReplyComment( markup ) {
    if( markup && markup.reqData && markup.reqData.parentCommentid && markup.reqData.parentCommentid !== '' ) {
        if( replyCommentsMap.has( markup.reqData.parentCommentid ) ) {
            var currentCommentsList = replyCommentsMap.get( markup.reqData.parentCommentid );
            var value = isReplyExist( currentCommentsList, markup.reqData.commentid );
            if( !value ) {
                currentCommentsList.push( markup );
                replyCommentsMap.set( markup.reqData.parentCommentid, currentCommentsList );
            }
        }else{
            replyCommentsMap.set( markup.reqData.parentCommentid, [ markup ] );
        }
    }
}


/**
 * Method to get all reply comments against parentCommentid
 * @param {JSON} markup - parentCommentid
 * @param {Array} finalMarkupsList - finalMarkupsList
 */
export function getReplyComments( markup, finalMarkupsList ) {
    if( replyCommentsMap.has( markup.reqData.commentid ) ) {
        var allReplyComments = replyCommentsMap.get( markup.reqData.commentid );
        for ( const comment of allReplyComments ) {
            comment.start = markup.start;
            comment.end = markup.end;
            finalMarkupsList.push( comment );
        }
    }
}

/**
 * Method to get the user object
 * @param {JSON} markup the markup for which user to find
 * @returns {JSON} the user object
 */
export function getUser( markup ) {
    if( markup ) {
        var commentsHandler = ckeditorOperations.getMarkupTextInstance();
        var parentMarkup = commentsHandler.getKey( markup );
        if( parentMarkup && parentMarkup.length > 0 ) {
            var user = usersMap.get( parentMarkup[ 0 ].initial );
            if( user ) {
                return user;
            }
        }
    }
    user = {};
    user.color = 'rgba(255, 0, 0, 0.125)';
    user.darkColor = 'rgba(255, 0, 0, 0.25)';
    return user;
}

/**
 * Add reply markup
 *
 * @param {Markup} markup - the markup being replied
 *
 * @return {Markup} the replying markup
 */
export function addReplyMarkup( markup ) {
    var replyMarkup = markupData.addMarkup( loginUserId, loginUserName, loginUserId, markup.start, markup.end,
        markup.type );

    replyMarkup.reference = markup.reference;
    replyMarkup.geometry = markup.geometry;
    replyMarkup.viewParam = markup.viewParam;

    if( markup.objId && markup.reqData ) {
        replyMarkup.reqData = getReqData( markup );
        replyMarkup.objId = markup.objId;

        if( !replyMarkup.reqData.parentCommentid ) {
            if( !markup.reqData.parentCommentid ) {
                replyMarkup.reqData.parentCommentid = markup.reqData.commentid;
            } else {
                replyMarkup.reqData.parentCommentid = markup.reqData.parentCommentid;
            }
        }
    }
    replyMarkup.userObj = users[ 0 ].userObj;
    replyMarkup.editMode = 'reply';

    // Fix D-13968 where the client machines' clocks are significantly out-of-sync
    if( replyMarkup.date <= markup.date ) {
        replyMarkup.date.setTime( markup.date.getTime() + 1 );
    }

    var status = markupThread.getStatus( markup );
    replyMarkup.status = status === 'open' ? 'replied' : status;
    putComment( replyMarkup );
    insertReplyComment( replyMarkup );
    ckeditorOperations.renderComment( replyMarkup, markupList, markups );
    return replyMarkup;
}

/**
 * delete markup
 *
 * @param {Markup} markup the markup to be deleted
 */
export function deleteMarkup( markup, isCk5 ) {
    markup.deleted = true;
    if( isCk5 ) {
        var selectedComment = exports.getMarkupFromId( markup.reqData.commentid );
        if( selectedComment.deleted !== true ) {
            selectedComment.deleted = true;
        }
        removeReplyComment( markup );
    }
    if( !isCk5 ) {
        markupThread.remove( markup );
    }
}

/**
 * method to remove deleted flag from markup object
 * @param {Markup} markup the markup to undo deleted
 */
export function undoDeleteMarkup( markup ) {
    delete markup.deleted;
}

/**
 * Find users to load
 *
 * @return {String} array of user names
 */
export function findUsersToLoad() {
    var userNames = [];
    markupData.users.forEach( function( user ) {
        if( user.userid && !user.userObj ) {
            userNames.push( user.username );
        }
    } );

    return userNames;
}

/**
 * Is markup editable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if editable
 */
export function isEditable( markup ) {
    return canMarkup() && markupData.isMyMarkup( markup ) && markup.share !== 'official' &&
        !markupThread.isInThread( markup, 'frozen' );
}

/**
 * Is markup replyable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if replyable
 */
export function isReplyable( markup ) {
    return canMarkup() && !markupData.isMyMarkup( markup );
}

/**
 * Is markup  deletable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if deletable
 */
export function isDeletable( markup ) {
    return !markup.stampName ? isEditable( markup ) :
           role === 'admin' ? markup.share === 'public' : markup.share === 'private';
}

/**
 * Is markup indented?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if indented
 */
export function isIndented( markup ) {
    return ( sortBy === 'page' || sortBy === 'status' ) && filterList.length === 0 &&
        markupThread.isInThread( markup, 'rest' );
}

/**
 * Set filter text
 *
 * @param {String} text - the filter text
 * @return {boolean} true if set to a different value
 */
export function setFilter( text ) {
    if( text !== filter ) {
        filter = text;
        if( text === '' ) {
            filterList = [];
        } else {
            var str = text.trim().toLowerCase();
            filterList = str === '' ? [] : str.split( /\s+/ );
        }
        return true;
    }

    return false;
}

/**
 * Set filter text
 *
 * @param {String} id - the filter text
 * @return {Object} true if set to a different value
 */
export function getMarkupFromId( id ) {
    return markups.find( element => {
        if( element.reqData && element.reqData.commentid && element.reqData.commentid === id ) {
            return element;
        }
    } );
}

/**
 * Is markup editable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if editable @return {Object} true if set to a different value
 */
export function isCommentEditable( markup ) {
    return canMarkup() && markupData.isMyMarkup( markup ) && markup.share !== 'official';
}


/**
 * Is markup replyable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if replyable
 */
export function isCommentReplyable( markup ) {
    return canMarkup() && !markupData.isMyMarkup( markup );
}

/**
 * Is markup  deletable?
 *
 * @param {Markup} markup - the markup being tested
 *
 * @return {boolean} true if deletable
 */
export function isCommentDeletable( markup ) {
    return isCommentEditable( markup );
}


/**
 * Clear all markup Html
 */
export function clearMarkupHtml() {
    markupCanvas.clearFillImages();
}

//==================================================
// private functions
//==================================================
var htmlEntities = {
    nbsp: ' ',
    oslash: 'ø',
    cent: '¢',
    pound: '£',
    yen: '¥',
    euro: '€',
    copy: '©',
    reg: '®',
    quot: '"',
    apos: '\''
};

/**
 * Unescape the HTML string
 *
 * @param {String} str string to be unescaped
 * @returns {String} the unescaped string
 */
function unescapeHTML( str ) {
    return str.replace( /&([^;]+);/g, function( entity, entityCode ) {
        var match;

        if( entityCode in htmlEntities ) {
            return htmlEntities[ entityCode ];
            /*eslint no-cond-assign: 0*/
        } else if( match = entityCode.match( /^#x([\da-fA-F]+)$/ ) ) {
            return String.fromCharCode( parseInt( match[ 1 ], 16 ) );
            /*eslint no-cond-assign: 0*/
        } else if( match = entityCode.match( /^#(\d+)$/ ) ) {
            return String.fromCharCode( ~~match[ 1 ] );
        }
            return entity;
    } );
}

/**
 * Get the text to be shown on page
 *
 * @param {Markup} markup - the markup to get the text
 * @returns {String} the text to be shown on page
 */
function getTextToBeShown( markup ) {
    if( markup.showOnPage && markup.showOnPage !== 'none' ) {
        var html = markup.comment.replace( /<p/g, '<div' ).replace( /<\/p>/g, '</div>' );

        if( markup.showOnPage === 'first' ) {
            var index = html.indexOf( '<div', 1 );
            if( index > 0 ) {
                html = html.substring( 0, index );
            }
        }

        return unescapeHTML( html );
    }

    return '';
}

/**
 * Compare user of two markups, the login user is always first
 *
 * @param {Markup} markup0 the first markup
 * @param {Markup} markup1 the second markup
 * @return {number} markup0 < markup1? -1: markup0 > markup1? 1: 0;
 */
function compareUser( markup0, markup1 ) {
    var isMy0 = markupData.isMyMarkup( markup0 );
    var isMy1 = markupData.isMyMarkup( markup1 );

    if( isMy0 !== isMy1 ) {
        return isMy0 ? -1 : 1;
    }

    return markup0.displayname.localeCompare( markup1.displayname );
}

/**
 * Clear all markup groups before sorting
 */
function clearGroups() {
    for( var i = markupList.length - 1; i >= 0; i-- ) {
        if( markupList[ i ].groupName ) {
            var group = markupList.splice( i, 1 )[ 0 ];
            if( !group.expanded ) {
                for( var j = group.list.length - 1; j >= 0; j-- ) {
                    markupList.splice( i, 0, group.list[ j ] );
                }
            }
        }
    }
}

/**
 * Insert all groups after sorting
 */
function insertGroups() {
    var currentGroup = null;

    // Set today which is at 0:00am today
    var now = new Date();
    var today = new Date( now.getFullYear(), now.getMonth(), now.getDate() );

    for( var i = 0; i < markupList.length; i++ ) {
        var markup = markupList[ i ];
        if( !markup.groupName ) {
            var name = sortBy === 'user' ? markup.displayname : sortBy === 'page' ? 'page ' +
                ( markup.start.page + 1 ) : 'unknown';

            // Split to fix SonarQube issue: conditional operators max allowed 3
            name = sortBy === 'status' ? markupThread.getStatus( markup ) : sortBy === 'date' ? getDateName(
                markup.date, today ) : name;

            if( markup.reqData && markup.reqData.markupHeader ) {
                name = sortBy === 'all' ? markup.reqData.markupHeader : name;
                if( currentGroup && currentGroup.groupName === name ) {
                    currentGroup.list.push( markup );
                } else {
                    currentGroup = {
                        groupName: name,
                        list: [ markup ],
                        expanded: true
                    };
                    markupList.splice( i, 0, currentGroup );
                    i++;
                }
            }
        }
    }
}

/**
 * Get the group name of the markup
 *
 * @param {Date} date the date of markup
 * @param {Date} today the date of today at 0:00am
 * @return {String} the date name
 */
function getDateName( date, today ) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var daysDiff = Math.ceil( ( today.getTime() - date.getTime() ) / 86400000 );
    var monthName = month === today.getMonth() ? 'thisMonth' : month < 9 ? 'monthName_0' + ( month + 1 ) + ' ' +
        year : 'monthName_' + ( month + 1 ) + ' ' + year;

    return daysDiff <= 0 ? 'today' : daysDiff === 1 ? 'yesterday' : daysDiff <= 6 ? 'dayName_0' +
        ( date.getDay() + 1 ) : monthName;
}

/**
 * Remove a markup from the list
 *
 * @param {Markup} markup the markup to be added
 */
function removeReplyComment( markup ) {
    if(replyCommentsMap.has(markup.reqData.commentid)){
        var replyComments = replyCommentsMap.get(markup.reqData.commentid);
        for( var i = replyComments.length -1; i >= 0; i-- ) {
            if(replyComments[i].reqData.parentCommentid === markup.reqData.commentid){
                for (var j = markups.length - 1; j>=0; j-- ) {
                    if(markups[j].reqData.commentid === markup.reqData.commentid || 
                        markups[j].reqData.parentCommentid === markup.reqData.commentid){
                        markups.splice(j,1);
                    }
                }
                replyComments.splice(i,1);
            }
        }
    }else if(markup.reqData.parentCommentid !== '' && replyCommentsMap.has(markup.reqData.parentCommentid)){
        var replyComments = replyCommentsMap.get(markup.reqData.parentCommentid);
        for( var i = replyComments.length -1; i >= 0; i-- ) {
            if(replyComments[i].reqData.commentid === markup.reqData.commentid){
                replyComments.splice(i,1);
            }
        }
    }
}


/**
 * Remove a markup from the list
 *
 * @param {Array} markups the markups to be added
 * @param {Markup} id the markups to be added
 */
function isReplyExist( replies, id ) {
    for( var i = replies.length - 1; i >= 0; i-- ) {
        if( replies[i].reqData.commentid === id ) {
            return true;
        }
    }
    return false;
}

/**
 * Filter the markup
 *
 * @param {Markup} markup the markup to be tested
 * @return {boolean} true if it is visible through the filter
 */
function filterMarkup( markup ) {
    for( var i = 0; i < filterList.length; i++ ) {
        if( markup.comment.toLowerCase().indexOf( filterList[ i ] ) < 0 ) {
            return false;
        }
    }

    return true;
}

//==================================================
// exported functions
//==================================================
let exports;
export let getVersion = function() {
    return version;
};
export let getMarkupList = function() {
    return markupList;
};
export let getUsers = function() {
    return markupData.users;
};
export let getStatus = function( markup ) {
    return markupThread.getStatus( markup );
};
export let setUserObj = function( userId, obj ) {
    markupData.setUserObj( userId, obj );
};
export let getCount = function() {
    return markupData.markups.reduce( function( count, markup ) {
        return count + ( markup.deleted ? 0 : 1 );
    }, 0 );
};
export let getSortBy = function() { return sortBy; };
export let getFilter = function() { return filter; };
export let clearAllEditMode = function() {
    markupData.clearAllEditMode();
};
export let stringifyMarkups = function( all ) {
    return markupData.stringifyMarkups( all );
};
export let stringifyMarkup = function( markup ) {
    return markupData.stringifyMarkup( markup );
};
export let findUser = function( id ) {
    return markupData.findUser( id );
};
export let isInThread = function( markup ) {
    return markupThread.isInThread( markup, 'any' );
};
export let getRole = function() {
    return role;
};
export let setRole = function( r ) {
    role = r;
};
export let canMarkup = function() {
    return role === 'admin' || role === 'author' || role === 'reviewer';
};
export let getStampShare = function() {
    return role === 'admin' ? 'public' : 'private';
};
export let isUpToDate = function() {
    return message.indexOf( 'up_to_date' ) >= 0;
};
export let isAppend = function() {
    return message.indexOf( 'append' ) >= 0;
};
export let hasMore = function() {
    return message.indexOf( 'more' ) >= 0;
};
export let getMarkups = function() {
    return markups;
};

export default exports = {
    getVersion,
    getMarkupList,
    getUsers,
    getStatus,
    setUserObj,
    setLoginUser,
    getCount,
    setSortBy,
    getSortBy,
    setFilter,
    getFilter,
    processMarkups,
    clearMarkupList,
    updateMarkupList,
    clearMarkupHtml,
    sortMarkupList,
    toggleGroup,
    addNewMarkup,
    addReplyMarkup,
    deleteMarkup,
    clearAllEditMode,
    stringifyMarkups,
    stringifyMarkup,
    findUser,
    findUsersToLoad,
    isEditable,
    isReplyable,
    isDeletable,
    isIndented,
    isInThread,
    getRole,
    setRole,
    canMarkup,
    getStampShare,
    isUpToDate,
    isAppend,
    hasMore,
    getMarkupFromId,
    populateMarkupList,
    isCommentEditable,
    isCommentReplyable,
    isCommentDeletable,
    getMarkups,
    getUser,
    putComment,
    getComment,
    insertReplyComment,
    getReplyComments,
    undoDeleteMarkup
};
