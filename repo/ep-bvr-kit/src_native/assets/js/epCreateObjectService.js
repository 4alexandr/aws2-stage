// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * create object service for EasyPlan.
 *
 * @module js/epCreateObjectService
 */

import _ from 'lodash';
import 'soa/preferenceService';
import 'soa/kernel/clientDataModel';
import 'js/addObjectUtils';
import clientMetaModel from 'soa/kernel/clientMetaModel';
import soaService from 'soa/kernel/soaService';
import dmService from 'soa/dataManagementService';
import preferenceSvc from 'soa/preferenceService';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import uwPropertyService from 'js/uwPropertyService';
import eventBus from 'js/eventBus';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import appCtxService from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import epBvrObjectService from 'js/epBvrObjectService';

'use strict';

const createTypePrefNamePrefix = 'EP_CreateSubtypesForType_';
const newObjectIDStd = 'new_object_id';
const revisionPropPrefix = 'revision__';

/**
 * This method returns the type of object to be created based on preference
 * @param { String } objectBaseType - Object base type
 * @param { StringArray } subTypeExclusionList - Exclusion list
 * @return {Object} the type list
 */
export function ensureCreateObjectTypesLoadedJs( objectBaseType, subTypeExclusionList) {
    const prefName = createTypePrefNamePrefix + objectBaseType;
    const prefNames = [ prefName ];

    return preferenceSvc.getStringValues( prefNames )
        .then(
            function( values ) {
                return (values && values.length > 0 && values[0] !== null)? getAvailableModelTypes( objectBaseType, values, subTypeExclusionList):
                getDefaultAvailableModelTypes( objectBaseType, subTypeExclusionList);
            } );
}

/**
 * This method returns the available type based on preference values
 * @param { String } objectBaseType - Object Base Type
 * @param { StringArray } values - Value of the preference
 * @param { StringArray } subTypeExclusionList - Exclusion list
 * @return {StringArray} - List of type value strings
 */
function getAvailableModelTypes( objectBaseType, values, subTypeExclusionList) {
    return soaService.ensureModelTypesLoaded( values )
        .then( () => {
                let typesListInfo = [];

                values.map( val => {
                    const modelType = clientMetaModel.getType( val );
                    modelType.typeHierarchyArray.includes( objectBaseType) && typesListInfo.push( modelType );
                });

                let typeList = [];
                const filteredModelTypes = filterModelTypes( typesListInfo, subTypeExclusionList );
                for( const filteredType of filteredModelTypes ) {
                    typeList.push( filteredType.uid );
                }
                return dmService.loadObjects( typeList ).then( () => {
                    const returnedData = {
                        searchResults: filteredModelTypes,
                        totalFound: filteredModelTypes.length
                    };
                    return returnedData;
                } );

        } );
}

/**
 * This method returns the available type based on object type
 * @param { String } objectBaseType - Object base type
 * @param { StringArray } subTypeExclusionList - Exclusion list
 * @return { StringArray } - List of type value strings
 */
function getDefaultAvailableModelTypes( objectBaseType, subTypeExclusionList) {
    let findBoDisplayableNamesSoaInputs = [];
    let typesList = [];

    let findBoDisplayableNamesInputObject = {};
    findBoDisplayableNamesInputObject.boTypeName = objectBaseType;
    findBoDisplayableNamesInputObject.exclusionBOTypeNames = subTypeExclusionList;

    findBoDisplayableNamesSoaInputs.push( findBoDisplayableNamesInputObject );

    let inputData = {};
    inputData.input = findBoDisplayableNamesSoaInputs;

    return soaService.postUnchecked( 'Core-2010-04-DataManagement', 'findDisplayableSubBusinessObjectsWithDisplayNames', inputData )
        .then( function( result ) {
            result.output && result.output.forEach( out => {
                out.displayableBOTypeNames && out.displayableBOTypeNames.forEach( typeInfo => {
                    typesList.push( typeInfo.boName );
                } );
            } );
            return getAvailableModelTypes( objectBaseType, typesList );
        } );
}

/**
 * Filter the type list
 *
 * @param {ObjectArray} typeListInfo - Type list object Array
 * @param {StringArray} subTypeExclusionList - List of exclusion strings
 * @returns {String } filtered array
 */
function filterModelTypes( typeListInfo, subTypeExclusionList ) {
    let filteredTypeList =[];
    if( subTypeExclusionList && subTypeExclusionList.length > 0 && typeListInfo && typeListInfo.length > 0 ) {
        filteredTypeList = typeListInfo.map( type => {
            let typeHierarchy = [];
            typeHierarchy = type.typeHierarchyArray;

            const typeFoundInExclusion = subTypeExclusionList.findIndex( ( modelType ) => { typeHierarchy.includes( modelType ); } );

            if( typeFoundInExclusion ) {
                return type;
            }
        } );
    }else{
        filteredTypeList = typeListInfo;
    }
    return filteredTypeList;
}

/**
 * Clear selected type when user click on type link on create form
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export function clearSelectedType( data ) {
    data.selectedType.dbValue = '';
    eventBus.publish( "initializeGetCreatableObjectTypesDataProvider" );
    eventBus.publish( "epCreateObject.assignProjects", { "selectedProjects": [] } );
}

/**
 * When user select type from type selection panel of create we need to navigate to create form. This method
 * will set few variable to hide type selector panel and to show create form.
 * @param {Object} data - The panel's view model object
 */
export function handleTypeSelectionJs( data ) {
    let selectedType = data.dataProviders.getCreatableObjectTypes.selectedObjects;
    data.selectedType.dbValue = '';
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        let vmProperty = uwPropertyService.createViewModelProperty( selectedType[ 0 ].props.object_string.dbValue,
            selectedType[ 0 ].props.object_string.dbValue, 'STRING', '', '' );
        data.displayedType.dbValue = vmProperty.propertyDisplayName;
 }
}

/**
 * Register the policy
 *
 * @return {Object}  null
 */
function registerPolicy() {
    const createObjectPolicy = {
        types: [ {
            name: 'ImanItemBOPLine',
            properties: [ {
                name: epBvrConstants.BL_ITEM
            },
            {
                name: epBvrConstants.BL_PARENT
            }]
        } ]
    };
    return propPolicySvc.register( createObjectPolicy );
}

function getItemOrRevisionProperties(data){
    const propertiesMap = new Object();
    const itemProperties = new Object();
    const revisionProperties = new Object();

    data.objCreateInfo.propNamesForCreate.forEach( propName => {
        const vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || uwPropertyService.isModified( vmProp ) ) ) {
            const valueStrings = uwPropertyService.getValueStrings( vmProp );
            if( propName.startsWith( revisionPropPrefix ) ) {
                revisionProperties[ propName.slice( revisionPropPrefix.length ) ] = valueStrings;
            } else {
                itemProperties[ propName ] = valueStrings;
            }
        }
    } );

    itemProperties && (propertiesMap.itemPropMap = itemProperties);
    revisionProperties && (propertiesMap.revPropMap = revisionProperties);
    return propertiesMap;
}

/**
 * Calls the save service to create the object.
 * @param {Object} data - The panel's view model object
 * @param { Object } connectedTo - The object to connect
 * @param { String } policyId - policy Id
 * @param { Object } workPackage - workPackage
 * @param { String } reloadType - reloadType
 * @param { Object } predecessor - predecessor object
 * @param { boolean } isResequenceNeeded - flag to check resequencing of objects
 */
export function createObject( data, connectedTo, policyId, workPackage, reloadType, predecessor, isResequenceNeeded) {

    let relModelObject;
    let relatedObjects;
    const newObjectId = newObjectIDStd + Math.random().toString();
    const object = {
        id: newObjectId,
        Type: data.selectedType.dbValue
    };

    if( connectedTo ) {
        object.connectTo = connectedTo.uid;
        relModelObject = {
            uid: connectedTo.uid,
            type: connectedTo.type
        };
        relatedObjects = [ relModelObject ];
    }

    const propertiesMap = getItemOrRevisionProperties(data);

    policyId.dbValue = registerPolicy();

    const saveWriter = saveInputWriterService.get();

    saveWriter.addCreateObject( object, propertiesMap );

    // Add resequence modify section
    //TODO :Resquencing of operations should be handled from server.Once that is done , this section should be removed.
    const resequencedChildren = isResequenceNeeded && addObjectsToResequence( predecessor, connectedTo, object, saveWriter );
    relatedObjects = resequencedChildren ? relatedObjects.concat( resequencedChildren ) : relatedObjects;

    //check for reload type
    reloadType && addReloadSection(saveWriter, newObjectId, reloadType);

    if(workPackage){
        const ccObjects = addObjectToCCSection(saveWriter, workPackage, object);
        relatedObjects = relatedObjects ? [ ...relatedObjects, ccObjects.ccModelObject, ccObjects.revRuleObj ] : [ ccObjects.ccModelObject, ccObjects.revRuleObj ];
    }
    const serviceResponse = epSaveService.saveChanges( saveWriter, true, relatedObjects);
    return Promise.resolve( serviceResponse );
}

function addObjectsToResequence( before, parent, newObj, saveWriter ){
    //will work just for classic BOP
    const children = epBvrObjectService.getSequencedChildren( parent, epBvrConstants.MFG_SUB_ELEMENTS );
    if( children ) {
        const base_Seq_no = 10;
        const seq_no_interval = 10;
        let seq_no = base_Seq_no;

        children.sort((child1, child2) => (child1.props.bl_sequence_no.dbValues[0] > child2.props.bl_sequence_no.dbValues[0]) ? 1 : -1);
        const index = children.findIndex(child => child.uid === before.uid);
        children.splice(index + 1, 0, newObj);
        children.forEach(child => {
            modifySequenceNumberProperty( child.uid ? child.uid : child.id, seq_no, saveWriter);
            seq_no += seq_no_interval;
        });
    }
    return children;
}

function modifySequenceNumberProperty( objUid, seq_no, saveWriter ){
    const seqArray = new Array( "" + seq_no );
    saveWriter.addModifiedProperty( objUid, epBvrConstants.BL_SEQUENCE_NO, seqArray );
}

function addObjectToCCSection(saveWriter, workPackage, object){
    const ccObject ={
        id:[workPackage]
    };
    const objectToAddInCC ={
        Add:[object.id],
        revisionRule: [ appCtxService.ctx.userSession.props.awp0RevRule.value ]
    };
    const ccModelObject = cdmSvc.getObject( workPackage );
    const revRuleObj = cdmSvc.getObject( appCtxService.ctx.userSession.props.awp0RevRule.value );
    saveWriter.addObjectToCC(ccObject,objectToAddInCC);
    return {
        ccModelObject: ccModelObject,
        revRuleObj: revRuleObj
    };
}

/**
 *
 * @param {Object} saveInputWriter Input writer instance to add entry
 * @param {VMO} newObjUid newObjUid
 * @param {String} reloadType reload type
 */
function addReloadSection( saveInputWriter, newObjUid, reloadType ) {

    const objToReload = {
        "objectUid": [
            newObjUid
        ]
    };
    const loadType = {
        "loadType": [ reloadType]
    };
    saveInputWriter.addReloadSectionWithObject( loadType, objToReload );
}

export function generateObjectToAssign( data ) {
    if( data.saveResults && data.saveEvents.length > 0 ) {
        const creaedObjectUId = data.saveResults[ 1 ].saveResultObject.uid;
        let uid;
        _.forEach( data.saveEvents, function( saveEvents ) {
            if( saveEvents.eventType === 'modifyPrimitiveProperties' && saveEvents.eventData[ 0 ] === 'bl_item' ) {
                uid = saveEvents.eventData[ 1 ];
            }
        } );
        return {
            type: data.ServiceData.modelObjects[ creaedObjectUId ].type,
            uid: uid
        };
    }
}
function filterProjectList( filterString, projectList ) {
    let filteredProjectCCs = [];
    let projectNamesMap = {};
    if( filterString.length > 0 ) {
        const projectCCNames = projectList.map(cc=> {
            const ccName = cc.props.object_string.dbValues[ 0 ];
            projectNamesMap[ ccName ] = cc;
            return ccName;
        } );

        const filteredProjectNames = projectCCNames.filter( element => {
            return element.toLowerCase().indexOf( filterString.toLowerCase() ) !== -1;
        } );

        filteredProjectCCs = filteredProjectNames.map( ccName => projectNamesMap[ ccName ] );
    }
    return filteredProjectCCs[ 0 ];
}
export function showAssignedProject( availableProject, selectedProject ) {

    const assignedProjects = _.map( selectedProject, element => filterProjectList( element.cellHeader1, availableProject ) );

    eventBus.publish( "epCreateObject.assignProjects", { "selectedProjects": assignedProjects } );
}
export function removeSelectedProject( projectToRemove, projectList ) {
    projectList = (projectList.assignedProjectList && projectList.assignedProjectList.dbValues) ? projectList.assignedProjectList.dbValues :projectList;
    const projectArray = projectList.filter(project => projectToRemove.uid !==project.uid );
    eventBus.publish( "epCreateObject.assignProjects", { "selectedProjects": projectArray } );
}

let exports = {};
export default exports = {
    ensureCreateObjectTypesLoadedJs,
    clearSelectedType,
    handleTypeSelectionJs,
    createObject,
    showAssignedProject,
    removeSelectedProject,
    generateObjectToAssign
};
