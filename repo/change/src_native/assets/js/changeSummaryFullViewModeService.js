// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link changeSummaryFullViewModeService} which manages the full screen for change summary
 *
 * @module js/changeSummaryFullViewModeService
 */
import app from 'app';
import fullModeServ from 'js/fullViewModeService';
import $ from 'jquery';

var exports = {};

/**
 * Swith to Full Screen for Change Summary related information.
 *
 * @function toggleViewerFullScreenModeChangeSummary
 * @memberOf changeSummaryFullViewModeService
 */
export let toggleViewerFullScreenModeChangeSummary = function() {
    fullModeServ.toggleViewerFullScreenMode();
    $( 'aw-sublocation-body' ).find( '.aw-layout-panelSectionTitle' ).removeClass( 'aw-viewerjs-hideContent' );
};

/**
 * Swith to Full Screen for Relation Browser
 *
 * @function toggleViewerFullScreenModeRelationBrowser
 * @memberOf changeSummaryFullViewModeService
 */
export let toggleViewerFullScreenModeRelationBrowser = function() {
    fullModeServ.toggleViewerFullScreenMode();
    $( 'aw-sublocation-body' ).find( '.aw-layout-panelSectionTitle' ).removeClass( 'aw-viewerjs-hideContent' );
    $( 'aw-sublocation-body' ).find( '.aw-layout-panelSectionTitle' ).addClass( 'aw-viewerjs-fullViewActive' );
};

/**
 * The change summary full view mode service
 *
 * @member changeSummaryFullViewModeService
 * @param {fullViewModeService} fullModeServ - Framewrok full mode service
 * @return {Object} Directive's definition object.
 */

export default exports = {
    toggleViewerFullScreenModeChangeSummary,
    toggleViewerFullScreenModeRelationBrowser
};
app.factory( 'changeSummaryFullViewModeService', () => exports );
