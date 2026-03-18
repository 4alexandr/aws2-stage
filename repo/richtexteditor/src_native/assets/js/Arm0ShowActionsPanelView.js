// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/*jshint -W061 */

/**
 * @module js/Arm0ShowActionsPanelView
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import cdm from 'soa/kernel/clientDataModel';
import requirementsUtils from 'js/requirementsUtils';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import notyService from 'js/NotyModule';
import { DOMAPIs as dom } from 'js/domUtils';
import ckeditorOperations from 'js/ckeditorOperations';

var exports = {};

var _isFrozen;
var _isDerived;
var _isMasterChanged;
var _isOverwrite;

/**
 * copy object to clipboard
 */
export let copyObjectToClipboard = function( data ) {
    var newModelObject = exports.getSelectedObject();
    var objects = [ newModelObject ];
    ClipboardService.instance.setContents( objects );
    data.copiedObjectName = _getObjectName( newModelObject );
    return objects;
};

/**
 * object_string property might not be loaded, so fetching name from awb0UnderlyingObject property
 * @param {Object} modelObject - object
 * @returns {String} object name
 */
var _getObjectName = function( modelObject ) {
    if( modelObject.props && modelObject.props.object_string && modelObject.props.object_string.uiValues[ 0 ] ) {
        return modelObject.props.object_string.uiValues[ 0 ];
    } else if( modelObject.props && modelObject.props.awb0UnderlyingObject && modelObject.props.awb0UnderlyingObject.uiValues[ 0 ] ) {
        var underlyingObject = modelObject.props.awb0UnderlyingObject.uiValues[ 0 ];
        var partialString = underlyingObject.substr( underlyingObject.indexOf( ';' ) + 1, underlyingObject.length );
        return partialString.substr( partialString.indexOf( '-' ) + 1, partialString.length );
    }
    return '';
};

/**
 * create input for move operations
 *
 * @param {Object} data - the data object of view model
 * @param {Object} selectedRow - the selected command
 */
export let createInputForMoveOperation = function( data, selectedRow ) {
    if( selectedRow.sourceObject.displayName === data.i18n.moveUpCommandTitle ) {
        data.operationType = 1;
    } else if( selectedRow.sourceObject.displayName === data.i18n.moveDownCommandTitle ) {
        data.operationType = 2;
    } else if( selectedRow.sourceObject.displayName === data.i18n.promoteCommandTitle ) {
        data.operationType = 3;
    } else if( selectedRow.sourceObject.displayName === data.i18n.demoteCommandTitle ) {
        data.operationType = 4;
    }
    var newModelObject = exports.getSelectedObject();
    data.newSelectedObject = newModelObject;
};

/**
 * Show leave warning message
 *
 * @param {Object} data - The view model data
 */
var _showUpdateRuleNotificationWarning = function( data ) {
    var msg = data.i18n.removeSingleReqConfirmation.replace( '{0}', _getObjectName( appCtxService.ctx.rmselected[0] ) );
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.removeTitle,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'requirementDocumentation.cutObjectCommand' );
        }
    } ];

    notyService.showWarning( msg, buttons );
};

/**
 * Handle command action on typeicon
 * 
 * @param {Object} data - The view model data
 * @param {Object} selectedObject - selected row
 */
export let handleCommandSelection = function( data, selectedObject ) {
    var row = selectedObject.selectedRow;
    var eventData = {
        sourceObject: row
    };
    if( row.internalName === 'Copy' ) {
        eventBus.publish( 'requirementDocumentation.copyObjectCommand' );
    }
    if( row.internalName === 'Remove' ) {
        _showUpdateRuleNotificationWarning( data );
    }
    if( row.internalName === 'Paste As Child' || row.internalName === 'Paste As Sibling' ) {
        eventBus.publish( 'requirementDocumentation.pasteObjectCommand', eventData );
    }
    if( row.internalName === 'Promote' || row.internalName === 'Demote' || row.internalName === 'Move Up' || row.internalName === 'Move Down' ) {
        eventBus.publish( 'requirementDocumentation.moveCommand', eventData );
    }
    if( row.internalName === 'Freeze' ) {
        appCtxService.registerCtx( 'selectedRequirementCommand', 'freeze' );
        eventBus.publish( 'requirementDocumentation.FreezeCommand', eventData );
    }
    if( row.internalName === 'FreezeUnFreeze' ) {
        appCtxService.registerCtx( 'selectedRequirementCommand', 'unfreeze' );
        eventBus.publish( 'requirementDocumentation.FreezeCommand', eventData );
    }
    if( row.internalName === 'Overwrite' ) {
        eventBus.publish( 'requirementDocumentation.overwriteCommand', eventData );
    }
    if( row.internalName === 'Cross Reference' ) {
        eventBus.publish( 'Arm0ShowActionsPanel.CopyCrossReferenceLink' );
    }
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    ckeditorOperations.makeRequirementEditable( ctx );
};

export let pasteObjectDataToLocalStorageForCRL = function() {
    var modelObject = exports.getSelectedObject();
    var cellProp = [ 'arm1ParaNumber', 'awb0ArchetypeName', 'awb0ArchetypeId', 'awb0UnderlyingObject' ];
    var arrModelObjs = [ modelObject ];
    requirementsUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
        var crossRefLinkData = {
            paraNum: modelObject.props.arm1ParaNumber.dbValues[ 0 ],
            name: modelObject.props.awb0ArchetypeName.dbValues[ 0 ],
            id: modelObject.props.awb0ArchetypeId.dbValues[ 0 ],
            occID: appCtxService.getCtx( 'selectedRequirementObjectUID' ),
            revID: modelObject.props.awb0UnderlyingObject.dbValues[ 0 ],
            type: modelObject.type
        };
        ClipboardService.instance.setContents( modelObject );
        localStorage.setItem( 'rmCrossRefLinkClipboard', JSON.stringify( crossRefLinkData ) );
        exports.closeExistingBalloonPopup();
        eventBus.publish( 'showActionPopup.close' );
    } );
};

/**
 * Returns the selected object
 *
 * @return {Object} selected object
 */
export let getSelectedObject = function() {
    var uid = appCtxService.getCtx( 'selectedRequirementObjectUID' );
    return cdm.getObject( uid );
};

/**
 * Method to update the options. If nothing is copied thrn only show Cut and Copy else
 * show paste options as well
 * @param {Object} data - the data object of view model
 */
export let updateOptions = function( data ) {
    var baseUrl = app.getBaseUrlPath();
    data.actionItems.dbValue[0].iconURL = baseUrl + '/image/cmdRemove24.svg';
    data.actionItems.dbValue[1].iconURL = baseUrl + '/image/cmdCopy24.svg';
    data.actionItems.dbValue[2].iconURL = baseUrl + '/image/cmdMoveUp24.svg';
    data.actionItems.dbValue[3].iconURL = baseUrl + '/image/cmdMoveDown24.svg';
    data.actionItems.dbValue[4].iconURL = baseUrl + '/image/cmdPromote24.svg';
    data.actionItems.dbValue[5].iconURL = baseUrl + '/image/cmdDemote24.svg';
    data.actionItems.dbValue[6].iconURL = baseUrl + '/image/cmdFreeze24.svg';
    data.actionItems.dbValue[7].iconURL = baseUrl + '/image/cmdFreeze24.svg';
    data.actionItems.dbValue[8].iconURL = baseUrl + '/image/cmdOverwrite24.svg';
    data.actionItems.dbValue[9].iconURL = baseUrl + '/image/cmdReference24.svg';
    data.pasteOptions.options[0].iconURL = baseUrl + '/image/cmdPaste24.svg';
    data.pasteOptions.options[1].iconURL = baseUrl + '/image/cmdPaste24.svg';
    appCtxService.ctx.Arm0ShowActionPanelVisible = true;
    var selObject = appCtxService.getCtx( 'rmselected' )[ 0 ];
    var clipboradObjects = ClipboardService.instance.getContents();
    if( clipboradObjects.length > 0 ) {
        if( selObject.uid === appCtxService.ctx.occmgmtContext.topElement.uid ) {
            data.actionItems.dbValue = data.actionItems.dbValue.concat( data.pasteOptions.options[ 0 ] );
        } else {
            data.actionItems.dbValue = data.actionItems.dbValue.concat( data.pasteOptions.options );
        }
    } else {
        data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
            return value.displayName !== data.i18n.pasteAsChildCommand && value.displayName !== data.i18n.pasteAsSiblingCommand;
        } );
    }
    if( !_isDerived ) {
        data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
            return value.displayName !== data.i18n.freeze && value.displayName !== data.i18n.freezeUnFreeze && value.displayName !== data.i18n.overWrite;
        } );
    } else {
        if(  ( _isFrozen || _isMasterChanged ) && selObject.type !== 'Arm0RequirementSpecElement' ) {
            data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
                return value.displayName !== data.i18n.freeze;
            } );
        } else if( _isOverwrite && selObject.type !== 'Arm0RequirementSpecElement' ) {
            data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
                return value.displayName !== data.i18n.freeze && value.displayName !== data.i18n.freezeUnFreeze
                && value.displayName !== data.i18n.overWrite;
            } );
        } else if( selObject.type === 'Arm0RequirementSpecElement' ) {
            data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
                return value.displayName !== data.i18n.freezeUnFreeze && value.displayName !== data.i18n.freeze;
            } );
        } else {
            data.actionItems.dbValue = data.actionItems.dbValue.filter( function( value ) {
                return value.displayName !== data.i18n.freezeUnFreeze;
            } );
        }
    }
    var requiredHeight = data.actionItems.dbValue.length * 32;
    var panelId = 'Arm0ShowActionsPanelBalloonPopup';
    var actionsBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
    if( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupLayoutEle = actionsBalloonPopup.find( '.aw-layout-popup' );
        popupLayoutEle[ 0 ].style.height = requiredHeight + 'px';
        var panelScrollBody = $( actionsBalloonPopup.find( 'div.aw-base-scrollPanel.ng-scope' )[ 0 ] );
        panelScrollBody.attr( 'style', 'min-height:' + requiredHeight + 'px' );
        panelScrollBody.attr( 'style', 'height:' + requiredHeight  + 'px' );
        var popupElemScope = ngModule.element( actionsBalloonPopup ).scope();
        popupElemScope.setMaxHeight();
    }
};

/**
 * Method to do the paste opertion depending on selected option
 * @param {Object} data - the data object of view model
 * @param {Object} selectedRow - the clicked  action element
 */
export let pasteObject = function( data, selectedRow ) {
    var contextObject = appCtxService.getCtx( 'rmselected' )[ 0 ];
    if( selectedRow.sourceObject.displayName === data.i18n.pasteAsChildCommand ) {
        data.mselected = contextObject;
    } else {
        data.mselected = cdm.getObject( contextObject.props.awb0Parent.dbValues[ 0 ] );
    }
    var clipboradObjects = ClipboardService.instance.getContents();
    data.objectFromClipboard = clipboradObjects[ 0 ];
    eventBus.publish( 'requirementDocumentation.pasteObject' );
};

/**
 * Reset the documentation tab after paste is clicked
 */
export let fireResetDocViewEvent = function() {
    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
    eventBus.publish( 'requirementDocumentation.resetDocumentationTab' );
};

/**
 * Close instance of aw-balloon-popup created to show type actions
 */
export let closeExistingBalloonPopup = function() {
    appCtxService.ctx.Arm0ShowActionPanelVisible = false;
    var panelId = 'Arm0ShowActionsPanelBalloonPopup';
    var actionsBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
    if( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupElemScope = ngModule.element( actionsBalloonPopup ).scope();

        var eventData = {
            popupId: actionsBalloonPopup[ 0 ].id
        };
        eventBus.publish( 'balloonPopup.Close', eventData );
        popupElemScope.$broadcast( 'awPopupWidget.close', eventData );
        actionsBalloonPopup.detach();
    }
};

/**
 * Register context for show type actions
 * 
 *  @param {Object} data - The view model data
 */
export let registerCxtForActionsPanel = function( data ) {
    exports.closeExistingBalloonPopup();
    var popupHeight = 240;
    _isFrozen = data.eventData.sourceObject.isFrozen;
    _isDerived = data.eventData.sourceObject.isDerived;
    _isMasterChanged = data.eventData.sourceObject.isMasterChanged;
    _isOverwrite = data.eventData.sourceObject.isOverwrite;
    var placeholder = data.eventData.sourceObject.uid;
    appCtxService.registerCtx( 'selectedRequirementObjectUID', placeholder );
    var modelObject = cdm.getObject( placeholder );
    var selectedObjects = [ modelObject ];
    appCtxService.registerCtx( 'rmselected', selectedObjects );
    var clipboradObjects = ClipboardService.instance.getContents();
    if( clipboradObjects.length > 0 ) {
        popupHeight += 70;
    }
    if( _isDerived ) {
        popupHeight += 70;
    }
    data.eventData.popupHeight = popupHeight + 'px';
    eventBus.publish( 'requirementDocumentation.showActionsPanel', data.eventData );
};

export default exports = {
    copyObjectToClipboard,
    createInputForMoveOperation,
    handleCommandSelection,
    pasteObjectDataToLocalStorageForCRL,
    getSelectedObject,
    updateOptions,
    pasteObject,
    fireResetDocViewEvent,
    closeExistingBalloonPopup,
    registerCxtForActionsPanel,
    makeRequirementEditable
};
/**
 * @memberof NgServices
 */
app.factory( 'Arm0ShowActionsPanelView', () => exports );
