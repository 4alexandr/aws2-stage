// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/MarkupTooltip
 */

'use strict';
//==================================================
// private variables
//==================================================
/** The markupThread */
var thread = null;
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
 * @param {MarkupThread} inThread The MarkupThread
 */
export function init( inThread ) {
    thread = inThread;
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
    currentMarkup = inMarkup;
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
    var markups = thread.getAllMarkupsInThread( inMarkup );

    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        html += '<p style=\'margin: 4px 0px 4px 0px;\'><strong>' + markup.displayname + '</strong> ' +
            markup.date.toLocaleString() + '</p>' + markup.comment;
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

//==================================================
// private functions
//==================================================

//==================================================
// exported functions
//==================================================
let exports;

export default exports = {
    init,
    showTooltip,
    clearTooltip
};
