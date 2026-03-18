// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import dmsSvc from 'soa/dataManagementService';
import preferenceSvc from 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
import clientMetaModel from 'soa/kernel/clientMetaModel';
import ngpSoaSvc from 'js/services/ngpSoaService';
import vmoSvc from 'js/viewModelObjectService';
import ngpPropertyConstants from 'js/constants/ngpPropertyConstants';

import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import dateTimeService from 'js/dateTimeService';
import popupSvc from 'js/popupService';
import ngpModelConstants from 'js/constants/ngpModelConstants';
import ngpModelUtils from 'js/utils/ngpModelUtils';
import eventBus from 'js/eventBus';


/**
 * NGP Create Object service
 *
 * @module js/services/ngpCreateObjectService
 */
'use strict';


/**
 * Map of property type with its corresponding place name.
 */
const TYPE_TO_PLACE = {
    CHAR: 'stringProps',
    STRING: 'stringProps',
    STRINGARRAY: 'stringArrayProps',
    BOOLEAN: 'boolProps',
    BOOLEANARRAY: 'boolArrayProps',
    DATE: 'dateProps',
    DATEARRAY: 'dateArrayProps',
    OBJECT: 'tagProps',
    OBJECTARRAY: 'tagArrayProps',
    DOUBLE: 'doubleProps',
    DOUBLEARRAY: 'doubleArrayProps',
    INTEGER: 'intProps',
    INTEGERARRAY: 'intArrayProps'
};
const typeNameToAGList = [];
const ATTACHED_ATTRIBUTE_GROUPS_PROPERTY_NAME = 'mpr0AttachedAttributeGroups';
/**
 * call create object SOA
 *
 * @param {Object} pageSelection page selected object
 * @param {Object} pageContext page context
 * @param {boolean} createSibling cretae as sibling for the selected object
 * @param {Object} viewModelData of the view model
 */
export function callCreateObject( pageSelection, pageContext, createSibling, viewModelData ) {
    const index = findDisplayedFormIndex( viewModelData );
    saveCurrentXrtData( viewModelData, viewModelData.XRTFormsInfo[index] );
    const inputData = { input : [ {
        clientId: 'tc-mfg-web',
        data: getCreateInputData( pageSelection, pageContext, createSibling, viewModelData ) } ] };
    return ngpSoaSvc.executeSoa( 'Core-2008-06-DataManagement', 'createObjects', inputData )
    .then( ( response ) => {
        const parentObject1 = cdm.getObject(response.ServiceData.updated[0]);
        const childrenCreated = response.ServiceData.created
                                .map((uid) => cdm.getObject(uid) )
                                .filter((object) => object.modelType.name === viewModelData.XRTFormsInfo[0].createType);
        const parentObjectProperty = ngpModelUtils.getParentPropertyName( childrenCreated[0]);
        const parentObject = cdm.getObject(childrenCreated[0].props[parentObjectProperty]);
        eventBus.publish( 'ngp.objectCreated', {
            parentObject,
            childrenCreated
        } );
    });
}
/**
 * Return  the list of AG for a given tpe name
 * @param {String} typeName - the type name which attributs groups are associtae with
 * @returns {Promise} - promise which return list all types
 */
function extractAttributeGroupsToCreateWithNewObject( typeName ) {
    if ( typeNameToAGList[typeName] ) {
        return new Promise( resolve => resolve( typeNameToAGList[typeName] ) );
    }

    const inputData = {
        keys: [ {
            constantName:ngpModelConstants.AG_CREATION_TYPES,
            typeName
        } ]
    };

    return ngpSoaSvc.executeSoa( 'BusinessModeler-2007-06-Constants', 'getTypeConstantValues', inputData )
    .then( ( result ) => {
        if( result.constantValues ) {
            typeNameToAGList[typeName] =  result.constantValues
            .map( ( agType ) => agType.value )
            .filter( ( value ) => value !== '' );
            return typeNameToAGList[typeName];
        }
    } );
}

/**
 * create input object for create object SOA under parent
 *
 * @param {Object} pageSelection page selected object
 * @param {Object} pageContext page context
 * @param {boolean} createSibling create as sibling for selected object
 * @param {Object} viewModelData of the view model
 * @returns {Object} input for create object SOA
 */
function getCreateInputData( pageSelection, pageContext, createSibling, viewModelData ) {
    viewModelData.XRTFormsInfo.forEach( ( XRTFormInfo, index ) => {
        if ( index === 0  ) {
            let parentContext = pageContext ? pageContext : null;
            if ( Array.isArray( pageSelection ) && pageSelection.length > 0 ) {
                parentContext = pageSelection[0];
            }
            if ( createSibling ) {
            const parentPropName = ngpModelUtils.getParentPropertyName( parentContext );
            const newParentUid = parentContext.props[parentPropName].dbValues[0];
            parentContext = cdm.getObject( newParentUid );
            }
            const parentObject = cdm.getObject(parentContext.uid);
            const tagProps =  {
                mdl0model_object: {
                    type:cdm.getObject( parentObject.props[ngpPropertyConstants.MANUFACTURING_MODEL].dbValues[0] ).type,
                    uid:parentObject.props[ngpPropertyConstants.MANUFACTURING_MODEL].dbValues[0]
                }
            };
            const parentContextProppertyName = ngpModelUtils.getParentPropertyName( parentObject );
            tagProps[parentContextProppertyName] = {
                type:parentObject.type,
                uid:parentObject.uid
            };


            viewModelData.mainObjectToCreate =  {
                boName:  XRTFormInfo.createType,
                tagProps
            };
            viewModelData.mainObjectToCreate.compoundCreateInput = { };
            viewModelData.mainObjectToCreate.compoundCreateInput[ATTACHED_ATTRIBUTE_GROUPS_PROPERTY_NAME] = [];
            setPropsForXRTObject( XRTFormInfo, viewModelData.mainObjectToCreate );
        }else{
            const attGroupObject = createAGCreateObject( viewModelData, XRTFormInfo );
            viewModelData.mainObjectToCreate.compoundCreateInput[ATTACHED_ATTRIBUTE_GROUPS_PROPERTY_NAME].push( attGroupObject );
        }
    } );
    return viewModelData.mainObjectToCreate;
}
/**
 * in case we have dpendend AG for a given object we need to create relevant data for it
 * for the soa input
 * @param {object} viewModelData model data
 * @param {object} XRTFormInfo xrt info
 */
function createAGCreateObject( viewModelData, XRTFormInfo ) {
    const tagProps = {
        mdl0model_object:  viewModelData.mainObjectToCreate.tagProps.mdl0model_object
    };
    const attGroupObject = {
        boName:  XRTFormInfo.createType,
        tagProps
    };
    setPropsForXRTObject( XRTFormInfo, attGroupObject );

    return attGroupObject;
}


/**
 * Extract the value form the XRT to create object soa input
 * @param {object} XRTFormInfo xrt form info
 * @param {object} objectToCreate this is the creation object for soa input
 */
function setPropsForXRTObject( XRTFormInfo, objectToCreate ) {
    XRTFormInfo.propNamesForCreate.forEach( ( property )=>{
        const propertyValue = XRTFormInfo.filledFormData[property];
        const valueTypeKey = TYPE_TO_PLACE[propertyValue.type];

        if ( !objectToCreate[valueTypeKey] ) {
            objectToCreate[valueTypeKey] = {};
        }
        if ( valueTypeKey.indexOf( 'date' ) > -1 ) {
            const dateObject = new Date( propertyValue.dbValue );
            objectToCreate[valueTypeKey][property] = dateTimeService.formatUTC( dateObject );
        }else{
            objectToCreate[valueTypeKey][property] = propertyValue.dbValue;
        }
   } );
}

/**
  * extract type list from given prefernce.
  *
  * @param {String} prefName - the prefernce that save the list of types
  * @param {String} objectBaseType - the base type that is relevant to creation
  * @returns {String[]} list of types that can be created
  */
export function getCreatableItemTypes( prefName, objectBaseType ) {
     const prefNames = [ prefName ];
    return preferenceSvc.getStringValues( prefNames )
    .then( ( values ) => {
                if( values && values.length > 0 && values[ 0 ] !== null ) {
                    return getAvailableModelTypes( objectBaseType, values, true );
                }

                //Handle the case when value is empty
                return getDefaultAvailableModelTypes( objectBaseType );
            } );
}

/**
 * This method returns the available type based on preference values
 * @param { String } objectBaseTypeName - Object Base Type
 * @param { StringArray } listOfTypes - list of possible types,
 * @param { boolean } listOfTypesFromPrefernce - flag to indicate the source of list
 * @return {VMO[]} - List of VMO for types value
 */
function getAvailableModelTypes( objectBaseTypeName, listOfTypes, listOfTypesFromPrefernce ) {
    return soaService.ensureModelTypesLoaded( listOfTypes )
        .then(
            () => {
                const validTypesUids = [];
                listOfTypes.forEach( ( typeName ) => {
                    const modelType = clientMetaModel.getType( typeName );
                    if( cmm.isInstanceOf( objectBaseTypeName, modelType ) ) {
                        validTypesUids.push( modelType.uid );
                    }
                } );

                if( validTypesUids.length > 0 ) {
                    return dmsSvc.loadObjects( validTypesUids )
                        .then(
                            () => dmsSvc.getProperties( validTypesUids, [ 'type_name' ] )
                        )
                        .then(
                            () => validTypesUids.map( function( uid ) {
                                const objectForUid = cdm.getObject( uid );
                                const vmo =  vmoSvc.constructViewModelObject( objectForUid );
                                if ( !vmo.props.type_name.uiValue ) {
                                   vmo.props.type_name.uiValue = objectForUid.props.type_name.uiValues[0];
                                }
                                return vmo;
                            }
                        ) );
                }
                if( listOfTypesFromPrefernce ) {
                    return getDefaultAvailableModelTypes( objectBaseTypeName );
                }

                //this line is relevnt in case no type found
                return [];
            } );
}

/**
 * This method returns the available type based on object type
 * @param { String } objectBaseType - Object base type
 * @return {VMO[]} - List of VMO for types value
 */
function getDefaultAvailableModelTypes( objectBaseType ) {
    const inputData = [];
    const soaInputObject = {
        boTypeName : objectBaseType,
        exclusionBOTypeNames:[]
    };
    inputData.push( soaInputObject );
    return ngpSoaSvc.executeSoa( 'Core-2010-04-DataManagement', 'findDisplayableSubBusinessObjectsWithDisplayNames', inputData )

        .then( function( result ) {
            if( result.output ) {
                const typesList = [];

                result.output.forEach( ( out ) => {
                    const typeInfos = out.displayableBOTypeNames;
                    if( typeInfos ) {
                        typeInfos.forEach( ( typeInfo ) => {
                            typesList.push( typeInfo.boName );
                        } );
                    }
                } );

                return getAvailableModelTypes( objectBaseType, typesList, false );
            }
        } );
}

/**
 *
 * @param {Object}  viewModelData view model data
 * @param {VMO} selectedType arry of view model object
 */
export function handleTypeSelection( viewModelData, selectedType ) {
    if( selectedType ) {
            extractAttributeGroupsToCreateWithNewObject( selectedType.props.type_name.dbValues[0] )
            .then( ( types )=> {
                const objectTypeName = viewModelData.dataProviders.allowedTypesToCreateDataProvider.selectedObjects[0].props.type_name.dbValues[0];
                viewModelData.XRTFormsInfo = [ {
                    name:objectTypeName,
                    showXrt:true,
                    filledFormData:{}
                } ];
                if ( types.length > 0 ) {
                    viewModelData.XRTFormsInfo.push( ...types.map( ( type ) =>  {
                         return {
                            name:type,
                            showXrt:false,
                            filledFormData:{}
                         };
                    } ) );
                }
                viewModelData.selectedMode = 'xrt';
            } );
    }
}

/**
 * check if there is only one element in list
 * select it and chnage mode to xrt
 * or change to list mode
 *
 * @param {Object} viewModelData view model data
 */
export function checkIfSingleResultAndSelectionStatus( viewModelData ) {
    const vmc = viewModelData.dataProviders.allowedTypesToCreateDataProvider.viewModelCollection;
    if ( vmc.totalFound === 1 ) {
        if ( viewModelData.dataProviders.allowedTypesToCreateDataProvider.selectedObjects.length === 1 ) {
            viewModelData.selectedMode = 'xrt';
        } else {
            const selected = vmc.getViewModelObject( 0 );
            viewModelData.dataProviders.allowedTypesToCreateDataProvider.selectionModel.setSelection( selected );
        }
    }else {
        viewModelData.selectedMode = 'list';
    }
}
/***
 * switch next xrt view to show and hide back view
 *
 * @param {Object} viewModelData model data
 */
export function showNextXRTForm( viewModelData ) {
    const index = findDisplayedFormIndex( viewModelData );
    if ( index < viewModelData.XRTFormsInfo.length - 1 ) {
        saveCurrentXrtData( viewModelData, viewModelData.XRTFormsInfo[index] );
        viewModelData.XRTFormsInfo[index].showXrt = false;
        viewModelData.XRTFormsInfo[index + 1].showXrt = true;
    }
}
/***
 * switch back xrt view to show and hide next view
 *
 * @param {Object} viewModelData model data
 */
export function showPreviousForm( viewModelData ) {
    const index = findDisplayedFormIndex( viewModelData );
    if ( index > 0 ) {
        saveCurrentXrtData( viewModelData, viewModelData.XRTFormsInfo[index] );
        viewModelData.XRTFormsInfo[index].showXrt = false;
        viewModelData.XRTFormsInfo[index - 1].showXrt = true;
    }

    if ( index === 0 ) {
        viewModelData.selectedMode = 'list';
        viewModelData.XRTFormsInfo[index].showXrt = false;
    }
}
/**
 * set the data that the user enterd in case of back/next scenario
 *
 * @param {object} viewModelData view model data
 */
export function updateXrtAfterLoading( viewModelData ) {
    const index = findDisplayedFormIndex( viewModelData );
    if ( index >= 0 && viewModelData.XRTFormsInfo[index].filledFormData ) {
        Object.assign( viewModelData, viewModelData.XRTFormsInfo[index].filledFormData );
    }
}
/**
 * Find selected index in XRTFormsInfo
 *
 * @param {object} viewModelData view model data
 */
function findDisplayedFormIndex( viewModelData ) {
    return  _.findIndex( viewModelData.XRTFormsInfo, ( XRTFormInfo ) => XRTFormInfo.showXrt );
}
/**
 * Save xrt data in order to be able to go next/back and edit the information already filled
 *
 * @param {object} viewModelData model data
 * @param {object} XRTFormInfo an object to contain the data of the current xrt
 */
function saveCurrentXrtData( viewModelData, XRTFormInfo ) {
    XRTFormInfo.filledFormData = {};
    XRTFormInfo.createType = viewModelData.objCreateInfo.createType;
    XRTFormInfo.propNamesForCreate = viewModelData.objCreateInfo.propNamesForCreate;
    viewModelData.objCreateInfo.propNamesForCreate.forEach( ( propName )=>{
        XRTFormInfo.filledFormData[propName] = viewModelData[propName];
    } );
}

/**
 *
 * @param {string} dialogTitle - the title of the dialog
 * @param {string} baseType - the base type of the type we want to create
 * @param {string} allowedTypesToCreatePreference - the preference which states what types user is allowed to create
 * @param {modelObjectp[]} pageSelection - the selected objects
 * @param {modelObject} pageContext - the context of the page
 * @param {boolean} createSibling - true if we need to create a sibling object
 */
export function displayCreateObjectDialog( dialogTitle, baseType, allowedTypesToCreatePreference, pageSelection, pageContext, createSibling ) {
    const popupData = {
        declView: 'ngpCreateObjectWizard',
        options: {
            height: '500',
            width: '500'
        },
        locals:{
            caption: dialogTitle
        },
        subPanelContext:{
            baseType,
            preference: allowedTypesToCreatePreference,
            pageSelection,
            pageContext,
            createSibling
        }
    };
    popupSvc.show( popupData );
}

let exports = {};
export default exports = {
    displayCreateObjectDialog,
    getCreatableItemTypes,
    handleTypeSelection,
    checkIfSingleResultAndSelectionStatus,
    showNextXRTForm,
    showPreviousForm,
    updateXrtAfterLoading,
    callCreateObject
};
