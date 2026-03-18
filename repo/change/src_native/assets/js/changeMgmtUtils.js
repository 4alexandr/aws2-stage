// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/changeMgmtUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import lovService from 'js/lovService';
import messagingService from 'js/messagingService';
import uwPropertyService from 'js/uwPropertyService';
import cmm from 'soa/kernel/clientMetaModel';
import hostFeedbackSvc from 'js/hosting/sol/services/hostFeedback_2015_03';
import objectRefSvc from 'js/hosting/hostObjectRefService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import soaSvc from 'soa/kernel/soaService';
import adapterService from 'js/adapterService';

var exports = {};

/**
 * flag used to turn on trace level logging
 */
var _debug_logIssuesActivity = browserUtils.getWindowLocationAttributes().logIssuesActivity !== undefined;

/**
 * Get Revise Inputs for reviseObjects soa
 *
 * @param deepCopyData property name
 * @return A list of deep copy datas
 */
export let getReviseInputsJs = function( mselected ) {
    var deferred = AwPromiseService.instance.defer();
    var reviseInputsArray = [];
    var reviseInputsMap = new Map();
    var impactedItems = mselected;
    for( var i = 0; i < impactedItems.length; i++ ) {
        var reviseInputs = {};
        if(impactedItems[i].modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ){
            reviseInputs.item_revision_id = [ '' ];
        }
        reviseInputs.object_desc = [ '' ];
        reviseInputs.fnd0ContextProvider = [ appCtxSvc.ctx.pselected.uid ];

        var reviseInput = {};
        reviseInput.targetObject = impactedItems[ i ];
        reviseInput.reviseInputs = reviseInputs;
        reviseInputsArray.push( reviseInput );
        reviseInputsMap.set( impactedItems[ i ].uid, reviseInput );
    }

    var promise = self.setReviseInDeepCopyData( impactedItems, reviseInputsMap );
    if( promise ) {
        promise.then( function( response ) {
            deferred.resolve( response );
        } );
    }
    return deferred.promise;
};

/**
 * Set deep copy data in revise inputs
 *
 * @param impactedItems The impacted items
 * @param reviseInputsMap Map of impacted items to their reviseIn
 * @return A list of revise inputs with the deep copy datas
 */
self.setReviseInDeepCopyData = function( impactedItems, reviseInputsMap ) {
    var deferred = AwPromiseService.instance.defer();
    var deepCopyDataInputs = [];
    for( var i = 0; i < impactedItems.length; i++ ) {
        var dcd = {
            operation: 'Revise',
            businessObject: impactedItems[ i ]
        };
        deepCopyDataInputs.push( dcd );
    }

    var inputData = {
        deepCopyDataInput: deepCopyDataInputs
    };

    var deepCopyInfoMap = [];
    var promise = soaSvc.post( 'Core-2014-10-DataManagement', 'getDeepCopyData', inputData );
    if( promise ) {
        promise.then( function( response ) {
            if( response !== undefined ) {
                deepCopyInfoMap = response.deepCopyInfoMap;
                for( var i = 0; i < impactedItems.length; i++ ) {
                    for( var b in deepCopyInfoMap[ 0 ] ) {
                        if( deepCopyInfoMap[ 0 ][ b ].uid === impactedItems[ i ].uid ) {
                            var reviseIn = reviseInputsMap.get( deepCopyInfoMap[ 0 ][ b ].uid );
                            reviseIn.deepCopyDatas = self.convertDeepCopyData( deepCopyInfoMap[ 1 ][ b ] );
                            break;
                        }
                    }
                }
            }
            deferred.resolve( Array.from( reviseInputsMap.values() ) );
        } );
    }
    return deferred.promise;
};

/**
 * Convert Deep Copy Data from client to server format
 *
 * @param deepCopyData property name
 * @return A list of deep copy datas
 */
self.convertDeepCopyData = function( deepCopyData ) {
    var deepCopyDataList = [];
    for( var i = 0; i < deepCopyData.length; i++ ) {
        var newDeepCopyData = {};
        newDeepCopyData.attachedObject = deepCopyData[ i ].attachedObject;
        newDeepCopyData.copyAction = deepCopyData[ i ].propertyValuesMap.copyAction[ 0 ];
        newDeepCopyData.propertyName = deepCopyData[ i ].propertyValuesMap.propertyName[ 0 ];
        newDeepCopyData.propertyType = deepCopyData[ i ].propertyValuesMap.propertyType[ 0 ];

        var value = false;
        var tempStrValue = deepCopyData[ i ].propertyValuesMap.copy_relations[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.copyRelations = value;

        value = false;
        tempStrValue = deepCopyData[ i ].propertyValuesMap.isTargetPrimary[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.isTargetPrimary = value;

        value = false;
        tempStrValue = deepCopyData[ i ].propertyValuesMap.isRequired[ 0 ];
        if( tempStrValue === '1' ) {
            value = true;
        }
        newDeepCopyData.isRequired = value;

        newDeepCopyData.operationInputTypeName = deepCopyData[ i ].operationInputTypeName;

        var operationInputs = {};
        operationInputs = deepCopyData[ i ].operationInputs;
        newDeepCopyData.operationInputs = operationInputs;

        var aNewChildDeepCopyData = [];
        if( deepCopyData[ i ].childDeepCopyData && deepCopyData[ i ].childDeepCopyData.length > 0 ) {
            aNewChildDeepCopyData = self.convertDeepCopyData( deepCopyData[ i ].childDeepCopyData );
        }
        newDeepCopyData.childDeepCopyData = aNewChildDeepCopyData;
        deepCopyDataList.push( newDeepCopyData );
    }

    return deepCopyDataList;
};

export let getCreateInputObject = function( boName, propertyNameValues, compoundDeriveInput ) {
    var createInputObject = {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundDeriveInput: compoundDeriveInput
    };
    return createInputObject;
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return {String} full property name
 */
export let addChildInputToParentMap = function( fullPropertyName, count, propertyNameTokens, createInputMap, vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //$NON-NLS-1$
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = exports.getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundDeriveInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundDeriveInput[ propName ] = [];
                }
                parentCreateInput.compoundDeriveInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

export let processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = uwPropertyService.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = exports.addChildInputToParentMap( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateInputFromDerivePanel = function( data ) {
    var createInputMap = {};
    createInputMap[ '' ] = exports.getCreateInputObject( data.objCreateInfo.createType, {}, {} );

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || uwPropertyService.isModified( vmProp ) ) ) {
            exports.processPropertyForCreateInput( propName, vmProp, createInputMap );
        }
    } );

    var _fileInputForms = data.fileInputForms;
    if( !_fileInputForms ) {
        _fileInputForms = [];
    }

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        // copy custom panel's fileInputForms
        var customFileInputForms = customPanelVMData.fileInputForms;
        if( customFileInputForms ) {
            _fileInputForms = _fileInputForms.concat( customFileInputForms );
        }

        // copy custom panel's properties
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( oriVMData, function( propVal, propName ) {
            if( _.has( customPanelVMData, propName ) ) {
                var vmProp = customPanelVMData[ propName ];
                exports.processPropertyForCreateInput( propName, vmProp, createInputMap );
            }
        } );
    } );

    return _.get( createInputMap, '' );
};

/**
 * Updating occmgmt context isChangeEnabled
 *
 * @param {string} changeToggleState true if change is enabled else false.
 */
export let updateCtxWithShowChangeValue = function( changeToggleState ) {
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.isChangeEnabled', changeToggleState === 'true' );
    appCtxSvc.updateCtx( 'isRedLineMode', changeToggleState );
};

/**
 * Check version whether to call new SOA for derive or old SOA. New SOA was introduced in Tc12.3
 *
 * @function callNewSOAForDerive
 *
 */
export let callNewSOAForDerive = function() {
    if( appCtxSvc.ctx.tcSessionData && ( (appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 12 && appCtxSvc.ctx.tcSessionData.tcMinorVersion >= 3 ) || (appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 13 ))) {
        return true;
    }
    return false;
};

/**
 * Add "No Change Context" List to values
 *
 * @param {Object} response - response of LOV SOA
 */
export let generateChangeContextList = function( data ) {
    var deferedLOV = AwPromiseService.instance.defer();

    data.dataProviders.changeContextLinkLOV.validateLOV = function() {
        // no op
    };

    lovService.getInitialValues( '', deferedLOV, appCtxSvc.ctx.userSession.props.cm0GlobalChangeContext,
        'Create', appCtxSvc.ctx.userSession, 100, 100, '', '' );

    /**
     * Process response when LOV 'getInitialValues' has been performed.
     */
    return deferedLOV.promise.then( function( response ) {
        if( response ) {
            var resource = 'ChangeMessages';
            var localTextBundle = localeSvc.getLoadedText( resource );
            var noChangecontextString = localTextBundle.noChangeContext;

            //Create an entry for "No Change Context"
            var noChangeContextEntry = JSON.parse( JSON.stringify( response[ 0 ] ) );
            noChangeContextEntry.propDisplayValue = noChangecontextString;
            noChangeContextEntry.propInternalValue = '';

            response.unshift( noChangeContextEntry );

            data.listofEcns = response;
        }
    }, function( response ) {
        var resource = 'ChangeMessages';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var noChangecontextString = localTextBundle.noChangeContext;

        var noChangeContextEntry = {};
        noChangeContextEntry.propDisplayValue = noChangecontextString;
        noChangeContextEntry.propInternalValue = '';
        data.listofEcns = [];
        data.listofEcns.push( noChangeContextEntry );

        var msgObj = {
            msg: '',
            level: 0
        };

        if( response.cause.partialErrors.length > 0 ) {
            for( var x = 0; x < response.cause.partialErrors[ 0 ].errorValues.length; x++ ) {
                if( response.cause.partialErrors[ 0 ].errorValues[ x ].code !== 54060 ) {
                    msgObj.msg += response.cause.partialErrors[ 0 ].errorValues[ x ].message;
                    msgObj.msg += '<BR/>';
                    msgObj.level = _.max( [ msgObj.level, response.cause.partialErrors[ 0 ].errorValues[ x ].level ] );
                }
            }
        }
        if( msgObj.msg !== '' ) {
            messagingService.showError( msgObj.msg );
        }
    } );
};
/**
 * Honours CopyFromOriginal Property Constant
 * while populating create panel properties
 * on Derive Change
 *
 * @param {String} data - The view model data
 * @param {String} propToLoad - properties on create panel
 */
export let populateCreatePanelPropertiesOnDerive = function( data ) {
    var selectedChangeObjects = appCtxSvc.ctx.mselected;
    var propToLoad = data.objCreateInfo.propNamesForCreate;

    if( selectedChangeObjects === null || propToLoad === null ) {
        return;
    }
    var selectedChange = selectedChangeObjects[ 0 ];
    for( var propIndex in propToLoad ) {
        if( propToLoad[ propIndex ] === '' || propToLoad[ propIndex ] === null ) {
            continue;
        }
        var viewModelProp = propToLoad[ propIndex ];
        var property = propToLoad[ propIndex ];
        var matched = property.indexOf( '__' );
        var propertyOnObjType = null;

        if( matched > -1 ) {
            propertyOnObjType = property.substring( 0, matched );
            property = property.substring( matched + 2, property.length );
        }
        if( _.isUndefined( selectedChange.props[ property ] ) ) {
            continue;
        }
        var isCopyTrue = isCopyFromOriginal( data, propertyOnObjType, property );

        if( isCopyTrue === true &&
            ( data[ viewModelProp ].dbValue === null || data[ viewModelProp ].dbValue === '' ) ) {
            setValueOnCreatePanel( data, selectedChange, property, viewModelProp );
        }
    }
};
/**
 * checks if CopyFromOriginal Property Constant
 * is set to true for the property of Object/related object
 * for the target object to be created
 *
 * @param {object} data - The view model data
 * @param {String} property - property of Object to be created
 * @param {String} propertyOnObjType - relation of object on which property resides
 */
function isCopyFromOriginal( data, propertyOnObjType, property ) {
    var typeName;
    if( propertyOnObjType !== null && propertyOnObjType === 'revision' ) {
        typeName = data.objCreateInfo.createType + 'Revision';
    } else {
        typeName = data.objCreateInfo.createType;
    }
    var objCreateModelType = cmm.getType( typeName );
    if( objCreateModelType === null ) {
        typeName += 'CreI';
        objCreateModelType = cmm.getType( typeName );
    }
    if( objCreateModelType === null ) {
        return false;
    }
    var propDescriptor = objCreateModelType.propertyDescriptorsMap[ property ];
    if( _.isUndefined( propDescriptor ) ) {
        return false;
    }
    var propConstantMap = propDescriptor.constantsMap;
    var isCopyFromOrigin = propConstantMap.copyFromOriginal;
    if( isCopyFromOrigin !== null && isCopyFromOrigin === '1' ) {
        return true;
    }
    return false;
}
/**
 * gets value of property from source object
 * and sets it on the create panel for the object to be created
 *
 * @param {object} data - The view model data
 * @param {object} selectedChange - source change object
 * @param {String} property - property of Object to be created
 * @param {String} viewModelProp - view model property for the object
 */
function setValueOnCreatePanel( data, selectedChange, property, viewModelProp ) {
    var propertyVal = null;
    if( selectedChange !== null && !_.isUndefined( selectedChange.props[ property ].dbValue ) ) {
        propertyVal = selectedChange.props[ property ].dbValue;
    } else if( selectedChange !== null && !_.isUndefined( selectedChange.props[ property ].dbValues ) && propertyVal === null ) {
        propertyVal = selectedChange.props[ property ].dbValues[ 0 ];
    }
    if( _.isUndefined( data[ viewModelProp ] ) || propertyVal === null ) {
        return;
    }
    data[ viewModelProp ].dbValue = propertyVal;
    data[ viewModelProp ].valueUpdated = true;
    if( data[ viewModelProp ].hasLov === true ) {
        var outValues = {};
        outValues.dbValue = propertyVal;
        outValues.displayValues = propertyVal;
        outValues.uiValue = propertyVal;
        data[ viewModelProp ].uiValue = outValues.uiValue;
    }
}

export let sendEventToHost = function( data ) {
    if( appCtxSvc.getCtx( 'aw_hosting_enabled' ) ) {
        var createIssueFromVisMode = appCtxSvc.getCtx( 'CreateIssueHostedMode' );
        if( createIssueFromVisMode ) {
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'in sendEventToHost and CreateIssueHostedMode ctx exists.' );
            }
            eventBus.publish( 'changeObjectCreated', data );
        }

        var curHostedComponentId = appCtxSvc.getCtx( 'aw_hosting_state.currentHostedComponentId' );
        if( curHostedComponentId === 'com.siemens.splm.client.change.CreateChangeComponent' ) {
            if( data.createdChangeObject !== null ) {
                var uid = data.createdChangeObject.uid;
                var feedbackMessage = hostFeedbackSvc.createHostFeedbackRequestMsg();
                var objectRef = objectRefSvc.createBasicRefByModelObject( data.createdChangeObject );
                feedbackMessage.setFeedbackTarget( objectRef );
                feedbackMessage.setFeedbackString( 'ECN  Successfully created' );
                var feedbackProxy = hostFeedbackSvc.createHostFeedbackProxy();
                feedbackProxy.fireHostEvent( feedbackMessage );
            }
        }
    }
};

export let getAdaptedObjectsForSelectedObjects = function( selectedObjects ) {
    var adaptedObjects = adapterService.getAdaptedObjectsSync(selectedObjects);
    if(adaptedObjects !== null){
       return adaptedObjects;
    }
    else{
        return selectedObjects;
    }
};

export default exports = {
    getReviseInputsJs,
    getCreateInputObject,
    addChildInputToParentMap,
    processPropertyForCreateInput,
    getCreateInputFromDerivePanel,
    updateCtxWithShowChangeValue,
    callNewSOAForDerive,
    generateChangeContextList,
    populateCreatePanelPropertiesOnDerive,
    sendEventToHost,
    getAdaptedObjectsForSelectedObjects
};
/**
 * @member Cm1CreateChangeService
 * @memberof NgServices
 */
app.factory( 'changeMgmtUtils', () => exports );
