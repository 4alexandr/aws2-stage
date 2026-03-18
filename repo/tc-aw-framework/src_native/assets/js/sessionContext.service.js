// Copyright (c) 2020 Siemens

/**
 * native impl for sessionContextService. This is native impl for the GWT component. This is core AW framework so it's
 * TC agnostic
 *
 * @module js/sessionContext.service
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * module reference to client data model
 */

/**
 * The ID used for identification of this client D-30368 This value must be kept in sync in all instances where it
 * is used. See defect if change is required.
 */
var _clientID = 'ActiveWorkspaceClient';

/**
 * The client version string - This value must match what is defined for clientVersion in web.xml.
 */
var _clientVersion = '10000.1.2';

/**
 * constant declaration
 */
var SESSION_DISCRIMINATOR_NOTSET = 'session_discriminator_notset';

/**
 * The client session discriminator
 */
var _clientSessionDiscriminator = SESSION_DISCRIMINATOR_NOTSET;

/**
 * The user name of the authenticated user
 *
 * @return {String} user name if available else USER_NAME_NOTSET
 */
export let getUserName = function() {
    var userSession = cdm.getUserSession();
    var usrName = '';
    if( userSession && userSession.props && userSession.props.user_id ) {
        usrName = userSession.props.user_id.getDisplayValue();
    }
    return usrName;
};

/**
 * The current role of the logged in user
 *
 * @return {String} current role of the user if available else USER_ROLE_NOTSET
 */
export let getUserRole = function() {
    var userSession = cdm.getUserSession();
    var role = '';
    if( userSession && userSession.props && userSession.props.role_name ) {
        role = userSession.props.role_name.getDisplayValue();
    }
    return role;
};

/**
 * The current group of the logged in user
 *
 * @return {String} current group of the user if available else USER_GROUP_NOTSET
 */
export let getUserGroup = function() {
    var userSession = cdm.getUserSession();
    var grp = '';
    if( userSession && userSession.props && userSession.props.group_name ) {
        grp = userSession.props.group_name.getDisplayValue();
    }
    return grp;
};

/**
 * locale of the logged in user if available else USER_LOCALE_NOTSET
 *
 * @return {String} locale
 */
export let getUserLocale = function() {
    var userSession = cdm.getUserSession();
    var locale = '';
    if( userSession && userSession.props && userSession.props.fnd0locale ) {
        locale = userSession.props.fnd0locale.getDisplayValue();
    }
    return locale;
};

/**
 * Client session discriminator
 *
 * @return {String} clientSessionDiscriminator (if set)
 */
export let getSessionDiscriminator = function() {
    return _clientSessionDiscriminator;
};

/**
 * Set client session discriminator
 *
 * @param {String} val - The session discriminator
 */
export let setSessionDiscriminator = function( val ) {
    _clientSessionDiscriminator = val;
};

/**
 * Client identifier for this client
 *
 * @return {String} clientID
 */
export let getClientID = function() {
    return _clientID;
};

/**
 * Client version string
 *
 * @return {String} clientVersion
 */
export let getClientVersion = function() {
    return _clientVersion;
};

// the session.updated event may include a new discriminator value
// if there, pick up and modify the context member.
eventBus.subscribe( 'session.updated', function( data ) {
    if( data && data.sessionDiscriminator ) {
        _clientSessionDiscriminator = data.sessionDiscriminator;
    }
} );

exports = {
    getUserName,
    getUserRole,
    getUserGroup,
    getUserLocale,
    getSessionDiscriminator,
    setSessionDiscriminator,
    getClientID,
    getClientVersion
};
export default exports;
/**
 * Definition for the service.
 *
 * @member SessionContextService
 * @memberof NgServices
 *
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 *
 * @returns {SessionContextService} Reference to service API Object.
 */
app.factory( 'SessionContextService', () => exports );
