// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Module for the Requirement wide panel page that
 * generate awb0ArchetypeRevName Property and attaching image and event listener to it
 *
 * @module propRenderTemplates/generateRmRevisionNameProperty
 * @requires app
 */
import app from 'app';

var exports = {};

/**
 * generate awb0ArchetypeRevName Property and attaching image and event listener to it
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem - The container DOM Element inside which RevNameText and imgage will rendered
 */
export let generateRmArchetypeRevNameRendererFn = function (vmo, containerElem) {
    var revNameObj = null;
    var RevNameText = '';
    if (vmo.props && vmo.props.awb0ArchetypeRevName) {
        revNameObj = vmo.props.awb0ArchetypeRevName;
    }
    if (revNameObj && revNameObj.dbValues && revNameObj.dbValues.length > 0) {
        RevNameText = revNameObj.dbValues[0];
    }
    _renderRevNameIcon(vmo, containerElem, RevNameText);
};

/**
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem -  The container DOM Element inside which RevNameText and imgage will rendered
 * @param {String} RevNameText - RevNameText
 */
var _renderRevNameIcon = function( vmo, containerElem, RevNameText ) {
    var textDiv = document.createElement( 'div' );
    textDiv.className = 'aw-splm-tableCellText';
    textDiv.innerText = RevNameText;
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-base-icon';
    cellImg.style = 'overflow: initial !important;';
    cellImg.src = vmo.typeIconURL;
    containerElem.appendChild( cellImg );
    containerElem.appendChild( textDiv );
};

export default exports = {
    generateRmArchetypeRevNameRendererFn
};
app.factory( 'generateRmRevisionNameProperty', () => exports );
