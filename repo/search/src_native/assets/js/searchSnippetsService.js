//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/searchSnippetsService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import highlighterSvc from 'js/highlighterService';

/**
 * @param {ViewModelObject|ViewModelObjectArray} vmos - ViewModelObject(s) to modify.
 */
export let addSnippetsToVMO = function( vmos ) {
    var searchResponseInfo = appCtxSvc.getCtx( 'searchResponseInfo' );
    _.forEach( vmos, function( vmo ) {
        if ( vmo && searchResponseInfo && searchResponseInfo.searchSnippets && searchResponseInfo.searchSnippets[vmo.uid] ) {
            if ( !vmo.snippets ) {
                vmo.snippets = searchResponseInfo.searchSnippets[vmo.uid];
            }
        }
    } );
};

/**
 * Get search snippets
 *
 * @function getSearchSnippets
 * @param {Object} data - declViewModel
 */
export let getSearchSnippets = function( data ) {
    let searchSnippets = {};
    let keywords = [];
    if( data.additionalSearchInfoMap !== undefined ) {
        let ss = data.additionalSearchInfoMap.searchSnippets;
        if( ss && ss.length > 0 ) {
            _.forEach( ss, function( ssEach ) {
                let segments = ssEach.split( '\\' );
                if( segments && segments.length > 1 ) {
                    let uid = segments[0];
                    let snippetText = segments[1];

                    snippetText = snippetText.replace( /<em>(.*?)<\/em>/g, function( match, keyword ) {
                        keywords = _.union( keywords, [ keyword ] );
                        return keyword;
                    } );
                    searchSnippets[ uid ] = snippetText;
                }
            } );
        }
        if( keywords.length > 0 ) {
            data.additionalSearchInfoMap.searchTermsToHighlight = _.union( keywords, data.additionalSearchInfoMap.searchTermsToHighlight );
        }
        highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
    }
    return searchSnippets;
};

const exports = {
    getSearchSnippets,
    addSnippetsToVMO
};
export default exports;

app.factory( 'searchSnippetsService', () => exports );
