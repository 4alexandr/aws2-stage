// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/Arm0Ck5CommentsHandler
 */
import markupColor from 'js/MarkupColor';
import markupGeom from 'js/MarkupGeom';
import markupViewModel from 'js/Arm0MarkupViewModel';
import appCtxSvc from 'js/appCtxService';
import ckeditorOperations from 'js/ckeditorOperations';

'use strict';
//==================================================
// private variables
//==================================================
/** The frame window */
var frameWindow = window;
/** The list of all markups */
var markups = [];
/** The text roots */
var textRoots = [];
/** The viewer container */
var viewerContainer = null;
/** Need adjust bounding rect for tooltip */
var adjustBoundingRect = false;
/** The current container index */
var currentIndex = 0;
/** The currently selected markup */
var selectedMarkup = null;
/** The selected range */
var selectedRange = null;
/** The select timeout */
var selectTimeout = null;
/** The select callback */
var selectCallback = null;
/** The findObjId callback */
var findObjId = null;
/** The isBodyContent callback */
var isBodyContent = null;
/** The markup span callback */
var markupSpanChanged = null;
/** The markupThread */
var thread = null;
/** The getUserSelectionFromSingleClick callback */
var getUserSelectionFromSingleClick = null;

var total = 0;
/** The container to show tooltip */
var container = null;
/** The markup currently shown tooltip */
var currentMarkup = null;
/** The tooltip color */
var color = 'rgb(0, 0, 0)';
/** The tooltip background color */
var bgColor = 'rgb(255, 255, 222)';
/** The tooltip border color */
var borderColor = 'rgb(32, 32, 32)';
/** The tooltip width */
var width = 350;
/** The tooltip max height */
var maxHeight = 300;

//==================================================
// public functions
//==================================================
/**
 * Initialize this module
 *
 * @param {FrameWindow} inFrameWindow The FrameWindow object
 * @param {Markup} inMarkups The list of markups
 * @param {MarkupThread} inThread The MarkupThread object
 */
export function init( inFrameWindow, inMarkups, inThread ) {
    textRoots = [];
    frameWindow = inFrameWindow;
    markups = inMarkups;
    thread = inThread;
    isBodyContent = null;
    findObjId =  null;
    markupSpanChanged = null;
    getUserSelectionFromSingleClick = null;
}

/**
 * Set the page text root element
 *
 * @param {Element} textRoot The text root
 * @param {int} index The page index, default 0
 */
export function setPageTextRoot( textRoot, index ) {
    index = index || 0;
    textRoots[ index ] = textRoot;
    currentIndex = index;
    textRoot.rootIndex = index;
}

/**
 * Get the user selection of text
 *
 * @return {UserSelection} the user selection
 */
export function getUserSelection() {
    var range = null;
    var selection = frameWindow.getSelection();
    if( selection && selection.rangeCount > 0 ) {
        range = selection.getRangeAt( 0 );
    } else {
        var doc = frameWindow.document || frameWindow.contentDocument;
        selection = doc.getSelection();
        if( selection && selection.rangeCount > 0 ) {
            range = selection.getRangeAt( 0 );
        } else if( selectedRange ) {
            range = selectedRange;
        } else {
            return null;
        }
    }

    return getUserSelectionFromRange( range );
}

/**
 * Clear the user selection
 */
export function clearUserSelection() {
    if( frameWindow ) {
        try {
            var selection = frameWindow.getSelection();
            if( selection && selection.rangeCount > 0 ) {
                selection.removeAllRanges();
            }

            var doc = frameWindow.document || frameWindow.contentDocument;
            selection = doc.getSelection();
            if( selection && selection.rangeCount > 0 ) {
                selection.removeAllRanges();
            }
        } catch ( err ) {
            // ignore errors during removeAllRanges
        }
    }

    selectedRange = null;

    if( selectTimeout ) {
        clearTimeout( selectTimeout );
        selectTimeout = null;
    }
}

/**
 * Show one markup
 *
 * @param {Markup} markup The markup to be shown
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
export function show( markup, option ) {
    if( markup.type === 'text' ) {
        showTextMarkup( markup, false, option );
    }
}

/**
 * Show all markups
 *
 * @param {number} option The option SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
export function showAll( option ) {
    showTextMarkups( true, option );
}

/**
 * Show markup as selected
 *
 * @param {Markup} markup The markup to be shown
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1
 */
export function showAsSelected( markup, option ) {
    if( markup.type === 'text' ) {
        showTextMarkup( markup, true, option );
        selectedMarkup =  option === 0 ? markup : null;
    }
}

/**
 * Show the current page
 */
export function showCurrentPage() {
    showTextMarkups( false );
}

/**
 * Find the markup start and end info
 *
 * @param {int} start position
 * @param {int} end position
 * @param {String} objId object id, if undefined, use ch (absolute), otherwise use rch (relative)
 *
 * @return {StartEndInfo} the start and end info
 */
export function findStartEndInfo( start, end, objId ) {
    var startPage = start.page;
    var endPage = end.page;
    var startPos =  objId ? start.rch : start.ch;
    var endPos =  objId ? end.rch : end.ch;

    var startNode = null;
    var endNode = null;
    var startOffset = -1;
    var endOffset = -1;

    for( var p = 0; p < 2; p++ ) {
        var textRoot = textRoots[  p === 0 ? startPage : endPage  ];

        if( !textRoot || !textRoot.childNodes ) {
            return null;
        }

        var sumLength = 0;
        var currentObjId;

        for( var node = getFirstNode( textRoot ); node; node = getNextNode( node ) ) {
            if( !isBodyContent || isBodyContent( node ) ) {
                var thisLength = node.length;

                var thisObjId =  findObjId ? findObjId( node ) : undefined;
                if( thisObjId !== currentObjId ) {
                    currentObjId = thisObjId;
                    sumLength = 0;
                }

                if( thisObjId === objId ) {
                    if( p === 0 && sumLength <= startPos && startPos < sumLength + thisLength ) {
                        startNode = node;
                        startOffset = startPos - sumLength;
                    }

                    if( ( startPage === endPage ? p === 0 : p === 1 ) && sumLength < endPos &&
                        endPos <= sumLength + thisLength ) {
                        endNode = node;
                        endOffset = endPos - sumLength;
                    }

                    if( startOffset >= 0 && endOffset >= 0 ) {
                        break;
                    }
                }
                sumLength += thisLength;
            }
        }

        if( startOffset >= 0 && endOffset >= 0 ) {
            break;
        }
    }

    if( startOffset >= 0 && endOffset >= 0 ) {
        return {
            start: {
                page: startPage,
                node: startNode,
                offset: startOffset
            },
            end: {
                page: endPage,
                node: endNode,
                offset: endOffset
            }
        };
    }

    return null;
}

/**
 * Recalculate all the markup positions
 */
export function recalcAllMarkupPositions() {
    var allMarkups = markupViewModel.getMarkups();
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx ) {
        appCtxSvc.ctx.reqMarkupCtx.reqMarkupsData = allMarkups;
    }
    allMarkups.sort( function( a, b ) {
        var revId1 = a.objId;
        var revId2 = b.objId;
        if( revId1 === revId2 ) {
            return 0;
        } else if( revId1 > revId2 ) {
            return 1;
        }
        return -1;
    } );
    var updatedMarkups = [];
    var bodyTextMap = {};
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    for( var i = 0; i < allMarkups.length; i++ ) {
        var rev = allMarkups[i].objId;
        var element = document.querySelector( 'div[revisionId="' + rev + '"]' );
        var bodyTextDiv;
        if( element ) {
            if( bodyTextMap[ rev ] ) {
                bodyTextDiv = bodyTextMap[ rev ];
            } else {
                bodyTextDiv = element.getElementsByClassName( 'aw-requirement-bodytext' );
                if( bodyTextDiv && bodyTextDiv.length > 0 ) {
                    bodyTextDiv = bodyTextDiv[ 0 ];
                    bodyTextMap[ rev ] = bodyTextDiv;
                }
            }
            if( bodyTextDiv ) {
                total = 0;
                updatePositionForMarkup( bodyTextDiv, allMarkups[i], editor, updatedMarkups );
            }
        }
    }
    var finalMarkupsList = [];
    for( var j = 0; j < allMarkups.length; j++ ) {
        if( updatedMarkups[allMarkups[j].reqData.commentid] === '' ) {
            finalMarkupsList.push( allMarkups[j] );
            markupViewModel.getReplyComments(allMarkups[j],finalMarkupsList);
        }
    }
    var reqMarkupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( reqMarkupCtx ) {
        appCtxSvc.ctx.reqMarkupCtx.reqMarkupsData = finalMarkupsList;
    }
}


function getMarkupFromId( commentId ) {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx ) {
        for( var j = 0; j < markupCtx.reqMarkupsData.length; j++ ) {
            if( markupCtx.reqMarkupsData[j].reqData.commentid === commentId ) {
                return markupCtx.reqMarkupsData[j];
            }
        }
    }
}

/**
 *
 * @param {*} bodyTextDiv
 * @param {*} markup
 * @param {*} editor
 * @param {*} total
 */
function updatePositionForMarkup( bodyTextDiv, markup, editor, updatedMarkups ) {
    var children = bodyTextDiv.childNodes;
    for( var i = 0; i < children.length; i++ ) {
        var childNode = children[ i ];
        if( isText( childNode ) ) {
            var isMarkupSpan = isMarkupSpanWithId( childNode.parentElement, markup.reqData.commentid );
            if( isMarkupSpan.isMarkupSpan && updatedMarkups[ markup.reqData.commentid ]!=='' ) {

                var id = isMarkupSpan.element.getAttribute( 'id' );
                var values = id.split( ',' );
                var markupsToUpdate = [];
                if( values.length > 1 ) {
                    for( var i = 0; i < values.length; i++ ) {
                        var markupToUpdate = getMarkupFromId( values[ i ] );
                        if( markupToUpdate ) {
                            markupsToUpdate.push( markupToUpdate );
                        }
                    }
                } else {
                    markupsToUpdate.push( markup );
                }
                for( i = 0; i < markupsToUpdate.length; i++ ) {

                    markupsToUpdate[i].isMarkupPositionRecalculated = true;
                    markupsToUpdate[i].start.rch = total;
                    markupsToUpdate[i].end.rch = total;
                    var marker = editor.model.markers._markers.get( markupsToUpdate[i].reqData.commentid );
                    if( marker && marker._liveRange ) {
                        updatedMarkups[ markup.reqData.commentid ] = '';
                        for( const item of marker._liveRange.getItems() ) {
                            var textNode = item.textNode;
                            if( textNode ) {
                                var commentText = item.data;
                                markupsToUpdate[i].end.rch += commentText.length;
                            }
                        }
                    }
                }
                return -1;
            }
            total += childNode.length;
        }
        if( childNode.childNodes.length > 0 ) {
            var val = updatePositionForMarkup( childNode, markup, editor, updatedMarkups );
            if( val === -1 ) {
                return;
            }
        }
    }
}

/**
 *Method to remove all live range from editor instance before save
 */
export function doPostProcessing() {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    var markers  = editor.model.markers._markers;
    for( let [ key, value ] of markers.entries() ) {
        editor.model.change( ( writer ) => {
                try {
                    var liveRange = markers.get(key)._liveRange;

                    writer.removeAttribute('spanId', liveRange);
                    writer.removeAttribute('spanStyle', liveRange);


                    var ranges =  [...liveRange.getItems()];
                    for( const item of ranges ) {
                        var textNode = item.textNode;
                        if( textNode ) {
                            var itemData = item.data;
                            var textNodeData = textNode._data;
                            if(itemData === textNodeData)
                            {
                                writer.removeAttribute('spanStyle', textNode);
                            }

                        }
                    }

                    writer.removeMarker(markers.get(key));
                } catch ( error ) {
                    //do nothihing. marker not present
                }
        } );
    }
    appCtxSvc.ctx.ckeditor5Markers = [];
}

/**
 * Remove all spans with markups
 */
export function removeAllMarkupSpans() {
    for( var i = 0; i < textRoots.length; i++ ) {
        if( textRoots[ i ] ) {
            for( var node = getFirstNode( textRoots[ i ] ); node; node = getNextNode( node ) ) {
                if( !isBodyContent || isBodyContent( node ) ) {
                    removeMarkupSpan( node );
                }
            }
        }
    }
}

/**
 * Get Markup highlight rectangles on the page it first appear
 *
 * @param {Markup} markup - the markup
 * @param {Number} viewParam - the viewParam from world to screen
 *
 * @returns {Node[]} the list of highlight rectangles
 */
export function getMarkupHightlight( markup, viewParam ) {
    var textRoot = textRoots[ markup.start.page ];
    var rootRect = textRoot.getBoundingClientRect();
    var list = [];

    for( var node = getFirstNode( textRoot ); node; node = getNextNode( node ) ) {
        if( isMarkupSpan( node.parentNode ) ) {
            if( node.parentNode.markups.indexOf( markup ) > -1 ) {
                var spanRect = node.parentNode.getBoundingClientRect();
                var pt0 = {
                    x: spanRect.left - rootRect.left,
                    y: spanRect.top - rootRect.top
                };
                var pt1 = {
                    x: spanRect.right - rootRect.left,
                    y: spanRect.bottom - rootRect.top
                };

                var pt0w = markupGeom.pointScreenToWorld( pt0, viewParam );
                var pt1w = markupGeom.pointScreenToWorld( pt1, viewParam );

                list.push( {
                    left: Math.min( pt0w.x, pt1w.x ),
                    top: Math.min( pt0w.y, pt1w.y ),
                    width: Math.abs( pt0w.x - pt1w.x ),
                    height: Math.abs( pt0w.y - pt1w.y )
                } );
            }
        }
    }

    return list;
}

//==================================================
// private functions
//==================================================
/**
 * Show text markup
 *
 * @param {Markup} markup The markup to be shown
 * @param {boolean} asSelected Show markup as selected or not
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
function showTextMarkup( markup, asSelected, option ) {
    clearUserSelection();

    if( option === undefined && markup.visible !== undefined ) {
        option =  markup.visible ? 0 : 1;
    }

    var info = findStartEndInfo( markup.start, markup.end, markup.objId );
    if( info ) {
        for( var p = info.start.page; p <= info.end.page; p++ ) {
            var textRoot = textRoots[ p ];
            var startNode =  p === info.start.page ? info.start.node : getFirstNode( textRoot );

            for( var node = startNode; node; node = getNextNode( node ) ) {
                if( !isBodyContent || isBodyContent( node ) ) {
                    var isStartNode =  node === info.start.node;
                    var isEndNode =  node === info.end.node;
                    var startOffset =  isStartNode ? info.start.offset : 0;
                    var endOffset =  isEndNode ? info.end.offset : -1;
                    if( asSelected ) {
                        showNodeAsSelected( node, isStartNode, isEndNode, markup, option );
                    } else {
                        showNodeAsHighlighted( node, startOffset, endOffset, markup, option );
                    }

                    if( isEndNode ) {
                        break;
                    }
                }
            }
        }
    }
}

/**
 * Show text markups
 *
 * @param {boollean} all show all markups or those in the current page
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
function showTextMarkups( all, option ) {
    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        if( markup.type === 'text' && ( all || markup.start.page === currentIndex ) ) {
            showTextMarkup( markup, false, option );
        }
    }

    if( selectedMarkup && !all ) {
        showTextMarkup( selectedMarkup, true, option );
    }
}

/**
 * Find the page containing a given node
 *
 * @param {Node} node The given node
 *
 * @return {int} the page index
 */
function findPageByNode( node ) {
    var obj = node;
    while( obj && !isRoot( obj ) ) {
        obj = obj.parentNode;
    }

    return obj ? obj.rootIndex : -1;
}

/**
 * Show markup on a node as highlighted
 *
 * @param {Node} node The node
 * @param {int} startOffset The start offset in the node
 * @param {int} endOffset The end offset in the node
 * @param {Markup} markup The markup to be shown
 * @param {int} option The option SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
function showNodeAsHighlighted( node, startOffset, endOffset, markup, option ) {
    var thisNode = node;
    var thisLength = thisNode.length;

    if( thisLength === 0 ) {
        return;
    }

    if( endOffset === -1 ) {
        endOffset = thisLength;
    }

    var hiNode;
    if( startOffset === 0 && endOffset === thisLength ) {
        showNode( thisNode, markup, option );
    } else if( 0 < startOffset && endOffset < thisLength ) {
        hiNode = splitNode( thisNode, endOffset );
        splitNode( hiNode, startOffset );
        showNode( hiNode, markup, option );
    } else if( 0 < startOffset ) {
        splitNode( thisNode, startOffset );
        showNode( thisNode, markup, option );
    } else if( endOffset < thisLength ) {
        hiNode = splitNode( thisNode, endOffset );
        showNode( hiNode, markup, option );
    }
}

/**
 * Show markup on a node as selected
 *
 * @param {Node} node The node node
 * @param {boolean} isStartNode The node is start node
 * @param {boolean} isEndNode The node is end node
 * @param {Markup} markup The markup to be shown
 * @param {int} option The option SHOW_MARKUP=0, HIDE_MARKUP=1
 */
function showNodeAsSelected( node, isStartNode, isEndNode, markup, option ) {
    if( node.length === 0 ) {
        return;
    }

    var color = markupColor.getColor( markup );
    var thisStyle = node.parentNode.style;
    var bg = markupColor.toRGBA( thisStyle.backgroundColor );
    var hi = markupColor.toRGBA( color );

    if( option === 0 ) {
        if( !thisStyle.borderStyle || thisStyle.borderStyle === 'none' ) {
            var isBoth = isStartNode && isEndNode;
            var style =  isBoth ? 'solid' : isStartNode ? 'solid none solid solid' :
                isEndNode ? 'solid solid solid none' : 'solid none solid none';
            var radius =  isBoth ? '4px' : isStartNode ? '4px 0px 0px 4px' :
                isEndNode ? '0px 4px 4px 0px' : '0px';

            thisStyle.borderStyle = style;
            thisStyle.borderWidth = 'thin';
            thisStyle.borderRadius = radius;
            thisStyle.borderColor = markupColor.toDarkColor( color );
            thisStyle.backgroundColor = markupColor.fromRGBA( bg, hi, null );
        }
    } else {
        if( thisStyle.borderStyle ) {
            thisStyle.borderStyle = 'none';
            thisStyle.borderRadius = '0px';
            thisStyle.backgroundColor =  option > 1 ? 'transparent' :
                markupColor.fromRGBA( bg, null, hi );
        }
    }
}

/**
 * Get user selection from range
 *
 * @param {Range} range The range selected by the user
 *
 * @return {UserSelection} the user selection
 */
function getUserSelectionFromRange( range ) {

    if ( getUserSelectionFromSingleClick )
    {
        range = getUserSelectionFromSingleClick(range);
    }
    if( !range ) {
        return null;
    }

    var startNode = getFirstNode( range.startContainer );
    var endNode = getFirstNode( range.endContainer );
    var startOffset = range.startOffset;
    var endOffset = range.endOffset;
    var startCh = -1;
    var endCh = -1;
    var startRch = -1;
    var endRch = -1;
    var currentObjId;

    for( var p = 0; p < 2; p++ ) {
        if(p === 0){
            var textRoot = textRoots[ 0 ];
        }
        if( !textRoot || !textRoot.childNodes ) {
            return null;
        }
        var sumLength = 0;
        var relLength = 0;
        for( var node = getFirstNode( textRoot ); node; node = getNextNode( node ) ) {
            if( !isBodyContent || isBodyContent( node ) ) {
                var thisObjId = findObjId ? findObjId( node ) : undefined;
                if( thisObjId !== currentObjId ) {
                    if( currentObjId && startCh >= 0 ) {
                        endCh = sumLength;
                        endRch = relLength;
                        break;
                    }
                    currentObjId = thisObjId;
                    relLength = 0;
                }

                if( node === startNode ) {
                    startCh = sumLength + startOffset;
                    startRch = relLength + startOffset;
                }

                if( node === endNode ) {
                    endCh = sumLength + endOffset;
                    endRch = relLength + endOffset;
                }

                if( startCh >= 0 && endCh >= 0 ) {
                    break;
                }

                sumLength += node.length;
                relLength += node.length;
            }
        }

        if( startCh >= 0 && endCh >= 0 ) {
            break;
        }
    }

    if( startCh >= 0 && endCh >= 0 ) {
        return {
            start: {
                page: 0,
                ch: startCh,
                rch:  currentObjId ? startRch : undefined
            },
            end: {
                page: 0,
                ch: endCh,
                rch:  currentObjId ? endRch : undefined
            },
            reference: range.toString(),
            objId: currentObjId
        };
    }

    return null;
}

/**
 * Is object a root?
 *
 * @param {Node} obj The object to be tested
 * @param {boolean} ture if it is
 */
function isRoot( obj ) {
    return  !isNaN( obj.rootIndex );
}

/**
 * Is object a span node with markups?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isMarkupSpan( obj ) {
    return  obj.nodeName === 'SPAN' && obj.getAttribute( 'id' ) && obj.getAttribute( 'id' ).startsWith( 'RM::Markup::' );
}

function isMarkupSpanWithId( obj, id ) {
    if( obj.nodeName === 'STRONG'){
        obj = obj.parentElement;
    }
    var isMarkupSpanValue = obj.nodeName === 'SPAN' && obj.getAttribute( 'id' ) && obj.getAttribute( 'id' ).indexOf( id ) !== -1;
    return { isMarkupSpan : isMarkupSpanValue, element : obj };
}

/**
 * Is object a text node?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isText( obj ) {
    return  obj.nodeType === 3;
}

/**
 * Is object a selectable text node? Ignore the inter-element white space
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isSelectableText( obj ) {
    return  obj.nodeType === 3 && obj.parentNode.nodeType === 1 &&
        ( isMarkupSpan( obj.parentNode ) || obj.nodeValue.match( /\S+/ ) || !isInterElement( obj ) );
}

/**
 * Is object inter-element? Given that it is a white space text node
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isInterElement( obj ) {
    var prev = obj.previousSibling;
    var next = obj.nextSibling;
    var pElem =  prev && !isText( prev ) && !isMarkupSpan( prev );
    var nElem =  next && !isText( next ) && !isMarkupSpan( next );
    return  pElem && nElem || pElem && !next || nElem && !prev;
}

/**
 * Get the first node under the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the first node
 */
function getFirstNode( node ) {
    var first = node;
    while( first.firstChild ) {
        first = first.firstChild;
    }

    return  isSelectableText( first ) ? first : getNextNode( first );
}

/**
 * Get the next node following the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the next node
 */
function getNextNode( node ) {
    var next = node;
    while( next ) {
        if( isRoot( next ) ) {
            return null;
        } else if( next.nextSibling ) {
            return getFirstNode( next.nextSibling );
        }
            next = next.parentNode;
    }

    return null;
}

/**
 * Remove markup span above a node
 *
 * @param {Node} node - the node to remove markup spans
 */
export let removeMarkupSpan = function( node ) {
    var parent = node.parentNode;
    if( isMarkupSpan( parent ) ) {
        var grandParent = parent.parentNode;
        var prev = parent.previousSibling;
        var next = parent.nextSibling;
        var first = parent.firstChild;
        var last = parent.lastChild;

        if( prev && isText( prev ) && first && isText( first ) ) {
            first.nodeValue = prev.nodeValue + first.nodeValue;
            grandParent.removeChild( prev );
        }

        if( next && isText( next ) && last && isText( last ) ) {
            last.nodeValue += next.nodeValue;
            grandParent.removeChild( next );
        }
        removeEventListeners( parent );
        var child = parent.firstChild;
        while( child ) {
            grandParent.insertBefore( child, parent );
            child = parent.firstChild;
        }
        grandParent.removeChild( parent );
    }
};

/**
 * Is it a mobile device?
 *
 * @return {boolean} true on mobile device
 */
function isMobile() {
    return navigator.userAgent.match( /(iPad)|(iPhone)|(iPod)|(android)|(webOS)|(touch)|(tablet)/i );
}

/**
 * show markup on a text node
 *
 * @param {Node} node The node to show markup
 * @param {Markup} markup The markup
 * @param {int} option The option SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 *
 * @return {Node} the node or its parent span, existing or new
 */
function showNode( node, markup, option ) {
    var parent = node.parentNode;

    if( isMarkupSpan( parent ) ) {
        if( option === 0 ) {
            addNodeMarkup( parent, markup );
        } else if( option === 1 ) {
            removeNodeMarkup( parent, markup );
        } else {
            parent.markups = [];
            var thisStyle = parent.style;
            thisStyle.backgroundColor = 'transparent';
            thisStyle.borderStyle = 'none';
            thisStyle.borderRadius = '0px';
            if( markupSpanChanged &&  markup.reqData ) {
                markupSpanChanged( parent, markup, option );
            }
        }
        return parent;
    }

    if( option === 0 ) {
        var span = parent.ownerDocument.createElement( 'span' );

        parent.insertBefore( span, node );
        parent.removeChild( node );
        span.appendChild( node );
        addNodeMarkup( span, markup );

        if( markupSpanChanged &&  markup.reqData ) {
            markupSpanChanged( span, markup, option );
        }
        return span;
    }

    return node;
}

/**
 * Split a text node
 *
 * @param {Node} node The node to be split
 * @param {int} offset The offset where to split
 *
 * @return {Node} the new node, which is the left part
 */
function splitNode( node, offset ) {
    var parent = node.parentNode;
    var left = node.nodeValue.substring( 0, offset );
    var right = node.nodeValue.substring( offset );
    var newNode = parent.ownerDocument.createTextNode( left );

    node.nodeValue = right;
    if( isMarkupSpan( parent ) ) {
        var newSpan = parent.ownerDocument.createElement( 'span' );
        newSpan.style.backgroundColor = parent.style.backgroundColor;
        newSpan.markups = parent.markups.slice( 0 );
        addEventListeners( newSpan );
        newSpan.appendChild( newNode );
        parent.parentNode.insertBefore( newSpan, parent );
    } else {
        parent.insertBefore( newNode, node );
    }

    return newNode;
}

/**
 * Add event listeners to a node
 *
 * @param {Node} node The node to add listeners
 */
function addEventListeners( node ) {
    node.addEventListener( 'click', selectListener, false );
    node.addEventListener( 'mouseover', showTooltipListener, false );
    node.addEventListener( 'mouseout', hideTooltipListener, false );
    node.addEventListener( 'touchend', selectListener, false );
}

/**
 * Remove event listeners from a node
 *
 * @param {Node} node The node to remove listeners
 */
function removeEventListeners( node ) {
    node.removeEventListener( 'click', selectListener, false );
    node.removeEventListener( 'mouseover', showTooltipListener, false );
    node.removeEventListener( 'mouseout', hideTooltipListener, false );
    node.removeEventListener( 'touchend', selectListener, false );
}
/**
 * Add/Remove event listeners from a node
 *
 * @param {Node} node The node to add/remove listeners
 */
export function setMarkupEventListeners( node, option ) {
    if( !option ) {
        addEventListeners( node );
    } else {
        removeEventListeners( node );
    }
}

/**
 * Select listener
 *
 * @param {Event} event The event
 */
function selectListener( event ) {
    var span = event.target;
    var inMarkup = markupViewModel.getMarkupFromId( span.id );
    //markupService.showCommentAsSelected(inMarkup);
}

/**
 * Show tooltip listener
 *
 * @param {Event} event The event
 */
function showTooltipListener( event ) {
    var span = event.target;
    var values = span.id.split( ',' );
    var inMarkup = [];
    for( var i = 0; i < values.length; i++ ) {
        var value = values[i];
        var markup = markupViewModel.getMarkupFromId( value );
        if( markup ) {
            inMarkup.push( markup );
        }
    }
    exports.showTooltip( viewerContainer, inMarkup, span.getBoundingClientRect(), adjustBoundingRect );
}

/**
 * Get the markup key for the thread
 *
 * @param {Markup} markup
 * @return {String} the key
 */
export function getKey( markup ) {
    if( markup ) {
        var array = [];
        var markups = markupViewModel.getMarkups();
        markups.forEach( comment => {
            if( comment.deleted !== true && JSON.stringify( comment.start ) === JSON.stringify( markup.start ) &&
                JSON.stringify( comment.end ) === JSON.stringify( markup.end ) ) {
                array.push( comment );
            }
        } );
        return array;
    }
    return [];
}

/**
 * Show tool tip
 *
 * @param {Element} inContainer The container to be shown with markup tooltip
 * @param {Markup} inMarkup The markup to be shown with its tooltip
 * @param {Rectangle} boundingRect The bounding rectangle in screen coordinates
 * @param {Boolean} adjust if true adjust the boundingRect
 */
export function showTooltip( inContainer, inMarkup, boundingRect, adjust ) {
    container = inContainer;
    currentMarkup = inMarkup[0];
    var ownerDoc = container.ownerDocument;
    var divMarkups = ownerDoc.getElementById( 'markupTooltip' );
    var divArrowFace = ownerDoc.getElementById( 'markupArrowFace' );
    var divArrowBorder = ownerDoc.getElementById( 'markupArrowBorder' );

    if( !divMarkups || !divArrowFace || !divArrowBorder ) {
        divMarkups = ownerDoc.createElement( 'div' );
        divMarkups.id = 'markupTooltip';
        divMarkups.style.borderStyle = 'solid';
        divMarkups.style.borderColor = borderColor;
        divMarkups.style.borderWidth = '1px';
        divMarkups.style.borderRadius = '6px';
        divMarkups.style.padding = '6px';
        divMarkups.style.width = width + 'px';
        divMarkups.style.maxHeight = maxHeight + 'px';
        divMarkups.style.color = color;
        divMarkups.style.backgroundColor = bgColor;
        divMarkups.style.position = 'absolute';
        divMarkups.style.font = '9pt verdana,arial,sans-serif';
        divMarkups.style.overflow = 'hidden';
        divMarkups.style.zIndex = '1001001';
        divMarkups.style.pointerEvents = 'none';
        ownerDoc.body.appendChild( divMarkups );

        divArrowFace = ownerDoc.createElement( 'div' );
        divArrowFace.id = 'markupArrowFace';
        divArrowFace.style.borderStyle = 'solid';
        divArrowFace.style.borderColor = 'transparent';
        divArrowFace.style.borderWidth = '10px';
        divArrowFace.style.width = '0px';
        divArrowFace.style.height = '0px';
        divArrowFace.style.position = 'absolute';
        divArrowFace.style.zIndex = '1001002';
        divArrowFace.style.pointerEvents = 'none';
        ownerDoc.body.appendChild( divArrowFace );

        divArrowBorder = divArrowFace.cloneNode( true );
        divArrowBorder.id = 'markupArrowBorder';
        divArrowBorder.style.zIndex = '1001000';
        divArrowBorder.style.pointerEvents = 'none';
        ownerDoc.body.appendChild( divArrowBorder );

        var ulSheet = ownerDoc.createElement( 'style' );
        ulSheet.innerHTML = 'div#markupTooltip ul { list-style: disc outside; }';
        ownerDoc.body.appendChild( ulSheet );

        var olSheet = ownerDoc.createElement( 'style' );
        olSheet.innerHTML = 'div#markupTooltip ol { list-style: decimal outside; }';
        ownerDoc.body.appendChild( olSheet );
    }

    var html = '';
    for( var k = 0; k < inMarkup.length; k++ ) {
        var markups = exports.getKey( inMarkup[ k ] );
        for( var i = 0; i < markups.length; i++ ) {
            var markup = markups[ i ];
            html += '<p style=\'margin: 4px 0px 4px 0px;\'><strong>' + markup.displayname + '</strong> ' +
                markup.date.toLocaleString() + '</p>' + markup.comment;
        }
    }
    divMarkups.innerHTML = html;

    var containerRect = container.getBoundingClientRect();
    var adjustLeft = adjust ? containerRect.left : 0;
    var adjustTop = adjust ? containerRect.top : 0;
    var center = ( boundingRect.left + boundingRect.right ) / 2 + adjustLeft;
    var left = center - width / 2;

    if( left < containerRect.left ) {
        left = containerRect.left;
    }

    if( left + width > containerRect.left + container.clientWidth ) {
        left = containerRect.left + container.clientWidth - width;
    }

    var top = boundingRect.bottom + 10 + adjustTop;
    var arrowTop = boundingRect.bottom - 10 + adjustTop;

    divMarkups.style.top = top + 'px';
    divMarkups.style.left = left + 'px';
    divMarkups.style.display = 'block';

    var height = divMarkups.clientHeight;
    var arrowUp =  top + height <= containerRect.top + container.clientHeight;

    if( arrowUp ) {
        divArrowFace.style.borderColor = 'transparent transparent ' + bgColor + ' transparent';
        divArrowBorder.style.borderColor = 'transparent transparent ' + borderColor + ' transparent';
    } else {
        top = boundingRect.top - 10 - height + adjustTop;
        arrowTop = boundingRect.top - 10 + adjustTop;
        divMarkups.style.top = top + 'px';

        divArrowFace.style.borderColor = bgColor + ' transparent transparent transparent';
        divArrowBorder.style.borderColor = borderColor + ' transparent transparent transparent';
    }

    divArrowFace.style.top =  arrowTop + ( arrowUp ? 1 : -1 )  + 'px';
    divArrowFace.style.left =  center - 10  + 'px';
    divArrowFace.style.display = 'block';

    divArrowBorder.style.top = arrowTop + 'px';
    divArrowBorder.style.left =  center - 10  + 'px';
    divArrowBorder.style.display = 'block';
}

/**
 * Clear the currently shown tooltip
 *
 * @param {string} type The type of tooltip to be cleared
 *
 */
export function clearTooltip( type ) {
    if( container && currentMarkup && ( !type || type === currentMarkup.type ) ) {
        var ownerDoc = container.ownerDocument;
        var divMarkups = ownerDoc.getElementById( 'markupTooltip' );
        var divArrowFace = ownerDoc.getElementById( 'markupArrowFace' );
        var divArrowBorder = ownerDoc.getElementById( 'markupArrowBorder' );

        if( divMarkups && divArrowFace && divArrowBorder ) {
            divMarkups.style.display = 'none';
            divArrowFace.style.display = 'none';
            divArrowBorder.style.display = 'none';
        }
        currentMarkup = null;
    }
}

/**
 * Clear the currently shown tooltip
 * @param {string} type The type of tooltip to be cleared
 *
 */
export function setTextRoot(  ) {
    var reqText = document.getElementsByClassName( 'aw-requirements-xrtRichText' );
    var doc = frameWindow.document || frameWindow.contentDocument;
    textRoots[0] =  reqText.length > 0 ? reqText[ 0 ] : doc.body;
}




/**
 * Hide tooltip listener
 */
function hideTooltipListener() {
    exports.clearTooltip( 'text' );
}

/**
 * Find the position in a node to insert a markup
 *
 * @param {Node} node The node to find position
 * @param {Markup} markup The markup to be inserted
 *
 * @return {int} the position to insert, -1 for the beginning
 */
function findInsertPos( node, markup ) {
    if( !node.markups ) {
        return -1;
    }

    for( var i = 0; i < node.markups.length; i++ ) {
        var m = node.markups[ i ];
        if( markup.reference.length < m.reference.length ) {
            return i;
        }

        if( samePosition( markup, m ) && markup.date < m.date ) {
            return i;
        }
    }

    return -1;
}

/**
 * Find the postion according to the markup thread
 *
 * @param {Node} node The node to find
 * @param {Markup} markup The markup to find
 *
 * @return {int} the position with markup in the same thread, or -1 if not found
 */
function findThreadPos( node, markup ) {
    if( !node.markups ) {
        return -1;
    }

    for( var i = 0; i < node.markups.length; i++ ) {
        var m = node.markups[ i ];
        if( samePosition( markup, m ) && markup.id !== m.id ) {
            return i;
        }
    }

    return -1;
}

/**
 * Test if two markups have the same position
 *
 * @param {Markup} m0 The first markup
 * @param {Markup} m1 The second markup
 *
 * @return {boolean} true if they have the same position
 */
function samePosition( m0, m1 ) {
    if( m0.type === m1.type && m0.start.page === m1.start.page && m0.end.page === m1.end.page ) {
        if( m0.type === 'text' ) {
            return m0.start.ch === m1.start.ch && m0.end.ch === m1.end.ch;
        } else if( m0.type === '2d' ) {
            return m0.start.x === m1.start.x && m0.start.y === m1.start.y && m0.end.x === m1.end.x &&
                m0.end.y === m1.end.y;
        }
    }

    return false;
}

/**
 * Add markup to a node
 *
 * @param {Node} node The node to add markup
 * @param {Markup} markup The markup to be added
 */
function addNodeMarkup( node, markup ) {
    if( !node.markups ) {
        node.markups = [];
        addEventListeners( node );
    }

    var existPos = node.markups.indexOf( markup );
    if( existPos >= 0 ) {
        return;
    }

    var insertPos = findInsertPos( node, markup );
    var threadPos = findThreadPos( node, markup );
    var bg = markupColor.toRGBA( node.style.backgroundColor );
    var hi = markupColor.toRGBA( markupColor.getColor( markup ) );

    if( threadPos === -1 ) {
        node.style.backgroundColor = markupColor.fromRGBA( bg, hi, null );
    } else if( insertPos !== -1 && insertPos <= threadPos ) {
        var old = markupColor.toRGBA( markupColor.getColor( node.markups[ threadPos ] ) );
        node.style.backgroundColor = markupColor.fromRGBA( bg, hi, old );
    }

    if( insertPos === -1 ) {
        node.markups.push( markup );
    } else {
        node.markups.splice( insertPos, 0, markup );
    }
}

/**
 * Remove markup from a node
 *
 * @param {Node} node The node to remove markup
 * @param {Markup} markup The markup to be removed
 */
function removeNodeMarkup( node, markup ) {
    if( node.markups && node.markups.length > 0 ) {
        var removePos = node.markups.indexOf( markup );
        if( removePos === -1 ) {
            return;
        }

        var threadPos = findThreadPos( node, markup );
        var bg = markupColor.toRGBA( node.style.backgroundColor );
        var hi = markupColor.toRGBA( markupColor.getColor( markup ) );

        if( threadPos === -1 ) {
            node.style.backgroundColor = markupColor.fromRGBA( bg, null, hi );
        } else if( removePos < threadPos ) {
            var old = markupColor.toRGBA( markupColor.getColor( node.markups[ threadPos ] ) );
            node.style.backgroundColor = markupColor.fromRGBA( bg, old, hi );
        }

        if( removePos >= 0 ) {
            node.markups.splice( removePos, 1 );
        }
    }
}

/**
 * Set selection end callback
 *
 * @param {Function} callback The callback
 */
export function setSelectionEndCallback( callback ) {
    if( frameWindow ) {
        addSelectionChangeCallback( callback );
        frameWindow.addEventListener( 'mouseup', function() {
            callback( 'highlight' );
        } );
    }
}

/**
 * Add selection change callback
 *
 * @param {Function} callback The callback
 */
function addSelectionChangeCallback( callback ) {
    var doc = frameWindow.document || frameWindow.contentDocument;
    if( doc && isMobile() ) {
        doc.addEventListener( 'selectionchange', function() {
            var selection = frameWindow.getSelection();
            if( isSelectionInPage( selection ) ) {
                selectedRange = selection.getRangeAt( 0 );
            } else {
                selection = doc.getSelection();
                if( isSelectionInPage( selection ) ) {
                    selectedRange = selection.getRangeAt( 0 );
                }
            }

            if( selectTimeout ) {
                clearTimeout( selectTimeout );
                selectTimeout = null;
            }

            selectTimeout = setTimeout( function() {
                selectTimeout = null;
                callback( 'highlight' );
            }, 1000 );
        } );
    }
}

/**
 * Is the selection in page?
 *
 * @param {Selection} selection the user selection
 * @return {boolean} true if it is in page
 */
function isSelectionInPage( selection ) {
    if( selection && selection.rangeCount > 0 ) {
        var range = selection.getRangeAt( 0 );
        var startPage = findPageByNode( range.startContainer );
        var endPage = findPageByNode( range.endContainer );

        return  startPage >= 0 && endPage >= 0;
    }

    return false;
}

//==================================================
// exported functions
//==================================================
let exports;
export let setViewerContainer = function( container, adjust ) {
    viewerContainer = container;
    adjustBoundingRect = adjust;
};
export let setSelectCallback = function( callback ) {
    selectCallback = callback;
};
export let setFindObjIdCallback = function( callback ) {
    findObjId = callback;
};

export let setIsBodyContentCallback = function( callback ) {
    isBodyContent = callback;
};

export let setMarkupSpanChangedCallback = function( callback ) {
    markupSpanChanged = callback;
};

export let setGetUserSelectionFromSingleClickCallback = function( callback ) {
    getUserSelectionFromSingleClick = callback;
};

export default exports = {
    init,
    setPageTextRoot,
    setViewerContainer,
    getUserSelection,
    clearUserSelection,
    show,
    showAll,
    showAsSelected,
    showCurrentPage,
    findStartEndInfo,
    recalcAllMarkupPositions,
    removeAllMarkupSpans,
    getMarkupHightlight,
    setSelectionEndCallback,
    setSelectCallback,
    setFindObjIdCallback,
    setIsBodyContentCallback,
    setMarkupSpanChangedCallback,
    setMarkupEventListeners,
    setGetUserSelectionFromSingleClickCallback,
    showTooltip,
    clearTooltip,
    setTextRoot,
    getKey,
    doPostProcessing,
    removeMarkupSpan
};
