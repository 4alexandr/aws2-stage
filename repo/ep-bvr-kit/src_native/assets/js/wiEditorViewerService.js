// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Initialization service for WI Editor.
 *
 * @module js/wiEditorViewerService
 */
import $ from 'jquery';
import _ from 'lodash';
import epContextService from 'js/epContextService';
import 'ckeditor4';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';
import wiEditorService from 'js/wiEditor.service';
import appCtxService from 'js/appCtxService';
import 'js/aw-command-bar.directive';
import 'js/wiStandardText.service';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import popupService from 'js/popupService';
import awPromiseService from 'js/awPromiseService';
import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import { constants as epLoadConstants } from 'js/epLoadConstants';
import mfeVMOLifeCycleSvc from 'js/services/mfeViewModelObjectLifeCycleService';
import policySvc from 'soa/kernel/propertyPolicyService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';
import cdm from 'soa/kernel/clientDataModel';
import leavePlaceService from 'js/leavePlace.service';
import mfeTableService from 'js/mfeTableService';
import vMOService from 'js/viewModelObjectService';
import eventBus from 'js/eventBus';
import epBvrObjectService from 'js/epBvrObjectService';

'use strict';

let ckEditorIdToObjUid = [];
let _popupRef = null;

let isClassicBOP = false;
const EDITOR_TEXTAREA_ID = 'Textarea';
const SAVE_WI_DATA_EVENT_TYPE = 'SaveWIData';
const SAVE_CREATE_EVENT_TYPE = 'create';
const REMOVED_FROM_RELATION_EVENT = 'removedFromRelation';
const ADDED_TO_RELATION_EVENT = 'addedToRelation';
/**
 * This method is used to initiate editor data
 *
 * @returns {object} editorsToLoad
 */
export function onInit() {
    // Register once for the place Holder text for all the Editor
    wiEditorService.registerCKEditorPlaceholder();

    //get selected object from ctx
    if( mfeTypeUtils.isOfType( appCtxService.getCtx( 'ep.scopeObject' ), epBvrConstants.MFG_BVR_PROCESS ) ) {
        isClassicBOP = true;
    }
    const epPageContext = epContextService.getPageContext();
    const selectedObj = epPageContext.loadedObject;
    // on first time it arrives here before the page context is loaded.
    if( selectedObj ) {
        const processloadInputs = epLoadInputHelper.getLoadTypeInputs( epLoadConstants.WI_EDITOR_DATA,
            selectedObj.uid );
        const policyId = policySvc.register( {
            types: [ {
                name: epBvrConstants.MFG_BVR_OPERATION,
                properties: [ {
                    name: epBvrConstants.BL_PARENT
                } ]
            } ]
        } );
        return epLoadService.loadObject( processloadInputs, false ).then( function( output ) {
            if( policyId ) {
                policySvc.unregister( policyId );
            }
            const epPageContext = epContextService.getPageContext();
            const topEditorData = output.relatedObjectsMap[epPageContext.loadedObject.uid];
            const wiObjectUIDs = topEditorData.additionalPropertiesMap2.WorkinstructionObjects;

            const editorsToLoad = {};
            editorsToLoad.editorsData = wiObjectUIDs.map(objUID => {
                if( !ckEditorIdToObjUid[ wiEditorService.getDivId( objUID ) + EDITOR_TEXTAREA_ID ] ) {
                    return updateEditor( objUID, output.relatedObjectsMap[objUID], output.ServiceData.modelObjects[objUID] );
                }
            });

            return editorsToLoad;
        } );
    }
}


/**
 * This method is used to open Search Standard TextPopup
 *
 * @param {object} popupOffset - popupOffset
 */
export function openSearchStandardTextPopup( popupOffset ) {
    const data = {
        declView: 'standardTextSearchPopup',
        options: {
            isModal: false,
            customClass: 'wi-search-stx-popup-panel',
            clickOutsideToClose: true,
            whenParentScrolls: 'close',
            disableUpdate: true
        }
    };
    const deferred = awPromiseService.instance.defer();
    popupService.show( data ).then( function( popupRef ) {
        _popupRef = popupRef;
        const standardTextPopupContainerElement = $( '.wi-search-stx-popup-panel' );
        if( popupOffset && standardTextPopupContainerElement ) {
            standardTextPopupContainerElement.offset( {
                left: popupOffset.left,
                top: popupOffset.top
            } );
        }
        eventBus.publish( 'wi.standardTextPopupPositionUpdated' );
        deferred.resolve( popupRef );
    } );
}

/**
 * This method is used to close the Search Standard TextPopup
 */
export function closeSearchStandardTextPopup() {
    if( _popupRef !== null ) {
        popupService.hide( _popupRef );
        _popupRef = null;
    }
}

/**
 *  update Step Editor with WI Data
 *  @param {Array} objUID Array of UID
 *  @param {object} stepData stepData
 *  @param {object} stepObject stepObject
 * @return {object} vmo ViewModelObject
 */
function updateEditor( objUID, stepData, stepObject ) {
    const divID = wiEditorService.getDivId( objUID );
    const textareaID = divID + EDITOR_TEXTAREA_ID;

    ckEditorIdToObjUid[ textareaID ] = {
        data: {
            object: stepObject,
            editorInstacnce: textareaID
        }
    };
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_EDITOR_ID_TO_OBJ_UID, ckEditorIdToObjUid );

    const divTextArea = divID + EDITOR_TEXTAREA_ID;
    const vmo = mfeVMOLifeCycleSvc.createViewModelObjectFromUid( objUID );
    const data = {
        wiStepEditorDivId: divID,
        wiStepEditorTextareaId: divTextArea,
        wiStepData: stepData,
        isClassicBop: isClassicBOP,
        wiStepObject: stepObject,
        parentObject: stepObject.props.bl_parent && cdm.getObject( stepObject.props.bl_parent.dbValues[ 0 ] ),
        isResequenceNeeded : true
    };
    vmo.editorData = data;
    return vmo;
}

/**
 * Destroy
 */
export function destroy() {
    //check for clear CK editor
    if( !wiEditorService.editorHasChanges() ) {
        wiEditorService.clearEditorData();
    }
    ckEditorIdToObjUid = [];

    // de-register leave placeholder

    leavePlaceService.registerLeaveHandler( null );
}

/**
 * Handles Save Events in the Editor panel
 *
 * @param {Object} eventData - the save events as json object
 */
export function handleSaveEvents( eventData, dataProvider ) {
    //Handle Save Events for Save WI Data
    if( !eventData.saveEvents ) {
        return;
    }
    const saveWIDataEvent = getEventData( eventData, SAVE_WI_DATA_EVENT_TYPE );
    saveWIDataEvent && saveWIDataEvent.length > 0 && handleSaveWIDataEvent( saveWIDataEvent );

    //Handle remove step event
    const removeEvent = getEventData( eventData, REMOVED_FROM_RELATION_EVENT );
    const objectToRemove = removeEvent.map( object => object.eventObjectUid );
    removeEvent && removeEvent.length > 0 && handleDeleteEvents( objectToRemove, dataProvider );

    //Handle add new step event
    const saveCreateEvent = getEventData( eventData, SAVE_CREATE_EVENT_TYPE );
    saveCreateEvent.push( ...getEventData( eventData, ADDED_TO_RELATION_EVENT ) );
    saveCreateEvent && saveCreateEvent.length > 0 && handleSaveCreateEvent( eventData, saveCreateEvent, dataProvider, eventData.ServiceData, eventData.relatedObjectsMap );
}

/**
 * Handles Save Events in the Editor panel, for Save Work Instructions
 *  @param {Object} saveWIDataEvent - save Event Data
 */
function handleSaveWIDataEvent( saveWIDataEvent ) {
    saveWIDataEvent.forEach( saveEvent => {
        const bodyText = saveEvent.eventData[ 0 ];
        const textareaID = wiEditorService.getDivId( saveEvent.eventObjectUid ) + EDITOR_TEXTAREA_ID;
        let editorInstance = wiEditorService.getEditorInstance( textareaID );
        if( editorInstance ) {
            editorInstance.setData( bodyText, function() {
                wiEditorService.resetDirtyEditors();
            } );
        }
    } );
}
/**
 * This methods added VMOs to dataProvider.viewModelCollection.loadedVMObjects
 * This can be used only in case you flat tree, a tree without expand. As method doesn't creates treeNode.
 *
 * @param { Object } objUidToAddList - Array of objects UID we want to Add to data - provider
 * @param { Object } dataProvider - data provider which need to be updated
 */
export function handleSaveCreateEvent( eventData, saveCreateEvents, dataProvider ) {
    let createdObjs =[];
    const viewModelCollection = dataProvider.getViewModelCollection();
    const loadedVMObjects = viewModelCollection.loadedVMObjects;
    const wiDataEvents = eventData.saveEvents.filter( event => event.eventType === "WIData" );
    saveCreateEvents.forEach(saveCreateEvent =>{
        const createdObj =vMOService.createViewModelObject( saveCreateEvent.eventObjectUid ) ;
        //get its WI data
        wiDataEvents.forEach( wiDataEvent => {
           if(createdObj.uid === wiDataEvent.eventObjectUid){
            const body_text = wiDataEvent.eventData[ 0 ];
            const isDirty = wiDataEvent.eventData[ 1 ];
            const stepData = {
                additionalPropertiesMap2: {
                    epw0body_text2: [ body_text ] ,
                    isDirty:isDirty
                }
            };
            createdObjs.push( updateEditor( saveCreateEvent.eventObjectUid, stepData, createdObj ));
           }
        } );
    });
    if(createdObjs.length >0){
        const parentObj =  epBvrObjectService.getParent(createdObjs[0]);
        const addAfterObject = getObjectToAddAfter(parentObj,createdObjs[0]);

        let refIndex = addAfterObject ? loadedVMObjects.findIndex((obj) => (obj.uid === addAfterObject.uid)) : loadedVMObjects.findIndex((obj) => (obj.uid === parentObj.uid));

        loadedVMObjects.splice(refIndex+1, 0, ...createdObjs);
        dataProvider.viewModelCollection.setTotalObjectsFound( loadedVMObjects.length );
        dataProvider.noResults = loadedVMObjects.length === 0;
    }

}
/**
 * Handle delete events
 *
 * @param {Object} deleteEvent - the save events as json object
 * @param {Object} dataProvider - the WIEditor data provider
 */
function handleDeleteEvents( deleteEvents, dataProvider ) {
    let objToRemoveList = [];

    let dirtyEditor = appCtxService.getCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR );
    deleteEvents.forEach( objToDelUid => {
        const editorId = wiEditorService.getDivId( objToDelUid ) + "Textarea";
        objToRemoveList.push( objToDelUid );
        //remove obj from dirty editor
        dirtyEditor && dirtyEditor[ editorId ] && delete dirtyEditor[ editorId ];
    } );
    appCtxService.updatePartialCtx( wiCtxConstants.WI_EDITOR_DIRTY_EDITOR, dirtyEditor );
    objToRemoveList && objToRemoveList.length > 0 && mfeTableService.removeFromDataProvider( objToRemoveList, dataProvider );
}



/**
 * Find the op
 *
 * @param {Object} deleteEvent - the save events as json object
 * @param {Object} dataProvider - the table data provider
 */
function getObjectToAddAfter ( parent, createdObj ) {

    const children = epBvrObjectService.getSequencedChildren( parent, epBvrConstants.MFG_SUB_ELEMENTS );
    const seqNoOfNewlyCreatedObj =  createdObj.props.bl_sequence_no && createdObj.props.bl_sequence_no.dbValues[0];
    const addAfterObj = children.find(obj =>(obj.props.bl_sequence_no && obj.props.bl_sequence_no.dbValues[0] &&
        obj.props.bl_sequence_no.dbValues[0] === `${seqNoOfNewlyCreatedObj - 10}`));

        return addAfterObj &&  mfeVMOLifeCycleSvc.createViewModelObjectFromUid(addAfterObj.uid);

}

/**
 * filter event data by type
 *
 * @param {Object} eventData - the save events as json object
 * @param {String} eventType - event Type
 */
function getEventData( eventData, eventType ) {
    return eventData.saveEvents.filter( event => event.eventType === eventType );
}

let exports = {};
export default exports = {
    onInit,
    openSearchStandardTextPopup,
    closeSearchStandardTextPopup,
    destroy,
    handleSaveEvents,
    handleDeleteEvents
};
