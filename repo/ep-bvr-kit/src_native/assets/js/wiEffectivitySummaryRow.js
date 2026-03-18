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
 * @module js/wiEffectivitySummaryRow
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import effectivityTemplateRow from 'js/wiEffectivityTemplateRow';
import localeService from 'js/localeService';

'use strict';

var STATUS_CHECK = "checked";
var instrMessagePath = '/i18n/InstructionsEffectivityMessages';

var unitWithGapFillColor = '#FEB905';
var unitWithOverlapFillColor = '#DC0000';
var unitWithEffectivityFillColor = '#787878';

var SummaryEffectivity = function( configuration ) {
    this.object = configuration.object;
    this.selectedObjects = configuration.selectedObjects;
    this.layout = configuration.layout;
    this.summaryNameElement = configuration.summaryNameElement;
    this.summaryUpCheckboxElement = configuration.summaryUpCheckboxElement;
    this.minUnit = configuration.minUnit;
    this.maxUnit = configuration.maxUnit;
    this.summarySvg = null;
    this.svgsContainer = null;
    this.summaryUnitList = null;
    this.isUP = configuration.isUP;
};

function createSummaryEffectivity( configuration ) {
    var summaryEffectivity = new SummaryEffectivity( configuration );
    return summaryEffectivity;
}

SummaryEffectivity.prototype.drawSummaryRow = function() {
    if(!this.layout){
        return;
    }
    // Creating row for summary
    var summaryRow = effectivityTemplateRow.createEffectivityRowTemplate( this.object, this.layout, this.summaryNameElement );
    this.summarySvg = summaryRow.svg;
    this.svgsContainer = summaryRow.container;

    // creating units in summary row
    for( var i = this.minUnit; i <= this.maxUnit; ++i ) {
        var id = ( i.toString() );
        effectivityTemplateRow.createAndAddRect( this.summarySvg, this.object.name, id, false, unitWithEffectivityFillColor, this.showToolTip.bind( this ), this.hideToolTip );
    }
    this.svgsContainer.style.width = this.summarySvg.width.baseVal.value.toString() + 'px';

    effectivityTemplateRow.createAndAddUpCheckbox( this.summaryUpCheckboxElement, this.object.name, 'UP', this.isUP );

    // Creating summary unit status list.
    this.createSummaryUnitsStatusList();
};

// This can be shifted to another calculation.js
// e.g : SummaryUnitsStatusList = [0,1,0,2,4,0,1,...]
SummaryEffectivity.prototype.createSummaryUnitsStatusList = function() {
    var self = this;
    this.summaryUnitList = new Array( this.maxUnit ).fill( [] );
    _.forEach( this.selectedObjects, function( object ) {
        for( var j = self.minUnit; j <= self.maxUnit; ++j ) {
            var rectElm = document.getElementById( object.uid + '-' + j.toString() );
            var checked = rectElm.getAttribute( STATUS_CHECK );

            if( checked === 'true' ) {
                if( self.summaryUnitList[ j - 1 ].length === 0 ) {
                    self.summaryUnitList[ j - 1 ] = [ object.props.object_string.dbValues[ 0 ] ];
                } else {
                    self.summaryUnitList[ j - 1 ].push( object.props.object_string.dbValues[ 0 ] );
                }
            }
        }
    } );

    // update status of units in summary row
    this.updateSummaryUnitsStatus();
};

SummaryEffectivity.prototype.updateSummaryUnitsStatus = function() {
    for( var k = this.minUnit - 1; k < this.maxUnit; ++k ) {
        var fillColor = null;
        var rectEle = document.getElementById( this.object.name + '-' + ( k + 1 ).toString() );
        if( this.summaryUnitList[ k ].length === 0 ) {
            fillColor = unitWithGapFillColor;
        } else if( this.summaryUnitList[ k ].length === 1 ) {
            fillColor = unitWithEffectivityFillColor;
        } else {
            fillColor = unitWithOverlapFillColor;
        }
        rectEle.style.fill = fillColor;
    }

    var upCheckbox = document.getElementById( this.object.name + '-UP' );
    if( upCheckbox !== null ) {
        if( this.isUP ) {
            upCheckbox.setAttribute( "class", 'aw-epInstructionsEffectivity-upCheckboxSet' );
        } else {
            upCheckbox.setAttribute( "class", 'aw-epInstructionsEffectivity-upCheckboxDefault' );
        }
    }
};

SummaryEffectivity.prototype.showToolTip = function( event ) {
    var resource = localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    var toolTip = document.getElementById( "wiEffectivityToolTip" );
    var rectElement = event.target;
    var toolTipPosition = rectElement.getBoundingClientRect();
    if( toolTip ) {
        toolTip.style.left = ( toolTipPosition.left - 45 ) + "px";
        toolTip.style.top = ( toolTipPosition.top - 68 ) + "px";
        toolTip.style.display = "block";
        toolTip.style.align = "center";

        // tool tip showing operations as well as units
        var unit = parseInt( rectElement.getAttribute( "unit" ) );
        var summaryItem = this.summaryUnitList[ unit - 1 ];
        if( summaryItem.length > 1 ) {
            var tooltipString = resource.summaryRowOverlapTooltipMessage.format( unit );

            toolTip.innerHTML = tooltipString;
        } else if( summaryItem.length === 0 ) {
            toolTip.innerHTML = resource.summaryRowGapTooltipMessage.format( unit );
        } else {
            toolTip.innerHTML = resource.unitTooltip.format( rectElement.getAttribute( "unit" ) );
        }
    }
};

SummaryEffectivity.prototype.hideToolTip = function( event ) {
    var toolTip = document.getElementById( "wiEffectivityToolTip" );
    if( toolTip ) {
        toolTip.style.display = "none";
    }
};

const exports = {
    createSummaryEffectivity
};
export default exports;

