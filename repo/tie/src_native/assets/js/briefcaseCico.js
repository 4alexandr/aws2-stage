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
 * @module js/briefcaseCico
 */
import app from 'app';
import _ from 'lodash';
import 'js/uwPropertyService';
import 'soa/kernel/soaService';
import 'js/appCtxService';
import 'js/iconService';
import 'soa/dataManagementService';
import 'soa/kernel/clientDataModel';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import adapterService from 'js/adapterService';
import _appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

'use strict';

var _$q = null;

var _iconSvc = null;
var _soaSvc = null;
var _dataManagementSvc = null;
var _cdmSvc = null;

var exports = {};

export let getSelectedObjects = function (ctx) {
    var selectedInput = [];

    // if the preference not found use the predefined list
    var supportedTypes = (ctx.preferences) ? ctx.preferences.Briefcase_checkout_supported_types : undefined;
    if (_.isUndefined(supportedTypes) || supportedTypes.length === 0) {
        supportedTypes = ['ADA_License', 'Dataset', 'Form', 'Item', 'ItemRevision', 'PSBOMView', 'PSBOMViewRevision'];
    }
    _appCtxSvc.registerCtx('skippedBriefcaseCheckoutObjs', '');

    var skippedObjectsString = "";

    if (ctx.aceActiveContext) {

        _.forEach(ctx.mselected, function (selectedObj) {
            if (selectedObj.props.awb0UnderlyingObject && selectedObj.props.awb0UnderlyingObject.dbValues &&
                selectedObj.props.awb0UnderlyingObject.dbValues.length > 0) {

                var object = {
                    uid: selectedObj.props.awb0UnderlyingObject.dbValues[0],
                    type: 'unknownType'
                };

                selectedInput.push(object);
            }
        });
    } else {
        _.forEach(ctx.mselected, function (selectedItem) {
                // if the object type is not in the support type list, skip it
            var isSupportedType = false;
            _.forEach(supportedTypes, function (oneType) {
                if (selectedItem.modelType && selectedItem.modelType.typeHierarchyArray && selectedItem.modelType.typeHierarchyArray.includes(oneType)) {
                    isSupportedType = true;                
                }
            });

            if(isSupportedType){
                var item = {
                    uid: selectedItem.uid,
                    type: selectedItem.type
                };
                selectedInput.push(item);
            }
            else{
                var resource = 'tieMessages';
                var errMessage = '';
                var localTextBundle = localeSvc.getLoadedText(resource);
                errMessage = localTextBundle.briefcasePreSoaCheckoutExclusion.replace('{0}', ((selectedItem.props && selectedItem.props["object_string"]) ? selectedItem.props["object_string"].uiValue : selectedItem.uid)  + 
                " (" + selectedItem.type + ") ");

                skippedObjectsString =  skippedObjectsString + errMessage;
            }
        });
    }

    _appCtxSvc.registerCtx('skippedBriefcaseCheckoutObjs', skippedObjectsString);

    return selectedInput;
};

export let getSiteForCheckout = function (data) {

    var siteIDValue = parseInt(data.targetSitesListBox.dbValue.props.site_id.dbValues[0]);
    return siteIDValue;
};


/**
 * Handles error from SOA
 *
 * @param {object} data the view model data object
 */
export let processBriefcaseCheckoutPartialErrors = function (serviceData, ctx) {

    if (serviceData.partialErrors) {

        var messages = '';
        var numOfErrors = ctx.mselected.length - serviceData.partialErrors.length;

        //If there are client failures, we remove them from the error count
        var clientFailures = _appCtxSvc.getCtx('skippedBriefcaseCheckoutObjs');
        if(clientFailures && clientFailures.length > 0){
            numOfErrors = numOfErrors - clientFailures.length;
        }

        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {
            errMessage = localTextBundle.briefcasecheckOutFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', ctx.mselected.length);
        }
        else {
            errMessage = localTextBundle.briefcaseCheckOutFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
        }

        // briefcasecheckOutFailureMultiple

        for (var index in serviceData.partialErrors) {
            var partialError = serviceData.partialErrors[index];

            for (var count in partialError.errorValues) {
                var errorValue = partialError.errorValues[count];
                if (errorValue.message.length > 0) {
                    messages += '<br>' + errorValue.message;
                }
            }
        }

        var message = null;

        errMessage += messages;

        var partialFailureMessage = _appCtxSvc.getCtx('skippedBriefcaseCheckoutObjs');
        if(partialFailureMessage && partialFailureMessage.length > 0){
            errMessage += "\n\n";
            errMessage += partialFailureMessage;
        }
        
        // message = messages;

        msgSvc.showError(errMessage);
    }
    else{
        var partialFailureMessage = _appCtxSvc.getCtx('skippedBriefcaseCheckoutObjs');
        if(partialFailureMessage && partialFailureMessage.length > 0){
            msgSvc.showWarning(partialFailureMessage);
        }
    }
    _appCtxSvc.unRegisterCtx('skippedBriefcaseCheckoutObjs');
};

/**
 * Handles error from SOA
 *
 */
export let processBriefcaseCheckinPartialErrors = function (serviceData, ctx) {

    if (serviceData.partialErrors) {

        var messages = '';
        var numOfErrors = ctx.mselected.length - serviceData.partialErrors.length;
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {
            errMessage = localTextBundle.briefcaseCheckInFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', ctx.mselected.length);
        }
        else {
            errMessage = localTextBundle.briefcaseCheckInFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
        }

        // briefcaseCheckInFailureSingle
        for (var index in serviceData.partialErrors) {
            var partialError = serviceData.partialErrors[index];

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
};

/**
 * Handles error from SOA
 *
 */
export let processCancelBriefcaseCheckoutPartialErrors = function (serviceData, ctx) {

    if (serviceData.partialErrors) {

        var messages = '';
        var numOfErrors = ctx.mselected.length - serviceData.partialErrors.length;
        var resource = 'tieMessages';
        var errMessage = '';
        var localTextBundle = localeSvc.getLoadedText(resource);
        if (ctx.mselected.length > 1) {
            errMessage = localTextBundle.cancelBriefcaseCheckOutFailureMultiple.replace('{0}', numOfErrors);
            errMessage = errMessage.replace('{1}', ctx.mselected.length);
        }
        else {
            errMessage = localTextBundle.cancelBriefcaseCheckOutFailureSingle.replace('{0}', ctx.mselected[0].props.object_string.uiValues[0]);
        }

        // cancelBriefcaseCheckOutFailureMultiple
        for (var index in serviceData.partialErrors) {
            var partialError = serviceData.partialErrors[index];

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
};
/*
 * @memberof NgServices
 * @member briefcaseCico
 */
app.factory('briefcaseCico', //
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
export let moduleServiceNameToInject = 'briefcaseCico';
export default exports = {
    moduleServiceNameToInject,    
    getSelectedObjects,
    getSiteForCheckout,
    processBriefcaseCheckoutPartialErrors,
    processBriefcaseCheckinPartialErrors,
    processCancelBriefcaseCheckoutPartialErrors
};
