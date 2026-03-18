//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/MrmLicenseService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import mrmResourceGraphConstants from 'js/MrmResourceGraphConstants';
import mrmResourceGraphUtils from 'js/MrmResourceGraphUtils';

var exports = {};

/**
 * Checks MRL license
 *
 * @param {String} contextKey - the context key
 */
export let chekMRMLicense = function (contextKey) {

    var isMRMLicenseAvailable = appCtxService.ctx[contextKey].isMRMLicenseAvailable;

    if (isMRMLicenseAvailable !== undefined) {
        if (isMRMLicenseAvailable === false) {
            var topComponentName = appCtxService.ctx.aceActiveContext.context.topElement.props.object_string.uiValues[0];
            var mrmLicenseNotAvailableErrorText = mrmResourceGraphUtils.getMRMGraphLocalizedMessage('MRM0LicenseNotAvailableMessage', topComponentName);
            var msgObj = {
                msg: mrmLicenseNotAvailableErrorText,
                level: 3
            };
            messagingService.showError(msgObj.msg);
        }

        return;
    }

    var inputData = {
        "licAdminInput": [
            {
                "featureKey": mrmResourceGraphConstants.MRMResourceGraphConstants['MRMLicenseKey'],
                "licensingAction": "get"
            }
        ]
    };

    var deferred = AwPromiseService.instance.defer();

    return soaSvc.postUnchecked('Core-2019-06-Session', 'licenseAdmin', inputData).then(function (response) {

        if (response.partialErrors) {
            appCtxService.ctx[contextKey].isMRMLicenseAvailable = false;
            var isMRMLicenseNotAvailableError = false;
            _.forEach(response.partialErrors, function (partialError) {
                _.forEach(partialError.errorValues, function (error) {
                    if (error.code === 26025) {
                        isMRMLicenseNotAvailableError = true;
                    }
                });
            });

            if (isMRMLicenseNotAvailableError) {                
                var topComponentName = appCtxService.ctx.aceActiveContext.context.topElement.props.object_string.uiValues[0];
                var mrmLicenseNotAvailableErrorText = mrmResourceGraphUtils.getMRMGraphLocalizedMessage('MRM0LicenseNotAvailableMessage', topComponentName);
                var msgObj = {
                    msg: mrmLicenseNotAvailableErrorText,
                    level: 3
                };
                messagingService.showError(msgObj.msg);
            }
            else {
                processPartialErrors(response);
            }
        }
        else {
            appCtxService.ctx[contextKey].isMRMLicenseAvailable = true;
        }

        deferred.resolve(response);
    },
        function (error) {
            deferred.reject(error);
        });

    return deferred.promise;
};

var processPartialErrors = function (response) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if (response.partialErrors) {
        _.forEach(response.partialErrors, function (partialError) {
            getMessageString(partialError.errorValues, msgObj);
        });
    }

    if (msgObj.level <= 1) {
        messagingService.showInfo(msgObj.msg);
    } else {
        messagingService.showError(msgObj.msg);
    }
};

var getMessageString = function (messages, msgObj) {
    _.forEach(messages, function (object) {
        if (msgObj.msg.length > 0) {
            msgObj.msg += '<br>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max([msgObj.level, object.level]);
    });
};

export default exports = {
    chekMRMLicense
};
app.factory('MrmLicenseService', () => exports);
