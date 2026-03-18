// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/epGraphicVisibilityTablePropertyRenderer
 * @requires app
 */

import app from 'app';
import epTableCellRenderer from 'js/epTableCellRenderer';

'use strict';

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 *
 */

export const getGraphicVisibilityIndicationRenderer = function( vmo, containerElement ) {
    //Initial case Graphics are hidden
    const iconSource = getIconSource( 'hideGraphics' );
    if( iconSource !== null ) {
        const iconElement = epTableCellRenderer.getIconCellElement( iconSource, containerElement );
        if( iconElement !== null ) {
            epTableCellRenderer.addClickHandlerToElement( iconElement, vmo, 'checkGraphicVisibility' );
            iconElement.classList.add( 'aw-ep-clickableCellIcon' );
        }
    }
};

/**
 * Gets icon image source based on parameters given
 *
 * @return {String} image source
 *
 */

const getIconSource = function( IconType ) {
    let cellImg = app.getBaseUrlPath();
    if( cellImg !== null ) {
        switch ( IconType ) {
            case 'hideGraphics':
                cellImg += '/image/cmdHide16.svg';
                break;
            case 'showGraphics':
                cellImg += '/image/cmdShow16.svg';
            }
    }
    return cellImg;
};

let exports;
export default exports = {
    getGraphicVisibilityIndicationRenderer
};
