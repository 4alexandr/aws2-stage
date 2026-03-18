// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpCloneStatusCache from 'js/services/ngpCloneStatusCache';
import ngpCloneSvc from 'js/services/ngpCloneService';

import app from 'app';
import localeSvc from 'js/localeService';

const localizedMessages = localeSvc.getLoadedText( 'NgpCloneMgmtMessages' );
const cloneStatus = 'clonseStatus';
const masterStatus = 'masterStatus';

/**
 * NGP Ui Clone service
 *
 * @module js/services/ngpCloneStatusTableCellService
 */
'use strict';

/**
 *
 * @param {ViewModelObject} vmo - the VMO which represents the row the cell exists it
 * @param {DOMElement} containerElement - DOMElement that should contain the image
 */
export function renderCloneStatusCellImage( vmo, containerElement ) {
    const status = ngpCloneStatusCache.getStatus( vmo.uid );
    let imageUrl;
    let tooltip = localizedMessages.cloneStatusTooltip.format( vmo.modelType.uiDisplayName.capital );
    switch ( status ) {
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE:
        case ngpCloneStatusCache.cloneStatusConstants.CLONE:
            imageUrl = `${app.getBaseUrlPath()}/image/indicatorChipClone24.svg`;
            break;
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE_OUT_OF_DATE:
        case ngpCloneStatusCache.cloneStatusConstants.CLONE_OUT_OF_DATE:
            imageUrl = `${app.getBaseUrlPath()}/image/indicatorChipCloneOutOfDate24.svg`;
            break;
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE_MASTER_DELETED:
        case ngpCloneStatusCache.cloneStatusConstants.CLONE_MASTER_DELETED:
            imageUrl = `${app.getBaseUrlPath()}/image/indicatorChipCloneMissingMaster24.svg`;
            break;
        default:
            break;
    }
    if( imageUrl ) {
        createAndAppendIconCellElement( imageUrl, containerElement, tooltip );
        containerElement.id = `${cloneStatus}${Date.now()}`;
        addCloneClickHandler( containerElement, vmo );
    }
}

/**
 *
 * @param {ViewModelObject} vmo - the VMO which represents the row the cell exists it
 * @param {DOMElement} containerElement - DOMElement that should contain the image
 */
export function renderMasterStatusCellImage( vmo, containerElement ) {
    const status = ngpCloneStatusCache.getStatus( vmo.uid );
    let imageUrl;
    let tooltip = localizedMessages.masterStatusTooltip.format( vmo.modelType.uiDisplayName.capital );
    switch ( status ) {
        case ngpCloneStatusCache.cloneStatusConstants.MASTER:
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE:
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE_MASTER_DELETED:
        case ngpCloneStatusCache.cloneStatusConstants.MASTER_AND_CLONE_OUT_OF_DATE:
            imageUrl = `${app.getBaseUrlPath()}/image/indicatorChipMasterOfClone24.svg`;
            break;
        default:
            break;
    }
    if( imageUrl ) {
        createAndAppendIconCellElement( imageUrl, containerElement, tooltip );
        containerElement.id = `${masterStatus}${Date.now()}`;
        addMasterClickHandler( containerElement, vmo );
    }
}

/**
 *
 * @param {string} imageUrl - the image url path
 * @param {DOMElement} parentElement - the parent element which should contain the cell
 * @param {string} tooltip - the tooltip
 */
export function createAndAppendIconCellElement( imageUrl, parentElement, tooltip ) {
    if( imageUrl ) {
        const cellImage = document.createElement( 'img' );
        cellImage.src = imageUrl;
        cellImage.title = tooltip;
        parentElement.appendChild( cellImage );
    }
}

/**
 *
 * @param {DOMobject} clickableElement - the container element
 * @param {modelObject} modelObject - a given modelObject
 */
function addMasterClickHandler( clickableElement, modelObject ) {
    clickableElement.addEventListener( 'click', () => {
        ngpCloneSvc.displayFindOrNavigateToCloneCmdList( modelObject, clickableElement.id );
    } );
}

/**
 *
 * @param {DOMobject} clickableElement - the container element
 * @param {modelObject} modelObject - a given modelObject
 */
function addCloneClickHandler( clickableElement, modelObject ) {
    clickableElement.addEventListener( 'click', () => {
        ngpCloneSvc.displayCloneCommandsList( modelObject, clickableElement.id );
    } );
}

let exports;
export default exports = {
    renderMasterStatusCellImage,
    renderCloneStatusCellImage
};
