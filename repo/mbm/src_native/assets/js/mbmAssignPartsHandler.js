// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/mbmAssignPartsHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import addElementService from 'js/addElementService';
import mbmSaveService from 'js/mbmSaveService';
import mbmSaveUtils from 'js/mbmSaveUtils';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import mbmCompareUtils from 'js/mbmCompareUtils';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import AwPromiseService from 'js/awPromiseService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';

var exports = {};

/**
 * Performs assign part operation
 * @param {Array} sourceObjects array of source Objects
 * @param {Object} targetObject target object
 * @param {String} actionType specifies action Move or Add
 */
export let assignFromEbomToMbom = function( sourceObjects, targetObject, actionType ) {
    _saveChanges( sourceObjects, targetObject, actionType );
};

/**
 * calls save operation
 * @param {Array} sourceObjects array of source Objects
 * @param {Object} targetObject target object
 * @param {String} actionType specifies action Move or Add
 * @param {Object} addElementInput ElementInput object
 */
let _saveChanges = function( sourceObjects, targetObject, actionType, addElementInput = {} ) {
    mbmCompareUtils.setModificationInProgress( true );
    addElementInput.parentElement = targetObject;
    contextStateMgmtService.updateActiveContext( 'mbomContext' );
    appCtxSvc.ctx.aceActiveContext.context.addElementInput = addElementInput;
    addElementService.processAddElementInput();
    let sortPropertyName;
    let sortOrder;
    if( appCtxSvc.ctx.aceActiveContext.context.hasOwnProperty( 'sortCriteria' ) && appCtxSvc.ctx.aceActiveContext.context.sortCriteria.length > 0 ) {
        sortPropertyName = appCtxSvc.ctx.aceActiveContext.context.sortCriteria[ 0 ].fieldName;
        sortOrder = appCtxSvc.ctx.aceActiveContext.context.sortCriteria[ 0 ].sortDirection;
    } else {
        sortPropertyName = "";
        sortOrder = "";
    }
    mbmSaveService.saveChanges( actionType, sourceObjects, targetObject, 'ebomContext', 'mbomContext', [ "false" ], [ sortPropertyName ], [ sortOrder ] ).then( function( result ) {
        if( result.serviceData.hasOwnProperty( 'partialErrors' ) && result.serviceData.partialErrors.length > 0 && result.newElements.length === 0 ) {
            mbmCompareUtils.setModificationInProgress( false );
            var err = messagingService.getSOAErrorMessage( result.serviceData );
            localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then( function( localizedText ) {
                let buttonArray = [];
                buttonArray.push( mfgNotificationUtils.createButton( localizedText.mbmClose, function( callBack ) {
                    callBack.close();
                } ) );
                messagingService.showError( err, null, null, buttonArray );
            } );
        } else {
            let addElementEventData = _getAddElementData( false, 'mbomContext', result.childElements, result.newElements );
            eventBus.publish( 'addElement.elementsAdded', addElementEventData );
            if( sourceObjects.length !== result.newElements.length ) {
                let msg = '';
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        let partsfailed = sourceObjects.length - result.newElements.length;
                        let buttonArray = [];
                        buttonArray.push( mfgNotificationUtils.createButton( localizedText.mbmClose, function( callBack ) {
                            callBack.close();
                        } ) );
                        if( actionType === 'Add' ) {
                            msg = msg.concat( localizedText.mbmpartialElementAddSuccessful.replace( '{0}', partsfailed ) );
                            msg = msg.replace( '{1}', sourceObjects.length );
                            messagingService.showError( msg, null, null, buttonArray );
                        } else if( actionType === 'Move' ) {
                            msg = msg.concat( localizedText.mbmpartialElementMoveSuccessful.replace( '{0}', partsfailed ) );
                            msg = msg.replace( '{1}', sourceObjects.length );
                            messagingService.showError( msg, null, null, buttonArray );
                        }
                    } );
            }
            let saveSuccessEventEventData = {
                actionType: actionType,
                source: result.source,
                target: result.target,
                removedObjects: result.removedObjects
            };
            eventBus.publish( 'mbm.saveSuccessEvent', saveSuccessEventEventData );
        }
    } );
};

/**
 * Get event data for addElement.elementsAdded event
 * @param {Bool} reloadContent reload Content flag
 * @param {String} contextKey context key of the view
 * @param {Array} childOccurrencesUids children uids
 * @param {Array} newElements newly created elements
 * @return {Object} event data
 */
let _getAddElementData = function( reloadContent, contextKey, childOccurrencesUids, newElements ) {

    let objectsToSelect = [];
    let childOccurrences = [];
    for( let i = 0; i <= newElements.length - 1; i++ ) {
        objectsToSelect.push( cdm.getObject( newElements[ i ] ) );
    }
    for( let i = 0; i <= childOccurrencesUids.length - 1; i++ ) {
        childOccurrences.push( _getChildOccurrence( childOccurrencesUids[ i ] ) );
    }

    let addElementResponse = {
        "reloadContent": reloadContent,
        selectedNewElementInfo: {
            newElements: objectsToSelect,
            pagedOccurrencesInfo: {
                "childOccurrences": childOccurrences
            }
        },
        "newElementInfos": [],
        "ServiceData": {
            updated: {}
        }
    };

    return {
        "objectsToSelect": objectsToSelect,
        "addElementResponse": addElementResponse,
        "addElementInput": appCtxSvc.ctx.aceActiveContext.context.addElementInput,
        "viewToReact": contextKey
    };
};

/**
 * Get children Occurrences
 * @param {String} contextKey context key of the view
 *@return {Object} children Occurrences 
 */
let _getChildOccurrence = function( id ) {
    return {
        occurrenceId: id,
        occurrence: cdm.getObject( id )
    };
};

/**
 * handler for drag and drop in the MBOM
 *
 * @param {Object} sourceObjects source Object
.* @param {Object} targetObject target Object
.* @param {String} actionType action performed on the UI
 */
let moveWithinMbom = function( sourceObjects, targetObject, actionType ) {
    var addElementInput = {};
    addElementInput.addObjectIntent = 'DragAndDropIntent';
    _saveChanges( sourceObjects, targetObject, actionType, addElementInput );
};
/**
 * handler for drag and drop in the MBOM
 *
 * @param {Object} sourceObjects source Object
.* @param {Object} targetObject target Object
.* @param {String} actionType action performed on the UI
 */
export let moveMbomParts = function( sourceObjects, targetObject, actionType ) {
    removeTopAndShowErrorMsg( sourceObjects ).then( function() {
        let parentChildSectionInfo = removeChildifParentChildSelected( sourceObjects );
        if( parentChildSectionInfo.isParentSelected && sourceObjects.length > 0 ) {
            let buttonArray = [];
            if( parentChildSectionInfo.parentSelectedCount === 1 ) {
                let msg = '';
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = msg.concat( localizedText.mbmParentChildSelectedToMove.replace( '{0}', TypeDisplayNameService.instance.getDisplayName( parentChildSectionInfo.child ) ) );
                        msg = msg.replace( '{1}', TypeDisplayNameService.instance.getDisplayName( parentChildSectionInfo.parent ) );
                        mfgNotificationUtils.displayConfirmationMessage( msg, localizedText.mbmMove, localizedText.mbmCancel ).then( function() {
                            moveWithinMbom( sourceObjects, targetObject, actionType );
                        } );
                    } );
            } else {
                let msg = '';
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = localizedText.mbmMultipleParentChildSelectedToMove;
                        mfgNotificationUtils.displayConfirmationMessage( msg, localizedText.mbmMove, localizedText.mbmCancel ).then( function() {
                            moveWithinMbom( sourceObjects, targetObject, actionType );
                        } );
                    } );
            }

        } else {
            moveWithinMbom( sourceObjects, targetObject, actionType );
        }
    } );

};

/**
 * this method is used to check if child and parenet is present in input object. 
 * if child and parent are in input then child will be removed from the input
 *
 * @param {Object} sourceObjects source Object
 * @returns {boolean} returns true if source objects has prenet and child
 */
const removeChildifParentChildSelected = function( sourceObjects ) {
    let isParentSelected = false;
    let parenetSelectionInSourceSelection = 0;
    let parentChildSelectionInfo = {};
    for( let i = 0; i < sourceObjects.length; i++ ) {
        let parent = cdm.getObject( sourceObjects[ i ].props.awb0Parent.dbValues[ 0 ] );
        do {
            for( let j = 0; j < sourceObjects.length; j++ ) {
                if( sourceObjects[ j ].uid === parent.uid ) {
                    isParentSelected = true;
                    if( parenetSelectionInSourceSelection < 1 ) {
                        parentChildSelectionInfo.parent = parent;
                        parentChildSelectionInfo.child = sourceObjects[ i ];
                    }
                    parenetSelectionInSourceSelection++;
                    sourceObjects.splice( i--, 1 );
                }
            }
            parent = isParentSelected ? null : cdm.getObject( parent.props.awb0Parent.dbValues[ 0 ] );
        } while( parent !== null );
    }
    parentChildSelectionInfo.isParentSelected = isParentSelected;
    parentChildSelectionInfo.parentSelectedCount = parenetSelectionInSourceSelection;
    return parentChildSelectionInfo;
};

/**
 *
 * @param {Object} sourceObjects objects 
 */
let removeTopAndShowErrorMsg = function( sourceObjects ) {
    let deferred = AwPromiseService.instance.defer();
    let isRootPresent = false;
    for( let i = 0; i < sourceObjects.length; i++ ) {
        if( sourceObjects[ i ].props.awb0Parent.dbValues[ 0 ] === null ) {
            isRootPresent = true;
            if( sourceObjects.length === 1 ) {
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        let buttonArray = [];
                        buttonArray.push( mfgNotificationUtils.createButton( localizedText.mbmClose, function( callBack ) {
                            callBack.close();
                        } ) );
                        let msg = '';
                        msg = localizedText.mbmRootSelectedToMove;
                        messagingService.showError( msg, null, null, buttonArray );
                        deferred.reject();
                    } );
            } else {
                let rootNode = sourceObjects.splice( i, 1 );
                let msg = '';
                localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then(
                    function( localizedText ) {
                        msg = msg.concat( localizedText.mbmMultipleSelectionWithRootToMove.replace( '{0}', TypeDisplayNameService.instance.getDisplayName( rootNode[ 0 ] ) ) );
                        mfgNotificationUtils.displayConfirmationMessage( msg, localizedText.mbmMoveTheRest, localizedText.mbmCancel ).then( function() {
                            deferred.resolve();
                        } );
                    } );
            }
        }
    }
    if( !isRootPresent ) {
        deferred.resolve();
    }
    return deferred.promise;
};

//assign part Handler

export default exports = {
    assignFromEbomToMbom,
    moveMbomParts
};
app.factory( 'mbmAssignPartsHandler', () => exports );
