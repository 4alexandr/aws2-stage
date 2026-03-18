// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/wiEffectivitySliderHandler
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import wiEffectivityContainer from 'js/wiEffectivityContainer';


'use strict';

var STATUS_CHECK = "checked";
var MAX_EFFECTIVITY_UNIT_FOR_DISPLAY = 75;



var EffectivitySliderHandler = function( configuration ) {
    this.sliderElement = configuration.sliderElement;
    this.container = configuration.container;
    this.objectId = configuration.objectId;
    this.isLeft = configuration.isLeftSlider;
    this.isUp = configuration.isUp;
    this.refSilderElement = null;
    this.active = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;
    this.position = 0;

    if( this.isUp ) {
        this.unit = MAX_EFFECTIVITY_UNIT_FOR_DISPLAY;
    } else {
        this.unit = 0;
    }

    this.deleted = false;

    if( configuration.minUnit !== null ) {
        this.gap = configuration.minUnit - 1;
    } else {
        this.gap = 0;
    }
};

function setEffectivitySliderHandlerConfiguration( configuration ) {
    var effectivitySliderHandler = new EffectivitySliderHandler( configuration );
    return effectivitySliderHandler;
}

EffectivitySliderHandler.prototype.createSliderEventListners = function() {
    if( this.isUp === true ) {
        return;
    }
    this.container.addEventListener( "touchstart", this.dragStart.bind( this ) );
    this.container.addEventListener( "touchend", this.dragEnd.bind( this ) );
    this.container.addEventListener( "touchmove", this.drag.bind( this ) );

    this.container.addEventListener( "mousedown", this.dragStart.bind( this ) );
    this.container.addEventListener( "mouseup", this.dragEnd.bind( this ) );
    this.container.addEventListener( "mousemove", this.drag.bind( this ), false );
};

EffectivitySliderHandler.prototype.removeEventListeners = function() {
    this.container.removeEventListener( "touchstart", this.dragStart.bind( this ) );
    this.container.removeEventListener( "touchend", this.dragEnd.bind( this ) );
    this.container.removeEventListener( "touchmove", this.drag.bind( this ) );

    this.container.removeEventListener( "mousedown", this.dragStart.bind( this ) );
    this.container.removeEventListener( "mouseup", this.dragEnd.bind( this ) );
    this.container.removeEventListener( "mousemove", this.drag.bind( this ), false );
};

EffectivitySliderHandler.prototype.setRefSilderElement = function( refSilderElement ) {
    this.refSilderElement = refSilderElement;
};

EffectivitySliderHandler.prototype.dragStart = function( e ) {
    if( this.isThisSliderElement( e.target ) ) {
        if( e.type === "touchstart" ) {
            this.initialX = e.touches[ 0 ].clientX - this.xOffset;
            this.initialY = e.touches[ 0 ].clientY - this.yOffset;
        } else {
            this.initialX = e.clientX - this.xOffset;
            this.initialY = e.clientY - this.yOffset;
        }
        this.active = true;
    }
};

EffectivitySliderHandler.prototype.isThisSliderElement = function( target ) {
    return target === this.sliderElement || target.parentNode === this.sliderElement;
};

EffectivitySliderHandler.prototype.dragEnd = function( e ) {
    if( this.active ) {
        this.initialX = this.currentX;
        this.initialY = this.currentY;
        this.active = false;
    }
};

EffectivitySliderHandler.prototype.drag = function( e ) {
    if( this.active && !this.deleted ) {

        e.preventDefault();

        if( e.type === "touchmove" ) {
            this.currentX = e.touches[ 0 ].clientX - this.initialX;
            this.currentY = e.touches[ 0 ].clientY - this.initialY;
        } else {
            this.currentX = e.clientX - this.initialX;
            this.currentY = e.clientY - this.initialY;
        }

        this.xOffset = this.currentX;
        this.yOffset = this.currentY;

        this.currentX = this.currentX - ( this.currentX % 20 );

        setTranslate( this.currentX, 0, this.sliderElement );

        var parentPos = this.sliderElement.parentElement.getBoundingClientRect().left;
        var elmPos = this.sliderElement.getBoundingClientRect().left;
        var pos = elmPos - parentPos;

        pos = Math.round( pos );

        if( parseInt( pos / 20 ) === parseInt( this.position / 20 ) ) {
            return;
        }
        this.position = pos;

        var unit = parseInt( this.position / 20 ) + this.gap;

        var refUnitPos = this.getRefUnitPosition();

        if( this.isLeft ) {
            this.updateStatus( unit + 1 );
        } else {
            this.updateStatus( unit );
        }

        var toBeRemoved = this.checkForRangeRemoval();
        if( toBeRemoved ) {
            this.unit = -1;
            this.refSilderElement.unit = -1;
        }
        wiEffectivityContainer.objectSliderDragEvent( this.objectId );
    }
};

var setTranslate = function( xPos, yPos, el ) {
    el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
};

EffectivitySliderHandler.prototype.getRefUnitPosition = function() {
    return this.refSilderElement.unit;
};

EffectivitySliderHandler.prototype.removeSilderElement = function() {
    this.deleted = true;
    this.refSilderElement.deleted = true;
    this.sliderElement.remove();
};

EffectivitySliderHandler.prototype.updateStatus = function( newUnit ) {
    if( newUnit < 1 ) {
        return;
    }
    if( this.isLeft ) {
        var start = this.unit;
        if( newUnit < start ) {
            start = newUnit;
        }

        this.unit = newUnit;

        for( var i = start; i <= this.refSilderElement.unit; ++i ) {

            var rectElm = document.getElementById( this.objectId + '-' + ( i ).toString() );
            if( i >= newUnit ) {
                rectElm.setAttribute( STATUS_CHECK, true );
            } else {
                rectElm.setAttribute( STATUS_CHECK, false );
            }
        }
        this.unit = newUnit;
    } else {
        var end = this.unit;
        if( newUnit > end ) {
            end = newUnit;
        }

        this.unit = newUnit;

        for( var i = this.refSilderElement.unit; i <= end; ++i ) {
            var rectEle = document.getElementById( this.objectId + '-' + ( i ).toString() );
            if( i <= newUnit ) {
                rectEle.setAttribute( STATUS_CHECK, true );
            } else {
                rectEle.setAttribute( STATUS_CHECK, false );
            }
        }
        this.unit = newUnit;
    }
    wiEffectivityContainer.updateDirtyFlagOfRowObject( this.objectId, true );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, true );
};

EffectivitySliderHandler.prototype.setPosition = function( pos ) {
    if( this.isUp ) {
        return;
    }

    this.position = pos - 20 * ( this.gap );

    this.sliderElement.style.left = this.position.toString() + 'px';

    var unit = parseInt( this.position / 20 );

    if( this.isLeft ) {
        this.unit = unit + 1 + this.gap;
    } else {
        this.unit = unit + this.gap;
    }
};

EffectivitySliderHandler.prototype.getPosition = function() {
    return this.sliderElement.getBoundingClientRect().left;
};

EffectivitySliderHandler.prototype.checkForRangeRemoval = function() {
    var currentSliderElmPos = this.getPosition();
    var refSliderElmPos = this.refSilderElement.getPosition();

    var removeRange = false;
    if( this.isLeft ) {
        removeRange = currentSliderElmPos >= refSliderElmPos;
    } else {
        removeRange = currentSliderElmPos <= refSliderElmPos;
    }
    return removeRange;
};

const exports = {
    setEffectivitySliderHandlerConfiguration
};
export default exports;
