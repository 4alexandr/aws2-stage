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
 * @module js/pasteInterfaceDefinition
 */
import * as app from 'app';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';

import eventBus from 'js/eventBus';

var exports = {};

/**
 * This function will return the interface definitions in clipboard
 * @param {object} clipboardContents contents of the clipboard
 */
export let getInterfaceDefinitionsInClipboard = function( clipboardContents ) {
    if( clipboardContents && clipboardContents.length > 0 ) {
        var interfaceDefinitions = _.filter( clipboardContents, function( clipBoardContent ) {
            return clipBoardContent.modelType.typeHierarchyArray.indexOf( 'Seg0IntfSpecRevision' ) > -1;
        } );
    }
    if( interfaceDefinitions && interfaceDefinitions.length > 0 ) {
        var eventData = {
            interfaceDefinitions: interfaceDefinitions
        };
        eventBus.publish( 'canPasteInterfaceDefinitions', eventData );
    }
};

/**
 * This function will return true if the parent object selection is valid for pasting attributes
 * @param {object} selection current selection
 * @return {object} boolean
 */
export let canPasteInterfaceDefinitions = function( selection ) {
    var isValidSelection = false;
    if( selection && selection.length > 0 ) {
        _.forEach( selection, function( selected ) {
            if( selected.modelType.typeHierarchyArray.indexOf( 'Awb0Interface' ) > -1 ) {
                isValidSelection = true;
            } else {
                isValidSelection = false;
                return false;
            }
        } );
        if( isValidSelection ) {
            return true;
        }
    }
    return false;
};

/**
 * This function will return the Soa Input for createRelations
 * @param {object} selectedObjsForPaste the selected ports in diagram
 * @param {object} interfaceDefinitions the copied interface definitions
 * @return {object} soaInput input for the soa call
 */
export let getCreateInput = function( selectedObjsForPaste, interfaceDefinitions ) {
    var primaryObject = null;
    var secondaryObject = {};
    var primObj = {};
    var inputData = {};
    var soaInput = [];
    if( selectedObjsForPaste && selectedObjsForPaste.length > 0 ) {
        _.forEach( selectedObjsForPaste, function( selectedObj ) {
            if( selectedObj.props.awb0UnderlyingObject && selectedObj.props.awb0UnderlyingObject.dbValues &&
                selectedObj.props.awb0UnderlyingObject.dbValues.length > 0 ) {
                primaryObject = viewModelObjectService.createViewModelObject( selectedObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
                if( primaryObject ) {
                    primObj = { uid: primaryObject.uid, type: primaryObject.type };
                    if( interfaceDefinitions && interfaceDefinitions.length > 0 ) {
                        _.forEach( interfaceDefinitions, function( intfDef ) {
                            secondaryObject = { uid: intfDef.uid, type: intfDef.type };
                            inputData = {
                                clientId: '',
                                primaryObject: primObj,
                                relationType: 'Seg0Implements',
                                secondaryObject: secondaryObject,
                                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
                            };
                            soaInput.push( inputData );
                        } );
                    }
                }
            }
        } );
    }
    return soaInput;
};

/**
/* @member pasteInterfaceDefinition
 *
 * @param {Object} viewModelObjectService viewModelObjectService
 * @return {Object} exports
 */

export default exports = {
    getInterfaceDefinitionsInClipboard,
    canPasteInterfaceDefinitions,
    getCreateInput
};
app.factory( 'pasteInterfaceDefinition', () => exports );
