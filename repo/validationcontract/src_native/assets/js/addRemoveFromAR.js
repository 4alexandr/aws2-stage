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
 * @module js/addRemoveFromAR
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import mesgSvc from 'js/messagingService';

var exports = {};

var getTopProductLine = function( validObject ) {
    var isAwb0Element;
    var topProductLine;
    if( validObject !== null ) {
        for( var i = 0; i < validObject.length; i++ ) {
            for( var j = 0; j < validObject[ i ].modelType.typeHierarchyArray.length; j++ ) {
                if( validObject[ i ].modelType.typeHierarchyArray[ j ] === 'Awb0Element' ) {
                    isAwb0Element = true;
                    break;
                }
            }
            if( isAwb0Element ) {
                topProductLine = validObject[ i ];
                while( topProductLine.props && topProductLine.props.awb0Parent && topProductLine.props.awb0Parent.dbValues[ 0 ] !== null ) {
                    topProductLine = cdm.getObject( topProductLine.props.awb0Parent.dbValues[ 0 ] );
                }
            }
        }
    }
    return topProductLine;
};

/**
 *
 * @param {String} manageAction action to be called for
 * @returns {manageARInput} input to be caaleed for SOa
 *
 */
export let getManageARInput = function( manageAction ) {
    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var selectedElements = appCtxSvc.getCtx( 'mselected' );

    var elementsToAdd = [];
    var elementsToRemove = [];
    if( selectedElements && selectedElements.length > 0 ) {
        _.forEach( selectedElements, function( elemnt ) {
            if( elemnt.props && elemnt.props && elemnt.props.crt1AddedToAnalysisRequest ) {
                if( elemnt.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '0' ) {
                    elementsToAdd.push( elemnt );
                }else if( elemnt.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
                    elementsToRemove.push( elemnt );
                }
            }else{
                elementsToAdd.push( elemnt );
                elementsToRemove.push( elemnt );
            }
        } );
    }

    var elementInputs = [];
    var manageARElements = [];
    if( manageAction === 'addObject' ) {
        manageARElements = elementsToAdd;
    } else if( manageAction === 'removeObject' ) {
        manageARElements = elementsToRemove;
    }
    for( var i = 0; i < manageARElements.length; i++ ) {
        var elementInput = {};
        elementInput.elementAction = '';
        elementInput.objectToAdd = {
            type:manageARElements[ i ].type,
            uid:manageARElements[ i ].uid
        };
        elementInput.objectToAddContext = '';
        elementInput.objectToAddParent = '';
        elementInput.addParameterAsInOut = '';
        elementInput.addUnderlyingObject = false;
        elementInput.parameterInfo = [{
            parameter: '',
            direction: ''
            }];
        elementInput.portToInterfaceDefsMap = [
            [],
            []
        ];
        elementInputs.push( elementInput );
        var succMsg = '';
        if( manageARElements.length === 1 ) {
            succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ];
        } else {
            succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ] + ',';
        }
    }
    var manageARInput = {};
    var input = [ {
        clientId: 'ActiveWorkSpace',
        verificationRequest:
        {
            type:arObject.type,
            uid:arObject.uid
        },
        data: [ {
            manageAction: manageAction,
            elementInputs: elementInputs,
            recipeData: {
                recipe: '',
                seedObjects: [],
                context: ''
            }
        } ]
    } ];
    var pref = {
        diagramAction: '',
        useClosureRule: false
    };
    manageARInput.input = input;
    manageARInput.pref = pref;
    manageARInput.succMsg = succMsg;
    manageARInput.oobj = arObject;
    return manageARInput;
};

export let getSelectedParamInput = function( openedARObject, actionElem ) {
    var inputs = [];
    var parentElementObj = null;
    var inputPara = [];
    var direction;
    var selected = null;

    var selectedObjects = appCtxSvc.getCtx( 'mselected' );
    if( selectedObjects && selectedObjects.length > 0 ) {
        for( var idx = 0; idx < selectedObjects.length; ++idx ) {
            var proxy = cdm.getObject( selectedObjects[ idx ].uid );
            if( proxy && proxy.props && proxy.props.att1SourceAttribute ) {
                var objUid = proxy.props.att1SourceAttribute.dbValues[ 0 ];
                selected = cdm.getObject( objUid );
                if( selected && selected.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
                    inputPara.push( selectedObjects[ idx ] );

                }
            }
        }
    }
    if( actionElem === 'remove' ) {
        direction = 'unuse';
    } else if( actionElem === 'add' ) {
        direction = 'input';
    }
    inputs.push( {
        clientId: 'AddOrRemove',
        analysisRequest: {
            uid: openedARObject.uid,
            type: openedARObject.type
        },
        data: [ {
            parentElement: parentElementObj,
            attrs: inputPara,
            direction: direction
        } ]
    } );

    var input = {
        input: inputs
    };
    soaSvc.post( 'Internal-ValidationContractAW-2018-12-VCManagement', 'setMeasurableAttrDirection', input ).then(
        function() {
            eventBus.publish( 'cdm.relatedModified', {
                refreshLocationFlag: true,
                relations: '',
                relatedModified: [ openedARObject ],
                createdObjects: []
            } );
        } );
};

/**
 * Already present in toggleInputOutput.js file
 */
export let prepareInputForSOA = function(proxyMeasurableAttrs) {
    var inputs = [];
    inputs = _getARAttrsForToggleInput( inputs, proxyMeasurableAttrs );
    return inputs;
};

/**
 * @param {Array} inputs the inputs
 * @returns {Array} the SOA inputs
 *
 * Already present in toggleInputOutput.js file
 */
function _getARAttrsForToggleInput( inputs, proxyMeasurableAttrs ) {
    var invalidAttrsForToggle = '';

    var unusedAttrs = [];
    var inOutAttrs = [];
    var attrType = 'unused';

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        if (proxyMeasurableAttrs[ j ].props.att1AttrInOut) {
            attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];
        }

        if( attrType === 'unused' ) {
            unusedAttrs.push( proxyMeasurableAttrs[ j ] );
        } else {
            inOutAttrs.push( proxyMeasurableAttrs[ j ] );
        }
    }

    var parentElementObj = null;
    var idCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    if( idCtx && idCtx.isPortSelected && idCtx.targetModelObject ) {
        parentElementObj = cdm.getObject( idCtx.targetModelObject.uid );
    }
    else {
        var uid = appCtxSvc.getCtx( 'xrtSummaryContextObject.uid' );
        parentElementObj = cdm.getObject( uid );
    }

    if( unusedAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: appCtxSvc.ctx.openedARObject,
            data: [ {
                parentElement: parentElementObj,
                attrs: unusedAttrs,
                direction: 'input'
            } ]
        } );
    }

    if( inOutAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: appCtxSvc.ctx.openedARObject,
            data: [ {
                parentElement: parentElementObj,
                attrs: inOutAttrs,
                direction: 'automatic'
            } ]
        } );
    }

    return inputs;
}

/**
 * Already present in toggleInputOutput.js file
 */
export let performAssignAttrSOA = function( inputs, refreshEvent, eventData ) {
    var input = {
        input: inputs
    };
    soaSvc.post( 'Internal-ValidationContractAW-2018-12-VCManagement', 'setMeasurableAttrDirection', input ).then(
        function() {
            if( refreshEvent ) {
                eventBus.publish( refreshEvent );
            } else {
                eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
            }

            var unusedAttrs = appCtxSvc.getCtx( 'unusedAttrsSelected' );
            if( unusedAttrs && unusedAttrs.length > 0 ) {
                appCtxSvc.unRegisterCtx( 'unusedAttrsSelected' );
                appCtxSvc.unRegisterCtx( 'selectedAttrsName' );
            }
            var availAttrs = appCtxSvc.getCtx( 'invalidAttrsForToggle' );
            if( availAttrs && availAttrs.length > 0 ) {
                appCtxSvc.unRegisterCtx( 'invalidAttrsForToggle' );
            }
        } );
};

export let unRegisterVRTableSelection = function() {
    appCtxSvc.unRegisterCtx( 'vrContentTableSelection' );
};

export let getManageVRInputToAddToContentsTable = function( data ) {
    var addAsOccurrence = data.addAsOccurrence.dbValue;
    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var elementInputs = [];
    var elementInput = {};
    var succMsg = '';

        var allManageARElements = data.createdObject;
        var filterValidObjects = appCtxSvc.ctx.preferences.PLE_AddObjectsNotAllowedTypes;
        var isInvalidObj = false;
        if( filterValidObjects !== undefined && filterValidObjects.length > 0 ) {
        for(var i = 0; i < filterValidObjects.length; i++) {
            if(allManageARElements.modelType.typeHierarchyArray.indexOf(filterValidObjects[i]) > -1){
            var invalidObjects = allManageARElements;
            isInvalidObj = true;
            }
        }
        if (isInvalidObj === false){
            var manageARElements = allManageARElements;
        }
    }else{
        var manageARElements = allManageARElements;
    }
        if(manageARElements !== undefined){
        succMsg = manageARElements.props.object_string.dbValues[ 0 ];
        elementInput.elementAction = '';
        elementInput.objectToAdd = {
            type: manageARElements.type,
            uid: manageARElements.uid
        };
        elementInput.objectToAddContext = '';
        elementInput.objectToAddParent = '';
        elementInput.addParameterAsInOut = '';
        elementInput.addUnderlyingObject = false;
        elementInput.parameterInfo = [ {
            parameter: '',
            direction: ''
        } ];
        elementInput.portToInterfaceDefsMap = [
            [],
            []
        ];
        elementInputs.push( elementInput );
        succMsg = manageARElements.props.object_string.dbValues[ 0 ];
        var manageAction = 'addObject' ;
        //If bom is added to contents table as structure then bom table should be refreshed
        appCtxSvc.unRegisterCtx('isBOMAdded');
        if(manageARElements.modelType.typeHierarchyArray.indexOf('Part Revision') > -1 ||
        manageARElements.modelType.typeHierarchyArray.indexOf('Design Revision') > -1 || manageARElements.modelType.typeHierarchyArray.indexOf('Sam1AsMaintainedElement') > -1){
            appCtxSvc.registerCtx( 'isBOMAdded', true );
        }
        appCtxSvc.unRegisterCtx('isTPAdded');
        if(manageARElements.modelType.typeHierarchyArray.indexOf('IAV0TestProcedurRevision') > -1 ){
            appCtxSvc.registerCtx( 'isTPAdded', true );
        }
        appCtxSvc.unRegisterCtx('isTMAdded');
        if(manageARElements.modelType.typeHierarchyArray.indexOf('IAV0TestRequestRevision') > -1){
            appCtxSvc.registerCtx( 'isTMAdded', true );
        }
        if(addAsOccurrence === true){
        manageAction = 'addToBOM';
        }
        var getManageVRInputToAddToContentsTable = {};
        var input = [ {
            clientId: 'ActiveWorkSpace',
            verificationRequest: {
                type: arObject.type,
                uid: arObject.uid
            },
            data: [ {
                manageAction: manageAction,
                elementInputs: elementInputs,
                recipeData: {
                    recipe: '',
                    seedObjects: [],
                    context: ''
                }
            } ]
        } ];
        var pref = {
            diagramAction: '',
            useClosureRule: false
        };
        //If contents tab not present and user adds element as structure refresh entire page not only table
        appCtxSvc.unRegisterCtx('isContentTab');
        if( appCtxSvc.ctx.xrtSummaryContextObject.props.crt0Domain.dbValue === null &&
            (addAsOccurrence === true || (addAsOccurrence === null && (appCtxSvc.ctx.isTPAdded === true || appCtxSvc.ctx.isTMAdded === true)))) {
            appCtxSvc.registerCtx( 'isContentTab', false );
        }else{
            appCtxSvc.registerCtx( 'isContentTab', true );
        }
        getManageVRInputToAddToContentsTable.input = input;
        getManageVRInputToAddToContentsTable.pref = pref;
        getManageVRInputToAddToContentsTable.succMsg = succMsg;
        getManageVRInputToAddToContentsTable.oobj = arObject;
        getManageVRInputToAddToContentsTable.invalidObjects = invalidObjects;
        getManageVRInputToAddToContentsTable.manageARElements = manageARElements;
        getManageVRInputToAddToContentsTable.allManageARElements = allManageARElements;
        return getManageVRInputToAddToContentsTable;
    }else{
        eventBus.publish('Crt1AddWSOToContentTable.throwError', invalidObjects);
    }

};

export let getManageVRInputToAddToContentsTableFromPalette = function( data ) {
    var addAsOccurrence = data.addAsOccurrence.dbValue;
    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var elementInputs = [];
    var invalidObjects = [];
    var elementInput = {};
    var manageARElements = [];
    var succMsg = '';
    var allManageARElements = data.sourceObjects;
    var restrictedTypes = appCtxSvc.ctx.preferences.PLE_AddObjectsNotAllowedTypes;
    if(restrictedTypes !== undefined && restrictedTypes.length > 0 ) {
        for(var i = 0; i < allManageARElements.length; i++) {
            var isInvalidObj = false;
            for(var j = 0; j < restrictedTypes.length; j++) {
                if(allManageARElements[i].modelType.typeHierarchyArray.indexOf(restrictedTypes[j]) > -1){
                    isInvalidObj = true;
                    invalidObjects.push(allManageARElements[i]);
                }
            }
            if (isInvalidObj === false){
                manageARElements.push(allManageARElements[i]);
            }
        }
    }else{
        manageARElements = allManageARElements;
    }
        if(manageARElements.length > 0 ){
        appCtxSvc.unRegisterCtx('isBOMAdded');
        appCtxSvc.unRegisterCtx('isTPAdded');
        appCtxSvc.unRegisterCtx('isTMAdded');
        for( var i = 0; i < manageARElements.length; i++ ) {
            var underlyingObj;
            var underlyingObjUid;
            var underlyingObjType;

            if(manageARElements[i].props.awb0UnderlyingObject && manageARElements[i].props.awb0UnderlyingObject.dbValues[0]){
                var underlyingObj = cdm.getObject( manageARElements[i].props.awb0UnderlyingObject.dbValues[0]);
                underlyingObjUid = underlyingObj.uid;
                underlyingObjType = underlyingObj.type;
            }else{

                underlyingObjUid = manageARElements[i].uid;
                underlyingObjType = manageARElements[i].type;
            }
            var elementInput = {};
            elementInput.elementAction = '';
            elementInput.objectToAdd = {
                type: underlyingObjType,
                uid: underlyingObjUid
            };
            elementInput.objectToAddContext = '';
            elementInput.objectToAddParent = '';
            elementInput.addParameterAsInOut = '';
            elementInput.addUnderlyingObject = false;
            elementInput.parameterInfo = [ {
                parameter: '',
                direction: ''
            } ];
            elementInput.portToInterfaceDefsMap = [
                [],
                []
            ];
            elementInputs.push( elementInput );
            //If bom is added to contents table as structure then bom table should be refreshed
            if( manageARElements[i].modelType.typeHierarchyArray.indexOf('Part Revision') > -1 ||
            manageARElements[i].modelType.typeHierarchyArray.indexOf('Design Revision') > -1 || manageARElements[i].modelType.typeHierarchyArray.indexOf('Sam1AsMaintainedElement') > -1){
                appCtxSvc.registerCtx( 'isBOMAdded', true );
            }
            if( manageARElements[i].modelType.typeHierarchyArray.indexOf('IAV0TestProcedurRevision') > -1 ){
                appCtxSvc.registerCtx( 'isTPAdded', true );
            }
            if( manageARElements[i].modelType.typeHierarchyArray.indexOf('IAV0TestRequestRevision') > -1 ){
                appCtxSvc.registerCtx( 'isTMAdded', true );
            }
            if( manageARElements.length === 1 ) {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ];
            } else {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ] + ',';
            }
        }
    var manageAction = 'addObject' ;
    if(addAsOccurrence === true){
        manageAction = 'addToBOM';
    }
        var getManageVRInputToAddToContentsTable = {};
        var input = [ {
            clientId: 'ActiveWorkSpace',
            verificationRequest: {
                type: arObject.type,
                uid: arObject.uid
            },
            data: [ {
            manageAction: manageAction,
                elementInputs: elementInputs,
                recipeData: {
                    recipe: '',
                    seedObjects: [],
                    context: ''
                }
            } ]
        } ];
        var pref = {
            diagramAction: '',
            useClosureRule: false
        };

        appCtxSvc.unRegisterCtx('isContentTab');
        if( appCtxSvc.ctx.xrtSummaryContextObject.props.crt0Domain.dbValue === null &&
            (addAsOccurrence === true || (addAsOccurrence === null && (appCtxSvc.ctx.isTPAdded === true || appCtxSvc.ctx.isTMAdded === true)))) {
            appCtxSvc.registerCtx( 'isContentTab', false );
        }else{
            appCtxSvc.registerCtx( 'isContentTab', true );
        }

        getManageVRInputToAddToContentsTable.input = input;
        getManageVRInputToAddToContentsTable.pref = pref;
        getManageVRInputToAddToContentsTable.succMsg = succMsg;
        getManageVRInputToAddToContentsTable.oobj = arObject;
        getManageVRInputToAddToContentsTable.invalidObjects = invalidObjects;
        getManageVRInputToAddToContentsTable.manageARElements = manageARElements;
        getManageVRInputToAddToContentsTable.allManageARElements = allManageARElements;
        return getManageVRInputToAddToContentsTable;

    }
    else {
        eventBus.publish('Crt1AddWSOToContentTable.throwError', invalidObjects);
    }
};

export let throwError = function(data){
    var error = '';
    if(data.createdMainObject){
        error = error.concat( "'" +data.createdMainObject.props.object_name.dbValues[0] +"'"+ ' '+'is'+ ' ' + "'"+data.createdMainObject.modelType.displayName +" (Classname :: "+ data.createdMainObject.type +")'"+ '\n');
    }else{
        for(var i = 0; i < data.sourceObjects.length; i++) {
            error = error.concat( "'"+data.sourceObjects[i].props.object_string.dbValue+"'" + ' '+'is'+ ' '+"'"+ data.sourceObjects[i].modelType.displayName +" (Classname :: "+ data.sourceObjects[i].type +")'"+ '\n');
        }
    }
    var msg = data.i18n.throwErrorVRNotCreated.replace( '{0}', error);
    var errorString = msg + ' ' ;
    mesgSvc.showInfo( errorString );
};



export default exports = {
    getManageARInput,
    getSelectedParamInput,
    prepareInputForSOA,
    performAssignAttrSOA,
    unRegisterVRTableSelection,
    getManageVRInputToAddToContentsTable,
    getManageVRInputToAddToContentsTableFromPalette,
    throwError
};
app.factory( 'addRemoveFromAR', () => exports );
