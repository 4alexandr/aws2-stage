// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/awXrtSplitterService
 */
import * as app from 'app';
import AwWindowService from 'js/awWindowService';
import awSplitterSvc from 'js/awSplitterService';
import appCtxSvc from 'js/appCtxService';
import $ from 'jquery';
import ngModule from 'angular';

let exports = {};
var _awSplitterSvc = awSplitterSvc;
var _appCtxSvc = appCtxSvc;
export let name = null;

/**
 * Initialize the underlying splitter service and find the correct sibling columns
 *
 * @param {object} scopeElements - The angularJS scope elements used to define the splitter
 * @param {object} attributes - The angularJS scope attributes defined on the splitter
 */
export let initSplitter = function( scopeElements, attributes ) {
    _awSplitterSvc.initSplitter( scopeElements, attributes );
    var splitter;

    // To handle gwt issues
    if( scopeElements[ 0 ].parentNode.parentNode.classList.contains( 'aw-layout-sashPanel' ) ) {
        splitter = scopeElements[ 0 ].parentNode.parentNode;
    } else {
        splitter = scopeElements[ 0 ];
    }

    var colSplit = $( splitter ).closest( '.aw-xrt-columnContentPanel' );
    if( !colSplit || !colSplit.length ) {
        return;
    }
    colSplit.css( 'min-width', '16px' );
    colSplit.css( 'width', '16px' );
    colSplit.css( 'max-width', '16px' );
    colSplit.css( 'padding', '0px' );
    colSplit.css( 'overflow', 'hidden' );
    colSplit[ 0 ].parentElement.style.flexWrap = 'nowrap';
    colSplit[ 0 ].parentElement.style.height = '100%';
    colSplit[ 0 ].parentElement.parentElement.style.height = '100%';
    var area1 = colSplit[ 0 ].previousElementSibling;
    var area2 = colSplit[ 0 ].nextElementSibling;
    area1.style.minWidth = '0px';
    area2.style.minWidth = '0px';
    splitter.style.height = window.getComputedStyle( colSplit[ 0 ] ).getPropertyValue( 'height' );

    /* On IE, resizing works but does not resize the contents of the panel,
       hence the name parameter is declared as unused */
    if( attributes.name ) {
        exports.name = attributes.name;
        var splitterCtx = _appCtxSvc.getCtx( exports.name + 'Position' );
        if( splitterCtx && splitterCtx.area1 && splitterCtx.area2 ) {
            area1.style.flexGrow = splitterCtx.area1.flexGrow;
            area1.style.flexShrink = splitterCtx.area1.flexShrink;
            area2.style.flexGrow = splitterCtx.area2.flexGrow;
            area2.style.flexShrink = splitterCtx.area2.flexShrink;
        }
    }
    splitter.onmousedown = exports.mouseDownEvent;
    splitter.ontouchstart = exports.mouseDownEvent;
};

/**
 * Mouse Down Event - initialize the active splitter
 *
 * @param {object} event - mouse down event object
 */
export let mouseDownEvent = function( event ) {
    _awSplitterSvc.mouseDownEvent( event );
    var splitter = event.currentTarget;

    var colSplit = $( splitter ).closest( '.aw-xrt-columnContentPanel' );
    if( !colSplit || !colSplit.length ) {
        return;
    }
    var area1 = colSplit[ 0 ].previousElementSibling;
    var area2 = colSplit[ 0 ].nextElementSibling;
    _awSplitterSvc.activeSplitterData.area1 = area1;
    _awSplitterSvc.activeSplitterData.area2 = area2;
    // this is a work-around for pdfviewer & html viewers. They use iframe,
    // which causes the mousemove event to break.
    $( area1 ).css( 'z-index', '0' );
    $( area2 ).css( 'z-index', '0' );

    ngModule.element( AwWindowService.instance ).off( 'mouseup', _awSplitterSvc.mouseUpEventHandler );
    ngModule.element( AwWindowService.instance ).on( 'mouseup', exports.mouseUpEventHandler );
};

/**
 * Mouse Up Event Handler - stop the active splitter
 *
 * @param {event} event - Event object
 */
export let mouseUpEventHandler = function() {
    ngModule.element( AwWindowService.instance ).off( 'mouseup', exports.mouseUpEventHandler );
    var area1 = _awSplitterSvc.activeSplitterData.area1;
    var area2 = _awSplitterSvc.activeSplitterData.area2;
    _awSplitterSvc.mouseUpEventHandler();
    $( area1 ).css( 'z-index', '0' );
    $( area2 ).css( 'z-index', '0' );

    if( exports.name ) {
        var splitterCtx = {
            area1: {
                flexGrow: area1.style.flexGrow,
                flexShrink: area1.style.flexShrink
            },
            area2: {
                flexGrow: area2.style.flexGrow,
                flexShrink: area2.style.flexShrink
            }
        };
        _appCtxSvc.registerCtx( exports.name + 'Position', splitterCtx );
    }
};

export default exports = {
    name,
    initSplitter,
    mouseDownEvent,
    mouseUpEventHandler
};
/**
 * This service wraps the actual awSplitterService, and assigns the columns as the resizable areas. The actual
 * resizing is handled by awSplitterService.
 *
 * @memberof NgServices
 * @member awXrtSplitterService
 */
app.factory( 'awXrtSplitterService', () => exports );
