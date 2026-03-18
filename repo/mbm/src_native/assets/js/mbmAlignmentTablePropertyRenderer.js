// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/mbmAlignmentTablePropertyRenderer
 * @requires app
 */

import app from 'app';
import compUtil from 'js/mbmCompareUtils';
import mbmTableCellRenderer from 'js/mbmTableCellRenderer';
import dataMgmtService from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';

'use strict';

const ICON_ASSIGNED = 'indicatorAssigned16.svg';
const ICON_OVER_ASSIGNED = 'indicatorMultipleAssignmentsError16.svg';
const ICON_PARTIALLY_ASSIGNED = 'indicatorPartiallyAssignedByDescendants16.svg';
const ICON_FULLY_ASSIGNED = 'indicatorFullyAssignedByDescendants16.svg';
const ICON_PARTIAL_QUANTITY_ASSIGNED = 'indicatorPartialQuantityAssigned16.svg';
const ICON_PARTIAL_QUANTITY_ASSIGNED_RED = 'indicatorPartialQuantityAssignedAndOverassigned16.svg';
const ICON_MISMATCH = 'indicatorMismatch16.svg';
const ICON_INNER_MISMATCH = 'indicatorContainsInnerMismatches16.svg';
const ICON_MISSING = 'indicatorMissingInSource16.svg';

const ASSIGNMENT_EBOM_CLICKABLE_STATUS = [ 2, 4, 5, 6, 57, 58, 62, 63, 64,  66 ];
const MISMATCH_MBOM_CLICKABLE_STATUS = [ 2, 6, 58 ];

const configIconSources = {
    assignmentIndication: {
        2: ICON_ASSIGNED,
        4: ICON_ASSIGNED,
        5: ICON_OVER_ASSIGNED,
        6: ICON_OVER_ASSIGNED,
        51: ICON_PARTIALLY_ASSIGNED,
        52: ICON_PARTIALLY_ASSIGNED,
        53: ICON_FULLY_ASSIGNED,
        54: ICON_FULLY_ASSIGNED,
        57: ICON_PARTIAL_QUANTITY_ASSIGNED,
        58: ICON_PARTIAL_QUANTITY_ASSIGNED,
        59: ICON_PARTIAL_QUANTITY_ASSIGNED_RED,
        60: ICON_PARTIAL_QUANTITY_ASSIGNED_RED,
        61: ICON_PARTIAL_QUANTITY_ASSIGNED,
        62: ICON_OVER_ASSIGNED,
        63: ICON_ASSIGNED,
        64: ICON_OVER_ASSIGNED,
        65: ICON_PARTIAL_QUANTITY_ASSIGNED,
        66: ICON_ASSIGNED,
        70: ICON_PARTIAL_QUANTITY_ASSIGNED
    },
    mismatchIndication: {
        2: ICON_MISMATCH,
        6: ICON_MISMATCH,
        52: ICON_INNER_MISMATCH,
        54: ICON_INNER_MISMATCH,
        58: ICON_MISMATCH,
        59: ICON_INNER_MISMATCH,
        61: ICON_INNER_MISMATCH,
        62: ICON_INNER_MISMATCH,
        63: ICON_INNER_MISMATCH,
        70: ICON_INNER_MISMATCH
    },
    mismatchOrMissingIndication: {
        1: ICON_MISSING,
        2: ICON_MISMATCH,
        6: ICON_MISMATCH,
        55: ICON_INNER_MISMATCH,
        58: ICON_MISMATCH,
        63: ICON_INNER_MISMATCH,
        67: ICON_INNER_MISMATCH,
        68: ICON_INNER_MISMATCH,
        69: ICON_INNER_MISMATCH
    }
};
/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 *
 */

export let getAssignmentIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let status = compUtil.getStatus( 'ebomContext', vmo.uid );


    if( configIconSources.assignmentIndication.hasOwnProperty( status ) ) {
        let iconSource = getIconSource( configIconSources, status, columnName );
        let contextObject = {
            vmo: vmo,
            status: status
        };
        if( status === 57 || status === 58 ) {
            let uids = compUtil.findDifferencesFor( 'ebomContext', vmo.uid );
            dataMgmtService.loadObjects( uids ).then( function() {
                let assignedObjets = cdm.getObjects( uids );
                dataMgmtService.getProperties( uids, [ 'awb0Quantity' ] ).then( function() {
                    assignedObjets = cdm.getObjects( uids );
                    let assignedQuantity = 0;
                    for( let i = 0; i < assignedObjets.length; i++ ) {
                        assignedQuantity += isNaN( parseInt( assignedObjets[ i ].props.awb0Quantity.dbValues[ 0 ] ) ) ? 1 : parseInt( assignedObjets[ i ].props.awb0Quantity.dbValues[
                            0 ] );
                    }
                    let quantityInfo = {
                        totalQuantity: isNaN( parseInt( vmo.props.awb0Quantity.dbValues[ 0 ] ) ) ? 1 : parseInt( vmo.props.awb0Quantity.dbValues[ 0 ] ),
                        assignedQuantity: assignedQuantity
                    };
                    contextObject.quantityInfo = quantityInfo;
                    let iconElement = mbmTableCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, 'assignmentTooltip' );
                    if( iconElement !== null ) {
                        mbmTableCellRenderer.addClickHandlerToElement( iconElement, vmo, 'ebomContext', 'mbm.assignmentClickEvent' );
                        iconElement.classList.add( 'aw-mbm-clickableCellIcon' );
                        containerElement.appendChild( iconElement );
                    }
                } );
            } );
        } else {
            let iconElement = mbmTableCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, 'assignmentTooltip' );
            if( iconElement !== null ) {
                if(  ASSIGNMENT_EBOM_CLICKABLE_STATUS.indexOf( status ) > -1 ) {
                    mbmTableCellRenderer.addClickHandlerToElement( iconElement, vmo, 'ebomContext', 'mbm.assignmentClickEvent' );
                    iconElement.classList.add( 'aw-mbm-clickableCellIcon' );
                }
                containerElement.appendChild( iconElement );
            }
        }
    }
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 *
 */
export let getMismatchIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let status = compUtil.getStatus( 'ebomContext', vmo.uid );

    if( configIconSources.mismatchIndication.hasOwnProperty( status ) ) {
        let iconSource = getIconSource( configIconSources, status, columnName );
        let contextObject = {
            vmo: vmo,
            status: status
        };
        let iconElement = mbmTableCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, 'mismatchTooltip' );
        if( iconElement !== null ) {
            containerElement.appendChild( iconElement );
        }
    }
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 *
 */

export let getMismatchOrMissingIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let status = compUtil.getStatus( 'mbomContext', vmo.uid );

    if( configIconSources.mismatchOrMissingIndication.hasOwnProperty( status ) ) {
        let iconSource = getIconSource( configIconSources, status, columnName );
        let contextObject = {
            vmo: vmo,
            status: status
        };
        let iconElement = mbmTableCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, 'missingTooltip' );
        if( iconElement !== null ) {
            if( MISMATCH_MBOM_CLICKABLE_STATUS.indexOf( status ) > -1 ) {
                mbmTableCellRenderer.addClickHandlerToElement( iconElement, vmo, 'mbomContext', 'mbm.mismatchIconClickEvent' );
                iconElement.classList.add( 'aw-mbm-clickableCellIcon' );
            }
            containerElement.appendChild( iconElement );
        }
    }
};

/**
 * Gets icon image source based on parameters given
 *
 * @param {Object} configIconSources has configured image names
 * @param {Integer} status the value returned by compUtil
 * @param {String} columnName the name of the column
 * @return {String} image source
 *
 */

let getIconSource = function( configIconSources, status, columnName ) {
    let imagePath = app.getBaseUrlPath() + '/image/';
    imagePath += configIconSources[ columnName ][ status ];
    return imagePath;
};

export default  {
    getAssignmentIndicationRenderer,
    getMismatchIndicationRenderer,
    getMismatchOrMissingIndicationRenderer
};

