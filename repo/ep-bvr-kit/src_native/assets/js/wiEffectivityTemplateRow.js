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
 * @module js/wiEffectivityTemplateRow
 */

'use strict';

var exports = {};

var svgns = "http://www.w3.org/2000/svg";
var DIV_ELEMENT = 'div';
var SPAN_ELEMENT = 'span';

var EFFECTIVITY_UNIT_UP = 'UP';

export let createEffectivityRowTemplate = function( rowObject, graphCanvas, rowNameElement ) {
    var rowObjectName = rowObject.props ? rowObject.props.bl_rev_object_name.dbValues[ 0 ] : rowObject.name;
    var rowElement = document.createElement( DIV_ELEMENT );
    rowElement.setAttribute( "id", rowObjectName );
    rowElement.setAttribute( "style", "height: 78px;" );
    var rowName = document.createElement( DIV_ELEMENT );

    rowName.setAttribute( "class", 'aw-epInstructionsEffectivity-rowNameElement' );

    var nameSpan = document.createElement( SPAN_ELEMENT );
    nameSpan.setAttribute( "title", rowObjectName );
    nameSpan.innerHTML = rowObjectName;
    rowName.appendChild( nameSpan );
    if( !rowName ) {
        return;
    }
    if( rowElement !== null) {
        rowNameElement.appendChild( rowName );

        var rowContainer = document.createElement( DIV_ELEMENT );
        if(!rowContainer){
            return;
        }
        rowContainer.setAttribute( "class", "aw-epValidateEffectivity-wiEffectivityRowContainer" );
        if( rowObject.uid ) {
            rowContainer.setAttribute( "id", rowObject.uid );
        }

        var rowSvg = document.createElementNS( svgns, 'svg' );
        rowSvg.setAttributeNS( null, 'class', 'aw-epValidateEffectivity-wiEffectivityObjectRow' );
        rowSvg.setAttributeNS( null, 'width', 0 );
        rowSvg.setAttributeNS( null, 'height', 0 );

        rowContainer.appendChild( rowSvg );

        rowElement.appendChild( rowContainer );
        graphCanvas.appendChild( rowElement );
        var rowObjDiv = {
            container: rowContainer,
            svg: rowSvg
        };
        return rowObjDiv;
    }

};

export let createAndAddRect = function( rowSvg, rowID, unit, checked, fillColor, mouseover, mouseout, onclick ) {
    var rect = document.createElementNS( svgns, 'rect' );
    var length = 20;
    var width = rowSvg.width.baseVal.value;
    rowSvg.width.baseVal.value = width + length;
    rowSvg.height.baseVal.value = length;
    var style = 'fill:' + fillColor + ';stroke-width:1;stroke:rgb(255,255,255)';

    rect.setAttributeNS( null, 'id', rowID + '-' + unit );
    rect.setAttributeNS( null, 'unit', unit );
    rect.setAttributeNS( null, 'checked', checked );
    rect.setAttributeNS( null, 'uid', rowID );
    rect.setAttributeNS( null, 'x', width );
    rect.setAttributeNS( null, 'height', length );
    rect.setAttributeNS( null, 'width', length );
    rect.setAttributeNS( null, 'style', style );

    rect.addEventListener( "mouseover", mouseover );
    rect.addEventListener( "mouseout", mouseout );
    rect.onclick = onclick;

    rowSvg.appendChild( rect );
};

export let createAndAddUpCheckbox = function( rowSvg, rowID, unit, isUP, onclick ) {
    var upCheckbox = document.createElement( DIV_ELEMENT );
    upCheckbox.setAttribute( "class", 'aw-epInstructionsEffectivity-upCheckboxDefault' );
    var parentdiv = document.createElement( DIV_ELEMENT );
    upCheckbox.setAttribute( "id", rowID + '-' + unit );
    parentdiv.setAttribute( "style", "padding: 30px 0 0 16px; height: 48px;" );
    parentdiv.append( upCheckbox );

    upCheckbox.setAttribute( "isUP", isUP );
    if( rowID === "Summary" ) {
        upCheckbox.innerHTML = EFFECTIVITY_UNIT_UP;
    } else {
        upCheckbox.onclick = onclick;
    }
    if( isUP ) {
        upCheckbox.setAttribute( "class", 'aw-epInstructionsEffectivity-upCheckboxSet' );
        upCheckbox.innerHTML = EFFECTIVITY_UNIT_UP;
    }
    rowSvg.appendChild( parentdiv );
};

export default exports = {
    createEffectivityRowTemplate,
    createAndAddRect,
    createAndAddUpCheckbox
};
