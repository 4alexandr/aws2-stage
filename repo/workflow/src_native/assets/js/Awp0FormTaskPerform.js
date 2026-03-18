// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0FormTaskPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjSvc from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

var exports = {};

export let getComments = function( data ) {
    return Awp0PerformTask.getComments( data );
};

/**
 * Populate the properties on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {

    var selectedObject = selection;
    if( !selectedObject ) {
        selectedObject = viewModelObjSvc.createViewModelObject( appCtxSvc.ctx.task_to_perform.task[ 0 ] );
    }

    var nameValue = selectedObject.props.object_string.dbValues[ 0 ];
    data.taskName.dbValue = nameValue;
    data.taskName.uiValue = nameValue;

    var commentsValue = selectedObject.props.comments.dbValues[ 0 ];
    data.comments.dbValue = commentsValue;
    data.comments.uiValue = commentsValue;

    Awp0PerformTask.populateDescription( data, selectedObject );

    awp0InboxUtils.populateJobDescription(data, selectedObject);

    var secureTaskValue = selectedObject.props.secure_task.dbValues[ 0 ];
    data.isSecureTask.dbValue = secureTaskValue === "1";

    var hasFailurePathsValue = selectedObject.props.has_failure_paths.dbValues[ 0 ];
    data.hasFailurePaths.dbValue = hasFailurePathsValue === "1";

    var fromTaskValue = selectedObject.props.fnd0PerformForm.dbValues[ 0 ];

    if( fromTaskValue && fromTaskValue.length > 0 && fromTaskValue[ 0 ] ) {
        data.formObject = cdm.getObject( fromTaskValue[ 0 ] );
        eventBus.publish( "formObjectCreatedAW" );
    }

    data.isDSConfigured = false;

    var deferred = AwPromiseService.instance.defer();
    Awp0PerformTask.getDigitalSignatureService().then( function( awDigitalSignatureService ) {
        deferred.resolve( null );

        if( awDigitalSignatureService ) {
            data.isDSConfigured = true;
            var isApplyDS = awDigitalSignatureService.isApplyDS( selectedObject );
            var isAuthenticationRequired = awDigitalSignatureService.isAuthenticationRequired( selectedObject );

            if( isApplyDS || isAuthenticationRequired ) {
                awDigitalSignatureService.addActiveXObjectElement();
            }
        }
    } );

    return deferred.promise;

};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the correct
 * errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    return Awp0PerformTask.populateErrorMessageOnPerformAction( response );
};

export default exports = {
    getComments,
    populatePanelData,
    populateErrorMessageOnPerformAction
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0FormTaskPerform
 */
app.factory( 'Awp0FormTaskPerform', () => exports );
