// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/analysisRequestUtils
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import mesgSvc from 'js/messagingService';
import addRemoveFromAR from 'js/addRemoveFromAR';
import createAnalysisRequest from 'js/createAnalysisRequest';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import cmm from 'soa/kernel/clientMetaModel';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import AwStateService from 'js/awStateService';
import selectionService from 'js/selection.service';
import manageVerificationService from 'js/manageVerificationService';

var exports = {};

var defaultExcelTemplate = null;
var _onOccDataLoadedEventListener = null;

var _onRegisterMselectedChangeEventListener = null;
var _onOccMgmtUnloadedEventListener = null;

var proxyMeasurableAttrs = [];

var _handlePartialErrorForDiagram = function( response, data ) {
    var responseString = [];
    if( response.cause && response.cause.partialErrors ) {
        _.forEach( response.cause.partialErrors, function( partialError ) {
            _.forEach( partialError.errorValues, function( errValue ) {
                responseString.push( errValue.message );
            } );
        } );

        if( responseString.length > 0 ) {
            var arName = data.createdObject.props.object_string.dbValues[ 0 ];

            var msg = data.i18n.AddObjectsForValidationFromDiagramWarning.replace( '{0}', arName );

            var errorString = msg + ' ' + responseString.join( '' );

            mesgSvc.showError( errorString );
        }
    }
};

var _handleErrorForAddObjectToAR = function(response, elementsToAdd, elementsToAdd1, invalidObjects, data) {
    var error = '';
    for(var i = 0; i < invalidObjects.length; i++){
        error = error.concat( "'"+invalidObjects[i].props.object_string.dbValue +"'"+ ' '+'is'+ ' ' +"'"+ invalidObjects[i].modelType.displayName
        +" (Classname :: "+ invalidObjects[i].type +")'"+ '\n');
    }
    var objName = response.output[0].verificationRequest.props.object_string.dbValues[0];
    var msg = data.i18n.throwError.replace( '{0}', elementsToAdd.length).replace( '{1}', elementsToAdd1.length )
    .replace( '{2}', objName ).replace( '{3}', error );
    var errorString = msg + ' ' ;
    mesgSvc.showInfo( errorString );
};

var _handlePartialErrorForAddObjectToAR = function( response ) {
    var responseString = [];
    if( response.cause && response.cause.partialErrors ) {
        _.forEach( response.cause.partialErrors, function( partialError ) {
            _.forEach( partialError.errorValues, function( errValue ) {
                responseString.push( errValue.message );
            } );
        } );

        if( responseString.length > 0 ) {
            mesgSvc.showError( responseString.join( '' ) );
        }
    }
};

var _exportARToExcel = function( selectedARs ) {
    if( selectedARs ) {
        soaSvc.post( 'Internal-AWS2-2016-12-RequirementsManagement', 'exportToApplication2', {
            input: [ {
                templateName: defaultExcelTemplate,
                applicationFormat: 'MSExcelLiveBulkMode',
                objectsToExport: selectedARs,
                targetObjectsToExport: [],
                exportOptions: [],
                attributesToExport: null
            } ]
        } ).then( function( response ) {
            fmsUtils.openFile( response.transientFileReadTickets[ 0 ] );
        }, function() {
            // ignore any error
        } );
    }
};

var _isInstanceOf = function( typeName, modelType ) {
    var notNullCheck = typeName !== null && modelType !== null;

    if( notNullCheck &&
        ( typeName === modelType.name || modelType.typeHierarchyArray &&
            modelType.typeHierarchyArray.indexOf( typeName ) > -1 ) ) {
        return true;
    }
    return false;
};

/**
 *
 * Opens the created object (AR)
 *
 * @param {Object} vmo view Model Object
 */
export let openObject = function( vmo ) {
    var stateSvc = AwStateService.instance;

    if( vmo && vmo.uid ) {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var toParams = {};
        var options = {};

        toParams.uid = vmo.uid;

        options.inherit = false;

        stateSvc.go( showObject, toParams, options );
    }
};

/**
 * Set the context to UI Property.
 *
 * @param {Object} dataObj dataObject
 * @param {Object} context ctx
 */
var _setContextToUIProp = function( dataObj, context ) {
    dataObj.domainUid = context;
};

/**
 * Populates the SavedBookmark on AR create panel
 *
 * @param {Object} data data
 */
export let populateSavedBookmark = function( data ) {
    var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( data.creationType && context && context.productContextInfo ) {
        if( context.productContextInfo.props.awb0ContextObject.dbValues[ 0 ] ) {
            _setContextToUIProp( data, context.productContextInfo.props.awb0ContextObject.dbValues[ 0 ] );
        } else {
            _setContextToUIProp( data, context.productContextInfo.props.awb0Product.dbValues[ 0 ] );
        }
    } else {
        //Check the object selected in Home Folder is of type 'Ase0Diagram' and set the context
        var stateSvc = AwStateService.instance;
        var selectedObj = cdm.getObject( stateSvc.params.s_uid );
        if( selectedObj && _isInstanceOf( 'Awb0SavedBookmark', selectedObj.modelType ) ) {
            _setContextToUIProp( data, selectedObj.uid );
        }
    }
};

/**
 * Post processes the created AR.
 *
 * @param {Object} data createdAR
 */
export let setCCObjectForVR = function( createdAR ) {
    var parammgmtctx = appCtxSvc.getCtx( 'parammgmtctx', parammgmtctx );

    if( parammgmtctx &&
        appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.attrtarget.paramProjectSubLocation' ) {
        var configurationContextObject = null;
        var paramProject = null;
        configurationContextObject = cdm.getObject( _.get( createdAR, 'props.Att0HasConfigurationContext.dbValues[0]', undefined ) );
        paramProject = cdm.getObject( createdAR.props.crt0Domain.dbValues[ 0 ] );
        paramProject = cdm.getObject( paramProject.uid );
        parammgmtctx.ConfigurationContext = configurationContextObject;
        parammgmtctx.paramProject = paramProject;
        if( paramProject && paramProject.props && paramProject.props.Att0HasVariantConfigContext ) {
            _.set( appCtxSvc, 'ctx.parammgmtctx.hasVariantConfigContext', true );
            eventBus.publish( 'Att1FullScreenConfiguratorTab.contentLoaded' );
        }
    }
};

/**
 * Post processes the created AR.
 *
 * @param {Object} data data
 */
export let processCreatedObject = function( data ) {

    var createdAR = data.createdObject;
    var arProcessData = appCtxSvc.getCtx( 'analysisRequestContext' );
    if( createdAR ) {
        var eventData = {
            "createdObject": data.createdObject
        };
        eventBus.publish( "swc.objectCreated",  eventData);

        if( !( appCtxSvc.ctx.selected.type === 'Att0ParamProject' ||
                appCtxSvc.ctx.selected.type === 'Att1AttributeAlignmentProxy' ||
                appCtxSvc.ctx.selectedAttrProxyObjectsForAR &&
                appCtxSvc.ctx.selectedAttrProxyObjectsForAR[ 0 ].type === 'Att1AttributeAlignmentProxy' ) ) {
            if( (arProcessData.selections.selectedElements.length > 0 && addRemoveFromAR) ||
                (arProcessData.selections.selectedElements.length === 0 && !arProcessData.isInArchTab && addRemoveFromAR ) ) {
                var _manageAction = 'addObject';
                var recipeId = '';
                var seedObjects = [];

                //If Recipe is opened and nothing is selected from "Result" table then set manageAction as "RecipeUid, true"
                //True to execute recipe on server side.
                if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.type === 'Fnd0SearchRecipe' && appCtxSvc.ctx.mselected.length === 1 && appCtxSvc.ctx.mselected[ 0 ].type === 'Fnd0SearchRecipe' ) {
                    recipeId = appCtxSvc.ctx.selected.uid;
                }
                //If selected object is not a workspace object
                if((arProcessData.isInArchTab === true || appCtxSvc.ctx.isElementSelectedFromRecipe === true ) && arProcessData.selections.selectedElements.length > 0) {
                    var elementsToAdd = arProcessData.selections.selectedElements;
                    appCtxSvc.unRegisterCtx('isElementSelectedFromRecipe');
                }else{
                    var elementsToAdd = [];
                    var invalidObjects = [];
                    //If selected object is not a workspace object
                    var elementsToAdd1 = appCtxSvc.getCtx( 'mselected' );
                    var restrictedTypes = appCtxSvc.ctx.preferences.PLE_AddObjectsNotAllowedTypes;
                    if(restrictedTypes !== undefined && restrictedTypes.length > 0){
                    for(var i = 0; i < elementsToAdd1.length; i++) {
                        var isInvalidObj = false;
                        for(var j = 0; j < restrictedTypes.length; j++) {
                            if(elementsToAdd1[i].modelType.typeHierarchyArray.indexOf(restrictedTypes[j]) > -1){
                                isInvalidObj = true;
                                invalidObjects.push(elementsToAdd1[i]);
                            }
                        }
                        if (isInvalidObj === false){
                            elementsToAdd.push(elementsToAdd1[i]);
                        }
                    }
                }else{
                        elementsToAdd = elementsToAdd1;
                    }
                }
                data.getManageVRInputToAddToContentsTable = createAnalysisRequest.getManageARInputForCreateVR( createdAR, _manageAction, elementsToAdd, recipeId, seedObjects);
                data.getManageVRInputToAddToContentsTable.manageARElements = elementsToAdd;
                data.getManageVRInputToAddToContentsTable.allManageARElements = elementsToAdd1;
                data.getManageVRInputToAddToContentsTable.invalidObjects = invalidObjects;
                manageVerificationService.callManageVerificationSOA( data.getManageVRInputToAddToContentsTable.input, data.getManageVRInputToAddToContentsTable.pref, data );
            } else if( arProcessData.isInArchTab ||
                _isInstanceOf( 'Awb0SavedBookmark', appCtxSvc.ctx.selected.modelType ) ) {
                soaSvc.post( 'ValidationContractAW-2015-10-VCManagement', 'addObjectsForValidationFromDiagram', {
                    input: [ createdAR ]
                } ).then( function( response ) {
                    _handlePartialErrorForDiagram( response, data );
                }, function( response ) {
                    _handlePartialErrorForDiagram( response, data );
                } );
            }
        } else {
            var inputs = [];
            var parentElementObj = null;
            var inputPara = [];
            var selected;

            if( appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected[ 0 ].type === 'Att1AttributeAlignmentProxy' ) {
                for( var j = 0; j < appCtxSvc.ctx.mselected.length; j++ ) {
                    if( appCtxSvc.ctx.mselected[ j ].type === 'Att1AttributeAlignmentProxy' ) {
                        selected = {
                            uid: appCtxSvc.ctx.mselected[ j ].uid,
                            type: appCtxSvc.ctx.mselected[ j ].type
                        };
                        inputPara.push( selected );
                    }
                }
            } else if( appCtxSvc.ctx.selectedAttrProxyObjectsForAR &&
                appCtxSvc.ctx.selectedAttrProxyObjectsForAR[ 0 ].type === 'Att1AttributeAlignmentProxy' ) {
                for( var j = 0; j < appCtxSvc.ctx.selectedAttrProxyObjectsForAR.length; j++ ) {
                    if( appCtxSvc.ctx.selectedAttrProxyObjectsForAR[ j ].type === 'Att1AttributeAlignmentProxy' ) {
                        selected = {
                            uid: appCtxSvc.ctx.selectedAttrProxyObjectsForAR[ j ].uid,
                            type: appCtxSvc.ctx.selectedAttrProxyObjectsForAR[ j ].type
                        };
                        inputPara.push( selected );
                    }
                }
            }
            inputs.push( {
                clientId: 'Input',
                analysisRequest: {
                    uid: createdAR.uid,
                    type: createdAR.type
                },
                data: [ {
                    parentElement: parentElementObj,
                    attrs: inputPara,
                    direction: 'input'
                } ]
            } );
            var input = {
                input: inputs
            };
            soaSvc.post( 'Internal-ValidationContractAW-2018-12-VCManagement', 'setMeasurableAttrDirection', input ).then(
                function() {} );
        }
        //Open newly created AR
        exports.openObject( createdAR );
    }
};

var _setCriteriaType = function( openedObj, recipe ) {
    var isARType = cmm.isInstanceOf( 'Crt0VldnContractRevision', openedObj.modelType );
    var isStudyType = cmm.isInstanceOf( 'Crt0StudyRevision', openedObj.modelType );
    if( isARType || isStudyType ) {
        recipe.criteriaType = 'showAllobjects';
        return;
    }
};

var _performOccurenceFilterOperation = function() {
    var stateSvc = AwStateService.instance;
    var recipe = {};

    var filterString = appCtxSvc.ctx.occmgmtContext.requestPref.criteriaType;
    appCtxSvc.registerCtx( 'vldnContract.isFilterClicked', true );
    if( filterString === undefined || filterString === null ||
        filterString === 'IncludeNonMatchedValidationLink' || filterString === 'showAllobjects' ) {
        recipe.criteriaType = 'ExcludeNonMatchedValidationLink';
        appCtxSvc.registerCtx( 'selectFilter', true );
    } else if( filterString === 'ExcludeNonMatchedValidationLink' ) {
        var openedObj = cdm.getObject( stateSvc.params.uid );
        _setCriteriaType( openedObj, recipe );
        appCtxSvc.registerCtx( 'selectFilter', false );
    }
    appCtxSvc.ctx.occmgmtContext.requestPref.criteriaType = recipe.criteriaType;
    eventBus.publish( 'acePwa.reset', {
        retainTreeExpansionStates: true
    } );
    _onOccDataLoadedEventListener = eventBus.subscribe( 'occDataLoadedEvent', function() {
        _refreshDiagram();
    }, 'analysisRequestUtils' );

    eventBus.publish( 'occurrenceManagementConfigurationChangeEvent' );
};

/**
 * AR Occurrence Filter Toggle
 */
export let arOccurenceFilter = function() {
    _performOccurenceFilterOperation();
};

/**
 * Notify the diagram to refresh after the AR Filter gets clicked
 */
function _refreshDiagram() {
    if( appCtxSvc.getCtx( 'vldnContract.isFilterClicked' ) === true ) {
        eventBus.publish( 'architectureModeler.Refresh' );
        appCtxSvc.updatePartialCtx( 'vldnContract.isFilterClicked', false );
        eventBus.unsubscribe( _onOccDataLoadedEventListener );
    }
}

/**
 * Study Occurrence Filter Toggle
 */
export let studyOccurenceFilter = function() {
    _performOccurenceFilterOperation();
};

var evaluateARVisibility = function( oobj, mselected ) {
    var selectedObjs = [];
    var inputRevs = [];
    var input2 = null;
    inputRevs[ 0 ] = cdm.getObject( oobj.props.crt0Configuration.dbValues[ 0 ] );
    input2 = {
        inputs: inputRevs
    };
    appCtxSvc.updateCtx( 'removeFromARVisibility', true );
    setVisibility( input2, mselected, 'addToARVisibility', inputRevs );
    for( var i = 0; i < mselected.length; i++ ) {
        if( mselected[ i ] && cmm.isInstanceOf( 'Awb0Element', mselected[ i ].modelType ) ) {
            selectedObjs.push( mselected[ i ] );
        }
    }
    getTraceLinks( oobj, selectedObjs );
};

var evaluateStudyVisibility = function( oobj, mselected ) {
    var selectedObjs = [];
    var inputRevs = [];
    var input2 = null;
    inputRevs[ 0 ] = cdm.getObject( oobj.props.crt0Configuration.dbValues[ 0 ] );
    input2 = {
        inputs: inputRevs
    };
    appCtxSvc.updateCtx( 'removeFromStudyVisibility', true );
    setVisibility( input2, mselected, 'addToStudyVisibility', inputRevs );
    for( var i = 0; i < mselected.length; i++ ) {
        if( mselected[ i ] && cmm.isInstanceOf( 'Awb0Element', mselected[ i ].modelType ) ) {
            selectedObjs.push( mselected[ i ] );
        }
    }
    getTraceLinks( oobj, selectedObjs );
};

var evaluateVisibility = function() {
    appCtxSvc.unRegisterCtx( 'addToARVisibility' );
    appCtxSvc.unRegisterCtx( 'addToStudyVisibility' );
    appCtxSvc.unRegisterCtx( 'removeFromARVisibility' );
    appCtxSvc.unRegisterCtx( 'removeFromStudyVisibility' );
    appCtxSvc.unRegisterCtx( 'validObjects' );
    var selected = appCtxSvc.getCtx( 'selected' );
    var mselected = appCtxSvc.getCtx( 'mselected' );
    var state = appCtxSvc.getCtx( 'state' );
    var primaryXrtPageID = appCtxSvc.getCtx( 'xrtPageContext.primaryXrtPageID' );
    dmSvc.getProperties( [ state.params.uid ], [ 'crt0Configuration' ] );
    var oobj = cdm.getObject( state.params.uid );
    appCtxSvc.registerCtx( 'addToARVisibility', false );
    appCtxSvc.registerCtx( 'addToStudyVisibility', false );
    appCtxSvc.registerCtx( 'removeFromARVisibility', false );
    appCtxSvc.registerCtx( 'removeFromStudyVisibility', false );
    appCtxSvc.registerCtx( 'validObjects', null );
    var check = mselected !== null && primaryXrtPageID === 'tc_xrt_Content' && oobj.uid !== selected.uid &&
        oobj.props.crt0Configuration;
    if( check ) {
        if( oobj.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 &&
            oobj.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) === -1 ) {
            evaluateARVisibility( oobj, mselected );
        } else if( oobj.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) {
            evaluateStudyVisibility( oobj, mselected );
        }
    }
};
/**
 * Check if the element is added to AR
 *
 * @param {Object} vmo the view model
 * @Returns {boolean} elementAddedtoAR
 */
export let isElementAddedToAR = function( vmo ) {
    if( _isAROrStudyOpenInACE() ) {
        appCtxSvc.updatePartialCtx( 'decoratorToggle', true );

        appCtxSvc.updatePartialCtx( 'archDiagramExtraProperties.Crt0VldnContractRevision',
            'crt1AddedToAnalysisRequest' );

        if( appCtxSvc.ctx.subscribeToRegisterMselected === undefined ) {
            _onRegisterMselectedChangeEventListener = eventBus.subscribe( 'appCtx.register', function(
                eventData ) {
                if( ( eventData.name === 'mselected' ||
                        ( eventData.name === 'openedARObject' && appCtxSvc.ctx.state && appCtxSvc.ctx.state.processed && appCtxSvc.ctx.state.processed.pageId && appCtxSvc.ctx.state.processed
                            .pageId === 'tc_xrt_Content' ) ) &&
                    appCtxSvc.ctx.subscribeToRegisterMselected === true ) {
                    _onRegisterMselected();
                }
            }, 'analysisRequestUtils' );
            appCtxSvc.updatePartialCtx( 'subscribeToRegisterMselected', true );
        }
        if( appCtxSvc.ctx.subscribeToContentUnloaded === undefined ) {
            _onOccMgmtUnloadedEventListener = eventBus.subscribe( 'occurrenceManagement.contentUnloaded',
                function() {
                    if( appCtxSvc.ctx.subscribeToContentUnloaded === true ) {
                        _unregisterPropPolicies();
                    }
                }, 'analysisRequestUtils' );
            appCtxSvc.updatePartialCtx( 'subscribeToContentUnloaded', true );
        }
        //register variable to avoid repeated calls to functions _autoAddChildToVR & _autoAddSiblingToVR
        appCtxSvc.registerCtx( 'elementAddedToVR', false );

        //subscribe event as it is fired by ACE
        eventBus.subscribe( 'addElement.elementsAdded',
            function( eventData ) {
                if( appCtxSvc.ctx.aceActiveContext.context && appCtxSvc.ctx.openedARObject.modelType.typeHierarchyArray.indexOf( 'Crt0ContractRevision' ) > -1 &&
                    appCtxSvc.ctx.elementAddedToVR === false ) {
                    _autoAddChildToVR( eventData );
                }
            }, 'analysisRequestUtils' );

        //subscribe event as it is fired by ACE
        eventBus.subscribe( 'addChild.updatePCIInCtx',
            function( eventData ) {
                if( appCtxSvc.ctx.aceActiveContext.context && appCtxSvc.ctx.openedARObject.modelType.typeHierarchyArray.indexOf( 'Crt0ContractRevision' ) > -1 &&
                    appCtxSvc.ctx.elementAddedToVR === false ) {
                    _autoAddSiblingToVR( eventData );
                }
            }, 'analysisRequestUtils' );
        appCtxSvc.registerCtx('addPramaterForVR',true);
        eventBus.subscribe( 'att1AddParameter.setItemEventProgressing',
        function( eventData ) {
            if( appCtxSvc.ctx.addPramaterForVR === true ) {
                exports.setInputDirectionForParamterObj(eventData, "Att1ShowAttrProxyTable.refreshTable");
            }

        }, 'analysisRequestUtils' );
        if( vmo && vmo.props && vmo.props.crt1AddedToAnalysisRequest &&
            vmo.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
            return true;
        }

    }

    return false;
};

/**
 * Set input direction for the paramter added in VR
 */
export let setInputDirectionForParamterObj = function( eventData, refreshEvent ) {
    appCtxSvc.registerCtx('addPramaterForVR', false );
    if( eventData.scope.data.createdObject ) {
        proxyMeasurableAttrs = eventData.scope.data.createdObject;
    }else if( eventData.scope.ctx.awClipBoardProvider && eventData.scope.ctx.awClipBoardProvider.length > 0 && eventData.valueToSet ) {
        proxyMeasurableAttrs = [];
        for( var i = 0; i < eventData.scope.ctx.awClipBoardProvider.length; ++i ) {
            if( eventData.scope.ctx.awClipBoardProvider[i].modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
                proxyMeasurableAttrs.push(eventData.scope.ctx.awClipBoardProvider[i]);
            }
        }
    } else {
        return;
    }
    var inputs = addRemoveFromAR.prepareInputForSOA(proxyMeasurableAttrs);
    addRemoveFromAR.performAssignAttrSOA( inputs, refreshEvent, eventData );
};

/**
 * Check if the element is added to AR
 *
 * @param {Object} vmo the view model
 * @Returns {boolean} elementAddedtoAR
 */
export let isElementAddedToVR = function( vmo ) {
    appCtxSvc.updatePartialCtx( 'decoratorToggle', true );

    if( vmo && vmo.props && vmo.props.crt1AddedToAnalysisRequest &&
        vmo.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
        return true;
    }
    return false;
};
/**
 * Unregister Property Policies as soon as AR Content tab is unloaded.
 */
function _unregisterPropPolicies() {
    eventBus.unsubscribe( _onOccMgmtUnloadedEventListener );
    appCtxSvc.unRegisterCtx( 'subscribeToContentUnloaded' );
    eventBus.unsubscribe( _onRegisterMselectedChangeEventListener );
    appCtxSvc.unRegisterCtx( 'subscribeToRegisterMselected' );
    appCtxSvc.unRegisterCtx( 'openedARObject' );
    appCtxSvc.unRegisterCtx( 'selectFilter' );
    appCtxSvc.unRegisterCtx( 'interfaceDetails' );
}

/**
 * Unregister Property Policies as soon as AR Content tab is unloaded.
 */
function _onRegisterMselected() {
    evaluateVisibility();
}

/**
 * Check if the AR/Study is open in ACE
 *
 * @returns {boolean} isAROrStudyOpenInACE
 */
function _isAROrStudyOpenInACE() {
    if( appCtxSvc.ctx.occmgmtContext &&
        appCtxSvc.ctx.sublocation &&
        appCtxSvc.ctx.sublocation.nameToken === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' || appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] ===
        'com.siemens.splm.client.attrtarget.paramProjectSubLocation' ) {
        var stateSvc = AwStateService.instance;
        var openedObj = cdm.getObject( stateSvc.params.uid );
        if( _isInstanceOf( 'Crt0VldnContractRevision', openedObj.modelType ) ) {
            appCtxSvc.registerCtx( 'openedARObject', openedObj );
            setCCObjectForVR( openedObj );
            return true;
        }
    }

    return false;
}

/**
 * Exports the selected AR/Study to Excel
 */
export let exportToExcel = function() {
    var selectedObjects = appCtxSvc.ctx.mselected;

    var selectedARs = [];

    if( selectedObjects ) {
        _.forEach( selectedObjects, function( object ) {
            if( _isInstanceOf( 'Crt0VldnContractRevision', object.modelType ) ) {
                selectedARs.push( object );
            }
        } );
    }
    if( defaultExcelTemplate === null ) {
        soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: [ 'PLE_DefaultARExcelTemplate' ],
            includePreferenceDescriptions: false
        }, {} ).then( function( result ) {
            if( result && result.response ) {
                if( result.response[ 0 ].values ) {
                    defaultExcelTemplate = result.response[ 0 ].values.values[ 0 ];
                }
                if( defaultExcelTemplate === null ) {
                    defaultExcelTemplate = 'AnalysisRequest_export_template';
                }
                _exportARToExcel( selectedARs );
            }
        } );
    } else {
        _exportARToExcel( selectedARs );
    }
};
/**
 *
 * @param {Object} soainput input for soa call
 * @param {Object} mselected selected element
 * @param {Object} ctxvar context
 * @param {Object} inputRevs input revisions
 */
function setVisibility( soainput, mselected, ctxvar, inputRevs ) {
    var allowedTypes = [];
    var t = null;
    var validObjects = [];
    if( inputRevs[ 0 ] === null ) {
        appCtxSvc.updateCtx( ctxvar, true );
        for( var i = 0; i < mselected.length; i++ ) {
            appCtxSvc.updateCtx( ctxvar, true );
            validObjects.push( mselected[ i ] );
            appCtxSvc.updateCtx( 'validObjects', validObjects );
        }
    } else {
        soaSvc
            .post( 'ValidationContract-2015-03-VCManagement', 'getContractDefnDetails', soainput )
            .then(
                function( response ) {
                    for( var i = 0; i < response.contractDefnOutputs.length; i++ ) {
                        if( response.contractDefnOutputs[ i ].groupName === 'input' ) {
                            for( var j = 0; j < response.contractDefnOutputs[ i ].contractDefnSections.length; j++ ) {
                                for( var k = 0; k < response.contractDefnOutputs[ i ].contractDefnSections[ j ].objectInfos.length; k++ ) {
                                    allowedTypes
                                        .push( response.contractDefnOutputs[ i ].contractDefnSections[ j ].objectInfos[ k ].type );
                                }
                            }
                        }
                    }
                    for( i = 0; i < mselected.length; i++ ) {
                        if( mselected[ i ].props.awb0Archetype ) {
                            t = cdm.getObject( mselected[ i ].props.awb0Archetype.dbValues[ 0 ] );
                        }
                        if( allowedTypes.length > 0 && t !== null && allowedTypes.indexOf( t.type ) > -1 ) {
                            appCtxSvc.updateCtx( ctxvar, true );
                            validObjects.push( mselected[ i ] );
                            appCtxSvc.updateCtx( 'validObjects', validObjects );
                        }
                    }
                } );
    }
}

/**
 *
 * @param {Object} object s
 * @param {Object} selectedObjs selected Objects
 */
function getTraceLinks( object, selectedObjs ) {
    appCtxSvc.unRegisterCtx( 'traceLinks' );

    var traceLinks = [];
    for( var i = 0; i < selectedObjs.length; ++i ) {
        if( selectedObjs[ i ].props.crt1AddedToAnalysisRequest && selectedObjs[ i ].props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
            traceLinks.push( selectedObjs[ i ] );
        }
    }

    appCtxSvc.updateCtx( 'traceLinks', traceLinks );
}

/**
 * Return string that determines the usecase is dataset or not
 *
 * @param {object} data - Data of ViewModelObject
 * @returns {string} addButtonLoc
 */
export let identifyFromWhereAddButtonIsFired = function( data ) {
    var addButtonLoc;
    if( data.datasetType && data.datasetType.dbValue === null || typeof data.datasetType.dbValue === 'undefined' ) {
        addButtonLoc = 'notADataset';
    } else {
        addButtonLoc = 'dataset';
    }
    return addButtonLoc;
};

export let addValidationResultsInput = function( data, uid ) {
    var vcRevision = cdm.getObject( uid );
    appCtxSvc.unRegisterCtx( 'vcRevision' );
    appCtxSvc.registerCtx( 'vcRevision', vcRevision );
    var input = [];
    var inputData;
    if( data.selectedTab.panelId === 'newTabPageSub' ) {
        inputData = {
            vcRevision: vcRevision,
            traceLinkType: 'Crt0ValidationLink',
            resultObjects: [ data.createdObject ]
        };
        input.push( inputData );
    } else {
        inputData = {
            vcRevision: vcRevision,
            traceLinkType: 'Crt0ValidationLink',
            resultObjects: data.sourceObjects
        };
        input.push( inputData );
    }
    return input;
};

var showMessage = function( ARs, studies, data, objects ) {
    if( ARs.length > 1 && studies.length >= 1 ) {
        mesgSvc.showWarning( data.i18n.IgnoreStudyMsg );
        return ARs;
    } else if( ARs.length === 1 && studies.length > 1 ) {
        mesgSvc.showWarning( data.i18n.IgnoreARMsg );
        return studies;
    } else if( ARs.length === 1 && studies.length === 1 ) {
        mesgSvc.showError( data.i18n.CompareReportNotCreatedErr );
        return null;
    } else if( ARs.length + studies.length === 1 ) {
        mesgSvc.showError( data.i18n.InvalidComparisonWarning.replace( '{0}', objects ) );
        return null;
    } else if( ARs.length > 0 ) {
        return ARs;
    } else if( studies.length > 0 ) {
        return studies;
    }
};

export let filterStudiesFromAR = function( data ) {
    var mselected = appCtxSvc.getCtx( 'mselected' );
    var ARs = [];
    var studies = [];
    var objects = '';
    for( var i = 0; mselected && i < mselected.length; i++ ) {
        if( i === mselected.length - 1 ) {
            objects = objects.concat( mselected[ i ] );
        } else {
            objects = objects.concat( mselected[ i ], ', ' );
        }
        if( cmm.isInstanceOf( 'Crt0VldnContractRevision', mselected[ i ].modelType ) ) {
            if( !cmm.isInstanceOf( 'Crt0StudyRevision', mselected[ i ].modelType ) ) {
                ARs.push( mselected[ i ] );
            } else {
                studies.push( mselected[ i ] );
            }
        }
    }
    return showMessage( ARs, studies, data, objects );
};

export let getGenerateChangeReportsInput = function( reportdefinitions, selections ) {
    var inContextReports = [];
    var soaInput = [];
    var reportDefObj = null;
    for( var i = 0; i < reportdefinitions.length; i++ ) {
        inContextReports.push( reportdefinitions[ i ].reportdefinition );
    }
    if( inContextReports.length > 0 ) {
        reportDefObj = cdm.getObject( inContextReports[ 0 ].uid );
        soaInput.push( {
            criteriaNames: [ 'reportType', 'reportDefUID' ],
            criteriaValues: [ 'Compare', reportDefObj.uid ],
            rdTag: reportDefObj,
            contextObjects: selections
        } );
    }
    return soaInput;
};

var buildUrlFromFileTicket = function( fileTicket, openFileName ) {
    var fileName = '';
    if( openFileName && openFileName.length > 0 ) {
        fileName = encodeURIComponent( openFileName );
    } else {
        fileName = fmsUtils.getFilenameFromTicket( fileTicket );
    }

    var downloadUri = 'fms/fmsdownload/' + fileName + '?ticket=' + encodeURIComponent( fileTicket );
    var baseUrl = browserUtils.getBaseURL();
    var urlFullPath = baseUrl + downloadUri;
    return urlFullPath;
};
/**
 *
 * @param {String} fileURL fileUrl
 * @param {Object} data data
 */
function processResponse( fileURL, data ) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if( xmlhttp.readyState === 4 && xmlhttp.status === 200 ) {
            var printWindow = window.open( '', 'PrintWin' );
            if( printWindow && printWindow.top ) {
                printWindow.document.open();
                var div = printWindow.document.createElement( 'div' );
                if( div ) {
                    div.setAttribute( 'id', 'compareReportId' );
                    var compareReport = '<div>' + xmlhttp.responseText + '</div>';
                    div.innerHTML = compareReport;
                    printWindow.document.appendChild( div );
                }
                printWindow.document.close();
            } else {
                mesgSvc.showWarning( data.i18n.ArChangeReportWarning );
            }
        }
    };
    xmlhttp.open( 'GET', fileURL, false );
    xmlhttp.send();
}

export let processGenerateResponse = function( response, data ) {
    for( var i = 0; i < response.transientFileTicketInfos.length; i++ ) {
        var fileTicket = null;
        fileTicket = response.transientFileTicketInfos[ i ].ticket;
        if( fileTicket !== null ) {
            var fileURL = buildUrlFromFileTicket( fileTicket );
            processResponse( fileURL, data );
        }
    }
};

/**
 * Sets the vcObjectTarget in ctx with the Validation Contract Object
 */
export let setVCTargetObject = function() {
    appCtxSvc.unRegisterCtx( 'vcObjectTarget' );
    var selected = appCtxSvc.getCtx( 'selected' );
    var pselected = appCtxSvc.getCtx( 'pselected' );
    if( cmm.isInstanceOf( 'Crt0VldnContractRevision', selected.modelType ) ) {
        appCtxSvc.registerCtx( 'vcObjectTarget', selected );
    } else {
        appCtxSvc.registerCtx( 'vcObjectTarget', pselected );
    }
};

/**
 * Check if the parameter is set as input or output
 *
 * @param {Object} vmo the view model
 * @Returns {boolean} true is set to input or output
 */
export let isParameterSetInputOrOutput = function( vmo ) {
    if( _isAROrStudyOpenInACE() ) {
        appCtxSvc.updatePartialCtx( 'decoratorToggle', true );
        if( vmo.props.crt1IsAddedToVR && vmo.props.crt1IsAddedToVR.dbValues &&
            vmo.props.crt1IsAddedToVR.dbValues.length && vmo.props.crt1IsAddedToVR.dbValues[ 0 ] === '1' ) {
            return true;
        }
    }
    return false;
};

/**
 * Update column filters to filter content table
 */
export let getColumnFilters1 = function( data ) {
    if( data.i18n ) {
        appCtxSvc.registerCtx( 'output', data.i18n.output );
    }
    if( data && data.eventData && data.eventData.refreshParamTable && data.eventData.refreshParamTable === true ) {
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestStudyRevision') > -1 &&
    data && data.eventData && data.eventData.refreshBOMTable && data.eventData.refreshBOMTable === true ) {
        eventBus.publish( 'testAndProdBOMTableProvider.refreshTable' );
    }
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestRunRevision') > -1 &&
    data && data.eventData && data.eventData.refreshBOMTable && data.eventData.refreshBOMTable === true ) {
        eventBus.publish( 'testEBOMTableProvider.refreshTable' );
    }
    if( (appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestStudyRevision') > -1 ||
    appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestRunRevision') > -1) &&
    data && data.eventData && data.eventData.refreshTPTable && data.eventData.refreshTPTable === true ) {
        eventBus.publish( 'IAV1ContentsTPTable.refreshTable' );
    }
    if( (appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestStudyRevision') > -1 ||
    appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestRunRevision') > -1) &&
    data && data.eventData && data.eventData.refreshTMTable && data.eventData.refreshTMTable === true ) {
        eventBus.publish( 'IAV1ContentsTMTable.refreshTable' );
    }
    if( appCtxSvc.ctx.columnTableColumnFilters ) {
        data.columnProviders.contentsTableColumnProvider.columnFilters = appCtxSvc.ctx.columnTableColumnFilters;
    }
    return data.columnProviders.contentsTableColumnProvider.columnFilters;
};

/*
 * Corrects selection to be attribute instead of proxy object
 */
export let clearContentsTableProvider = function( dataProvider ) {
    //clear contentsTableProvider if any other object other than contents is selected
    var selection = selectionService.getSelection();
    if( appCtxSvc.ctx.xrtSummaryContextObject && selection.selected[ 0 ] && appCtxSvc.ctx.xrtSummaryContextObject.type !== selection.selected[ 0 ].type && dataProvider.selectNone ) {
        dataProvider.selectNone();
    }
};
export let clearContentsTableProviderfromTreeTable = function( data ) {
    //clear contentsTableProvider if any object from tree table is selected
    var selection = selectionService.getSelection();
    if( ( data.dataProviders && data.dataProviders.contentsTableProvider &&
        data.dataProviders.contentsTableProvider.selectedObjects[ 0 ] && selection.selected[ 0 ] &&
        data.dataProviders.contentsTableProvider.selectedObjects[ 0 ] !== selection.selected[ 0 ] &&
        selection.selected[ 0 ].type !== data.dataProviders.contentsTableProvider.selectedObjects[ 0 ].type ) ||
        ( data.dataProviders && data.dataProviders.contentsTableProvider && data.dataProviders.contentsTableProvider.selectedObjects[ 0 ] &&
            selection.selected[ 0 ] && data.dataProviders.contentsTableProvider.selectedObjects[ 0 ] !== selection.selected[ 0 ] &&
            selection.selected[ 0 ].isLeaf ) ) {
        if( appCtxSvc.ctx.xrtSummaryContextObject && selection.selected[ 0 ] && appCtxSvc.ctx.xrtSummaryContextObject.type !== selection.selected[ 0 ].type && data.dataProviders ) {
            var providers = data.dataProviders.contentsTableProvider;
            providers.selectNone();
        }
    }
};
export let registerTrAndSrProviders = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when SR/TR is selected, register their provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.ObjectSet_2_Provider && data.dataProviders.ObjectSet_2_Provider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call changeSelection to update selection as it becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};

export let registerEventProvider = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when Event/TE is selected, register its provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.ObjectSet_1_Provider && data.dataProviders.ObjectSet_1_Provider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call change selection to update selection as selection becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};

export let registerTMProvider = function( data ) {
    if(appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
    appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Crt0VldnContractRevision') > -1){
    var selection = selectionService.getSelection();
    // when SR/TR is selected, register their provider in ctx so that later it can be cleared
    if( data.dataProviders && data.dataProviders.contentsTMTableProvider && data.dataProviders.contentsTMTableProvider.selectedObjects.length !== 0 ) {
        var provider = data.dataProviders;
        appCtxSvc.registerCtx( 'recentProviders', provider );
    } else if(selection.selected[0].modelType.typeHierarchyArray.indexOf('Crt0VldnContractRevision') > -1) {
        //again call change selection to update selection as selection becomes VR by default
        eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
    }
}
};

export let registerTPProvider = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when TP is selected, register its provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.contentsTPTableProvider && data.dataProviders.contentsTPTableProvider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call change selection to update selection as selection becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};
export let registertestAndProdBOMTableProvider = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when testBOM/prodBOM is selected, register their provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.testAndProdBOMTableProvider && data.dataProviders.testAndProdBOMTableProvider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call change selection to update selection as selection becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};
export let registertestEBOMTableProvider = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when phyBOM is selected, register its provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.testEBOMTableProvider && data.dataProviders.testEBOMTableProvider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call change selection to update selection as selection becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};
export let registershowAttrProxyTableProvider = function( data ) {
    if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' && appCtxSvc.ctx.xrtSummaryContextObject &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var selection = selectionService.getSelection();
        // when phyBOM is selected, register its provider in ctx so that later it can be cleared
        if( data.dataProviders && data.dataProviders.showAttrProxyTableProvider && data.dataProviders.showAttrProxyTableProvider.selectedObjects.length !== 0 ) {
            var provider = data.dataProviders;
            appCtxSvc.registerCtx( 'recentProviders', provider );
        } else if( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
            //again call change selection to update selection as selection becomes VR by default
            eventBus.publish( 'contentsTableProvider.selectionChangeEvent' );
        }
    }
};

/**
 * For contents table on TR & TE, no duplicates from tree tables should be visible
 * @param {appCtx} ctx the application context
 * @returns {string} the exclude types
 */
export let getExcludeTypeFilter = function( ctx ) {
    var excludeTypeFilter = null;
    if( ctx.xrtSummaryContextObject && ctx.xrtSummaryContextObject.modelType && ctx.xrtSummaryContextObject.modelType.typeHierarchyArray && ctx.xrtPageContext && ctx.xrtPageContext.primaryXrtPageID && ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview')
    {
        if(ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1)
        {
            excludeTypeFilter = 'IAV0TestStepRevision:IAV0TestRequestRevision:IAV0AbsReqmtRevision:IAV0TestProcedurRevision:Part Revision:Design Revision';
        }
        else if(ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('IAV0TestRunRevision' ) > -1 )
        {
            excludeTypeFilter = 'IAV0TestStepRevision:IAV0TestRequestRevision:IAV0AbsReqmtRevision:IAV0TestProcedurRevision:PhysicalPartRevision';
        }
    }
    return excludeTypeFilter;
};

/**
 *
 * @param {Object} eventData EventData
 */
function _autoAddChildToVR( eventData ) {
    appCtxSvc.registerCtx( 'elementAddedToVR', true );
    var state = appCtxSvc.getCtx( 'state' );
    var arObject = cdm.getObject( state.params.uid );
    var elementInputs = [];
    var elementInput = {};
    var succMsg = '';
    // add child / sibling inside structure
    if( (eventData.objectsToSelect && eventData.objectsToSelect.length === 1) || (eventData.objectToSelect && eventData.objectToSelect.rootElement) ) {
        if(eventData.objectsToSelect){
            var manageARElements = eventData.objectsToSelect[0];
        }else{
            manageARElements = eventData.objectToSelect.rootElement;
            if( manageARElements.modelType.typeHierarchyArray.indexOf( 'Sam1AsMaintainedElement' ) > -1 ) {
                // Add ItemRevision.
                var underlyingObj = eventData.objectToSelect.rootElement.props.awb0UnderlyingObject;

                if( underlyingObj && underlyingObj.dbValues.length > 0 && underlyingObj.uiValues.length > 0 ) {
                    var objName = underlyingObj.uiValues[ 0 ];
                    var physicalPartItemRev = {
                        type: "PhysicalPartRevision",
                        uid: underlyingObj.dbValues[ 0 ],
                        props: { object_string: { dbValues: [ objName ] } }
                    };
                    manageARElements = physicalPartItemRev;
                }
            }
        }
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
    } else {
        manageARElements = eventData.objectsToSelect;
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
        }
            if( manageARElements.length === 1 ) {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ];
            } else {
                succMsg += manageARElements[ i ].props.object_string.dbValues[ 0 ] + ',';
            }
        }
    var input = [ {
        clientId: 'ActiveWorkSpace',
        verificationRequest: {
            type: arObject.type,
            uid: arObject.uid
        },
        data: [ {
            manageAction: 'addObject',
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
    // call manage analysis SOA
    manageVerificationService.callManageVerificationSOA( input, pref );
}

/**
 *
 * @param {Object} eventData EventData
 */
function _autoAddSiblingToVR( eventData ) {
    appCtxSvc.registerCtx( 'elementAddedToVR', true );
    //save working context
    var uid = eventData.objectToSelect.rootElement.props.awb0BreadcrumbAncestor.dbValues[ 0 ];
    soaSvc.post( 'Internal-ActiveWorkspaceBom-2020-05-OccurrenceManagement',
        'saveWorkingContext', {

            workingContexts: [ {
                uid: uid,
                type: 'Awb0SavedBookmark'
            } ]
        } ).then(
        function() {} );

    //call this function to call manage analysis SOA
    _autoAddChildToVR( eventData );
}

export default exports = {
    openObject,
    populateSavedBookmark,
    setCCObjectForVR,
    processCreatedObject,
    arOccurenceFilter,
    studyOccurenceFilter,
    isElementAddedToAR,
    isElementAddedToVR,
    exportToExcel,
    identifyFromWhereAddButtonIsFired,
    addValidationResultsInput,
    filterStudiesFromAR,
    getGenerateChangeReportsInput,
    processGenerateResponse,
    setVCTargetObject,
    isParameterSetInputOrOutput,
    getColumnFilters1,
    clearContentsTableProvider,
    clearContentsTableProviderfromTreeTable,
    registerTrAndSrProviders,
    registerEventProvider,
    registerTMProvider,
    registerTPProvider,
    registertestAndProdBOMTableProvider,
    registertestEBOMTableProvider,
    registershowAttrProxyTableProvider,
    getExcludeTypeFilter,
    setInputDirectionForParamterObj
};
app.factory( 'analysisRequestUtils', () => exports );
