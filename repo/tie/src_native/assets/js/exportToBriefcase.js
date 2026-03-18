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
 * @module js/exportToBriefcase
 */
import app from 'app';
import _ from 'lodash';
import 'js/uwPropertyService';
import 'js/awColumnService';
import 'soa/kernel/soaService';
import 'js/awTableStateService';
import 'js/awTableService';
import 'js/iconService';
import 'soa/dataManagementService';
import 'js/modelPropertyService';
import 'soa/kernel/clientDataModel';
import _cdmSvc from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import _dataManagementSvc from 'soa/dataManagementService';
import _appCtxSvc from 'js/appCtxService';

import eventBus from 'js/eventBus';

'use strict';

var _$q = null;
var _uwPropertySvc = null;
var _awColumnSvc = null;
var _awTableSvc = null;
var _iconSvc = null;
var _soaSvc = null;

var _modelPropertySvc = null;

var _hasContOnError = false;
var exports = {};

export let removeAllOverrideContext = function () {
    _appCtxSvc.registerCtx('overrideOptions', undefined);
    eventBus.publish('transferOptionSet.ReloadProvider');
};

export let remoteOverrideOptionFromList = function (opt_id) {
    var overrideList = _appCtxSvc.getCtx('overrideOptions');

    for (var x = overrideList.length - 1; x >= 0; x--) {
        if (overrideList[x].option_realname === opt_id) {
            overrideList.splice(x, 1);
        }
    }

    if (overrideList.length === 0) {
        _appCtxSvc.registerCtx('overrideOptions', undefined);
    } else {
        _appCtxSvc.registerCtx('overrideOptions', overrideList);
    }

    eventBus.publish('transferOptionSet.ReloadProvider');
};

export let loadTransferOptionOverridePanel = function (data) {
    //Not Needed, Context is loaded from the change transferoptpanel
    var overrideList = _appCtxSvc.getCtx('overrideOptions');
    if (overrideList === null) {
        overrideList = [];
    }

    var overrideListNames = [];

    if (overrideList !== undefined) {
        for (var y = 0; y < overrideList.length; y++) {
            overrideListNames.push(overrideList[y].option_realname);
        }
    }

    var groups = _appCtxSvc.getCtx('tosGroups', groups);
    for (var n = 0; n < groups.length; n++) {
        for (var m = 0; m < groups[n].options.length; m++) {
            //Only Reset editable properties
            if (groups[n].options[m].checkboxprops.isEditable !== false) {
                //Only Reset if it is not in the list of overridden options.
                if (!overrideListNames.includes(groups[n].options[m].option_realname)) {
                    groups[n].options[m].checkboxprops.dbValue = groups[n].options[m].option_initialvalue.toString().toLowerCase() === 'true';
                }
            }
            if (groups[n].options[m].option_realname === 'validateXMLBeforeXslt') {
                if (data.isLowLevel && data.validateRadio.dbValue) {
                    groups[n].options[m].checkboxprops.isDisplayable = true;
                } else {
                    groups[n].options[m].checkboxprops.isDisplayable = false;
                }
            }
        }
    }
};

export let loadOverrideDataProvider = function () {
    var deferred = AwPromiseService.instance.defer();
    var overrideList = _appCtxSvc.getCtx('overrideOptions');
    if (overrideList) {
        deferred.resolve(overrideList);
        return deferred.promise;
    }
    else {
        deferred.resolve([]);
        return deferred.promise;
    }
};

export let updateTransferOptionSetOverrides = function (data) {
    var groups = _appCtxSvc.getCtx('tosGroups', groups);

    var overrideList = [];

    for (var x = 0; x < groups.length; x++) {
        for (var y = 0; y < groups[x].options.length; y++) {
            if (groups[x].options[y].checkboxprops.dbValue.toString().toLowerCase() !== groups[x].options[y].option_initialvalue.toString().toLowerCase()) {
                overrideList.push(groups[x].options[y]);
            }
        }
    }

    _appCtxSvc.registerCtx('overrideOptions', overrideList);
    eventBus.publish('transferOptionSet.ReloadProvider');
};

export let getPreferenceContinueOnError = function (pref) {

    var getContErrorPref = {
        preferenceNames: ['GMS_ALLOW_CONTINUE_ON_ERROR'],
        includePreferenceDescriptions: false
    };

    var soaCall = soaSvc.postUnchecked('Administration-2012-09-PreferenceManagement', 'getPreferences', getContErrorPref).then(function (response) {
        //Error Handling
        var err;
        if (response && response.ServiceData && response.ServiceData.partialErrors) {
            err = soaSvc.createError(response.ServiceData.partialErrors);
            err.message = '';
            _.forEach(response.ServiceData.partialErrors, function (partialError) {
                _.forEach(partialError.errorValues, function (object) {
                    //1700 Represents an error code for the preference not being found. we can ignore this message.
                    if (object.code === 1700) {
                        err.ignoreErrorCode = true;
                    }
                    err.message += '<BR/>';
                    err.message += object.message;
                });
            });
        }

        if (_.isUndefined(err)) {
            _hasContOnError = response.response[0].values.values[0].toLowerCase() === 'true';
        }
        //-------------------------------------------------------------------------------------
    });
};

export let updateOverrideContext = function (data) {
    var overrideList = _appCtxSvc.getCtx('overrideOptions');

    //If the validate checkbox changes then we remove the before mapping option
    //if the validate button is not checked
    if (overrideList) {
        if (!data.validateRadio.dbValue) {
            for (var x = overrideList.length - 1; x >= 0; x--) {
                if (overrideList[x].option_realname === 'validateXMLBeforeXslt') {
                    overrideList.splice(x, 1);
                }
            }
        }
    }
};

export let saveTransferOptionSetContext = function (data, isCalledFromExport) {
    //Stores all the groups and option data in an array for iterating through
    var groups = [];

    //Stores the group names so we can tell whether or not we need to create a new section
    var groupList = [];

    //Variables for storing relevant options
    var isLowLevel = false;
    var isConfigured = false;

    if (data.transferOptionSetListBox.dbValue === '') {
        return;
    }
    for (var x = 0; x < data.transferOptionSetListBox.dbValue.props.option_groupnames.dbValues.length; x++) {
        var groupname = data.transferOptionSetListBox.dbValue.props.option_groupnames.dbValues[x];
        var canEdit = data.transferOptionSetListBox.dbValue.props.option_readonlyflags.dbValues[x] === '0' ? 'true' : 'false';

        //Checking to see if this is the low level option and if the value is true to say the transfer option set is low level
        if (data.transferOptionSetListBox.dbValue.props.option_realnames.dbValues[x].toLowerCase() === 'opt_ll_bcz') {
            if (data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x].toLowerCase() === 'true') {
                isLowLevel = true;
            }
        }

        //Checking to see if this is the configured option and if the value is true to say the transfer option set is configured.1
        if (isCalledFromExport && data.transferOptionSetListBox.dbValue.props.option_realnames.dbValues[x].toLowerCase() === 'opt_exp_cfgbom') {
            if (data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x].toLowerCase() === 'true') {
                isConfigured = true;
            }
        }

        var isBoolOpt = false;
        if (data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x].toLowerCase() === 'true' ||
            data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x].toLowerCase() === 'false') {
            isBoolOpt = true;
        }

        //Localized values for item revision selector
        //If we need to switch this to just english we can hardcode a string.
        if (isCalledFromExport) {
            var nonBoolOptVal = data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x];
            if (nonBoolOptVal.toString().toLowerCase() === 'allitemrevisions') {
                nonBoolOptVal = data.i18n.allitemrevisions;
            }
            if (nonBoolOptVal.toString().toLowerCase() === 'selectedrevisionsonly') {
                nonBoolOptVal = data.i18n.selectedrevisionsonly;
            }
            if (nonBoolOptVal.toString().toLowerCase() === 'latestrevisiononly') {
                nonBoolOptVal = data.i18n.latestrevisiononly;
            }
            if (nonBoolOptVal.toString().toLowerCase() === 'latestworkingrevisiononly') {
                nonBoolOptVal = data.i18n.latestworkingrevisiononly;
            }
            if (nonBoolOptVal.toString().toLowerCase() === 'latestworkinganyonly') {
                nonBoolOptVal = data.i18n.latestworkinganyonly;
            }
            if (nonBoolOptVal.toString().toLowerCase() === 'latestreleaserevisiononly') {
                nonBoolOptVal = data.i18n.latestreleaserevisiononly;
            }
        }
        var cbInfo = {
            displayName: isBoolOpt ? data.transferOptionSetListBox.dbValue.props.option_displaynames.dbValues[x] :
                data.transferOptionSetListBox.dbValue.props.option_displaynames.dbValues[x] + ' ( ' + nonBoolOptVal + ' ) ',
            type: 'BOOLEAN',
            isRequired: 'false',
            isEditable: isBoolOpt ? canEdit : false,
            dbValue: isBoolOpt ? data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x] : true,
            dispValue: '',
            labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
        };
        //In order to dynamically create check boxes we need all the relevant view model properties from createViewModelProperty
        var checkboxprops = _modelPropertySvc.createViewModelProperty(cbInfo);

        var option = {
            option_groupname: data.transferOptionSetListBox.dbValue.props.option_groupnames.dbValues[x],
            option_readonlyflag: data.transferOptionSetListBox.dbValue.props.option_readonlyflags.dbValues[x],
            option_realname: data.transferOptionSetListBox.dbValue.props.option_realnames.dbValues[x],
            option_displayname: data.transferOptionSetListBox.dbValue.props.option_displaynames.dbValues[x],
            option_initialvalue: isBoolOpt ? data.transferOptionSetListBox.dbValue.props.option_initialvalues.dbValues[x] : true,
            checkboxprops: checkboxprops
        };

        //Our group doesn't exist in the array so we create the relevant group and add this option to it.
        if (!groupList.includes(groupname)) {
            groupList.push(groupname);
            var grouparray = { groupname: groupname, options: [] };

            grouparray.options.push(option);
            groups.push(grouparray);
        }
        //The group does exist, so we iterate through the array to find the relevant group and add the option to the options list.
        else {
            _.forEach(groups, function (array_group) {
                if (array_group.groupname === groupname) {
                    array_group.options.push(option);
                }
            });
        }
    }

    groupList.push('Session Options');
    var grouparray = { groupname: 'Session Options', options: [] };

    groups.push(grouparray);
    var hardCodedSessions = [];

    //Check pref for continue on error
    if (_hasContOnError) {
        var contErrorOpt = { optName: 'Continue on error', optVal: 'ContinueOnError' };
        hardCodedSessions.push(contErrorOpt);
    }

    //Always add this session option, we'll control when to show it in the loading of the panel
    var unconfVarientOpt = { optName: 'Validate before mapping', optVal: 'validateXMLBeforeXslt' };
    hardCodedSessions.push(unconfVarientOpt);

    //Including session options for configured structures.
    if (isConfigured) {
        //Configured Options
        var unconfVarientOpt = { optName: 'Export Unconfigured Variants', optVal: 'processUnconfiguredVariants' };
        hardCodedSessions.push(unconfVarientOpt);

        var occEffOpt = { optName: 'Export Unconfigured By Occurrence Effectivity', optVal: 'processUnconfiguredByOccEff' };
        hardCodedSessions.push(occEffOpt);

        var suppOccOpt = { optName: 'Export Suppressed Occurrences', optVal: 'processSuppressedOcc' };
        hardCodedSessions.push(suppOccOpt);

        var procUnconOpt = { optName: 'Export Unconfigured Changes', optVal: 'processUnconfiguredChanges' };
        hardCodedSessions.push(procUnconOpt);
    }

    for (var x = 0; x < hardCodedSessions.length; x++) {
        var cbInfo = {
            displayName: hardCodedSessions[x].optName,
            type: 'BOOLEAN',
            isRequired: 'false',
            isEditable: true,
            dbValue: false,
            dispValue: '',
            labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
        };
        //In order to dynamically create check boxes we need all the relevant view model properties from createViewModelProperty
        var checkboxprops = _modelPropertySvc.createViewModelProperty(cbInfo);

        var option = {
            option_groupname: 'Session Options',
            option_readonlyflag: false,
            option_realname: hardCodedSessions[x].optVal,
            option_displayname: hardCodedSessions[x].optName,
            option_initialvalue: false,
            checkboxprops: checkboxprops
        };

        _.forEach(groups, function (array_group) {
            if (array_group.groupname === 'Session Options') {
                array_group.options.push(option);
            }
        });
    }

    //After the transfer option set is loaded we give this command so we can know whether or not we can display the override button
    var transferOptLoaded = _appCtxSvc.getCtx('transferOptLoaded');
    if (!transferOptLoaded) {
        _appCtxSvc.registerCtx('transferOptLoaded', 'true');
    }

    //Resetting the override list on selection change.
    var overrideList = null;
    _appCtxSvc.registerCtx('overrideOptions', overrideList);
    eventBus.publish('transferOptionSet.ReloadProvider');

    //Flags used for turning on and off certain UI elements.
    data.isLowLevel = isLowLevel;
    data.isConfigured = isConfigured;

    //Context used for the sub panel.
    _appCtxSvc.registerCtx('tosGroups', groups);

    //Need to reset the values for the other components depend on the TOS selection
    // 'Delta Export', 'Force Re-Export', 'Validate', 'Revision Rule', 'Variant Rule'

    if (isCalledFromExport) {
        data.deltaExportRadio.dbValue = false;
        data.forceReExportRadio.dbValue = false;
        data.partialExportLabel.dbValue = false;
        data.partialExportLabel.uiValue = data.i18n.No;
        data.revisionRuleListBox.uiValue = '';
        data.variantRuleListBox.uiValue = '';
    }

    data.validateRadio.dbValue = false;

    //Load the revision rules for configured export TransferOptionSet
    if (isConfigured && data.revisionRuleListBoxValues.length === 0) {
        getRevisionRuleList(data);
    }

    //Load the variant rules for configured export TransferOptionSet
    if (isConfigured && !data.variantRuleListLoaded) {
        if (_appCtxSvc.ctx.selected.modelType.typeHierarchyArray
            .indexOf('ItemRevision') > -1) {
            getVariantRuleList(_appCtxSvc.ctx.selected.uid, data);
            data.variantRuleListLoaded = true;
        } else if (_appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf('Awb0Element') > -1) {
            getVariantRuleList(_appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0], data);
            data.variantRuleListLoaded = true;
        }
    }

    if (isCalledFromExport) {
        //Set the 'partial export' flag
        if (isPartialExport(data, _appCtxSvc.ctx)) {
            data.partialExportLabel.dbValue = true;
            data.partialExportLabel.uiValue = data.i18n.Yes;
        }
    }
};


/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var isPartialExport = function (data, ctx) {
    var isConfigured = data.isConfigured;
    var partialExport = false;

    if (isConfigured && ctx.aceActiveContext) {
        var occmgmtContext = ctx.aceActiveContext.context;
        if (occmgmtContext) {
            var topElement = occmgmtContext.topElement;

            //Partial export is supported only for BOM structure
            var underlineObjProp = topElement.props.awb0UnderlyingObject;
            if (!_.isUndefined(underlineObjProp)) {
                var underlyingObj = _cdmSvc.getObject(underlineObjProp.dbValues[0]);
                if (underlyingObj.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
                    var topElementFound = false;
                    var i;
                    for (i = 0; i < ctx.mselected.length; i++) {
                        var oneSelected = ctx.mselected[i];

                        if (oneSelected === topElement) {
                            topElementFound = true;
                            break;
                        }
                    }

                    if (!topElementFound) {
                        partialExport = true;
                    }
                }
            }
        }
    }
    return partialExport;
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

export let changeSiteTypeSelection = function (data, isExportPanel) {

    var sel = data.siteTypeRadioButton.dbValue;
    
    var listModels = [];
    var listModelsAct = [];

    if (sel === false) {
        if (_appCtxSvc !== null) {
            listModels = _appCtxSvc.getCtx('unManagedSites');
        }
    } else {
        if (_appCtxSvc !== null) {
            listModels = _appCtxSvc.getCtx('managedSites');
        }
    }
    _.forEach(listModels, function (modelObj) {
        listModelsAct.push(modelObj);
    });

    data.targetSitesListBoxValues = listModelsAct;

    if (isExportPanel) {
        var xferOptList = [];

        //Clear transfer option list when switching from managed to unmanaged site
        data.transferOptionSetListBoxValues = xferOptList;
        data.transferOptionSetListBox.dbValue = '';
        data.transferOptionSetListBox.uiValue = '';
        data.transferOptionSetListBox.value = '';
        data.briefcaseName.dbValue = '';
        data.briefcaseName.uiValue = '';
    }
};

export let getTargetSitesForExport = function (response, data) {
    var managedSiteModels = [];
    var UnmangedSitesListModels = [];
    var emptyListModel = _getEmptyListModel();
    managedSiteModels.push(emptyListModel);
    UnmangedSitesListModels.push(emptyListModel);

    var managedSite = data.siteTypeRadioButton.dbValue;

    var listModel = null;
    if (!_.isUndefined(response.modelObjects)) {
        var modelObjects = response.modelObjects;

        var uidsToLoadFrom = [];
        _.forEach(modelObjects, function (modelObj) {
            uidsToLoadFrom.push(modelObj.uid);
        });

        var offline = 1 << 5;
        var unman = 1 << 7;

        return _dataManagementSvc.loadObjects(uidsToLoadFrom).then(function () {
            return _dataManagementSvc.getProperties(uidsToLoadFrom, ['dbms', 'name', 'site_id']).then(function () {
                for (var indx = 0; indx < uidsToLoadFrom.length; indx++) {
                    var oUidObject = _cdmSvc.getObject(uidsToLoadFrom[indx]);
                    var dbms = oUidObject.props.dbms.dbValues[0];

                    var isUnmaned = dbms & unman;
                    var isOffline = dbms & offline;

                    var prop2DispName = oUidObject.props.name.dbValues[0];
                    listModel = _getEmptyListModel();
                    listModel.propDisplayValue = prop2DispName;
                    listModel.propInternalValue = oUidObject;

                    if (isUnmaned) {
                        UnmangedSitesListModels.push(listModel);
                    } else if (isOffline) {
                        managedSiteModels.push(listModel);
                    }
                }

                //Do not load ocntents of sites again once it is loaded.
                //Earlier whenever back or Override button was pressed on override panel, getRemoreSites SOA was getting called.

                data.isContentLoaded.dbValue = true;

                _appCtxSvc.registerCtx('managedSites', managedSiteModels);
                _appCtxSvc.registerCtx('unManagedSites', UnmangedSitesListModels);

                if (managedSite) {
                    data.targetSitesListBoxValues = managedSiteModels;
                }
                else {
                    data.targetSitesListBoxValues = UnmangedSitesListModels;
                }

                return managedSiteModels;

            });
        });

    }
};

/**
 * The input that is requires for the Transfer Option Set Panel
 *
 * @return {*} - JSON information containing inputs for getAvailableTransferOptionSets
 **/
function getTOSPanelInput(selectedsite, ctx, isExport) {
    var role_uid = ctx.userSession.props.role.dbValue;
    var user_uid = ctx.userSession.props.user.dbValue;
    var group_uid = ctx.userSession.props.group.dbValue;

    if (isExport) {
        return {
            inputs: {
                isPush: true,
                isExport: true,
                user: { uid: user_uid, type: 'unknownType' },
                group: { uid: group_uid, type: 'unknownType' },
                role: { uid: role_uid, type: 'unknownType' },
                site: [{ uid: selectedsite, type: 'unknownType' }]
            }
        };
    }
    return {
        inputs: {
            isPush: false,
            isExport: false,
            user: { uid: user_uid, type: 'unknownType' },
            group: { uid: group_uid, type: 'unknownType' },
            role: { uid: role_uid, type: 'unknownType' },
            site: []
        }
    };
}

/**
 * Formats briefcase name according to format specified in input parameter
 *
 * @return {*} - briefcase name
 **/
function formBriefcaseName(formatOfName, ctx, targetSiteName) {
    if (targetSiteName.length === 0) {
        return '';
    }
    var UNDER_SCORE_SEPARATOR = '_';
    var revisionId;
    var itemId;
    var itemName;

    if (ctx.aceActiveContext) {
        var occmgmtContext = ctx.aceActiveContext.context;
        if (occmgmtContext) {
            var topElement = occmgmtContext.topElement;
            var underlineObjProp = topElement.props.awb0UnderlyingObject;
            if (!_.isUndefined(underlineObjProp)) {
                var underlyingObj = _cdmSvc.getObject(underlineObjProp.dbValues[0]);
                if (underlyingObj.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
                    itemId = underlyingObj.props.item_id.dbValues[0];
                    revisionId = underlyingObj.props.item_revision_id.dbValues[0];
                    itemName = underlyingObj.props.object_name.dbValues[0];
                }
                else {
                    itemId = underlyingObj.props.object_string.dbValues[0];
                    itemName = underlyingObj.props.object_string.dbValues[0];
                }
            }
        }
    } else if (ctx.selected.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1) {
        itemId = ctx.selected.props.item_id.dbValue;
        revisionId = ctx.selected.props.item_revision_id.dbValue;
        itemName = ctx.selected.props.object_name.dbValue;
    } else if (ctx.selected.modelType.typeHierarchyArray.indexOf('Item') > -1) {
        itemId = ctx.selected.props.item_id.dbValue;
        itemName = ctx.selected.props.object_name.dbValue;
    } else {
        itemId = ctx.selected.props.object_string.dbValue;
    }

    var briefcaseName = '';
    if (formatOfName.length > 0) {
        var prefValues = [];
        prefValues = formatOfName.split(':');
        for (var i = 0; i < prefValues.length; i++) {
            var result = prefValues[i] !== null ? prefValues[i] : '';
            if (result === 'ItemId') {
                if (itemId !== undefined) {
                    briefcaseName += itemId;
                }
            } else if (result === 'ItemName') {
                if (itemName !== undefined) {
                    briefcaseName += itemName;
                }
            } else if (result === 'RevId') {
                if (revisionId !== undefined) {
                    briefcaseName += revisionId;
                }
            } else if (result === 'TimeStamp') {
                briefcaseName += getCurrentTime();
            } else if (result === 'TargetSite') {
                if (targetSiteName !== undefined) {
                    briefcaseName += targetSiteName;
                }
            } else if (result === 'BCZ') {
                briefcaseName += 'BCZ';
            } else {
                briefcaseName += result;
            }

            if (result.trim().length > 0 && i < prefValues.length - 1) {
                briefcaseName += UNDER_SCORE_SEPARATOR;
            }
        }
    } else {
        if (revisionId !== undefined) {
            briefcaseName = itemId;
            briefcaseName += UNDER_SCORE_SEPARATOR;
            briefcaseName += revisionId;
            briefcaseName += UNDER_SCORE_SEPARATOR;
            briefcaseName += getCurrentTime();
        } else if (itemId !== undefined) {
            briefcaseName = itemId;
            briefcaseName += UNDER_SCORE_SEPARATOR;
            briefcaseName += getCurrentTime();
        } else {
            briefcaseName = itemName;
            briefcaseName += UNDER_SCORE_SEPARATOR;
            briefcaseName += getCurrentTime();
        }
    }

    var bfName = briefcaseName.replace(/[# /:*?"/\\<>|;&\s]/g, '_');
    //The max. length is 124 ( 128 - length(.bcz))
    bfName = bfName.substring(0, 124);

    bfName += '.bcz';

    return bfName;
}
/**
 * The input that is requires for the Transfer Option Set Panel
 *
 * @return {*} - JSON information containing inputs for getAvailableTransferOptionSets
 **/
function populateBriefcaseName(data, ctx) {
    var targetSiteName = data.targetSitesListBox.uiValue;
    if (targetSiteName.length === 0) {
        data.briefcaseName.dbValue = '';
        return;
    }
    soaSvc.postUnchecked('Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: ['Briefcase_pkg_file_name'],
        includePreferenceDescriptions: false
    }, {}).then(
        function (result) {
            if (result !== null && result.response !== null) {
                var prefValue = '';
                if (result.response.length > 0) {
                    prefValue = result.response[0].values.values[0];
                }
                data.briefcaseName.dbValue = formBriefcaseName(prefValue, ctx, targetSiteName);
            }
        });
}

/**
 * Returns current date and time
 *
 * @return {*} - current date time
 **/
function getCurrentTime() {
    var currentdate = new Date();

    var month = currentdate.toLocaleString('en-us', { month: 'short' });

    return currentdate.getDate() + '-' +
        month + '-' +
        currentdate.getFullYear() + '-' +
        currentdate.getHours() + '-' +
        currentdate.getMinutes() + '-' +
        currentdate.getSeconds();
}

/**
 * List of model objects for displaying the Multi-Site application specific TransferOptionSets in the list box.
 *
 * @param {Object} response - Response from the SOA getAllTransferOptionSets
 *
 * @return {Object} - List of model objects for displaying the TransferOptionSets in the list box.
 *
 */

export let getTransferOptionSets = function (data, ctx, isExport) {
    if (isExport) {
        populateBriefcaseName(data, ctx);
        _appCtxSvc.registerCtx('navigateToPanel', 'cmdExportToBriefcaseSubPanel');
    } else {
        _appCtxSvc.registerCtx('navigateToPanel', 'cmdImportFromBriefcaseSubPanel');
    }
    var deferred = AwPromiseService.instance.defer();
    var selectedsite = '';
    if (isExport) {
        var selecteExportdsite = data.targetSitesListBox.dbValue.uid;
        if (selecteExportdsite === undefined) {
            return;
        }
        selectedsite = selecteExportdsite;
    }
    var soaInput = getTOSPanelInput(selectedsite, ctx, isExport);

    soaSvc.postUnchecked('GlobalMultiSite-2007-06-ImportExport', 'getAvailableTransferOptionSets', soaInput).then(
        function (response) {
            if (isExport) {
                handleGetTransferOptionSetsResponse(response, data, ctx);
            } else {
                handleTransferOptionSetsForImport(response, data);
            }
        },
        function (error) {
            deferred.reject(error);
        });
};

/**
 * collectSessionOption
 */
function collectSessionOption(data, ctx, validateOnly) {
    var sessionOptionNamesValues = [];

    var TRUE_VALUE = 'True';
    var FALSE_VALUE = 'False';

    //The dry_run option
    if (data.isLowLevel) {
        var validateValue = data.validateRadio.dbValue;
        if (validateValue && validateOnly.toLowerCase() === 'true') {
            var dryRun = { optionName: 'dry_run', optionValue: TRUE_VALUE };
            sessionOptionNamesValues.push(dryRun);
        }

        var validate = { optionName: 'validateXML', optionValue: data.validateRadio.dbValue ? TRUE_VALUE : FALSE_VALUE };
        sessionOptionNamesValues.push(validate);

        if (data.isConfigured) {
            var forceReExport = { optionName: 'opt_sync_previous_delta', optionValue: data.forceReExportRadio.dbValue ? TRUE_VALUE : FALSE_VALUE };
            sessionOptionNamesValues.push(forceReExport);
        }
    }

    //Need to trim the .bcz extension
    var briefcaseNameUi = data.briefcaseName.dbValue;
    briefcaseNameUi = briefcaseNameUi.substr(0, briefcaseNameUi.lastIndexOf('.'));
    var briefcaseName = { optionName: 'pkgDatasetName', optionValue: briefcaseNameUi };

    if (data.revisionRuleListBox.uiValue.length > 0) {
        var revisionRule = { optionName: 'revRule', optionValue: data.revisionRuleListBox.uiValue };
        sessionOptionNamesValues.push(revisionRule);
    }
    if (data.variantRuleListBox.uiValue.length > 0) {
        var varRule = { optionName: 'varRule', optionValue: data.variantRuleListBox.uiValue };
        sessionOptionNamesValues.push(varRule);
    }

    if (data.isConfigured) {
        var syncRefPointValue = 'BRIEFCASE_EXP:' + data.targetSitesListBox.dbValue.props.site_id.dbValues[0].toString();
        var syncRefPoint = { optionName: 'opt_sync_reference_point', optionValue: syncRefPointValue };
        sessionOptionNamesValues.push(syncRefPoint);
    }

    var delta = { optionName: 'modified_objects_only', optionValue: data.deltaExportRadio.dbValue ? TRUE_VALUE : FALSE_VALUE };
    var unmanaged = { optionName: 'unmanaged', optionValue: data.siteTypeRadioButton.dbValue ? FALSE_VALUE : TRUE_VALUE };
    var offline = { optionName: 'offline', optionValue: TRUE_VALUE };

    if (data.partialExportLabel.dbValue) {
        var threadChain = getOccurenceThreadChain(ctx);
        if (threadChain.length) {
            var occThreadChain = { optionName: 'opt_exp_partial_bom_input', optionValue: threadChain };
            sessionOptionNamesValues.push(occThreadChain);
        }
    }

    sessionOptionNamesValues.push(briefcaseName);
    sessionOptionNamesValues.push(delta);
    sessionOptionNamesValues.push(unmanaged);
    sessionOptionNamesValues.push(offline);

    var overRiddenoptionNamesValues = _appCtxSvc.getCtx('overrideOptions');

    if (!_.isUndefined(overRiddenoptionNamesValues)) {

        _.forEach(overRiddenoptionNamesValues, function (SessionOptions) {
            if (SessionOptions.option_groupname === 'Session Options') {
                var item = {
                    optionName: SessionOptions.option_realname,
                    optionValue: SessionOptions.checkboxprops.dbValue.toString()
                };
                sessionOptionNamesValues.push(item);
            }
        });
    }

    if (data.markedObjectsForOTMap) {
        var targetSiteID = parseInt(data.targetSitesListBox.dbValue.props.site_id.dbValues[0]);

        var markedObjectsiteObj = data.markedObjectsForOTMap.get(targetSiteID);
        if ( markedObjectsiteObj ) {
            var objOwnerTraferoption = { optionName: 'objsForOwnXfer', optionValue: markedObjectsiteObj };
            sessionOptionNamesValues.push(objOwnerTraferoption);
        }
    }

    return sessionOptionNamesValues;
}
/**
 * collect overriden transfer options

 */
export let collectOverrideOptions = function () {
    var overRiddenoptionNamesValues = _appCtxSvc.getCtx('overrideOptions');

    var overrideOptions = [];
    if (!_.isUndefined(overRiddenoptionNamesValues)) {
        _.forEach(overRiddenoptionNamesValues, function (options) {
            if (options.option_groupname !== 'Session Options') {
                var item = {
                    optionName: options.option_realname,
                    optionValue: options.checkboxprops.dbValue.toString()
                };
                overrideOptions.push(item);
            }
        });
    }

    return overrideOptions;
};

function showConfiguredOptionSets(ctx) {

    var showConfiguredOpt = false;

    // if the preference not found use the predefined list    
    var configuredSupportedTypes = (ctx.preferences) ? ctx.preferences.Briefcase_configured_export_supported_types : undefined;
    if (_.isUndefined(configuredSupportedTypes) || configuredSupportedTypes.length === 0) {
        configuredSupportedTypes = ['Awb0Element', 'CCObject', 'Cpd0DesignElement', 'Cpd0WorksetRevision', 'Item', 'ItemRevision', 'Mdl0SubsetDefinition', 'Ptn0Partition'];
    }
    for (var i = 0; i < ctx.mselected.length; i++) {

        let oneSelected = ctx.mselected[i];
        // if any object type is in the support type list, show configured option sets        
        for (var t = 0; t < configuredSupportedTypes.length; t++) {
            if (oneSelected.modelType.typeHierarchyArray.includes(configuredSupportedTypes[t])) {
                showConfiguredOpt = true;
                break;
            }
        }
        if (showConfiguredOpt) {
            break;
        }
    }

    return showConfiguredOpt;
}
/**
 * Get root objects for export
 *
 */
export let getRootObjectsForExport = function (data, ctx) {
    var selectedInput = [];

    if (ctx.aceActiveContext) {
        var occmgmtContext = ctx.aceActiveContext.context;
        if (occmgmtContext) {
            var topElement = occmgmtContext.topElement;
            if (topElement) {
                var rootObj = {
                    uid: topElement.props.awb0UnderlyingObject.dbValues[0],
                    type: 'unknownType'
                };
            }

            selectedInput.push(rootObj);
        }
    } else {
        _.forEach(ctx.mselected, function (selectedItem) {
            var item = {
                uid: selectedItem.uid,
                type: selectedItem.type
            };
            selectedInput.push(item);
        });
    }

    return selectedInput;
};
/**
 * getSOAInputForExport
 */
export let getSOAInputForExport = function (data, ctx, validateOnly) {
    var rootObjectsInput = getRootObjectsForExport(data, ctx);

    var sessionOptionsInput = collectSessionOption(data, ctx, validateOnly);

    var overrideOptionsInput = collectOverrideOptions();

    return {
        rootObjects: rootObjectsInput,
        targetSite: { uid: data.targetSitesListBox.dbValue.uid, type: 'unknownType' },
        transferOptionSet: { uid: data.transferOptionSetListBox.dbValue.uid, type: 'unknownType' },
        overrideOptions: overrideOptionsInput,
        sessionOptions: sessionOptionsInput
    };
};

/**
* @param {*} ctx - Current  context
* @param {*} data - The data class that the panel uses, updating the list boxes with values
*
* @return {*} occurence thread chain in case of partial export
**/
export let getOccurenceThreadChain = function (ctx) {
    var occThreadChains = '';
    for (var j = 0; j < ctx.mselected.length; ++j) {
        var selectedLine = ctx.mselected[j];
        var occThreadChain = '';
        var parentObjectUid = selectedLine.props.awb0Parent.dbValues[0];
        var curObject = selectedLine;
        do {
            var occThreadUID = curObject.props.awb0CopyStableId.dbValues[0];
            if (occThreadChain.length > 0) {
                occThreadChain = ':' + occThreadChain;
            }
            occThreadChain = occThreadUID + occThreadChain;

            curObject = _cdmSvc.getObject(curObject.props.awb0Parent.dbValues[0]);

            parentObjectUid = curObject.props.awb0Parent.dbValues[0];
        } while (parentObjectUid !== null);

        var itemRev = curObject.props.awb0UnderlyingObject.dbValues[0];

        var itemRevObject = _cdmSvc.getObject(itemRev);
        var itemUID = itemRevObject.props.items_tag.dbValues[0];

        occThreadChain = itemUID + ':' + occThreadChain;
        if (occThreadChains === '') {
            occThreadChains = occThreadChain;
        } else {
            occThreadChains = occThreadChains + '|' + occThreadChain;
        }
    }

    return occThreadChains;
};
/**
* @param {*} response - The response that comes from the call to the getAvailableTransferOptionSets
* @param {*} data - The data class that the panel uses, updating the list boxes with values
*
* @return {*}
**/
export let handleGetTransferOptionSetsResponse = function (response, data, ctx) {
    var listModels = [];
    var listModel = null;

    var showConfiuredOptionSets = showConfiguredOptionSets(ctx);
    data.transferOptionSetListBoxValues = listModels;
    if (!_.isUndefined(response.ServiceData.modelObjects)) {
        var modelObjects = response.ServiceData.modelObjects;

        var uidsToLoadFrom = [];
        _.forEach(modelObjects, function (modelObj) {
            uidsToLoadFrom.push(modelObj.uid);
        });


        var dbms = data.targetSitesListBox.dbValue.props.dbms.dbValues[0];

        var unman = 1 << 7;
        var isUnmanaged = dbms & unman;
        var STR_TRUE = 'TRUE';

        _dataManagementSvc.loadObjects(uidsToLoadFrom).then(function () {
            _dataManagementSvc.getProperties(uidsToLoadFrom, ['option_groupnames', 'option_displaynames', 'option_realnames', 'option_initialvalues', 'option_descriptions', 'option_readonlyflags', 'object_desc']).then(function () {
                for (var indx = 0; indx < uidsToLoadFrom.length; indx++) {
                    var object = _cdmSvc.getObject(uidsToLoadFrom[indx]);
                    if (!_.isUndefined(object)) {

                        var configuredBOMIndex = object.props.option_realnames.dbValues.indexOf('opt_exp_cfgbom');
                        if (!showConfiuredOptionSets) {
                            if (configuredBOMIndex !== -1) {
                                var valueAtIndex = object.props.option_initialvalues.dbValues[configuredBOMIndex];
                                if (valueAtIndex.toUpperCase() === STR_TRUE.toUpperCase()) {
                                    continue;
                                }
                            }
                        }

                        if (isUnmanaged) {                    
                            var llBCZExpPos = object.props.option_realnames.dbValues.indexOf('opt_ll_bcz');
                            if (configuredBOMIndex !== -1 && llBCZExpPos === -1) {
                                var valueAtIndex = object.props.option_initialvalues.dbValues[configuredBOMIndex];
                                if (valueAtIndex.toUpperCase() === STR_TRUE.toUpperCase()) {

                                    listModel = _getEmptyListModel();
                                    listModel.propDisplayValue = object.props.object_name.dbValues[0];
                                    listModel.propInternalValue = object;
                                    listModel.propDisplayDescription = object.props.object_desc.dbValues[0];
                                    listModels.push(listModel);
                                }
                            }
                        } else {                           
                            listModel = _getEmptyListModel();
                            listModel.propDisplayValue = object.props.object_name.dbValues[0];
                            listModel.propInternalValue = object;
                            listModel.propDisplayDescription = object.props.object_desc.dbValues[0];
                            listModels.push(listModel);
                        }
                    }
                }

                if (listModels.length > 0) {
                    listModels.reverse();
                }
                data.transferOptionSetListBoxValues = listModels;
                return listModels;
            });
        });
    }
};
/**
* @param {*} response - The response that comes from the call to the getAvailableTransferOptionSets
* @param {*} data - The data class that the panel uses, updating the list boxes with values
*
* @return {*}
**/
export let handleTransferOptionSetsForImport = function (response, data) {
    var listModels = [];
    var listModel = null;

    data.transferOptionSetListBoxValues = listModels;
    if (!_.isUndefined(response.ServiceData.modelObjects)) {
        var modelObjects = response.ServiceData.modelObjects;

        var uidsToLoadFrom = [];
        _.forEach(modelObjects, function (modelObj) {
            uidsToLoadFrom.push(modelObj.uid);
        });

        var prop1 = 'props.object_name';

        _dataManagementSvc.loadObjects(uidsToLoadFrom).then(function () {
            _dataManagementSvc.getProperties(uidsToLoadFrom, ['option_groupnames', 'option_displaynames', 'option_realnames', 'option_initialvalues', 'option_descriptions', 'option_readonlyflags', 'object_desc']).then(function () {
                for (var indx = 0; indx < uidsToLoadFrom.length; indx++) {
                    var object = _cdmSvc.getObject(uidsToLoadFrom[indx]);
                    var dobj = _.get(object, prop1);
                    if (!_.isUndefined(dobj)) {
                        var prop2DispName = dobj.getDisplayValue();
                        listModel = _getEmptyListModel();
                        listModel.propDisplayValue = prop2DispName;
                        listModel.propInternalValue = object;
                        listModel.propDisplayDescription = object.props.object_desc.dbValues[0];
                        listModels.push(listModel);
                    }
                }
            });
        });
    }
    if (listModels.length > 0) {
        listModels.reverse();
    }
    data.xferOptionListBoxValues = listModels;
    return listModels;
};

/**
 * Get all the available RevisionRule objects from server
 *
 * @return {*}
 **/
function getRevisionRuleList(data) {
    var deferred = AwPromiseService.instance.defer();
    soaSvc.postUnchecked('Cad-2007-01-StructureManagement', 'getRevisionRules').then(
        function (response) {
            if (!_.isUndefined(response.output)) {
                var revRuleList = [];
                _.forEach(response.output, oneRule => {
                    var listModel = _getEmptyListModel();
                    listModel.propDisplayValue = oneRule.revRule.props.object_name.dbValues[0];
                    listModel.propInternalValue = oneRule.revRule;
                    revRuleList.push(listModel);
                });
                data.revisionRuleListBoxValues = revRuleList;
            }
        },
        function (error) {
            deferred.reject(error);
        });
}

/**
 * Get all the available VariantRules objects from server
 *
 * @return {*}
 **/
function getVariantRuleList(itemRev, data) {
    var deferred = AwPromiseService.instance.defer();
    var soInput = {
        itemRevs: [{ uid: itemRev, type: 'unknownType' }]
    };
    soaSvc.postUnchecked('Cad-2007-01-StructureManagement', 'getVariantRules', soInput).then(
        function (response) {
            if (!_.isUndefined(response.inputItemRevToVarRules)) {
                var varRuleList = [];
                _.forEach(response.inputItemRevToVarRules[1], oneItemRev => {
                    _.forEach(oneItemRev, oneRule => {
                        var listModel = _getEmptyListModel();
                        listModel.propDisplayValue = oneRule.props.object_name.dbValues[0];
                        listModel.propInternalValue = oneRule;
                        varRuleList.push(listModel);
                    });
                });
                if (!_.isEmpty(varRuleList)) {
                    var listModel = _getEmptyListModel();
                    varRuleList.push(listModel);
                    varRuleList = _.sortBy(varRuleList, ['propDisplayValue']);
                    data.variantRuleListBoxValues = varRuleList;
                }
            }
        },
        function (error) {
            deferred.reject(error);
        });
}

/**
 * Form session option string for objects that are marked for OT
 *
 * @return {*}
 **/
export let getMarkedOTObjects = function (response, data) {
    if (response) {
        if (!_.isUndefined(response.markInfo)) {

            var site2MarkedOTObjectString = new Map();
            const SEPARATOR = ',';
            //Collect all objects site wise
            _.forEach(response.markInfo, function (markOTObject) {

                var targetSiteId = markOTObject.targetSiteId;
                var objectUid = markOTObject.objectUID;

                var siteObjs = site2MarkedOTObjectString.get(targetSiteId);
                if (_.isUndefined(siteObjs)) {
                    var objsForOwnXfer = targetSiteId + ':' + objectUid;
                    site2MarkedOTObjectString.set(targetSiteId, objsForOwnXfer);
                }
                else {
                    siteObjs += SEPARATOR;
                    siteObjs += objectUid;
                    site2MarkedOTObjectString.set(targetSiteId, siteObjs);
                }
            });

            if (site2MarkedOTObjectString.size > 0) {
                data.markedObjectsForOTMap = site2MarkedOTObjectString;
            }
        }
    }
};

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which
 * service should be injected to provide the API for this module.
 */
export let moduleServiceNameToInject = 'exportToBriefcase';
export default exports = {
    moduleServiceNameToInject,
    isPartialExport,
    remoteOverrideOptionFromList,
    getTransferOptionSets,
    populateBriefcaseName,
    getTargetSitesForExport,
    saveTransferOptionSetContext,
    updateTransferOptionSetOverrides,
    loadTransferOptionOverridePanel,
    handleGetTransferOptionSetsResponse,
    changeSiteTypeSelection,
    formBriefcaseName,
    removeAllOverrideContext,
    getPreferenceContinueOnError,
    updateOverrideContext,
    getSOAInputForExport,
    getOccurenceThreadChain,
    collectOverrideOptions,
    getRootObjectsForExport,
    getTOSPanelInput,
    collectSessionOption,
    loadOverrideDataProvider,
    getMarkedOTObjects
};

/**
 * @memberof NgServices
 * @member exportToBriefcase
 */
app.factory('exportToBriefcase', //
    ['$q',
        'uwPropertyService',
        'awColumnService',
        'awTableService',
        'iconService',
        'soa_kernel_soaService',
        'modelPropertyService', //
        function ($q, uwPropertySvc, awColumnSvc, awTableSvc, iconSvc, soaSvc, modelPropertySvc) {
            _$q = $q;
            _uwPropertySvc = uwPropertySvc;
            _awColumnSvc = awColumnSvc;
            _awTableSvc = awTableSvc;
            _iconSvc = iconSvc;
            _soaSvc = soaSvc;
            _modelPropertySvc = modelPropertySvc;

            return exports;
        }
    ]);
