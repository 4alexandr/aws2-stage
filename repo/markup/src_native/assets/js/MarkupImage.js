// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the markup methods for drawing markups on the image viewer panel
 * 
 * @module js/MarkupImage
 */
import imgViewer from 'js/ImgViewer';
import markupCanvas from 'js/MarkupCanvas';
import markupColor from 'js/MarkupColor';
import markupTooltip from 'js/MarkupTooltip';

'use strict';
//==================================================
// private variables
//==================================================
/** The current view param */
var vp = {
    scale: 1,
    x: 0,
    y: 0,
    angle2: 0
};
/** The fit view param */
var vpFit = {
    scale: 1,
    x: 0,
    y: 0,
    angle2: 0
};

/** The container */
var container = null;
/** The current tool */
var tool = null;
/** The view param change callback */
var viewParamChangeCallback = null;
/** The current page index */
var currentIndex = 0;
/** The markup panel is currently revealed */
var revealed = false;

//==================================================
// public functions
//==================================================
/**
 * Initialize this module
 * 
 * @param {Markup} markups The list of markups
 * @param {User} users The list of users
 * @param {MarkupThread} thread The MarkupThread object
 * 
 * @return {boolean} true if image viewer is found
 */
export function init( markups, users, thread ) {
    container = imgViewer.getContainer();
    if( !container || !container.getBoundingClientRect() ) {
        return false;
    }

    vp = imgViewer.getViewParam();
    vpFit = imgViewer.getFitViewParam();
    imgViewer.setViewParamChangeCallback( myViewParamChangeCallback );
    imgViewer.setPointChangeCallback( markupCanvas.pointChangeCallback );
    imgViewer.setResizeCallback( function() {
        markupCanvas.setCanvas( container );
    } );

    markupCanvas.init( markups );
    markupCanvas.setCanvas( container );
    markupCanvas.setViewParam( vp );
    markupCanvas.setFitViewParam( vpFit );
    markupCanvas.setViewerContainer( container );

    markupColor.init( users, thread );
    markupTooltip.init( thread );

    return true;
}

/**
 * Set the current tool
 * 
 * @param {string} inTool the tool
 * @param {String} subTool - the subTool, defined only when tool is shape
 */
export function setTool( inTool, subTool ) {
    markupCanvas.setTool( inTool, subTool );
    if( inTool === "freehand" || inTool === "shape" ) {
        markupCanvas.showOverlay();
    } else {
        markupCanvas.hideOverlay();
    }

    tool = inTool;
}

/**
 * Get the user selection
 * 
 * @return {Selection} the current user selection
 */
export function getUserSelection() {
    return markupCanvas.getUserSelection();
}

/**
 * Clear the user selection
 */
export function clearUserSelection() {
    if( window.getSelection() ) {
        window.getSelection().removeAllRanges();
    }
    markupCanvas.hideOverlay();
}

/**
 * Set the select callback
 * 
 * @param {function} callback The callback
 */
export function setSelectCallback( callback ) {
    markupCanvas.setSelectCallback( function( markup ) {
        if( revealed ) {
            callback( markup );
        }
    } );
}

/**
 * Set the selection end callback
 * 
 * @param {function} callback The callback
 */
export function setSelectionEndCallback( callback ) {
    markupCanvas.setSelectionEndCallback( function( t ) {
        if( revealed && ( tool === t || t === "stamp" && tool === "position" ) ) {
            callback( t );
        }
    } );
}

/**
 * Set revealed
 * 
 * @param {boolean} reveal - true to reveal or false to hide
 */
export function setRevealed( reveal ) {
    revealed = reveal;
    markupTooltip.clearTooltip();
    setTool( null );
}

/**
 * Generate the refImage of one markup or a list of markups
 * 
 * @param {Markup} markupOrList - the markup to generate and update refImage, OR
 *                                the list of markups to generate refImage only if not exist
 * @param {Number} width - width of the generated image
 * @param {Number} height - height of the generated image
 * @param {Function} callback - the callback when finished
 */
export function generateRefImage( markupOrList, width, height, callback ) {
    var baseImage = imgViewer.getImage();
    var baseParam = { scale: 1, x: 0, y: 0, angle2: 0 };

    if( markupOrList.start ) {
        markupCanvas.generateRefImage( markupOrList, width, height, baseImage, baseParam );
    } else if( markupOrList.length > 0 ) {
        for( var i = 0; i < markupOrList.length; i++ ) {
            var markup = markupOrList[i];
            if( ! markupCanvas.hasRefImage( markup ) ) {
                markupCanvas.generateRefImage( markup, width, height, baseImage, baseParam );
            }
        }

        if( callback ) {
            callback();
        }
    }
}

//==================================================
// private functions
//==================================================
/**
 * Map to the normalized view param, i.e. the fit view param is mapped to {1, 0, 0}
 * 
 * @param {ViewParam} viewParam The view param to be normalized
 * 
 * @return {ViewParam} The normalized view param
 */
function toNormalizedViewParam( viewParam ) {
    var sn = viewParam.scale / vpFit.scale;
    var xn = ( vpFit.x - viewParam.x ) / viewParam.scale;
    var yn = ( vpFit.y - viewParam.y ) / viewParam.scale;

    return {
        scale: sn,
        x: xn,
        y: yn,
        angle2: viewParam.angle2
    };
}

/**
 * Map from the normalized view param, i.e. the view param {1, 0, 0} is mapped to the fit view param
 * 
 * @param {ViewParam} viewParam The normalized view param
 * 
 * @return {ViewParam} The original view param
 */
function fromNormalizedViewParam( viewParam ) {
    var vpF = viewParam.angle2 === undefined || viewParam.angle2 === vpFit.angle2 ? vpFit :
              imgViewer.getFitViewParam( viewParam.angle2 );
    var s = viewParam.scale * vpF.scale;
    var x = vpF.x - viewParam.x * s;
    var y = vpF.y - viewParam.y * s;

    return {
        scale: s,
        x: x,
        y: y,
        angle2: vpF.angle2
    };
}

/**
 * My view param change callback
 * 
 * @param {ViewParam} viewParam The view param at the end of the change
 */
function myViewParamChangeCallback( viewParam ) {
    markupTooltip.clearTooltip( "2d" );
    if( revealed && viewParamChangeCallback ) {
        viewParamChangeCallback( toNormalizedViewParam( viewParam ) );
    }
}

/**
 * Set page change callback
 * 
 * @param {function} callback The callback
 */
export function setPageChangeCallback( callback ) {
    if( container ) {
        container.addEventListener( "pagechange", function( event ) {
            currentIndex = event.pageNumber - 1;
            if( revealed ) {
                callback( currentIndex );
            }
        } );
    }
}

/**
 * Show the current page
 */
export function showCurrentPage() {
    markupCanvas.showCurrentPage();
}

/**
 * Ensure markup is visible
 * 
 * @param {Markup} markup The markup to be ensured as visible
 */
export function ensureVisible( markup ) {
    imgViewer.setViewParam( fromNormalizedViewParam( markup.viewParam ) );

}
//==================================================
// exported functions
//==================================================
let exports;
export let getViewParam = function() {
    return toNormalizedViewParam( vp );
};
export let setViewParam = function( viewParam ) {
    imgViewer.setViewParam( fromNormalizedViewParam( viewParam ) );
};
export let show = function( markup, option ) {
    markupCanvas.show( markup, option );
};
export let showAll = function( option ) {
    markupCanvas.showAll( option );
};
export let showAsSelected = function( markup, option ) {
    markupCanvas.showAsSelected( markup, option );
};
export let setViewParamChangeCallback = function( callback ) {
    viewParamChangeCallback = callback;
};
export let setUnloadCallback = function() {
    /* do nothing */ };
export let addResource = function( name, value ) {
    markupCanvas.addResource( name, value );
};

export default exports = {
    init,
    setTool,
    getUserSelection,
    clearUserSelection,
    getViewParam,
    setViewParam,
    show,
    showAll,
    showAsSelected,
    showCurrentPage,
    ensureVisible,
    setViewParamChangeCallback,
    setPageChangeCallback,
    setSelectCallback,
    setSelectionEndCallback,
    setUnloadCallback,
    addResource,
    setRevealed,
    generateRefImage
};
