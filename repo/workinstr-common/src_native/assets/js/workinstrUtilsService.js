// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/workinstrUtilsService
 */
import * as app from 'app';
import messagingSvc from 'js/messagingService';
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Parses the configuration preference. The values in the preference are in the following form <Relation or Property
 * Name>:optional comma separated type names Or <Panel Name>: comma separated tab names
 *
 * @param {String} preferenceValues the preference values
 * @return {StringArray} the parsed map
 */
export let parsePreferenceValues = function( preferenceValues ) {
    if( preferenceValues && preferenceValues.length > 0 ) {
        var parsedMap = [];
        for( var currentRow in preferenceValues ) {
            var tokens = preferenceValues[ currentRow ].split( ':' );
            if( tokens.length === 1 ) {
                // Only relation name
                // Make sure there are no , in the relation name
                if( tokens[ 0 ].split( ',' ).length > 1 ) {
                    messagingSvc.showError( 'Invalid prefernce value' );
                }
                parsedMap.push( {
                    relationName: tokens[ 0 ].trim(),
                    types: []
                } );
            } else if( tokens.length === 2 ) {
                // There are types
                var typesList = tokens[ 1 ].split( ',' );
                for( var currentType in typesList ) {
                    typesList[ currentType ] = typesList[ currentType ].trim();
                }

                parsedMap.push( {
                    relationName: tokens[ 0 ].trim(),
                    types: typesList
                } );
            } else {
                messagingSvc.showError( 'Invalid preference value' );
            }
        }

        return parsedMap;
    }
    return null;
};

/**
 * Add a relation and its types to all relations to load list
 *
 * @param {StringArray} allRelationsToLoad the list of all relations to load
 * @param {String} relationName the new relation to add to the all relations to load list
 * @param {StringArray} relationTypes the new relation types to add to the all relations to load list
 */
export let addRelationToAllRelationsToLoad = function( allRelationsToLoad, relationName, relationTypes ) {
    // If the list is empty, it means some data provider wants to load all related types for given relation.
    // in that case we should not add any specific filter types.
    if( relationTypes.length === 0 ) {
        allRelationsToLoad[ relationName ] = [];
    } else {
        var existingRelationTypes = allRelationsToLoad[ relationName ];
        if( existingRelationTypes && existingRelationTypes.length === 0 ) {
            return;
        }

        if( !existingRelationTypes ) {
            allRelationsToLoad[ relationName ] = [];
            existingRelationTypes = allRelationsToLoad[ relationName ];
        }

        for( var j in relationTypes ) {
            var currentRelationType = relationTypes[ j ];
            if( !this.isRelationTypeExist( existingRelationTypes, currentRelationType ) ) {
                existingRelationTypes[ existingRelationTypes.length ] = currentRelationType;
            }
        }
    }
};

/**
 * Does a relation type exist in the all relations to load list
 *
 * @param {StringArray} existingRelationTypes the list of the existing types in the relation
 * @param {String} relationType the relation type to check if already exist in the existingRelationTypes
 *
 * @return {Boolean} true if the relation type already exist in the existingRelationTypes list
 */
export let isRelationTypeExist = function( existingRelationTypes, relationType ) {
    if( existingRelationTypes ) {
        for( var i in existingRelationTypes ) {
            if( existingRelationTypes[ i ] === relationType ) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Add array values to array list
 *
 * @param {Array} theArrayList the existing array list
 * @param {Array} valuesToAdd the new values to add to the existing list
 *
 * @return {Array} the updated array with the new values
 */
export let addArrayValuesToArrayList = function( theArrayList, valuesToAdd ) {
    if( !theArrayList ) {
        return valuesToAdd;
    }
    valuesToAdd.forEach( function( element ) {
        theArrayList.push( element );
    } );
    return theArrayList;
};

/**
 * Navigates to the object with the given uid
 *
 * @param {string} objUid - the object uid to go to
 */
export let navigateToObject = function( objUid ) {
    if( objUid ) {
        AwStateService.instance.params.uid = objUid;
        AwStateService.instance.go( '.', AwStateService.instance.params );
        eventBus.publish( 'awPopup.close' );
    }
};

/**
 * Remove a value from array list
 *
 * @param {Array} theArrayList the existing array list
 * @param {Array} valueToRemove the value to remove from the existing list
 *
 * @return {Array} the updated array without the removed value
 */
export let removeArrayValueFromArrayList = function( theArrayList, valueToRemove ) {
    theArrayList = theArrayList.filter( function( item ) {
        return item !== valueToRemove;
    } );
    return theArrayList;
};

/**
 * Set the tools & info markup context dataset in case there is more than one PDF displayed on different viewers
 *
 * @param {Object} commandCtx the command context
 * @param {Object} currViewerCtx the current vuewer context
 */
export let setMarkupContext = function( commandCtx, currViewerCtx ) {
    // Close markup panel
    var eventData = {
        source: 'toolAndInfoPanel'
    };
    eventBus.publish( 'complete', eventData );

    if( !( currViewerCtx && currViewerCtx.commandCtx === commandCtx ) ) {
        var commandGalleryPanel = commandCtx.myGalleryPanel;
        var pdfFrame = commandGalleryPanel.getViewerContainer();

        var selectedDataset = commandCtx.datasetData;
        var ctx = {
            vmo: selectedDataset,
            commands: {},
            pdfFrame: pdfFrame,
            type: 'aw-pdf-viewer',
            commandCtx: commandCtx
        };
        appCtxSvc.registerCtx( 'viewerContext', ctx );
    }
};

/**
 * Clear markup viewerContext when toolsAndInfoPanel gets closed
 */
eventBus.subscribe( 'complete', function( eventData ) {
    // check if markup was registered to the context
    if( eventData && eventData.source === 'toolAndInfoPanel' ) {
        // if markup was registered then hide markup command panel if it was previously visible
        appCtxSvc.unRegisterCtx( 'viewerContext' );
    }
}, 'workinstrUtilsService' );

/**
 * A glue code
 *
 * @param {Object} messagingSvc - messagingService
 * @param {Object} $state - $state
 * @param {Object} appCtxSvc - appCtxService

 * @return {Object} - Service instance
 *
 * @member workinstrUtilsService
 */

export default exports = {
    parsePreferenceValues,
    addRelationToAllRelationsToLoad,
    isRelationTypeExist,
    addArrayValuesToArrayList,
    navigateToObject,
    removeArrayValueFromArrayList,
    setMarkupContext
};
app.factory( 'workinstrUtilsService', () => exports );
