// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the ckeditor operation to dispatch ckeditor4 or ckeditor5
 *
 * @module js/ckeditorOperations
 */

/*global
 */

import AwPromiseService from 'js/awPromiseService';

'use strict';

var operation = null;

/**
 * Initializ the module, set the current operation
 *
 * @param {String} ckeditorType ckeditor4 or ckeditor5
 */
export async function init( ckeditorType ) {
    if( ckeditorType === 'CKEDITOR_5' ) {
        operation = await import( 'js/ckEditor5Utils' );
    } else {
        operation = await import( 'js/ckEditorUtils' );
    }
}

export let getOperation = function( ) {
    return operation;
};

export let setOperation = function( utilOperation ) {
    return operation = utilOperation;
};

let exports;

export let setCKEditorContent = function( id, content, ctx ) {
    operation && operation.setCKEditorContent( id, content, ctx );
};

export let getCKEditorContent = function( id, ctx ) {
    return operation.getCKEditorContent( id, ctx );
};

export let checkCKEditorDirty = function( id, ctx ) {
    return operation && operation.checkCKEditorDirty( id, ctx );
};

export let setCkeditorDirtyFlag = function( id, ctx, flagForClose ) {
    return operation && operation.setCkeditorDirtyFlag( id, ctx, flagForClose );
};

export let insertImage = function( id, imageURL, img_id, ctx ) {
    operation && operation.insertImage( id, imageURL, img_id, ctx );
};

export let insertOLE = function( id, ole_id, thumbnailURL, fileName, type, ctx ) {
    operation && operation.insertOLE( id, ole_id, thumbnailURL, fileName, type, ctx );
};

export let setCkeditorChangeHandler = function( id, clickHandler, ctx ) {
    operation && operation.setCkeditorChangeHandler( id, clickHandler, ctx );
};

export let getCKEditorInstance = function( id, ctx ) {
    return operation.getCKEditorInstance( id, ctx );
};

export let getElementById = function( ckeditorId, elementId ) {
    return operation.getElementById( ckeditorId, elementId );
};

export let setCKEditorContentAsync = function( id, content, ctx ) {
    return operation.setCKEditorContentAsync( id, content, ctx );
};

export let clearQualityHighlighting = function( id, ctx ) {
    operation && operation.clearQualityHighlighting( id, ctx );
};

export let getWidgetData = function( id, ctx, data ) {
    if( operation ) {
        return operation.getWidgetData( id, ctx, data );
    }
};

export let getWidePanelWidgetData = function( id, ctx ) {
    if( operation ) {
        return operation.getWidePanelWidgetData( id, ctx );
    }
};

export let getAllWidgetData = function( id, ctx ) {
    return operation.getAllWidgetData( id, ctx );
};
export let setCkeditorUndoHandler = function( id, undoHandler, ctx ) {
    operation && operation.setCkeditorUndoHandler( id, undoHandler, ctx );
};

export let scrollCKEditorToGivenObject = function( id, objectUid, ctx ) {
    operation && operation.scrollCKEditorToGivenObject( id, objectUid, ctx );
};

export let resetUndo = function( id, ctx ) {
    operation && operation.resetUndo( id, ctx );
};

export let isObjectVisibleInEditor = function( id, objId, ctx ) {
    return operation && operation.isObjectVisibleInEditor( id, objId, ctx );
};

export let getPropertiesFromEditor = function( id, objId ) {
    return operation.getPropertiesFromEditor( id, objId );
};

export let updateObjectProperties = function( id, objId, updatedProperties, data ) {
    operation.updateObjectProperties( id, objId, updatedProperties, data );
};

export let setCKEditorSafeTemplate = function( id, template, templateMap, ctx ) {
    operation && operation.setCKEditorSafeTemplate( id, template, templateMap, ctx );
};

export let updateHtmlDivs = function( id, updatedObjects, updatedContents, ctx ) {
        operation && operation.updateHtmlDivs( id, updatedObjects, updatedContents, ctx );
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    operation && operation.makeRequirementEditable( ctx );
};

export let getObjHtmlTemplate = function( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText ) {
    return operation && operation.getObjHtmlTemplate( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText );
};

export let getRequirementContent = function( data ) {
    return operation && operation.getRequirementContent( data );
};

export let getRequirementHeader = function( data ) {
    return operation && operation.getRequirementHeader( data );
};

export let updateCKEditorInstance = function( qualityShown, calculateInProcess ) {
    operation && operation.updateCKEditorInstance( qualityShown, calculateInProcess );
};

export let showReqQualityData = function( data, _reConnecting ) {
    operation && operation.showReqQualityData( data, _reConnecting );
};

export let qualityRuleSelected = function( selectedRule ) {
    operation && operation.qualityRuleSelected( selectedRule );
};

export let clearHighlighting = function( ) {
    operation && operation.clearHighlighting( );
};

export let processAfterResponse = function( response ) {
    operation && operation.processAfterResponse( response );
};

export let downloadReqQualityReport = function( data ) {
    return operation && operation.downloadReqQualityReport( data );
};

export let getAllWidgets = function( data ) {
    return operation && operation.getAllWidgets( data );
};

export let getSelectedReqDiv = function( id, changeEvent, ctx ) {
    return operation && operation.getSelectedReqDiv( id, changeEvent, ctx );
};

export let setSelectedReqDivData = function( id, reqDiv, reqRev, widget, input, ctx ) {
    operation && operation.setSelectedReqDivData( id, reqDiv, reqRev, widget, input, ctx );
};

export let insertCrossReferenceLink = function( id, reqObjectID, revID, name, iconURL, ctx ) {
    operation && operation.insertCrossReferenceLink( id, reqObjectID, revID, name, iconURL, ctx );
};

export let navigateToObject = function( crossRefLinkElement, id, ctx ) {
    operation && operation.navigateToCrossReferencedObject( crossRefLinkElement, id, ctx );
};

export let renderComment = function( newMarkup, markupList, allMarkups ) {
    operation && operation.renderComment( newMarkup, markupList, allMarkups );
};

export let highlightComments = function( reqMarkupCtx ) {
    operation && operation.highlightComments( reqMarkupCtx );
};

export let removeMarkupSpans = function( widgetsToSave ) {
    operation && operation.removeMarkupSpans( widgetsToSave );
};

export let handleMarkupDeleted = function( eventData ) {
    operation && operation.handleMarkupDeleted( eventData );
};

export let setViewerContainer = function( viewerContainer ) {
    operation && operation.setViewerContainer( viewerContainer );
};

export let recalculateMarkups = function(  ) {
    operation && operation.recalculateMarkups( );
};

export let getMarkupTextInstance = function(  ) {
    return operation && operation.getMarkupTextInstance( );
};

export let showPanelforComments = function( ) {
    operation && operation.showPanelforComments( );
};

export let saveCommentEdit = function( data ) {
    operation && operation.saveCommentEdit( data );
};

export let endCommentEdit = function( data ) {
    operation && operation.endCommentEdit( data );
};

export let initializationForComments = function() {
    operation && operation.initializationForComments();
};

export let markupSelected = function( eventData ) {
    operation && operation.markupSelected( eventData );
};

export let deleteMarkup = function( ) {
    operation && operation.deleteMarkup( );
};

export let getStatusComments = function( markup ) {
    return operation && operation.getStatusComments( markup );
};

/**
 * Function to get string representation of the markups
 * @return {String} the markups string
 */
export function stringifyMarkups() {
    return operation && operation.stringifyMarkups();
}

/**
 * Update initial data in map
 *
 *  @param {Object} htmlContent - html Content
 */
export let updateOriginalContentsMap = function( htmlContent ) {
    operation && operation.updateOriginalContentsMap &&
    operation.updateOriginalContentsMap( htmlContent );
};


/**
 * Service for ckEditorUtils.
 *
 * @member ckeditorOperations
 */
export default exports = {
    init,
    getOperation,
    setOperation,
    setCKEditorContent,
    getCKEditorContent,
    checkCKEditorDirty,
    setCkeditorDirtyFlag,
    insertImage,
    insertOLE,
    setCkeditorChangeHandler,
    getCKEditorInstance,
    getElementById,
    setCKEditorContentAsync,
    clearQualityHighlighting,
    getWidgetData,
    getWidePanelWidgetData,
    setCkeditorUndoHandler,
    scrollCKEditorToGivenObject,
    resetUndo,
    isObjectVisibleInEditor,
    getPropertiesFromEditor,
    updateObjectProperties,
    setCKEditorSafeTemplate,
    updateHtmlDivs,
    getRequirementContent,
    getRequirementHeader,
    updateCKEditorInstance,
    showReqQualityData,
    qualityRuleSelected,
    clearHighlighting,
    processAfterResponse,
    downloadReqQualityReport,
    getAllWidgets,
    getObjHtmlTemplate,
    getAllWidgetData,
    getSelectedReqDiv,
    setSelectedReqDivData,
    insertCrossReferenceLink,
    navigateToObject,
    renderComment,
    highlightComments,
    removeMarkupSpans,
    handleMarkupDeleted,
    setViewerContainer,
    recalculateMarkups,
    updateOriginalContentsMap,
    makeRequirementEditable,
    getMarkupTextInstance,
    showPanelforComments,
    saveCommentEdit,
    endCommentEdit,
    initializationForComments,
    markupSelected,
    deleteMarkup,
    getStatusComments,
    stringifyMarkups
};
