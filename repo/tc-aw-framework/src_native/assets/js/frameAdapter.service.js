// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define window */

/**
 * Defines {@link NgServices.frameAdapterService} which provides utility functions for viewer
 *
 * @module js/frameAdapter.service
 *
 * @namespace frameAdapterService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import sessionCtxSvc from 'js/sessionContext.service';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import 'jscom';
import 'manipulator';

let exports = {}; //eslint-disable-line no-invalid-this

/**
 * The TC (SOA) proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_SOA_PROXY_CONTEXT = 'tc';

/**
 * Relative path to client side accessible SOA services. Specifically this is the root path, not the path
 * which AWC client generally sends requests to.
 */
var CLIENT_SOA_PATH = WEB_XML_SOA_PROXY_CONTEXT + '/';

/**
 * The Vis proxy servlet context. This must be the same as the VisPoolProxy mapping in the web.xml
 */
var WEB_XML_VIS_PROXY_CONTEXT = 'VisProxyServlet' + '/';

/**
 * {Boolean} TRUE if various processing steps should be logged.
 */
var _debug_logLaunchActivity = browserUtils.getWindowLocationAttributes().logLaunchActivity !== undefined;

/**
 * {String} Variable holding the soa path url.
 */
var _soaPath;

/**
 * Get connection url
 *
 * @returns {String} URL
 */
export let getConnectionUrl = function() {
    return browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;
};

/**
 * Create launch file api
 *
 * @function createLaunchFile
 * @memberof frameAdapterService
 *
 * @param {Object} contextObject - context model object
 * @param {Object} additionalInfo - Additional information
 * @param {Object} pvOpenConfig - Additional information
 *
 * @return {Promise} A promise resolved once fms ticket is created
 */
export let createLaunchFile = function( contextObject, additionalInfo, pvOpenConfig ) {
    return _getServerInfo().then( function( serverInfo ) {
        var userAgentInfo = _getUserAgentInfo();

        var idInfo = _getIdInfo( contextObject, additionalInfo, pvOpenConfig );

        var sessionDescVal = null;

        if( _.isUndefined( additionalInfo ) || _.isNull( additionalInfo ) ) {
            sessionDescVal = sessionCtxSvc.getSessionDiscriminator();
        }

        var sessionInfo = {};

        sessionInfo.sessionDescriminator = sessionDescVal;
        sessionInfo.sessionAdditionalInfo = {};
        sessionInfo.sessionAdditionalInfo.CLIENT = 'AW';

        var idInfos = [];

        idInfos.push( idInfo );

        var input = {};

        input.idInfos = idInfos;
        input.serverInfo = serverInfo;
        input.userDataAgentInfo = userAgentInfo;
        input.sessionInfo = sessionInfo;

        return soaSvc.post( 'Visualization-2011-02-DataManagement', 'createLaunchFile', input )
            .then( function( response ) {
                return response.ticket;
            } );
    } );
};

/**
 * Create launch Info server request
 *
 * @param {Object} idInfo - context model object and additional info.
 * @param {Object} serverInfo - host server info object.
 *
 * @returns {Promise} Resolved with SOA response from "ActiveWorkspaceVis-2015-03-DataManagement" -
 * "createLaunchInfo" service call.
 */
var _createLaunchInfoServerRequest = function( idInfo, serverInfo ) {
    var input = {
        idInfos: idInfo,
        serverInfo: serverInfo,
        sessionInfo: {
            sessionAdditionalInfo: {},
            sessionDescriminator: sessionCtxSvc.getSessionDiscriminator(),
            sessionOptions: {
                UseTransientVolume: {
                    includeInLaunchFile: false,
                    optionValue: 'True'
                }
            }
        },
        userDataAgentInfo: _getUserAgentInfo()
    };

    return soaSvc.post( 'ActiveWorkspaceVis-2015-03-DataManagement', 'createLaunchInfo', input );
};

/**
 * Create Info file api
 *
 * @param {Object} idInfo - context model object and additional info.
 * @param {Object} serverInfo - host server info object.
 *
 * @returns {Promise} Resolved with response from 'createLaunchInfo' SOA operation.
 */
export let createLaunchInfo = function( idInfo, serverInfo ) {
    if( !serverInfo ) {
        return _getServerInfo().then( function( serverInfo ) {
            return _createLaunchInfoServerRequest( idInfo, serverInfo );
        } );
    }

    return _createLaunchInfoServerRequest( idInfo, serverInfo );
};

/**
 * Get server information from vis server
 *
 * @function _getServerInfo
 * @memberof frameAdapterService
 *
 * @return {Promise} A promise resolved once server info is obtained
 */
function _getServerInfo() {
    return _getSoaPath().then( function( soaPath ) {
        if( _debug_logLaunchActivity ) {
            logger.info( 'frameAdapterService:' + '_getServerInfo: ' + 'soaPath=' + soaPath );
        }

        var protocol = soaPath.substring( 0, soaPath.indexOf( '://', 0 ) );

        var returnObject = {};

        returnObject.protocol = protocol;
        returnObject.hostpath = soaPath;
        returnObject.servermode = 4;

        return returnObject;
    } );
}

/**
 * Get SOA path information from vis server
 *
 * @function _getSoaPath
 * @memberof frameAdapterService
 *
 * @return {Promise} A promise resolved once SOA path info is obtained
 */
function _getSoaPath() {
    if( !_.isEmpty( _soaPath ) ) {
        return AwPromiseService.instance.resolve( _soaPath );
    }

    var connectionUrl = browserUtils.getBaseURL() + WEB_XML_VIS_PROXY_CONTEXT;

    if( _debug_logLaunchActivity ) {
        logger.info( 'frameAdapterService:' + '_getSoaPath: ' + 'connectionUrl=' + connectionUrl );
    }

    return window.JSCom.Health.HealthUtils.getSOAFullPath( connectionUrl ).then(
        function( soaPathFromVisServer ) {
            if( !_.isEmpty( soaPathFromVisServer ) ) {
                _soaPath = soaPathFromVisServer;
            } else {
                _soaPath = _getDefaultSoaPath();
            }

            if( _debug_logLaunchActivity ) {
                logger.info( 'frameAdapterService:' + '_getSoaPath: ' + '_soaPath=' + soaPathFromVisServer );
            }

            return _soaPath;
        },
        function( err ) {
            logger.error( 'Failed to get soa path : ' + err );

            _soaPath = _getDefaultSoaPath();

            return _soaPath;
        } );
}

/**
 * Get default SOA path information
 *
 * @function _getDefaultSoaPath
 * @memberof frameAdapterService
 *
 * @return {Object} A default SOA path string
 */
function _getDefaultSoaPath() {
    return browserUtils.getBaseURL() + CLIENT_SOA_PATH;
}

/**
 * Get client information
 *
 * @function _getUserAgentInfo
 * @memberof frameAdapterService
 *
 * @return {Object} Client information
 */
function _getUserAgentInfo() {
    var userAgentInfo = {};

    userAgentInfo.userApplication = sessionCtxSvc.getClientID();
    userAgentInfo.userAppVersion = sessionCtxSvc.getClientVersion();

    return userAgentInfo;
}

/**
 * Construct the object containing information about the item to be launched in visualization.
 *
 * @function _getIdInfo
 * @memberof frameAdapterService
 *
 * @param {String} id - A required parameter that references the object to be launched. If needed, launched
 *            object will be resolved by the server to a launch able object.
 *
 * @param {Object} additionalInfo additional information to be added to vvi launch file
 * @param {Object} pvOpenConfig - Additional information
 *
 * @return {IdInfo} IdInfo object
 */
function _getIdInfo( id, additionalInfo, pvOpenConfig ) {
    var additionalInfoToBeReturned = {};

    if( !_.isUndefined( additionalInfo ) && !_.isNull( additionalInfo ) ) {
        additionalInfoToBeReturned = additionalInfo;
    }

    if( pvOpenConfig ) {
        additionalInfoToBeReturned.OVERRIDE_OperationStructure = pvOpenConfig;
    }

    return {
        id: id,
        item: null,
        operation: 'Open',
        idAdditionalInfo: additionalInfoToBeReturned
    };
}

export default exports = {
    getConnectionUrl,
    createLaunchFile,
    createLaunchInfo
};
/**
 * Set of utility functions for viewer
 *
 * @member frameAdapterService
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {SessionContextService} sessionCtxSvc - Service to use.
 * @param {soa_kernel_soaService} soaSvc - Service to use.
 */
app.factory( 'frameAdapterService', () => exports );
