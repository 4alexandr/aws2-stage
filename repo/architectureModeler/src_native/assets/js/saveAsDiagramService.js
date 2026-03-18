// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Service responsible for creating, updating and copying Saved Working Context
 *
 * @module js/saveAsDiagramService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import addObjectUtils from 'js/addObjectUtils';
import viewModelObjectService from 'js/viewModelObjectService';
import showObjectCommandHandler from 'js/showObjectCommandHandler';
import localeService from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};
var _data = null;

export let navigateAndCreateInput = function( data ) {
    if( !data.eventData ) {
        data.creationType = null;
        return;
    }

    if( data.eventData && data.eventData.selectedObjects ) {

        if( data.eventData.selectedObjects.length === 0 ) {
            if( data.dataProviders.awTypeSelector &&
                data.dataProviders.awTypeSelector.selectedObjects.length === 1 ) {

                data.creationType = data.dataProviders.awTypeSelector.selectedObjects[ 0 ];
            }

        } else {
            data.creationType = data.eventData.selectedObjects[ 0 ];
        }
    } else {
        data.creationType = null;
    }

    // clear the event data. This is needed to ensure updateDeclModel does not go in recursion
    data.eventData = null;
    eventBus.publish( "StartSaveAutoBookmarkEvent" );
};

export let saveDiagramCreateInput = function( data ) {
    var occMgmnt = appCtxService.getCtx( "occmgmtContext" );
    var createInput = addObjectUtils.getCreateInput( data );
    var diagSelectedUid = _.get( appCtxService, 'ctx.diagramSelected', null );
    var object = null;
    var openedDiagram = null;
    if( viewModelObjectService && diagSelectedUid ) {
        object = viewModelObjectService.createViewModelObject( diagSelectedUid, "EDIT" );
        if( object ) {
            openedDiagram = object;
        }
    }

    var architectureCtx = appCtxService.getCtx( "architectureCtx" );
    if( architectureCtx && architectureCtx.isModelerActive ) {
        // In case of Architecture tab send autobookmark for save as action
        createInput[ 0 ].createData.propertyNameValues.awb0SourceAutoBookmark = [ occMgmnt.productContextInfo.props.awb0AutoBookmark.dbValues[ 0 ] ];
    } else if (openedDiagram) {
        createInput[ 0 ].createData.propertyNameValues.awb0SourceAutoBookmark = [ openedDiagram.uid ];
    }

    var diagramObject = [ openedDiagram ];
    diagramObject.push();

    var input = [];
    var inputData = {
        clientId: 'SaveAsDiagram',
        userAction: 'SaveAsDiagram',
        primaryObjects: diagramObject,
        secondaryObjects: [],
        createInput: createInput[ 0 ].createData,
        inputCtxt: {
            productContext: occMgmnt.productContextInfo
        }
    };

    input.push( inputData );
    return input;
};

/**
 * Get created object. Return ItemRev if the creation type is Item.
 *
 * @param {Object} response the response of createRelateAndSubmitObjects SOA call
 * @return  {Object} object
 */
export let getCreatedObject = function( response ) {
    var object = null;
    if( response && response.ServiceData.created[ 0 ] ) {
        var objectUid = response.ServiceData.created[ 0 ];
        if( viewModelObjectService ) {
            object = viewModelObjectService.createViewModelObject( objectUid, "EDIT" );
        }
    } else {
        logger.error( 'SaveAsDiag:ERROR - during save as diagram.' );
    }
    return object;
};

var clearSelectedType = function() {
    if( _data ) {
        _data.creationType = null;
    }
};

/**
 * Auto populate XRT panel fields: 'object_name' for SAVE AS operation.
 *
 * @param {Object} data - Save As Diagram panel's data object
 */
export let populateSaveAsDiagramPanel = function( data ) {
    var diagSelectedUid = _.get( appCtxService, 'ctx.diagramSelected', null );
    var displayName = null;
    var object = null;
    if( viewModelObjectService && diagSelectedUid ) {
        object = viewModelObjectService.createViewModelObject( diagSelectedUid, "EDIT" );
    }

    if( object ) {
        if( object.props && object.props.object_name && object.props.object_name.uiValues &&
            object.props.object_name.uiValues.length > 0 ) {
            displayName = object.props.object_name.uiValues[ 0 ];
            //Auto-assigned Name = openedObjectName + "-COPY";
            displayName = getLocalizedMessage( "ArchitectureModelerMessages",
                "saveAsDiagramName", displayName );
            if( data && data.object_name ) {
                data.object_name.dbValue = displayName;
                data.object_name.valueUpdated = true;
            }
        }
    }
};

export let initNavigateFunction = function( data ) {
    _data = data;

    data.clearSelectedType = clearSelectedType;
    eventBus.publish( "StartSaveAutoBookmarkEvent" );
};

/**
 * Update Ctx for pending changes in diagram.
 *
 */
export let updateCtxForPendingChangesInDiagram = function() {
    var hasPendingChangesInDiagram = _.get( appCtxService, 'ctx.architectureCtx.diagram.hasPendingChangesInDiagram', false );

    if( hasPendingChangesInDiagram ) {
        _.set( appCtxService, 'ctx.architectureCtx.diagram.leaveConfFromSaveAsDiagram', true );
        _.set( appCtxService, 'ctx.architectureCtx.diagram.hasPendingChangesInDiagram', false );
    }
};

/**
 * Initiates the SaveAsDiagram post process.
 *@param{Object} data viewmodel object
 *@param{Object} eventMap data from event
 *
 */
export let saveAsDiagramPostProcess = function( data, eventMap ) {
    var eventData = {
        diagramObject: data.createdObject
    };
    eventBus.publish( "saveAsDiagram.postProcessSuccess", eventData );
};

/**
 * Get the message for given key from given resource file, replace the parameter and return the localized string
 *
 * @param {Object} resourceFile - File that defines the message
 * @param {String} resourceKey - The message key which should be looked-up
 * @param {String} messageParam - The message parameter
 * @returns {String} localizedValue - The localized message string
 */
function getLocalizedMessage( resourceFile, resourceKey, messageParam ) {
    var localizedValue = null;
    var resource = app.getBaseUrlPath() + '/i18n/' + resourceFile;
    var localTextBundle = localeService.getLoadedText( resource );
    if( localTextBundle ) {
        localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
    } else {
        var asyncFun = function( localTextBundle ) {
            localizedValue = localTextBundle[ resourceKey ].replace( '{0}', messageParam );
        };
        localeService.getTextPromise( resource ).then( asyncFun );
    }
    return localizedValue;
}

export default exports = {
    navigateAndCreateInput,
    saveDiagramCreateInput,
    getCreatedObject,
    populateSaveAsDiagramPanel,
    initNavigateFunction,
    updateCtxForPendingChangesInDiagram,
    saveAsDiagramPostProcess
};
app.factory( 'saveAsDiagramService', () => exports );
