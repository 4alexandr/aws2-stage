// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Module for the Requirement wide panel page that
 * generate RmBodyClearText Property and attaching image and event listener to it
 *
 * @module propRenderTemplates/generateRmBodyClearTextProperty
 * @requires app
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import reqUtils from 'js/requirementsUtils';

var exports = {};

/**
 * generate RmBodyClearText Property and attaching image and event listener to it
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem - The container DOM Element inside which BodyClearText and imgage will rendered
 */
export let generateRmBodyClearTextRendererFn = function( vmo, containerElem ) {
    var bodyTextObj = null;
    var bodyClearText = '';
    if ( vmo.props && vmo.props.arm0ClearText ) {
        bodyTextObj = vmo.props.arm0ClearText;
    }
    if ( bodyTextObj && bodyTextObj.dbValues && bodyTextObj.dbValues.length > 0 ) {
        bodyClearText = bodyTextObj.dbValues[0];
    }
    if ( vmo && vmo.type && vmo.type !== 'Arm0RequirementSpecElement' ) {
        _renderEditBodyClearTextIcon( vmo, containerElem, bodyClearText );
    }
};

/**
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem -  The container DOM Element inside which BodyClearText and imgage will rendered
 * @param {String} bodyClearText - BodyClearText
 */
var _renderEditBodyClearTextIcon = function( vmo, containerElem, bodyClearText ) {
    var textDiv = document.createElement( 'div' );
    textDiv.className = 'aw-splm-tableCellText';
    textDiv.innerText = bodyClearText;
    textDiv.title = bodyClearText;
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirement-editIcon';
    cellImg.title = 'Edit';
    var imgSrc = null;
    imgSrc = app.getBaseUrlPath() + '/image/homeEdit64.svg';
    var objectUid = vmo.uid;

    // Add click event to open the Single Requirement Wide Panel Editor
    cellImg.addEventListener( 'click', function() {
        var modelObject = cdm.getObject( objectUid );
        var cellProp = [ 'arm1ParaNumber', 'awb0ArchetypeName', 'awb0ArchetypeId', 'awb0UnderlyingObject', 'awb0UnderlyingObjectType' ];
        var arrModelObjs = [ modelObject ];
        reqUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
            var selectedRefObj = {
                paraNum: modelObject.props.arm1ParaNumber.dbValues[0],  //ParaNumber
                name: modelObject.props.awb0ArchetypeName.dbValues[0], //object_name
                id: modelObject.props.awb0ArchetypeId.dbValues[0], //item_id
                type: modelObject.type, //object_type
                uid: modelObject.uid, // uid of Arm0RequirementElement
                revID: modelObject.props.awb0UnderlyingObject.dbValues[0], //underlying Object uid
                revType: modelObject.props.awb0UnderlyingObjectType.dbValues[0], //underlying Object Type
                modelRevObject: { uid: modelObject.props.awb0UnderlyingObject.dbValues[0], type: modelObject.props.awb0UnderlyingObjectType.dbValues[0] } //underlying Object
            };
            appCtxService.registerCtx( 'summaryTableSelectedObjUid', selectedRefObj );
            eventBus.publish( 'Arm0SingleRequirementWidePanelEditor.showWidePanelEditorPopupPanel' );
        } );
    }, objectUid );

    cellImg.src = imgSrc;
    containerElem.appendChild( textDiv );
    containerElem.appendChild( cellImg );
};

export default exports = {
    generateRmBodyClearTextRendererFn
};
app.factory( 'generateRmBodyClearTextProperty', () => exports );
