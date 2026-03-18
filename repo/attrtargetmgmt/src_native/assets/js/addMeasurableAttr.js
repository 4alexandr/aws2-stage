// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/addMeasurableAttr
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import uwPropSvc from 'js/uwPropertyService';
import filterPanelUtils from 'js/filterPanelUtils';
import msgSvc from 'js/messagingService';
import soaService from 'soa/kernel/soaService';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import parammgmtUtlSvc from 'js/Att1ParameterMgmtUtilService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import attributeDefintionTypesSrv from 'js/attributeDefinitionTypesService';
import _prefSvc from 'soa/preferenceService';

var exports = {};

var listenForsublocationChange;

var PLE_ENABLEDDEFNSTATUSLIST_PREFERENCE = 'PLE_EnabledDefnStatusList';

var _onReviseParamCompleteEventListener = null;

export let getCreatedObject = function( response ) {
    var createdObjects = [];
    var createdObjectUids = response.ServiceData.created;
    _.forEach( createdObjectUids, function( uid ) {
        var parameter = cdm.getObject( uid );
        if( parameter.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) !== -1 ) {
            createdObjects.push( parameter );
        }
    } );
    return createdObjects;
};
export let refreshParamProject = function( paramProject, data ) {
    var relatedModifiedData = {
        refreshParamTable: true,
        relatedModified: paramProject
    };
    eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData );
};

/**
 * This function will fire event that will refresh the selected group in Project/Group PWA.
 */
export let refreshOrExpandGroupInPWAForPanel = function( parentGroup ) {
    var relatedModifiedData = {
        relatedModified: parentGroup,
        refreshParamTable: true
    };
    eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData );
};

/**
 * Get the selected attribute definition and the create xrt type to load
 *
 * @param {Object} data the view model data object
 */
export let getAttributeDefinition = function( data ) {
    var attributeDefintion = cdm.getObject( data.dataProviders.performSearch.selectedObjects[ 0 ].uid );
    var uom = attributeDefintion.props.att0Uom.uiValues[ 0 ];
    if( attributeDefintion && attributeDefintion.props.att0AttrType ) {
        data.attributeDefinition = attributeDefintion;
        data.parameterDefinitionName.propertyDisplayName = attributeDefintion.props.object_name.dbValues[ 0 ];
        data.attrDefDesc.propertyDisplayName = data.attributeDefinition.props.object_desc.propertyDescriptor.displayName;
        data.attrDefDesc.uiValue = data.attributeDefinition.props.object_desc.dbValues[ 0 ];
        data.objName.propertyDisplayName = attributeDefintion.props.object_name.dbValues[ 0 ];
        data.uomType.propertyDisplayName = attributeDefintion.props.att0Uom.propertyDescriptor.displayName;
        data.uomType.uiValue = uom;
        //Get GMM value
        if( attributeDefintion.props.Att0HasDefaultParamValue && attributeDefintion.props.Att0HasDefaultParamValue.dbValues.length > 0 ) {
            var parameter = cdm.getObject( attributeDefintion.props.Att0HasDefaultParamValue.dbValues[ 0 ] );
            if( parameter.props.att0Goal && parameter.props.att0Goal.uiValues.length > 0 ) {
                data.Goal.propertyDisplayName = parameter.props.att0Goal.propertyDescriptor.displayName;
                data.Goal.uiValue = parameter.props.att0Goal.uiValues[ 0 ];
            }
            if( parameter.props.att0Min && parameter.props.att0Min.uiValues.length > 0 ) {
                data.Min.propertyDisplayName = parameter.props.att0Min.propertyDescriptor.displayName;
                data.Min.uiValue = parameter.props.att0Min.uiValues[ 0 ];
            }
            if( parameter.props.att0Max && parameter.props.att0Max.uiValues.length > 0 ) {
                data.Max.propertyDisplayName = parameter.props.att0Max.propertyDescriptor.displayName;
                data.Max.uiValue = parameter.props.att0Max.uiValues[ 0 ];
            }
        }

        var typeName = attributeDefintion.props.att0AttrType.dbValues[ 0 ];
        data.attrType.propertyDisplayName = attributeDefintion.props.att0AttrType.propertyDescriptor.displayName;
        data.attrType.uiValue = typeName;
        var defaultAttrType = '';
        switch ( typeName ) {
            case 'Integer':
                defaultAttrType = 'Att0MeasurableAttributeInt';
                break;
            case 'Double':
                defaultAttrType = 'Att0MeasurableAttributeDbl';
                break;
            case 'Boolean':
                defaultAttrType = 'Att0MeasurableAttributeBool';
                break;
            case 'String':
                defaultAttrType = 'Att0MeasurableAttributeStr';
                break;
            case 'Point':
                defaultAttrType = 'Att0MeasurableAttributePnt';
                break;
            default:
                defaultAttrType = '';
        }

        var applicationName = '';
        if( attributeDefintion.props.att0Application ) {
             applicationName = attributeDefintion.props.att0Application.dbValues[ 0 ];
        }

        attributeDefintionTypesSrv.getMeasurableAttrType( typeName, defaultAttrType, applicationName  ).then(
            function( attrType ) {
                data.xrtTypeToLoad = attrType;
            } );
    }
};

/**
 * Reset the attribute definition and xrt
 *
 * @param {Object} data the view model data object
 */
export let clearSelectedType = function( data ) {
    data.attributeDefinition = null;
    data.xrtTypeToLoad = null;
};

/**
 * This method is for parameter def heading , we don't want to show link.
 * It should be work like label
 * @param {object} data
 */
export let linkAction = function( data ) {
    data.link = null;
};

/**
 * set flag as Copy
 *
 * @param {Object} data the view model data object
 */
export let addParameterAsCopy = function( data ) {
    data.addAsCopy = true;
    eventBus.publish( 'att1AddParameterAsCopy', data );
};

/**
 * This function will return the Soa Input for attachMeasurableAttributes
 *
 * @param {Object} parentObjForPaste the view model data object
 * @param {Object} attributes the view model data object
 * @param {Object} data the view model data object
 * @returns {object} SOAinput the view model data object
 */
export let getAttachParameterSoaInput = function( parentObjForPaste, attributes, data ) {
    var relationName = '';
    var selectedParent = getSelectedParent();

    if( cmm.isInstanceOf( 'Att0ParamProject', selectedParent.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedParent.modelType ) ) {
        data.parentObj = selectedParent;
        data.selectedParentType = 'ParamProjectOrGroup';
    } else if( cmm.isInstanceOf( 'WorkspaceObject', selectedParent.modelType ) ) {
        data.parentObject = selectedParent;
        data.selectedParentType = 'WorkspaceObject';
    } else if( cmm.isInstanceOf( 'Awb0Element', selectedParent.modelType ) ) {
        data.parentObject = selectedParent;
        data.selectedParentType = 'Awb0Element';
    }

    if( cmm.isInstanceOf( 'Att0ParamProject', selectedParent.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedParent.modelType ) ) {
        relationName = 'Att0HasParamValue';
    }

    var addAsCopy = false;
    if( data && data.addAsCopy ) {
        addAsCopy = data.addAsCopy;
    }

    var soaInput = [ {
        clientId: 'AW_Att1',
        parentObj: selectedParent,
        attrList: attributes,
        relation: relationName,
        addAsCopy: addAsCopy
    } ];
    return soaInput;
};

/*
 * This function will display error message when attributes can not be pasted
 */
export let displayIgnoredAttributeMsg = function( messages, ignoredOverriddenParams ) {
    if( ignoredOverriddenParams && ignoredOverriddenParams.length > 0 ) {
        var ignoredOverriddenParamNames = '';
        for( var j = 0; j < ignoredOverriddenParams.length; j++ ) {
            if( ignoredOverriddenParamNames.length > 0 ) {
                ignoredOverriddenParamNames = ignoredOverriddenParamNames.concat( ', ' );
            }
            ignoredOverriddenParamNames = ignoredOverriddenParamNames.concat( TypeDisplayNameService.instance.getDisplayName( ignoredOverriddenParams[ j ] ) );
        }
        var msg = '';
        msg = msg.concat( messages.ignoredOverriddenParamsMsg.replace( '{0}', ignoredOverriddenParamNames ) );
        msgSvc.showError( msg );
    }
};

var getSelectedParent = function() {
    var selected = appCtxSvc.getCtx( 'selected' );
    var pselected = appCtxSvc.getCtx( 'pselected' );

    if( cmm.isInstanceOf( 'Att0MeasurableAttribute', selected.modelType ) ) {
        if( cmm.isInstanceOf( 'Att1AttributeAlignmentProxy', pselected.modelType ) ) {
            var sourceObj = cdm.getObject( pselected.props.att1SourceAttribute.dbValues[ 0 ] );
            if( sourceObj && sourceObj.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 ) {
                return sourceObj;
            }
        }
        return appCtxSvc.getCtx( 'pselected' );
    } else if( cmm.isInstanceOf( 'Att1AttributeAlignmentProxy', selected.modelType ) ) {
        var sourceObj = cdm.getObject( selected.props.att1SourceAttribute.dbValues[ 0 ] );
        if( sourceObj && sourceObj.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 ) {
            return sourceObj;
        }
    } else if( cmm.isInstanceOf( 'Arm0RequirementElement', selected.modelType ) ) {
        return selected;
    }

    var contextObj = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
    if( contextObj ) {
        return contextObj;
    }

    return selected;
};

/**
 * Get ObjPropertiesMap
 * @param {Object} data the view model data object
 * @return objPropertiesMap
 */
function _getObjPropertiesMap( data ) {
    var objPropertiesMap = {};
    for( var prop in data.vmo.props ) {
        if( data.vmo.props[ prop ].valueUpdated || data.vmo.props[ prop ].displayValueUpdated ) {
            objPropertiesMap[ prop ] = [ data.vmo.props[ prop ].dbValue.toString() ];
        }
    }
    return objPropertiesMap;
}

/**
 * Get the SOA Input for create attribute
 *
 * @param {Object} data the view model data object
 */
export let createAttributeInput = function( data ) {
    var soaInput = [];
    var selectedParent = getSelectedParent();

    if( selectedParent && selectedParent.length > 0 ) {
        selectedParent = selectedParent[ 0 ];
    }

    var parentObj = null;
    if( cmm.isInstanceOf( 'Att0ParamProject', selectedParent.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedParent.modelType ) ) {
        parentObj = selectedParent;
        data.selectedParentType = 'ParamProjectOrGroup';
    } else if( cmm.isInstanceOf( 'WorkspaceObject', selectedParent.modelType ) ) {
        parentObj = selectedParent;
        data.selectedParentType = 'WorkspaceObject';
        if( appCtxSvc.ctx.parammgmtctx && appCtxSvc.ctx.parammgmtctx.paramProject ) {
            // When VR is opend and nothing is select in primary work area
            parentObj = appCtxSvc.ctx.parammgmtctx.paramProject;
        }
    } else if( cmm.isInstanceOf( 'Awb0Element', selectedParent.modelType ) ) {
        parentObj = cdm.getObject( selectedParent.props.awb0UnderlyingObject.dbValues[ 0 ] );
        data.selectedParentType = 'Awb0Element';
    }
    for( var i = 0; i < data.parentObjectTypes.length; i++ ) {
        if( parentObj && cmm.isInstanceOf( data.parentObjectTypes[ i ], parentObj.modelType ) ) {
            data.parentObject = parentObj;
            break;
        }
    }
    data.parentObject = parentObj;

    var objPropertiesMap = _getObjPropertiesMap( data );
    if( !objPropertiesMap.att0AttrDefRev ) {
        objPropertiesMap.att0AttrDefRev = [ data.attributeDefinition.uid ];
    }

    var objInput = {
        objPropertiesMap: objPropertiesMap,
        objType: data.xrtTypeToLoad
    };
    var attributeObjInput = {
        objInput: objInput,
        objName: data.vmo.props.object_name.dbValue
    };

    var relationName = '';
    if( cmm.isInstanceOf( 'Att0ParamProject', selectedParent.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedParent.modelType ) || ( appCtxSvc.ctx.parammgmtctx && appCtxSvc.ctx.parammgmtctx.paramProject ) ) {
        relationName = 'Att0HasParamValue';
    }
    soaInput
        .push( {
            attributeObjInput: attributeObjInput,
            clientId: 'com.siemens.splm.client.attrtargetmgmt.internal.operations.CreateOrModifyMeasurableAttrOperation',
            parentObj: parentObj,
            relationName: relationName
        } );
    return soaInput;
};

/**
 * Update XRT for Point AttributeType
 *
 * @param {Object} data the view model data object
 */
var updateXRTForPoint = function( data ) {
    if( data.Goal ) {
        var goalValue = data.Goal.uiValue;
        var positionValues = [];
        positionValues = goalValue.substring( 1, goalValue.length - 1 ).split( ', ' );

        var uiPropertyGoal = data.att0PointX;
        if( uiPropertyGoal ) {
            uwPropSvc.setValue( uiPropertyGoal, positionValues[ 0 ] );
            uwPropSvc.setDirty( uiPropertyGoal, true );
        }
        var uiPropertyMin = data.att0PointY;
        if( uiPropertyMin ) {
            uwPropSvc.setValue( uiPropertyMin, positionValues[ 1 ] );
            uwPropSvc.setDirty( uiPropertyMin, true );
        }
        var uiPropertyMax = data.att0PointZ;
        if( uiPropertyMax ) {
            uwPropSvc.setValue( uiPropertyMax, positionValues[ 2 ] );
            uwPropSvc.setDirty( uiPropertyMax, true );
        }
    }
};

/**
 *
 * Populate the stylesheet with attribute definition name, object name and sets the sets the default value for
 * Overridable as true
 *
 * @param {Object} data the view model data object
 */
export let populateXRT = function( data ) {
    var selected = getSelectedParent();

    if( data.object_name ) {
        var uiProperty = data.object_name;
        //Prepare suggestive name for parameter value
        var tempObjectName;
        if( cmm.isInstanceOf( 'Awb0Element', selected.modelType ) ) {
            tempObjectName = data.attributeDefinition.props.object_name.dbValues[ 0 ].concat( ' ', selected.props.object_string.dbValues[ 0 ] );
        } else if( selected.props.object_name ) {
            tempObjectName = data.attributeDefinition.props.object_name.dbValues[ 0 ].concat( ' ', selected.props.object_name.dbValues[ 0 ] );
        }

        if( uiProperty ) {
            uwPropSvc.setValue( uiProperty, tempObjectName );
            uwPropSvc.setDirty( uiProperty, true );
        }

        var uiPropertydesc = data.object_desc;

        if( uiPropertydesc ) {
            uwPropSvc.setValue( uiPropertydesc, data.attributeDefinition.props.object_desc.dbValues[ 0 ] );
            uwPropSvc.setDirty( uiPropertydesc, true );
        }

        if( data.attrType && data.attrType.uiValue === 'Point' ) {
            updateXRTForPoint( data );
        } else {
            var uiPropertyGoal = data.att0Goal;
            if( uiPropertyGoal && data.Goal ) {
                if( data.attrType && data.attrType.uiValue === 'Boolean' ) {
                    if( data.Goal.uiValue === '' || data.Goal.uiValue === 'False' ) {
                        uwPropSvc.setValue( uiPropertyGoal, false );
                    } else {
                        uwPropSvc.setValue( uiPropertyGoal, true );
                    }
                    uiPropertyGoal.valueUpdated = true;
                } else {
                    uwPropSvc.setValue( uiPropertyGoal, data.Goal.uiValue );
                    uiPropertyGoal.uiValue = data.Goal.uiValue;
                    uwPropSvc.setDirty( uiPropertyGoal, true );
                }
            }
            var uiPropertyMin = data.att0Min;
            if( uiPropertyMin && data.Min ) {
                uwPropSvc.setValue( uiPropertyMin, data.Min.uiValue );
                uiPropertyMin.uiValue = data.Min.uiValue;
                uwPropSvc.setDirty( uiPropertyMin, true );
            }
            var uiPropertyMax = data.att0Max;
            if( uiPropertyMax && data.Max ) {
                uwPropSvc.setValue( uiPropertyMax, data.Max.uiValue );
                uiPropertyMax.uiValue = data.Max.uiValue;
                uwPropSvc.setDirty( uiPropertyMax, true );
            }
        }
    }
    if( data.att0Overridable ) {
        var overridableUiProperty = data.att0Overridable;
        if( overridableUiProperty ) {
            if( data.attributeDefinition.props.att0OverridableDefault && data.attributeDefinition.props.att0OverridableDefault.dbValues[ 0 ] === '1' ) {
                uwPropSvc.setValue( overridableUiProperty, true );
            } else {
                uwPropSvc.setValue( overridableUiProperty, false );
            }
            overridableUiProperty.valueUpdated = true;
        }
    }
    if( data.att0AttrDefRev ) {
        var attributeDefUiProperty = data.att0AttrDefRev;
        if( attributeDefUiProperty ) {
            uwPropSvc.setValue( attributeDefUiProperty, data.attributeDefinition.uid );
            uwPropSvc.setDirty( attributeDefUiProperty, true );
        }

        // Hide the Parameter Definition property in the Parameter Create Panel
        // because we alrady display Parameter Definition section
        data.att0AttrDefRev = null;
    }
    data.isXrtCompletelyLoaded = true;
};

/**
 * Get the most recently created attribute definitions
 *
 * @param {Object} data the view model data object
 * @return {Object} a promise with no data, once the data is loaded at client side.
 */
export let getRecentUsedTypes = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    attributeDefintionTypesSrv.getRecentMruUids( 3 ).then( function( recentAttributeUids ) {
        var uids = [];
        var recentUsedObjects = [];
        for( var i = 0; i < recentAttributeUids.length; i++ ) {
            var obj = cdm.getObject( recentAttributeUids[ i ] );
            uids.push( recentAttributeUids );
            recentUsedObjects.push( obj );
        }

        data.recentUsedTypes = recentUsedObjects;
        deferred.resolve( null );
    } );

    return deferred.promise;
};

/**
 * Update the recent attribute definitions
 *
 * @return {Object} the promise object
 */
export let updateRecentUsedTypes = function( recentAttributeUid ) {
    if( recentAttributeUid ) {
        attributeDefintionTypesSrv.updateRecentMruUids( recentAttributeUid );
    }
};

/**
 * This function will subscribe the event "appCtx.update" and close the panel if the secondaryXrtPageID changes.
 */
export let subscribeEvent = function() {
    listenForsublocationChange = eventBus.subscribe( 'appCtx.update', function( eventData ) {
        if( eventData.name === 'xrtPageContext' && eventData.target === 'secondaryXrtPageID' ) {
            eventBus.unsubscribe( listenForsublocationChange );
            var completeEventData = {
                source: 'toolAndInfoPanel'
            };
            eventBus.publish( 'complete', completeEventData );
        }
    } );
};

/**
 * Find Prefilters and perform search
 * @param {Object} data the view model data object
 */
export let findPreFiltersAndInvokeSearch = function( data ) {
    // showSearchFilter is set for the condition of showing the Search-Filter panel
    data.showSearchFilter = true;
    data.selectedSearchFilters = [];
    updateSearchCriteria( data );
    var releaseStatusList = null;
    getEnabledDefnStatusFilter().then(
        function( enabledDefnStatusList ) {
            releaseStatusList = enabledDefnStatusList;
        } );
    var inputData = {
        inBOTypeNames: []
    };
    // if user added type-filter, then the inputData.input.boTypeName is set to typeFilter[0].
    // User who don't use type-filter or the value is "", by default the inputData.input = []
    if( data.typeFilter ) {
        var typeFilter = data.typeFilter.split( ',' );
        for( var type in typeFilter ) {
            if( typeFilter.hasOwnProperty( type ) ) {
                inputData.inBOTypeNames.push( {
                    typeName: typeFilter[ type ],
                    contextName: 'subtypes',
                    exclusionPreference: ''
                } );
            }
        }
        filterPanelUtils.setHasTypeFilter( true );
    } else {
        filterPanelUtils.setHasTypeFilter( false );
    }

    filterPanelUtils.setPresetFilters(true);
    var subBusinessObjects = null;
    soaService.postUnchecked('Core-2013-05-DataManagement', 'getSubTypeNames', inputData).then(
        function (response) {
            if (response) {
                subBusinessObjects = processSoaResponse(response);
                if (!data.typeFilter) {
                    data.searchFilterMap = {};
                } else {
                    data.searchFilterMap = {
                        'WorkspaceObject.object_type': subBusinessObjects,
                        'WorkspaceObject.release_status_list': releaseStatusList
                    };
                }
                if (data.searchFilter) {
                    try {
                        exports.processSearchFilters(data.searchFilter, data.searchFilterMap)
                            .then(function (processResultResponse) {
                                if (processResultResponse !== null) {
                                    data.searchFilterMap = processResultResponse.searchFilterMap;
                                    if (processResultResponse.hasInvalidFilter) {
                                        filterPanelUtils.displayPrefilterError(data.searchFilter);
                                    }
                                    filterPanelUtils.saveIncontextFilterMap(data);
                                    eventBus.publish('searchResultItems.doSearch');
                                }
                            });
                    } catch (e) {
                        filterPanelUtils.displayPrefilterError(data.searchFilter);
                        filterPanelUtils.saveIncontextFilterMap(data);
                        eventBus.publish('searchResultItems.doSearch');
                    }
                } else {
                    filterPanelUtils.saveIncontextFilterMap(data);
                    eventBus.publish('searchResultItems.doSearch');
                }
            }
        });
};

/**
 * update the performSearch searchCriteria variable
 *
 * @param {Object} data the view model data object
 */
var updateSearchCriteria = function( data ) {
    if( data.searchBox ) {
        appCtxSvc.ctx.searchCriteria = data.searchBox.dbValue;
    } else {
        appCtxSvc.ctx.searchCriteria = '*';
    }

    if( !appCtxSvc.ctx.searchInfo ) {
        appCtxSvc.ctx.searchInfo = {};
    }
    appCtxSvc.ctx.searchInfo.incontextSearchNew = 'true';
    var incontextSearchFilterPanelCtx = appCtxSvc.getCtx( 'incontextSearchFilterPanel' );
    if( incontextSearchFilterPanelCtx && incontextSearchFilterPanelCtx.listOfExpandedCategories ) {
        delete incontextSearchFilterPanelCtx.listOfExpandedCategories;
        appCtxSvc.updatePartialCtx( 'incontextSearchFilterPanel', incontextSearchFilterPanelCtx );
    }
};

/**
 * Process response of findDisplayableSubBusinessObjectsWithDisplayNames SOA
 * @param {Object} response - response of findDisplayableSubBusinessObjectsWithDisplayNames SOA
 * @returns {StringArray} type names array
 */
var processSoaResponse = function( response ) {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].subTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ];
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * Get Enabled definition status list
 *
 * @return {Object} promise object
 */
var getEnabledDefnStatusFilter = function() {
    var deferred = AwPromiseService.instance.defer();
    var enabledDefnStatusList = [];
    _prefSvc.getStringValues( [ PLE_ENABLEDDEFNSTATUSLIST_PREFERENCE ] ).then(
        function( statusList ) {
            if( statusList ) {
                for( var i = 0; i < statusList.length; i++ ) {
                    var enabledStatusFilter = {
                        searchFilterType: 'StringFilter',
                        stringValue: ''
                    };
                    enabledStatusFilter.stringValue = statusList[ i ];
                    enabledDefnStatusList.push( enabledStatusFilter );
                }
                deferred.resolve( enabledDefnStatusList );
            }
        } );
    return deferred.promise;
};

/**
 * This function gets the selected object and resets the other providers in palette
 * @param {Object} ctx - context
 * @param {Object} provider - provider
 */
export let handlePaletteSelection = function( ctx, provider ) {
    if( ctx && provider ) {
        if( provider === ctx.getClipboardProvider ) {
            if( ctx.getRecentObjsProvider ) {
                ctx.getRecentObjsProvider.selectNone();
                ctx.getRecentObjsProvider.selectedObjects = [];
            }
            if( ctx.getFavoriteProvider ) {
                ctx.getFavoriteProvider.selectNone();
                ctx.getFavoriteProvider.selectedObjects = [];
            }
        }
        if( provider === ctx.getFavoriteProvider ) {
            if( ctx.getRecentObjsProvider ) {
                ctx.getRecentObjsProvider.selectNone();
                ctx.getRecentObjsProvider.selectedObjects = [];
            }
            if( ctx.getClipboardProvider ) {
                ctx.getClipboardProvider.selectNone();
                ctx.getClipboardProvider.selectedObjects = [];
            }
        }
        if( provider === ctx.getRecentObjsProvider ) {
            if( ctx.getClipboardProvider ) {
                ctx.getClipboardProvider.selectNone();
                ctx.getClipboardProvider.selectedObjects = [];
            }
            if( ctx.getFavoriteProvider ) {
                ctx.getFavoriteProvider.selectNone();
                ctx.getFavoriteProvider.selectedObjects = [];
            }
        }
    }
};
/**
 * This function handles the default selection from clipboard dataProvider on palette tab
 * @param {Object} ctx - ctx
 */
export let handleDefaultPaletteSelection = function( ctx ) {
    if( ctx.getClipboardProvider && ctx.getClipboardProvider.selectedObjects.length === 0 ) {
        ctx.getClipboardProvider.selectAll();
    }
};
/**
 * This function handles the pre-action for revising a parameter
 */
export let reviseParameterPre = function() {
    if( !_onReviseParamCompleteEventListener ) {
        _onReviseParamCompleteEventListener = eventBus.subscribe( 'complete', function( eventData ) {
            eventBus.unsubscribe( _onReviseParamCompleteEventListener );
            _onReviseParamCompleteEventListener = null;

            if( eventData.scope && eventData.scope.action === 'revise' ) {
                var reviseData = eventData.scope.data;
                if( reviseData.openNewRevision !== undefined && reviseData.openNewRevision.dbValue === false ) {
                    var sublocation = appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:SubLocation');
                    var contextObj = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
                    if( sublocation === 'com.siemens.splm.client.attrtarget.paramProjectSubLocation' ) {
                        // when it is in the Parameter Project sub-location
                        eventBus.publish( 'primaryWorkarea.reset' );
                    }
                    if( cmm.isInstanceOf( 'Att0ParamProject', contextObj.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', contextObj.modelType ) ) {
                        // when the xrt context object is type of Parameter Project or Group
                        eventBus.publish( 'refreshAtt1ShowParamProxyTable' );
                    } else {
                        if( sublocation === 'com.siemens.splm.client.attrtarget.paramProjectSubLocation' ) {
                            eventBus.publish( 'Att1ParamProjectNavigation.clearPWASelection' );
                        } else {
                            // Refresh the Parameter > History table
                            eventBus.publish('cdm.relatedModified', {
                                "refreshLocationFlag": false,
                                "relations": "",
                                "relatedModified": [contextObj],
                                "createdObjects": []
                            });
                        }
                    }
                }
            }
        } );
    }
};
/**
 *Change tab selection
 *
 * @param {Object} data the data object
 */
export let changeTabSelection = function( data ) {
    if( data.addParameterTabsModel ) {
        var tabsModel = data.addParameterTabsModel.dbValue;
        for( var i = 0; i < tabsModel.length; i++ ) {
            if( tabsModel[ i ].tabKey === appCtxSvc.ctx.panelContext.selectTab ) {
                tabsModel[ i ].selectedTab = true;
                appCtxSvc.ctx.panelContext.selectTab = '';
            } else {
                tabsModel[ i ].selectedTab = false;
            }
        }
    }
};

/**
 * Get SOA input for add parameter value
 */
export let getInputForAddParamValue = function() {
    var selectedParent;
    var parentOfInterests = _.get( appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parentOfInterests', undefined );
    var sourceAttributeList = [];
    var relation = 'VARIANT_VALUE';
    var occmgmtContext = _.get( appCtxSvc, 'ctx.occmgmtContext', undefined );
    if( occmgmtContext ) {
        var pciUid = _.get( appCtxSvc, 'ctx.occmgmtContext.productContextInfo.uid', undefined );
        if( pciUid ) {
            relation = relation.concat( '#', pciUid );
        }
    }
    if( parentOfInterests && parentOfInterests.length > 0 ) {
        selectedParent = cdm.getObject( parentOfInterests[ 0 ].parentId );
        _.forEach( parentOfInterests[ 0 ].nonIncontextList, function( item ) {
            sourceAttributeList.push( cdm.getObject( item.props.att1SourceAttribute.dbValues[ 0 ] ) );
        } );
        _.forEach( parentOfInterests[ 0 ].incontextParamList, function( item ) {
            sourceAttributeList.push( cdm.getObject( item.props.att1SourceAttribute.dbValues[ 0 ] ) );
        } );
        if( sourceAttributeList.length > 0 ) {
            var soaInput = [ {
                clientId: 'AW_Att1',
                parentObj: selectedParent,
                attrList: sourceAttributeList,
                relation: relation,
                addAsCopy: true
            } ];
            return soaInput;
        }
    }
};

/**
 * Returns the addMeasurableAttr instance
 *
 * @member addMeasurableAttr
 */


export default exports = {
    getCreatedObject,
    refreshParamProject,
    refreshOrExpandGroupInPWAForPanel,
    getAttributeDefinition,
    clearSelectedType,
    linkAction,
    addParameterAsCopy,
    getAttachParameterSoaInput,
    displayIgnoredAttributeMsg,
    createAttributeInput,
    populateXRT,
    getRecentUsedTypes,
    updateRecentUsedTypes,
    subscribeEvent,
    findPreFiltersAndInvokeSearch,
    handlePaletteSelection,
    handleDefaultPaletteSelection,
    reviseParameterPre,
    changeTabSelection,
    getInputForAddParamValue
};
app.factory( 'addMeasurableAttr', () => exports );
