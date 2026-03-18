// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/mbmRemoveService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import mbmSaveUtils from 'js/mbmSaveUtils';
import _ from 'lodash';
import epSaveService from 'js/epSaveService';
import saveInputWriterService from 'js/saveInputWriterService';
import messagingService from 'js/messagingService';
import mbmCompareUtils from 'js/mbmCompareUtils';
import eventBus from 'js/eventBus';
import { constants as epSaveConstants } from 'js/epSaveConstants';
import contextStateMgmtService from 'js/contextStateMgmtService';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import {constants as mbmConstants} from 'js/mbmConstants';
import mfgNotificationUtils from 'js/mfgNotificationUtils';

var exports = {};

/**
 * performs save SOA call
 * @param {Array} removedElements array of removed objects
 */
export let removeElements = function( removedElements ) {
    if( removedElements ) {
        mbmCompareUtils.setModificationInProgress( true );
        let removeInput = getRemoveInput( removedElements, 'ebomContext', 'mbomContext', [ "false" ] );
        return epSaveService.performSaveChangesCall( removeInput ).then( function( response ) {
            if( removedElements.length>1 && removedElements.length > mbmSaveUtils.getRemovedElements( response ).length ) {
                let msg;
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = localizedText.MbmSomePartRemovalFailed;
                        messagingService.showError( msg,null,null,getCloseButton(localizedText.mbmClose) );
                    } );
            } else if( response.ServiceData.hasOwnProperty( 'partialErrors' ) && response.ServiceData.partialErrors.length > 0 ) {
                mbmCompareUtils.setModificationInProgress( false );
                var err = messagingService.getSOAErrorMessage( response.ServiceData );
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        messagingService.showError( err,null,null,getCloseButton(localizedText.mbmClose) );
                    } );
                return err;
            }
            let removedObjects = mbmSaveUtils.getRemovedElements( response );
            let source = mbmSaveUtils.getSource( response );
            let target = mbmSaveUtils.getTarget( response );

            if( removedObjects.length > 0 ) {
                contextStateMgmtService.updateActiveContext( "mbomContext" );
                eventBus.publish( 'cdm.deleted', {
                    deletedObjectUids: removedObjects
                } );
                  //Vis listens this event to update the viewer on remove
                eventBus.publish( 'ace.elementsRemoved', {
                    removedObjects: removedObjects,
                    viewToReact: appCtxService.ctx.aceActiveContext.key
                } );
            }
            //Deselect removed elements from selection model
            eventBus.publish( 'aceElementsDeSelectedEvent', {
                elementsToDeselect: removedObjects
            } );

            let saveSuccessEventEventData = {
                actionType: mbmConstants.REMOVE,
                removedObjects: removedObjects,
                source: source,
                target: target
            };
            eventBus.publish( 'mbm.saveSuccessEvent', saveSuccessEventEventData );
            return saveSuccessEventEventData;
        }, function( error ) {
            mbmCompareUtils.setModificationInProgress( false );
            if( removedElements.length === 1 ) {
                let msg = '';
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = msg.concat( localizedText.MbmSinglePartRemovalFailed.replace( '{0}', cdm.getObject( removedElements[ 0 ].props.awb0Parent.dbValues[ 0 ] ).props.object_string
                            .uiValues[ 0 ] ) );
                        messagingService.showError( msg,null,null,getCloseButton(localizedText.mbmClose) );
                    } );
                return msg;
            } else if( removedElements.length > 1 ) {
                let msg;
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = localizedText.MbmSomePartRemovalFailed;
                        messagingService.showError( msg,null,null,getCloseButton(localizedText.mbmClose) );
                    } );
                return msg;
            }
        } );
    }

};
/**
 * Get save SOA input
 * @param {Array} removeElements array of removed objects
 * @param {String} sourceContextKey context key of source
 * @param {String} targetContextKey context key of target
 * @param {String} performCheck  performCheck flag
 * @return {Object} soa input
 */
export let getRemoveInput = function( removeElements, sourceContextKey, targetContextKey, performCheck ) {
    if( removeElements && sourceContextKey && targetContextKey && performCheck ) {
        let relatedObjects = [];
        _.forEach( removeElements, function( removeElement ) {
            relatedObjects.push( removeElement );
        } );

        let saveInputWriter = saveInputWriterService.get();

        let removeElementsIds = [];
        _.forEach( removeElements, function( removeElement ) {
            removeElementsIds.push( removeElement.uid );
        } );

        let ebomScope = appCtxService.getCtx( sourceContextKey ).topElement.uid;
        let mbomScope = appCtxService.getCtx( targetContextKey ).topElement.uid;
        let ebomPci = appCtxService.getCtx( sourceContextKey + '.productContextInfo' ).uid;
        let mbomPci = appCtxService.getCtx( targetContextKey + '.productContextInfo' ).uid;

        let ObjectsToModifyEntry;
        ObjectsToModifyEntry = mbmSaveUtils.getEntryForRemove( removeElementsIds );
        saveInputWriter.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, ObjectsToModifyEntry );

        let sessionEntry = mbmSaveUtils.getEntryForSessionSection( performCheck, [ ebomPci ], [ mbomPci ], [ ebomScope ], [ mbomScope ] );
        saveInputWriter.addEntryToSection( epSaveConstants.SESSION, sessionEntry );
        saveInputWriter.addRelatedObjects( relatedObjects );
        return saveInputWriterService.getSaveInput( saveInputWriter );
    }
    return {};
};
/**
 * Get elements to remove excluding parent
 * @param {Array} removeElements array of removed objects
 * @return {Array} remove Elements
 */
export let getElementsToRemove = function( removeElements ) {
    if( removeElements && removeElements.length > 0 ) {
        let elementsToRemove = [];
        _.forEach( removeElements, function( removeElement ) {
            if( removeElement.uid !== appCtxService.getCtx( "mbomContext" ).topElement.uid ) {
                elementsToRemove.push( removeElement );
            }
        } );
        return elementsToRemove;
    }
    return [];
};

/**
 * Check if the parent is included in selection
 * @param {Array} removeElements array of removed objects
 * @return {Boolean} root included or not
 */
export let evaluateRemoveObjects = function( removeElements ) {

    let isRootIncluded = false;
    if( removeElements && removeElements.length > 1 ) {
        _.forEach( removeElements, function( removeElement ) {
            if( removeElement.uid === appCtxService.getCtx( "mbomContext" ).topElement.uid ) {
                isRootIncluded = true;
            }
        } );
        return isRootIncluded;
    }
    return isRootIncluded;
};
/**
 * return Array of button
 * @param {String} buttonName localized name of button
 * @return {Array} Array of button
 */
const getCloseButton=function(buttonName){
    let buttonArray = [];
    buttonArray.push( mfgNotificationUtils.createButton( buttonName, function( callBack ) {
        callBack.close();
    } ) );
    return buttonArray;
};

export default exports = {
    removeElements,
    getRemoveInput,
    getElementsToRemove,
    evaluateRemoveObjects
};

