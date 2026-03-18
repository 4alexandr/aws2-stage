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
 * @module js/Evm1CreateRecipeFromSelection
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import Evm1RecipeBuilderService from 'js/Evm1RecipeBuilderService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _data = null;

export let navigateAndCreateInput = function( data ) {
    data.clearSelectedType = clearSelectedType;

    if( !data.eventData && data.creationType ) {
        return;
    }
    if( data.eventData && data.eventData.selectedObjects ) {
        if( data.eventData.selectedObjects.length === 0 ) {
            if( data.dataProviders.awTypeSelector &&
                data.dataProviders.awTypeSelector.selectedObjects.length === 1 ) {
                data.creationType = data.dataProviders.awTypeSelector.selectedObjects[ 0 ];
            }
        } else {
            data.creationType = data.eventData.selectedObjects[ 0 ];
            if( data.creationType.props.type_name.uiValue !== 'undefined' ) {
                data.creationType.props.type_name.propertyDisplayName = data.creationType.props.type_name.uiValue;
            }
        }
    } else {
        data.creationType = null;
    }

    // clear the event data. This is needed to ensure updateDeclModel does not go in recursion
    data.eventData = null;
};

var clearSelectedType = function() {
    if( _data ) {
        _data.creationType = null;
    }
};

export let initNavigateFunction = function( data ) {
    _data = data;
    data.clearSelectedType = clearSelectedType;
};

/**
 * This method is used create the input for calling the ManageRecipe SOA for create manage action
 * This is specifically for creating a recipe from BOM selection/s
 * @param {object} data The view-model data
 * @returns {Object} input The input used as input for SOA
 */
export let ManageRecipesInput = function( data ) {
    var input = [];
    var recipeDesc = '';
    var revRuleOfSelectedBOM = '';
    var occmgmtCtx = appCtxSvc.getCtx( 'occmgmtContext' );

    //Save the product context for testing purpose
    var acePCInfo = _.cloneDeep( occmgmtCtx.productContextInfo );

    // Check if recipe object has description and set it
    if( data.object_desc.dbValue && data.object_desc.dbValue !== '' ) {
        recipeDesc = data.object_desc.dbValue;
    }
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    //Check if the BOM selections have a revision set on it, else send in the global revision rule
    if( occmgmtCtx && occmgmtCtx.productContextInfo && occmgmtCtx.productContextInfo.props &&
        occmgmtCtx.productContextInfo.props.awb0CurrentRevRule &&
        occmgmtCtx.productContextInfo.props.awb0CurrentRevRule.uiValues ) {
        if( occmgmtCtx.productContextInfo.props.awb0CurrentRevRule.uiValues[ 0 ] !== '' && occmgmtCtx.productContextInfo.props.awb0CurrentRevRule.uiValues[ 0 ] !== undefined ) {
            revRuleOfSelectedBOM = occmgmtCtx.productContextInfo.props.awb0CurrentRevRule.uiValues[ 0 ];
            if( recipeCtx ) {
                recipeCtx.revRuleOfSelectedBOM = revRuleOfSelectedBOM;
                recipeCtx.acePCInfo = acePCInfo;
                recipeCtx.populateConfigFromAce = true;
                appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
            } else {
                recipeCtx = {
                    revRuleOfSelectedBOM: revRuleOfSelectedBOM,
                    acePCInfo: acePCInfo,
                    populateConfigFromAce: true
                };
                appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
            }
        }
    }
    // EVM1 TOBE - Also we have to send the product context from ace
    var inputData = {
        clientId: 'Create',
        manageAction: 'Create',
        recipeCreInput: {
            boName: 'Fnd0SearchRecipe',
            propertyNameValues: {
                object_name: [ data.object_name.dbValue ],
                object_desc: [ recipeDesc ]
            },
            compoundCreateInput: {}
        },
        recipeObject: undefined
    };

    // Check if seed selections are present i.e. BOM elements are selected in ACE.
    if( occmgmtCtx && occmgmtCtx.selectedModelObjects && occmgmtCtx.selectedModelObjects.length > 0 ) {
        var modelObjects = occmgmtCtx.selectedModelObjects;
        var selectContentInputs = [];
        for( var i = 0; i < modelObjects.length; i++ ) {
            var modelObj = modelObjects[ i ];
            if( modelObj.uid && modelObj.type ) {
                var selectedObj = {
                    uid: modelObj.uid,
                    type: modelObj.type
                };
                selectContentInputs.push( selectedObj );
            }
        }

        // Set the Revision Rule from ACE PC
        var revRuleFromAce = Evm1RecipeBuilderService.revisionRuleFromPCI( {}, occmgmtCtx.productContextInfo );
        var effecDateFromAce = Evm1RecipeBuilderService.effectivityDateFromPCI( data, occmgmtCtx.productContextInfo );
        var units = Evm1RecipeBuilderService.effectivityUnitFromPCI( data, occmgmtCtx.productContextInfo );
        var variantRulesFromAce = Evm1RecipeBuilderService.variantRuleFromPCI( data, occmgmtCtx.productContextInfo );
        var variantRulesObjList = [];
        var effecUnitsFromAce = parseInt( units );

        if( !revRuleFromAce ) {
            revRuleFromAce = '';
        }

        if( !effecDateFromAce ) {
            effecDateFromAce = '';
        }

        if( isNaN( effecUnitsFromAce ) ) {
            effecUnitsFromAce = -1;
        }

        var endItemFromAce = {
            uid: '',
            type: ''
        };

        if( occmgmtCtx.productContextInfo.props.awb0EffEndItem && occmgmtCtx.productContextInfo.props.awb0EffEndItem.dbValues &&
            occmgmtCtx.productContextInfo.props.awb0EffEndItem.dbValues.length > 0 ) {
            var uid = occmgmtCtx.productContextInfo.props.awb0EffEndItem.dbValues[ 0 ];
            if( uid !== null ) {
                endItemFromAce.uid = uid;
            }
        } else if( occmgmtCtx.productContextInfo.props.awb0Product && occmgmtCtx.productContextInfo.props.awb0Product.dbValues &&
            occmgmtCtx.productContextInfo.props.awb0Product.dbValues.length > 0 ) {
            var uid = occmgmtCtx.productContextInfo.props.awb0Product.dbValues[ 0 ];
            if( uid !== null ) {
                endItemFromAce.uid = uid;
            }
        }

        if( variantRulesFromAce && variantRulesFromAce.length > 0 ) {
            for( var i = 0; i < variantRulesFromAce.length; i++ ) {
                var variantRule = variantRulesFromAce[ i ];
                if( variantRule && variantRule.uid ) {
                    var uid = variantRule.uid;
                    if( uid !== '' ) {
                        variantRulesObjList.push( {
                            uid: uid,
                            type: ''
                        } );
                    }
                }
            }
        }

        inputData.criteriaInput = {
            selectContentInputs: selectContentInputs,
            configSet: {
                revisionRule: revRuleFromAce,
                variantRules: variantRulesObjList,
                effectivityUnit: effecUnitsFromAce,
                effectivityEndItem: endItemFromAce,
                effectivityDate: effecDateFromAce,
                effectivityGroups: []
            },
            criteriaSet: {
                closureRuleNames: [],
                lwoQueryExpression: ''
            },
            productContext: occmgmtCtx.productContextInfo.uid,
            isConfigChanged: false
        };
    }

    input.push( inputData );
    return input;
};

/**
 * This method is used to process the ManageRecipe SOA response
 * @param {object} output The response of SOA
 * @param {object} data The view-model data
 */
export let ManageRecipesResponse = function( output, data ) {
    // Check if response has the created recipe object i.e. it was created successfully
    if( output && output.recipeOutput && output.recipeOutput.length > 0 && output.recipeOutput[ 0 ].recipeObject && output.recipeOutput[ 0 ].recipeObject.uid ) {
        // Cache the created Recipe UID
        var createdRecipeUid = output.recipeOutput[ 0 ].recipeObject.uid;
        data.createdObject = {
            uid: createdRecipeUid
        };
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx ) {
            recipeCtx.isReciepeCreated = true;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx = {
                isReciepeCreated: true
            };
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
        // check if the checkbox 'openAndCreate' was checked
        // if it was then fire an event in order to open the recipe
        if( data.openOnCreate.dbValue === true ) {
            eventBus.publish( 'evm1OpenCreatedRecipe', { uid: createdRecipeUid } );
        }
    }
};

export default exports = {
    navigateAndCreateInput,
    initNavigateFunction,
    ManageRecipesInput,
    ManageRecipesResponse
};
app.factory( 'Evm1CreateRecipeFromSelection', () => exports );
