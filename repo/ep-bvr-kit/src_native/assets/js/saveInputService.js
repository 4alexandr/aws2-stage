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
 * @module js/saveInputService
 */

import { constants as epSaveConstants } from 'js/epSaveConstants';
import epSessionService from 'js/epSessionService';
import _ from 'lodash';

'use strict';
export default class SaveInput {
    constructor() {
        this.sections = {};
        this.relatedObjects = {};
        this.prepareNameToValuesMap = prepareNameToValuesMap.bind( this );
    }

    addEntryToSection( sectionName, entry ) {
        let section = this.sections[ sectionName ];
        if( !section ) {
            section = {
                sectionName: sectionName,
                dataEntries: []
            };
            this.sections[ sectionName ] = section;
        }

        section.dataEntries.push( { entry } );
    }

    getSection( sectionName ) {
        return this.sections[sectionName];
    }

    addAlternativeInput( object, inputObj, ALTERNATIVE_UID ) { // do we need to check is there already a entry for this objectid?
        if( object ) {
            const entry = {};
            entry.Object = this.prepareNameToValuesMap( {
                alternativeCCClientID: ALTERNATIVE_UID,
                sourceId: object.uid,
                altPlBOPName: inputObj.newPlantBOPName,
                openOnCreate: inputObj.isPartial.toString()
            } );
            entry.AlternativeProps = this.prepareNameToValuesMap( {
                altCCName: inputObj.newPackageName,
                description: inputObj.newDescription
            } );

            this.addEntryToSection( epSaveConstants.CREATE_ALTERNATIVE, entry );
        }
    }

    addSessionInformation( performCheck ) {
        this.sections[ epSaveConstants.SESSION ] = epSessionService.getSessionSection( performCheck );
    }

    addRelatedObjects( objects ) {
        _.forEach( objects, object => {
            this.relatedObjects[ object.uid ] = {

                uid: object.uid,
                type: object.type
            };
        } );
    }

    addReloadSection( loadInput ) {
        if (loadInput && loadInput.dataEntries) {
            this.sections[epSaveConstants.RELOAD] = {
                sectionName: epSaveConstants.RELOAD,
                dataEntries: loadInput.dataEntries
            };
        }
    }

    //TODO : This function is deprecated and should be removed from next version 
    //addReloadSection function should be called instead.
    addReloadSectionWithObject(loadType, objToLoad) {
        const entry = {
            typeToLoad: prepareNameToValuesMap( loadType ),
            objectToLoad: prepareNameToValuesMap( objToLoad )
        };
        this.addEntryToSection( epSaveConstants.RELOAD, entry );
    }  

    addReviseInput( reviseObject ) {
        if( reviseObject ) {
            const entry = {
                Object: prepareNameToValuesMap( {
                    id: reviseObject.uid
                } )
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_REVISE, entry );
        }
    }

    addTimeUnit( timeUnitId ) {
        if( timeUnitId ) {
            const entry = {
                [ epSaveConstants.TIME_UNITS ]: prepareNameToValuesMap( { id: timeUnitId } )
            };
            this.addEntryToSection( epSaveConstants.TIME_UNITS, entry );
            this.addIgnoreReadOnlyMode();
        }
    }

    addIgnoreReadOnlyMode() {
        this.ignoreReadOnlyMode = true;
    }

    addReportInput( reportObject ) {
        if( reportObject ) {
            const entry = {
                Object: prepareNameToValuesMap( reportObject )
            };
            this.addEntryToSection( epSaveConstants.CREATE_REPORT, entry );
        }
    }

    addDeleteObject( delObject ) {
        if( delObject ) {
            const entry = {
                Object: prepareNameToValuesMap( delObject )
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_DELETE, entry );
        }
    }

    addMoveObject( moveObject, parentObject ) { // do we need to check is there already a entry for this objectid?
        const entry = {};
        if( moveObject ) {
            entry.Object = prepareNameToValuesMap( moveObject );
        }
        if( parentObject ) {
            entry.RefProp = prepareNameToValuesMap( parentObject );
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    addAssignedTools( object, toolsAddObject, toolsRemObject ) { // do we need to check is there already a entry for this objectid?
        const entry = {};
        if( object ) {
            entry.Object = prepareNameToValuesMap( object );
        }
        if( toolsAddObject ) {
            entry.AssignedTools = prepareNameToValuesMap( toolsAddObject );
        }
        if( toolsRemObject ) {
            entry.AssignedTools = prepareNameToValuesMap( toolsRemObject );
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    addRemoveOrAddObjects( actionType, objectUid, objectsList, entryName, relationType ) {
        const entry = {};
        if( objectUid ) {
            entry.Object = prepareNameToValuesMap( {
                id: [ objectUid ]
            } );
        }
        if( objectsList ) {
            entry[ entryName ] = {
                nameToValuesMap: {}
            };
            entry[ entryName ].nameToValuesMap[ actionType ] = objectsList;
            if( relationType ) {
                entry[ entryName ].nameToValuesMap.relationType = [ relationType ];
            }
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    addCloneObject( object ) {
        if( object ) {
            const entry = {
                Object: prepareNameToValuesMap( object )
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_CLONE, entry );
        }
    }
    addSyncObject( object ) {
        if( object ) {
            const entry = {
                syncTwin: prepareNameToValuesMap( object )
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
        }
    }
    addPredecessor( predecessorInfo ) {
        if( predecessorInfo ) {
            const successorObjMap = prepareNameToValuesMap( {
                id: predecessorInfo.objectId
            } );
            const predecessorObjMap = prepareNameToValuesMap( {
                Add: predecessorInfo.predecessorId
            } );
            const entry = {
                Object: successorObjMap,
                Predecessors: predecessorObjMap
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
        }
    }

    addSuccessor (successorInfo) {
        if (successorInfo) {
            const objMap = prepareNameToValuesMap({
                id: successorInfo.objectId
            });

            const predMap = prepareNameToValuesMap({
                Add: successorInfo.successorId
            });
            const entry = {
                Object: objMap,
                Successors: predMap
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry);
        }
    }

    deleteFlow( flowObject ) {
        if( flowObject ) {
            const successorObjMap = prepareNameToValuesMap( {
                id: flowObject.toId
            } );
            const predecessorObjMap = prepareNameToValuesMap( {
                Remove: flowObject.fromId
            } );
            const entry = {
                Object: successorObjMap,
                Predecessors: predecessorObjMap
            };
            this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
        }
    }

    addUpdateWorkInstructions( objectID, bodyTextProp, epwBodyTextProp, datasetsToAdd, addStxElement ) {
        var entry = {};

        if( objectID ) {
            entry.Object = prepareNameToValuesMap( {
                id: [ objectID ]
            } );
        }
        const nameToValuesMap = {
            DatasetID: epSaveConstants.DATASET_ID,
            body_text: bodyTextProp,
            epw0body_text2: epwBodyTextProp
        };
        if( datasetsToAdd ) {
            nameToValuesMap.Add = datasetsToAdd;
        }

        if( addStxElement && addStxElement.length > 0 ) {
            nameToValuesMap.addStxElement = addStxElement;
        }

        entry.WIData = prepareNameToValuesMap( nameToValuesMap );

        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    addModifiedProperty( objectId, propertyName, propertyValues ){
        const modifySection = this.getSection(epSaveConstants.OBJECTS_TO_MODIFY);

        if (modifySection && modifySection.dataEntries.length > 0) {
            for (let i = 0; i < modifySection.dataEntries.length; ++i) {
                if (modifySection.dataEntries[i].entry.Object.nameToValuesMap.id[0] === objectId) {
                    if (propertyValues) {
                        if (modifySection.dataEntries[i].entry.Prop) {
                            modifySection.dataEntries[i].entry.Prop.nameToValuesMap[propertyName] = propertyValues;
                            return;
                        }

                        const propData = prepareNameToValuesMap({});
                        propData.nameToValuesMap[propertyName] = propertyValues;
                        modifySection.dataEntries[i].entry.Prop = propData;
                        return;
                    }
                    modifySection.dataEntries[i].entry.Prop.nameToValuesMap[propertyName] = [""];
                    return;
                }
            }
        }

        const propData = prepareNameToValuesMap({});
        propData.nameToValuesMap[propertyName] = propertyValues ? propertyValues : '';

        const entry = {
            Object: prepareNameToValuesMap({
                id: objectId
            }),
            Prop: propData
        };
        this.addEntryToSection(epSaveConstants.OBJECTS_TO_MODIFY, entry);
    }

    addCreateObject( objectMap, propMap ) {
        var entry = {};
        if( objectMap ) {
            entry.Object = prepareNameToValuesMap( objectMap );
        }
        if( propMap.itemPropMap ) {
            entry.ItemProps = prepareNameToValuesMap( propMap.itemPropMap );
        }
        if( propMap.revPropMap ) {
            entry.RevProps = prepareNameToValuesMap( propMap.revPropMap );
        }
        if( propMap.morePropMap ) {
            _.forOwn( propMap.morePropMap, function( value, key ) {
                entry.Object.nameToValuesMap[ key ] = [ value ];
            } );
        }
        if( propMap.additionalPropMap ) {
            entry.AdditionalProps = prepareNameToValuesMap( propMap.additionalPropMap );
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_CREATE, entry );
    }
    /**
     * @param {Object} object
     * @param {AssignedParts} partsAddObject and partsRemObject
     */

    addAssignedParts( object, partsAddObject, partsRemObject ) {
        var entry = {};
        if( object ) {
            entry.Object = prepareNameToValuesMap( object );
        }
        if( partsAddObject ) {
            entry.AssignedParts = prepareNameToValuesMap( partsAddObject );
        }
        if( partsRemObject ) {
            entry.AssignedParts = prepareNameToValuesMap( partsRemObject );
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    /**
     * @param {Object} object
     * @param {Object} objectToAdd input for ConnectedStructures
     */
    addObjectToCC( object, objectToAdd ) {
        var entry = {};
        if( object ) {
            entry.Object = prepareNameToValuesMap( object );
        }
        if( objectToAdd ) {
            entry.ConnectedStructures = prepareNameToValuesMap( objectToAdd );
        }
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    /**
     * array of variant formula data
     * @param { Array } variantFormulaData each object represents a model object with it's variant selection
     */
    addVariantFormula( variantFormulaData ) {
        if( variantFormulaData ) {
            _.forEach( variantFormulaData, data => {
                const entry = {
                    Object: prepareNameToValuesMap( {
                        id: data.uid
                    } ),
                    VariantFormulaInput: prepareNameToValuesMap( data.expression )
                };
                this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
            } );
        }
    }

    /**
     * @param { Object } occurrenceEffectivityObj occurence effectivity object
     */
    saveOccurrenceEffectivity( occurrenceEffectivityObj ) {
        var entry = {};
        entry.Object = prepareNameToValuesMap( {
            id: [ occurrenceEffectivityObj.objectUID ]
        } );
        var nameToValuesMap = {
            action: occurrenceEffectivityObj.actionType,
            id: occurrenceEffectivityObj.unitObjectID,
            unit: occurrenceEffectivityObj.unit,
            endItem: occurrenceEffectivityObj.endItem
        };
        entry.OccurrenceEffectivity = prepareNameToValuesMap( nameToValuesMap );
        this.addEntryToSection( epSaveConstants.OBJECTS_TO_MODIFY, entry );
    }

    /**
     * @param workflowObject
     */

    addWorkflowInput( workflowObject ) {
        if( workflowObject ) {
            const entry = {
                Prop: prepareNameToValuesMap( workflowObject )
            };
            this.addEntryToSection( epSaveConstants.CREATE_WORKFLOW, entry );
        }
    }

}

/**
 * @param { Object } properties properties
 * @returns { Object } nameValueMap
 */
function prepareNameToValuesMap( properties ) {
    const nameToValuesMap = {};

    _.forOwn( properties, function( value, key ) {
        if( Array.isArray( value ) ) {
            nameToValuesMap[ key ] = value;
        } else {
            nameToValuesMap[ key ] = [ value ];
        }
    } );
    return { nameToValuesMap };
}
