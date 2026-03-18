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
 * @module js/Att1ParameterMgmtUtilService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import tcVmoService from 'js/tcViewModelObjectService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import selectionService from 'js/selection.service';
import uwPropertyService from 'js/uwPropertyService';
import clipboardService from 'js/clipboardService';
import _ from 'lodash';
import cmdPanelSvc from 'js/commandPanel.service';
import adapterSvc from 'js/adapterService';

var exports = {};

export let createViewModelProperty = function (object) {
    var vMProp = null;
    vMProp = uwPropertyService.createViewModelProperty(object.dbValues[0],
        object.uiValues[0], 'STRING', object.dbValues[0], '');
    vMProp.uiValue = object.uiValues[0];
    return vMProp;
};
/**
 * This function returns the correct selected Object if the selected object is Allignment Proxy Object
 * @returns  {Object} selected
 */
export let getSelectedInParamProjSublocation = function () {
    var selected = appCtxSvc.getCtx('parammgmtctx.selected');
    if (selected && selected.modelType.typeHierarchyArray.indexOf('Att1AttributeAlignmentProxy') > -1) {
        var sourceAttribute = _.get(selected, 'props.att1SourceAttribute.dbValue', undefined);
        if (sourceAttribute) {
            selected = cdm.getObject(sourceAttribute);
        }
    }
    return selected;
};
export let getParamgmtTextBundle = function () {
    var resource = app.getBaseUrlPath() + '/i18n/Att1AttrMappingMessages.json';
    return localeService.getLoadedText(resource);
};
export let prepareErrorMessage = function (message, parameters) {
    var msg = message;
    if (parameters && parameters.length > 0) {
        for (var i = 0; i < parameters.length; i++) {
            msg = msg.replace('{' + i + '}', parameters[i]);
        }
    }
    return msg;
};
export let getParentUids = function (selectedObjects) {
    var parentUids = '';
    _.forEach(selectedObjects, function (object) {
        parentUids = parentUids.concat('#' + object.uid);
    });
    parentUids = parentUids.slice(1);
    return parentUids;
};
export let getParameterDefinitionOnly = function () {
    return _.filter(_.get(appCtxSvc, 'ctx.awClipBoardProvider', undefined), function (objToCopy) {
        return objToCopy.modelType.typeHierarchyArray.indexOf('Att0AttributeDefRevision') > -1;
    });
};
/**
 * Unregister the context
 */
export let unregisterContexts = function () {
    appCtxSvc.unRegisterCtx('canCheckoutProxyObjects');
    appCtxSvc.unRegisterCtx('canCheckinProxyObjects');
};

export let getOpenedParamProject = function () {
    var openedObject = appCtxSvc.getCtx('locationContext').modelObject;
    if (cmm.isInstanceOf('Att0ParamProject', openedObject.modelType)) {
        return openedObject;
    } else if (cmm.isInstanceOf('Att0ParamGroup', openedObject.modelType)) {
        openedObject = cdm.getObject(openedObject.props.att0ParamProject.dbValues[0]);
    } else if (appCtxSvc.ctx.parammgmtctx && appCtxSvc.ctx.parammgmtctx.paramProject) {
        openedObject = appCtxSvc.ctx.parammgmtctx.paramProject;
    }

    return openedObject;
};

export let getConfigurationObject = function () {
    var configurationContextObject = null;
    var openedObject = appCtxSvc.getCtx('locationContext').modelObject;
    if (cmm.isInstanceOf('Att0ParamProject', openedObject.modelType)) {
        configurationContextObject = cdm.getObject(_.get(openedObject, 'props.Att0HasConfigurationContext.dbValues[0]', undefined));
    } else if (cmm.isInstanceOf('Att0ParamGroup', openedObject.modelType)) {
        openedObject = cdm.getObject(openedObject.props.att0ParamProject.dbValues[0]);
        configurationContextObject = cdm.getObject(_.get(openedObject, 'props.Att0HasConfigurationContext.dbValues[0]', undefined));
    } else if (appCtxSvc.ctx.parammgmtctx && appCtxSvc.ctx.parammgmtctx.ConfigurationContext) {
        configurationContextObject = _.get(appCtxSvc, 'ctx.parammgmtctx.ConfigurationContext', undefined);
    }
    return configurationContextObject;
};

/**
 *
 * @param {String} propName propertyName of which we ned to get the Value
 * @returns {String} propValue returns the PropertyValue
 */
export let getRequiredPropValueFromConfigurationContext = function (propName) {
    if (propName) {
        var configurationContextObject = exports.getConfigurationObject();
        var propValue = null;
        if (configurationContextObject) {
            propValue = _.get(configurationContextObject, 'props.' + propName, undefined);
        }
    }
    return propValue;
};

/**
 * checks if the variant configuration is attached with the parameter Project.
 * @returns { boolean } hasVariantConfigContext
 */
export let isVariantConfigurationContextAttached = function () {
    var hasVariantConfigContext = false;
    var locationObject = getOpenedParamProject();
    if (locationObject) {
        if (_.get(locationObject, 'props.Att0HasVariantConfigContext.dbValues[0]', undefined)) {
            hasVariantConfigContext = true;
        }
        return hasVariantConfigContext;
    }
};

export let checkOverriddenParams = function (attributes) {
    appCtxSvc.unRegisterCtx('ignoredOverriddenParams');

    var paramList = [];
    var ignoredOverriddenParams = [];
    for (var i = 0; i < attributes.length; i++) {
        if (attributes[i].props.att1InContext.dbValues[0] === '1') {
            //it means this is overridden attribute, ignore this
            ignoredOverriddenParams.push(attributes[i]);
        } else {
            paramList.push(attributes[i]);
        }
    }
    if (ignoredOverriddenParams.length > 0) {
        appCtxSvc.registerCtx('ignoredOverriddenParams', ignoredOverriddenParams);
    }
    return paramList;
};

export let isTCReleaseAtLeast122 = function () {
    var tcSessionData = appCtxSvc.getCtx('tcSessionData');
    if (tcSessionData && (tcSessionData.tcMajorVersion > 12 || tcSessionData.tcMajorVersion === 12 && tcSessionData.tcMinorVersion >= 2)) {
        return true;
    }
    return false;
};
export let getSelectedForImport = function (data) {
    var selected = appCtxSvc.getCtx('selected');
    var pselected = appCtxSvc.getCtx('pselected');
    var primaryPageId = _.get(appCtxSvc, 'ctx.xrtPageContext.primaryXrtPageID', undefined);
    var secondaryPageId = _.get(appCtxSvc, 'ctx.xrtPageContext.secondaryXrtPageID', undefined);
    var sourceObj = null;
    if (cmm.isInstanceOf('Att0MeasurableAttribute', selected.modelType)) {
        if (cmm.isInstanceOf('Att1AttributeAlignmentProxy', pselected.modelType)) {
            sourceObj = cdm.getObject(pselected.props.att1SourceAttribute.dbValues[0]);
            if (sourceObj && sourceObj.modelType.typeHierarchyArray.indexOf('Att0ParamGroup') > -1) {
                return sourceObj;
            }
        }
        return pselected;
    } else if (cmm.isInstanceOf('Att1AttributeAlignmentProxy', selected.modelType)) {
        sourceObj = cdm.getObject(selected.props.att1SourceAttribute.dbValues[0]);
        if (sourceObj && sourceObj.modelType.typeHierarchyArray.indexOf('Att0ParamGroup') > -1) {
            return sourceObj;
        }
        return pselected;
    } else if (cmm.isInstanceOf('Arm0RequirementElement', selected.modelType)) {
        return selected;
    }
    //handle for studies
    if (secondaryPageId === 'tc_xrt_Studies' || secondaryPageId === 'tc_xrt_Requests' || (primaryPageId === 'tc_xrt_Studies' || primaryPageId === 'tc_xrt_Requests')) {
        return selected;
    }
    var contextObj = appCtxSvc.getCtx('xrtSummaryContextObject');
    if (contextObj) {
        return contextObj;
    }
    return selected;
};
var getMessageString = function (messages, msgObj) {
    _.forEach(messages, function (object) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max([msgObj.level, object.level]);
    });
};

// This API sets the ctx.parammgmtctx.selectedParentsAreModifiable based on the server command Att1AddMeasurableAttrFromTable
// Note, it should be invoked while loading the parameters table for the given parent, and or while the parent selections changed.
export let resetParentAccess = function () {
    var xrtSummaryContextObject = _.get(appCtxSvc, 'ctx.xrtSummaryContextObject', undefined);
    if( xrtSummaryContextObject !== undefined && xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Awb0Element') > -1 ) {
        if( xrtSummaryContextObject.props && xrtSummaryContextObject.props.awb0UnderlyingObject ) {
            var underlyingObjectUid = xrtSummaryContextObject.props.awb0UnderlyingObject.dbValues[0];
            var underlyingObject = cdm.getObject( underlyingObjectUid );
            if ( underlyingObject && underlyingObject.props && underlyingObject.props.is_modifiable ) {
                var isModifiable = underlyingObject.props.is_modifiable.dbValues[0];
                _.set(appCtxSvc, 'ctx.parammgmtctx.selectedParentsAreModifiable', isModifiable === '1');
            } else {
                // To load is_modifiable
                var propertiesToLoad = [ 'is_modifiable' ];
                var objArray = [];
                objArray.push( {
                    uid: underlyingObjectUid
                } );

                loadModelObjects( objArray, propertiesToLoad ).then( function() {
                    setTimeout( function() {
                        underlyingObject = cdm.getObject( underlyingObjectUid );
                        if( underlyingObject && underlyingObject.props && underlyingObject.props.is_modifiable ) {
                            var isModifiable = underlyingObject.props.is_modifiable.dbValues[0];
                            _.set(appCtxSvc, 'ctx.parammgmtctx.selectedParentsAreModifiable', isModifiable === '1');
                        }
                    }, 500 );
                } );
            }
        }
    } else {
        var isModifiable = _.get(appCtxSvc, 'ctx.visibleServerCommands.Att1AddMeasurableAttrFromTable', false);
        _.set(appCtxSvc, 'ctx.parammgmtctx.selectedParentsAreModifiable', isModifiable);
        // in case the server command is evaluated again because of the selection change
        var visibleServerCmdListener = eventBus.subscribe( 'soa.getVisibleCommands', function() {
            isModifiable = _.get(appCtxSvc, 'ctx.visibleServerCommands.Att1AddMeasurableAttrFromTable', false);
            _.set(appCtxSvc, 'ctx.parammgmtctx.selectedParentsAreModifiable', isModifiable);
            eventBus.unsubscribe( visibleServerCmdListener );
        } );
    }
};

/**
 * Load model objects common properties require to show
 * @param {Array} objsToLoad - Model object list
 * returns the model objects from the given input
 */

export let loadModelObjects = function( objsToLoad, cellProp ) {
    var deferred = AwPromiseService.instance.defer();
    tcVmoService.getViewModelProperties( objsToLoad, cellProp ).then( function( response ) {
        deferred.resolve( response );
    } );
    return deferred.promise;
};

export let setParamTableCtx = function (data, selectedParameters) {
    var parentOfInterests = [];
    var inContextParameterSelectedCount = 0;
    var selectedParameterNames;
    var selectedParentsFromPWA = _.get(appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', []);
    if (selectedParameters && selectedParameters.length > 0) {
        parentOfInterests = exports.getParentOfInterests(selectedParameters);
        selectedParameterNames = exports.getSelectedParameterNames(selectedParameters);
        _.forEach(selectedParameters, function (parameter) {
            if (parameter.props['REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext'] &&
                parameter.props['REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext'].dbValues[0] === 'true') {
                inContextParameterSelectedCount++;
            }
        });
    }
    //below cases are valid only for the case of showAttrProxy Table i.e Only one parent is selected from PWA
    if (selectedParentsFromPWA.length === 1) {
        _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.selectedProxyParameters', selectedParameters);
    }
    _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parentOfInterests', parentOfInterests);
    _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.inContextParameterSelectedCount', inContextParameterSelectedCount);
    _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.selectedParameterNames', selectedParameterNames);
};

export let selectedObjectIsModifiable = function (parentObj, parentObjWithParameters) {
    var selectedObjectIsModifiable = false;
    if (parentObjWithParameters) {
        var incontextParameterList = parentObjWithParameters.incontextParamList;
        var nonIncontextParameterList = parentObjWithParameters.nonIncontextList;
        //when Both In-context and NonContext Parameters Are selected
        if (incontextParameterList.length > 0 && nonIncontextParameterList.length > 0) {
            selectedObjectIsModifiable = exports.inContextParametersAreModifiable(incontextParameterList) && exports.reusableParametersAreModifiable(parentObj);
        } else if (nonIncontextParameterList.length > 0) {
            selectedObjectIsModifiable = exports.reusableParametersAreModifiable(parentObj);
        } else {
            selectedObjectIsModifiable = exports.inContextParametersAreModifiable(incontextParameterList);
        }
        return selectedObjectIsModifiable;
    }
};

/**
 *
 * @param {*Array} incontextParameterList List Of IncontextParameter
 * check only if parameter is modifiable in case of Incontext Parameter
 */
//for incontext parameter check access on the source attribute Object
export let inContextParametersAreModifiable = function (incontextParameterList) {
    var selectedObjectIsModifiable = false;
    const modifiableParameters = incontextParameterList.filter(parameter => cdm.getObject(parameter.props.att1SourceAttribute.dbValue).props.is_modifiable.dbValues[0] === '1');
    if (modifiableParameters.length === incontextParameterList.length) { selectedObjectIsModifiable = true; }
    return selectedObjectIsModifiable;
};

export let reusableParametersAreModifiable = function (parentObj) {
    var selectedObjectIsModifiable = false;
    let underlyingObject = null;
    if (parentObj && parentObj[0].props && parentObj[0].props.awb0UnderlyingObject && parentObj[0].props.awb0UnderlyingObject.dbValues[0]) {
        underlyingObject = cdm.getObject(parentObj[0].props.awb0UnderlyingObject.dbValues[0]);
        if (underlyingObject && underlyingObject.props && underlyingObject.props.is_modifiable.dbValues[0]) {
            selectedObjectIsModifiable = underlyingObject.props.is_modifiable.dbValues[0] === '1';
        }
    }
    return selectedObjectIsModifiable;
};
export let getParentOfInterests = function (selectedProxyParameters) {
    var parentOfInterests = [];
    var parentParameterMap = new Map();
    _.forEach(selectedProxyParameters, function (proxyParam) {
        var parentId = _.get(proxyParam, 'props.att1SourceElement.dbValues[0]', undefined);
        if (parentId) {
            var parameterList = parentParameterMap.get(parentId) || [];
            parameterList.push(proxyParam);
            parentParameterMap.set(parentId, parameterList);
        }
    });
    //set the ParentInput Map in Context
    _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parentParameterMap', parentParameterMap);
    for (const [parentId, parameterList] of parentParameterMap.entries()) {
        var mapOfInterests = [];
        var incontextParamList = [];
        var nonIncontextList = [];
        _.forEach(parameterList, function (parameter) {
            if (parameter.props['REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext'] &&
                parameter.props['REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext'].dbValues[0] === 'true') {
                incontextParamList.push(parameter);
            } else {
                nonIncontextList.push(parameter);
            }
        });
        mapOfInterests = { parentId: parentId, parentIsModifiable: false, incontextParamList: incontextParamList, nonIncontextList: nonIncontextList };
        parentOfInterests.push(mapOfInterests);
    }
    return parentOfInterests;
};
export let getSelectedParameterNames = function (selectedProxyParameters) {
    var parameterNames = '';
    var sublocation = _.get(appCtxSvc, 'ctx.sublocation.nameToken', undefined);
    var selectedParameterModelObjects = _.get(appCtxSvc, 'ctx.mselected', []);
    if (sublocation === 'com.siemens.splm.client.attrtarget.paramProjectSubLocation:Att1ParamProjectSubLocation') {
        selectedParameterModelObjects = _.filter(_.get(appCtxSvc, 'ctx.parammgmtctx.mselected', []), function (element) {
            return element.modelType.typeHierarchyArray.indexOf('Att0MeasurableAttribute') > -1;
        });
    }
    _.forEach(selectedParameterModelObjects, function (parameter) {
        parameterNames = parameterNames.concat(',', TypeDisplayNameService.instance.getDisplayName(parameter));
    });
    var parameterNamesFinal = parameterNames.slice(1);
    _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.selectedParameterNames', parameterNamesFinal);
    return parameterNamesFinal;
};

export let refreshParameterTable = function (response, source) {
    var responseServiceData = _.get(response, 'ServiceData.deleted', []);
    var updatedResponseServiceData = _.get(response, 'ServiceData.updated', []);
    if (source || responseServiceData.length > 0 || updatedResponseServiceData.length > 0) {
        var locationContext = _.get(appCtxSvc, 'ctx.locationContext', undefined);
        var inHomeFolder = locationContext.modelObject.modelType.typeHierarchyArray.indexOf('Folder') > -1;
        var paramProjectSelectedParameters = _.get(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parameterSelectedInPramProjectContext', false);
        var selectedElementsInPWA = _.get(appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', []);
        var selectedProxyParams = _.get(appCtxSvc, 'ctx.parammgmtctx.selectedProxyParams', []);
        var splitTableLocation = _.get(appCtxSvc, 'ctx.xrtPageContext.secondaryXrtPageID', '');
        var selected = _.get(appCtxSvc, 'ctx.selected', undefined);
        var selectedParent = _.get(appCtxSvc, 'ctx.pselected', undefined);
        var projectSelected;
        var groupSelected;
        var isItemRevSelected;
        if (selected) {
            projectSelected = selected.modelType.typeHierarchyArray.indexOf('Att0ParamProject') > -1;
            groupSelected = selected.modelType.typeHierarchyArray.indexOf('Att0ParamGroup') > -1 || _.get(appCtxSvc, 'ctx.parammgmtctx.selectedParamGroups', []).length > 0;
            isItemRevSelected = selected.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1;
        }

        var mappedAttributeTableVisible = _.get(appCtxSvc, 'ctx.Att1ShowMappedAttribute', undefined);
        var selectedParamsFromPwa = _.get(appCtxSvc, 'ctx.parammgmtctx.mselected', []);
        //handle For Project Group
        if (!isItemRevSelected && (paramProjectSelectedParameters || projectSelected || groupSelected)) {
            if (inHomeFolder) {
                eventBus.publish('refreshAtt1ShowParamProxyTable');
            } else {
                exports.refreshParamProjectInOwnLocation(selectedProxyParams.length > 0, _.get(appCtxSvc, 'ctx.parammgmtctx.selected', undefined));
            }
        } else if (selectedParamsFromPwa.length > 0 && !isItemRevSelected && !inHomeFolder) {
            exports.refreshParamProjectInOwnLocation(true, _.get(appCtxSvc, 'ctx.parammgmtctx.selected', undefined));
        } else if (mappedAttributeTableVisible) {
            eventBus.publish('Att1ShowMappedAttribute.refreshTable');
            exports.resetSelectionAfterRefresh(selectedElementsInPWA, _.get(appCtxSvc, 'ctx.occmgmtContext.openedElement'));
        } else if ((splitTableLocation === 'tc_xrt_AttributesForDCP' || splitTableLocation === 'tc_xrt_Documentation') && selectedElementsInPWA.length === 1) {
            eventBus.publish('Att1ShowAttrProxyTable.refreshTable');
            exports.resetSelectionAfterRefresh(selectedElementsInPWA, _.get(appCtxSvc, 'ctx.occmgmtContext.openedElement'));
        } else {
            //handle For ItemRevision or the case when we have selected parameter from parameter tab for itemRevision in its own location
            var relatedModifiedData = { relatedModified: [_.get(appCtxSvc, 'ctx.selected', undefined)] };
            if (source === 'attachParameter' && selected) {
                if (selected && selected.modelType.typeHierarchyArray.indexOf('Att0MeasurableAttribute') > -1) {
                    relatedModifiedData.relatedModified = [_.get(appCtxSvc, 'ctx.pselected', undefined)];
                }
            } else if (selectedParent && selectedParent.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
                relatedModifiedData.relatedModified = [_.get(appCtxSvc, 'ctx.pselected', undefined)];
            }
            eventBus.publish('cdm.relatedModified', relatedModifiedData);
        }
        //parameterTableCtx
        _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx', null);
    }
};
export let resetSelectionAfterRefresh = function (selectedBeforeRefresh, pselectedBeforeRefresh) {
    if (selectedBeforeRefresh) {
        if (selectedBeforeRefresh.length === 1) {
            selectedBeforeRefresh = selectedBeforeRefresh[0];
        }
        selectionService.updateSelection(selectedBeforeRefresh, pselectedBeforeRefresh);
    }
};
/**
 * This function will fire event that will refresh the selected group in Project/Group PWA.
 */
export let refreshParamProjectInOwnLocation = function (isFromPWaSelection, selectedElement) {
    var relatedModifiedData = {};
    var selectedProxyParams = _.get(appCtxSvc, 'ctx.parammgmtctx.selectedProxyParams', []);
    var parameterSelectedInPramProjectContext = _.get(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parameterSelectedInPramProjectContext', undefined);
    if (isFromPWaSelection && !parameterSelectedInPramProjectContext) {
        if (selectedProxyParams.length > 0) {
            // now check if the parent Element is of type Project So that we can refresh completePWA
            if (exports.checkAnyOfParentIsOfTypeProject()) {
                relatedModifiedData = {
                    isResetPWA: true
                };
            } else {
                relatedModifiedData = {
                    isCutParamFromPWA: true
                };
            }
        }
    } else if (selectedElement && selectedElement.modelType.typeHierarchyArray.indexOf('Att0ParamProject') > -1 || selectedElement.modelType.typeHierarchyArray.indexOf('Att0ParamGroup') > -1 || selectedElement.modelType.typeHierarchyArray.indexOf('Att0MeasurableAttribute') > -1 && selectedProxyParams.length === 0) {
        relatedModifiedData = {
            relatedModified: selectedElement,
            refreshParamTable: true
        };
    }
    eventBus.publish('paramProject.expandSelectedNode', relatedModifiedData);
    if (_.get(appCtxSvc, 'ctx.parammgmtctx.selectedProxyParams', undefined)) {
        delete appCtxSvc.ctx.parammgmtctx.selectedProxyParams;
    }
};
export let checkAnyOfParentIsOfTypeProject = function () {
    var selectioncontainsProject = false;
    var selectedProxyParams = _.get(appCtxSvc, 'ctx.parammgmtctx.selectedProxyParams', []);

    selectedProxyParams.some(function (parameter) {
        var parent = cdm.getObject(_.get(parameter, 'props.att1SourceElement.dbValues[0]', undefined));
        if (parent && parent.modelType.typeHierarchyArray.indexOf('Att0ParamProject') > -1) {
            selectioncontainsProject = true;
            return parent.modelType.typeHierarchyArray.indexOf('Att0ParamProject') > -1 === true;
        }
    });
    return selectioncontainsProject;
};
export let checkParamSelectedWithoutSWA = function () {
    var parameterSelectedWithoutSWA = false;
    var selectedParamsFromPwa = _.get(appCtxSvc, 'ctx.parammgmtctx.mselected', []);
    var secondaryTab = _.get(appCtxSvc, 'ctx.xrtPageContext.secondaryXrtPageID', undefined);
    if (!secondaryTab && selectedParamsFromPwa.length > 0) {
        parameterSelectedWithoutSWA = true;
    }
    _.set(appCtxSvc, 'ctx.parammgmtctx.paramSelectedWithoutSWA', parameterSelectedWithoutSWA);
    return parameterSelectedWithoutSWA;
};
export let parameterSelectedInPramProjectContext = function (selectedObjects) {
    var parameterSelectedInPramProjectContext = false;
    //in case of Home Folder And item revision in its own location
    var locationContext = _.get(appCtxSvc, 'ctx.locationContext', undefined);
    var paramProjectSelectedParameters = _.get(appCtxSvc, 'ctx.parammgmtctx.mselected', []);
    var pselected = _.get(appCtxSvc, 'ctx.pselected', undefined);
    var inHomeFolder = locationContext.modelObject.modelType.typeHierarchyArray.indexOf('Folder') > -1;
    var secondaryTab = _.get(appCtxSvc, 'ctx.xrtPageContext.secondaryXrtPageID', undefined);
    var selectedParamsFromPwa = _.get(appCtxSvc, 'ctx.parammgmtctx.mselected', []);
    var isParamProjectContext = false;
    if (pselected) {
        isParamProjectContext = pselected.modelType.typeHierarchyArray.indexOf('Att0ParamProject') > -1 || pselected.modelType.typeHierarchyArray.indexOf('Att0ParamGroup') > -1;
    }
    if (paramProjectSelectedParameters || inHomeFolder && isParamProjectContext) {
        parameterSelectedInPramProjectContext = selectedObjects.length > 0;
        _.set(appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parameterSelectedInPramProjectContext', parameterSelectedInPramProjectContext);
    }
    return parameterSelectedInPramProjectContext;
};

/**
 * This API is added to process the message shown to user after importParameterExcel SOA import
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error/Success message to be displayed to user
 */
export let processImportExcelMessage = function ( response, data) {
    var responseMsg = {
        importSuccessMsg: '',
        importPartialErrorsMsg: ''
    };

    var successMsg = processImportSuccess( response, data );
    var importPartialErrorsMsg = processPartialErrors( response );
    responseMsg.importSuccessMsg = successMsg;
    responseMsg.importPartialErrorsMsg = importPartialErrorsMsg;

    return responseMsg;
};

/**
 * This function is added to process the Partial error being thrown from the importParameterExcel SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
function processPartialErrors(response) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if (response && response.ServiceData.partialErrors) {
        _.forEach(response.ServiceData.partialErrors, function (partialError) {
            getMessageString(partialError.errorValues, msgObj);
        });
    }

    return msgObj.msg;
}

/**
 * This function is added to process the successful import from the importParameterExcel SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Success message to be displayed to user
 */
function processImportSuccess( response, data) {
    var createObjLen=0;
    var createdObj = null;
    var updatedObj = null;
    var updatedObjLen=0;
    var createdObjName = '';
    var updatedObjName = '';
    var isParamDef = false;



    if (response && response.importExcelOutput) {
        _.forEach(response.importExcelOutput, function (infoImport) {
           if(infoImport.createdObjects) {
                createObjLen = infoImport.createdObjects.length;
                if( createObjLen === 1 ) {
                    createdObj = cdm.getObject(infoImport.createdObjects[0].uid);
                    if(createdObj) {
                        createdObjName = _.get(createdObj, 'props.object_name.dbValues[0]', undefined);
                    }
                }
           }
           if(infoImport.updatedObjects) {
                updatedObjLen = infoImport.updatedObjects.length;
                if( updatedObjLen === 1 ) {
                    updatedObj = cdm.getObject(infoImport.updatedObjects[0].uid);
                    if(updatedObj) {
                        updatedObjName = _.get(updatedObj, 'props.object_name.dbValues[0]', undefined);
                    }
                }
           }
        });
    }

    var selected = appCtxSvc.getCtx('selected');
    if (selected && selected.modelType && selected.modelType.typeHierarchyArray ) {
        if( (selected.modelType.typeHierarchyArray.indexOf( 'Att0ParamDictionary' ) > -1 )
                || selected.modelType.typeHierarchyArray.indexOf('Att0AttributeDefRevision') > -1 )
        {
            isParamDef = true;
        }
    }

    var msg='';

    if( createObjLen === 1 ) {
        msg = msg.concat( data.i18n.Att1AddImportSuccess.replace( '{0}', createdObjName ) );
    } else if( createObjLen > 1 ) {
        if ( isParamDef ) {
            msg = msg.concat( data.i18n.Att1AddParamDefMultipleImportSuccess.replace( '{0}', createObjLen ) );
        } else {
            msg = msg.concat( data.i18n.Att1AddParamMultipleImportSuccess.replace( '{0}', createObjLen ) );
        }
    }
    if( updatedObjLen === 1 ) {
        msg = msg.concat( data.i18n.Att1UpdateImportSuccess.replace( '{0}', updatedObjName ) );
    } else if ( updatedObjLen > 1) {
        if ( isParamDef ) {
            msg = msg.concat( data.i18n.Att1UpdateParamDefMultipleImportSuccess.replace( '{0}', updatedObjLen ) );
        } else {
            msg = msg.concat( data.i18n.Att1UpdateParamMultipleImportSuccess.replace( '{0}', updatedObjLen ) );
        }
    }
    return msg;
}

export let getValidParameterInstance = function () {
    var selected = appCtxSvc.getCtx('selected');
    if (cmm.isInstanceOf('Att1AttributeAlignmentProxy', selected.modelType)) {
        //get the source attribute
        var objUid = selected.props.att1SourceAttribute.dbValues[0];
        var underlyingObj = cdm.getObject(objUid);

        if (cmm.isInstanceOf('Att0MeasurableAttribute', underlyingObj.modelType)) {
            return underlyingObj;
        }
    }
    return selected;
};
export let getTopElement = function (node) {
    if (node.modelType.typeHierarchyArray.indexOf('Awb0Element') > -1) {
        var loop = true;
        while (loop) {
            if (node.props.awb0Parent && node.props.awb0Parent.dbValues[0]) {
                node = cdm.getObject(node.props.awb0Parent.dbValues[0]);
            } else {
                loop = false;
            }
        }
    }
    return node;
};

/**
 * Copy the parameter underlying objects to the clipboard
 *
 * @param selectedObjs Selected objects
 * @returns Parameter underlying objects
 */
export let att1CopyParamUnderlyingObjects = function (selectedObjs) {
    if (selectedObjs && selectedObjs.length > 0) {
        var underlyingObjs = [];
        _.forEach(selectedObjs, function (obj) {
            if (obj.modelType && obj.modelType.typeHierarchyArray.indexOf('Att1AttributeAlignmentProxy') > -1 || obj.type === 'Att1AttributeAlignmentProxy') {
                if (obj.props && obj.props.att1SourceAttribute) {
                    var objUid = obj.props.att1SourceAttribute.dbValues[0];
                    var underlyingObj = cdm.getObject(objUid);
                    if (underlyingObj) {
                        underlyingObjs.push(underlyingObj);
                    }
                }
            }
        });
        // Copy userObjects to the clipboard
        clipboardService.instance.setContents(underlyingObjs);
    }
};

/**
 * Get the owning object from the parameter proxy
 *
 * @param proxy Parameter proxy object
 * @returns The owning object of the parameter proxy
 */
export let getOwningObjectFromParamProxy = function (proxy) {
    if (proxy) {
        proxy = cdm.getObject(proxy.uid);
    }
    if (proxy && proxy.props && proxy.props.att1SourceAttribute) {
        var objUid = proxy.props.att1SourceAttribute.dbValues[0];
        return cdm.getObject(objUid);
    }

    return null;
};

/**
 * Get template type to get the corresponding excel templates for export
 * @param {Object} data - The panel's view model object
 * @return {Object} templateName - the name of template
 */
export let getTemplateRequestPref = function (ctx, invoked) {
    var selectedElements = ctx.mselected;
    var pwaSelected = ctx.pselected;
    var templateName = {
        "excel_template_rules": ''
    };
    var context = ctx && ctx.parammgmtctx && ctx.parammgmtctx.mselected ? ctx.parammgmtctx.mselected : ctx.mselected;
    if (ctx && invoked && invoked === "PWA" && ctx.selected
        && (cmm.isInstanceOf('Att0ParamDictionary', ctx.selected.modelType)
            || checkIfParameterFamilyObject(ctx.selected))) {
        setParameterTemplateNameForExport(pwaSelected, selectedElements, templateName, ctx, invoked);
    } else if (ctx && ctx.selected
        && (ctx.parammgmtctx || cmm.isInstanceOf('Att0ParamDictionary', ctx.selected.modelType)
            || checkIfParameterFamilyObject(ctx.selected) || invoked === "SWA")) {
        setParameterTemplateNameForExport(pwaSelected, selectedElements, templateName, ctx, invoked);
        if( context && context.length > 0 && cmm.isInstanceOf('Att0MeasurableAttribute', context[0].modelType)) {
            context = [ pwaSelected ];
            if( cmm.isInstanceOf('Att1AttributeAlignmentProxy', pwaSelected.modelType) ){
                context = adapterSvc.getAdaptedObjectsSync( [ pwaSelected ] );
            }
        }
    }
    cmdPanelSvc.activateCommandPanel("Arm0ExportToRoundTripExcelDocument", "aw_toolsAndInfo", context);
    exports.updateViewForExportPanel(ctx);
};

/**
 * Update the export panel's view
 * @param {Object} pwaSelected - pwa selection in context
 * @param {Object} selectedElements - mselected object in context
 * @param {Object} templateName - template object
 * @param {Object} ctx - The context
 * @return {Object} templateName - the name of template
 */
function setParameterTemplateNameForExport(pwaSelected, selectedElements, templateName, ctx, invoked) {
    var objForExport = {
        templateName: '',
        parameterTemplate: ''
    };

    if (pwaSelected && cmm.isInstanceOf('Att0ParamDictionary', pwaSelected.modelType)) {
        registerContextForExcelExport(objForExport,templateName,"ParameterDefinition_template","parameter_templates");
    } else if (pwaSelected && ( cmm.isInstanceOf('Att0ParamProject', pwaSelected.modelType) ||
        cmm.isInstanceOf('Att0ParamGroup', pwaSelected.modelType))) {
        registerContextForExcelExport(objForExport,templateName,"Parameter_template","parameter_templates");
    } else if (selectedElements && selectedElements.length > 0 &&
        cmm.isInstanceOf('Att0ParamProject', selectedElements[0].modelType)) {
        registerContextForExcelExport(objForExport,templateName,"Parameter_template","parameter_templates");
    } else if (selectedElements && selectedElements.length > 0 &&
        cmm.isInstanceOf('Att0ParamDictionary', selectedElements[0].modelType)) {
        registerContextForExcelExport(objForExport,templateName,"ParameterDefinition_template","parameter_templates");
    } else if (pwaSelected && cmm.isInstanceOf('Crt0VldnContractRevision', pwaSelected.modelType) || selectedElements && selectedElements.length > 0 &&
        cmm.isInstanceOf('Crt0VldnContractRevision', selectedElements[0].modelType) && invoked !== 'PWA') {
        registerContextForExcelExport(objForExport,templateName,"Parameter_VerificationRequest_template","parameter_templates");
    } else if (ctx.parammgmtctx && pwaSelected && invoked !== 'PWA') {
        registerContextForExcelExport(objForExport,templateName,"Parameter_template","parameter_templates");
    } else if (invoked === 'SWA') {
        registerContextForExcelExport(objForExport,templateName,"Parameter_template","parameter_templates");
    } else {
        appCtxSvc.registerCtx('excelTemplateForExport', null);
    }
    return templateName;
}


/**
 * set and register theb excelTemplateForExport context
 * @param {Object} objForExport - object to register
 * @param {Object} templateObject - template object
 * @param {Object} templateName - current template required
 * @param {Object} soaTemplateName - soa Template Name
 */
function registerContextForExcelExport(objForExport,templateObject,templateName,soaTemplateName) {
    templateObject.excel_template_rules = soaTemplateName;
    objForExport.templateName = templateObject;
    objForExport.parameterTemplate = templateName;
    appCtxSvc.registerCtx('excelTemplateForExport', objForExport);
}

/**
 * check if parameter family object
 * @param {Object} selectedElements - current selection
 * @return {Object} boolean flag
 */
function checkIfParameterFamilyObject(selectedElements) {
    if (cmm.isInstanceOf('Att0ParamProject', selectedElements.modelType) ||
        cmm.isInstanceOf('Att0MeasurableAttribute', selectedElements.modelType) ||
        cmm.isInstanceOf('Att0AttributeDefRevision', selectedElements.modelType) ||
        cmm.isInstanceOf('Att0ParamGroup', selectedElements.modelType) ||
        cmm.isInstanceOf('Att1AttributeAlignmentProxy', selectedElements.modelType) ||
        cmm.isInstanceOf('Crt0VldnContractRevision', selectedElements.modelType)) {
        return true;
    }
    return false;
}

/**
 * Update the view
 * @param {Object} data - The panel's view model object
 * @return {Object} ctx - The context
 */
export let updateViewForExportPanel = function (ctx) {
    var selectedElements = ctx.mselected;
    var pwaSelected = ctx.pselected;
    var parameterFamilyObjects = 0;
    var parameterDictionaryObject = 0;
    var showSettingsSection = false;
    var showRadioButton = false;
    if (ctx.excelTemplateForExport) {
        var excelTemplateForExport = ctx.excelTemplateForExport;
        for (var i = 0; i < selectedElements.length; i++) {
            if ((checkIfParameterFamilyObject(selectedElements[i]) || ctx.parammgmtctx) &&
                !cmm.isInstanceOf('Att0ParamDictionary', selectedElements[i].modelType)) {
                parameterFamilyObjects += 1;
            }
            else if (cmm.isInstanceOf('Att0ParamDictionary', selectedElements[i].modelType)) {
                parameterDictionaryObject += 1;
            }
        }
        if (parameterFamilyObjects === selectedElements.length) {
            showRadioButton = false;
            if (pwaSelected && cmm.isInstanceOf('Att0ParamDictionary', pwaSelected.modelType)) {
                showSettingsSection = true;
            }
            else {
                showSettingsSection = false;
            }
        } else if (parameterDictionaryObject > 0) {
            showRadioButton = false;
            showSettingsSection = true;
        }
        excelTemplateForExport.showRadioButton = showRadioButton;
        excelTemplateForExport.showSettingsSection = showSettingsSection;

        appCtxSvc.updateCtx('excelTemplateForExport',excelTemplateForExport);
    }
};

export let createInputForSetParametersDirection = function(direction) {
    var inputs = [];
    var selectedParent = _.get( appCtxSvc, 'ctx.pselected', undefined );
    var locationContext = _.get( appCtxSvc, 'ctx.locationContext', undefined );
    //in case of Home Folder And item revision in its own location
    if( locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 || selectedParent.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        inputs = createInputForSetDirectionItemRevision( selectedParent, direction );
    } else {
        inputs = createInputForSetDirectionInAceContext( selectedParent, direction );
    }
    return inputs;
};

function createInputForSetDirectionItemRevision( selectedParent, direction ) {
    var inputs = [];
    var selectedParameters = _.get( appCtxSvc, 'ctx.mselected', undefined );
    var input = { clientId: 'AW_ATT1_setDirection', parent: selectedParent, parameters: selectedParameters, paramDirection: direction };
    inputs.push( input );
    return inputs;
}
/**
 * This function returns the SOA input for SOA call setParametersDirection
 * @returns  {Object} SOA input
 */
function createInputForSetDirectionInAceContext(selectedParent, direction) {
    var inputs = [];
    var parentParameterMap = _.get( appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parentParameterMap', undefined );
    var inputParameters = [];
    for( const [ parentId, parameterList ] of parentParameterMap.entries() ) {
        _.forEach( parameterList, function( parameter ) {
            inputParameters.push( parameter );
        } );
    }
    var input = { clientId: 'AW_ATT1_setDirection', parent: selectedParent, parameters: inputParameters, paramDirection: direction };
    inputs.push( input );
    return inputs;
}

/**
 * This function is added to process the Partial error being thrown from the setAttributeComplexData SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let processPartialErrorForComplexData = function(response) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if (response && response.partialErrors) {
        _.forEach(response.partialErrors, function (partialError) {
            getMessageString(partialError.errorValues, msgObj);
        });
    }

    return msgObj.msg;
};

/**
 *Parameter Management UtilService
 */

export default exports = {
    createViewModelProperty,
    getSelectedInParamProjSublocation,
    getParameterDefinitionOnly,
    unregisterContexts,
    getOpenedParamProject,
    getConfigurationObject,
    getRequiredPropValueFromConfigurationContext,
    isVariantConfigurationContextAttached,
    checkOverriddenParams,
    isTCReleaseAtLeast122,
    getSelectedForImport,
    resetParentAccess,
    setParamTableCtx,
    selectedObjectIsModifiable,
    inContextParametersAreModifiable,
    reusableParametersAreModifiable,
    getParentOfInterests,
    getSelectedParameterNames,
    refreshParameterTable,
    refreshParamProjectInOwnLocation,
    checkAnyOfParentIsOfTypeProject,
    checkParamSelectedWithoutSWA,
    parameterSelectedInPramProjectContext,
    processImportExcelMessage,
    getValidParameterInstance,
    getTopElement,
    getParamgmtTextBundle,
    prepareErrorMessage,
    getParentUids,
    resetSelectionAfterRefresh,
    att1CopyParamUnderlyingObjects,
    getOwningObjectFromParamProxy,
    getTemplateRequestPref,
    updateViewForExportPanel,
    createInputForSetParametersDirection,
    loadModelObjects,
    processPartialErrorForComplexData
};
app.factory('Att1ParameterMgmtUtilService', () => exports);
