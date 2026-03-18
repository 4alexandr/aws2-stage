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
 * @module js/mbmPropagateService
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
import { constants as mbmConstants } from 'js/mbmConstants';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import mfgNotificationUtils from 'js/mfgNotificationUtils';

var exports = {};

/**
 * propagate changes from Ebom to Mbom
 * @param {Array} sourceObjects array of source objects
 * @param {String} needTarget   flag is true if taget need to get otherwise false
 */
export const pushPropagateChanges = function( sourceUids ) {
    if( sourceUids && sourceUids.length > 0 ) {
        return propagateChanges( sourceUids );
    } else {
        return null;
    }
};

/**
 * this method will take input as array of sourceObjects
 * and calls SOA
 * @param {Array} sourceObjects array of source objects
 * 
 * @return {Object} Processed soa response or throws error
 */
const propagateChanges = function( sourceObjects ) {
    let saveInputWriter = saveInputWriterService.get();
    let sortPropertyName = getSortPropertyNames();
    let sortOrder = getSortOrder();

    let objectsToModifyEntry = getPropagatePropertiesObject( sourceObjects, sortPropertyName, sortOrder );
    saveInputWriter.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, objectsToModifyEntry );

    let sessionEntry = getEntryToSession();
    saveInputWriter.addEntryToSection( epSaveConstants.SESSION, sessionEntry );

    let soaInput = saveInputWriterService.getSaveInput( saveInputWriter );
    mbmCompareUtils.setModificationInProgress( true );
    eventBus.publish( 'ace.activateWindow', { key: mbmConstants.MBOM_CONTEXT } );

    eventBus.publish( 'ace.activateWindow', { key: mbmConstants.MBOM_CONTEXT } );

    return epSaveService.performSaveChangesCall( soaInput ).then( function( response ) {
        if( response.ServiceData.hasOwnProperty( 'partialErrors' ) && response.ServiceData.partialErrors.length > 0 ) {
            mbmCompareUtils.setModificationInProgress( false );
            var err = messagingService.getSOAErrorMessage( response.ServiceData );
            localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then( function( localizedText ) {
                messagingService.showError( err, null, null, getCloseButton( localizedText.mbmClose ) );
            } );
        }

        let removedObjects = mbmSaveUtils.getRemovedElements( response );
        let source = mbmSaveUtils.getSource( response );
        let target = mbmSaveUtils.getTarget( response );

        let visibleVMO = getVisibleAndExpandedVMO( response );
        if( visibleVMO.length > 0 ) {
            visibleVMO.forEach( node => {
                eventBus.publish( 'addElement.elementsAdded', _getAddElementData( false, 'mbomContext', node.newElements, node.newElements, cdm.getObject( node.parent ) ) );
            } );
        }

        if( removedObjects.length > 0 ) {
            contextStateMgmtService.updateActiveContext( "mbomContext" );
            eventBus.publish( 'cdm.deleted', {
                deletedObjectUids: removedObjects
            } );

            //Deselect removed elements from selection model
            eventBus.publish( 'aceElementsDeSelectedEvent', {
                elementsToDeselect: removedObjects
            } );
        }

        let saveSuccessEventEventData = {
            actionType: mbmConstants.PROPAGATE,
            removedObjects: removedObjects,
            source: source,
            target: target
        };

        eventBus.publish( 'mbm.saveSuccessEvent', saveSuccessEventEventData );
        return saveSuccessEventEventData;
    }, function( error ) {
        mbmCompareUtils.setModificationInProgress( false );
        var err = messagingService.getSOAErrorMessage( error );
        localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/mbmMessages' ).then( function( localizedText ) {
            messagingService.showError( err, null, null, getCloseButton( localizedText.mbmClose ) );
        } );
        return err;
    } );
};

/**
 * Get array of objects with parent and its child info
 * @param {Object} response soa response
 * @return {Array} returns array of objects with parent and its child info
 */
const getVisibleAndExpandedVMO = function( response ) {
    let parentChilds = [];
    let visibleVMO = [];
    if( response && response.saveEvents ) {
        response.saveEvents.forEach( event => {
            if( event.eventType === 'addedToRelation' ) {
                let parentChildInfo = {};
                parentChildInfo.parent = event.eventObjectUid;
                parentChildInfo.newElements = event.eventData;
                parentChilds.push( parentChildInfo );
            }
        } );
    }

    if( parentChilds.length > 0 ) {
        var context = _.get( appCtxService.ctx, "mbomContext" );
        var vmCollection = context.vmc;

        parentChilds.forEach( function( parentChildInfo ) {
            vmCollection.loadedVMObjects.forEach( function( vmo, vmoIndex ) {
                if( vmo.uid === parentChildInfo.parent ) {
                    let parentVMO = vmCollection.getViewModelObject( vmoIndex );
                    if( parentVMO && parentVMO.isExpanded ) {
                        visibleVMO.push( parentChildInfo );
                    }
                }
            } );
        } );
    }
    return visibleVMO;

};

/**
 * Get data for Property Name
 * @return {Array} sort Property Name
 */
const getSortPropertyNames = function() {
    if( appCtxService.ctx.mbomContext.sortCriteria && appCtxService.ctx.mbomContext.sortCriteria.length > 0 ) {
        return [ appCtxService.ctx.mbomContext.sortCriteria[ 0 ].fieldName ];
    } else {
        return [ "" ];
    }
};

/**
 * Get data for sort order
 * @return {Array} sort order
 */
const getSortOrder = function() {
    if( appCtxService.ctx.mbomContext.sortCriteria && appCtxService.ctx.mbomContext.sortCriteria.length > 0 ) {
        return [ appCtxService.ctx.mbomContext.sortCriteria[ 0 ].sortDirection ];
    } else {
        return [ "" ];
    }
};

/**
 * Get event data for addElement.elementsAdded event
 * @param {Bool} reloadContent reload Content flag
 * @param {String} contextKey context key of the view
 * @param {Array} childOccurrencesUids children uids
 * @param {Array} newElements newly created elements
 * @return {Object} event data
 */
let _getAddElementData = function( reloadContent, contextKey, childOccurrencesUids, newElements, newElementsParent ) {

    let objectsToSelect = [];
    let childOccurrences = [];
    let addElementInput = {};
    addElementInput.parent = newElementsParent;
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
        "addElementInput": addElementInput,
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
 * return Array of button
 * @param {String} buttonName localized name of button
 * @return {Array} Array of button
 */
const getCloseButton = function( buttonName ) {
    let buttonArray = [];
    buttonArray.push( mfgNotificationUtils.createButton( buttonName, function( callBack ) {
        callBack.close();
    } ) );
    return buttonArray;
};

/**
 * return session section object  
 * @return {Object} session entry object  
 */
const getEntryToSession = function() {
    let sourcePci = appCtxService.getCtx( mbmConstants.EBOM_CONTEXT + '.productContextInfo' ).uid;
    let targetPci = appCtxService.getCtx( mbmConstants.MBOM_CONTEXT + '.productContextInfo' ).uid;

    let sourceScope = appCtxService.getCtx( mbmConstants.EBOM_CONTEXT ).topElement.uid;
    let targetScope = appCtxService.getCtx( mbmConstants.MBOM_CONTEXT ).topElement.uid;

    return mbmSaveUtils.getEntryForSessionSection( [ "false" ], [ sourcePci ], [ targetPci ], [ sourceScope ], [ targetScope ] );
};

/**
 * create MbmPropagateProperties object.
 * @return {Object} MbmPropagateProperties object.
 */
const getPropagatePropertiesObject = function( sourceObjectsIds, sortPropertyName, sortOrder ) {
    return {
        MbmPropagateProperties: {
            nameToValuesMap: {
                sourceObjects: sourceObjectsIds,
                SortPropertyName: sortPropertyName,
                SortOrder: sortOrder
            }
        }
    };
};

export default exports = {
    pushPropagateChanges
};
