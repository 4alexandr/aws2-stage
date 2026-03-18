// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/CadBomOccurrenceAlignmentService
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import LocationNavigationService from 'js/locationNavigation.service';
import cdmSvc from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import dataManagementService from 'soa/dataManagementService';
import occurrenceManagementServiceManager from 'js/occurrenceManagementServiceManager';
import CadBomOccAlignmentCheckService from 'js/CadBomOccAlignmentCheckService';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';
import localStorage from 'js/localStorage';
import _ from 'lodash';
import CBAImpactAnalysisService from 'js/CBAImpactAnalysisService';
import CadBomAlignmentUtil from 'js/CadBomAlignmentUtil';
import CadBomOccurrenceAlignmentUtil from 'js/CadBomOccurrenceAlignmentUtil';
import 'js/viewModelObjectService';
import cbaRelatedObjectService from 'js/cbaRelatedObjectService';
import cbaOpenInViewPanelService from 'js/cbaOpenInViewPanelService';
import cbaObjectTypeService from 'js/cbaObjectTypeService';
import cbaConstants from 'js/cbaConstants';

let exports = {};
let _contentUnloadedListener = null;

/**
 * Load CBA data before page launch
 *
 * @returns {Promise} Promise after data load is done
 */
export let loadCBAData = function() {
    let defer = AwPromiseService.instance.defer();

    let localStorageAlignmentSettingInfo = localStorage.get( 'AlignmentCheckSettingInfo' );
    if( localStorageAlignmentSettingInfo ) {
        let alignmentCheckSettingInfoValue = JSON.parse( localStorageAlignmentSettingInfo );
        if( alignmentCheckSettingInfoValue ) {
            appCtxSvc.updatePartialCtx( 'cbaContext.alignmentCheckContext.alignmentCheckSettingInfo', alignmentCheckSettingInfoValue );
        }
    }

    appCtxSvc.ctx.taskUI = {};

    localeService.getLocalizedText( 'CadBomAlignmentConstants', 'Awb0EntCBAModuleTitle' ).then( function( result ) {
        appCtxSvc.ctx.taskUI.moduleTitle = result;
    } );

    localeService.getLocalizedText( 'CadBomAlignmentConstants', 'Awb0EntCBAAlignTaskTitle' ).then( function( result ) {
        appCtxSvc.ctx.taskUI.taskTitle = result;
    } );

    CadBomOccurrenceAlignmentUtil.registerSplitViewMode();
    appCtxSvc.updatePartialCtx( 'cbaContext.isCBAFirstLaunch', true );

    appCtxSvc.ctx.skipAutoBookmark = true;
    // CBA don't need to show the Right Wall.
    appCtxSvc.ctx.hideRightWall = true;
    let toParams;
    let mselected = appCtxSvc.getCtx( 'mselected' );

    if ( mselected && mselected.length !== 0 && mselected[0].type === 'Fnd0Message' ) {
        toParams = CadBomAlignmentUtil.getURLParametersFromDataset( appCtxSvc.ctx.mselected[0] );
    } else {
        toParams = appCtxSvc.getCtx( 'state.params' );
    }
    let uidForLoadObject = [];
    if ( toParams.uid ) {
        uidForLoadObject.push( toParams.uid );
    }

    if ( toParams.uid2 ) {
        uidForLoadObject.push( toParams.uid2 );
    }

    let objectCount = uidForLoadObject.length;
    if ( toParams.spci_uid ) {
        uidForLoadObject.push( toParams.spci_uid );
    }

    if ( toParams.tpci_uid ) {
        uidForLoadObject.push( toParams.tpci_uid );
    }

    occurrenceManagementServiceManager.initializeOccMgmtServices();
    CadBomOccAlignmentCheckService.initializeService();
    _registerListeners();

    dataManagementService.loadObjects( uidForLoadObject ).then( function () {
        let result = {};
        result.data = [];
        for ( let i = 0; i < objectCount; i++ ) {
            let modelObject = cdmSvc.getObject( uidForLoadObject[i] );
            result.data.push( modelObject );
        }

        if ( objectCount === 2 ) {
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE, result.data[0] );
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE, result.data[1] );
        } else if ( toParams.uid ) {
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE, result.data[0] );
        } else if ( toParams.uid2 ) {
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE, result.data[0] );
        }
        defer.resolve( result );
    } );
    return defer.promise;
};

/**
 * Clean up CBA specific variable from context
 */
let _cleanupCBAVariableFromCtx = function() {
    let doNotClearCBACtxVars = appCtxSvc.getCtx( cbaConstants.CTX_PATH_DO_NOT_CLEAR_CBA_VARS );
    if( doNotClearCBACtxVars ) {
        appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_DO_NOT_CLEAR_CBA_VARS, false );
        return;
    }
    occurrenceManagementServiceManager.destroyOccMgmtServices();
    appCtxSvc.unRegisterCtx( 'modelObjectsToOpen' );
    CadBomOccurrenceAlignmentUtil.unRegisterSplitViewMode();
    appCtxSvc.unRegisterCtx( 'taskUI' );
    appCtxSvc.unRegisterCtx( 'cbaContext' );
    appCtxSvc.unRegisterCtx( 'aceActiveContext' );
    appCtxSvc.updateCtx( 'hideRightWall', undefined );
    _unRegisterListeners();
    CadBomOccAlignmentCheckService.unRegisterService();

    appCtxSvc.updatePartialCtx( 'taskbarfullscreen', false );
};

/**
 * Unregister listeners
 */
let _unRegisterListeners = function() {
    if( _contentUnloadedListener ) {
        eventBus.unsubscribe( _contentUnloadedListener );
        _contentUnloadedListener = null;
    }
};

/**
 * Register listeners
 */
let _registerListeners = function() {
    // Register Page Unload listener
    if( !_contentUnloadedListener ) {
        _contentUnloadedListener = eventBus.subscribe( 'cbaPage.contentUnloaded', _cleanupCBAVariableFromCtx, 'CadBomOccurrenceAlignmentService' );
    }
};

/**
 * Checks if Part/Design selected from Overview tab
 * @param {String} type - type of selected item
 * @return {Boolean} true if type is Fnd0AlignedPart or Fnd0AlignedDesign
 */
let _isAlignedDesignOrPartSelected = function( type ) {
    return type === 'Fnd0AlignedPart' || type === 'Fnd0AlignedDesign';
};

/**
 * get Part-CAD aligned object
 * @param {Object} firstObject - single selected object from CBA Page
 * @return {Object} - if firstObject is Part then return it's Primary Design and if firstObject is Design then return it's Part if that is the only aligned part to the selected Design
 */
export let getAlignedObject = function( firstObject ) {
    let secondObject;
    let deferred = AwPromiseService.instance.defer();
    let objectList = [ firstObject ];

    let promise = cbaOpenInViewPanelService.getProviderAndSectionName( firstObject );
    promise.then( function( resultData ) {
        cbaRelatedObjectService.getRelatedModelObjects( firstObject, resultData.providerName, true ).then( function( modelObjectsArray ) {
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_LINKEDBOM_RELATEDMODELOBJECTS, modelObjectsArray );

            if( modelObjectsArray && modelObjectsArray.length >= 1 ) {
                let relatedModelObject = modelObjectsArray[ 0 ];
                if( relatedModelObject ) {
                    if( CBAImpactAnalysisService.isImpactAnalysisMode() ) {
                        secondObject = cdmSvc.getObject( relatedModelObject.uid );
                        deferred.resolve( secondObject );
                    } else {
                        cbaObjectTypeService.getDesignsAndParts( objectList ).then( function( resultData ) {
                            if( modelObjectsArray.length === 1 ) {
                                if( resultData.designTypes.includes( firstObject ) || resultData.partTypes.includes( firstObject ) ) {
                                    secondObject = cdmSvc.getObject( relatedModelObject.props.fnd0UnderlyingObject.dbValues[ 0 ] );
                                } else if( resultData.productTypes.includes( firstObject ) ) {
                                    secondObject = cdmSvc.getObject( relatedModelObject.uid );
                                }
                            } else {
                                if( resultData.partTypes.includes( firstObject ) ) {
                                    _.forEach( modelObjectsArray, function( modelObject ) {
                                        if( modelObject.props.fnd0IsPrimary.dbValues[ 0 ] === '1' ) {
                                            secondObject = cdmSvc.getObject( modelObject.props.fnd0UnderlyingObject.dbValues[ 0 ] );
                                        }
                                    } );
                                }
                            }

                            deferred.resolve( secondObject );
                        } );
                    }
                }
            } else {
                deferred.resolve( secondObject );
            }
        } );
    } );

    return deferred.promise;
};

/**
 * Get Paramaters for Source and Target from selected objects
 * @param {ObjectArray} selectedObjects - Selected objects from UI
 * @return {Object} - Parameters
 */
let _getParamsFromSelectedObjects = function( selectedObjects ) {
    let deferred = AwPromiseService.instance.defer();
    let sourceObject;
    let targetObject;
    let toParams = {};
    let promise = cbaObjectTypeService.getDesignsAndParts( selectedObjects );
    promise.then( function( resultData ) {
    let invalidTypes = [];
    _.forEach( selectedObjects, function( selectedObject ) {
        if( !sourceObject && resultData.designTypes.includes( selectedObject ) ) {
            sourceObject = selectedObject;
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE, sourceObject );
        } else if( !targetObject && ( resultData.partTypes.includes( selectedObject ) || resultData.productTypes.includes( selectedObject ) ) ) {
            targetObject = selectedObject;
            appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE, targetObject );
        } else {
            invalidTypes.push( selectedObject );
        }
    } );

    if( invalidTypes.length !== 0 ) {
        CadBomOccurrenceAlignmentUtil.getErrorMessage( sourceObject, targetObject, invalidTypes ).then( function( errorText ) {
            messagingService.showError( errorText );
        } );
    } else {
        if ( sourceObject ) {
            toParams.src_uid = sourceObject.uid;
            toParams.uid = sourceObject.uid;
            toParams.spci_uid = '';
        }
        if ( targetObject ) {
            toParams.trg_uid = targetObject.uid;
            toParams.uid2 = targetObject.uid;
            toParams.tpci_uid = '';
        }
        if( appCtxSvc.getCtx( 'aceActiveContext.context' ) ) {
            if( appCtxSvc.getCtx( 'aceActiveContext.context.elementToPCIMap' ) ) {
                /**
                 * While launching CBA from within saved working context, we want to use saved
                 * configuration.
                 */

                if ( sourceObject ) {
                    toParams.spci_uid = _getPCIForSelection( sourceObject );
                }
                if ( targetObject ) {
                    toParams.tpci_uid = _getPCIForSelection( targetObject );
                }
            } else {
                /**
                 * While launching CBA from within ACE, we would have same configuration for both source and
                 * target structure.
                 */
                let _contentPCIUid = appCtxSvc.getCtx( 'aceActiveContext.context.productContextInfo.uid' );
                if ( sourceObject ) {
                    toParams.spci_uid = _contentPCIUid;
                }
                if ( targetObject ) {
                    toParams.tpci_uid = _contentPCIUid;
                }
            }
        }
        deferred.resolve( toParams );
    }
    } );
    return deferred.promise;
};

/**
 * Get state params
 *
 * @returns {Promise} The promise after fetching state parameters
 */
export let getStateParams = function() {
    let deferred = AwPromiseService.instance.defer();

    let toParams = {};
    let _mselected = appCtxSvc.getCtx( 'mselected' );
    let isMultipleSelections = false;
    let selectedObjects = [];
    let firstObject;
    let secondObject;
    if( _mselected && _mselected.length !== 0 && !CadBomAlignmentUtil.isCBARefreshCase() ) {
        if( _mselected[ 0 ].type === 'Fnd0Message' ) {
            let toParams = CadBomAlignmentUtil.getURLParametersFromDataset( _mselected[ 0 ] );
            deferred.resolve( toParams );
        } else {
            if (CadBomAlignmentUtil.isNonCBASplitLocation()) {
                let selectedObjectInSplitMode=[];
                if(!appCtxSvc.ctx.cbaContext){
                    let viewKeys = appCtxSvc.getCtx(cbaConstants.CTX_PATH_SPLIT_VIEW_VIEWKEYS);
                    selectedObjectInSplitMode.push(appCtxSvc.getCtx(viewKeys[0]+'.selectedModelObjects'));
                    let modelObject = appCtxSvc.getCtx(viewKeys[1]+'.selectedModelObjects');
                    for(let i=0;i< modelObject.length;i++){
                        selectedObjectInSplitMode[0].push(modelObject[i]);
                    }
                   appCtxSvc.updatePartialCtx('mselected',selectedObjectInSplitMode[0]);
                }
            }
            if( appCtxSvc.ctx.mselected.length >= 2 || _isAlignedDesignOrPartSelected( appCtxSvc.ctx.mselected[ 0 ].type ) ) {
                isMultipleSelections = true;
            }

            firstObject = appCtxSvc.ctx.mselected[ 0 ];
            if( firstObject.props ) {
                if( firstObject.props.awb0UnderlyingObject !== undefined ) { // We got an Awb0Element as input
                    firstObject = cdmSvc.getObject( firstObject.props.awb0UnderlyingObject.dbValues[ 0 ] );
                } else if( firstObject.props.fnd0UnderlyingObject !== undefined ) { // We got Fnd0AlignedDesign/Fnd0AlignedPart as input
                    firstObject = cdmSvc.getObject( firstObject.props.fnd0UnderlyingObject.dbValues[ 0 ] );
                }
            }
            selectedObjects.push( firstObject );

            if( !isMultipleSelections ) { // For 1 selection
                getAlignedObject( firstObject ).then( function( secondObject ) {
                    if( secondObject ) {
                        selectedObjects.push( secondObject );
                    }
                    _getParamsFromSelectedObjects( selectedObjects ).then( function( toParams ) {
                        deferred.resolve( toParams );
                    } );
                } );
            } else { // For multiple selections
                if ( appCtxSvc.ctx.mselected.length === 2 || _isAlignedDesignOrPartSelected( appCtxSvc.ctx.mselected[0].type ) ) { // For 2 selections
                    secondObject = appCtxSvc.ctx.mselected.length === 2 ? appCtxSvc.ctx.mselected[1] : CadBomAlignmentUtil.getPrimarySelection();
                    if ( secondObject.props && secondObject.props.awb0UnderlyingObject !== undefined ) { // We got an Awb0Element as input
                        secondObject = cdmSvc.getObject( secondObject.props.awb0UnderlyingObject.dbValues[0] );
                    }
                    selectedObjects.push( secondObject );
                    _getParamsFromSelectedObjects( selectedObjects ).then( function ( toParams ) {
                        deferred.resolve( toParams );
                    } );
                }
                else {
                    AwPromiseService.instance.all( {
                        uiMessages: localeService.getTextPromise( 'CadBomAlignmentMessages' )
                    } ).then( function ( localizedText ) {
                        let deferred = AwPromiseService.instance.defer();
                        let errorText;
                        errorText = localizedText.uiMessages.InvalidObjectsForAlignment;
                        messagingService.showError( errorText );
                        deferred.resolve();
                    } );
                }
            }
        }
    } else {
        let stateParams = appCtxSvc.getCtx( 'state.params' );
        if( stateParams ) {
            let sourceUID = stateParams.src_uid ? stateParams.src_uid : stateParams.uid;
            let targetUID = stateParams.trg_uid ? stateParams.trg_uid : stateParams.uid2;

            let sourcePCIUID = stateParams.pci_uid ? stateParams.pci_uid : stateParams.spci_uid;
            let targetPCIUID = stateParams.pci_uid2 ? stateParams.pci_uid2 : stateParams.tpci_uid;

            if( sourceUID && targetUID ) {
                toParams.src_uid = sourceUID;
                toParams.trg_uid = targetUID;

                toParams.uid = sourceUID;
                toParams.uid2 = targetUID;

                toParams.spci_uid = sourcePCIUID;
                toParams.tpci_uid = targetPCIUID;
                appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE, sourceUID );
                appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE, targetUID );
            } else if( sourceUID ) {
                toParams.src_uid = sourceUID;
                toParams.uid = sourceUID;
                toParams.spci_uid = sourcePCIUID;
                appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_SRC_STRUCTURE, sourceUID );
            } else {
                toParams.trg_uid = targetUID;
                toParams.uid2 = targetUID;
                toParams.tpci_uid = targetPCIUID;
                appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_TRG_STRUCTURE, targetUID );
            }
        }
        deferred.resolve( toParams );
    }
    return deferred.promise;
};

/**
 * Launch CBA Page
 */
export let launchCBA = function() {
    exports.getStateParams().then( function( result ) {
        appCtxSvc.updatePartialCtx( 'cbaContext.resetTreeExpansionState', true );
        let toParams = result;
        let transitionTo = 'CADBOMAlignment';
        LocationNavigationService.instance.go( transitionTo, toParams );
    } );
};

/**
 * @param {IModelObject} modelObject - The modelObject to access.
 *
 * @returns {String} UID of the immediate parent of the given modelObject based on 'awb0BreadcrumbAncestor' or
 *          'awb0Parent' (or NULL if no parent found).
 */
function _getParentUid( modelObject ) {
    if( modelObject && modelObject.props ) {
        let props = modelObject.props;
        let uid;

        if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmSvc.isValidObjectUid( uid ) ) {
            return uid;
        }
    }
    return null;
}

/**
 * @param {Object} selectedObject Object representing selection made by the user
 * @returns {string} Uid of the productContext corresponding to the selected object if it is available in the
 *         elementToPCIMap; null otherwise.
 */
let _getPCIForSelection = function( selectedObject ) {
    let _elementToPCIMap = appCtxSvc.getCtx( 'aceActiveContext.context.elementToPCIMap' );
    if( _elementToPCIMap ) {
        let parentObject = selectedObject;
        do {
            if( _elementToPCIMap[ parentObject.uid ] ) {
                return _elementToPCIMap[ parentObject.uid ];
            }
            let parentUid = _getParentUid( parentObject );
            parentObject = cdmSvc.getObject( parentUid );
        } while( parentObject );
    }
    return null;
};

/**
 * Create occurrence alignment input
 *
 * @returns {Array} The list of alignment input object
 */
export let getOccAlignmentInput = function() {
    let alignmentInput = [];

    if( appCtxSvc.ctx && appCtxSvc.ctx.CBASrcContext && appCtxSvc.ctx.CBATrgContext ) {
        let sourceSelectedObjects = appCtxSvc.ctx.CBASrcContext.selectedModelObjects;
        let targetSelectedObjects = appCtxSvc.ctx.CBATrgContext.selectedModelObjects;
        if( sourceSelectedObjects && targetSelectedObjects ) {
            for( let sourceIndex = 0; sourceIndex < sourceSelectedObjects.length; ++sourceIndex ) {
                let sourceObj = sourceSelectedObjects[ sourceIndex ];

                for( let targetIndex = 0; targetIndex < targetSelectedObjects.length; ++targetIndex ) {
                    let targetObj = targetSelectedObjects[ targetIndex ];

                    let partDesOccAlignmentData = {};

                    partDesOccAlignmentData.designOccurrence = sourceObj;
                    partDesOccAlignmentData.partOccurrence = targetObj;

                    let srcParentModelObject = cdmSvc.getObject( sourceObj.props.awb0Parent.dbValues[0] );
                    partDesOccAlignmentData.designContext = srcParentModelObject;

                    let trgParentModelObject = cdmSvc.getObject( targetObj.props.awb0Parent.dbValues[0] );
                    partDesOccAlignmentData.partContext = trgParentModelObject;

                    alignmentInput.push( partDesOccAlignmentData );
                }
            }
        }
    }
    return alignmentInput;
};

/**
 * Create occurrence unalignment input
 *
 * @returns {Array} The list of un-alignment input object
 */
export let getOccUnAlignmentInput = function() {
    let unAlignmentInput = [];

    if( appCtxSvc.ctx && appCtxSvc.ctx.CBASrcContext && appCtxSvc.ctx.CBATrgContext ) {
        let sourceSelectedObjects = appCtxSvc.ctx.CBASrcContext.selectedModelObjects;
        let targetSelectedObjects = appCtxSvc.ctx.CBATrgContext.selectedModelObjects;
        if( sourceSelectedObjects && targetSelectedObjects ) {
            if( appCtxSvc.ctx.CBASrcContext.isRowSelected === false ) {
                for( let targetIndex = 0; targetIndex < targetSelectedObjects.length; ++targetIndex ) {
                    let targetObj = targetSelectedObjects[ targetIndex ];

                    let partDesOccUnAlignmentData = {};

                    partDesOccUnAlignmentData.partOccurrence = targetObj;

                    let trgParentModelObject = cdmSvc.getObject( targetObj.props.awb0Parent.dbValues[0] );
                    partDesOccUnAlignmentData.partContext = trgParentModelObject;

                    partDesOccUnAlignmentData.designContext = sourceSelectedObjects[0];

                    unAlignmentInput.push( partDesOccUnAlignmentData );
                }
            } else if ( appCtxSvc.ctx.CBATrgContext.isRowSelected === false ) {
                for( let sourceIndex = 0; sourceIndex < sourceSelectedObjects.length; ++sourceIndex ) {
                    let sourceObj = sourceSelectedObjects[ sourceIndex ];

                    let partDesOccUnAlignmentData = {};

                    partDesOccUnAlignmentData.designOccurrence = sourceObj;

                    let srcParentModelObject = cdmSvc.getObject( sourceObj.props.awb0Parent.dbValues[0] );
                    partDesOccUnAlignmentData.designContext = srcParentModelObject;

                    partDesOccUnAlignmentData.partContext = targetSelectedObjects[0];

                    unAlignmentInput.push( partDesOccUnAlignmentData );
                }
            } else {
                for( let sourceIndex = 0; sourceIndex < sourceSelectedObjects.length; ++sourceIndex ) {
                    let sourceObj = sourceSelectedObjects[ sourceIndex ];
                   for( let targetIndex = 0; targetIndex < targetSelectedObjects.length; ++targetIndex ) {
                        let targetObj = targetSelectedObjects[ targetIndex ];

                        let partDesOccUnAlignmentData = {};

                        partDesOccUnAlignmentData.designOccurrence = sourceObj;
                        partDesOccUnAlignmentData.partOccurrence = targetObj;

                        let srcParentModelObject = cdmSvc.getObject( sourceObj.props.awb0Parent.dbValues[0] );
                        partDesOccUnAlignmentData.designContext = srcParentModelObject;

                        let trgParentModelObject = cdmSvc.getObject( targetObj.props.awb0Parent.dbValues[0] );
                        partDesOccUnAlignmentData.partContext = trgParentModelObject;

                        unAlignmentInput.push( partDesOccUnAlignmentData );
                    }
                }
            }
        }
    }
    return unAlignmentInput;
};

/**
 * Creates input for unalignment confirmation message
 * @returns {string} Returns name of the object if there is a single selection on source or target else returns the count of selected objects
 */
export let getUnAlignmentConfirmationInput = function() {
    let unAlignConfirmationInput = [];
    let srcContext = appCtxSvc.ctx.CBASrcContext;
    let trgContext = appCtxSvc.ctx.CBATrgContext;
    if ( appCtxSvc.ctx && srcContext && trgContext ) {
        let srcSelectedObjects = srcContext.selectedModelObjects;
        let trgSelectedObjects = trgContext.selectedModelObjects;
        if ( srcSelectedObjects && trgSelectedObjects ) {
            let sourceSelectedLength = srcSelectedObjects.length;
            let targetSelectedLength = trgSelectedObjects.length;
            let isSrcRowSelected = srcContext.isRowSelected;
            let isTrgRowSelected = trgContext.isRowSelected;
            let isSrcTrgBothSelected = isSrcRowSelected && isTrgRowSelected;

            if ( isSrcTrgBothSelected ) {
                if ( sourceSelectedLength === 1 && targetSelectedLength === 1 ) {
                    unAlignConfirmationInput.push( _getObjectName( srcContext ) );
                    unAlignConfirmationInput.push( _getObjectName( trgContext ) );
                } else if ( sourceSelectedLength > targetSelectedLength ) {
                    unAlignConfirmationInput.push( sourceSelectedLength );
                    unAlignConfirmationInput.push( _getObjectName( trgContext ) );
                } else {
                    unAlignConfirmationInput.push( _getObjectName( srcContext ) );
                    unAlignConfirmationInput.push( targetSelectedLength );
                }
            } else if ( isSrcRowSelected ) {
               unAlignConfirmationInput.push(  sourceSelectedLength > 1  ? sourceSelectedLength : _getObjectName( srcContext ) );
            } else {
               unAlignConfirmationInput.push(  targetSelectedLength > 1  ? targetSelectedLength : _getObjectName( trgContext ) );
            }
        }
    }
    return unAlignConfirmationInput;
};

/**
 * Returns name of the selected object
 *
 * @param {object} context source or target context
 * @returns {string} the object name
 */
let _getObjectName = function( context ) {
    let objectName;
    if ( context && context.selectedModelObjects ) {
        objectName = context.selectedModelObjects[ 0 ].props.object_string.dbValues[ 0 ];
    }
    return objectName;
};

/**
 * CAD-BOM Occurrence Alignment service
 */
export default exports = {
    loadCBAData,
    launchCBA,
    getStateParams,
    getOccAlignmentInput,
    getOccUnAlignmentInput,
    getUnAlignmentConfirmationInput,
    getAlignedObject
};
app.factory( 'CadBomOccurrenceAlignmentService', () => exports );
