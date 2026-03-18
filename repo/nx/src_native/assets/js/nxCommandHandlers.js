// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 window
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/nxCommandHandlers
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import soaSvc from 'soa/kernel/soaService';
import fileManagementService from 'soa/fileManagementService';
import tcServerVersion from 'js/TcServerVersion';
import cmm from 'soa/kernel/clientMetaModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import hostOpenService from 'js/hosting/hostOpenService';
import tcSessionData from 'js/TcSessionData';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import browserUtils from 'js/browserUtils';
import tcSesnD from 'js/TcSessionData';
import _uwPropSrv from 'js/uwPropertyService';
import addObjectUtils from 'js/addObjectUtils';
import _ from 'lodash';
import logger from 'js/logger';

var exports = {};

var _fileInputForms;

var nxOpenObjectToOpen = [];

/******************************************************************************************************************/
// Begin Stand ALone commands handlers
/******************************************************************************************************************/

var getSelectionStrings = function( selectedObjects ) {
    if( selectedObjects ) {
        var selectedString = 'SelectedObject=';
        if( _.isArray( selectedObjects ) ) {
            for( var i = 0; i < selectedObjects.length; i++ ) {
                if( selectedObjects[ i ].modelType !== 'mselected' ) {
                    // 2 different scenarios exist when folders are selected, if only the home folder is selected or if any folders are selected with items
                    if( cmm.isInstanceOf( 'Folder', selectedObjects[ i ].modelType ) ) {
                        // This scenario only occurs when the home folder is being Opened
                        // Removes the Selected Object line in the downloaded file to prevent errors upon opening NX
                        if( selectedString === 'SelectedObject=' ) {
                            selectedString = '';
                        } else {
                            // Covers all other scenarios of folders being selected with items to Open in NX
                            // Folders are checked last for selected objects in the Open in NX file, this ensures nothing is added on to the item UIDs in file
                            selectedString = selectedString.concat( '' );
                        }
                    } else {
                        // Adds items, assemblies, etc as normal
                        selectedString = selectedString.concat( selectedObjects[ i ].uid );
                        // Allows for multiple objects to be Opened in NX together
                        if( i + 1 < selectedObjects.length ) {
                            selectedString = selectedString.concat( ' ' );
                        }
                    }
                }
            }
        } else {
            if( selectedObjects.uid !== null ) {
                selectedString = selectedString.concat( selectedObjects.uid );
            }
        }
        return selectedString;
    }
};
var getProductContextInfo = function() {
    var pciUID = appCtxSvc.getCtx( 'occmgmtContext.productContextInfo.uid' );
    if( pciUID ) {
        return 'ProductContextInfo=' + pciUID;
    }
};
var getContextObject = function() {
    var coUID = appCtxSvc.getCtx( 'occmgmtContext.productContextInfo.props.awb0ContextObject.dbValues[0]' );
    if( coUID ) {
        return 'ContextObject=' + coUID;
    }
};
var getContextObjectType = function() {
    var coUID = appCtxSvc.getCtx( 'occmgmtContext.productContextInfo.props.awb0ContextObject.dbValues[0]' );
    if( coUID ) {
        var obj = cdm.getObject( coUID );
        if( obj ) {
            return 'ContextObjectType=' + obj.type;
        }
    }
};
var getServerInfoString = function( ssoHostPathUrl ) {
    var CLIENT_SOA_PATH = 'tc/';
    var _soaPath = browserUtils.getBaseURL() + CLIENT_SOA_PATH;

    var protocol = _soaPath.substring( 0, _soaPath.indexOf( '://', 0 ) );
    return 'Protocol=' + protocol + '&' + 'HostPath=' + _soaPath + '&' + 'SSOHostPathValue=' + _soaPath + '&' + 'Server_Version=' + tcServerVersion.majorVersion;
};
var getUserToken = function( userName ) {
    return 'UserName=' + userName;
};
var getAppToken = function( app ) {
    return 'Application=' + app;
};
var getEnvToken = function( env ) {
    return 'Environment=' + env;
};
var getOEMToken = function( oem ) {
    return 'OEMDefitionDir=' + oem;
};
var getSSOToken = function( sso ) {
    return 'tcSSOURL=' + sso;
};
var getFSCToken = function( fsc ) {
    return 'FSCURL=' + fsc;
};
var getTCCSToken = function( tccs ) {
    return 'TCCSENV=' + tccs;
};
var getSecureToken = function( secureToken ) {
    var encodedSecureToken = encodeURIComponent( secureToken );
    return 'SessionInfo=' + encodedSecureToken;
};
export let nxTcXmlCommandHandler = function( sourceObjects ) {
    var versionNumber;
    if( sourceObjects.props && sourceObjects.props.revision_number && sourceObjects.props.revision_number.dbValue ) {
        versionNumber = sourceObjects.props.revision_number.dbValue;
        sourceObjects = [ appCtxSvc.ctx.selected ];
    }
    if ( !Array.isArray( sourceObjects ) ) {
        sourceObjects = [ sourceObjects ];
    }

    // If a revision is not configured correctly, don't include it.
    sourceObjects = sourceObjects.filter( function( sourceObject ) {
        if ( sourceObject && ( !sourceObject.props.awb0UnderlyingObject || sourceObject.props.awb0UnderlyingObject.dbValues[ 0 ] ) ) {
            return sourceObject;
        }
        return null;
    } );

    var userName = appCtxSvc.ctx.userSession.props.user_id.dbValues[ 0 ];
    var time = 300;
    var input = {
        duration: time
    };

    return soaSvc.postUnchecked( 'Internal-Core-2014-11-Session', 'getSecurityToken', input ).then(
        function( responseData ) {
            var secureToken = responseData.out;

            var prefNames = [ 'AWC_NX_TCCS_ENV', 'AWC_NX_SSO_URL', 'AWC_NX_FSC_URL' ];
            preferenceSvc.getStringValues( prefNames ).then( function( values ) {
                    var uriToLaunch = browserUtils.getBaseURL() + 'launcher/openinnx?';

                    // Check if any types are unsupported.
                    // If unsupported type preference is unset or object type couldn't be found, then treat no type as unsupported..
                    sourceObjects = sourceObjects.filter( sourceObject => {
                        var unsupportedTypes = appCtxSvc.ctx.preferences.AWC_NX_OpenUnsupportedTypes;
                        var objectType = sourceObject.props.awb0UnderlyingObjectType || sourceObject.props.object_type;
                        return !( objectType && unsupportedTypes && unsupportedTypes.includes( objectType.dbValues[0] ) );
                    } );

                    if ( sourceObjects.length > 0 ) {
                        uriToLaunch = uriToLaunch + getSelectionStrings( sourceObjects ) + '&';
                    }
                    uriToLaunch = uriToLaunch + getServerInfoString( appCtxSvc.ctx.preferences.AWC_NX_SSO_URL ) + '&' +
                    getUserToken( userName ) + '&' + getSecureToken( secureToken );
                    if( versionNumber ) {
                        uriToLaunch = uriToLaunch + '&' + 'VersionNumber=' + versionNumber;
                    }
                    if( appCtxSvc.ctx.preferences.TC_NX_Current_Application && appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported &&
                        appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported[ 0 ] === 'true' ) {
                        uriToLaunch = uriToLaunch + '&' + getAppToken( appCtxSvc.ctx.preferences.TC_NX_Current_Application[ 0 ] );
                    }
                    if( appCtxSvc.ctx.preferences.TC_NX_Current_Environment && appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported &&
                        appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported[ 0 ] === 'true' ) {
                        uriToLaunch = uriToLaunch + '&' + getEnvToken( appCtxSvc.ctx.preferences.TC_NX_Current_Environment[ 0 ] );
                    }
                    if( appCtxSvc.ctx.preferences.TC_NX_OEM_DEFINITION_DIR && appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported &&
                        appCtxSvc.ctx.preferences.AWC_NX_ApplicationAndEnvironmentIsSupported[ 0 ] === 'true' ) {
                        uriToLaunch = uriToLaunch + '&' + getOEMToken( appCtxSvc.ctx.preferences.TC_NX_OEM_DEFINITION_DIR );
                    }

                    if( appCtxSvc.ctx.preferences.AWC_NX_SSO_URL ) {
                        uriToLaunch = uriToLaunch + '&' + getSSOToken( appCtxSvc.ctx.preferences.AWC_NX_SSO_URL );
                    }

                    if( appCtxSvc.ctx.preferences.AWC_NX_TCCS_ENV ) {
                        uriToLaunch = uriToLaunch + '&' + getTCCSToken( appCtxSvc.ctx.preferences.AWC_NX_TCCS_ENV );
                    }

                    if( appCtxSvc.ctx.preferences.AWC_NX_FSC_URL ) {
                        uriToLaunch = uriToLaunch + '&' + getFSCToken( appCtxSvc.ctx.preferences.AWC_NX_FSC_URL );
                    }
                    if( getProductContextInfo() !== undefined ) {
                        uriToLaunch = uriToLaunch + '&' + getProductContextInfo();
                    }

                    if ( appCtxSvc.getCtx( 'preferences.AWC_NX_Supports_TempSession' ) &&
                        appCtxSvc.getCtx( 'preferences.AWC_NX_Supports_TempSession' )[0] === 'true' &&
                        appCtxSvc.getCtx( 'mselected' )[0] === appCtxSvc.getCtx( 'occmgmtContext.topElement' ) &&
                        appCtxSvc.getCtx( 'aceActiveContext.context.productContextInfo.props.awb0FilterCount.dbValues' )[0] > 0 ) {
                            uriToLaunch = uriToLaunch + '&' + 'ContextObject=' + nxOpenObjectToOpen[0].uid;
                            uriToLaunch = uriToLaunch + '&' + 'ContextObjectType=' + 'Fnd0TempAppSession';
                    } else {
                        if( getContextObject() !== undefined ) {
                            uriToLaunch = uriToLaunch + '&' + getContextObject();
                        }
                        if( getContextObjectType() !== undefined ) {
                            uriToLaunch = uriToLaunch + '&' + getContextObjectType();
                        }
                    }
                    window.open( uriToLaunch, '_self', 'enabled' );
            } );
        } );
};

export let downloadPartFile = function( filesUiValues, fileDbValues ) {
    for( var i = 0; i < filesUiValues.length; i++ ) {
        if( filesUiValues[ i ].endsWith( 'prt' ) ) {
            fileManagementService.getFileReadTickets( fileDbValues[ i ] );
            return;
        }
    }
};

/**
 * Uses the underlying object for the case of Workset Revision in Hosted NX
 *
 * @param {IModelObject|IModelObjectArray} sourceObjects - IModelObject(s) to open.
 */
export let openInNX = function( sourceObjects ) {
    if ( appCtxSvc.getCtx( 'preferences.AWC_NX_Supports_TempSession' ) &&
         appCtxSvc.getCtx( 'preferences.AWC_NX_Supports_TempSession' )[0] === 'true' &&
         appCtxSvc.getCtx( 'mselected' )[0] === appCtxSvc.getCtx( 'occmgmtContext.topElement' ) &&
         appCtxSvc.getCtx( 'aceActiveContext.context.productContextInfo.props.awb0FilterCount.dbValues' )[0] > 0 ) {
        sourceObjects = nxOpenObjectToOpen;
    }
    var check = false;
    for( var it = 0; it < sourceObjects.length; it++ ) {
        if( sourceObjects[ it ] && ( cmm.isInstanceOf( 'Cpd0WorksetRevision', sourceObjects[ it ].modelType )
            || cmm.isInstanceOf( 'Fnd0TempAppSession', sourceObjects[ it ].modelType ) ) ) {
            check = true;
            break;
        }
    }

    if( check ) {
        // Check if any types are unsupported.
        // If unsupported type preference is unset or object type couldn't be found, then treat no type as unsupported..
        sourceObjects = sourceObjects.filter( sourceObject => {
            var unsupportedTypes = appCtxSvc.ctx.preferences.AWC_NX_OpenUnsupportedTypes;
            var objectType = sourceObject.props.awb0UnderlyingObjectType || sourceObject.props.object_type;
            return !( objectType && unsupportedTypes && unsupportedTypes.includes( objectType.dbValues[0] ) );
        } );
        hostOpenService.openInHost( sourceObjects );
    } else {
        var sourceObjects2 = appCtxSvc.getCtx( 'mselected' );
        // Check if any types are unsupported.
        // If unsupported type preference is unset or object type couldn't be found, then treat no type as unsupported..
        sourceObjects2 = sourceObjects2.filter( sourceObject => {
            var unsupportedTypes = appCtxSvc.ctx.preferences.AWC_NX_OpenUnsupportedTypes;
            var objectType = sourceObject.props.awb0UnderlyingObjectType || sourceObject.props.object_type;
            return !( objectType && unsupportedTypes && unsupportedTypes.includes( objectType.dbValues[0] ) );
        } );
        hostOpenService.openInHost( sourceObjects2 );
    }
    return;
};

export let setCreateInfoForSession = function( data ) {
    data.objCreateInfo = {
        createType: 'Fnd0TempAppSession'
    };
};

export let mapSessionUidToNxOpenObjectToOpen = function( createdWorkingContext ) {
    nxOpenObjectToOpen[0] = createdWorkingContext;
};

/**
 * Get the vmo from the model object, and save it to data
 *
 * @param {IModelObject|IModelObjectArray} sourceObjects - IModelObject(s) to update selectedVersion with
 * @param {Object} data - Object by which we access selectedVersion so we can update it
 */
export let updateNxSelection = function( sourceObjects, data ) {
    if( sourceObjects[ 0 ] ) {
        var retVmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm.getObject( sourceObjects[ 0 ].uid ), 'Edit' );
        data.selectedVersion.dbValue = retVmo;
    }
};

/**
 * Wrapper for openWithInHost that provides a dataset version number.
 *
 * @param {IModelObject|IModelObjectArray} versionObject - IModelObject(s) to open.
 * @param {IModelObject|IModelObjectArray} datasetObject - IModelObject(s) to open.
 */
export let openVersionWithInHost = function( versionObject, datasetObject ) {
    var versionNumber = versionObject.props.revision_number.dbValue;
    var openContext = 'com.siemens.splm.client.nx.hosted.internal.operations.OpenVersionWithInHost.' + versionNumber;
    hostOpenService.openWithInHost( openContext, datasetObject );
};

/**
 * Associates the selected Measurable Attributes to NX.
 *
 */
export let associateToNx = function() {
    // Get the current TC platform version
    var majorVersion = tcSessionData.getTCMajorVersion();
    var minorVersion = tcSessionData.getTCMinorVersion();
    var qrmNumber = tcSessionData.getTCQRMNumber();

    // TC11.6 onwards, there have been some data model changes to Att0MeasurableAttribute and also
    // to the overall Analysis Request data flow. We will need to work off "Att1AttributeAlignmentProxy"
    // object instead of "Att0MeasurableAttribute" to get the relevant information needed for this action.
    var useNewAssociateEvent = true;

    // TC11.6 changes were integrated into TC12.1 and hence we will not use new behavior for TC12.0
    // Below condition checks if the TC version is less than TC11.6 or is TC12.0. In that case, we will
    // use the previous behavior.
    if( majorVersion < 11 || // If the major version is less than TC11
        majorVersion === 11 && minorVersion === 2 && qrmNumber < 7 || // If the major version is TC11, it is less than TC11.6
        majorVersion === 12 && minorVersion === 0 ) { // If the TC version is TC12.0
        useNewAssociateEvent = false;
    }

    var context = 'com.siemens.splm.client.nx.hosted.internal.operations.AssociateToNxOperation';
    var sourceObjects;
    // If on a TCversion later or equal to TC11.6, use Att1AttributeAlignmentProxy objects
    if( useNewAssociateEvent ) {
        sourceObjects = appCtxSvc.ctx.selectedAttrProxyObjects;
    } else {
        sourceObjects = appCtxSvc.ctx.mselected;
    }

    hostOpenService.openWithInHost( context, sourceObjects );
};

/**
 * Disassociates the consuming relation of a measurable attribute from selected Item Revisions.
 *
 */
export let disassociateConsumingItemRev = function() {
    var context = 'com.siemens.splm.client.nx.hosted.internal.operations.DisassociateItemRevFromNxOperation';
    var sourceObjects = [];

    // Selected Item Revisions.
    sourceObjects = appCtxSvc.ctx.mselected;

    // Measurable Attribute for which the disassociate action needs to be performed. This has to be the
    // first entry of sourceObjects vector.
    sourceObjects.unshift( appCtxSvc.ctx.pselected );

    hostOpenService.openWithInHost( context, sourceObjects );
};

/**
 * Get the VMOs for the dataset version Model Objects,
 * put them in an array and sort and filter it, and store the array in data.
 *
 * If the table provides sort criteria, then sort the rows accordingly.
 *
 * @param {Object} sortCriteria Sort criteria
 * @param {Object} data - the data
 */
export let storeRevisionsPropProp = function( sortCriteria, data ) {
    if( data.modelObjects ) {
        var versionModelObjects = _.values( data.modelObjects );
        var versionViewModelObjects = [];
        for( var i = 0; i < versionModelObjects.length; i++ ) {
            if( versionModelObjects[ i ] &&
                versionModelObjects[ i ].modelType &&
                versionModelObjects[ i ].modelType.parentTypeName === 'Dataset' &&
                versionModelObjects[ i ].props.revisions_prop.uiValues.indexOf( versionModelObjects[ i ].props.object_string.uiValues[ 0 ] ) !== -1 ) {
                var retVmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm.getObject( versionModelObjects[ i ].uid ), 'Create' );
                versionViewModelObjects.push( retVmo );
            }
        }

        if( versionViewModelObjects.length > 1 ) {
            //Sort the array by version number.
            versionViewModelObjects.sort( ( a, b ) => {
                // Check if either a or b's object_string isn't contained within revisions_prop.displayValues.
                // If it is not there, then it is the anchor, so order the anchor below the other version.
                if( a.props.revisions_prop.displayValues.indexOf( a.props.object_string.displayValues[ 0 ] ) === -1 ) {
                    return 1;
                } else if( b.props.revisions_prop.displayValues.indexOf( b.props.object_string.displayValues[ 0 ] ) === -1 ) {
                    return -1;
                }

                if( a.props.revision_number.dbValue > b.props.revision_number.dbValue ) {
                    //If a's version number is greater, place a below b
                    return 1;
                }
                //If a's version number is lesser, place b below a
                return -1;
            } );
        }

        if( sortCriteria && sortCriteria.length > 0 ) {
            var criteria = sortCriteria[ 0 ];
            var sortDirection = criteria.sortDirection;
            var sortColName = criteria.fieldName;

            if( sortDirection === 'ASC' ) {
                versionViewModelObjects.sort( function( a, b ) {
                    if( a.props[ sortColName ].value <= b.props[ sortColName ].value ) {
                        return -1;
                    }

                    return 1;
                } );
            } else if( sortDirection === 'DESC' ) {
                versionViewModelObjects.sort( function( a, b ) {
                    if( a.props[ sortColName ].value >= b.props[ sortColName ].value ) {
                        return -1;
                    }

                    return 1;
                } );
            }
        }

        data.datasetVersionVMOArray = versionViewModelObjects;
        data.dataProviders.datasetVersionTableProvider.viewModelCollection.loadedVMObjects = versionViewModelObjects;
    }
};

/**
 * Reset the state of the panel to its initial state of displaying the Sub Location Content selection
 *
 * @param {Object} data - the data
 */
export let resetOpenDatasetVersionPanelState = function( data ) {
    data.datasetVersionVMOArray = appCtxSvc.ctx.selected;
    data.selectedVersion.dbValue = appCtxSvc.ctx.selected;
};

/**
 * Load the column configuration for OpenDatasetVersionPanel table
 *
 * @param {Object} dataprovider - the data provider
 * @param {Object} data - the data
 * @returns {Promise} promise.
 */
export let loadColumns = function( dataprovider, data ) {
    var colInfos = [ {
            name: 'object_string',
            typeName: 'UGMASTER',
            displayName: data.i18n.datasetObjectString,
            maxWidth: 400,
            minWidth: 40,
            width: 120,
            enableColumnMenu: true,
            enableColumnMoving: false,
            enableColumnResizing: true,
            enableFiltering: false,
            enablePinning: false,
            enableSorting: true,
            headerTooltip: true
        },
        {
            name: 'revision_number',
            typeName: 'UGMASTER',
            displayName: data.i18n.versionNumber,
            maxWidth: 400,
            minWidth: 40,
            width: 120,
            enableColumnMenu: true,
            enableColumnMoving: false,
            enableColumnResizing: false,
            enableFiltering: false,
            enablePinning: false,
            enableSorting: true,
            headerTooltip: true
        }
    ];

    dataprovider.columnConfig = {
        columns: colInfos
    };

    var deferred = AwPromiseService.instance.defer();

    deferred.resolve( {
        columnInfos: colInfos
    } );

    return deferred.promise;
};

var updateAddAMObjectContext = function( panelContext, childRelation ) {
    var targetObjectVMO = appCtxSvc.getCtx( 'selected' );
    // In tree mode for folders, ViewModelTreeNode is the object in selection , however aw-add looks for a ViewModelObject , hence the check
    if ( !viewModelObjectSvc.isViewModelObject( targetObjectVMO ) ) {
        var modelObject = cdm.getObject( targetObjectVMO.uid );

        if( !modelObject ) {
            logger.error( 'viewModelObject.createViewModelObject: ' +
                'Unable to locate ModelObject in the clientDataModel with UID=' + targetObjectVMO.uid );
            return null;
        }

        targetObjectVMO = viewModelObjectSvc.constructViewModelObjectFromModelObject( targetObjectVMO, null, null, null, true );
    }
    var addObjectContext = {
        relationType:  childRelation ? childRelation : 'contents',
        refreshFlag: false,
        targetObject: targetObjectVMO,
        loadSubTypes: true,
        typeFilterNames: 'WorkspaceObject'
    };
    if( panelContext && panelContext.visibleTabs ) {
        addObjectContext.visibleTabs = panelContext.visibleTabs;
    }

    var baseTypeNameList = [];
    var shouldCheckIfDataset = true;

    if( !panelContext ) {
        panelContext = {};
    }

    //Designate which types are available to create.
    if( targetObjectVMO.type === 'Clr0ProductAppBreakdown' ) {
        baseTypeNameList = [ 'Clr0AppearanceAreaBreakdown' ];
    } else if( targetObjectVMO.type === 'Clr0AppearanceAreaBreakdown' ) {
        baseTypeNameList = [ 'Clr0AppearanceAreaBreakdown', 'Clr0AppearanceArea' ];
    } else if( targetObjectVMO.type === 'Clr0AppearanceArea' ) {
        baseTypeNameList = [ 'Clr0AppearanceDesignator' ];
    }
    //If there is a single type specified do auto-select when the type is loaded
    if( baseTypeNameList.length === 1 ) {
        addObjectContext.autoSelectOnUniqueType = true;
    }
    addObjectContext.includedTypes = baseTypeNameList.join( ',' );

    //Register the context
    appCtxSvc.registerCtx( 'addObject', addObjectContext );

    var isDataset =  baseTypeNameList.indexOf( 'Dataset' ) !== -1  ||  panelContext.objectSetSourceHasDataset === true;

    //If this is dataset
    if( isDataset ) {
        //Show dataset upload panel
        addObjectContext.showDataSetUploadPanel = true;
        appCtxSvc.updateCtx( 'addObject', addObjectContext );
    } else if( shouldCheckIfDataset ) {
        //Otherwise call SOA for some reason
        soaSvc.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
            datasetTypeNames: baseTypeNameList
        } ).then( function( response ) {
            addObjectContext.showDataSetUploadPanel = response.infos.length > 0;
            addObjectContext.moreLinkShown = response.infos.length > 0;
            appCtxSvc.updateCtx( 'addObject', addObjectContext );
        } );
    }
};

export let updateAMAddPanelTypeSelection = function( panelContext, childType, data, commandContext ) {
    var childRelation;
    if( childType.dbValue === 'Clr0AppearanceArea' ) {
        childRelation = 'clr0ChildAppAreas';
        data.creationRelation.dbValue = 'clr0ChildAppAreas';
    } else if( childType.dbValue === 'Clr0AppearanceAreaBreakdown' ) {
        childRelation = 'clr0ChildAppAreaBreakdown';
        data.creationRelation.dbValue = 'clr0ChildAppAreaBreakdown';
    } else if( childType.dbValue === 'Clr0AppearanceDesignator' ) {
        childRelation = 'clr0ChildAppDesignators';
        data.creationRelation.dbValue = 'clr0ChildAppDesignators';
    }

    updateAddAMObjectContext( panelContext, childRelation );
};

/**
 * Update the add object context
 *
 * @param {Object} panelContext - (Optional) The context for the panel. May contain command arguments.
 */
export let updateAddAMObject = function( panelContext ) {
    //If the panel is already opened do nothing
    //Eventually this could be modified to update the context and expect the panel to respond to the change
    //Just doing nothing (next action will close panel) to match existing behavior
    if( appCtxSvc.getCtx( 'activeToolsAndInfoCommand.commandId' ) === 'AMObjectAddPanel' ) {
        return;
    }
    updateAddAMObjectContext( panelContext );
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateInput = function( data ) {
    if( appCtxSvc.getCtx( 'selected.type' ) === 'Col1AppearanceBreakdownSchm' ) {
        var appArea = appCtxSvc.getCtx( 'selected' ).props.col1AppearanceArea;
        data.clr0AppearanceArea = _uwPropSrv.createViewModelProperty( 'clr0AppearanceArea', 'Appearance Area', 'OBJECT', appArea.dbValues[0], appArea.uiValues );
        data.clr0AppearanceArea.valueUpdated = true;
        if( !data.objCreateInfo.propNamesForCreate.includes( 'clr0AppearanceArea' ) ) {
            data.objCreateInfo.propNamesForCreate.push( 'clr0AppearanceArea' );
        }
    } else if( data.targetObject.type === 'Clr0ProductAppBreakdown' ) {
        data.clr0PABRoot = _uwPropSrv.createViewModelProperty( 'clr0PABRoot', 'Appearance Product Breakdown', 'OBJECT', data.targetObject.uid, data.targetObject.props.object_name.displayValues );
        data.clr0PABRoot.valueUpdated = true;
        if( !data.objCreateInfo.propNamesForCreate.includes( 'clr0PABRoot' ) ) {
            data.objCreateInfo.propNamesForCreate.push( 'clr0PABRoot' );
        }
    } else {
        data.clr0PABRoot = data.targetObject.props.clr0PABRoot;
        data.clr0PABRoot.valueUpdated = true;
        if( !data.objCreateInfo.propNamesForCreate.includes( 'clr0PABRoot' ) ) {
            data.objCreateInfo.propNamesForCreate.push( 'clr0PABRoot' );
        }
    }

    return addObjectUtils.getCreateInput( data );
};

export let getCreateInputForAAS = function( data ) {
    return addObjectUtils.getCreateInput( data );
};

/**
 * Wrapper for getCreatedObject from addObjectUtils.js
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getCreatedObject = function( response ) {
    return addObjectUtils.getCreatedObject( response );
};

/**
 * Wrapper for getDatasets from addObjectUtils.js
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getDatasets = function( response ) {
    return addObjectUtils.getDatasets( response );
};

export let cacheAMUserLicense = function( currentCache ) {
    if( currentCache ) {
        return;
    }
    var hasAMUserLicense = 'false';
    appCtxSvc.registerCtx( 'cachedAMUserLicense',  hasAMUserLicense );
    var licenseCheckPromise = soaSvc.post( 'Core-2008-03-Session', 'connect', { featureKey: 'appearance_mgmt_aw', action: 'get' } );

    licenseCheckPromise.then(
        ( response ) => {
            if ( parseInt( response.outputVal, 10 ) > 0 ) {
                appCtxSvc.registerCtx( 'cachedAMUserLicense', 'true' );
            }
        }
    )
        .catch(
            ( exception ) => {
                logger.error( 'Failed to get the Appearance Management User for Active Workspace license.' );
                logger.error( exception );

                appCtxSvc.registerCtx( 'cachedAMUserLicense', 'false' );
            }
        );
};

export default exports = {
    nxTcXmlCommandHandler,
    downloadPartFile,
    openInNX,
    setCreateInfoForSession,
    mapSessionUidToNxOpenObjectToOpen,
    updateNxSelection,
    openVersionWithInHost,
    associateToNx,
    disassociateConsumingItemRev,
    storeRevisionsPropProp,
    resetOpenDatasetVersionPanelState,
    loadColumns,
    updateAMAddPanelTypeSelection,
    updateAddAMObject,
    getCreateInput,
    getCreatedObject,
    getDatasets,
    cacheAMUserLicense
};

/**
 * Register this service.
 *
 * @member nxCommandHandlers
 * @memberof NgServices
 *
 *
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {soa_preferenceService} preferenceSvc - Service to use.
 * @param {soa_kernel_soaService} soaSvc - Service to use.
 * @param {soafileManagementService} fileManagementService - Service to use.
 * @param {TcServerVersion} tcServerVersion - Service to use.
 * @param {soa_kernel_clientMetaModel} cmm - Service to use.
 * @param {hostOpenService} hostOpenService - Service to use.
 * @param {TcSessionData} tcSessionData - Service to use.
 * @param {viewModelObjectService} viewModelObjectSvc - Service to use.
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 * @param {$q} $q variable used for resolving promise
 *
 *
 * @returns {nxCommandHandlers} Instance of this service's API object.
 */
app.factory( 'nxCommandHandlers', () => exports );
