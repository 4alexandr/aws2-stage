// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/searchPartialAlternativeService
 */

import app from 'app';
import eventBus from 'js/eventBus';
import _appCtxService from 'js/appCtxService';
import _epLoadInputHelper from 'js/epLoadInputHelper';
import _epLoadService from 'js/epLoadService';
import { constants as _epLoadConstants } from 'js/epLoadConstants';
import _messagingService from 'js/messagingService';
import _localeService from 'js/localeService';
import epNavigationService from 'js/epNavigationService';

'use strict';

let exports = {};
const NAVIGATE_TO_NEWTAB = 'newTab';

/**
 * Get alternatives
 */
export function getAllAltList() {
    const altCCs = _appCtxService.getCtx( 'allAltCCsList' );
    return altCCs;
}

/**
 * Open selected alternative in new tab
 * @param  ccUid
 */
export function openAltInNewTab( ccUid ) {
    const currentObject = _appCtxService.getCtx( 'ep.scopeObject' );
    const loadTypeInputs = _epLoadInputHelper.getLoadTypeInputs( _epLoadConstants.OBJ_IN_RELATED_PACKAGE,
        currentObject.uid, '', ccUid );
    _epLoadService.loadObject( loadTypeInputs, false ).then( function( output ) {
        const lineMap = output.relatedObjectsMap;
        for( let key in lineMap ) {
            var lineUid = lineMap[ key ].additionalPropertiesMap2.objectInRelatedPackage[ 0 ];
        }
        eventBus.publish( 'aw.closePopup' );
        epNavigationService.navigateToObject( lineUid, null, NAVIGATE_TO_NEWTAB );
    } );
}

/**
 * Search for the specific alternatives by name
 * @param filterBox
 * @param altCCs
 */
export function filterAltCCList( filterBox, altCCs ) {
    const resource = _localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/AlternativeMessages' );
    let filteredAltCCs = [];
    let altCCNamesMap = {};
    let altCCNames = [];
    altCCs.forEach( function( cc ) {
        const ccName = cc.props.object_string.dbValues[ 0 ];
        altCCNamesMap[ ccName ] = cc;
        altCCNames.push( ccName );
    } );

    const filteredAltNames = altCCNames.filter( function( alt ) {
        return alt.toLowerCase().indexOf( filterBox.toLowerCase() ) >= 0;
    } );

    filteredAltNames.forEach( function( ccName ) {
        filteredAltCCs.push( altCCNamesMap[ ccName ] );
    } );

    if( filteredAltCCs.length === 0 ) {
        _messagingService.showInfo( resource.noSearchResult );
    }
    return filteredAltCCs;
}

export default exports = {
    getAllAltList,
    openAltInNewTab,
    filterAltCCList
};
