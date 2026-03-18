// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/epSaveService
 */

import app from 'app';
import soaService from 'soa/kernel/soaService';
import mfgReadOnlyService from 'js/mfeReadOnlyService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import saveInputWriterService from 'js/saveInputWriterService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import epReviseHelper from 'js/epReviseHelper';
import appCtxSvc from 'js/appCtxService';
import epHostingMessagingService from 'js/epHostingMessagingService';
import _ from 'lodash';
import { constants as epSaveConstants } from 'js/epSaveConstants';

'use strict';

const REVISE_ERROR_CODE = 161044;

const ignorableErrorIds = [ 38015, 214019, 26003 ];

/**
 * performSaveChangesCall
 *
 * @deprecated please use saveChanges instead
 * @param { Object } input the save input
 * @returns {Promise} save promise
 */
export function performSaveChangesCall( input ) {
    let promise = soaService.postUnchecked( 'Internal-MfgBvrCore-2016-04-DataManagement', 'saveData3', input );
    return promise.then( function( result ) {
        return result;
    } );
}

/**
 * saveChanges
 *
 * @param {Object} saveInputWriter the save input
 * @param {Boolean} performCheck auto revise flag
 * @param {Array} relatedObjects array of save related model objects
 * @returns {Promise} save promise
 */
export function saveChanges( saveInputWriter, performCheck, relatedObjects ) {
    let awPromise = AwPromiseService.instance;
    if( mfgReadOnlyService.isReadOnlyMode() && !saveInputWriter.ignoreReadOnlyMode ) {
        localeService.getTextPromise( app.getBaseUrlPath() + '/i18n/epBvrServiceMessages' ).then(
            function( localizedText ) {
                messagingService.showError( localizedText.readOnlyModeError );
            } );
        return awPromise.reject();
    }

    saveInputWriter.addSessionInformation( performCheck );
    saveInputWriter.addRelatedObjects( relatedObjects );

    let saveInput = saveInputWriterService.getSaveInput( saveInputWriter );

    if( appCtxSvc.getCtx( 'ep.performSaveThroughHosted' ) ) {
        // if save should be done thru hosted, post message and return
        epHostingMessagingService.performSaveThroughHosted( saveInput, relatedObjects );
        return awPromise.resolve();
    }

    return soaService.postUnchecked( 'Internal-MfgBvrCore-2016-04-DataManagement', 'saveData3',
        saveInput ).then( function( result ) {
        var errorCodes = getErrorCodes( result.ServiceData );
        if( shouldIssuePartialError( errorCodes ) ) {
            if( hasReviseError( errorCodes ) ) {
                //handle revise
                return epReviseHelper.displayConfirmationMessage( result ).then( function() {
                    return saveChanges( saveInputWriter, false, relatedObjects );
                } );
            }
            var err = messagingService.getSOAErrorMessage( result.ServiceData );
            messagingService.showError( err );
            return err;
        }
        eventBus.publish( 'ep.saveEvents', result );
        const saveEvents = result.saveEvents;
        if( saveEvents && saveEvents.length > 0 ) {
            const parsedDeleteSaveEvents = parseSaveEventsData( saveEvents, epSaveConstants.DELETE );
            const parsedAddRemoveSaveEvents = parseSaveEvents( saveEvents );
            if( parsedDeleteSaveEvents && parsedDeleteSaveEvents.length > 0 ) {
                eventBus.publish( 'ep.deleteEvents', parsedDeleteSaveEvents );
            }
            if( parsedAddRemoveSaveEvents ) {
                eventBus.publish( 'ep.addRemoveEvents', parsedAddRemoveSaveEvents );
            }
        }
        return result;
    }, function( error ) {
        var err = messagingService.getSOAErrorMessage( error );
        messagingService.showError( err );
        return err;
    } );
}

/**
 * Convert the save events to json object
 *
 * Example:
 * ["Mfg0consumed_material": {
 *      eventObjectUid: "SR::N::Mfg0BvrOperation..2.Xxe7L68ddN55DA.gle5cV8s5QeVTC.Qdd5sNX95QeVTC.iCQ5cXdf5QeVTC.1",
 *      eventType: "modifyRelations",
 *      relatedEvents: [ "removedFromRelation": [
 *              "SR::N::Mfg0BvrPart..1.10CxMJfpdNZ8CB.gle5cV8s5QeVTC.Qdd5sNX95QeVTC.Group:/Thid_BRd58iz85QeVTC/SGX5cXdf5QeVTC/AbV5_lEo5QeVTC.1",
 *              "SR::N::Mfg0BvrPart..1.w2xSPxJbdN5v$B.gle5cV8s5QeVTC.Qdd5sNX95QeVTC.Group:/Thid_BRd58iz85QeVTC/SGX5cXdf5QeVTC/A7d5_lEo5QeVTC.1"
 *          ]
 *      ]
 * }]
 *
 * @param {Object} saveEvents - the save events returned from the soa server call
 * @returns {Object} parsedSaveEvents
 */
export function parseSaveEvents( saveEvents ) {
    let parsedSaveEvents = [];

    for( let saveEvent of saveEvents ) {
        const eventDataArray = saveEvent.eventData;
        if( eventDataArray ) {
            for( let eventData of eventDataArray ) {
                parsedSaveEvents[ eventData ] = {
                    eventObjectUid: saveEvent.eventObjectUid,
                    eventType: saveEvent.eventType
                };
                getRelatedEvents( saveEvent, eventData, saveEvents, parsedSaveEvents );
            }
        }
    }

    return parsedSaveEvents;
}
/**
 *  Parse delete event data
 * @param {Object} saveEvents - the save events returned from the soa server call
 * @returns {Object} parsedSaveEvents
 */
function parseSaveEventsData( eventDataArray, type ) {
    const parsedSaveEvents = [];

    if( eventDataArray ) {
        for( let eventData of eventDataArray ) {
            if( eventData.eventType === type ) {
                parsedSaveEvents.push( eventData.eventObjectUid );
            }
        }
    }

    return parsedSaveEvents;
}

/**
 * getRelatedEvents - process related events of a single event
 *
 * @param {Object} saveEvent single event
 * @param {Object} eventData Object
 * @param {Array} saveEvents all save events from server
 * @param {Array} parsedSaveEvents all events parsed
 */
function getRelatedEvents( saveEvent, eventData, saveEvents, parsedSaveEvents ) {
    const relatedEvents = saveEvent.relatedEvents;
    if( relatedEvents ) {
        parsedSaveEvents[ eventData ].relatedEvents = [];
        for( let relatedEvent of relatedEvents ) {
            for( let currSaveEvent of saveEvents ) {
                if( currSaveEvent.eventId === relatedEvent ) {
                    const eventType = currSaveEvent.eventType;
                    if( !parsedSaveEvents[ eventData ].relatedEvents[ eventType ] ) {
                        parsedSaveEvents[ eventData ].relatedEvents[ eventType ] = [];
                    }
                    parsedSaveEvents[ eventData ].relatedEvents[ eventType ].push( currSaveEvent.eventObjectUid );
                    break;
                }
            }
        }
    }
}

/**
 * getErrorCodes
 *
 * @param {Object} serviceData response
 * @returns {Array} error codes
 */
function getErrorCodes( serviceData ) {
    var errorCodes = [];
    if( serviceData && serviceData.partialErrors ) {
        var partialErrors = serviceData.partialErrors;
        for( var i in partialErrors ) {
            var errors = partialErrors[ i ].errorValues;
            for( var j in errors ) {
                errorCodes.push( errors[ j ].code );
            }
        }
    }
    return errorCodes;
}

/**
 * shouldIssuePartialError
 *
 * @param {Array} errorCodes errors from server
 * @returns {boolean} if should issue partial errors
 */
function shouldIssuePartialError( errorCodes ) {
    for( var index in errorCodes ) {
        if( !_.includes( ignorableErrorIds, errorCodes[ index ] ) ) {
            return true;
        }
    }
    return false;
}

/**
 * hasReviseError
 *
 * @param {Array} errorCodes errors from server
 * @returns {boolean} if one of the errors is revise
 */
function hasReviseError( errorCodes ) {
    return _.includes( errorCodes, REVISE_ERROR_CODE );
}

export default {
    performSaveChangesCall,
    saveChanges,
    parseSaveEvents
};
