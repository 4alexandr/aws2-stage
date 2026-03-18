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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0NotificationService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import dmSvc from 'soa/dataManagementService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import 'js/eventBus';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

var checkReadyCount = 0;

/**
 * event constants
 */
var AC0_CONVERSATION_NOTIFICATION = "Ac0_Conversation_Notification"; //$NON-NLS-1$

let openConversationPanel = function( ) {
    var selected = appCtxService.ctx.selected;
    var mselected = appCtxService.ctx.mselected;

    if(selected && mselected.length === 1)
    {
        commandPanelService.activateCommandPanel( "Ac0UniversalConversationPanel", "aw_toolsAndInfo" );
        checkReadyCount = 0;
    }
    else
    {
        checkReadyCount++;
        if(checkReadyCount <= 6)
        {
            setTimeout(openConversationPanel, 500);
        }
    }
};

export let openConversationProcessing = function( data ) {
    var message = data.object;

    if( message !== null && message.props !== null && message.props.fnd0TargetObject !== null &&
        message.props.fnd0TargetObject.dbValues !== null && message.props.fnd0TargetObject.dbValues.length > 0 ) {

        var targetUid = message.props.fnd0TargetObject.dbValues[ 0 ];

        exports.redirectToShowObject( targetUid );
    }
};

/**
 * Open notification message
 * @param { data } data - contains event object
 */
export let openLineItem = function( data ) {
    if( data.eventObj.props.eventtype_id && data.object && data.object.uid ) {
        exports.openConversationProcessing( data );
    }
};

/**
 * Opens the notification object on notification message click in xrt show object sublocation
 */
export let redirectToShowObject = function( uid, params ) {
    if( uid ) {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var options = {};

        var toParams = {};
        if( params ) {
            toParams = params;
        } else {
            toParams.uid = uid;
            toParams.page = "Overview";
        }
        options.inherit = false;

        AwStateService.instance.go( showObject, toParams, options );

        checkReadyCount++;
        setTimeout( openConversationPanel, 500 );
    }
};

/**
 * Service to define actions on alert notification click for document management application
 *
 * @member Ac0NotificationService
 */

export default exports = {
    openConversationProcessing,
    openLineItem,
    redirectToShowObject
};
app.factory( 'Ac0NotificationService', () => exports );
