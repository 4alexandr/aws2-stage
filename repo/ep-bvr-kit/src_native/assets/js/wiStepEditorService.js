// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Initialization service for WI step Editor.
 *
 * @module js/wiStepEditorService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import 'ckeditor4';
import { constants as wiConstants } from 'js/wiConstants';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import cdm from 'soa/kernel/clientDataModel';
import wiEditorService from 'js/wiEditor.service';
import appCtxService from 'js/appCtxService';
import 'js/wiStandardText.service';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';

'use strict';

let _cke = null;

const TEXTAREA = 'Textarea';

/**
 *
 * @param {Object} editorData editorData
 * @param {Object} editorObject editorObject
 */
export function onInit( editorData, editorObject) {
    if( editorData && editorObject ) {
        const objUID = editorObject.uid;
        const wiText = editorData.additionalPropertiesMap2.epw0body_text2[ 0 ];
        const isUpdateNeeded = editorData.additionalPropertiesMap2.isDirty[ 0 ];
        updateEditor( objUID, wiText, isUpdateNeeded );
    }
}    

/**
 * @return {Object} :parts and tools list
 */
function getPartsAndToolsList() {
    //get selection in process grid
    let selectedObject;
    const selectedObjectData = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_SELECTED_OBJECT_DATA );
    if( selectedObjectData ) {
        selectedObject = selectedObjectData.selectedObject;
    }
    let partsAndToolsList = [];
    //Get parts list from Assembly Structure
    partsAndToolsList.concat( getPartsListFromAssemblyStructure() );

    //Get parts and tools list from Selected Object
    if( selectedObject && selectedObject.props && selectedObject.props.Mfg0consumed_material !== undefined ) {
        partsAndToolsList.concat( selectedObject.props.Mfg0consumed_material.uiValues );
    }
    if( selectedObject && selectedObject.props && selectedObject.props.Mfg0used_equipment !== undefined ) {
        partsAndToolsList.concat( selectedObject.props.Mfg0used_equipment.uiValues );
    }
    return createPartsAndToolsList( partsAndToolsList );
}

/**
 *
 * @param {*} objUID objectUID
 * @param {*} editorObject editorObject
 * @param {*} body_text body text property
 * @param {*} isUpdateNeeded isUpdateNeeded
 */
function updateEditor( objUID, body_text, isUpdateNeeded ) {
    const divID = wiEditorService.getDivId( objUID );
    const textareaID = divID + TEXTAREA;

    CKEDITOR.basePath = browserUtils.getBaseURL() + app.getBaseUrlPath() + wiConstants.CKEDITOR_PATH; // eslint-disable-line no-undef

    _cke = CKEDITOR.replace( textareaID, { // eslint-disable-line no-undef
        customConfig: 'wiEditorConfig.js'
    } );
    _cke.baseUrl = browserUtils.getBaseURL();
    _cke.baseUrlPath = app.getBaseUrlPath();
    _cke.eventBus = eventBus;
    _cke.getPartsAndToolsList = getPartsAndToolsList;
    _cke.setData( body_text, function() {
        _cke.updateElement();
        _cke.resetDirty();
    } );
    wiEditorService.editorOnChange( _cke );
    wiEditorService.editorOnFocused( _cke );

    if( isUpdateNeeded === 'true' ) {
        let dirtyEditors = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
        if( !dirtyEditors ) {
            dirtyEditors = {};
        }
        dirtyEditors[ _cke.name ] = {
            data: {
                editorId: _cke.name,
                isDirty: true,
                newlyAddedStxElementsUID: []
            }
        };
        appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR, dirtyEditors );
        appCtxService.updatePartialCtx( wiCtxConstants.WI_IS_SAVE_INSTRUCTIONS_ENABLED, true );
    }
}

/**
 * createPartsAndToolsList
 * @param {Array} partsAndToolsList parts and tools list
 */
function createPartsAndToolsList( partsAndToolsList ) {
    return partsAndToolsList.map( ( uiValueStr, index ) => {
        return {
            id: index,
            name: uiValueStr
        };
    } );
}

/**
 * createPartsListFromAssemblyStructure
 */
function getPartsListFromAssemblyStructure( ) {
    let partsList = [];
    const epPageContext = appCtxService.getCtx( 'epPageContext' );
    const assemblyStructure = epPageContext.assemblyStructure;
    if( mfeTypeUtils.isOfType( epPageContext.loadedObject, epBvrConstants.MFG_BVR_PROCESS ) ) {
        if( assemblyStructure && assemblyStructure.props && assemblyStructure.props.bl_all_child_lines !== undefined ) {
            partsList = assemblyStructure.props.bl_all_child_lines.dbValues.map( uid =>
                cdm.getObject( uid ).props.object_string.dbValues[ 0 ]
            );
        }
    }
    return partsList;
}

let exports = {};
export default exports = {
    onInit
};
