// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/epTableCellRenderer
 */

import _t from 'js/splmTableNative';
import eventBus from 'js/eventBus';

'use strict';

/**
 * Creates the Icon container element for tree command cell.
 *
 * @param {String} iconURL path of Icon
 * @param {DOMElement} parentElement containerElement
 *
 * @returns {DOMElement} icon element
 */
export const getIconCellElement = function( iconURL, parentElement ) {
    const cellImgElement = _t.util.createElement( 'img', _t.Const.CLASS_ICON_BASE );
    if ( cellImgElement !== null ) {
        cellImgElement.src = iconURL;
        parentElement.appendChild( cellImgElement );
        return cellImgElement;
    }
    return null;
};

/**
 * Add's Handler to container element for tree command cell.
 *
 * @param {DOMElement} element element on which evnet listener will be added
 * @param {DOMElement} vmo the vmo for the eventdata
 * @param {String} eventName Name of event to publish
 *
 */
export const addClickHandlerToElement = function( element, vmo, eventName ) {
        element.addEventListener( 'click', function( event ) {
        if( vmo.selected ) {
            event.stopImmediatePropagation();
        }
        const eventData = {
            vmo: vmo,
            event:event
        };
            eventBus.publish( eventName, eventData );
        } );
};

let exports;
export default exports = {
    getIconCellElement,
    addClickHandlerToElement
};
