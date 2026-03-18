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
 * @module js/wiEffectivityRow
 */
import $ from 'jquery';
import app from 'app';
import appCtxService from 'js/appCtxService';
import effectivityTemplateRow from 'js/wiEffectivityTemplateRow';
import effectivitySliders from 'js/wiEffectivitySlider';
import localeService from  'js/localeService';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import wiEffectivityContainer from 'js/wiEffectivityContainer';

'use strict';

var STATUS_CHECK = "checked";

var MAX_EFFECTIVITY_UNIT = 888888;

var defaultUnitFillColor = '#CCCCCC';
var unitWithEffectivityFillColor = '#787878';
var instrMessagePath = '/i18n/InstructionsEffectivityMessages';
var UP = 'UP';
var RANGE = 'range';
var UNIT = 'unit';
var DIV = 'div';
var CLASS = 'class';
var IS_UP = 'isUP';
var TRUE = 'true';
var FALSE = 'false';
var BLOCK = 'block';
var NONE = 'none';
var WI_EFFECTIVITY_SLIDER_DIV = 'aw-epValidateEffectivity-wiEffectivitySliderDiv';
var UP_CHECKBOX_DEFAULT = 'aw-epInstructionsEffectivity-upCheckboxDefault';
var UP_CHECKBOX_SET = 'aw-epInstructionsEffectivity-upCheckboxSet';
var WI_EFFECTIVITY_TOOLTIP = 'wiEffectivityToolTip';
var PX = 'px';
var CENTER = 'center';
var UID = 'uid';

var ObjectEffectivity = function( configuration ) {
    this.object = configuration.object;
    this.layout = configuration.layout;
    this.operationNameElement = configuration.operationNameElement;
    this.operationUpCheckboxElement = configuration.operationUpCheckboxElement;
    this.maxUnit = configuration.maxUnit;
    this.minUnit = configuration.minUnit;
    this.effectivityRanges = configuration.effectivityRanges;
    this.effectivityObj = configuration.effectivityObj;
    this.isUP = configuration.isUP;
    this.objectSvg = null;
    this.svgsContainer = null;
    this.sliderContainer = null;
    this.sliders = [];
    this.effectivityString = null;
};

function createObjectEffectivity( configuration ) {
    var objectEffectivity = new ObjectEffectivity( configuration );
    return objectEffectivity;
}

ObjectEffectivity.prototype.drawUnitEffectivityRow = function() {
    if(!this.layout){
        return;
    }
    // Creating row for selected object
    var rowObjectDiv = effectivityTemplateRow.createEffectivityRowTemplate( this.object, this.layout, this.operationNameElement );
    this.objectSvg = rowObjectDiv.svg;
    this.svgsContainer = rowObjectDiv.container;

    // creating units in object row
    for( var i = this.minUnit; i <= this.maxUnit; ++i ) {
        var id = ( i.toString() );
        effectivityTemplateRow.createAndAddRect( this.objectSvg, this.object.uid, id, false, defaultUnitFillColor, this.showToolTip, this.hideToolTip, this.onUnitClick.bind( this ) );
    }

    effectivityTemplateRow.createAndAddUpCheckbox( this.operationUpCheckboxElement, this.object.uid, UP, this.isUP, this.onUpClick.bind( this ) );

    // update status of units in object row
    this.updateObjectUnitsStatus( this.minUnit, this.maxUnit );

    // Displaying unit ranges of object

    if( this.effectivityRanges.length > 0 && this.sliderContainer === null ) {
        this.sliderContainer = document.createElement( DIV );
        this.sliderContainer.setAttribute( CLASS, WI_EFFECTIVITY_SLIDER_DIV );
        this.svgsContainer.appendChild( this.sliderContainer );
        this.sliderContainer.style.display = NONE;
    }

    for( var j = 0; j < this.effectivityRanges.length; ++j ) {
        this.displayObjectUnitRanges( this.effectivityRanges[ j ] );
    }

    this.mergeRanges();
};

ObjectEffectivity.prototype.setTooltipString = function() {
    this.effectivityString = '';
    for( var j = 0; j < this.effectivityRanges.length; ++j ) {
        this.effectivityString += this.effectivityRanges[ j ].start.toString();
        if( this.effectivityRanges[ j ].end === MAX_EFFECTIVITY_UNIT ) {
            this.effectivityString += '-' + UP;
        } else if( this.effectivityRanges[ j ].start === this.effectivityRanges[ j ].end ) {
            //for single unit
        } else {
            this.effectivityString += '-' + this.effectivityRanges[ j ].end.toString();
        }

        if( j !== this.effectivityRanges.length - 1 ) {
            this.effectivityString += ', ';
        }
    }
    if( this.svgsContainer ) {
        this.svgsContainer.setAttribute( RANGE, this.effectivityString );
    }
};

ObjectEffectivity.prototype.updateObjectUnitsStatus = function( startUnit, unitEffectivityLength ) {
    for( var i = startUnit; i <= unitEffectivityLength; ++i ) {
        var rectElm = document.getElementById( this.object.uid + '-' + i.toString() );

        if( rectElm !== null ) {
            var checked = rectElm.getAttribute( STATUS_CHECK );
            if( checked === TRUE ) {
                rectElm.style.fill = unitWithEffectivityFillColor;
            } else {
                rectElm.style.fill = defaultUnitFillColor;
            }
        }
    }
};

ObjectEffectivity.prototype.displayObjectUnitRanges = function( effectivityRange ) {
    var effectivityEndRange = effectivityRange.end === MAX_EFFECTIVITY_UNIT ? this.maxUnit : effectivityRange.end;
    for( var k = effectivityRange.start; k <= effectivityEndRange; ++k ) {
        var rectEle = document.getElementById( this.object.uid + '-' + k.toString() );
        rectEle.style.fill = unitWithEffectivityFillColor;
        rectEle.setAttribute( STATUS_CHECK, true );
    }

    //Adding sliders
    var sliderConfiguration = {};
    sliderConfiguration.range = effectivityRange;
    sliderConfiguration.container = this.sliderContainer;
    sliderConfiguration.object = this.object;
    sliderConfiguration.minUnit = this.minUnit;
    var effectivitySlider = effectivitySliders.setEffectivitySliderConfiguration( sliderConfiguration );
    effectivitySlider.drawUnitEffectivitySliders();
    this.sliders.push( effectivitySlider );
    this.svgsContainer.style.width = this.objectSvg.width.baseVal.value.toString() + PX;

    this.sliderContainer.parentElement.addEventListener( "mouseover", this.onMouseOver.bind( this ) );
    this.sliderContainer.parentElement.addEventListener( "mouseout", this.onMouseOut.bind( this ) );

};

// on mouseover
ObjectEffectivity.prototype.onMouseOver = function( event ) {
    // Sliders are visible only when UP checkbox uncheked.
    if( this.isUP === false && this.sliderContainer.style.display === NONE ) {
        this.sliderContainer.style.display = BLOCK;
    }
};

// on mouseout
ObjectEffectivity.prototype.onMouseOut = function( event ) {
    // Sliders are visible only when UP checkbox uncheked.
    if( this.isUP === false && this.sliderContainer.style.display === BLOCK ) {
        this.sliderContainer.style.display = NONE;
    }
};

// On click event listner
ObjectEffectivity.prototype.onUnitClick = function( event ) {
    // User can click only when UP checkbox uncheked.
    if( this.isUP ) {
        return;
    }

    var rectElm = event.target;
    var unitId = rectElm.getAttribute( UNIT );
    var unit = parseInt( unitId );
    var checked = rectElm.getAttribute( STATUS_CHECK );
    if( checked === TRUE ) {
        rectElm.setAttribute( STATUS_CHECK, false );
        this.addAndRemoveObjectSliders( unit );
    } else {
        rectElm.setAttribute( STATUS_CHECK, true );
        this.addSlider( unit, unit );
    }
    this.objectSliderEventHandler();
    this.updateObjectUnitsStatus( unit, unit );
    wiEffectivityContainer.summaryRowUpdate();
    wiEffectivityContainer.updateDirtyFlagOfRowObject( this.object.uid, true );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, true );
};

// on up click
ObjectEffectivity.prototype.onUpClick = function( event ) {

    var upCheckbox = event.target;
    if( upCheckbox !== null ) {
        var isUp = upCheckbox.getAttribute( IS_UP );
        if( isUp === TRUE ) {
            upCheckbox.setAttribute( IS_UP, FALSE );
            upCheckbox.setAttribute( CLASS, UP_CHECKBOX_DEFAULT );
            upCheckbox.innerHTML = "";
            this.removeEffectivityUp();
            this.isUP = false;
        } else {
            upCheckbox.setAttribute( IS_UP, TRUE );
            upCheckbox.setAttribute( CLASS, UP_CHECKBOX_SET );
            upCheckbox.innerHTML = UP;
            this.setEffectivityUp();
            this.isUP = true;
        }
    }
    wiEffectivityContainer.summaryRowUpdate();
    wiEffectivityContainer.updateDirtyFlagOfRowObject( this.object.uid, true );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, true );
};

// Add and remove sliders when single unit is selected
ObjectEffectivity.prototype.addAndRemoveObjectSliders = function( unit ) {
    var newSlider = null;
    for( var i = 0; i < this.sliders.length; ++i ) {
        if( this.sliders[ i ].isUnitPresent( unit ) ) {
            newSlider = this.sliders[ i ];
            break;
        }
    }
    if( newSlider !== null ) {
        var sliderRange = newSlider.getSliderRange();
        this.addSlider( sliderRange.start, unit - 1 );
        this.addSlider( unit + 1, sliderRange.end );
        this.removeSlider( newSlider );
    }
};

ObjectEffectivity.prototype.addSlider = function( start, end ) {
    if( start <= end ) {
        var newEffectivityRange = {
            start: start,
            end: end
        };
        this.displayObjectUnitRanges( newEffectivityRange );
    }
};

ObjectEffectivity.prototype.removeSlider = function( slider ) {
    slider.removeSliders();
    var sliderIndex = this.sliders.indexOf( slider );
    if( sliderIndex > -1 ) {
        this.sliders.splice( sliderIndex, 1 );
    }
};

ObjectEffectivity.prototype.setEffectivityUp = function() {
    var lastRange = this.effectivityRanges[ this.effectivityRanges.length - 1 ];
    for( var j = 0; j < this.sliders.length; ++j ) {
        var range = this.sliders[ j ].getSliderRange();
        if( lastRange.start === range.start ) {
            this.removeSlider( this.sliders[ j ] );
            this.addSlider( range.start, MAX_EFFECTIVITY_UNIT );
        }
    }
    this.mergeRanges();
};

ObjectEffectivity.prototype.removeEffectivityUp = function() {
    for( var j = 0; j < this.sliders.length; ++j ) {
        var range = this.sliders[ j ].getSliderRange();
        if( range.end === MAX_EFFECTIVITY_UNIT ) {
            this.removeSlider( this.sliders[ j ] );
            this.addSlider( range.start, this.maxUnit );
        }
    }

    this.mergeRanges();
};

ObjectEffectivity.prototype.updateRanges = function() {

    this.effectivityRanges = [];

    for( var j = 0; j < this.sliders.length; ++j ) {
        var range = this.sliders[ j ].getSliderRange();

        //Check if range is valid
        if( range.start !== -1 || range.end !== -1 ) {
            this.effectivityRanges.push( range );
        }
    }

    this.effectivityRanges.sort( function( a, b ) {
        if( a.start < b.start ) {
            return -1;
        } else {
            return 1;
        }
    } );

};

// Remove invalid ranges and sliders e.g. start=-1, end=-1
ObjectEffectivity.prototype.removeInvalidRanges = function() {
    var sliderToBeRemoved = null;
    for( var i = 0; i < this.sliders.length; ++i ) {
        var range = this.sliders[ i ].getSliderRange();

        //Check if range is valid
        if( range.start === -1 || range.end === -1 ) {
            sliderToBeRemoved = this.sliders[ i ];
        }
    }
    if( sliderToBeRemoved !== null ) {
        this.removeSlider( sliderToBeRemoved );
    }

    this.updateObjectUnitsStatus( this.minUnit, this.maxUnit );
    this.updateRanges();
    this.setTooltipString();
};

// merge of ranges and sliders
ObjectEffectivity.prototype.mergeRanges = function() {
    var continueMerge = false;
    var startSlider = null;
    var endSlider = null;
    var startSliderRange = null;
    var endSliderRange = null;
    for( var i = 0; i < this.sliders.length; ++i ) {
        var sliderRange1 = this.sliders[ i ].getSliderRange();

        var breakLoop = false;
        for( var j = i + 1; j < this.sliders.length; ++j ) {
            var sliderRange2 = this.sliders[ j ].getSliderRange();
            if( ( sliderRange2.start - sliderRange1.end === 1 ) ) {
                startSlider = this.sliders[ i ];
                endSlider = this.sliders[ j ];
                startSliderRange = sliderRange1;
                endSliderRange = sliderRange2;
                breakLoop = true;
                break;
            } else if( sliderRange1.start - sliderRange2.end === 1 ) {
                startSlider = this.sliders[ i ];
                endSlider = this.sliders[ j ];
                startSliderRange = sliderRange2;
                endSliderRange = sliderRange1;
                breakLoop = true;
                break;
            }
        }

        if( breakLoop ) {
            break;
        }
    }
    if( startSlider !== null && endSlider !== null && startSlider !== endSlider ) {
        this.removeSlider( startSlider );
        this.removeSlider( endSlider );
        this.addSlider( startSliderRange.start, endSliderRange.end );
        continueMerge = true;
    }

    this.updateObjectUnitsStatus( this.minUnit, this.maxUnit );
    this.updateRanges();
    this.setTooltipString();

    if( continueMerge ) {
        this.mergeRanges();
    }
};

// Handle all cases when slider is moved or new slider is added.
ObjectEffectivity.prototype.objectSliderEventHandler = function() {
    this.mergeRanges();
    this.removeInvalidRanges();
};

ObjectEffectivity.prototype.showToolTip = function( event ) {
    var resource = localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    var toolTip = document.getElementById( WI_EFFECTIVITY_TOOLTIP );
    var rectElement = event.target;
    var toolTipPosition = rectElement.getBoundingClientRect();
    if( toolTip ) {
        toolTip.style.left = ( toolTipPosition.left -45 ) + PX;
        toolTip.style.top = ( toolTipPosition.top -68) + PX;
        toolTip.style.display = BLOCK;
        toolTip.style.align = CENTER;

        var checked = rectElement.getAttribute( STATUS_CHECK );
        if( checked === TRUE ) {
            var objectUid = rectElement.getAttribute( UID );

            var rowContainerElement = document.getElementById( objectUid );
            var range = rowContainerElement.getAttribute( RANGE );
            toolTip.innerHTML = resource.unitTooltip.format( rectElement.getAttribute( "unit" ) ) + ' |  ' +
                resource.effectivityRangeTooltip.format( range );
        } else {
            toolTip.innerHTML = resource.unitTooltip.format( rectElement.getAttribute( UNIT ) );
        }
    }
};

ObjectEffectivity.prototype.hideToolTip = function( event ) {
    var toolTip = document.getElementById( WI_EFFECTIVITY_TOOLTIP );
    if( toolTip ) {
        toolTip.style.display = NONE;
    }
};
const exports ={
    createObjectEffectivity
};

export default exports;

