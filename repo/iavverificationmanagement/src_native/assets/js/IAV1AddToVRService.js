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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/IAV1AddToVRService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import dateTimeSvc from 'js/dateTimeService';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/viewModelObjectService';
import 'js/messagingService';
import 'js/localeService';
import commandPanelService from 'js/commandPanel.service';


// Exports to hold the methods to be used
var exports = {};
// App context service

/**
 * @private
 *
 * @property {soa_kernel_clientDataModel} Cached reference to the injected AngularJS service.
 */

 //Creates input structure for createRelation SOA
export let getCreateRelationInput = function( data ) {

        //Need to write code to create input for create relation SOA

};

//Register command id and open create panel for appropriate object
export let setCommandId = function( commandId ) {
    appCtxSvc.registerCtx( 'ActiveCommandId', commandId );
    commandPanelService.activateCommandPanel( 'IAV1AddToTPTMContentsTable', 'aw_toolsAndInfo' );
};

//Sets create input for panel.
export let setObjToDisplayPanel = function( data ) {
    var commandId = appCtxSvc.ctx.ActiveCommandId;
    var testProcChildren = appCtxSvc.ctx.preferences.TCAllowedChildTypes_IAV0TestProcedur;
    var testMethodChildren = appCtxSvc.ctx.preferences.TCAllowedChildTypes_IAV0TestRequest;

    // Open create panel of Test Procedure (Test Request is opened and nothing is selected: Child)
    // Open create panel of Test Procedure (Test Request is opened and Test Procedure is selected:Sibling)
    if( commandId === 'IAV1AddContentToTPTable' || commandId === 'IAV1AddContentToTPTableAsSibling' ) {
        data.createObj = 'IAV0TestProcedur';
        data.preferredType = 'IAV0TestProcedur';
        data.typeFilter = 'IAV0TestProcedurRevision';
    }

    // Open create panel for Test Procedure child (Test Request is opened and Test Procedure is selected: add Child to TP)
    else if( commandId === 'IAV1AddContentToTPTableAsChild' ) {
        if( testProcChildren !== undefined && testProcChildren.length > 0 ) {
            data.createObj = testProcChildren.join( ',' );
            data.preferredType = 'IAV0TestStep';
            var typeFilterProcArray = [];
            for( var i = 0; i < testProcChildren.length; i++ ) {
                var typeFilterProcString = '';
                typeFilterProcString = typeFilterProcString.concat( testProcChildren[ i ] + 'Revision' );
                typeFilterProcArray.push( typeFilterProcString );
            }
            data.typeFilter = typeFilterProcArray.join( ',' );
        } else {
            data.createObj = 'IAV0TestCond,IAV0TestStep,IAV0MeasureReqmt';
            data.preferredType = 'IAV0TestStep';
            data.typeFilter = 'IAV0TestStepRevision,IAV0TestStepRevision,IAV0MeasureReqmtRevision';
        }
    }

    // Open create panel of Test Method (Test Request is opened and nothing is selected: add TM to TR or TE)
    // Open create panel of Test Method (Test Request is opened and Test Method is selected: add TM Sibling to TM)
    else if( commandId === 'IAV1AddContentToTMTable' || commandId === 'IAV1AddContentToTMTableAsSibling' ) {
        data.createObj = 'IAV0TestRequest';
        data.preferredType = 'IAV0TestRequest';
        data.typeFilter = 'IAV0TestRequestRevision';
    }

    // Open create panel for Test Method child (Test Request is opened and Test Method is selected: add Child to TM)
    else if( commandId === 'IAV1AddContentToTMTableAsChild' ) {
        if( testMethodChildren !== undefined && testMethodChildren.length > 0 ) {
            data.createObj = testMethodChildren.join( ',' );
            data.preferredType = 'IAV0MeasureReqmt';
            var typeFilterMethodArray = [];
            for( var i = 0; i < testMethodChildren.length; i++ ) {
                var typeFilterMethodString = '';
                typeFilterMethodString = typeFilterMethodString.concat( testMethodChildren[ i ] + 'Revision' );
                typeFilterMethodArray.push( typeFilterMethodString );
            }
            data.typeFilter = typeFilterMethodArray.join( ',' );
        } else {
            data.createObj = 'IAV0TestCond,IAV0MeasureReqmt,IAV0InspectReqmt,IAV0DataReqmt,IAV0OprReqmt,IAV0ExtEqpReqmt,IAV0RigCompReqmt';
            data.preferredType = 'IAV0MeasureReqmt';
            data.typeFilter = 'IAV0TestCondRevision,IAV0MeasureReqmtRevision,IAV0InspectReqmtRevision,IAV0DataReqmtRevision,IAV0OprReqmtRevision,IAV0ExtEqpReqmtRevision,IAV0RigCompReqmtRevision';
        }
    }

    // Open create panel for Test Procedure child's child or child's sibling (Test Request is opened and Test Procedure's child is selected: add Child to TP)
    // Open create panel for Test Method child's child or child's sibling (Test Request is opened and Test Method's child is selected: add Child to TM)
    else if( commandId === 'IAV1AddContentToTPTableAsChildChild' || commandId === 'IAV1AddContentToTPTableAsSiblingSibling' ||
             commandId === 'IAV1AddContentToTMTableAsChildChild' || commandId === 'IAV1AddContentToTMTableAsSiblingSibling' ) {
        if( appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
            if( appCtxSvc.ctx.selected.props.awb0UnderlyingObjectType ) {
             var selectedUnderlyingType = appCtxSvc.ctx.selected.props.awb0UnderlyingObjectType.dbValues[ 0 ];
            }else if( appCtxSvc.ctx.selected.type === 'Arm0ParagraphElement' ) {
                selectedUnderlyingType = 'IAV0TestStepRevision';
            }
            if( selectedUnderlyingType === 'IAV0TestCondRevision' ) {
                data.preferredType = 'IAV0TestCond';
            } else if( selectedUnderlyingType === 'IAV0TestStepRevision' ) {
                data.preferredType = 'IAV0TestStep';
            } else if( selectedUnderlyingType === 'IAV0MeasureReqmtRevision' ) {
                data.preferredType = 'IAV0MeasureReqmt';
            }else if( selectedUnderlyingType === 'IAV0InspectReqmtRevision' ) {
                data.preferredType = 'IAV0InspectReqmt';
            }else if( selectedUnderlyingType === 'IAV0DataReqmtRevision' ) {
                data.preferredType = 'IAV0DataReqmt';
            }else if( selectedUnderlyingType === 'IAV0OprReqmtRevision' ) {
                data.preferredType = 'IAV0OprReqmt';
            }else if( selectedUnderlyingType === 'IAV0ExtEqpReqmtRevision' ) {
                data.preferredType = 'IAV0ExtEqpReqmt';
            }else if( selectedUnderlyingType === 'IAV0RigCompReqmtRevision' ) {
                data.preferredType = 'IAV0RigCompReqmt';
            }
        }
    }
};

export let getManageVRInputToAddToTPTMTable = function( data ) {
    var selected = '';
    var action = '';
    var succMsg = '';
    if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) < 0 ) {
        var selectedObject = appCtxSvc.ctx.selectedVRProxyObjects[0];
        selected = {
            type: selectedObject.type,
            uid: selectedObject.uid
        };
        if( appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsSibling' || appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTMTableAsSibling' ||
            appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsSiblingSibling' || appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTMTableAsSiblingSibling' ||
            appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTable' || appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTMTable' ) {
            action = 'Sibling';
        } else {
            action = 'Child';
        }
    }
    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var elementInputs = [];
    var elementInput = {};
    if( data.createdObject ) {
        var manageARElements = data.createdObject;
        succMsg = manageARElements.props.object_string.dbValues[ 0 ];
        elementInput.elementAction = action;
        elementInput.objectToAdd = {
            type: manageARElements.type,
            uid: manageARElements.uid
        };
        elementInput.objectToAddContext = '';
        elementInput.objectToAddParent = selected;
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
    } else {
        manageARElements = data.sourceObjects;
        for( var i = 0; i < manageARElements.length; i++ ) {
            var elementInput = {};
            elementInput.elementAction = action;
            elementInput.objectToAdd = {
                type: manageARElements[ i ].type,
                uid: manageARElements[ i ].uid
            };
            elementInput.objectToAddContext = '';
            elementInput.objectToAddParent = selected;
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
            if( manageARElements.length === 1 ) {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ];
            } else {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ] + ',';
            }
        }
    }
    var getManageVRInputToAddToTPTMTable = {};
    var input = [ {
        clientId: 'ActiveWorkSpace',
        verificationRequest: {
            type: arObject.type,
            uid: arObject.uid
        },
        data: [ {
            manageAction: 'addToBOM',
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
    if( appCtxSvc.ctx.xrtSummaryContextObject.props.crt0Domain.dbValue === null ){
        appCtxSvc.registerCtx( 'isContentTab', false );
    }else{
        appCtxSvc.registerCtx( 'isContentTab', true );
    }
    getManageVRInputToAddToTPTMTable.input = input;
    getManageVRInputToAddToTPTMTable.pref = pref;
    getManageVRInputToAddToTPTMTable.succMsg = succMsg;
    getManageVRInputToAddToTPTMTable.oobj = arObject;
    return getManageVRInputToAddToTPTMTable;
};

export let unRegisterTMTPTableSelection = function( ) {
    appCtxSvc.unRegisterCtx( 'TR_TPTableSelection' );
    appCtxSvc.unRegisterCtx( 'TR_TMTableSelection' );
    appCtxSvc.unRegisterCtx( 'selectedVRProxyObjects' );
};

export let getManageVRInputToAddToBOMTable = function( data ) {
    var selected = '';
    var action = '';
    var succMsg = '';

    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var elementInputs = [];
    var elementInput = {};
        var manageARElements = data.sourceObjects;
        for( var i = 0; i < manageARElements.length; i++ ) {
            var elementInput = {};
            elementInput.elementAction = '';
            elementInput.objectToAdd = {
                type: manageARElements[ i ].type,
                uid: manageARElements[ i ].uid
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
            if( manageARElements.length === 1 ) {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ];
            } else {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ] + ',';
            }
        }

    var getManageVRInputToAddToBOMTable = {};
    var input = [ {
        clientId: 'ActiveWorkSpace',
        verificationRequest: {
            type: arObject.type,
            uid: arObject.uid
        },
        data: [ {
            manageAction: 'addToBOM',
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
    if( appCtxSvc.ctx.xrtSummaryContextObject.props.crt0Domain.dbValue === null ){
        appCtxSvc.registerCtx( 'isContentTab', false );
    }else{
        appCtxSvc.registerCtx( 'isContentTab', true );
    }
    getManageVRInputToAddToBOMTable.input = input;
    getManageVRInputToAddToBOMTable.pref = pref;
    getManageVRInputToAddToBOMTable.succMsg = succMsg;
    getManageVRInputToAddToBOMTable.oobj = arObject;
    return getManageVRInputToAddToBOMTable;
};

export default exports = {
    setObjToDisplayPanel,
    setCommandId,
    getCreateRelationInput,
    getManageVRInputToAddToTPTMTable,
    unRegisterTMTPTableSelection,
    getManageVRInputToAddToBOMTable
};
/**
 * Service takes care of the various operations required to create the remote link
 *
 * @memberof NgServices
 * @member Awp0NewWorkflowProcess
 */
app.factory( 'IAV1AddToVRService', () => exports );
