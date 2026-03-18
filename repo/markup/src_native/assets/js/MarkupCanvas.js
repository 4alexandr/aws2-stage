/* eslint-disable max-lines */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/MarkupCanvas
 */
import markupGeom from 'js/MarkupGeom';
import markupFitPath from 'js/MarkupFitPath';
import markupColor from 'js/MarkupColor';
import markupTooltip from 'js/MarkupTooltip';
import measurement from 'js/Measurement';
import markupData from 'js/MarkupData';

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
/** The view param for drawing on screen */
var vpScreen = {
    scale: 1,
    x: 0,
    y: 0,
    angle2: 0
};
/** The list of all markups */
var markups = [];
/** The resources */
var resources = {};
/** The current tool */
var tool = null;
/** The subTool, defined only when tool is shape */
var subTool = null;

/** The list of cached canvas */
var canvasList = [];
/** The current canvas to show and draw markups */
var currentCanvas = null;
/** The current context to show and draw markups */
var currentCtx = null;
/** The current container index */
var currentIndex = 0;
/** The current selection of markups */
var currentSelection = null;
/** The canvas rectangle */
var canvasRect = {
    left: 0,
    top: 0,
    width: 100,
    height: 100
};
/** The viewer container */
var viewerContainer = null;
/** The hit markup */
var hitMarkup = null;

/** The x coord of the event */
var eventX = 0;
/** The y coord of the event */
var eventY = 0;
/** The count events added to path */
var eventN = 0;
/** The pen is on */
var penOn = false;
/** The overlay is on */
var overlayOn = false;
/** The user selection */
var userSelection = null;
/** The selection change callback */
var selectionEndCallback = null;
/** The select callback */
var selectCallback = null;

/** The image button Done */
var imgDone = null;
/** The image button Undo */
var imgUndo = null;
/** The image button Redo */
var imgRedo = null;
/** The image button Delete */
var imgDelete = null;

/** The constant value 2 PI */
var angle2PI = Math.PI * 2;
/** The right angle */
var angleRight = Math.PI / 2;
/** The snap tolerance */
var angleSnap = Math.PI / 32;

/** The markup currently being positioned  */
var posMarkup = null;
/** The geometry currently being positioned */
var posGeom = null;
/** the index of posGeom in the geometry list */
var posIndex = 0;
/** The original geometry before positioned */
var oriGeom = null;
/** The current position mode MOVE=1, RESIZE=2, ROTATE=4, RESIZE_ROTATE=6 */
var posMode = 0;

//==================================================
// public functions
//==================================================
/**
 * Initialize this module
 *
 * @param {Markup} inMarkups The list of markups
 */
export function init( inMarkups ) {
    imgDone = imgUndo = imgRedo = imgDelete = currentCtx = currentCanvas = null;
    markups = inMarkups;
    canvasList = [];
    posMarkup = null;
    posGeom = null;
    oriGeom = null;
    posMode = 0;
}

/**
 * Get the canvas for markup from the given container
 *
 * @param {Element} container The container to be tested
 *
 * @return {Canvas} the existing canvas or null
 */
export function getCanvas( container ) {
    var list = container.getElementsByTagName( "canvas" );
    for( var i = 0; i < list.length; i++ ) {
        if( list[ i ].id.indexOf( "markup" ) === 0 ) {
            return list[ i ];
        }
    }

    return null;
}

/**
 * Set the current markup canvas, create if not already exist
 *
 * @param {Element} container The current container
 * @param {number} index The current index, default 0
 *
 * @return {boolean} true if a new canvas is created
 */
export function setCanvas( container, index ) {
    index = index || 0;
    currentCanvas = getCanvas( container );
    currentIndex = index;

    if( currentCanvas ) {
        currentCtx = currentCanvas.getContext( "2d" );
        canvasList[ index ] = currentCanvas;
        setCanvasRect( container, currentCanvas );
        return false;
    }

    currentCanvas = container.ownerDocument.createElement( "canvas" );
    currentCanvas.id = "markup" + ( index + 1 );
    currentCanvas.style.touchAction = "none";
    currentCanvas.style.pointerEvents = "none";
    currentCanvas.style.zIndex = "100";

    currentCtx = currentCanvas.getContext( "2d" );
    canvasList[ index ] = currentCanvas;

    container.appendChild( currentCanvas );
    setCanvasRect( container, currentCanvas );

    if( window.navigator.pointerEnabled ) {
        currentCanvas.addEventListener( "pointerdown", penPointerStart );
        currentCanvas.addEventListener( "pointermove", penPointerMove );
        currentCanvas.addEventListener( "pointerup", penPointerStop );
        currentCanvas.addEventListener( "pointerout", penPointerStop );
    } else {
        currentCanvas.addEventListener( "mousedown", penMouseStart );
        currentCanvas.addEventListener( "mousemove", penMouseMove );
        currentCanvas.addEventListener( "mouseup", penStop );
        currentCanvas.addEventListener( "mouseout", penStop );
    }

    currentCanvas.addEventListener( "touchstart", penTouchStart );
    currentCanvas.addEventListener( "touchmove", penTouchMove );
    currentCanvas.addEventListener( "touchend", penTouchEnd );
    currentCanvas.addEventListener( "touchcancel", penTouchEnd );

    container.addEventListener( "dragover", stampDragOver );
    container.addEventListener( "drop", stampDrop );

    return true;
}

/**
 * Set the markup canvas rectangle
 *
 * @param {Element} container The container to set its markup canvas
 * @param {Canvas} canvas The canvas to be set, default the markup canvas in the container
 */
export function setCanvasRect( container, canvas ) {
    canvas = canvas || getCanvas( container );
    if( container && canvas ) {
        var docRect = container.ownerDocument.documentElement.getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();

        canvasRect.width = containerRect.right - containerRect.left;
        canvasRect.height = containerRect.bottom - containerRect.top;
        canvasRect.left = containerRect.left - docRect.left;
        canvasRect.top = containerRect.top - docRect.top;

        canvas.width = canvasRect.width;
        canvas.height = canvasRect.height;
        canvas.style.left = "0px";
        canvas.style.top = "0px";
        canvas.style.position = "absolute";
    }
}

/**
 * Set the current tool
 * @param {String} inTool - the tool to be set
 * @param {String} inSubTool - the subTool, defined only when tool is shape
 */
export function setTool( inTool, inSubTool ) {
    tool = inTool === "freehand" || inTool === "shape" || 
           inTool === "stamp" || inTool === "position" ? inTool : null;
    subTool = inTool === "shape" ? inSubTool: null;
}

/**
 * Show overlay for user drawing and positioning
 */
export function showOverlay() {
    if( currentCanvas && currentCtx ) {
        currentCanvas.style.pointerEvents = "auto";
        currentCanvas.style.cursor = tool === "freehand" || tool === "shape" ? "crosshair" :
            tool === "stamp" && posMarkup ? "move" : "pointer";
        overlayOn = true;
        markupFitPath.clearMergeStack( true );
        showMergeResults();
    }
}

/**
 * Hide overlay for user drawing
 */
export function hideOverlay() {
    if( currentCanvas ) {
        overlayOn = false;
        currentCanvas.style.pointerEvents = "none";
        currentCanvas.style.cursor = "pointer";
        showCurrentPage();
    }

    hideButtons();
}

/**
 * Show one markup
 *
 * @param {Markup} markup The markup to be shown
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
export function show( markup, option ) {
    var canvas = currentCanvas;
    var ctx = currentCtx;

    if( markup.start.page !== currentIndex ) {
        canvas = canvasList[ markup.start.page ];
        ctx = ( canvas ? canvas.getContext( "2d" ) : null );
    }

    var hasGeomList = ctx && markup.geometry && markup.geometry.list;
    if( hasGeomList && ( option === 0 || option === undefined && markup.visible ) ) {
        var geomList = markup.geometry.list;
        var color = markupColor.getColor( markup );
        var selected = ( markup === currentSelection );

        for( var i = 0; i < geomList.length; i++ ) {
            var geom = geomList[ i ];
            var html = geom.shape === 'gdnt' && markup.showOnPage === 'all' ? markup.comment : undefined;
            drawGeom( ctx, geom, html, vp, markup.textParam, color, selected );
        }
    }
}

/**
 * Show all markups
 *
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
export function showAll( option ) {
    clearAllCanvas();

    if( option === 0 || option === undefined ) {
        for( var i = 0; i < markups.length; i++ ) {
            var markup = markups[ i ];
            if( markup.type === "2d" ) {
                show( markup, option );
            }
        }
    }
}

/**
 * Show markup as selected
 *
 * @param {Markup} markup The markup to be shown
 * @param {number} option The option, SHOW_MARKUP=0, HIDE_MARKUP=1, REMOVE_MARKUP=2
 */
export function showAsSelected( markup, option ) {
    currentSelection = ( option === 0 ? markup : null );
    showCurrentPage();
}

/**
 * Show markups on the current page
 */
export function showCurrentPage() {
    clearCanvas( currentIndex );

    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        if( markup.type === "2d" && markup.start.page === currentIndex ) {
            show( markup );
        }
    }
}

/**
 * Point change callback
 *
 * @param {number} x The x coord in screen coord
 * @param {number} y The y coord in screen coord
 * @param {string} eType The event type
 * @param {number} index The page index, default 0
 */
export function pointChangeCallback( x, y, eType, index ) {
    index = index || 0;
    if( eType === "mousemove" || eType === "click" || eType === "touchend" ) {
        var markup = findHitMarkup( x, y, vp, index );
        var doSelection = false;

        if( markup === null ) {
            markupTooltip.clearTooltip( "2d" );
        } else if( eType === "click" || ( eType === "touchend" && markup === hitMarkup ) ) {
            doSelection = true;
        } else if( markup !== hitMarkup ) {
            var canvas = canvasList[ index ];
            if( canvas && !overlayOn ) {
                var rect = canvas.getBoundingClientRect();
                var boundingRect = {
                    left: rect.left + x - 1,
                    right: rect.left + x + 1,
                    top: rect.top + y - 1,
                    bottom: rect.top + y + 1
                };
                markupTooltip.showTooltip( viewerContainer, markup, boundingRect );
            }
        }

        hitMarkup = markup;

        if( doSelection && selectCallback ) {
            markupTooltip.clearTooltip( "2d" );
            selectCallback( markup );
        }
    } else {
        markupTooltip.clearTooltip( "2d" );
        hitMarkup = null;
    }
}

/**
 * Set Html as Image to the geometry of the markup
 *
 * @param {Markup} markup - the markup to be set
 * @param {Number} index - the index of the geometry in the list
 * @param {String} html - the html, or null to remove
 * @param {boolean} edit - true when in edit mode, false when quit edit mode, undefined when load markups
 */
export function setFillImage( markup, index, html, edit ) {
    if( markup && markup.geometry && markup.geometry.list ) {
        if( html ) {
            if( edit || markup.textParam === undefined ) {
                var scale = edit !== undefined ? vp.scale : markup.viewParam.scale * vpFit.scale;
                var angle = edit !== undefined ? vp.angle2 : 0;
                adjustMarkupByImageSize( markup, index, html, angle );
                markup.textParam = calcTextParam( markup, index, html, scale, angle );
            }

            var w = Math.abs( markup.textParam.x ) * 2;
            var h = Math.abs( markup.textParam.y ) * 2;
            var swap = markup.textParam.x * markup.textParam.y < 0;
            var width = swap ? h : w;
            var height = swap ? w : h;

            var data = '<svg xmlns="http://www.w3.org/2000/svg" ' +
                'width="' + width + '" height="' + height + '">' +
                '<foreignObject width="' + width + '" height="' + height +
                '"><div xmlns="http://www.w3.org/1999/xhtml"' +
                ' style="font-family:sans-serif,Arial,Verdana; font-size:13px;">' + 
                html + '</div></foreignObject></svg>';

            var img = new Image();
            img.onload = function() {
                markup.geometry.list[index].fillImage = img;
                if( edit !== undefined ) {
                    showAsSelected( markup, edit ? 1 : 0 );
                } else if( ! markup.stampName ) {
                    showCurrentPage();
                }
            };
            img.crossOrigin = 'anonymous';
            var blob = new Blob( [ data ], { type : 'image/svg+xml' } );
            var reader = new FileReader();
            reader.onload = function( e ) {
                img.src = e.target.result;
            };
            reader.readAsDataURL( blob );
        } else {
            markup.geometry.list[index].fillImage = undefined;
            if( edit !== undefined ) {
                showAsSelected( markup, edit ? 1 : 0 );
            }
        }
    }
}

/**
 * Get the markup fill size in screen coordinates
 * 
 * @param {Markup} markup - the markup
 * @param {Number} index - the index of the geometry in the list
 * @param {Boolean} inScreen - true in screen coord, false in world coord
 */
export function getFillSize( markup, index, inScreen ) {
    if( markup && markup.geometry && markup.geometry.list ) {
        var geom = markup.geometry.list[ index ];
        var scale = inScreen ? vp.scale : 1;
        var rect = markupGeom.getGeomRect( geom );

        if( ( geom.shape === "rectangle" || geom.shape === "ellipse" ) && 
            ( Math.round( geom.angle / angleRight ) + 16 ) % 2 ) {
            return { width: rect.height * scale, height: rect.width * scale };
        }

        return { width: rect.width * scale, height: rect.height * scale };
    }
}

/**
 * Update the markup size according to its html, i.e. the GD&T
 * @param {Markup} markup - the markup to be updated
 */
export function updateGdntSize( markup ) {
    if( markup && markup.geometry && markup.geometry.list[0].shape === "gdnt" ) {
        var info = calcGdntInfo( currentCtx, markup.comment );
        var screenWidth = info ? info.width : 40;
        var screenHeight = info ? info.height : 20;

        var geom = markup.geometry.list[0];
        var worldWidth = screenWidth / vp.scale;
        var worldHeight = screenHeight / vp.scale;

        var dx = geom.endPt.x - geom.startPt.x;
        var dy = geom.endPt.y - geom.startPt.y;
        var xMajor = Math.abs( dx ) > Math.abs( dy );
        var worldDx = ( dx > 0 ? 1: -1 ) * ( xMajor ? worldWidth: worldHeight );
        var worldDy = ( dy > 0 ? 1: -1 ) * ( xMajor ? worldHeight: worldWidth );

        geom.endPt.x = geom.startPt.x + worldDx;
        geom.endPt.y = geom.startPt.y + worldDy;
        geom.bbox = null;
        var bbox = markupGeom.getGeomBbox( geom );
        markup.start.x = bbox.xmin;
        markup.start.y = bbox.ymin;
        markup.end.x = bbox.xmax;
        markup.end.y = bbox.ymax;
    }
}

/**
 * Set the markup to be positioned
 * 
 * @param {Markup} markup - the markup to be positioned
 */
export function setPositionMarkup( markup ) {
    posMarkup = markup;
    posGeom = null;
    oriGeom = null;
    posMode = 0;

    if( markup ) {
        showOverlay();
    }
}

/**
 * Generate refImage from base image and markup, store in markup
 * 
 * @param {Markup} markup - the markup to be in the generated image
 * @param {Number} width - the width of the generated image
 * @param {Number} height - the height of the generated image
 * @param {Image} baseImage - the base image
 * @param {Number} baseParam - the map from world to baseImage
 * @param {Rectangle[]} highlight - the highlight rectangles
 */
export function generateRefImage( markup, width, height, baseImage, baseParam, highlight ) {
    var canvas = document.createElement( "canvas" );
    var ctx = canvas.getContext( "2d" );

    canvas.width = width;
    canvas.height = height;
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.position = "absolute";

    // calculate refParam to show markup in center with some surrounding area
    var xmin = Number.MAX_VALUE;
    var xmax = -Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var ymax = -Number.MAX_VALUE;

    if( markup.type === 'text' && highlight ) {
        highlight.forEach( function( rect ) {
            xmin = Math.min( xmin, rect.left );
            xmax = Math.max( xmax, rect.left + rect.width );
            ymin = Math.min( ymin, rect.top );
            ymax = Math.max( ymax, rect.top + rect.height );
        } );
    } else if( markup.type === '2d' ) {
        xmin = markup.start.x;
        xmax = markup.end.x;
        ymin = markup.start.y;
        ymax = markup.end.y;
    }

    var imageW = baseImage.naturalWidth || baseImage.width;
    var imageH = baseImage.naturalHeight || baseImage.height;
    if( Math.round( baseParam.angle2 / angleRight ) % 2 === 1 ) {
        var tmp = imageW;
        imageW = imageH;
        imageH = tmp;
    }

    var markupW = Math.min( imageW, ( xmax - xmin ) * 2 );
    var markupH = Math.min( imageH, ( ymax - ymin ) * 2 );
    if( Math.round( markup.viewParam.angle2 / angleRight ) % 2 === 1 ) {
        var temp = markupW;
        markupW = markupH;
        markupH = temp;
    }

    var refParam = {};
    refParam.scale = Math.min( width / markupW, height / markupH, 1 );
    refParam.angle2 = markup.viewParam.angle2;

    var cos = Math.cos( refParam.angle2 );
    var sin = Math.sin( refParam.angle2 );
    var px = ( xmin + xmax ) / 2;
    var py = ( ymin + ymax ) / 2;
    refParam.x = width / 2 - refParam.scale * ( px * cos - py * sin );
    refParam.y = height / 2 - refParam.scale * ( px * sin + py * cos );

    // draw base image
    var scale = refParam.scale / baseParam.scale;
    ctx.save();
    ctx.translate( refParam.x, refParam.y );
    ctx.scale( scale, scale );
    ctx.rotate( refParam.angle2 - baseParam.angle2 );
    ctx.drawImage( baseImage, -baseParam.x, -baseParam.y );
    ctx.restore();

    // draw markup
    var color = markupColor.getColor( markup );
    if( markup.type === 'text' ) {
        ctx.save();
        ctx.translate( refParam.x, refParam.y );
        ctx.scale( refParam.scale, refParam.scale );
        ctx.rotate( refParam.angle2 );
        ctx.fillStyle = color;
        highlight.forEach( function( rect ) {
            ctx.beginPath();
            ctx.rect( rect.left, rect.top, rect.width, rect.height );
            ctx.closePath();
            ctx.fill();
        } );
        ctx.restore();
    } else if( markup.type === '2d' ) {
        var geomList = markup.geometry.list;
        for( var i = 0; i < geomList.length; i++ ) {
            var geom = geomList[ i ];
            var html = geom.shape === 'gdnt' && markup.showOnPage === 'all' ? markup.comment : undefined;
            drawGeom( ctx, geom, html, refParam, markup.textParam, color, false );
        }
    }

    markup.refImage = canvas.toDataURL();
    canvas.remove();
}

/**
 * Test if a markup has generated refImage, excluding filename
 * 
 * @param {Markup} markup - the markup to be tested
 * @returns {boolean} true if the markups has generated refImage
 */
export function hasRefImage( markup ) {
    return markup && markup.refImage && markup.refImage.startsWith( 'data:image/png;base64,' );
}

//==================================================
// private functions
//==================================================
/**
 * Find a hit markup
 *
 * @param {number} x The x coord in screen coord on canvas
 * @param {number} y The y coord in screen coord on canvas
 * @param {ViewParam} viewParam The view param
 * @param {number} index The container index, default 0
 *
 * @return {Markup} The hit markup
 */
function findHitMarkup( x, y, viewParam, index ) {
    index = index || 0;
    var hitMarkup = null;
    var hitArea = Number.MAX_VALUE;

    var worldP = markupGeom.pointScreenToWorld( { x, y }, viewParam );
    for( var i = 0; i < markups.length; i++ ) {
        var markup = markups[ i ];
        if( markup.visible && markup.start.page === index && markup.geometry && markup.geometry.list ) {
            var geomList = markup.geometry.list;
            for( var j = 0; j < geomList.length; j++ ) {
                var geom = geomList[ j ];
                if( markupGeom.pointInGeom( worldP, geom, viewParam ) ) {
                    var area = markupGeom.getGeomArea( geom );
                    if( !hitMarkup || area < hitArea || area === hitArea && markup.date < hitMarkup.date ) {
                        hitMarkup = markup;
                        hitArea = area;
                    }
                }
            }
        }
    }

    return hitMarkup;
}

/**
 * Find the hit geometry in a markup
 * 
 * @param {Markup} markup The markup to be tested
 * @param {number} x The x coord in screen coord on canvas
 * @param {number} y The y coord in screen coord on canvas
 * @param {ViewParam} viewParam The view param
 * @param {Number} extraTol Extra tolerance in screen coord, default 0
 * 
 * @returns {Geometry} the hit geometry, or null if not found
 */
function findHitGeom( markup, x, y, viewParam, extraTol ) {
    if( markup ) {
        var worldP = markupGeom.pointScreenToWorld( { x, y }, viewParam );
        for( var i = 0; i < markup.geometry.list.length; i++ ) {
            var geom = markup.geometry.list[ i ];
            if( markupGeom.pointInGeom( worldP, geom, viewParam, extraTol ) ) {
                posIndex = i;
                return geom;
            }
        }
    }

    return null;
}

/**
 * The common logic for pen start
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 */
function penStart( x, y ) {
    penOn = true;
    if( tool === "position" || tool === "shape" || tool === "stamp" ) {
        posGeomInit( x, y );
        showMergeResults();
        eventX = x;
        eventY = y;
    } else if( tool === "freehand" ) {
        currentCtx.beginPath();
        currentCtx.strokeStyle = markupColor.toSolidColor( markupColor.getMyColor() );
        currentCtx.lineWidth = 2;
        currentCtx.moveTo( x, y );
        markupFitPath.start( x, y );
        eventX = x;
        eventY = y;
        eventN = 0;
    }
}

/**
 * The common logic for pen move
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 */
function penMove( x, y ) {
    if( penOn ) {
        if( tool === "position" ) {
            if( posMode & 1 ) {
                posGeomMove( x - eventX, y - eventY );
                showMergeResults(); 
                eventX = x;
                eventY = y;
            } else if( ( posMode & 6 ) && posGeom.center ) {
                var v0 = { x: eventX - posGeom.center.x, y: eventY - posGeom.center.y };
                var v1 = { x: x - posGeom.center.x, y: y - posGeom.center.y };
                var len0 = Math.sqrt( v0.x * v0.x + v0.y * v0.y );
                var len1 = Math.sqrt( v1.x * v1.x + v1.y * v1.y );
                var tol = 0.000001;

                if( len0 > tol && len1 > tol ) {
                    if( posMode & 2 ) {
                        var scale = len1 / len0;
                        posGeomResize( scale );
                    }

                    if( posMode & 4 ) {
                        var dot = v0.x * v1.x + v0.y * v1.y;
                        var cross = v0.x * v1.y - v0.y * v1.x;
                        var angle = Math.atan2( cross, dot );
                        posGeomRotate( angle );
                    }

                    showMergeResults(); 
                }
            }
        } else if( tool === "shape" ) {
            posGeomAdjustShape( eventX, eventY, x, y );
            showMergeResults();
        } else if( tool === "stamp" ) {
            posGeomMove( x - eventX, y - eventY );
            showMergeResults(); 
            eventX = x;
            eventY = y;
        } else if( tool === "freehand" && penStroke( x, y ) ) {
            currentCtx.lineTo( x, y );
            currentCtx.stroke();
            markupFitPath.add( x, y );
            eventX = x;
            eventY = y;
            eventN++;
        }
    } else if( tool === "position" ) {
        var geom = findHitGeom( posMarkup, x, y, vp );
        if( geom ) {
            currentCanvas.style.cursor = "move";
        } else {
            geom = findHitGeom( posMarkup, x, y, vp, 30 );
            if( geom && geom.center ) {
                currentCanvas.style.cursor = "nw-resize";
            } else {
                currentCanvas.style.cursor = "pointer";
            }
        }
    }
}

/**
 * The common logic for pen stop
 */
function penStop() {
    if( penOn ) {
        penOn = false;
        if( tool === "position" ) {
            updatePositionMarkup();   
            if( selectionEndCallback ) {
                selectionEndCallback( "position" );
            }
        } if( tool === "stamp" ) {
            setUserSelection( [ posGeom ] ); 
            if( selectionEndCallback ) {
                selectionEndCallback( "stamp" );
            }
        } if( tool === "shape" ) {
            if( posGeomValidShape() ) {
                setUserSelection( [ posGeom ] );
                hideOverlay();    
                if( selectionEndCallback ) {
                    selectionEndCallback( "shape" );
                }
            }
        } else if( tool === "freehand" && eventN > 2 ) {
            markupFitPath.fit();
            showMergeResults();
        }
    }
}

/**
 * The common logic to decide if a pen stroke is acceptible
 *
 * @param {number} x The x coord
 * @param {number} y The y coord
 *
 * @return {boolean} true if it is acceptible
 */
function penStroke( x, y ) {
    var dx = x - eventX;
    var dy = y - eventY;
    return ( dx * dx + dy * dy >= 9 );
}

/**
 * Pen mouse start event handler
 *
 * @param {Event} e The event
 */
function penMouseStart( e ) {
    e = e || window.event;
    var x = e.offsetX || e.layerX;
    var y = e.offsetY || e.layerY;
    penStart( x, y );
}

/**
 * Pen mouse move event handler
 *
 * @param {Event} e The event
 */
function penMouseMove( e ) {
    e = e || window.event;
    var x = e.offsetX || e.layerX;
    var y = e.offsetY || e.layerY;
    penMove( x, y );
}

/**
 * Pen touch start event handler
 *
 * @param {Event} e The event
 */
function penTouchStart( e ) {
    e = e || window.event;
    e.preventDefault();

    var x = e.touches[ 0 ].pageX - canvasRect.left;
    var y = e.touches[ 0 ].pageY - canvasRect.top;
    penStart( x, y );
}

/**
 * Pen touch move event handler
 *
 * @param {Event} e The event
 */
function penTouchMove( e ) {
    e = e || window.event;
    e.preventDefault();

    var x = e.touches[ 0 ].pageX - canvasRect.left;
    var y = e.touches[ 0 ].pageY - canvasRect.top;
    penMove( x, y );
}

/**
 * Pen touch end event handler
 *
 * @param {Event} e The event
 */
function penTouchEnd( e ) {
    e = e || window.event;
    e.preventDefault();
    penStop();
}

/**
 * Pen pointer start event handler
 *
 * @param {Event} e The event
 */
function penPointerStart( e ) {
    e = e || window.event;
    if( e.pointerType === "touch" ) {
        e.preventDefault();
    }
    penMouseStart( e );
}

/**
 * Pen pointer move event handler
 *
 * @param {Event} e The event
 */
function penPointerMove( e ) {
    e = e || window.event;
    if( e.pointerType === "touch" ) {
        e.preventDefault();
    }
    penMouseMove( e );
}

/**
 * Pen pointer stop event handler
 *
 * @param {Event} e The event
 */
function penPointerStop( e ) {
    e = e || window.event;
    if( e.pointerType === "touch" ) {
        e.preventDefault();
    }
    penStop();
}

/**
 * Draw geometry
 *
 * @param {Context} ctx the context
 * @param {FitPathResult} geom the geom
 * @param {String} fillHtml the html to be rendered inside geom
 * @param {ViewParam} viewParam the view param
 * @param {ViewParam} textParam the text param
 * @param {Color} color the color
 * @param {boolean} selected true if selected
 */
function drawGeom( ctx, geom, fillHtml, viewParam, textParam, color, selected ) {
    var richColor = markupColor.toRichColor( color );
    var solidColor = markupColor.toSolidColor( color );

    ctx.save();
    ctx.translate( viewParam.x, viewParam.y );
    ctx.scale( viewParam.scale, viewParam.scale );
    ctx.rotate( viewParam.angle2 );   

    // now in world coord system
    if( geom.shape === "freehand" || geom.shape === "polyline" || geom.shape === "polygon" ) {
        ctx.beginPath();
        ctx.moveTo( geom.vertices[ 0 ].x, geom.vertices[ 0 ].y );
        for( var i = 1; i < geom.vertices.length; i++ ) {
            if( geom.shape === "polygon" && geom.stroke && geom.stroke.style === "cloud" ) {
                var x = geom.vertices[i-1].x;
                var y = geom.vertices[i-1].y;
                var dx = geom.vertices[i].x - x;
                var dy = geom.vertices[i].y - y;
                var len = Math.sqrt( dx * dx + dy * dy );

                var dia = calcLineWidth( geom, viewParam ) * 6;
                var hop = Math.max( Math.floor( len / dia ), 1 );
                dx /= hop;
                dy /= hop;
                x += dx / 2;
                y += dy / 2;

                var end = Math.atan2( dy, dx );
                var start = end - Math.PI;
                var ccw = markupGeom.getGeomTurn( geom ) < 0;
                for( var j = 0; j < hop; j++, x += dx, y += dy ) {
                    ctx.arc( x, y, dia / 2, start, end, ccw ); 
                }
            } else {
                ctx.lineTo( geom.vertices[ i ].x, geom.vertices[ i ].y );
            }
        }

        // draw fill and image in world coord system
        if( geom.shape === "polygon" ) {
            ctx.closePath();
            drawFill( ctx, geom, color );
        }
        drawContent( ctx, geom, textParam );
    } else if( geom.shape === "curve" || geom.shape === "closed-curve" ) {
        var pts = geom.vertices;
        if( geom.debug ) {
            // draw lines connecting control points
            ctx.beginPath();
            ctx.moveTo( pts[0].x, pts[0].y );
            for( var i = 1; i < pts.length; i++ ) {
                ctx.lineTo( pts[i].x, pts[i].y );
            }
            ctx.strokeStyle = 'green';
            ctx.stroke();

            // draw control and end points
            var r = calcLineWidth( geom, viewParam ) * 2;
            for( var i = 0; i < pts.length; i++ ) {
                ctx.beginPath();
                ctx.arc( pts[i].x, pts[i].y, r, 0, 2 * Math.PI );
                ctx.strokeStyle = pts[i].c ? 'green' : 'red';
                ctx.stroke();
            }

            // draw approximate lines
            var appPts = markupGeom.getCurveApproxPts( geom );
            ctx.beginPath();
            ctx.moveTo( appPts[0].x, appPts[0].y );
            for( var i = 1; i < appPts.length; i++ ) {
                ctx.lineTo( appPts[i].x, appPts[i].y );
            }
            ctx.strokeStyle = 'blue';
            ctx.stroke();

            // draw bbox
            var bbox = markupGeom.getGeomBbox( geom );
            ctx.beginPath();
            ctx.rect( bbox.xmin, bbox.ymin, bbox.xmax - bbox.xmin, bbox.ymax - bbox.ymin );
            ctx.strokeStyle = 'gray';
            ctx.stroke();
        }

        // draw the curve
        ctx.beginPath();
        for( var i = 0; i < pts.length - 1; ) {
            var d = markupGeom.getCurveDegree( geom, i );
            if( i === 0 ) {
                ctx.moveTo( pts[0].x, pts[0].y );
            }
            if( d === 1 ) {
                ctx.lineTo( pts[i+1].x, pts[i+1].y );
            } else if( d === 2 ) {
                ctx.quadraticCurveTo( pts[i+1].x, pts[i+1].y, pts[i+2].x, pts[i+2].y );
            } else if( d === 3 ) {
                ctx.bezierCurveTo( pts[i+1].x, pts[i+1].y, pts[i+2].x, pts[i+2].y, pts[i+3].x, pts[i+3].y );
            }

            i += d;
        }

        if( geom.shape === "closed-curve" ) {
            ctx.closePath();
            drawFill( ctx, geom, color );
        }
        drawContent( ctx, geom, textParam );                
    } else if( geom.shape === "rectangle" ) {
        var a = geom.major;
        var b = geom.minor;
        var r = geom.cornerRadius > 0 ? geom.cornerRadius * b : 0;

        ctx.translate( geom.center.x, geom.center.y );
        ctx.rotate( geom.angle );
        ctx.beginPath();
        ctx.moveTo( a, b - r );
        r > 0 && ctx.arc( a - r, b - r, r, 0, Math.PI / 2 );
        ctx.lineTo( -a + r, b );
        r > 0 && ctx.arc( -a + r, b - r, r, Math.PI / 2, Math.PI );
        r < b && ctx.lineTo( -a, -b + r );
        r > 0 && ctx.arc( -a + r, -b + r, r, Math.PI, Math.PI * 3 / 2 );        
        ctx.lineTo( a - r, -b );
        r > 0 && ctx.arc( a - r, -b + r, r, Math.PI * 3 / 2, Math.PI * 2 );  
        r < b && ctx.lineTo( a, b - r );
        ctx.closePath();
        // draw fill and image in world coord system, with origin at center and rotated
        drawFill( ctx, geom, color );
        drawContent( ctx, geom, textParam );
    } else if( geom.shape === "ellipse" || geom.shape === "circle" ) {
        ctx.translate( geom.center.x, geom.center.y );
        ctx.rotate( geom.angle );
        ctx.save();
        ctx.scale( geom.major, geom.minor );

        ctx.beginPath();
        ctx.arc( 0, 0, 1, 0, 2 * Math.PI );
        ctx.restore();
        // draw fill and image in world coord system, with origin at center and rotated
        drawFill( ctx, geom, color );
        drawContent( ctx, geom, textParam );
    } else if( geom.shape === "gdnt" ) {
        drawGdnt( ctx, geom, fillHtml, viewParam );
    } else if( geom.shape === "measurement" ) {
        var highlight = {
            selected: selected,
            lineWidth: 10 / viewParam.scale,
            color: richColor
        };
        measurement.draw( ctx, geom, highlight );
        ctx.restore();
        return;
    } else {
        return;
    }

    // highlight if selected
    if( selected ) {
        drawHighlight( ctx, geom, richColor, viewParam );
    }

    // Draw stroke and arrows in world coord system
    drawStroke( ctx, geom, solidColor, viewParam );

    // Draw hatch in world coord system
    drawHatch( ctx, geom, solidColor, viewParam );
    ctx.restore();
}

/**
 * Draw geometry with fill color
 *
 * @param {Context2D} ctx - the context of the canvas
 * @param {Geometry} geom - the geometry
 * @param {Color} color - the default color
 */
function drawFill( ctx, geom, color ) {
    if( geom.fill && geom.fill.style === "solid" ) {
        ctx.fillStyle = geom.fill.color !== "" ? markupColor.fromHex( geom.fill.color ) : color;
        ctx.fill();
    }
}

/**
 * Draw geometry with hatch
 *
 * @param {Context2D} ctx - the context of the canvas
 * @param {Geometry} geom - the geometry
 * @param {Color} color - the default color
 * @param {ViewParam} viewParam The view param
 */
function drawHatch( ctx, geom, color, viewParam ) {
    if( geom.fill && geom.fill.style ) {
        var style = geom.fill.style.substring( 0, 5 );
        if( style === "hatch" || style === "cross" ) {
            var r = 0;
            if( geom.shape === "ellipse" || geom.shape === "circle" ) {
                r = geom.major;
            } else if( geom.shape === "rectangle" ) {
                r = Math.sqrt( geom.major * geom.major + geom.minor * geom.minor );
            } else {
                var x = 0;
                var y = 0;
                for( var i = 0; i < geom.vertices.length; i++ ) {
                    x += geom.vertices[ i ].x;
                    y += geom.vertices[ i ].y;
                }

                x /= geom.vertices.length;
                y /= geom.vertices.length;

                for( var j = 0; j < geom.vertices.length; j++ ) {
                    var dx = geom.vertices[ j ].x - x;
                    var dy = geom.vertices[ j ].y - y;
                    var d = Math.sqrt( dx * dx + dy * dy );
                    if( d > r ) {
                        r = d;
                    }
                }
                ctx.translate( x, y );
            }

            var space = geom.fill.space ? geom.fill.space : 10;
            var hatch = vp.scale > 0 ? space / vp.scale : space;
            var degree = geom.fill.degree ? geom.fill.degree : geom.fill.style.substring( 5 );

            ctx.clip();
            ctx.save();
            ctx.rotate( -degree * Math.PI / 180 );
            for( var v = -r; v < r; v += hatch ) {
                ctx.moveTo( -r, v );
                ctx.lineTo( r, v );
                if( style === "cross" ) {
                    ctx.moveTo( v, -r );
                    ctx.lineTo( v, r );
                }
            }

            ctx.restore();
            ctx.strokeStyle = geom.fill.color ? markupColor.fromHex( geom.fill.color ) : color;
            ctx.lineWidth = 0.5 / viewParam.scale;
            ctx.setLineDash( [] );
            ctx.stroke();
        }
    }
}

/**
 * Draw highlight with default color
 * @param {Context2D} ctx - the context of the canvas
 * @param {Geometry} geom - the geometry
 * @param {Color} color - the default color
 * @param {ViewParam} viewParam The view param
 */
function drawHighlight( ctx, geom, color, viewParam ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 10 / viewParam.scale;
    ctx.lineCap = "round";
    ctx.setLineDash( [] );
    ctx.stroke();
}

/**
 * Draw geometry with stoke color and style
 *
 * @param {Context2D} ctx - the context of the canvas
 * @param {Geometry} geom - the geometry
 * @param {Color} color - the default color
 * @param {ViewParam} viewParam The view param
 */
function drawStroke( ctx, geom, color, viewParam ) {
    if( !geom.stroke || geom.stroke.style !== "none" ) {
        var lineColor = geom.stroke && geom.stroke.color !== "" ? markupColor.fromHex( geom.stroke.color ) : color;
        var lineWidth = calcLineWidth( geom, viewParam );
        var w = lineWidth < 1 ? 1 : lineWidth;

        var seg = !geom.stroke || geom.stroke.style === "solid" || geom.stroke.style === "cloud" ? [] :
            geom.stroke.style === "dash" ? [ w * 5, w ] :
            geom.stroke.style === "dot" ? [ w, w ] :
            geom.stroke.style === "dash-dot" ? [ w * 5, w, w, w ] :
            geom.stroke.style === "dash-dot-dot" ? [ w * 5, w, w, w, w, w ] : [];

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        ctx.setLineDash( seg );
        ctx.stroke();
    }

    if( geom.shape === "polyline" || geom.shape === "curve" ) {
        if( geom.startArrow ) {
            drawArrow( ctx, geom, 0, lineColor, viewParam );
        }

        if( geom.endArrow ) {
            drawArrow( ctx, geom, geom.vertices.length - 1, lineColor, viewParam );
        }
    }
}

/**
 * Draw an arrow
 *
 * @param {Context} ctx The canvas 2d context
 * @param {Geometry} geom - the geometry
 * @param {Number} index - the arrowhead index, either 0 or n-1
 * @param {Color} color - the color
 * @param {ViewParam} viewParam The view param
 */
function drawArrow( ctx, geom, index, color, viewParam ) {
    var arrow = index === 0 ? geom.startArrow : geom.endArrow;
    var style = arrow === true ? "open" : arrow.style;
    if( style !== "none" ) {
        var v0 = geom.vertices[ index === 0 ? 0 : index ];
        var v1 = geom.vertices[ index === 0 ? 1 : index - 1 ];
        var angle = Math.atan2( v1.y - v0.y, v1.x - v0.x );
        var width = arrow.width ? arrow.width :
            !geom.stroke || geom.stroke.width === "mid" ? 8 / viewParam.scale :
            geom.stroke.width === "min" ? 8 : Math.max( 8, 4 * geom.stroke.width );
        var length = arrow.length ? arrow.length :
            style === "open" || style === "closed" || style === "filled" ? 2 * width :
            style === "datum" ? 0.866 * width : width;

        ctx.save();
        ctx.translate( v0.x, v0.y );
        ctx.rotate( angle );
        ctx.scale( length, width );
        ctx.beginPath();
        if( style === "open" || style === "closed" || style === "filled" ) {
            ctx.moveTo( 1, 0.5 );
            ctx.lineTo( 0, 0 );
            ctx.lineTo( 1, -0.5 );
            if( style === "closed" || style === "filled" ) {
                ctx.closePath();
                ctx.fillStyle = style === "closed" ? "white" : color;
                ctx.fill();
            }
        } else if( style === "cross" ) {
            ctx.moveTo( 1, 0.5 );
            ctx.lineTo( -1, -0.5 );
            ctx.moveTo( -1, 0.5 );
            ctx.lineTo( 1, -0.5 );
        } else if( style === "datum" ) {
            ctx.moveTo( 0, 0.5 );
            ctx.lineTo( 1, 0 );
            ctx.lineTo( 0, -0.5 );
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        } else if( style === "circle" || style === "disk" ) {
            ctx.arc( 0.5, 0, 0.5, 0, 2 * Math.PI );
            ctx.fillStyle = style === "circle" ? "white" : color;
            ctx.fill();
        }

        ctx.restore();
        ctx.setLineDash( [] );
        ctx.stroke();
    }
}

/**
 * Calculate the line width in the world coord system
 *
 * @param {Geometry} geom - the geometry
 * @param {ViewParam} viewParam - the view param
 * @returns {Number} line width
 */
function calcLineWidth( geom, viewParam ) {
    var minWidth = 0.5 / viewParam.scale;
    return !geom.stroke ? 2 / viewParam.scale :
        geom.stroke.width === "min" ? minWidth :
        geom.stroke.width === "mid" ? 2 / viewParam.scale :
        Math.max( minWidth, geom.stroke.width );
}

/**
 * Draw content of image or text if exist on geometry
 *
 * @param {Context} ctx The canvas 2d context
 * @param {Geomety} geom - the geometry
 * @param {ViewParam} textParam - the text param
 */
function drawContent( ctx, geom, textParam ) {
    if( geom.fillImage || geom.text ) {
        var rect = markupGeom.getGeomRect( geom );
        var x = rect.left;
        var y = rect.top;

        ctx.save();       
        if( markupGeom.isClosedShape( geom ) ) {
            ctx.clip();
        }

        if( textParam ) {
            if( geom.shape === "polyline" || geom.shape === "curve" ) {
                ctx.translate( rect.left, rect.top );
            } else if( geom.shape === "polygon" || geom.shape === "closed-curve" || geom.shape === "freehand" ) {
                ctx.translate( rect.left + rect.width / 2, rect.top + rect.height / 2 );
            }

            ctx.scale( 1 / textParam.scale, 1 / textParam.scale );
            x = textParam.x;
            y = textParam.y;
            var n = x < 0 && y < 0 ? 0: x < 0 && y > 0 ? 1: x > 0 && y > 0 ? 2 : 3;
            ctx.rotate( -n * angleRight );
            x = geom.shape === "polyline" || geom.shape === "curve" ? 0 : -Math.abs( x );
            y = geom.shape === "polyline" || geom.shape === "curve" ? 0 : -Math.abs( y );
            if( n === 1 || n === 3 ) {
                var t = x;
                x = y;
                y = t;
            }
        }

        if( geom.fillImage ) {
            ctx.drawImage( geom.fillImage, x, y );
        }

        if( geom.text ) {
            drawText( ctx, x, y, geom.text );
        }
        ctx.restore();
    }
}

/**
 * Draw text
 *
 * @param {Context} ctx - The canvas 2d context
 * @param {Number} x - The start coord x
 * @param {Number} y - The start coord y
 * @param {Object} text - The text to be drawn, containing properties:
 *      color: the text color
 *      font: the font including size, style, family
 *      string: the text string, using <br/> for line break
 *      baseLine: "alphabetic|top|hanging|middle|ideographic|bottom"
 *      lineHeight: the line height, i.e. font height + spacing
 *      maxWidth: the maximum width, if any text line exceeds it, scale all to make it fit
 */
function drawText( ctx, x, y, text ) {
    ctx.fillStyle = text.color;
    ctx.font = text.font;
    ctx.textBaseline = text.baseLine;

    var lines = text.string.split( "<br/>" );
    var maxWidth = 0;
    lines.forEach( function( t ) {
        maxWidth = Math.max( maxWidth, ctx.measureText( t ).width );
    } );
    var scale = maxWidth > text.maxWidth ? text.maxWidth / maxWidth : 1.0;

    ctx.translate( x, y );
    ctx.scale( scale, scale );
    lines.forEach( function( t, i ) {
        ctx.fillText( t, 0, text.lineHeight * i );
    } );
}

/**
 * Calculate the GD&T info in screen coordinates
 * 
 * @param {Context} ctx The canvas 2d context
 * @param {String} fillHtml The fill html
 * 
 * @returns {Object} the info e.g. { font: "12px sans-serif", width: 120, height: 20, list: [...] }
 *    where each item in list e.g. { text: "1.23+0.01", width: 40 }
 */
function calcGdntInfo( ctx, fillHtml ) {
    if( ctx && fillHtml ) {
        var tds = fillHtml.match( />[^<]*<\/td>/gu );
        if( tds ) {
            var info = {};
            var font = fillHtml.match( /font:[^;]*;/ );
            info.font = font ? font[0].substring( 5, font[0].length - 1 ) : "12px sans-serif";
            
            var fontSize = info.font.match( /\d+/ );
            info.height = fontSize * 1.3 + 6; // add margin top 2 bottom 2 border 1
            info.width = 1;
            info.list = [];
    
            ctx.font = info.font;
            tds.forEach( function( td ) {
                var t = td.substring( 1, td.length - 5 );
                var w = ctx.measureText( t ).width + 9; // add margin left 4 right 4 border 1
                info.list.push( { text: t, width: w } );
                info.width += w;
            });

            return info;
        }
    }

    return null;
}

/**
 * Draw GD&T 
 * 
 * @param {Context} ctx The canvas 2d context
 * @param {Geometry} geom The geometry
 * @param {String} fillHtml The fill html
 * @param {ViewParam} viewParam The view param
 */
function drawGdnt( ctx, geom, fillHtml, viewParam ) {
    var info = calcGdntInfo( ctx, fillHtml );
    if( info ) {       
        ctx.save();
        ctx.translate( geom.startPt.x, geom.startPt.y );

        var dx = geom.endPt.x - geom.startPt.x;
        var dy = geom.endPt.y - geom.startPt.y;
        var scale = Math.max( Math.abs( dx ), Math.abs( dy ) ) / info.width;
        var n = dx > 0 && dy > 0 ? 0: dx < 0 && dy > 0 ? 1: dx < 0 && dy < 0 ? 2 : 3;

        ctx.scale( scale, scale );
        ctx.rotate( n * angleRight );
        ctx.beginPath();

        ctx.font = info.font;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        var left = 0;
        info.list.forEach( function( td ) {
            if( left > 0 ) {
                ctx.moveTo( left, 0 );
                ctx.lineTo( left, info.height );
            }
            ctx.fillText( td.text, left + 5, 6 );
            left += td.width;
        } );

        ctx.moveTo( 0, 0 );
        ctx.lineTo( info.width, 0 );
        ctx.lineTo( info.width, info.height );
        ctx.lineTo( 0, info.height );
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.moveTo( geom.startPt.x, geom.startPt.y );
        ctx.lineTo( geom.startPt.x, geom.endPt.y );
        ctx.lineTo( geom.endPt.x, geom.endPt.y );
        ctx.lineTo( geom.endPt.x, geom.startPt.y );
        ctx.closePath();
    }
}

/**
 * Clear the current canvas
 *
 * @param {Number} index The canvas index
 */
function clearCanvas( index ) {
    var canvas = currentCanvas;
    var ctx = currentCtx;

    if( index !== currentIndex ) {
        canvas = canvasList[ index ];
        ctx = ( canvas ? canvas.getContext( "2d" ) : null );
    }

    if( ctx && canvas ) {
        ctx.clearRect( 0, 0, canvas.width, canvas.height );
    }
}

/**
 * Clear all the canvas
 */
export function clearAllCanvas() {
    for( var i = 0; i < canvasList.length; i++ ) {
        clearCanvas( i );
    }
}

/**
 * Set the user selection
 *
 * @param {FitPathResult} results the merge results
 */
function setUserSelection( results ) {
    var xmin = Number.MAX_VALUE;
    var xmax = -Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var ymax = -Number.MAX_VALUE;
    var geomList = [];

    for( var i = 0; i < results.length; i++ ) {
        var geomScreen = results[ i ];
        var geomWorld = markupGeom.geomScreenToWorld( geomScreen, vp );
        var bbox = markupGeom.getGeomBbox( geomWorld );

        xmin = Math.min( xmin, bbox.xmin );
        xmax = Math.max( xmax, bbox.xmax );
        ymin = Math.min( ymin, bbox.ymin );
        ymax = Math.max( ymax, bbox.ymax );

        geomList.push( geomWorld );
    }

    userSelection = {
        start: {
            page: currentIndex,
            x: xmin,
            y: ymin
        },
        end: {
            page: currentIndex,
            x: xmax,
            y: ymax
        },
        geometry: {
            list: geomList
        }
    };
}

/**
 * Show the Done, Undo, Redo, Delete buttons
 */
function showButtons() {
    var ownerDoc = viewerContainer.ownerDocument;
    imgDone = ownerDoc.getElementById( "markupImgDone" );
    imgUndo = ownerDoc.getElementById( "markupImgUndo" );
    imgRedo = ownerDoc.getElementById( "markupImgRedo" );
    imgDelete = ownerDoc.getElementById( "markupImgDelete" );

    if( !imgDone || !imgUndo || !imgRedo || !imgDelete ) {
        var isSvg = /^<svg/.test( resources.imgDone );
        imgDone = ownerDoc.createElement( isSvg ? "div" : "img" );
        imgDone.style.width = "32px";
        imgDone.style.height = "32px";
        imgDone.style.visible = "none";
        imgDone.style.position = "absolute";
        imgDone.style.zIndex = "1000";

        imgUndo = imgDone.cloneNode();
        imgRedo = imgDone.cloneNode();
        imgDelete = imgDone.cloneNode();

        imgDone.id = "markupImgDone";
        imgDone.addEventListener( "click", onButtonClick );
        ownerDoc.body.appendChild( imgDone );

        imgUndo.id = "markupImgUndo";
        imgUndo.addEventListener( "click", onButtonClick );
        ownerDoc.body.appendChild( imgUndo );

        imgRedo.id = "markupImgRedo";
        imgRedo.addEventListener( "click", onButtonClick );
        ownerDoc.body.appendChild( imgRedo );

        imgDelete.id = "markupImgDelete";
        imgDelete.addEventListener( "click", onButtonClick );
        ownerDoc.body.appendChild( imgDelete );

        if( isSvg ) {
            imgDone.innerHTML = replaceUseLink( resources.imgDone );
            imgUndo.innerHTML = replaceUseLink( resources.imgUndo );
            imgRedo.innerHTML = replaceUseLink( resources.imgRedo );
            imgDelete.innerHTML = replaceUseLink( resources.imgDelete );
        } else {
            imgDone.src = resources.imgDone;
            imgUndo.src = resources.imgUndo;
            imgRedo.src = resources.imgRedo;
            imgDelete.src = resources.imgDelete;
        }
    }

    var containerRect = viewerContainer.getBoundingClientRect();
    var left = containerRect.left + ( viewerContainer.clientWidth - 224 ) / 2;
    var top = containerRect.top + 32;

    imgDone.style.left = ( left + 192 ) + "px";
    imgDone.style.top = top + "px";
    imgUndo.style.left = ( left + 64 ) + "px";
    imgUndo.style.top = top + "px";
    imgRedo.style.left = ( left + 128 ) + "px";
    imgRedo.style.top = top + "px";
    imgDelete.style.left = left + "px";
    imgDelete.style.top = top + "px";

    var sLen = markupFitPath.getMergeStack().length;
    var sTop = markupFitPath.getMergeStackTop();

    imgDone.style.display = ( 0 <= sTop && sTop < sLen ? "block" : "none" );
    imgUndo.style.display = ( 0 < sTop && sTop < sLen ? "block" : "none" );
    imgRedo.style.display = ( 0 <= sTop && sTop < sLen - 1 ? "block" : "none" );
    imgDelete.style.display = ( 0 <= sTop && sTop < sLen ? "block" : "none" );
}

/**
 * Hide the buttons
 */
function hideButtons() {
    if( imgDone && imgUndo && imgRedo && imgDelete ) {
        imgDone.style.display = "none";
        imgUndo.style.display = "none";
        imgRedo.style.display = "none";
        imgDelete.style.display = "none";
    }
}

/**
 * Button click listener
 *
 * @param {Event} event The event
 */
function onButtonClick( event ) {
    var stack = markupFitPath.getMergeStack();
    var sTop = markupFitPath.getMergeStackTop();
    var target = event.currentTarget;

    if( target === imgDone ) {
        setUserSelection( stack[ sTop ] );
        hideOverlay();

        if( selectionEndCallback ) {
            selectionEndCallback( "freehand" );
        }

        return;
    } else if( target === imgDelete ) {
        markupFitPath.clearMergeStack( true );
    } else if( target === imgUndo ) {
        markupFitPath.setMergeStackTop( sTop - 1 );
    } else if( target === imgRedo ) {
        markupFitPath.setMergeStackTop( sTop + 1 );
    }

    showMergeResults();
}

/**
 * Show existing markups and merge results
 */
function showMergeResults() {
    showCurrentPage();

    if( tool === "freehand" || tool === "shape" ) {
        currentCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
        currentCtx.fillRect( 0, 0, currentCanvas.width, currentCanvas.height );
    }

    var color = markupColor.getMyColor();
    if( tool === "freehand" ) {
        var stack = markupFitPath.getMergeStack();
        var sTop = markupFitPath.getMergeStackTop();

        if( sTop >= 0 && stack.length > 0 ) {
            var results = stack[ sTop ];
            for( var i = 0; i < results.length; i++ ) {
                drawGeom( currentCtx, results[ i ], null, vpScreen, null, color, false );
            }
        }
        showButtons();
    } else if( posGeom ) {
        drawGeom( currentCtx, posGeom, null, vpScreen, null, color, false );
    }
}

/**
 * replace the use link with svg symbol definition
 *
 * @param {String} value The value to be replaced
 *
 * @return {String} The use link in the value is replaced with svg, if any
 */
function replaceUseLink( value ) {
    if( /<use/.test( value ) ) {
        var res = value.match( /#(\w+)/ );
        if( res && res.length > 1 ) {
            var symbol = document.getElementById( res[ 1 ] );
            if( symbol ) {
                return symbol.outerHTML.replace( /symbol/g, "svg" );
            }
        }
    }

    return value;
}

/**
 * Initialize position geometry 
 * @param {Geometry} geom - the geom to be initialized
 * @paran {Number} x - the init x coord to set
 * @paran {Number} y - the init y coord to set
 */
function posGeomInit( x, y ) {
    if( tool === "position" ) {
        var geom = findHitGeom( posMarkup, x, y, vp );
        if( geom ) {
            posGeom = markupGeom.geomWorldToScreen( geom, vp );
            posMode = 1;
        } else {
            geom = findHitGeom( posMarkup, x, y, vp, 30 );
            if( geom && geom.center ) {
                posGeom = markupGeom.geomWorldToScreen( geom, vp );
                posMode = 6;
            }
        }
    } else if( tool === "stamp" ) {
        posGeom = markupGeom.geomWorldToScreen( posMarkup.geometry.list[ 0 ], vpScreen );
        posMode = 1;

        if( posGeom.center ) {
            posGeomMove( x - posGeom.center.x, y - posGeom.center.y );
        } else if( posGeom.vertices ) {
            posGeomMove( x - posGeom.vertices[0].x, y - posGeom.vertices[0].y );
        } else if( posGeom.startPt ) {
            posGeomMove( x - posGeom.startPt.x, y - posGeom.startPt.y );
        }
    } else if( tool === "shape" ) {
        if( subTool === "rectangle" ) {
            posGeom = {
                shape : "rectangle",
                center : { x: x, y: y },
                major: 1,
                minor: 1,
                angle: 0
            };
        } else if( subTool === "ellipse" ) {
            posGeom = {
                shape : "ellipse",
                center : { x: x, y: y },
                major: 1,
                minor: 1,
                angle: 0
            };
        } else if( subTool === "arrow" ) {
            posGeom = {
                shape : "polyline",
                vertices : [ { x: x, y: y }, { x: x + 1, y: y + 1 } ]
            };
        } else if( subTool === "gdnt" ) {
            posGeom = {
                shape : "gdnt",
                startPt : { x: x, y: y },
                endPt: { x: x + 40, y: y + 20 }
            };
        }
        posMode = 1;
    }
    
    oriGeom = JSON.parse( JSON.stringify( posGeom ) );
}

/**
 * Move the postion geometry
 * 
 * @param {Number} dx 
 * @param {Number} dy 
 */
function posGeomMove( dx, dy ) {
    if( posGeom.center ) {
        posGeom.center.x += dx;
        posGeom.center.y += dy;
    } else if( posGeom.vertices ) {
        posGeom.vertices.forEach( function( v ) {
            v.x += dx;
            v.y += dy;
        } );
    } else if( posGeom.startPt && posGeom.endPt ) {
        posGeom.startPt.x += dx;
        posGeom.startPt.y += dy;
        posGeom.endPt.x += dx;
        posGeom.endPt.y += dy;
    }
}

/**
 * Resize the geometry with center only
 * 
 * @param {Number} scale
 */
function posGeomResize( scale )
{
    if( posGeom && posGeom.center ) {
        posGeom.major = oriGeom.major * scale;
        posGeom.minor = oriGeom.minor * scale;
    }
}

/**
 * Rotate the geometry with center only
 * 
 * @param {Number} angle 
 */
function posGeomRotate( angle )
{
    if( posGeom && posGeom.center ) {
        posGeom.angle = oriGeom.angle + angle;
    }
}

/**
 * Adjust the geometry according to the predefined shape 
 * 
 * @param {Number} x0 - the initial x coord
 * @param {Number} y0 - the initial y coord
 * @param {Number} x - the current x coord
 * @param {Number} y - the current y coord 
 */
function posGeomAdjustShape( x0, y0, x, y ) {
    if( posGeom.shape === "rectangle" || posGeom.shape === "ellipse" ) {
        posGeom.center.x = ( x0 + x ) / 2;
        posGeom.center.y = ( y0 + y ) / 2;
        posGeom.major = Math.abs( x0 - x ) / 2;
        posGeom.minor = Math.abs( y0 - y ) / 2;
    } else if( posGeom.shape === "polyline" ) {
        var dx = x - x0;
        var dy = y - y0;
        posGeom.vertices[1].x = x;
        posGeom.vertices[1].y = y;
        posGeom.endArrow = dx * dx + dy * dy >= 400;
    } else if( posGeom.shape === "gdnt" ) {
        posGeom.startPt.x = x;
        posGeom.startPt.y = y;
        posGeom.endPt.x = x + 40;
        posGeom.endPt.y = y + 20;
    }
}

/**
 * Check if the posGeom is valid for the predefined shape
 * 
 * @returns {Boolean} true if valid
 */
function posGeomValidShape() {
    if( posGeom.shape === "rectangle" || posGeom.shape === "ellipse" ) {
        if( posGeom.major >= 5 && posGeom.minor >= 5 ) {
            if( posGeom.major < posGeom.minor ) {
                var t = posGeom.major;
                posGeom.major = posGeom.minor;
                posGeom.minor = t;
                posGeom.angle = angleRight;
            }

            if( posGeom.shape === "ellipse" && 
                Math.abs( posGeom.major - posGeom.minor ) / posGeom.major < 0.05 ) {
                var r = ( posGeom.major + posGeom.minor ) / 2;
                posGeom.shape = "circle";
                posGeom.major = r;
                posGeom.minor = r;
                posGeom.angle = 0;
            }

            return true;
        }
    } else if( posGeom.shape === "polyline" ) {
        return posGeom.endArrow;
    } else if( posGeom.shape === "gdnt" ) {
        return true;
    }

    return false;
}

/**
 * Update the postion markup
 */
function updatePositionMarkup() {
    var dxs = 0;
    var dys = 0;
    var f = 1;
    var da = 0;

    if( posGeom.center ) {
        dxs = posGeom.center.x - oriGeom.center.x;
        dys = posGeom.center.y - oriGeom.center.y;
        f = posGeom.major / oriGeom.major;
        da = posGeom.angle - oriGeom.angle;
    } else if( posGeom.startPt ) {
        dxs = posGeom.startPt.x - oriGeom.startPt.x;
        dys = posGeom.startPt.y - oriGeom.startPt.y;
    } else if( posGeom.vertices ) {
        dxs = posGeom.vertices[0].x - oriGeom.vertices[0].x;
        dys = posGeom.vertices[0].y - oriGeom.vertices[0].y;
    }

    var cos = Math.cos( vp.angle2 );
    var sin = Math.sin( vp.angle2 );
    var dxw = ( dxs * cos + dys * sin ) / vp.scale;
    var dyw = ( - dxs * sin + dys * cos ) / vp.scale;

    var geom = posMarkup.geometry.list[ posIndex ];
    if( geom.center ) {
        geom.center.x += dxw;
        geom.center.y += dyw;
        geom.major *= f;
        geom.minor *= f;
        geom.angle = snapAngle( geom.angle + da );
    } else if( geom.startPt && geom.endPt ) {
        geom.startPt.x += dxw;
        geom.startPt.y += dyw;
        geom.endPt.x += dxw;
        geom.endPt.y += dyw;
    } else if( geom.vertices ) {
        geom.vertices.forEach( function( v ) {
            v.x += dxw;
            v.y += dyw;
        } );

        if( geom.approxPts ) {
            geom.approxPts.forEach( function( v ) {
                v.x += dxw;
                v.y += dyw;
            } );
        }
    }

    adjustStartEnd( posMarkup, geom );

    if( posMarkup.textParam ){
        posMarkup.textParam.scale /= f;
    }

    showCurrentPage();
}

/**
 * Adjust the markup start and end after a geometry is modified
 * 
 * @param {Markup} markup - the markup whose start and end to be adjusted
 * @param {Geometry} geom - the geometry that has been modified
 */
function adjustStartEnd( markup, geom ) {
    if( geom ) {
        geom.bbox = undefined;
        geom.area = undefined;
    }

    markup.start.x = Number.MAX_VALUE;
    markup.start.y = Number.MAX_VALUE;
    markup.end.x = -Number.MAX_VALUE;
    markup.end.y = -Number.MAX_VALUE;

    markup.geometry.list.forEach( function( g ) {
        var bbox = markupGeom.getGeomBbox( g );
        markup.start.x = Math.min( markup.start.x, bbox.xmin );
        markup.start.y = Math.min( markup.start.y, bbox.ymin );
        markup.end.x = Math.max( markup.end.x, bbox.xmax );
        markup.end.y = Math.max( markup.end.y, bbox.ymax );
    } ); 
}

/**
 * Snap the angle to be multiple of PI/2 with tolerance of PI/32
 * @param {Number} angle - the input angle
 * @returns {Number} the output angle
 */
function snapAngle( angle ) {
    var ang = angle > Math.PI ? angle - angle2PI : angle < -Math.PI ? angle + angle2PI : angle;
    return Math.abs( ang ) < angleSnap ? 0 :
           Math.abs( ang - angleRight ) < angleSnap ? angleRight :
           Math.abs( ang + angleRight ) < angleSnap ? -angleRight :
           Math.abs( ang - Math.PI ) < angleSnap ? Math.PI :
           Math.abs( ang + Math.PI ) < angleSnap ? Math.PI : ang;
}

/**
 * Calculate the textParam, i.e. the texture map parameter
 * 
 * @param {Markup} markup - The markup being calculated
 * @param {Number} index - the index of geom 
 * @param {String} html - the html
 * @param {Number} scale - scale from world to screen
 * @param {Number} angle - rotate angle
 * 
 * @returns {Object} textParam with property scale, x, y
 */
function calcTextParam( markup, index, html, scale, angle ) {
    var geom = markup.geometry.list[index];
    var imgSize = getImageSize( html );
    var rect = markupGeom.getGeomRect( geom, imgSize !== null );
    var geomAngle = geom.angle ? geom.angle : 0;
    var n = ( Math.round( ( angle + geomAngle ) / angleRight ) + 16 ) % 4;
    var width = rect.width * scale;
    var height = rect.height * scale;

    if( imgSize ) {
        width = n % 2 === 0 ? imgSize.width : imgSize.height;
        height = n % 2 === 0 ? imgSize.height : imgSize.width;
        scale = Math.min( width / rect.width, height / rect.height );
    } else if( html.indexOf( 'text-align:center' ) > 0 ) {
        var div = document.createElement( "div" );
        document.body.appendChild( div );

        div.style = "font-family:sans-serif,Arial,Verdana;font-size:13px;width:" + 
                    ( n % 2 === 0 ? width : height ) + "px";       
        div.innerHTML = html;
        var h = div.getBoundingClientRect().height;
        document.body.removeChild( div );

        if( n % 2 === 0 && h < height ) {
            height = h;
        } else if( n % 2 === 1 && h < width ) {
            width = h;
        }
    }
    
    return {
        scale: scale,
        x: ( n === 0 || n === 1 ? -width : width ) / 2,
        y: ( n === 0 || n === 3 ? -height : height ) / 2
    };
}

/**
 * Get image size if the HTML contains image only
 * 
 * @param {String } html - the HTML being tested
 * @returns {Size} the image size or null if not matched
 */
function getImageSize( html ) {
    if( html.match( /^<div[^>]*><img [^>]*><\/div>\s*$/ ) ) {
        var w = html.match( /width="[0-9.]+/ )[ 0 ];
        var h = html.match( /height="[0-9.]+/ )[ 0 ];
        var width = Number( w.substring( 7 ) );
        var height = Number( h.substring( 8 ) );
        return { width, height };
    }

    return null;
}

/**
 * Adjust the markup according to image size
 * 
 * @param {Markup} markup - The markup being adjusted
 * @param {Number} index - the index of geom 
 * @param {String} html - the html
 * @param {Number} angle - the rotation angle
 */
function adjustMarkupByImageSize( markup, index, html, angle ) {
    var imgSize = getImageSize( html );
    if( imgSize ) {     
        var geom = markup.geometry.list[ index ];
        if( geom.shape === 'rectangle' || geom.shape === 'ellipse' ) {
            var geomRatio = geom.minor / geom.major;
            var imgRatio = Math.min( imgSize.width, imgSize.height ) / Math.max( imgSize.width, imgSize.height );
            if( Math.abs( geomRatio - imgRatio ) > 0.001 ) {
                geom.minor = geom.major * imgRatio;
                var n = ( Math.round( ( angle + geom.angle ) / angleRight ) + 4 ) % 2;
                if( n === 0 && imgSize.width < imgSize.height ||
                    n === 1 && imgSize.width > imgSize.height ) {
                    geom.angle += geom.angle > 0 ? -angleRight : angleRight;
                } 
                adjustStartEnd( markup, geom );
            }
        }
    }  
}

/**
 * Event handler for stamp drag over
 * @param {Event} ev - the dragover event
 */
function stampDragOver( ev ) {
    if( ev.dataTransfer.types.indexOf( 'text/aw-markup-stamp' ) >= 0 ) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        return false;
    }
}

/**
 * Event handler for stamp drop
 * @param {Event} ev - the drop event
 */
function stampDrop( ev ) { 
    if( ev.dataTransfer.types.indexOf( 'text/aw-markup-stamp' ) >= 0 ) {  
        ev.stopPropagation();
        ev.preventDefault();
        var stampName = ev.dataTransfer.getData( 'text/aw-markup-stamp' );
        var stamp = markupData.findStamp( stampName );
        if( stamp && stamp.geometry.list ) {      
            var x = ev.offsetX;
            var y = ev.offsetY;
            var target = ev.target;

            for ( ; target && target !== ev.currentTarget; target = target.offsetParent ) {
                x += target.offsetLeft;
                y += target.offsetTop;
            }

            var geom = Object.assign( {}, stamp.geometry.list[0] );
            if( geom.center ) {
                geom.center = { x, y };
            } else if ( geom.startPt && geom.endPt ) {
                geom.endPt = { x: x + geom.endPt.x - geom.startPt.x, y: y + geom.endPt.y - geom.startPt.y };
                geom.startPt = { x, y };
            }

            setUserSelection( [ geom ] );
            userSelection.stampName = stampName;
            if( selectionEndCallback ) {
                selectionEndCallback( 'stamp' );
            }
        }
    }
}

//==================================================
// exported functions
//==================================================
let exports;
export let setViewerContainer = function( container ) {
    viewerContainer = container;
};
export let setViewParam = function( viewParam ) {
    vp = viewParam;
};
export let getViewParam = function() {
    return vp;
};
export let setFitViewParam = function( viewParam ) {
    vpFit = viewParam;
};
export let getCurrentIndex = function() {
    return currentIndex;
};
export let getUserSelection = function() {
    return userSelection;
};
export let setSelectionEndCallback = function( callback ) {
    selectionEndCallback = callback;
};
export let setSelectCallback = function( callback ) {
    selectCallback = callback;
};
export let addResource = function( name, value ) {
    resources[ name ] = value;
};

export default exports = {
    init,
    getCanvas,
    setCanvas,
    setCanvasRect,
    setViewerContainer,
    setTool,
    showOverlay,
    hideOverlay,
    show,
    showAll,
    showCurrentPage,
    showAsSelected,
    setViewParam,
    getViewParam,
    setFitViewParam,
    getCurrentIndex,
    pointChangeCallback,
    getUserSelection,
    setSelectionEndCallback,
    setSelectCallback,
    addResource,
    setFillImage,
    clearAllCanvas,
    getFillSize,
    updateGdntSize,
    setPositionMarkup,
    generateRefImage,
    hasRefImage
};
