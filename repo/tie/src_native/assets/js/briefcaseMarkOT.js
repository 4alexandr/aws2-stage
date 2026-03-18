// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/briefcaseMarkOT
 */
import app from 'app';
import _ from 'lodash';
import 'js/uwPropertyService';
import 'soa/kernel/soaService';
import 'js/appCtxService';
import 'js/iconService';
import 'soa/dataManagementService';
import 'soa/kernel/clientDataModel';
import _appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import policySvc from 'soa/kernel/propertyPolicyService';
import promiseSvc from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import tcSessionData from 'js/TcSessionData';

import eventBus from 'js/eventBus';
import { isContext } from 'vm';
'use strict';

var _$q = null;

var _iconSvc = null;
var _soaSvc = null;
var _dataManagementSvc = null;
var _cdmSvc = null;
var exports = {};

export let getMarkOTSelectedObjects = function (ctx) {

    var replaceItemRevisionWithItem = false;
    var selectedInput = [];

    /* When the Tc version is prior to tc13.1, we have to 
        replace the ItemRevision with Item as the input for SOA addMarkOTForCurrentUser.
        Because removeMarkOTForCurrentUser can only handle Item not ItemRevision.
    */
    var majorVersion = tcSessionData.getTCMajorVersion();
    var minorVersion = tcSessionData.getTCMinorVersion();

    if (majorVersion < 13 || (majorVersion === 13 && minorVersion < 1)) {
        replaceItemRevisionWithItem = true;
    }
    // When ItemRevision is selected, we need to add its Item instead
    if (ctx.aceActiveContext) {

        _.forEach(ctx.mselected, function (selectedObj) {
            if (selectedObj.props.awb0UnderlyingObject && selectedObj.props.awb0UnderlyingObject.dbValues &&
                selectedObj.props.awb0UnderlyingObject.dbValues.length > 0) {

                var underlyingObjectUid = selectedObj.props.awb0UnderlyingObject.dbValues[0];

                selectedInput.push(underlyingObjectUid);
            }
        });
    } else {
        _.forEach(ctx.mselected, function (selectedItem) {
            selectedInput.push(selectedItem.uid);
        });
    }

    // if the preference not found use the predefined list    
    var supportedTypes = (ctx.preferences) ? ctx.preferences.Briefcase_ownership_transfer_supported_types : undefined;
    if (_.isUndefined(supportedTypes) || supportedTypes.length === 0) {
        supportedTypes = ['Item', 'ItemRevision', 'Cpd0CollaborativeDesign', 'Cpd0DesignElement'];
    }

    _appCtxSvc.registerCtx('skippedBriefcaseOTObjs', '');

    var skippedObjectsStrings = [];

    var tempSelected = selectedInput;
    selectedInput = [];

    _.forEach(tempSelected, function (oneUid) {
        let vmo = _cdmSvc.getObject(oneUid);

        // if the object type is not in the support type list, skip it
        var isTypeSupport = false;
        _.forEach(supportedTypes, function (oneType) {
            if (vmo.modelType.typeHierarchyArray.includes(oneType)) {
                isTypeSupport = true;
            }
        });

        if (isTypeSupport) {
            if (replaceItemRevisionWithItem && vmo.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
                selectedInput.push(vmo.props.items_tag.dbValues[0]);
            }
            else {
                selectedInput.push(oneUid);
            }
        }
        else{
            var resource = 'tieMessages';
            var errMessage = '';
            var localTextBundle = localeSvc.getLoadedText(resource);
            errMessage = localTextBundle.markOwnershipTransferPreSoaCheckoutExclusion.replace('{0}', ((vmo.props && vmo.props.object_string) ? vmo.props.object_string.uiValues[0] : vmo.uid) );

            skippedObjectsStrings.push(errMessage);
        }
    });

    _appCtxSvc.registerCtx('skippedBriefcaseOTObjs', skippedObjectsStrings);

    return selectedInput;
};

export let getSiteForMarkOwnershipTransfer = function (data) {

    var siteIDValue = parseInt(data.targetSitesListBox.dbValue.props.site_id.dbValues[0]);
    return siteIDValue;
};

/**
 * Handles error from SOA
 *
 */
export let processMarkOwnershipTransferPartialErrors = function (serviceData, ctx) {
    var partialFailureMessage = _appCtxSvc.getCtx('skippedBriefcaseOTObjs');
    var numOfInvalidTypeObjs = 0;
    if (partialFailureMessage && partialFailureMessage.length > 0) {
        numOfInvalidTypeObjs = partialFailureMessage.length;
    }

    if (serviceData.ServiceData.partialErrors) {
        var messages = '';
        var numOfErrors = ctx.mselected.length - numOfInvalidTypeObjs - serviceData.ServiceData.partialErrors.length;
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {
            errMessage = localTextBundle.markOwnershipTransferFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', ctx.mselected.length);
        }
        else {
            errMessage = localTextBundle.markOwnershipTransferFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
        }

        // markOwnershipTransferFailureMultiple
        _.forEach(serviceData.ServiceData.partialErrors, function (partialError) {

            _.forEach(partialError.errorValues, function (errorValue) {
                if (errorValue.message.length > 0) {
                    messages += '<br>' + errorValue.message;
                }
            });
        });
        
        errMessage += messages;

        if( numOfInvalidTypeObjs > 0){   
            _.forEach(partialFailureMessage, function (msg) {
                errMessage += '<br>' + msg;
            });
        }

        msgSvc.showError(errMessage);
    }
    else if (serviceData.failureInfo.length > 0) {

        var messages = [];
        _.forEach(ctx.mselected, function (obj) {
            var objectString = obj.props.object_string.uiValues[0];

            _.forEach(serviceData.failureInfo, function (oneFailure) {
                var objectUid = oneFailure.objectUID;

                if (objectUid === obj.uid || (obj.modelType.typeHierarchyArray.indexOf('Awb0Element') > -1 && objectUid === obj.props.awb0UnderlyingObject.dbValues[0])) {
                    var errorInfo = oneFailure.errorInfo;
                    
                    for (var err in errorInfo) {
                        var errValue = errorInfo[err].elementValue;
                        if (!isNaN(errValue)) {
                            continue;
                        }

                        if (ctx.mselected.length > 1) {
                            messages.push('\"' + objectString + '\": ' + errValue);
                        }
                        else {
                            messages.push(errValue);
                        }
                    }
                }
            });
        });

        if (messages.length > 0 || numOfInvalidTypeObjs > 0) {
            var resource = 'tieMessages';
            var errMessage = '';
            var localTextBundle = localeSvc.getLoadedText(resource);
            if (ctx.mselected.length > 1) {

                var numOfErrors = ctx.mselected.length - numOfInvalidTypeObjs - messages.length;
                errMessage = localTextBundle.markOwnershipTransferFailureMultiple.replace('{0}', numOfErrors);
                errMessage = errMessage.replace('{1}', ctx.mselected.length);

                if (messages.length > 0) {
                    _.forEach(messages, function (msg) {
                        errMessage += '<br>' + msg;
                    });
                }
            }
            else {
                errMessage = localTextBundle.markOwnershipTransferFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
                if (messages.length > 0) {
                    errMessage = errMessage.replace('{1}', messages[0]);
                }
            }

            if( numOfInvalidTypeObjs > 0){   
                _.forEach(partialFailureMessage, function (msg) {
                    errMessage += '<br>' + msg;
                });
            }

            msgSvc.showError(errMessage);
        }        
        else{
            var messages = '';
            var resource = 'tieMessages';
            var localTextBundle = localeSvc.getLoadedText(resource);
            if (ctx.mselected.length > 1) {
                messages = localTextBundle.markOwnershipTransferFailureMultiple.replace('{0}', ctx.mselected.length);
                messages = messages.replace('{1}', ctx.mselected.length);
            }
            else {
                messages = localTextBundle.markOwnershipTransferSuccessSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
            }

            msgSvc.showInfo(messages);
        }
    }
    else if (numOfInvalidTypeObjs > 0) {
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {

            var numOfErrors = ctx.mselected.length - numOfInvalidTypeObjs;
            errMessage = localTextBundle.markOwnershipTransferFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', ctx.mselected.length);           
        }
        else {
            errMessage = localTextBundle.markOwnershipTransferFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);           
        }

        if( numOfInvalidTypeObjs > 0){   
            _.forEach(partialFailureMessage, function (msg) {
                errMessage += '<br>' + msg;
            });
        }

        msgSvc.showError(errMessage);
    }
    else {
        var messages = '';
        var resource = 'tieMessages';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {
            messages = localTextBundle.markOwnershipTransferFailureMultiple.replace('{0}', ctx.mselected.length);
            messages = messages.replace('{1}', ctx.mselected.length);
        }
        else {
            messages = localTextBundle.markOwnershipTransferSuccessSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
        }

        msgSvc.showInfo(messages);
    }

    _appCtxSvc.unRegisterCtx('skippedBriefcaseOTObjs');
};

var registerPolicy = function () {
    return policySvc.register({
        types: [{
            name: 'POM_imc',
            properties: [{
                name: 'name'
            },
            {
                name: 'site_id'
            }
            ]
        }]
    });
};

/* 
 * Process the list of objects having been marked for OT
 */
export let getTargetSitesWithMarkOT = function (response, data) {
    var emptyListModel = _getEmptyListModel();
    var targetSites = [];
    targetSites.push(emptyListModel);

    if (!_.isUndefined(response.markInfo)) {

        // Have to load all the sites to get more info.
        var deferred = promiseSvc.instance.defer();
        var soInput = {
            siteType: "OfflineGMS"
        };

        var policyId = registerPolicy();
        soaSvc.postUnchecked('GlobalMultiSite-2007-12-ImportExport', 'getRemoteSites', soInput).then(
            function (response2) {
                if (policyId) {
                    policySvc.unregister(policyId);
                }
                if (!_.isUndefined(response2.modelObjects)) {
                    var modelObjects = response2.modelObjects;

                    // Build a site id to name map, so that we can display the name value later
                    var sitesMap = new Map();
                    _.forEach(modelObjects, function (modelObj) {
                        sitesMap.set(modelObj.props.site_id.dbValues[0], modelObj.props.name.dbValues[0]);
                    });

                    // Build a site to objects (uid and site name) map to cache the SOA returned data
                    var site2ObjectsMap = new Map();
                    for (const idx in response.markInfo) {

                        var targetSiteId = response.markInfo[idx].targetSiteId;
                        var objectUid = response.markInfo[idx].objectUID;
                        var siteName = sitesMap.get(targetSiteId.toString());

                        var siteObjs = site2ObjectsMap.get(targetSiteId);

                        if (_.isUndefined(siteObjs)) {
                            var objs = [];
                            objs.push({
                                uid: objectUid,
                                site: siteName
                            });
                            site2ObjectsMap.set(targetSiteId, objs);
                        }
                        else {
                            siteObjs.push({
                                uid: objectUid,
                                site: siteName
                            });
                            site2ObjectsMap.set(targetSiteId, siteObjs);
                        }

                        // Collect the unique site names to display them in the target site list box.
                        if (siteName) {
                            var found = false;
                            for (const idxSite in targetSites) {
                                if (targetSites[idxSite].propInternalValue === targetSiteId) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                var listModel = _getEmptyListModel();
                                listModel.propDisplayValue = siteName;
                                listModel.propInternalValue = targetSiteId;

                                targetSites.push(listModel);
                            }
                        }
                    }
                    data.targetSitesListBoxValues = targetSites;
                    data.site2ObjectsMap = site2ObjectsMap;

                    eventBus.publish('targetSite.default');
                }
            },
            function (error) {
                deferred.reject(error);
            });
    }
};

/**
 * Method to load the list data for makred OT objects
 */
export let loadListData = function (data, ctx) {

    _appCtxSvc.registerCtx('pendingOwnershipTransferListSelectAll', undefined);

    var deferred = promiseSvc.instance.defer();

    var site2ObjectsMap = data.site2ObjectsMap;

    if (!_.isUndefined(site2ObjectsMap)) {

        var selectedTargetSite = data.targetSitesListBox.dbValue;

        // Get the object list for the selected site. 
        // Consolidate all objects if no site selected.
        var objectsToList = [];
        if (selectedTargetSite !== '') {
            objectsToList = site2ObjectsMap.get(selectedTargetSite);
        }
        else {
            site2ObjectsMap.forEach(function (objectList, siteId, site2ObjectsMap) {
                objectList.forEach(function (OneObj) {
                    objectsToList.push(OneObj);
                });
            });
        }

        var markedOTObjs = [];
        if (objectsToList.length > 0) {

            // Get all the object uids for the selected site
            var objectUids = [];
            objectsToList.forEach(oneObject => {
                objectUids.push(oneObject.uid);
            });

            _dataManagementSvc.loadObjects(objectUids).then(function () {

                objectsToList.forEach(oneLoadedObject => {

                    let cliObj = _cdmSvc.getObject(oneLoadedObject.uid);

                    //We construct a view model object so that we can add an additional property on the VMO.
                    var vmo = viewModelObjectService.constructViewModelObjectFromModelObject(cliObj);
                    vmo.cellProperties["pending_ot_site"] = ({ key: data.i18n.pendingOwnershipTransferSiteLabel, value: oneLoadedObject.site });

                    markedOTObjs.push(vmo);
                });

                deferred.resolve(markedOTObjs);

                return deferred.promise;
            });
        }
        else {
            deferred.resolve(markedOTObjs);

            return deferred.promise;
        }
    }
    return deferred.promise;
};

/**
 * Method to handle toggle selection command  in the list
 */
export let toggleSelectAll = function () {
    _appCtxSvc.registerCtx('pendingOwnershipTransferListSelectAll', undefined);
    eventBus.publish('pendingOwnershipTransfer.toggleListSelectAll');
};

/**
 * Method to update the selection in the Mark OT List with the objects that are selected in the ctx.
 */
export let updateListSelectionWithCtx = function (data, ctx) {

    //Collect all the UID's of items.
    //If the selection is an item we use it's UID, if not we look for the items_tag property.
    var uidsToSelect = [];

    ctx.mselected.forEach(vmo => {
        if (vmo.modelType.typeHierarchyArray.indexOf('Awb0Element') > -1) {
            var underlyingObjectUid = vmo.props.awb0UnderlyingObject.dbValues[0];
            let underlyingObject = _cdmSvc.getObject(underlyingObjectUid);

            if (underlyingObject.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
                uidsToSelect.push(underlyingObject.props.items_tag.dbValues[0]);
            }
        }
        else if (vmo.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
            uidsToSelect.push(vmo.props.items_tag.dbValues[0]);
        }
        else {
            uidsToSelect.push(vmo.uid);
        }
    });

    //After we collect the UID's we cycle through the loaded objects and attempt to change the selected property.
    var vmoObjectsToSelect = [];
    var providerCollection = data.dataProviders.listDataProvider.viewModelCollection.getLoadedViewModelObjects();
    for (var ind = providerCollection.length - 1; ind >= 0; ind--) {
        if (uidsToSelect.includes(providerCollection[ind].uid)) {
            providerCollection[ind].selected = true;
            vmoObjectsToSelect.push(providerCollection[ind]);

            //We remove the selected items so it can be placed at the top of the list.
            providerCollection.splice(ind, 1);
        }
    }

    //Placing the found selected objects at the top of the list.
    for (var n = 0; n < vmoObjectsToSelect.length; n++) {
        providerCollection.unshift(vmoObjectsToSelect[n]);
    }

    //Update the loaded objects with our newly compiled list and set the selection the in selection model.
    data.dataProviders.listDataProvider.getViewModelCollection().loadedVMObjects = providerCollection;
    data.dataProviders.listDataProvider.selectionModel.setSelection(vmoObjectsToSelect);
};

/**
 * Method to register context of this panel while it is open.
 */
export let registerPendingOwnershipTransferPanelContext = function (data) {
    _appCtxSvc.registerCtx('pendingOwnershipTransferPanelData', data);
};

/**
 * Method to handle toggle select all command in the list
 */
export let toggleListSelectAll = function (listDataProvider) {

    if (listDataProvider) {
        var areAllResultsSelected = listDataProvider.getSelectedObjects().length === listDataProvider.viewModelCollection.totalObjectsLoaded;
        areAllResultsSelected ? listDataProvider.selectNone() : listDataProvider.selectAll();

        _appCtxSvc.registerCtx('pendingOwnershipTransferListSelectAll', !areAllResultsSelected);
    }
};

/**
 * Method to clean up panel data
 */
export let panelCleanup = function () {
    _appCtxSvc.unRegisterCtx('pendingOwnershipTransferListSelectAll');
    _appCtxSvc.unRegisterCtx('pendingOwnershipTransferPanelData');
};

/**
 * Method to handle toggle selection mode command  in the list
 */
export let toggleListMultipleSelectionMode = function (listDataProvider) {

    if (listDataProvider) {
        if (listDataProvider.selectionModel.multiSelectEnabled) {
            listDataProvider.disableMultiSelect();
        }
        else {
            listDataProvider.enableMultiSelect();
        }
    }
};

/**
 * Method to get the selected objects in the list for cancel transfer ownership
 */
export let getCancelTransferOwnershipObjectList = function (listDataProvider) {

    var selectedObjects = [];
    if (listDataProvider) {
        var selections = listDataProvider.selectedObjects;

        _.forEach(selections, function (oneSelection) {

            selectedObjects.push(oneSelection.uid);
        });
    }

    return selectedObjects;
};

/**
 * Handles error from SOA
 *
 */
export let processCancelTransferOwnershipPartialErrors = function (serviceData, data) {
    if (serviceData.ServiceData.partialErrors) {
        var selections = data.dataProviders.listDataProvider.selectedObjects;
        var messages = '';
        var numOfErrors = selections.length - serviceData.ServiceData.partialErrors.length;
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (selections.length > 1) {
            errMessage = localTextBundle.cancelOwnershipTransferFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', selections.length);
        }
        else {
            var objectString = selections[0].props.object_string.uiValues[0];
            errMessage = localTextBundle.cancelOwnershipTransferFailureSingle.replace('{0}', objectString);
        }

        // cancelOwnershipTransferFailureMultiple
        for (var index in serviceData.ServiceData.partialErrors) {
            var partialError = serviceData.ServiceData.partialErrors[index];

            for (var count in partialError.errorValues) {
                var errorValue = partialError.errorValues[count];
                if (errorValue.message.length > 0) {
                    messages += '<br>' + errorValue.message;
                }
            }
        }

        var message = null;
        errMessage += messages;

        msgSvc.showError(errMessage);
    }
    else if (serviceData.failureInfo.length > 0) {

        var messages = [];
        var selections = data.dataProviders.listDataProvider.selectedObjects;
        _.forEach(selections, function (oneSelection) {
            var objectString = oneSelection.props.object_string.uiValues[0];

            for (var index in serviceData.failureInfo) {
                var objectUid = serviceData.failureInfo[index].objectUID;
                if (objectUid === oneSelection.uid) {
                    var errorInfo = serviceData.failureInfo[index].errorInfo;
                    for (var err in errorInfo) {
                        var errValue = errorInfo[err].elementValue;
                        if (!isNaN(errValue)) {
                            continue;
                        }

                        if (selections.length > 1) {
                            messages.push('\"' + objectString + '\": ' + errValue);
                        }
                        else {
                            messages.push(errValue);
                        }
                    }
                }
            }
        });
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (selections.length > 1) {

            var numOfErrors = selections.length - messages.length;
            errMessage = localTextBundle.cancelOwnershipTransferFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', selections.length);

            for (var i in messages) {
                {
                    errMessage += '<br>' + messages[i];
                }
            }
        }
        else {
            var objectString = selections[0].props.object_string.uiValues[0];
            errMessage = localTextBundle.cancelOwnershipTransferFailureSingle.replace('{0}', objectString);
            if (messages.length > 0) {
                errMessage = errMessage.replace('{1}', messages[0]);
            }
        }

        msgSvc.showError(errMessage);
    }
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function () {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        isManaged: false,
        children: {},
        sel: false
    };
};

/*
 * @memberof NgServices
 * @member briefcaseMarkOT
 */
app.factory('briefcaseMarkOT', //
    ['$q',
        'iconService',
        'soa_kernel_soaService',
        'soa_dataManagementService',
        'soa_kernel_clientDataModel', //
        function ($q, iconSvc, soaSvc, dataManagementSvc, cdm) {
            _$q = $q;
            _iconSvc = iconSvc;
            _soaSvc = soaSvc;
            _dataManagementSvc = dataManagementSvc;
            _cdmSvc = cdm;

            return exports;
        }
    ]);

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which
 * service should be injected to provide the API for this module.
 */
export let moduleServiceNameToInject = 'briefcaseMarkOT';
export default exports = {
    moduleServiceNameToInject,
    getMarkOTSelectedObjects,
    getSiteForMarkOwnershipTransfer,
    processMarkOwnershipTransferPartialErrors,
    getTargetSitesWithMarkOT,
    loadListData,
    toggleSelectAll,
    toggleListSelectAll,
    toggleListMultipleSelectionMode,
    getCancelTransferOwnershipObjectList,
    processCancelTransferOwnershipPartialErrors,
    registerPendingOwnershipTransferPanelContext,
    updateListSelectionWithCtx,
    panelCleanup
};
