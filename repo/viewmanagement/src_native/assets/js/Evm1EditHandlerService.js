//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 *
 *
 * @module js/Evm1EditHandlerService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import leavePlaceService from 'js/leavePlace.service';
import localeService from 'js/localeService';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import evm1RecipeBuilderService from 'js/Evm1RecipeBuilderService';
import selectionService from 'js/selection.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var saveHandler = {};
var _dataSource = null;

/**
 * Get save handler.
 *
 * @return {object} Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * Custom save handler which will be called by framework. It will save both the recipe summary contents and
 * recipe builder contents
 *
 * @param {object} dataSource the data-source which the declarative view-model
 * @return {promise} resolved or rejected based on the save operations
 */
saveHandler.saveEdits = function( dataSource ) {
    var _deferredSave = AwPromiseService.instance.defer();
    var defRecipePromise = null;
    var _dummyDefer = null;
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

    _dataSource = dataSource;
    // perform save operation only if recipe builder is edited
    if( recipeCtx && recipeCtx.isRecipeBuilderDirty ) {
        defRecipePromise = saveRecipeEdits();
    } else {
        _dummyDefer = AwPromiseService.instance.defer();
        defRecipePromise = _dummyDefer.promise;
        _dummyDefer.resolve();
    }
    recipeCtx.inEditMode = false;
    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    // process the promises for save operation for any errors and handle post processing
    defRecipePromise.then( function( response ) {
            if( response ) {
                var _error = null;

                if( response.partialErrors || response.PartialErrors ) {
                    _error = soaSvc.createError( response );
                } else if( response.ServiceData && response.ServiceData.partialErrors ) {
                    _error = soaSvc.createError( response.ServiceData );
                }
                if( _error ) {
                    _deferredSave.reject( _error );
                } else {
                    _deferredSave.resolve();
                }
            }
        },
        function( err ) {
            _deferredSave.reject( err );
        } );
    return _deferredSave.promise;
};

/**
 * Perform save operation for recipe builder.
 *
 * @return {promise} resolved or rejected based on the save operation
 */
var saveRecipeEdits = function() {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    // Make the widget non-editable again via the cache, since the cache has reference to view model data
    if( recipeCtx && recipeCtx.widgetDataReference ) {
        recipeCtx.widgetDataReference.closureRule.isEditable = false;
        recipeCtx.widgetDataReference.closureRule.isEnabled = false;
    }
    var seedSelections = [];
    seedSelections = createSeedSelection( recipeCtx );

    // prepare input for the SOA call
    var eventDataToBePublished = {
        manageAction: 'Update',
        seedObjects: seedSelections,
        closureRule: recipeCtx.widgetDataReference.closureRule.displayValues
    };
    if( recipeCtx && recipeCtx.builderConfigValues ) {
        // Set Revision Rule
        var revisionRule = '';
        if( recipeCtx.builderConfigValues.revisionRule ) {
            revisionRule = recipeCtx.builderConfigValues.revisionRule.uiValue;
        }
        eventDataToBePublished.revisionRule = revisionRule;

        // Set variant Rules
        var variantRules = [];
        if( recipeCtx.builderConfigValues.variantRules && recipeCtx.builderConfigValues.variantRules.dbValue ) {
            // EVM1 TOBE - once the variant rule is available on the VM, check what comes in the value and apply it
            var uid = recipeCtx.builderConfigValues.variantRules.dbValue;
            if( uid !== '' && uid !== '_defaultVariantRule' ) {
                variantRules.push( {
                    uid: uid,
                    type: ''
                } );
            }
        }
        eventDataToBePublished.variantRules = variantRules;

        // Set Effectivity Date
        var effectivityDate = '';
        if( recipeCtx.builderConfigValues.effecDate && recipeCtx.builderConfigValues.effecDate.uiValue &&
            recipeCtx.builderConfigValues.effecDate.value ) {
            var effecDate = recipeCtx.builderConfigValues.effecDate.value;
            if( effecDate.uiValue === 'Today' || effecDate.uiValue === 'today' ) {
                effectivityDate = '0001-01-01T00:00:00+00:00';
            } else {
                effectivityDate = effecDate.uiValue;
            }
        }
        eventDataToBePublished.effectivityDate = effectivityDate;

        // Set Effectivity Unit
        var effectivityUnit = -1;
        if( recipeCtx.builderConfigValues.effecUnits && recipeCtx.builderConfigValues.effecUnits.uiValue ) {
            effectivityUnit = parseInt( recipeCtx.builderConfigValues.effecUnits.uiValue );
            if( isNaN( effectivityUnit ) ) {
                effectivityUnit = -1;
            }
        }
        eventDataToBePublished.effectivityUnit = effectivityUnit;

        // Set Effectivity End Item
        var endItem = {
            uid: '',
            type: ''
        };
        if( recipeCtx.builderConfigValues.endItems && recipeCtx.builderConfigValues.endItems.length > 0 ) {
            if( recipeCtx.builderConfigValues.endItems[ 0 ].dbValues && recipeCtx.builderConfigValues.endItems[ 0 ].dbValues[ 0 ] ) {
                endItem.uid = recipeCtx.builderConfigValues.endItems[ 0 ].dbValues[ 0 ];
            } else if( recipeCtx.builderConfigValues.endItems[ 0 ].uid ) {
                endItem.uid = recipeCtx.builderConfigValues.endItems[ 0 ].uid;
            }
            endItem.type = '';
        }
        eventDataToBePublished.effectivityEndItem = endItem;

        // Set Effectivity Group
        var effecGroup = [];
        eventDataToBePublished.effectivityGroups = effecGroup;
        eventDataToBePublished.productContextInfo = recipeCtx.productContextInfo;
        eventDataToBePublished.showConfig = true;
        if( recipeCtx.context ) {
            eventDataToBePublished.showConfig = false;
        }
    }
    eventBus.publish( 'emv1ManageRecipeSOA', eventDataToBePublished );
    return AwPromiseService.instance.when( eventDataToBePublished );
};

var createSeedSelection = function( recipeCtx ) {
    var seedSelections = [];
    if( recipeCtx.seedSelections && recipeCtx.seedSelections.length > 0 ) {
        var seeds = recipeCtx.seedSelections;
        for( var i = 0; i < seeds.length; i++ ) {
            var seedObj = seeds[ i ];
            if( seedObj.uid && seedObj.type ) {
                seedSelections.push( {
                    uid: seedObj.uid,
                    type: seedObj.type
                } );
            }
        }
    }
    return seedSelections;
};

/**
 * Notify the save state changes
 *
 * @param {String} stateName - edit state name ('starting', 'saved', 'cancelling')
 * @param {Boolean} fireEvents - fire modelObjectsUpdated events
 * @param {Array} failureUids - the object uids that failed to save
 * @param {Object} modifiedPropsMap - modified properties map
 */
function _notifySaveStateChanged( stateName, fireEvents, failureUids, modifiedPropsMap ) {
    _dataSource.setSelectionEnabled( stateName !== 'starting' );

    switch ( stateName ) {
        case 'starting':
            _dataSource.checkEditableOnProperties();
            break;
        case 'saved':
            _dataSource.saveEditiableStates();
            break;
        case 'canceling':
            _dataSource.resetEditiableStates();
            break;
        case 'partialSave':
            _dataSource.updatePartialEditState( failureUids, modifiedPropsMap );
            break;
        default:
            logger.error( 'Unexpected stateName value: ' + stateName );
    }

    if( fireEvents ) {
        var dataProvider = _dataSource.getDataProvider();
        if( dataProvider && dataProvider.viewModelCollection ) {
            eventBus.publish( dataProvider.name + '.modelObjectsUpdated', {
                viewModelObjects: dataProvider.viewModelCollection.getLoadedViewModelObjects(),
                totalObjectsFound: dataProvider.viewModelCollection.getTotalObjectsLoaded()
            } );
        }
    }

    saveHandler._editing = stateName === 'starting' || stateName === 'partialSave';

    // Add to the appCtx about the editing state
    appCtxSvc.updateCtx( 'editInProgress', saveHandler._editing );

    var context = {
        state: stateName
    };

    context.dataSource = _dataSource.getSourceObject();
    context.failureUids = failureUids;
    eventBus.publish( 'editHandlerStateChange', context );
}

/**
 * Perform the actions post Save Edit
 *
 * @param {Boolean} saveSuccess whether the save edit was successful
 * @returns {promise} promise indicating save success
 */
saveHandler.saveEditsPostActions = function( saveSuccess ) {
    if( saveSuccess ) {
        leavePlaceService.registerLeaveHandler( null );
    }
    _notifySaveStateChanged( 'saved', saveSuccess );
    return AwPromiseService.instance.when( saveSuccess );
};

/**
 * Custom isDirty. Checks if the Recipe contents is dirty
 *
 * @param {object} dataSource the data-source which the declarative view-model
 * @return {promise} promise indicating if the recipe is dirty
 */
saveHandler.isDirty = function( dataSource ) {
    var recipeEdited = false;
    var summaryEdited = false;
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx && recipeCtx.widgetDataReference && recipeCtx.recipeEditCache && recipeCtx.recipeEditCache.cacheData ) {
        var widgetDataReference = recipeCtx.widgetDataReference;
        var cacheData = recipeCtx.recipeEditCache.cacheData;
        // Check if closure rule is dirty, LwqEditor is edited, seed widget and cached seed values are different
        if( _.get( recipeCtx, 'widgetDataReference.closureRule.dirty', false ) || recipeCtx.seedsIsDirty ) {
            recipeEdited = true;
            recipeCtx.seedsIsDirty = false;
        }

        if( _.get( widgetDataReference, 'revisionRule.uiValue', undefined ) !== _.get( cacheData, 'revisionRule.uiValue', undefined ) ||
            _.get( widgetDataReference, 'effecDate.uiValue', undefined ) !== _.get( cacheData, 'effecDate.uiValue', undefined ) ||
            _.get( widgetDataReference, 'effecUnits.uiValue', undefined ) !== _.get( cacheData, 'effecUnits.uiValue', undefined ) ||
            _.get( widgetDataReference, 'variantRule.uiValue', undefined ) !== _.get( cacheData, 'variantRule.uiValue', undefined ) ) {
            recipeEdited = true;
        }

        if( ( cacheData.seedSelections && !recipeCtx.seedSelections ) ||
            ( !cacheData.seedSelections && recipeCtx.seedSelections ) ) {
            recipeEdited = true;
        } else if( cacheData.seedSelections && recipeCtx.seedSelections ) {
            if( cacheData.seedSelections.length === recipeCtx.seedSelections.length ) {
                _.forEach( cacheData.seedSelections, function( seedSelection ) {
                    if( _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === seedSelection.uid; } ) === -1 ) {
                        recipeEdited = true;
                        return true;
                    }
                } );
            } else {
                recipeEdited = true;
            }
        }
    }

    // check if summary is edited
    if( dataSource.getAllModifiedProperties() && dataSource.getAllModifiedProperties().length > 0 ) {
        summaryEdited = true;
    }

    // Save the flags in ctx.
    //recipeEdited = true; // EVM1 TOBE - This is hard coded for now. Will have to check it as per requirements of config panel
    recipeCtx.isRecipeBuilderDirty = recipeEdited;
    recipeCtx.isRecipeSummaryDirty = summaryEdited;
    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    if( recipeEdited || summaryEdited ) {
        return AwPromiseService.instance.when( true );
    }
    return AwPromiseService.instance.when( false );
};

/**
 * Cache the contents of recipe builder widgets when they are read and loaded
 *
 * @param {object} data the view-model data
 */
export let cacheBuilderWidgetsInCtx = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    // create widget reference in the ctx, so that any changes in the widgets will be reflected in the ctx
    // This is useful because in isDirty method we do not have any handle to check the view-model data of recipe Builder
    // so this is a workaround.
    var widgetDataReference = {
        closureRule: data.closureRuleValues
        // LQW related code is currently commented out as that functionality is taken out
        // With possibility of it coming back again, not removing the commented code.
        //lwqEditor: data.lwqEditor
    };
    if( data.revisionRule && data.revisionRule.uiValue ) {
        widgetDataReference.revisionRule = data.revisionRule;
    }
    if( data.effecDate && data.effecDate.uiValue ) {
        widgetDataReference.effecDate = data.effecDate;
    }
    if( data.effecUnits && data.effecUnits.uiValue ) {
        widgetDataReference.effecUnits = data.effecUnits;
    }
    if( data.variantRule && data.variantRule.uiValue ) {
        widgetDataReference.variantRule = data.variantRule;
    }
    // LQW related code is currently commented out as that functionality is taken out
    // With possibility of it coming back again, not removing the commented code.
    // if ( data.lwqEditor ) {
    //     cacheData.lwqEditor = _.cloneDeep( data.lwqEditor );
    // }
    if( recipeCtx ) {
        recipeCtx.widgetDataReference = widgetDataReference;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        recipeCtx = {
            widgetDataReference: widgetDataReference
        };
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
};

/**
 *  This method used to add additional implementation to edit group commands
 * On Start Edit command, all inputs of builder query are made editable
 * On Cancel Edits command, all inputs of builder query are made non-editable
 * On Save Edits command, all inputs of builder query are saved and then are made non-editable
 *
 * @param {Object} data The view-model data
 * @param {Object} eventData The event data received from even listener
 * @returns {Object} data The edited view-model data
 */
export let editRecipeBuilder = function( data, eventData ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( !recipeCtx ) {
        recipeCtx = {};

        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
    if( recipeCtx ) {
        if( data && eventData && eventData.state === 'starting' && eventData.dataSource && eventData.dataSource.vmo && eventData.dataSource.vmo.xrtType === 'SUMMARY' ) {
            createCacheAndEnableEdits( data, recipeCtx );
        } else if( data && eventData && eventData.state === 'canceling' && eventData.dataSource && eventData.dataSource.vmo &&
            eventData.dataSource.vmo.type && eventData.dataSource.vmo.type === 'Fnd0SearchRecipe' &&
            eventData.dataSource.vmo.xrtType === 'SUMMARY' ) {
            clearCurrentSelectionsAndLoadFromCache( data, recipeCtx );
            // validate inscope navigation
            evm1RecipeBuilderService.validateInScopeNavigation( data, recipeCtx );
        } else if( data && eventData && eventData.state === 'saved' && eventData.dataSource && eventData.dataSource.vmo &&
            eventData.dataSource.vmo.type && eventData.dataSource.vmo.type === 'Fnd0SearchRecipe' &&
            eventData.dataSource.vmo.xrtType === 'SUMMARY' ) {
            exitEditMode( recipeCtx );
        }
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        return data;
    }
};

/**
 * Cache the contents of recipe builder and enable the widget for editing
 *
 * @param {object} data The view-model data
 * @param {object} recipeCtx The ctx which will used to cache the contents from data
 */
var createCacheAndEnableEdits = function( data, recipeCtx ) {
    recipeCtx.inEditMode = true;
    // Cache the contents of Recipe if they are present
    recipeCtx.recipeEditCache = {
        cacheData: {}
    };

    if( recipeCtx.seedSelections ) {
        recipeCtx.recipeEditCache.cacheData.seedObjects = _.cloneDeep( recipeCtx.seedSelections );
    }
    if( recipeCtx.seedInfos ) {
        recipeCtx.recipeEditCache.cacheData.seedInfos = _.cloneDeep( recipeCtx.seedInfos );
    }
    if( data.closureRuleValues.displayValues ) {
        recipeCtx.recipeEditCache.cacheData.closureRule = _.cloneDeep( data.closureRuleValues );
    }
    if( data.revisionRule && data.revisionRule.uiValue ) {
        recipeCtx.recipeEditCache.cacheData.revisionRule = _.cloneDeep( data.revisionRule );
    }
    if( data.effecDate && data.effecDate.uiValue ) {
        recipeCtx.recipeEditCache.cacheData.effecDate = _.cloneDeep( data.effecDate );
    }
    if( data.effecUnits && data.effecUnits.uiValue ) {
        recipeCtx.recipeEditCache.cacheData.effecUnits = _.cloneDeep( data.effecUnits );
    }
    if( data.variantRule && data.variantRule.uiValue ) {
        recipeCtx.recipeEditCache.cacheData.variantRule = _.cloneDeep( data.variantRule );
    }
    if( recipeCtx.productContextInfo ) {
        recipeCtx.recipeEditCache.cacheData.productContextInfo = _.cloneDeep( recipeCtx.productContextInfo );
    }
    if( recipeCtx.acePCInfo ) {
        recipeCtx.recipeEditCache.cacheData.acePCInfo = _.cloneDeep( recipeCtx.acePCInfo );
    }
    if( recipeCtx.productContextFromSOA ) {
        recipeCtx.recipeEditCache.cacheData.productContextFromSOA = _.cloneDeep( recipeCtx.productContextFromSOA );
    }
    if( recipeCtx.context ) {
        recipeCtx.recipeEditCache.cacheData.context = _.cloneDeep( recipeCtx.context );
    }
    // LQW related code is currently commented out as that functionality is taken out
    // With possibility of it coming back again, not removing the commented code.
    // if ( data.lwqEditor.editedData ) {
    //     recipeEditCtx.cacheData.query = _.cloneDeep( data.lwqEditor );
    // }
    data.closureRuleValues.isEditable = true;
    data.closureRuleValues.isEnabled = true;

    // _sourceEditorSvc.updateOptions( 'lwqDataSourceEditor', {
    //     readOnly: false
    // } );
};

/**
 * Clear the selections made in the Recipe Builder and load the selections from cache
 *
 * @param {object} data The view-model data
 * @param {object} recipeCtx The ctx which will used to load the contents from
 */
var clearCurrentSelectionsAndLoadFromCache = function( data, recipeCtx ) {
    recipeCtx.inEditMode = false;
    var recipeEdit = recipeCtx.recipeEditCache;
    // Get seed selection from cache if present or clear the seed selections
    // load from the edit cache data, which was cached when edit was started
    // else make it empty
    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.seedObjects && recipeEdit.cacheData.seedObjects.length > 0 ) {
        data.seedObjects = recipeEdit.cacheData.seedObjects;
        recipeCtx.seedSelections = recipeEdit.cacheData.seedObjects;
        recipeCtx.seedInfos = recipeEdit.cacheData.seedInfos;
    } else if( recipeCtx && ( recipeCtx.seedSelections || data.seedObjects ) ) {
        data.seedObjects = [];
        recipeCtx.seedSelections = [];
        recipeCtx.seedInfos = [];
    }

    // Get the closure rule form cache if present or clear the closure rule selections if any
    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.closureRule ) {
        data.closureRuleValues = recipeEdit.cacheData.closureRule;
    } else {
        data.closureRuleValues.dbValue = [];
        data.closureRuleList = [];
        data.closureRuleValues.displayValues = [];
        data.closureRuleValues.newDisplayValues = [];
        data.closureRuleValues.newValue = [];
    }

    if( recipeEdit.cacheData && recipeEdit.cacheData.revisionRule ) {
        data.revisionRule = recipeEdit.cacheData.revisionRule;
    } else {
        clearViewModelProp( data.revisionRule );
    }
    if( recipeEdit.cacheData && recipeEdit.cacheData.effecDate ) {
        data.effecDate = recipeEdit.cacheData.effecDate;
    } else {
        clearViewModelProp( data.effecDate );
    }
    if( recipeEdit.cacheData && recipeEdit.cacheData.effecUnits ) {
        data.effecUnits = recipeEdit.cacheData.effecUnits;
    } else {
        clearViewModelProp( data.effecUnits );
    }
    if( recipeEdit.cacheData && recipeEdit.cacheData.variantRule ) {
        data.variantRule = recipeEdit.cacheData.variantRule;
    } else {
        clearViewModelProp( data.variantRule );
    }

    // LQW related code is currently commented out as that functionality is taken out
    // With possibility of it coming back again, not removing the commented code.
    // Get the lwq from cache or clear the lwq if any
    /* if ( recipeEditCtx.cacheData.query ) {
        data.lwqEditor = recipeEditCtx.cacheData.query;
    } else {
        data.lwqEditor.editedData = '';
    }*/

    // Make the, closure rule and LWQ widgets non - editable. They are read only by default
    data.closureRuleValues.isEditable = false;
    data.closureRuleValues.isEnabled = false;

    // _sourceEditorSvc.updateOptions( 'lwqDataSourceEditor', {
    //     readOnly: true
    // } );

    //remove the search input in case of cancel edit
    if( recipeCtx && recipeCtx.recipeSearchCriteriaProvider ) {
        recipeCtx.recipeSearchCriteriaProvider = {};
    }
    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.productContextInfo ) {
        recipeCtx.productContextInfo = recipeEdit.cacheData.productContextInfo;
    }
    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.acePCInfo ) {
        recipeCtx.acePCInfo = recipeEdit.cacheData.acePCInfo;
    }
    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.productContextFromSOA ) {
        recipeCtx.productContextFromSOA = recipeEdit.cacheData.productContextFromSOA;
    }

    if( recipeEdit && recipeEdit.cacheData && recipeEdit.cacheData.context ) {
        recipeCtx.context = recipeEdit.cacheData.context;
        data.context = recipeEdit.cacheData.context;
    }

    // clear the edit cache
    recipeCtx.recipeEditCache = {};

    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );

    var parentSelection = selectionService.getSelection().parent;

    if( !parentSelection ) {
        parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
    }
    selectionService.updateSelection( parentSelection );

    eventBus.publish( 'evm1SeedSelectionProvider.reset' );
    eventBus.publish( 'evm1seedTreeDataProvider.reset' );
    eventBus.publish( 'evm1InitializeBuilderConfig' );
};

var clearViewModelProp = function( prop ) {
    prop.uiValue = '';
    prop.uiValues = [];
    prop.dbValue = '';
    prop.dbValues = [];
    prop.newValue = '';
    prop.newDisplayValues = [];
};

var exitEditMode = function( recipeCtx ) {
    if( recipeCtx.widgetDataReference ) {
        _.set( recipeCtx, 'widgetDataReference.closureRule.isEditable', false );
        _.set( recipeCtx, 'widgetDataReference.closureRule.isEnabled', false );
        recipeCtx.inEditMode = false;
    }
};

export default exports = {
    getSaveHandler,
    cacheBuilderWidgetsInCtx,
    editRecipeBuilder
};
app.factory( 'Evm1EditHandlerService', () => exports );
