// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmCnTablePropertyRenderer
 */

import app from 'app';
import _t from 'js/splmTableNative';
import cellRendererFactory from'js/awSPLMTableCellRendererFactory';
import mbmTableCellRenderer from 'js/mbmTableCellRenderer';
import appCtxSvc from 'js/appCtxService';
'use strict';
let exports = {};
/**
 *
 * @param {Object} vmo  view model object
 * @param {Element} containerElem prent element
 * @param {String} column column name
 */
export let getChangeNoticeStatusRenderer = function( vmo, containerElem, column ) {
    let currentCNObject = appCtxSvc.getCtx( 'mbmChangeNotice.contextObject' );
    if( vmo.props.mbm0AssociatedActiveCNs.dbValue.indexOf( currentCNObject.uid ) < 0  ) {
        let tooltipOptions = '{alignment : \'RIGHT_CENTER\'}';
        let tooltipViewName = 'mbmChangeNoticeStatusTooltip';
        let contextInfo = {
            vmo:vmo,
            ecnInfo:currentCNObject
        };
        let imgSrc = app.getBaseUrlPath() + '/image/' + 'indicatorWarning16.svg';
        let comElement = mbmTableCellRenderer.getIconCellElement( contextInfo, imgSrc, containerElem, null, tooltipViewName, tooltipOptions );
        if( comElement !== null ) {
            containerElem.appendChild( comElement );
        }
    } else {
        let emptyEle = _t.util.createElement( 'div' );
        containerElem.appendChild( emptyEle );
    }
};

/**
 *
 * @param {Object} vmo  view model object
 * @param {Element} containerElem  parent element
 * @param {String} column column name
 */
export let getChangeNoticeWorkpackageRenderer = function(  vmo, containerElem, column ) {
     //sometimes containerElement doesnot remove previous element ,
    //so need to renove old elemenent if exist and append new element
    let childElems = containerElem.childNodes[0];
    if ( childElems ) {
        containerElem.removeChild( childElems );
    }
    containerElem.classList.add(_t.Const.CLASS_AW_TREE_COMMAND_CELL);
    containerElem.classList.add('aw-mbm-cnTableWorkpackageCell');
    let cellImageContainerElement = _t.util.createElement( 'div', _t.Const.CLASS_GRID_CELL_IMAGE );
    let cellImageElement = _t.util.createElement( 'img', _t.Const.CLASS_ICON_BASE );
    cellImageElement.src = _t.util.getImgURL( vmo );
    cellImageContainerElement.appendChild( cellImageElement );
    containerElem.appendChild( cellImageContainerElement );
    let  textElement = mbmTableCellRenderer.createTitleElement( vmo, column );
    containerElem.appendChild( textElement );

    let commandElement = cellRendererFactory.createCellCommandElement( column, vmo, null, true );
    let scope = _t.util.getElementScope( commandElement );
    scope.anchor = 'mbmCnPopupWpNavigate';
    scope.commandContext = {
    vmo: vmo
    };
    scope.$evalAsync();
    containerElem.appendChild( commandElement );
};

/**
 *
 * @param {Object} vmo  view model object
 * @param {Element} containerElem  parent element
 * @param {String} column column name
 */
export const getColumnTextRenderer = function( vmo, containerElem, column ) {
    let textElement = mbmTableCellRenderer.createTitleElement( vmo, column );
    containerElem.classList.add('aw-mbm-cnTableWorkpackageCell');
    containerElem.appendChild( textElement );
};

export default exports = {
    getChangeNoticeWorkpackageRenderer,
    getChangeNoticeStatusRenderer,
    getColumnTextRenderer
};

app.factory( 'mbmCnTablePropertyRenderer',  function(  ) {
    return exports;
} );
