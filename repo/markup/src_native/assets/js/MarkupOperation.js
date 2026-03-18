// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the markup operation to dispatch highlighting and drawing ops to pdf or image viewer panel
 *
 * @module js/MarkupOperation
 */
import markupData from 'js/MarkupData';
import markupThread from 'js/MarkupThread';
import markupCanvas from 'js/MarkupCanvas';
import markupPdf from 'js/MarkupPdf';
import markup2d from 'js/Markup2d';
import markupImage from 'js/MarkupImage';
import markupPlainText from 'js/MarkupPlainText';
import markupHtml from 'js/MarkupHtml';

'use strict';
//==================================================
// private variables
//==================================================
/** the current operation, either MarkupPdf or MarkupImage */
var operation = null;

//==================================================
// public functions
//==================================================
/**
 * Initializ the module, set the current operation
 *
 * @param {String} viewerType aw-pdf-viewer, aw-image-viewer, aw-text-viewer or null to clear it
 * @returns {boolean} true if successful
 */
export function init( viewerType ) {
    if( viewerType === "aw-pdf-viewer" && markupPdf.init( markupData.markups, markupData.users, markupThread ) ) {
        operation = markupPdf;
    } else if( viewerType === "aw-2d-viewer" && markup2d.init( markupData.markups, markupData.users, markupThread ) ) {
        operation = markup2d;
    } else if( viewerType === "aw-image-viewer" && markupImage.init( markupData.markups, markupData.users, markupThread ) ) {
        operation = markupImage;
    } else if( viewerType === "aw-text-viewer" && markupPlainText.init( markupData.markups, markupData.users, markupThread ) ) {
        operation = markupPlainText;
    } else if( viewerType === "aw-html-viewer" && markupHtml.init( markupData.markups, markupData.users, markupThread ) ) {
        operation = markupHtml;
    } else {
        operation = null;
    }

    if( operation ) {
        operation.setViewParamChangeCallback( viewParamChangeCallback );
        operation.setPageChangeCallback( pageChangeCallback );
        return true;
    }

    return false;
}

//==================================================
// private functions
//==================================================
/**
 * View param change callback
 */
function viewParamChangeCallback() {
    if( operation ) {
        operation.showCurrentPage();
    }
}

/**
 * Page change callback
 */
function pageChangeCallback() {
    if( operation ) {
        operation.showCurrentPage();
    }
}

//==================================================
// exported functions
//==================================================
let exports;
export let setPdfFrame = function( frame ) {
    markupPdf.setPdfFrame( frame );
};
export let setRevealed = function( revealed ) {
    operation && operation.setRevealed( revealed );
};
export let setTool = function( tool, subTool ) {
    operation && operation.setTool( tool, subTool );
};
export let addResource = function( name, value ) {
    operation && operation.addResource( name, value );
};
export let getUserSelection = function() {
    return operation ? operation.getUserSelection() : null;
};
export let clearUserSelection = function() {
    operation && operation.clearUserSelection();
};
export let show = function( markup, option ) {
    operation && operation.show( markup, option );
};
export let showAll = function( option ) {
    operation && operation.showAll( option );
};
export let showCurrentPage = function() {
    operation && operation.showCurrentPage();
};
export let showAsSelected = function( markup, option ) {
    operation && operation.showAsSelected( markup, option );
};
export let ensureVisible = function( markup ) {
    operation && operation.ensureVisible( markup );
};
export let getViewParam = function() {
    return operation ? operation.getViewParam() : null;
};
export let setViewParam = function( param ) {
    operation && operation.setViewParam( param );
};
export let setViewParamChangeCallback = function( callback ) {
    operation && operation.setViewParamChangeCallback( callback );
};
export let setPageChangeCallback = function( callback ) {
    operation && operation.setPageChangeCallback( callback );
};
export let setSelectCallback = function( callback ) {
    operation && operation.setSelectCallback( callback );
};
export let setSelectionEndCallback = function( callback ) {
    operation && operation.setSelectionEndCallback( callback );
};
export let setUnloadCallback = function( callback ) {
    operation && operation.setUnloadCallback( callback );
};
export let setPositionMarkup = function( markup ) {
    markupCanvas.setPositionMarkup( markup );
};
export let generateRefImage = function( markupOrList, width, height, callback ) {
    operation && operation.generateRefImage &&
        operation.generateRefImage( markupOrList, width, height, callback );
};

export default exports = {
    init,
    setPdfFrame,
    setRevealed,
    setTool,
    addResource,
    getUserSelection,
    clearUserSelection,
    show,
    showAll,
    showCurrentPage,
    showAsSelected,
    ensureVisible,
    getViewParam,
    setViewParam,
    setViewParamChangeCallback,
    setPageChangeCallback,
    setSelectCallback,
    setSelectionEndCallback,
    setUnloadCallback,
    setPositionMarkup,
    generateRefImage
};
