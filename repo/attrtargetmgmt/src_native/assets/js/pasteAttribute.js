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
 * @module js/pasteAttribute
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import msgSvc from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import parammgmtUtlSvc from 'js/Att1ParameterMgmtUtilService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import selectionService from 'js/selection.service';


var exports = {};

var relationType = '';
var canCopy = true;

/**
 * This function will return the measurable attributes in clipboard
 */
export let getMeasurableAttributesInClipboard = function( clipboardContents ) {
    var measurableAttributes = [];
    for( var i = 0; i < clipboardContents.length; i++ ) {
        var obj = clipboardContents[i];
        if( typeof obj === 'string' ) {
            obj = cdm.getObject( obj );
        }

        if( obj && obj.modelType ) {
            if( obj.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
                measurableAttributes.push( obj );
            } else if( obj.modelType.typeHierarchyArray.indexOf( 'Att1AttributeAlignmentProxy' ) > -1 ) {
                var sourceObj = _getOwningObjectFromParamProxy( obj );
                if( sourceObj ) {
                    measurableAttributes.push( sourceObj );
                }
            }
        }
    }
    return measurableAttributes;
};

var _getOwningObjectFromParamProxy = function( proxy ) {
    if( proxy ) {
        proxy = cdm.getObject( proxy.uid );
    }
    if( proxy && proxy.props && proxy.props.att1SourceAttribute ) {
        var proxyObj = cdm.getObject( proxy.props.att1SourceAttribute.dbValues[ 0 ] );
        if( proxyObj && proxyObj.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
            return proxyObj;
        }
    }

    return null;
};

export let getValidParent = function() {
    var selected = _.get( appCtxSvc, 'ctx.parammgmtctx.selected', undefined );
    if( !selected || selected.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
        selected = _.get( appCtxSvc, 'ctx.selected', undefined );
    }
    return selected;
};

/**
 * This function will return true if the parent object selection is valid for pasting attributes
 */
export let canPasteAttributes = function( selection, allowedTypes ) {
    relationType = '';
    var isParentProjectOrGroup = selection.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 || selection.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1;
    if( isTCReleaseAtLeast122() ) {
        canCopy = false;
    }

    if( isParentProjectOrGroup ) {
        for( var i = 0; i < allowedTypes.length; i++ ) {
            if( selection.modelType.typeHierarchyArray.indexOf( allowedTypes[ i ] ) > -1 ) {
                relationType = 'Att0HasParamValue';
                return true;
            }
        }
    }

    if( selection.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 || isParentProjectOrGroup ) {
        for( var i = 0; i < allowedTypes.length; i++ ) {
            if( selection.modelType.typeHierarchyArray.indexOf( allowedTypes[ i ] ) > -1 ) {
                return true;
            }
        }
    } else if( selection.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        var alternateModelObjects = [];
        alternateModelObjects.push( selection );
        if( selection.props.awb0UnderlyingObject ) {
            alternateModelObjects.push( cdm.getObject( selection.props.awb0UnderlyingObject.dbValues[ 0 ] ) );
        }
        for( var j = 0; j < alternateModelObjects.length; j++ ) {
            for( var i = 0; i < allowedTypes.length; i++ ) {
                if( alternateModelObjects[ j ].modelType.typeHierarchyArray.indexOf( allowedTypes[ i ] ) > -1 ) {
                    return true;
                }
            }
        }
    }
    return false;
};

var isTCReleaseAtLeast122 = function() {
    var tcSessionData = appCtxSvc.getCtx( 'tcSessionData' );
    if( tcSessionData && (tcSessionData.tcMajorVersion > 12 || tcSessionData.tcMajorVersion === 12 && tcSessionData.tcMinorVersion >= 2 ) ) {
        return true;
    }
    return false;
};

/**
 * This function will return the Soa Input for attachMeasurableAttributes
 */
export let getAttachMeasurableAttributesSoaInput = function( parentObjForPaste, attributes ) {
    if( isTCReleaseAtLeast122() ) {
        if( parentObjForPaste.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 && parentObjForPaste.props.awb0UnderlyingObject ) {
            parentObjForPaste = cdm.getObject( parentObjForPaste.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
    }
    if( attributes && attributes.length === 0 ) {
        return;
    }

    var soaInput = [ {
        clientId: 'AW_Att1',
        parentObj: parentObjForPaste,
        attrList: attributes,
        relation: relationType,
        addAsCopy: canCopy
    } ];
    return soaInput;
};

/**
 * This function will fire event that will refresh the selected group in Project/Group PWA.
 */
export let refreshOrExpandGroupInPWA = function( parentGroup ) {
    if( parentGroup && parentGroup.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 ) {
        var relatedModifiedData = {
            relatedModified: parentGroup,
            refreshParamTable: true
        };
        eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData );
    } else if( parentGroup && parentGroup.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
        var sourceElement = [];
        var selectedObjects = appCtxSvc.getCtx( 'mselected' );

        for( var i = 0; i < selectedObjects.length; i++ ) {
            sourceElement.push( cdm.getObject( selectedObjects[ i ].props.att1SourceElement.dbValues[ 0 ] ) );
        }

        //if multiple selected objects having sourceElement as project then refresh PWA
        var isProjectIncludes = _.find( sourceElement, function( ele ) {
            return ele.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1;
        } );
        //if multiple selected object having sourceElement as group then refresh only groups
        if( isProjectIncludes === undefined ) {
            var relatedModifiedData1 = {
                isCutParamFromPWA: true
            };
            eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData1 );
        } else {
            var relatedModifiedData2 = {
                isResetPWA: true
            };
            eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData2 );
        }
    }
};
export let syncSelectionWhenCutGroup = function() {
    var selected = parammgmtUtlSvc.getSelectedInParamProjSublocation();
    var locationContextObject = _.get( appCtxSvc, 'ctx.locationContext.modelObject', undefined );
    if( selected.uid !== locationContextObject.uid ) {
        appCtxSvc.updatePartialCtx( 'parammgmtctx.selected', locationContextObject );
        appCtxSvc.updatePartialCtx( 'parammgmtctx.mselected', [ locationContextObject ] );
        selectionService.updateSelection( locationContextObject );
    }
};
/**
 * This function will fire event that will refresh the parent of selected group either group/Project PWA
 */
export let refreshParentWhenCutGroup = function( selectedGroup ) {
    if( selectedGroup.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 ) {
        var sourceElement = [];
        var selectedObjects = appCtxSvc.getCtx( 'mselected' );

        for( var i = 0; i < selectedObjects.length; i++ ) {
            sourceElement.push( cdm.getObject( selectedObjects[ i ].props.att1SourceElement.dbValues[ 0 ] ) );
        }

        //if multiple selected objects having sourceElement as project then refresh PWA
        var isProjectIncludes = _.find( sourceElement, function( ele ) {
            return ele.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1;
        } );
        //if multiple selected object having sourceElement as group then refresh only groups
        if( isProjectIncludes === undefined ) {
            var relatedModifiedData1 = {
                isCutParamFromPWA: true
            };
            eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData1 );
        } else {
            var relatedModifiedData2 = {
                isResetPWA: true
            };
            eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData2 );
        }
    } else if( selectedGroup.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) {
        var relatedModifiedData2 = {
            isResetPWA: true
        };
        eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData2 );
    }
};

/**
 * This function will fire event that will refresh the selected
 * object either group/Project PWA
 */
export let refreshParentWhenPasteGroup = function( selectedObject ) {
    if( selectedObject.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) {
        var relatedModifiedData1 = {
            isResetPWA: true
        };
        eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData1 );
    } else {
        eventBus.publish( 'paramProject.expandSelectedNode', '' );
    }
};

/*
 * This function will display error message when attributes can not be pasted
 */
export let displayIgnoredAttributeMsg = function( ignoredAttributes, totalAttributes, messages ) {
    var ignoredOverriddenParams = appCtxSvc.getCtx( 'ignoredOverriddenParams' );
    if( ignoredOverriddenParams && ignoredOverriddenParams.length > 0 ) {
        var ignoredOverriddenParamNames = '';
        for( var j = 0; j < ignoredOverriddenParams.length; j++ ) {
            if( ignoredOverriddenParamNames.length > 0 ) {
                ignoredOverriddenParamNames = ignoredOverriddenParamNames.concat( ', ' );
            }
            ignoredOverriddenParamNames = ignoredOverriddenParamNames.concat( TypeDisplayNameService.instance.getDisplayName( ignoredOverriddenParams[ j ] ) );
        }
        var msg = '';
        msg = msg.concat( messages.ignoredOverriddenParamsMsg.replace( '{0}', ignoredOverriddenParamNames ) );
        msgSvc.showError( msg );
    } else {
        var msg = messages.attributeNOfMMsg.replace( '{0}', totalAttributes.length - ignoredAttributes.length );
        msg = msg.replace( '{1}', totalAttributes.length );
        msgSvc.showError( msg );
        for( var i = 0; i < ignoredAttributes.length; i++ ) {
            msgSvc.showError( messages.attributeNotAdded.replace( '{0}', ignoredAttributes[ i ].props.object_name.dbValues[ 0 ] ) );
        }
    }
};

export let showInvalidParentObjectErrorMsg = function( parentObjForPaste, messages ) {
    if( parentObjForPaste && parentObjForPaste.modelType.typeHierarchyArray.indexOf( 'Att1AttributeAlignmentProxy' ) > -1 ) {
        parentObjForPaste = _getOwningObjectFromParamProxy( parentObjForPaste );
    }
    if( parentObjForPaste && parentObjForPaste.props && parentObjForPaste.props.object_type ){
        msgSvc.showError( messages.invalidParentObject.replace( '{0}', parentObjForPaste.props.object_type.uiValues[ 0 ] ) );
    }
};

/**
 * prepare the input for setProperties SOA in case of cut group
 */
export let setPropertiesInputForCutGroup = function() {
    var selectedOjects = appCtxSvc.getCtx( 'parammgmtctx.mselected' );
    var info = [];
    _.forEach( selectedOjects, function( selectedObject ) {
        var inputInfo = {
            object: selectedObject
        };
        inputInfo.vecNameVal = [];
        inputInfo.vecNameVal.push( {
            name: 'att0Parent',
            values: [ '' ]
        } );
        info.push( inputInfo );
    } );
    return info;
};

/**
 * prepare the input for setProperties SOA in case of paste group
 */
export let setPropertiesInputForPasteGroup = function() {
    var selected = parammgmtUtlSvc.getSelectedInParamProjSublocation();
    var copiedObjects = appCtxSvc.getCtx( 'awClipBoardProvider' );
    var info = [];

    _.forEach( copiedObjects, function( result ) {
        var inputInfo = {
            object: result
        };
        inputInfo.vecNameVal = [];
        inputInfo.vecNameVal.push( {
            name: 'att0Parent',
            values: [ selected.uid ]
        } );
        info.push( inputInfo );
    } );
    return info;
};

/**
 * To display message after cut group perform
 * @param {object} data
 */
export let displayCutGroupsMessage = function( data ) {
    var selectedGroups = appCtxSvc.ctx.mselected;
    var selectedGrpNames = '';
    var parentNames = '';
    var msg = '';
    for( var j = 0; j < selectedGroups.length; j++ ) {
        if( selectedGrpNames.length > 0 && parentNames.length > 0 ) {
            selectedGrpNames = selectedGrpNames.concat( ', ' );
            parentNames = parentNames.concat( ', ' );
        }
        selectedGrpNames = selectedGrpNames.concat( TypeDisplayNameService.instance.getDisplayName( selectedGroups[ j ] ) );
        if( !parentNames.includes( selectedGroups[ j ].props.att1SourceElement.uiValues[ 0 ] ) ) {
            parentNames = parentNames.concat( selectedGroups[ j ].props.att1SourceElement.uiValues[ 0 ] );
        }
    }
    msg = msg.concat( data.i18n.multipleParamCutMsg.replace( '{0}', selectedGrpNames ) );
    msg = msg.replace( '{1}', parentNames );
    msgSvc.showInfo( msg );
};

/**
 * Returns the pasteAttribute instance
 *
 * @member pasteAttribute
 */

export default exports = {
    getMeasurableAttributesInClipboard,
    getValidParent,
    canPasteAttributes,
    getAttachMeasurableAttributesSoaInput,
    refreshOrExpandGroupInPWA,
    refreshParentWhenCutGroup,
    refreshParentWhenPasteGroup,
    displayIgnoredAttributeMsg,
    showInvalidParentObjectErrorMsg,
    setPropertiesInputForCutGroup,
    setPropertiesInputForPasteGroup,
    syncSelectionWhenCutGroup,
    displayCutGroupsMessage
};
app.factory( 'pasteAttribute', () => exports );
