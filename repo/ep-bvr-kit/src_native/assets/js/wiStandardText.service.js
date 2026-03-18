// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/wiStandardText.service
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import $ from 'jquery';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import wiEditorService from 'js/wiEditor.service';


'use strict';

export function getStandardTextElementRevisionList( response ) {
    let standardTextElementRevisionList = [];
    setMaxHeightPopup();
    const standardTextSearchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
    if( standardTextSearchResults && isArrayPopulated( standardTextSearchResults.objects ) ) {
        standardTextElementRevisionList = standardTextSearchResults.objects.map( object  => cdm.getObject( object.uid ) );
    }
    return standardTextElementRevisionList;
}

export function addSelectedStandardText( selectedObjects ) {
    if( selectedObjects && selectedObjects.length === 1 ) {
        const stxElementModelObject = cdm.getObject( selectedObjects[ 0 ].uid );
        eventBus.publish( 'wi.closeSearchStandardTextPopup' );
        const selectedObjectInstanceID = appCtxService.getCtx( 'wiEditor.selectedObjectData' ).selectedObjectInstanceID;
        const editorSelectedInstance = wiEditorService.getEditorInstance( selectedObjectInstanceID );

        let stxElementContent = '';
        if( stxElementModelObject && stxElementModelObject.props.epw0mes0WIStrings ) {
            stxElementModelObject.props.epw0mes0WIStrings.uiValues.forEach( mes0WIString =>
                stxElementContent = stxElementContent + '<div>' + mes0WIString + '</div>'
            );
            stxElementContent = '<div><span>&#8203;<stx uid="' + stxElementModelObject.uid + '"><div><b>' + stxElementContent + ' </b></div></stx>&#8203;</span></div>';
            const newElement = wiEditorService.createEditorDomElementFromHTML( stxElementContent, editorSelectedInstance.document );
            editorSelectedInstance.insertElement( newElement );
            editorSelectedInstance.widgets.initOn( newElement, 'stx' );

            let editorCurrentInstanceContent = editorSelectedInstance.getData();
            editorCurrentInstanceContent = editorCurrentInstanceContent.replace( '\\\\', '' );

            editorSelectedInstance.setData(editorCurrentInstanceContent, {
                callback: () => {
                    const range = editorSelectedInstance.createRange();
                    const node = wiEditorService.getEditorDomNodeOfTag('stx', editorSelectedInstance, stxElementModelObject.uid);
                    const topParentDiv = node.getParent().getParent();
                    range.setStart(topParentDiv, 10);
                    editorSelectedInstance.getSelection().selectRanges([range]);
                }
            });

            let dirtyEditors = appCtxService.getCtx( 'wiEditor.dirtyEditor' );
            dirtyEditors[ editorSelectedInstance.name ].data.newlyAddedStxElementsUID.push( stxElementModelObject.uid );
            appCtxService.updatePartialCtx( 'wiEditor.dirtyEditor', dirtyEditors );
        }
    }
}

function setMaxHeightPopup() {
    let standardTextFilterListElement = $( '.aw-epInstructionsEditor-standardTextFilterList' );
    if( standardTextFilterListElement ) {
        standardTextFilterListElement[ 0 ].style.maxHeight = 200 +'px' ;
    }
}

/**
 * isArrayPopulated
 *
 * @param {Object} object array of object
 * @returns {boolean} true if the array is populated
 */
function isArrayPopulated( object ) {
    return object && object.length > 0;
}

/**
 * Update View Model Data
 * @param {Object} data the viewModelData
 * @param {Object} objectToUpdate the object to update in the viewModelData
 * @param {Object} value the value to update
 */
export function updateData( data, objectToUpdate, value ) {
    if( data && objectToUpdate ){
        data[ objectToUpdate ] = value;
    }
}

let exports = {};
export default exports = {
    getStandardTextElementRevisionList,
    addSelectedStandardText,
    updateData
};
