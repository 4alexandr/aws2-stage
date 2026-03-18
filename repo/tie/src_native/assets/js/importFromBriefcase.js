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
 * @module js/importFromBriefcase
 */
import app from 'app';
import _ from 'lodash';
import 'js/uwPropertyService';
import 'js/awColumnService';
import 'soa/kernel/soaService';
import 'js/appCtxService';
import 'js/awTableStateService';
import 'js/awTableService';
import 'js/iconService';
import 'soa/dataManagementService';
import 'soa/kernel/clientDataModel';
import _appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import expService from 'js/exportToBriefcase';

'use strict';

var _$q = null;
var _uwPropertySvc = null;
var _awColumnSvc = null;
var _awTableSvc = null;
var _iconSvc = null;
var _soaSvc = null;
var _dataManagementSvc = null;
var _cdmSvc = null;

var exports = {};

export let populateImportBriefcaseData = function (data, validateOnly, ctx) {
    var sessionOptionsInput = collectSessionOption(data, validateOnly, ctx);
    var overrideOptionsInput = expService.collectOverrideOptions();

    data.overrideOptionsForImport = overrideOptionsInput;
    data.sessionOptionsForImport = sessionOptionsInput;
};

export let getSOAInputForBriefcaseImport = function (data) {
    return {
        bczFileTicket: data.fmsTicket,
        transferOptionSet: { uid: data.transferOptionSetListBox.dbValue.uid, type: 'unknownType' },
        overrideOptions: data.overrideOptionsForImport,
        sessionOptions: data.sessionOptionsForImport
    };
};

export let clearTransferOptionSets = function (data) {

    data.transferOptionSetListBox.dbValue = '';
    data.transferOptionSetListBox.uiValue = '';
    data.transferOptionSetListBox.value = '';

    data.transferOptionSetListBoxValues = [];

};
/**
 * collectSessionOption
 */
function collectSessionOption(data, validateOnlyButton,ctx) {
    var sessionOptionNamesValues = [];

    var TRUE_VALUE = 'True';
    var selectedFolderUId="";
    if ( ctx.mselected[0].modelType.typeHierarchyArray.indexOf('Folder') > -1) {
        selectedFolderUId = ctx.mselected[0].uid;
    }
   else if ( ctx.locationContext.modelObject.modelType.typeHierarchyArray.indexOf('Folder') > -1) {
        selectedFolderUId = ctx.locationContext.modelObject.uid;
    }

    if ( selectedFolderUId.length > 0 )
    {
        var folderUID = { optionName: 'folderuid', optionValue: selectedFolderUId };
        sessionOptionNamesValues.push(folderUID);
    }
    //The dry_run option
    var validateValue = data.validateRadio.dbValue;
    if ( validateValue ) {
        if ( validateOnlyButton )
        {
            var dryRun = { optionName: 'dry_run', optionValue: TRUE_VALUE };
            sessionOptionNamesValues.push(dryRun);
            data.importDryrun = true;
        }
        else{
            var validateImport = { optionName: 'ValidateImport', optionValue: TRUE_VALUE };
            sessionOptionNamesValues.push(validateImport);
            data.importDryrun = false;
        }
    }

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

    return sessionOptionNamesValues;
}


/**
 * @memberof NgServices
 * @member importFromBriefcase
 */
app.factory('importFromBriefcase', //
    ['$q',
        'uwPropertyService',
        'awColumnService',
        'awTableService',
        'iconService',
        'soa_kernel_soaService',
        'soa_dataManagementService',
        'soa_kernel_clientDataModel', //
        function ($q, uwPropertySvc, awColumnSvc, awTableSvc, iconSvc, soaSvc, dataManagementSvc, cdm) {
            _$q = $q;
            _uwPropertySvc = uwPropertySvc;
            _awColumnSvc = awColumnSvc;
            _awTableSvc = awTableSvc;
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
export let moduleServiceNameToInject = 'importFromBriefcase';
export default exports = {
    moduleServiceNameToInject,
    populateImportBriefcaseData,
    getSOAInputForBriefcaseImport,
    collectSessionOption,
    clearTransferOptionSets

};
