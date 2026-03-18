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
 * @module js/Evm1RecipeBuilderService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import vmcs from 'js/viewModelObjectService';
import uwPropertyService from 'js/uwPropertyService';
import dateTimeService from 'js/dateTimeService';
import cdm from 'soa/kernel/clientDataModel';
import msgSvc from 'js/messagingService';
import editHandlerService from 'js/editHandlerService';
import preferenceService from 'soa/preferenceService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * This method is used to give warning to user if they want to update the configuration panel, which might updat the seed
 * @param {Object} data the viewmodel Data
 */
export let confirmConfigAdd = function( data ) {
    var buttons = [ {
            addClass: 'btn btn-notlfy',
            text: data.i18n.evm1CancelBtn,
            onClick: function( $noty ) {
                $noty.close();
            }
        },
        {
            addClass: 'btn btn-notlfy',
            text: data.i18n.evm1AddBtn,
            onClick: function( $noty ) {
                $noty.close();
                // if the user proceeds with adding conguration, fire an evnt for creating the config panel
                eventBus.publish( 'evm1ConfigPanelConfirmation' );
            }
        }
    ];
    msgSvc.showWarning( data.i18n.evm1UpdateSeedMsg, buttons );
};

/**
 * This method is used to call the soa for retrieving the closure rule and filtering it as per the input
 * @param {string} schemaFormat the schema format of closure rule
 * @param {string} scope the scope of required closure rule
 * @param {string} filter The input suggestion typed in for closure rule, which is used to filter the closure rule list
 * @param {string} data The view-model data
 * @returns {object} A Promise that will be resolved with the requested data when the data is available. In this case closure rule list
 */
export let closureRulesSOA = function( schemaFormat, scope, filter, data ) {
    var deferred = AwPromiseService.instance.defer();
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx && recipeCtx.closureRules && recipeCtx.closureRules.closureRulesFromSoa && recipeCtx.closureRules.closureRulesFromSoa.ServiceData.modelObjects ) {
        var closureRuleList = getFilteredClosureRules( recipeCtx.closureRules.closureRulesFromSoa, filter, data );
        recipeCtx.closureRules.filteredClosureRules = closureRuleList;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        deferred.resolve( closureRuleList );
    } else {
        var promise = soaService.post( 'GlobalMultiSite-2007-06-ImportExport',
            'getClosureRules', { inputs: { schemaFormat: schemaFormat, scope: scope } } );

        promise.then( function( response ) {
                var closureRuleList = getFilteredClosureRules( response, filter, data );
                recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
                if( recipeCtx ) {
                    recipeCtx.closureRules = {
                        closureRulesFromSoa: response,
                        filteredClosureRules: closureRuleList
                    };
                    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
                } else {
                    var recipeCtx = {
                        closureRules: {
                            closureRulesFromSoa: response,
                            filteredClosureRules: closureRuleList
                        }
                    };
                    appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
                }
                deferred.resolve( response );
            } )
            .catch( function( error ) {
                deferred.reject( error );
            } );
    }

    return deferred.promise;
};

var getFilteredClosureRules = function( response, filter, data ) {
    var closureRuleList = [];
    var selectedClosureRule = data.closureRuleValues.displayValues;
    if( response && response.ServiceData ) {
        var modelObjs = response.ServiceData.modelObjects;
        for( var key in modelObjs ) {
            var modelObject = modelObjs[ key ];
            var props = modelObject.props;
            var propertyValue = props.object_string.dbValues[ 0 ].trim();
            filter ? _.includes( propertyValue.toLowerCase(), filter.toLowerCase() ) && closureRuleList.push( {
                propDisplayValue: propertyValue,
                propInternalValue: propertyValue
            } ) : closureRuleList.push( {
                propDisplayValue: propertyValue,
                propInternalValue: propertyValue
            } );
        }
        if( selectedClosureRule && selectedClosureRule.length > 0 ) {
            closureRuleList = _.differenceWith( closureRuleList, selectedClosureRule, function( closureRuleEle, selectedEle ) {
                if( closureRuleEle.propInternalValue === selectedEle ) {
                    return closureRuleEle.propInternalValue;
                }
            } );
        }
        return closureRuleList;
    }
};

/**
 * This method is used to get the closure rule values from the context
 * @returns {Object} list of closure rules names
 */
export let getClosureRuleList = function() {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        var closureRules = recipeCtx.closureRules;
        if( closureRules && closureRules.filteredClosureRules && closureRules.filteredClosureRules.length > 0 ) {
            var sortedClosureRules = _.sortBy( closureRules.filteredClosureRules, [ 'propDisplayValue' ] );
            return sortedClosureRules;
        }
    }
    return [];
};

export let validateClosureRule = function( data, selected, suggestion ) {
    var deferred = AwPromiseService.instance.defer();
    if( data && suggestion && selected && selected.length > 0 ) {
        var closureRule = _.find( data.closureRuleList, [ 'propDisplayValue', suggestion ] );
        if( !closureRule ) {
            var message = data.i18n.closureRuleValidateMessage;
            deferred.resolve( {
                valid: false,
                message: message
            } );
        }
    } else {
        deferred.resolve( {
            valid: true,
            message: ''
        } );
    }
    return deferred.promise;
};

var pipeSeparateValues = function( inputString ) {
    var i = 0;
    var returnString;
    if( inputString.length >= 1 ) {
        returnString = inputString[ 0 ];
        for( i = 1; i < inputString.length; i++ ) {
            returnString += '|' + inputString[ i ];
        }
    }
    return returnString;
};

var getseedObjectUids = function( seedObjects ) {
    var i = 0;
    var returnString;
    if( seedObjects.length >= 1 ) {
        returnString = seedObjects[ 0 ].uid;
        for( i = 1; i < seedObjects.length; i++ ) {
            returnString += '|' + seedObjects[ i ].uid;
        }
    }
    return returnString;
};

/**
 * This method is used generate the execute reciep result.
 * @param {object} data decl viewmodel
 */
export let generateShowResultTable = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    // Before updateContextWithSearchCriteria we should desable the show result button.
    if( recipeCtx ) {
        recipeCtx.isRecipeExecuting = true;
        updateContextWithSearchCriteria( recipeCtx, data, true );
    } else {
        recipeCtx = {};
        recipeCtx.isRecipeExecuting = true;
        updateContextWithSearchCriteria( recipeCtx, data, false );
    }
    eventBus.publish( 'view.ReciepContextUpdated', {} );
};

/**
 *Register or update context for data provider input for recipe table
 *
 * @param {object} recipeCtx context object
 * @param {object} data decl view model
 * @param {boolean} isUpdate if true then update the context
 */
var updateContextWithSearchCriteria = function( recipeCtx, data, isUpdate ) {
    recipeCtx.recipeSearchCriteriaProvider = {};
    recipeCtx.recipeSearchCriteriaProvider.recipeObjectUid = 'AAAAAAAAAAAAAA';
    recipeCtx.recipeSearchCriteriaProvider.revisionRule = data.revisionRule.dbValue;
    recipeCtx.recipeSearchCriteriaProvider.closureRules = pipeSeparateValues( data.closureRuleValues.displayValues );
    if( recipeCtx.seedSelections && recipeCtx.seedSelections.length > 0 ) {
        var seedSelections = [];

        if( recipeCtx.userAction === 'execute' ) {
            seedSelections = recipeCtx.seedSelections;
            recipeCtx.userAction = undefined;
            recipeCtx.executeRecipeInput = undefined;
        } else {
            _.forEach( recipeCtx.seedSelections, function( seedSelection ) {
                var evm1Include = recipeCtx.includeToggleMap[ seedSelection.uid ];

                if( evm1Include && evm1Include.dbValue ) {
                    seedSelections.push( seedSelection );
                }
            } );
        }
        recipeCtx.recipeSearchCriteriaProvider.selecetedObjectUids = getseedObjectUids( seedSelections );
    }
    recipeCtx.recipeSearchCriteriaProvider.sqlString = '';

    if( data && data.endItems && data.endItems.length > 0 ) {
        var endItemUid = _.get( data, 'endItems[0].dbValues[0]', undefined);
        if( !endItemUid ) {
            endItemUid = _.get( data, 'endItems[0].uid', undefined );
        }
        recipeCtx.recipeSearchCriteriaProvider.effectivityEndItem = endItemUid;
    }

    if( data.effecUnits && data.effecUnits.uiValue && data.effecUnits.dbValue &&
        data.effecUnits.uiValue !== 'None' ) {
        recipeCtx.recipeSearchCriteriaProvider.effectivityUnit = data.effecUnits.dbValue;
    } else {
        recipeCtx.recipeSearchCriteriaProvider.effectivityUnit = undefined;
    }
    if( data.effecDate && data.effecDate.uiValue && data.effecDate.dbValue &&
        data.effecDate.uiValue !== 'today' ) {
        recipeCtx.recipeSearchCriteriaProvider.effectivityDate = data.effecDate.dbValue;
    } else {
        recipeCtx.recipeSearchCriteriaProvider.effectivityDate = undefined;
    }

    recipeCtx.recipeSearchCriteriaProvider.effectivityGroups = data.effectivityGroups;

    if( recipeCtx.productContextInfo ) {
        recipeCtx.recipeSearchCriteriaProvider.productContext = recipeCtx.productContextInfo.uid;
    }

    if( recipeCtx.recipeExecuteFlag ) {
        recipeCtx.recipeSearchCriteriaProvider.isConfigChanged = 'true';
    } else {
        recipeCtx.recipeSearchCriteriaProvider.isConfigChanged = 'false';
    }
    if( data.variantRule && data.variantRule.dbValue && data.variantRule.dbValue !== '' &&
        data.variantRule.uiValue !== data.defaultVariantRule.uiValue ) {
        recipeCtx.recipeSearchCriteriaProvider.variantRules = data.variantRule.dbValue;
    } else {
        recipeCtx.recipeSearchCriteriaProvider.variantRules = undefined;
    }

    // check for inScopeNavigation
    recipeCtx.recipeSearchCriteriaProvider.isInScopeNavigation = 'false';
    if( recipeCtx && recipeCtx.isInScopeNavigationVisible && data.inContext ) {
        if( data.inContext.dbValue === true ) {
            recipeCtx.recipeSearchCriteriaProvider.isInScopeNavigation = 'true';
        }
    }

    if( isUpdate ) {
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
};

/**
 * This method is used to create the inputs for the SOA Manage Recipe for the actions 'read' and 'update' only.
 * @param {Object} eventData The eventData which has the manageAction i.e either 'read' or 'update'
 * @returns {object} input The input created for manageRecipe SOA call
 */
export let getManageRecipeInput = function( eventData ) {
    var input = [];

    var manageAction = eventData.manageAction;
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

    if( recipeCtx && recipeCtx.userAction && recipeCtx.userAction === 'execute' ) {
        manageAction = 'ReadOverride';
    }

    var inputData = {
        clientId: manageAction,
        manageAction: manageAction,
        recipeCreInput: {
            boName: '',
            propertyNameValues: {},
            compoundCreateInput: {}
        }
    };
    inputData.recipeObject = {
        uid: appCtxSvc.ctx.xrtSummaryContextObject.uid,
        type: appCtxSvc.ctx.xrtSummaryContextObject.type
    };

    switch ( manageAction ) {
        case 'ReadOverride':
            inputData.criteriaInput = {
                selectContentInputs: [],
                configSet: {
                    revisionRule: '',
                    variantRules: [],
                    effectivityUnit: -1,
                    effectivityEndItem: {
                        uid: '',
                        type: ''
                    },
                    effectivityDate: '',
                    effectivityGroups: []
                },
                criteriaSet: {
                    closureRuleNames: [],
                    lwoQueryExpression: ''
                },
                productContext: undefined,
                isConfigChanged: false
            };
            if( recipeCtx && recipeCtx.executeRecipeInput ) {
                if( recipeCtx.executeRecipeInput.productContext ) {
                    inputData.criteriaInput.productContext = recipeCtx.executeRecipeInput.productContext.uid;
                }
                for( var idx = 0; idx < recipeCtx.executeRecipeInput.selectedObjs.length; ++idx ) {
                    var seed = recipeCtx.executeRecipeInput.selectedObjs[ idx ];

                    inputData.criteriaInput.selectContentInputs.push( {
                        uid: seed.uid,
                        type: seed.type
                    } );
                }
            }
            break;

        case 'Read':
            inputData.criteriaInput = {
                selectContentInputs: [],
                configSet: {
                    revisionRule: '',
                    variantRules: [],
                    effectivityUnit: -1,
                    effectivityEndItem: {
                        uid: '',
                        type: ''
                    },
                    effectivityDate: '',
                    effectivityGroups: []
                },
                criteriaSet: {
                    closureRuleNames: [],
                    lwoQueryExpression: ''
                },
                productContext: undefined,
                isConfigChanged: false
            };
            break;

        case 'Update':
            inputData.criteriaInput = {
                selectContentInputs: eventData.seedObjects,
                configSet: {
                    revisionRule: eventData.revisionRule,
                    variantRules: eventData.variantRules,
                    effectivityUnit: eventData.effectivityUnit,
                    effectivityEndItem: eventData.effectivityEndItem,
                    effectivityDate: eventData.effectivityDate,
                    effectivityGroups: eventData.effectivityGroups
                },
                criteriaSet: {
                    closureRuleNames: eventData.closureRule,
                    lwoQueryExpression: ''
                },
                isConfigChanged: eventData.showConfig
            };

            if( eventData.productContextInfo && eventData.productContextInfo.uid ) {
                inputData.criteriaInput.productContext = eventData.productContextInfo.uid;
            } else {
                inputData.criteriaInput.productContext = {
                    uid: '',
                    type: ''
                };
            }
            break;

        case 'ApplyConfig':
            inputData.criteriaInput = {
                selectContentInputs: eventData.seedObjects,
                configSet: {
                    revisionRule: eventData.revisionRule,
                    variantRules: eventData.variantRules,
                    svrOwningItem: eventData.svrOwningItem,
                    effectivityUnit: eventData.effectivityUnit,
                    effectivityEndItem: eventData.effectivityEndItem,
                    effectivityDate: eventData.effectivityDate,
                    effectivityGroups: eventData.effectivityGroups
                },
                criteriaSet: {
                    closureRuleNames: [],
                    lwoQueryExpression: ''
                },
                productContext: {
                    uid: '',
                    type: ''
                },
                isConfigChanged: true
            };
            break;
    }
    input.push( inputData );
    return input;
};

/**
 * This method is used to process the response coming from manageRecipe SOA. In case of read operation, all the
 * retrieved criteria from the response is mapped to the recipe builder values
 * @param {Object} output The response from manageRecipe SOA
 * @param {Object} data The view-model data
 * @returns {Object} output In case of partial or service data errors
 */
export let getManageRecipeResponse = function( output, data ) {
    if( output.partialErrors || output.ServiceData && output.ServiceData.partialErrors ) {
        return output;
    }

    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    recipeCtx.hasViewManagementLicense = true;
    if( output && data && output.recipeOutput && output.recipeOutput.length > 0 && output.recipeOutput[ 0 ].recipeOutput &&
        output.recipeOutput[ 0 ].recipeObject.uid === appCtxSvc.ctx.xrtSummaryContextObject.uid ) {
        if( output.recipeOutput[ 0 ].clientId === 'Read' || output.recipeOutput[ 0 ].clientId === 'ReadOverride' ) {
            processReadResponse( output, data, recipeCtx );
            exports.validateInScopeNavigation( data, recipeCtx );
            if( data && data.inContext && recipeCtx && recipeCtx.isInScopeNavigationVisible ) {
                preferenceService.getStringValue( 'Evm1InScopeNavigation' ).then( function( prefValue ) {
                    if( prefValue === 'true' ) {
                        data.inContext.dbValue = true;
                    }
                } );
            }
        }

        if( output.recipeOutput[ 0 ].clientId === 'ApplyConfig' ) {
            processApplyConfigResponse( output, data, recipeCtx );
        }
    }
};

var processReadResponse = function( output, data, recipeCtx ) {
    var seedModelObjects;

    var savedRevRule = output.recipeOutput[ 0 ].recipeOutput.configSet.revisionRule;
    if( savedRevRule && savedRevRule !== '' ) {
        data.revisionRule.dbValue = savedRevRule;
        data.revisionRule.dbValues = [ savedRevRule ];
        data.revisionRule.uiValue = savedRevRule;
        data.revisionRule.uiValues = [ savedRevRule ];
        data.revisionRule.newDisplayValues = [ savedRevRule ];
        data.revisionRule.newValue = savedRevRule;
    }

    seedModelObjects = output.recipeOutput[ 0 ].recipeOutput.selectContentInputs;

    // Get the product context from the service data if received
    var productContextFromSOA;

    if ( _.get( output, "recipeOutput[0].recipeOutput.productContext.uid", "AAAAAAAAAAAAAA") !== "AAAAAAAAAAAAAA" )
    {
        productContextFromSOA = output.recipeOutput[ 0 ].recipeOutput.productContext;
    }

    // Set the flag which is used to be used for execute case.
    //Set it to false and only after apply config it will be set to true and will remain true until next read call
    recipeCtx.recipeExecuteFlag = false;

    //Set the context from the SOA output
    var contextObjectVMO;
    var contextObject = cdm.getObject( output.recipeOutput[ 0 ].recipeOutput.context.uid );

    if( contextObject ) {
        contextObjectVMO = vmcs.createViewModelObject( contextObject.uid, 'EDIT' );
        data.showConfig = false;
    }
    recipeCtx.context = contextObjectVMO;
    data.context = contextObjectVMO;
    recipeCtx.includeToggleMap = {};
    if( output.recipeOutput[ 0 ].recipeOutput.seedInfos.length > 0 ) {
        recipeCtx.seedInfos = output.recipeOutput[ 0 ].recipeOutput.seedInfos;
        data.seedInfos = output.recipeOutput[ 0 ].recipeOutput.seedInfos;
    }
    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );

    // fire event on completion of read operation so that the read data can be cached
    eventBus.publish( 'evm1ReadManageResponseCompleted' );

    // Update the context with the productContext info
    updateCtxWithProductContext( productContextFromSOA, data );

    var seeds = [];
    if( seedModelObjects && seedModelObjects.length > 0 ) {
        // Create viewmodel objects from the received model objects
        for( var key in seedModelObjects ) {
            var seedModelObject = seedModelObjects[ key ];
            var seedViewModelObject = vmcs.constructViewModelObjectFromModelObject( seedModelObject, 'EDIT' );
            if( seedViewModelObject ) {
                seeds.push( seedViewModelObject );
            }
        }
    }
    //update the ctx with the new seeds if any and fire event to reset the seeds to render them
    updateCtxWithSeedSelections( seeds );

    var savedClosureRules = output.recipeOutput[ 0 ].recipeOutput.criteriaSet.closureRuleNames;
    if( savedClosureRules && savedClosureRules.length > 0 ) {
        data.closureRuleValues.displayValues = savedClosureRules;

        data.closureRuleValues.displayValsModel = [];
        for( var i = 0; i < savedClosureRules.length; i++ ) {
            data.closureRuleValues.displayValsModel.push( {
                displayValue: savedClosureRules[ i ],
                selected: false
            } );
        }
    }

    // If the recipe is created then we should open it in a edit mode.
    if( recipeCtx.isReciepeCreated && recipeCtx.isReciepeCreated === true ) {
        var eh = editHandlerService.getActiveEditHandler();
        if( eh && eh.canStartEdit() ) {
            // Before opening in edit mode we should make isReciepeCreated flag as false.
            recipeCtx.isReciepeCreated = false;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
            return eh.startEdit();
        }
    }
};

var processApplyConfigResponse = function( output, data, recipeCtx ) {
    // Get the product context from the service data if received
    var productContextFromSOA;

    if ( _.get( output, "recipeOutput[0].recipeOutput.productContext.uid", "AAAAAAAAAAAAAA") !== "AAAAAAAAAAAAAA" )
    {
        productContextFromSOA = output.recipeOutput[ 0 ].recipeOutput.productContext;
    }
    // Update the context with the productContext info
    updateCtxWithProductContext( productContextFromSOA, data );
    var savedRevRule = output.recipeOutput[ 0 ].recipeOutput.configSet.revisionRule;
    if( savedRevRule && savedRevRule !== '' ) {
        data.revisionRule.dbValue = savedRevRule;
        data.revisionRule.dbValues = [ savedRevRule ];
        data.revisionRule.uiValue = savedRevRule;
        data.revisionRule.uiValues = [ savedRevRule ];
        data.revisionRule.newDisplayValues = [ savedRevRule ];
        data.revisionRule.newValue = savedRevRule;
    }
    recipeCtx.recipeExecuteFlag = true;

    //Set the context from the SOA output
    var contextObjectVMO;
    var contextObject = cdm.getObject( output.recipeOutput[ 0 ].recipeOutput.context.uid );

    if( contextObject ) {
        contextObjectVMO = vmcs.createViewModelObject( contextObject.uid, 'EDIT' );
        data.showConfig = false;
    }
    recipeCtx.context = contextObjectVMO;
    data.context = contextObjectVMO;
    recipeCtx.includeToggleMap = {};
    if( output.recipeOutput[ 0 ].recipeOutput.seedInfos.length > 0 ) {
        recipeCtx.seedInfos = output.recipeOutput[ 0 ].recipeOutput.seedInfos;
        data.seedInfos = output.recipeOutput[ 0 ].recipeOutput.seedInfos;
    }
    var seedsFromOP = output.recipeOutput[ 0 ].recipeOutput.selectContentInputs;
    if( seedsFromOP ) {
        recipeCtx.AppliedSeed = seedsFromOP;
        var newSeeds = [];
        // Create viewmodel objects from the received model objects
        for( var key in recipeCtx.AppliedSeed ) {
            var seedModelObject = recipeCtx.AppliedSeed[ key ];
            var seedViewModelObject = vmcs.constructViewModelObjectFromModelObject( seedModelObject, 'EDIT' );
            if( seedViewModelObject ) {
                newSeeds.push( seedViewModelObject );
            }
        }
        // Update the seeds with the new seeds received from SOA Response in case of Apply Config
        recipeCtx.seedSelections = newSeeds;
    }
    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    //Fire event to reset the seeds
    eventBus.publish( 'evm1SeedSelectionProvider.reset' );
    eventBus.publish( 'evm1seedTreeDataProvider.reset' );
};

/**
 *  This method used to update revision rule
 *
 * @param {Object} data The view-model data
 * @param {Object} eventData The event data received from even listener
 */
export let updateRevisionRuleNB = function( data, eventData ) {
    if( eventData && eventData.revisionRule ) {
        data.revisionRule.dispValue = eventData.revisionRule;
        data.revisionRule.uiValue = eventData.revisionRule;
        data.revisionRule.uiValues = [ eventData.revisionRule ];
        data.revisionRule.newDisplayValues = [ eventData.revisionRule ];
        data.revisionRule.newValue = eventData.revisionRule;
        data.revisionRule.dbValue = eventData.revisionRule;
        data.revisionRule.dbValues = [ eventData.revisionRule ];

        // Save the revision rule in recipe ctx, under builderConfig values.
        // This is used when we are saving the recipe. All the values are picked up from here.
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx ) {
            if( recipeCtx.builderConfigValues ) {
                recipeCtx.builderConfigValues.revisionRule.uiValue = eventData.revisionRule;
                recipeCtx.builderConfigValues.revisionRule.uiValues = [ eventData.revisionRule ];
                recipeCtx.builderConfigValues.revisionRule.dispValue = eventData.revisionRule;
                recipeCtx.builderConfigValues.revisionRule.dbValue = eventData.revisionRule;
                recipeCtx.builderConfigValues.revisionRule.dbValues = [ eventData.revisionRule ];
                recipeCtx.builderConfigValues.revisionRule.newDisplayValues = [ eventData.revisionRule ];
                recipeCtx.builderConfigValues.revisionRule.newValue = eventData.revisionRule;
            } else {
                recipeCtx.builderConfigValues = {
                    revisionRule: data.revisionRule
                };
            }
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx = {
                builderConfigValues: {
                    revisionRule: data.revisionRule
                }
            };
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
    }
};

var updateCtxWithSeedSelections = function( seeds ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( seeds ) {
        if( recipeCtx ) {
            if( recipeCtx.seedSelections && recipeCtx.seedSelections.length > 0 ) {
                recipeCtx.seedSelections = _.unionBy( recipeCtx.seedSelections, seeds, 'uid' );
            } else {
                recipeCtx.seedSelections = seeds;
            }
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx = {
                seedSelections: seeds
            };
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
        //Fire event to reset the seeds
        eventBus.publish( 'evm1SeedSelectionProvider.reset' );
    }
};

var updateCtxWithProductContext = function( productContextFromSOA, data ) {
    if( productContextFromSOA ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx ) {
            recipeCtx.productContextFromSOA = productContextFromSOA;
            // unset the flag to ensure ACE Product Context is not used to populate the recipe builder configuration
            if( recipeCtx.populateConfigFromAce ) {
                recipeCtx.populateConfigFromAce = false;
            }
            // We are setting this productContextForVariantRule in recipeCtx to just query related variant rules
            // for newly selected SVR item.
            recipeCtx.productContextForVariantRule = productContextFromSOA.uid;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx.productContextFromSOA = productContextFromSOA;
            recipeCtx.populateConfigFromAce = false;
            recipeCtx.productContextForVariantRule = productContextFromSOA.uid;
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
        //Fire initializeBuilderConfig
        exports.initializeBuilderConfig( data );
    }
};

/**
 * This method is used to unregister the recipe related ctx
 */
export let unloadContent = function() {
    appCtxSvc.unRegisterCtx( 'recipeCtx' );
    appCtxSvc.unRegisterCtx( 'recipeConfigCtx' );
};

/**
 * This method is used to initialize the values of builder configuration on the recipe
 * @param {Object} data the view model data of recipe
 */
export let initializeBuilderConfig = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        // if flag is set use the PC from the ACE else use the PC from ManageRecipes SOA response for Read operation
        if( recipeCtx.populateConfigFromAce ) {
            recipeCtx.productContextInfo = recipeCtx.acePCInfo;
            recipeCtx.populateConfigFromAce = false;
        } else if( recipeCtx.productContextFromSOA ) {
            recipeCtx.productContextInfo = recipeCtx.productContextFromSOA;
        }
        if( recipeCtx.productContextInfo ) {
            var productContextInfo = recipeCtx.productContextInfo;
            //We are directly taking the revision rule from output pf the SOA response.
            //Hence we do not need to take the Revision Rule form the Product Context Info object like ACE does
            //Hence commented out this function call. It might be needed in case the current UX changes or we need
            //separate case for read user action and apply config user action. So keeping the function call commented and not removing it
            //this.revisionRuleFromPCI( data, productContextInfo );
            this.effectivityDateFromPCI( data, productContextInfo );
            this.effectivityUnitFromPCI( data, productContextInfo );
            this.variantRuleFromPCI( data, productContextInfo );
            recipeCtx.builderConfigValues = {
                revisionRule: data.revisionRule,
                effecDate: data.effecDate,
                effecUnits: data.effecUnits,
                variantRules: data.variantRule,
                endItems: data.endItems,
                endItemsFromContext: data.endItemsFromContext,
                svrOwningItem: data.svrOwningItem,
                openedProduct: data.openedProduct
            };
        }
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        var globalRevRule = appCtxSvc.ctx.userSession.props.awp0RevRule;
        recipeCtx = {
            builderConfigValues: {
                revisionRule: globalRevRule
            }
        };
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
};

/**
 * This method is used to get the revision rule from Product Context Info
 * @param {Object} data the view model data
 * @param {Object} productContextInfo the product context info from the CTX
 * @returns {String} the revision rule value
 */
export let revisionRuleFromPCI = function( data, productContextInfo ) {
    if( productContextInfo.props && productContextInfo.props.awb0CurrentRevRule ) {
        var revRuleFromACE = productContextInfo.props.awb0CurrentRevRule;
        if( revRuleFromACE.uiValues && revRuleFromACE.uiValues[ 0 ] ) {
            // If it is called from initialize builder config method then set the revision rule on data property
            if( data && data.revisionRule ) {
                data.revisionRule.dispValue = revRuleFromACE.uiValues[ 0 ];
                data.revisionRule.uiValue = revRuleFromACE.uiValues[ 0 ];
            }
            // The return is for the case when we are creating the Recipe with BOM selection in ACE
            return revRuleFromACE.uiValues[ 0 ];
        }
    }
};

/**
 * This method is used to get the effectivity date from Product Context Info
 * @param {Object} data the view model data
 * @param {Object} productContextInfo the product context info from the CTX
 * @returns {String} the effectivity date value
 */
export let effectivityDateFromPCI = function( data, productContextInfo ) {
    var effecDateFromACE;

    if( productContextInfo && productContextInfo.props.awb0EffDate ) {
        effecDateFromACE = {
            dbValue: productContextInfo.props.awb0EffDate.dbValues[ 0 ]
        };
        if( !effecDateFromACE || !effecDateFromACE.dbValue ) {
            var currentRevisionRule = getRevRuleFromProductContextInfo( productContextInfo );
            effecDateFromACE = getEffectiveDateFromRevisionRule( currentRevisionRule );
            if( !effecDateFromACE || !effecDateFromACE.dbValue ) {
                if( data && data.effecDate ) {
                    effecDateFromACE = getDefaultEffectiveDate( data );
                }
            }
        }
    }
    if( effecDateFromACE ) {
        if( data && data.effecDate ) {
            var date = '';

            if( effecDateFromACE.dbValue && effecDateFromACE.uiValue !== data.occurrenceManagementTodayTitle.uiValue ) {
                date = effecDateFromACE.dbValue;
                date = dateTimeService.formatDate( date );
                effecDateFromACE.uiValue = date.toString();
            }
            uwPropertyService.updateModelData( data.effecDate, effecDateFromACE.dbValue, [ effecDateFromACE.uiValue ], false, false, false, {} );
        }
        return effecDateFromACE.dbValue;
    }
};

var getEffectiveDateFromRevisionRule = function( currentRevisionRule ) {
    if( currentRevisionRule ) {
        var currentRevisionRuleModelObject = cdm.getObject( currentRevisionRule.dbValues );
        if( currentRevisionRuleModelObject ) {
            if( currentRevisionRuleModelObject.props && currentRevisionRuleModelObject.props.rule_date ) {
                var effectiveDateProperty = {
                    dbValue: currentRevisionRuleModelObject.props.rule_date.dbValues[ 0 ]
                };
            }
            return effectiveDateProperty;
        }
    }
};

var getDefaultEffectiveDate = function( data ) {
    if( data ) {
        return _.clone( data.occurrenceManagementTodayTitle, true );
    }
};

/**
 * This method is used to get the effectivity unit from Product Context Info
 * @param {Object} data the view model data
 * @param {Object} productContextInfo the product context info from the CTX
 * @returns {String} the effectivity unit value
 */
export let effectivityUnitFromPCI = function( data, productContextInfo ) {
    if( productContextInfo.props ) {
        var aceEffectiveUnit = getEffectiveUnitFromProductContextInfo( productContextInfo );
        if( !aceEffectiveUnit || !aceEffectiveUnit.dbValue && aceEffectiveUnit.dbValues[ 0 ] === '' ) {
            var currentRevisionRule = getRevRuleFromProductContextInfo( productContextInfo );
            aceEffectiveUnit = getEffectiveUnitFromRevisionRule( currentRevisionRule );
            if( !aceEffectiveUnit || !aceEffectiveUnit.dbValue && aceEffectiveUnit.dbValues[ 0 ] === '' ) {
                if( data && data.effecUnits ) {
                    aceEffectiveUnit = getEffectivityGroupsFromProductContextInfo( data, productContextInfo );
                    if( !aceEffectiveUnit || !aceEffectiveUnit.uiValue ) {
                        aceEffectiveUnit = getDefaultEffectiveUnit( data );
                    }
                }
            }
        }

        var endItems = [];
        if( productContextInfo.props.awb0EffEndItem.dbValues[ 0 ] !== null ) {
            endItems.push( productContextInfo.props.awb0EffEndItem );
        } else if( productContextInfo.props.awb0Product ) {
            endItems.push( productContextInfo.props.awb0Product );
        }

        var endItemsFromContext = [];
        if( productContextInfo.props.awb0EffEndItem.dbValues[ 0 ] !== null ) {
            endItemsFromContext.push( productContextInfo.props.awb0EffEndItem );
        } else if( productContextInfo.props.awb0Product ) {
            endItemsFromContext.push( productContextInfo.props.awb0Product );
        }

        var units = _.clone( data.effectivityUnitSectionAllUnitsValue, true );

        if( aceEffectiveUnit ) {
            var effectiveUnitValue = _.get( aceEffectiveUnit, "dbValue", '' );

            if( effectiveUnitValue !== null && effectiveUnitValue !== '' ) {
                units.dbValue = aceEffectiveUnit.dbValue;
                units.uiValue = aceEffectiveUnit.dbValue;
            } else {
                effectiveUnitValue = _.get( aceEffectiveUnit, "dbValues[0]", '' );
                if( effectiveUnitValue !== null && effectiveUnitValue !== '' ) {
                    units.dbValue = aceEffectiveUnit.dbValues[ 0 ];
                    units.uiValue = aceEffectiveUnit.uiValues[ 0 ];
                }
            }
        }

        var effecUnits = parseInt( units.dbValue );

        if( isNaN( effecUnits ) ) {
            units.dbValue = "-1";
        }
        if( data && data.effecUnits ) {
            data.effecUnits.displayValues.push( units.uiValue );
            data.effecUnits.uiValues = [];
            data.effecUnits.uiValues.push( units.uiValue );
            data.effecUnits.uiValue = units.uiValue;
            data.effecUnits.dbValue = units.dbValue;
            data.effecUnits.dbValues = [];
            data.effecUnits.dbValues.push( units.dbValue );
            data.endItems = endItems;
            data.endItemsFromContext = endItemsFromContext;
        }
        return units.dbValue;
    }
};

var getEffectiveUnitFromProductContextInfo = function( productContextInfo ) {
    var effecUnit = productContextInfo.props.awb0EffUnitNo;
    if( effecUnit ) {
        return effecUnit;
    }
};

var getRevRuleFromProductContextInfo = function( productContextInfo ) {
    var revRule = productContextInfo.props.awb0CurrentRevRule;
    if( revRule ) {
        return revRule;
    }
};

var getEffectiveUnitFromRevisionRule = function( currentRevisionRule ) {
    if( currentRevisionRule && currentRevisionRule.dbValues ) {
        var currentRevisionRuleModelObject = cdm.getObject( currentRevisionRule.dbValues );
        if( currentRevisionRuleModelObject && currentRevisionRuleModelObject.props &&
            currentRevisionRuleModelObject.props.rule_unit && currentRevisionRuleModelObject.props.rule_unit.uiValues ) {
            return currentRevisionRuleModelObject.props.rule_unit;
        }
    }
};

var getEffectivityGroupsFromProductContextInfo = function( data, productContextInfo ) {
    if( productContextInfo.props.awb0EffectivityGroups &&
        productContextInfo.props.awb0EffectivityGroups.dbValues.length > 0 ) {
        var effectivityGroupProperty = {
            "dbValue": "-1"
        };

        if( productContextInfo.props.awb0EffectivityGroups.dbValues.length > 1 ) {
            effectivityGroupProperty.uiValue = data.multipleGroups.uiValue;
        } else {
            var groupItemRev = cdm.getObject( productContextInfo.props.awb0EffectivityGroups.dbValues[ 0 ] );

            effectivityGroupProperty.uiValue = groupItemRev.props.object_name.uiValues[ 0 ];
        }
        return effectivityGroupProperty;
    }
};

var getDefaultEffectiveUnit = function( data ) {
    if( data ) {
        return _.clone( data.effectivityUnitSectionAllUnitsValue, true );
    }
};

/**
 * This method is used to get the variant rules from Product Context Info
 * @param {Object} data the view model data
 * @param {Object} productContextInfo the product context info from the CTX
 * @returns {Array} the variant rules
 */
export let variantRuleFromPCI = function( data, productContextInfo ) {
    var currentVariantRules = _.get( productContextInfo, 'props.awb0VariantRules', undefined );
    var variantRuleProperties = [];

    if( currentVariantRules && currentVariantRules.dbValues && currentVariantRules.dbValues.length > 0 ) {
        for( var i = 0; i < currentVariantRules.dbValues.length; i++ ) {
            variantRuleProperties.push( {
                uid: currentVariantRules.dbValues[ i ],
                uiValue: currentVariantRules.uiValues[ i ]
            } );
        }
    }
    if( variantRuleProperties.length === 0 && data && data.defaultVariantRule ) {
        var defaultVariantRule = getDefaultVariantRule( data );

        if( defaultVariantRule ) {
            defaultVariantRule.ruleIndex = 0;
        }
        variantRuleProperties[ 0 ] = defaultVariantRule;
    }

    if( variantRuleProperties && variantRuleProperties.length > 0 && data && data.variantRule ) {
        data.variantRule.dispValue = variantRuleProperties[ 0 ].uiValue;
        data.variantRule.uiValue = variantRuleProperties[ 0 ].uiValue;
        if( variantRuleProperties[ 0 ].uid ) {
            data.variantRule.dbValue = variantRuleProperties[ 0 ].uid;
        } else {
            data.variantRule.dbValue = '';
        }
    }

    var svrOwningItem = _.get( productContextInfo, 'props.awb0VariantRuleOwningRev', undefined );
    var openedProduct = _.get( productContextInfo, 'props.awb0Product', undefined );

    if( !svrOwningItem || ( svrOwningItem.isNulls && svrOwningItem.isNulls.length > 0 &&
            svrOwningItem.isNulls[ 0 ] === true && openedProduct ) ) {
        svrOwningItem = openedProduct;
    }
    if( svrOwningItem && data ) {
        data.svrOwningItem = svrOwningItem;
    }
    if( openedProduct && data ) {
        data.openedProduct = openedProduct;
    }
    return variantRuleProperties;
};

var getDefaultVariantRule = function( data ) {
    if( data ) {
        return _.clone( data.defaultVariantRule, true );
    }
};

/**
 * This method is used to populate the configuration values on recipe builder with values coming from event data
 * @param {Object} data the view model data
 * @param {Object} eventData the event data from the event
 */
export let populateConfiguration = function( data, eventData ) {
    if( data && eventData ) {
        if( eventData.currentRevisionRule && eventData.currentRevisionRule.uiValue ) {
            data.revisionRule.dispValue = eventData.currentRevisionRule.uiValue;
            data.revisionRule.uiValue = eventData.currentRevisionRule.uiValue;
        }
        if( eventData.currentEffecUnit ) {
            data.effecUnits.displayValues.push( eventData.currentEffecUnit.toString() );
            data.effecUnits.uiValues.push( eventData.currentEffecUnit.toString() );
            data.effecUnits.uiValue = eventData.currentEffecUnit.toString();
        }
        if( eventData.selectedEffecDate ) {
            var date = dateTimeService.formatDate( eventData.selectedEffecDate );
            uwPropertyService.updateModelData( data.effecDate, eventData.selectedEffecDate, [ date.toString() ], false, false, false, {} );
        }
        if( eventData.currentVariantRule ) {
            data.variantRule.dispValue = eventData.currentVariantRule;
            data.variantRule.uiValue = eventData.currentVariantRule;
        }
    }
};

export let disableCommandsVisibility = function() {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx ) {
        recipeCtx.hasViewManagementLicense = false;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    }
};

export let validateInScopeNavigation = function( data, recipeCtx ) {
    recipeCtx.isInScopeNavigationVisible = false;
    if( recipeCtx.context ) {
        data.inContext.propertyDisplayName = data.i18n.evm1InContext;
        recipeCtx.isInScopeNavigationVisible = true;
    } else {

        _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
            var rootElement = cdm.getObject( seedInfo.rootElement.uid );
            if( rootElement ) {
                data.inContext.propertyDisplayName = data.i18n.evm1InBom;
                recipeCtx.isInScopeNavigationVisible = true;
                return true;
            }
        } );
    }
    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
};

export default exports = {
    confirmConfigAdd,
    closureRulesSOA,
    getClosureRuleList,
    validateClosureRule,
    generateShowResultTable,
    getManageRecipeInput,
    getManageRecipeResponse,
    updateRevisionRuleNB,
    unloadContent,
    initializeBuilderConfig,
    revisionRuleFromPCI,
    effectivityDateFromPCI,
    effectivityUnitFromPCI,
    variantRuleFromPCI,
    populateConfiguration,
    disableCommandsVisibility,
    validateInScopeNavigation
};
app.factory( 'Evm1RecipeBuilderService', () => exports );
