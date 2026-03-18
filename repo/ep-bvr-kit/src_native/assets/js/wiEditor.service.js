// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/wiEditor.service
 */

import app from 'app';
import { constants as wiConstants } from 'js/wiConstants';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import AwWindowService from 'js/awWindowService';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import appCtxService from 'js/appCtxService';
import _localeService from 'js/localeService';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import wiCkEditorService from 'js/wiCkEditor.service';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import leavePlaceService from 'js/leavePlace.service';
import AwPromiseService from 'js/awPromiseService';


let _wiRemoveStepService = null;

window.CKEDITOR_BASEPATH = browserUtils.getBaseURL() + app.getBaseUrlPath() + wiConstants.CKEDITOR_PATH;

const instrMessagePath = '/i18n/InstructionsEditorMessages';
const NOT_FOUND = -1;
const JPG = '.jpg';
const PNG = '.png';
const JPEG = '.jpeg';
const GIF = '.gif';


export const insertImageInCKEditor = function( data ) {
    let fileName = data.eventData.file.name;

    if( stringEndsWith( fileName, JPG ) || stringEndsWith( fileName, JPEG ) ||
        stringEndsWith( fileName, PNG ) || stringEndsWith( fileName, GIF ) ) {
        data.form = data.eventData.form;
        data.selectedObject = data.eventData.selectedObject;
        let datasetInfo = {
            clientId: fileName,
            namedReferenceName: 'Image',
            fileName: fileName,
            name: fileName,
            type: 'Image'
        };

        data.datasetInfo = datasetInfo;
        eventBus.publish( wiConstants.WI_CREATE_DATASET_EVENT );
    }
};

/**
 * update data for fileData
 *
 * @param {Object} fileData - key string value the location of the file
 * @param {Object} data - the view model data object
 */
export const updateFormData = function( fileData, data ) {
    if( fileData && fileData.value ) {
        let form = data.form;
        /* globals $: false */
        data.formData = new FormData( $( form )[ 0 ] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * Check if String ends with given suffix
 *
 * @param {String} str - input string
 * @param {String} suffix - suffix
 * @return {boolean} true, if string ends with given suffix
 */
export const stringEndsWith = function( str, suffix ) {
    str = str.toLowerCase();
    return str.indexOf( suffix, str.length - suffix.length ) !== -1;
};

const updateSymbolDatasetsMap = function( symbolDataset ) {
    let idToDatasetsMap = {};
    idToDatasetsMap = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_OBJECT_ID_TO_DATASET_MAP );
    if( !idToDatasetsMap ) {
        idToDatasetsMap = {};
    }

    let selectedObject = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_SELECTED_OBJECT_DATA ).selectedObject;

    if( idToDatasetsMap && idToDatasetsMap[ selectedObject.uid ] ) {
        idToDatasetsMap[ selectedObject.uid ].push( symbolDataset.uid );
    } else {
        let datasets = [];
        datasets.push( symbolDataset.uid );

        idToDatasetsMap[ selectedObject.uid ] = datasets;
    }
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_OBJECT_ID_TO_DATASET_MAP, idToDatasetsMap );
};

/**
 * set FullText object
 *
 * @param {Object} data - The panel's view model object
 *
 */
export const insertSymbol = function( data ) {
    let symbolDataset = data.createdObject;
    updateSymbolDatasetsMap( symbolDataset );

    if( data.fmsTicket ) {
        let imageURL = getFileURLFromTicket( data.fmsTicket );
        let img_id = symbolDataset.uid;

        if( imageURL !== null && window.parent.wiEditorInstance ) {
            let HTML_IMG_TAG_WITH_STYLE = '<img style=max-height:64px;width:auto src=';
            let HTML_END_IMG_TAG = ' alt="" />';
            let ID = 'id=';
            let imgElement = wiCkEditorService.createFromHtml( HTML_IMG_TAG_WITH_STYLE + imageURL + ' ' + ID + img_id + HTML_END_IMG_TAG );
            window.parent.wiEditorInstance.insertElement( imgElement );
        }
    }
};

/**
 * Get file URL from ticket.
 * @param {String} ticket - File ticket.
 * @returns {String} fileURL file ticket
 */
export const getFileURLFromTicket = function( ticket ) {
    if( ticket ) {
        return browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) +
            '?ticket=' + ticket;
    }
    return null;
};

/**
 * @param {String} saveInputWriter - saveInputWriter.
 * @param {String} relatedObjects - relatedObjects.
 */
export let saveObject = function( saveInputWriter, relatedObjects ) {
    epSaveService.saveChanges( saveInputWriter, true, relatedObjects ).then( function( response ) {
        let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
        if( dirtyEditors ) {
            //reset for each editor in dirty editors
            _.forEach( dirtyEditors, function( editor ) {
                let editorId = editor.data.editorId;
                wiCkEditorService.resetDirty( editorId );
            } );
        }
        //clear dirty editors
        resetDirtyEditors();
    } );
};

/**
 * editorHasChanges
 *
 * @return {Boolean} editorHasChanges
 */
export const editorHasChanges = function() {
    let isEnabled = false;
    let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
    if( !_.isEmpty( dirtyEditors )  ) {
        isEnabled = true;
    }
    return isEnabled;
};

/**
 * @param {object} data :result
 * @returns {object} message
 */
function displayConfirmationMessage( callback ) {
    const resource = _localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    return mfgNotificationUtils.displayConfirmationMessage( resource.leaveConfirmation, resource.discard, resource.save ).then(
            () => {
                clearEditorData();
            },
            () => {
                //on save
                saveWorkInstructions();
                clearEditorData();
            }
        );
}

/**
 * @param {object} editorSelectedObject :the object of selected editor
 * @returns {object} message
 */
function displayRemoveStepConfirmationMessage( editorSelectedObject ) {
    let resource = _localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    let buttonsName = {
        confirm: resource.cancel,
        cancel: resource.remove
    };

    let removeStepConfirmationMessage = resource.removeStepConfirmation + editorSelectedObject.props.object_string.dbValues[ 0 ];

    return mfgNotificationUtils.displayConfirmationMessage( removeStepConfirmationMessage, buttonsName ).then(
        function( response ) {
            //On cancel do nothing
        },
        function() {
            //On remove case call SOA
            _wiRemoveStepService.removeStep( editorSelectedObject );
        } );
}

/**
 * editor On Change
 *@param {Object} instance instance
 * @return {Boolean} editorOnChange
 */
export let editorOnChange = function( instance ) {
    if( instance ) {
        return wiCkEditorService.editorOnChange( instance, function( instance ) {
            if( instance.editor.checkDirty() ) {
                let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
                let newlyAddedStxElementsUID = [];
                if( !dirtyEditors ) {
                    dirtyEditors = {};
                }
                if( dirtyEditors[ instance.editor.name ] && dirtyEditors[ instance.editor.name ].data.newlyAddedStxElementsUID ) {
                    newlyAddedStxElementsUID = dirtyEditors[ instance.editor.name ].data.newlyAddedStxElementsUID;
                }
                dirtyEditors[ instance.editor.name ] = {
                    data: {
                        editorId: instance.editor.name,
                        isDirty: true,
                        newlyAddedStxElementsUID: newlyAddedStxElementsUID
                    }
                };
                let wiEditorContent = getEditorData( instance.editor.name );
                if( wiEditorContent === '' ) {
                    dirtyEditors[ instance.editor.name ].data.isDirty = false;
                }
                appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR, dirtyEditors );
                appCtxService.updatePartialCtx( wiCtxConstants.WI_IS_SAVE_INSTRUCTIONS_ENABLED, true );
            }
        } );
    }
};

/**
 * editor On FOcus
 *@param {Object} instance instance
 * @return {Boolean} editorOnFocused
 */
export const editorOnFocused = function( instance ) {
    if( instance ) {
        return wiCkEditorService.editorOnFocused( instance, function( instance ) {
            eventBus.publish( 'wi.closeSearchStandardTextPopup' );
            let wiEditorCtx = appCtxService.getCtx( wiCtxConstants.WI_EDITOR );
            let selectedObj = wiEditorCtx.EditorIdToObjUid[ instance.editor.name ].data.object;
            let selectedObjectData = {
                selectedObject: selectedObj,
                selectedObjectInstanceID: instance.editor.name
            };
            if( selectedObj && !_.isEmpty( selectedObj ) ) {
                const selectedObjects = [];
                selectedObjects.push( selectedObj );
                eventBus.publish( 'stepEditor.clicked', { selectedObjects } );
            }
            appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_SELECTED_OBJECT_DATA, selectedObjectData );

             // register leave placeholder
             leavePlaceService.registerLeaveHandler( {
                okToLeave: function() {
                    if( editorHasChanges() ) {
                        return displayConfirmationMessage( function() {
                            // Nothing to implement
                        } );
                    }
                    return AwPromiseService.instance.resolve();
                }
            } );
        } );
    }
};

export const registerCKEditorPlaceholder = function() {
    let resource = _localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );

    if( resource.ckeditorPlaceholder ) {
        AwWindowService.instance.parent.getCKEditorPlaceholder = function() {
            return resource.ckeditorPlaceholder;
        };
    }
};

/**
 * get Editor Div Id from Object Uid
 * @param {String} objID objID
 * @return {String} divID
 */
export const getDivId = function( objID ) {
    let replaceBy = '';

    //Remove following characters (':', '/','.','$','_') from object ID
    let divID = _.replace( objID, new RegExp( ':', 'g' ), replaceBy );
    divID = _.replace( divID, new RegExp( '/', 'g' ), replaceBy );
    divID = _.replace( divID, /\./g, replaceBy );
    divID = _.replace( divID, /\$/g, replaceBy );
    divID = _.replace( divID, /_/g, replaceBy );
    return divID;
};

export const handleUnsavedInstructions = function( callback ) {
    if( editorHasChanges() ) {
        displayConfirmationMessage( callback );
    } else {
        //gwtExporter.runMethod( 'wiHandleUnsavedInstructions', callback );
    }
};

export const clearEditorData = function() {
    wiCkEditorService.clearEditorData();
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR, {} );
};

export const clearEditorDataForEditorId = function( editorId ) {
    wiCkEditorService.clearEditorDataForEditorId( editorId );
};

export const getEditorData = function( editorId ) {
    return wiCkEditorService.getEditorData( editorId );
};
export const resetDirtyEditors = function( editorId ) {
    let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
    if( dirtyEditors ) {
        //reset for each editor in dirty editors
        _.forEach( dirtyEditors, function( editor ) {
            let editorId = editor.data.editorId;
            wiCkEditorService.resetDirty( editorId );
        } );
    }
    //clear dirty map
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR, {} );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_OBJECT_ID_TO_DATASET_MAP, {} );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_IS_SAVE_INSTRUCTIONS_ENABLED, false );
};

export let resetDirty = function( editorId ) {
    wiCkEditorService.resetDirty( editorId );
};

/**
 * Save WorkInstructions.
 */
export const saveWorkInstructions = function() {
    let saveInputWriter = saveInputWriterService.get();
    let relatedObjects = [];

    //get all dirty editors
    let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
    if( dirtyEditors ) {
        //for each dirty editor, create save input
        _.forEach( dirtyEditors, function( editor ) {
            let newlyAddedStxElements = editor.data.newlyAddedStxElementsUID;
            let editorId = editor.data.editorId;
            //get object uid
            let editorToObjUidMap = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_EDITOR_ID_TO_OBJ_UID );
            if( editorToObjUidMap[ editorId ] ) {
                let obj = editorToObjUidMap[ editorId ].data.object;
                relatedObjects.push( obj );
                //get data from editor
                let wiEditorContent = getEditorData( editorId );
                if( !editor.data.isDirty ) {
                    wiEditorContent = '';
                }
                if( wiEditorContent || wiEditorContent === '' ) {
                    wiEditorContent = wiEditorContent.replace( new RegExp( '\\\u000A', 'g' ), '' );
                    let finalContent = '<span style=\'font-family:Segoe UI\'>' + wiEditorContent + '</span>';
                    let inlineStyleContent = formatContent( finalContent );
                    let idToDatasetsMap = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_OBJECT_ID_TO_DATASET_MAP );
                    let imageDatasets;
                    if( idToDatasetsMap && idToDatasetsMap[ obj.uid ] ) {
                        imageDatasets = idToDatasetsMap[ obj.uid ];
                    }
                    //add it to save input
                    saveInputWriter.addUpdateWorkInstructions( obj.uid, inlineStyleContent, finalContent, imageDatasets, newlyAddedStxElements );
                }
            }
        } );
    }
    //call save
    saveObject( saveInputWriter, relatedObjects );
};

/**
 * This method checks if data obtained is body text or placeholder
 *
 * @param {String} editorData - editorData
 * @return {String} bodyText
 */
export const getBodyTextFromEditorId = function( editorId ) {
    let editorData = getEditorData( editorId );
    let stringWithoutDiv = editorData.substring( 5, editorData.length - 7 );
    stringWithoutDiv = stringWithoutDiv.replace( new RegExp( '\\\u000A', 'g' ), '' );
    stringWithoutDiv = stringWithoutDiv.replace( '&amp;', '&' );
    let resource = _localeService.getLoadedText( app.getBaseUrlPath() + instrMessagePath );
    if( stringWithoutDiv === resource.ckeditorPlaceholder ) {
        return '';
    }
        return editorData;
};

/**
 * formatContent
 *
 * @param {String} finalContent - finalContent
 * @return {String} bodyText
 */
const formatContent = function( finalContent ) {
    let bodyText = finalContent;

    bodyText = replaceAll( bodyText, '[[', '<a style=\'color:#009898;\'>' );
    bodyText = replaceAll( bodyText, ']]', '</a>' );

    bodyText = replaceAll( bodyText, '{{', 'as seen in: <a style=\'color:#009898;\'>' );
    bodyText = replaceAll( bodyText, '}}', '</a>' );
    return bodyText;
};

/**
 * Replace all instances of a given string within a larger string.
 *
 * @param {String} input - input string to replace content
 * @param {String} toFind - string to locate
 * @param {String} toReplace - string to replace
 * @return {String} modified string
 */
const replaceAll = function( input, toFind, toReplace ) {
    let output = input;
    if( output.indexOf( toFind ) > NOT_FOUND ) {
        output = output.split( toFind ).join( toReplace );
    }
    return output;
};

export function getEditorInstance( ObjectInstanceID ) {
    return wiCkEditorService.getEditorInstance( ObjectInstanceID );
}


export function createEditorDomElementFromHTML( htmlContent, editorInstanceDocument ) {
    return wiCkEditorService.createEditorDomElementFromHTML( htmlContent, editorInstanceDocument );
}

export function getEditorDomNodeOfTag( tagname, editorSelectedInstance, objectUid ) {
    var editorDomTagElements = editorSelectedInstance.document.find( tagname );
    for( var index = 0; index < editorDomTagElements.$.length; index++ ) {
        var nodeElement = editorDomTagElements.getItem( index );
        //will always match since the tag(part-tool/stx is present in the document)
        if( nodeElement.getAttribute( 'uid' ) === objectUid ) {
            return nodeElement;
        }
    }
}

let exports = {};
export default exports = {
    insertImageInCKEditor,
    updateFormData,
    stringEndsWith,
    insertSymbol,
    getFileURLFromTicket,
    saveObject,
    editorHasChanges,
    editorOnChange,
    editorOnFocused,
    registerCKEditorPlaceholder,
    getDivId,
    handleUnsavedInstructions,
    clearEditorData,
    clearEditorDataForEditorId,
    getEditorData,
    resetDirtyEditors,
    resetDirty,
    saveWorkInstructions,
    getBodyTextFromEditorId,
    getEditorInstance,
    createEditorDomElementFromHTML,
    getEditorDomNodeOfTag
};
