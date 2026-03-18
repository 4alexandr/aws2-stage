// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Module for the Requirement Compare Utilities
 *
 * @module js/Arm0CompareUtils
 */

import browserUtils from 'js/browserUtils';
import app from 'app';

var exports = {};
var TC_MICRO_PREFIX = 'tc/micro';
var RM_COMPARE_HTML = '/req_compare/v1/compare/html';

 /**
 * get Compare HTML service URL.
 *
 * @return {String} url of html microservice.
 */
export let getCompareHtmlServiceURL = function() {
    return browserUtils.getBaseURL() + TC_MICRO_PREFIX + RM_COMPARE_HTML;
};


/**
 * @param {String} content - html content
 * @return {String} processed html content
 */
export let addCssInContents = function( content ) {
    content = content.replace( /<span[^>]+?\/>/g, '' );
    var contentDivElement = document.createElement( 'div' );
    contentDivElement.innerHTML = content;

    var addedSpans = contentDivElement.getElementsByClassName( 'diff-html-added' );
    for ( let index = 0; index < addedSpans.length; index++ ) {
        let span = addedSpans[index];
        span.style.backgroundColor = '#84e3b9';
        let img = span.firstChild;
        if ( img && img.nodeName && img.nodeName.toUpperCase() === 'IMG' ) {
            img.style.borderColor = '#84e3b9';
        }
    }

    var removedSpans = contentDivElement.getElementsByClassName( 'diff-html-removed' );
    for ( let index = 0; index < removedSpans.length; index++ ) {
        let span = removedSpans[index];
        span.style.backgroundColor = '#efbbb9';
        let img = span.firstChild;
        if ( img && img.nodeName && img.nodeName.toUpperCase() === 'IMG' ) {
            img.style.borderColor = '#efbbb9';
        }
    }

    var changedSpans = contentDivElement.getElementsByClassName( 'diff-html-changed' );
    for ( let index = 0; index < changedSpans.length; index++ ) {
        let span = changedSpans[index];
        span.style.backgroundColor = '#00b0f0';
        let img = span.firstChild;
        if ( img && img.nodeName && img.nodeName.toUpperCase() === 'IMG' ) {
            img.style.borderColor = '#00b0f0';
        }
    }

    return contentDivElement.innerHTML;
};

/**
 * Compare images from given html strings and sync if same image based on imageuid attribute
 *
 * @param {Object} htmlContentData - Json data with 2 html string contents
 */
export let syncSameImagesAndOLE = function( htmlContentData ) {
    var firstHtmldiv = document.createElement( 'div' );
    firstHtmldiv.innerHTML = htmlContentData.html1;
    var secondHtmldiv = document.createElement( 'div' );
    secondHtmldiv.innerHTML = htmlContentData.html2;
    var contentUpdated = false;
    var attributesToSync = [ 'id', 'alt', 'src', 'oleobjectuid', 'oleid', 'datasettype', 'datasetFileTicket' ];
    // Find same image from second html and sync with first html
    var firstImages = firstHtmldiv.getElementsByTagName( 'img' );
    for ( let index = 0; index < firstImages.length; index++ ) {
        const firstImg = firstImages[index];
        var imageuid = firstImg.getAttribute( 'imageuid' );
        if( imageuid && imageuid !== '' ) {
            //try to get image from second content with same id
            var secondImg = secondHtmldiv.querySelector( '[imageuid="' + imageuid + '"]' );

            if( secondImg ) {
                // same image
                attributesToSync.forEach( attr => {
                    if( firstImg.getAttribute( attr ) ) {
                        secondImg.setAttribute( attr, firstImg.getAttribute( attr ) );
                    }
                } );
                contentUpdated = true;
            }
        }
    }

    if( contentUpdated ) {
        htmlContentData.html1 = firstHtmldiv.innerHTML;
        htmlContentData.html2 = secondHtmldiv.innerHTML;
    }
};


export default exports = {
    getCompareHtmlServiceURL,
    addCssInContents,
    syncSameImagesAndOLE
};

/**
 * This is Compare Utility for Requirements.
 *
 * @memberof NgServices
 * @member Arm0MultiSelectCompareText
 */
app.factory( 'Arm0CompareUtils', () => exports );
