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
 * @module js/wiCkEditor.service
 */
import app from 'app';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import wiConstants from 'js/browserUtils';
import 'js/wiConstants';

window.CKEDITOR_BASEPATH = browserUtils.getBaseURL() + app.getBaseUrlPath() + wiConstants.CKEDITOR_PATH;
/**
 * editor On Focus
 *@param {Object} instance instance
 *@param {callback} callback callback
 * @return {Boolean} editorOnFocused
 */
export let editorOnFocused = function( instance, callback ) {
    return instance.on( 'focus', callback );
};

/**
 * editor On change
 *@param {Object} instance instance
 *@param {callback} callback callback
 * @return {Boolean} editorOnChange
 */
export let editorOnChange = function( instance, callback ) {
    return instance.on( 'change', callback );
};
/**
 * Get ck editor instance data
 *@param {String} editorId id of instance
 *@returns {String} editor data
 */
export let getEditorData = function( editorId ) {
    /* globals CKEDITOR: false */
    return CKEDITOR.instances[ editorId ].getData();
};

export let resetDirty = function( editorId ) {
    CKEDITOR.instances[ editorId ].resetDirty();
};

export let getEditorInstance = function( editorId ) {
    return CKEDITOR.instances[ editorId ];
};

export let createFromHtml = function( html ) {
    return CKEDITOR.dom.element.createFromHtml( html );
};

export let clearEditorData = function() {
    _.forEach( CKEDITOR.instances, function( instance ) {
        if( instance ) {
            instance.destroy( true );
        }
    } );
};

export let createEditorDomElementFromHTML = function( htmlContent, CkEditorInstanceDocument ) {
    /* globals CKEDITOR: false */
    return CKEDITOR.dom.element.createFromHtml( htmlContent, CkEditorInstanceDocument );
};

let exports = {};
export default exports = {
    editorOnFocused,
    editorOnChange,
    getEditorData,
    resetDirty,
    getEditorInstance,
    createFromHtml,
    clearEditorData,
    createEditorDomElementFromHTML
};
