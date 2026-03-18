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
 * @module js/Att1VariantInfoConfigurationService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import paramgmtUtilSvc from 'js/Att1ParameterMgmtUtilService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _noVariantRule = null;
/**
 *resets the HasVariantConfigContext
 */
export let resetHasVariantConfigContext = function() {
    var hasVariantConfigContext = paramgmtUtilSvc.isVariantConfigurationContextAttached();
    if( hasVariantConfigContext ) {
        appCtxSvc.updatePartialCtx( 'parammgmtctx.hasVariantConfigContext', hasVariantConfigContext );
        var locationContextObject = appCtxSvc.getCtx( 'locationContext' ).modelObject;
        if( locationContextObject && !locationContextObject.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 ) {
            _.set( appCtxSvc, 'ctx.parammgmtctx.showFSC', true );
        }
    }
};
/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 * @returns {Object} appliedVariantRule
 */
 export let getAppliedVariantRuleFromProject = function( data ) {
     var appliedVariantRule;
     _noVariantRule = _.get( data, 'defaultVariantRule.uiValue', undefined );
     var savedVariantRule = paramgmtUtilSvc.getRequiredPropValueFromConfigurationContext( 'variant_rule' );
     if( !savedVariantRule || savedVariantRule && savedVariantRule.dbValues[ 0 ] === '' ) {
         appliedVariantRule = data.defaultVariantRule;
     } else {
         var variantRuleVMP = paramgmtUtilSvc.createViewModelProperty( savedVariantRule );
         appliedVariantRule = variantRuleVMP;
     }
     data.appliedVariantRule = appliedVariantRule;
     return appliedVariantRule;
 };
/**
 *
 * @param {*} data data
 */
export let applyVariantRuleSelectionChange = function( data ) {
    var activeVariantRuleUID = null;
    var currentVariantRule = getAppliedVariantRuleFromProject( data );
    var selectedVariantUID = _.get( data, 'eventData.selectedObjects[0].uid', undefined );
    //check for the case when user has selected same value as applied rev rule
    if( currentVariantRule.dbValue !== selectedVariantUID ) {
        activeVariantRuleUID = data.eventData.selectedObjects[ 0 ].uid;
        _.set( appCtxSvc, 'ctx.parammgmtctx.activeVariantRule', activeVariantRuleUID );
        eventBus.publish( 'primaryWorkarea.reset' );
    } else {
        eventBus.publish( 'awPopupWidget.close' );
        _.set( appCtxSvc, 'ctx.parammgmtctx.configPerspective', undefined );
    }
};
/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let applySavedVariantRule = function( data ) {
    if( data && data.eventData && data.eventData.activeVariantRuleObj ) {
        var currentVariantRule = getAppliedVariantRuleFromProject( data );
        data.appliedVariantRule = currentVariantRule;
    }
    ///set  saved variant rule to fsc context
    _.set( appCtxSvc, 'ctx.fscContext.currentAppliedVRs', [ data.eventData.activeVariantRuleObj.dbValue ] );
    //refresh SWA ParameterTable
    eventBus.publish( 'refreshAtt1ShowParamProxyTable' );
    eventBus.publish( 'awPopupWidget.close' );
    _.set( appCtxSvc, 'ctx.parammgmtctx.configPerspective', undefined );
};

/**
 * Process the response from Server
 * @param {*} response  list of variant rules
 *  @param {*} data   if no variant rule is supported
 *  @returns {Array} variantRules []
 */
export let processVariantRules = function( response, data ) {
    if( response.partialErrors ) {
        return response;
    }
    var noVariantRule = {
        uid: 'SR:NO_VARIANT_RULE',
        props: {
            object_string: {
                dbValue: _noVariantRule,
                dbValues: [ _noVariantRule ],
                uiValues: _noVariantRule
            }
        },
        type: 'VariantRule',
        getId: function() {
            return this.uid;
        }
    };
    var variantRules = [];
    var isVccObjectAttached = _.get( appCtxSvc, 'ctx.parammgmtctx.hasVariantConfigContext', undefined );
    if( isVccObjectAttached ) {
        var allRules = _.toArray( response.modelObjects );
        variantRules = _.filter( allRules, function( item ) {
            return item.type === 'VariantRule';
        } );
        //for case when no configuration context is attached
    }
    ///Show filtered items based on search string
    var filteredVariantRules = showFilteredVariantRules( variantRules, noVariantRule, data, isVccObjectAttached );
    if( filteredVariantRules.length > 0 ) {
        variantRules = filteredVariantRules;
    }
    response = _.set( response, 'totalFound', variantRules.length );
    response = _.set( response, 'totalLoaded', variantRules.length );
    return variantRules;
};
/**
 *  search within variantRules in client Side. Need to changed when dataProvider is written for getting variantRules
 * @param {*} variantRules  list of variant rules
 * @param {boolean} noVariantRule   if no variant rule is supported
 * @param {*} data data
 * @param {boolean} isVccObjectAttached VCC objectAttached
 * @returns {variantRules} variantRules
 */
var showFilteredVariantRules = function( variantRules, noVariantRule, data, isVccObjectAttached ) {
    var matchedItem = null;
    var variantSearchString = data.variantRuleFilterBox.dbValue;
    if( variantSearchString && variantSearchString !== '' ) {
        if( _.startsWith( _noVariantRule.toUpperCase(), variantSearchString.toUpperCase() ) ) {
            matchedItem = noVariantRule;
        }
        if( matchedItem ) {
            variantRules.splice( 0, 0, matchedItem );
        }
        var variantRulesCopy = variantRules;
        var filteredVariantRules = _.filter( variantRulesCopy, function( variantRule ) {
            var variantRuleName = variantRule.props.object_string.uiValues[ 0 ];
            var regex = new RegExp( variantSearchString, 'i' );
            return variantRuleName.search( regex ) !== -1;
        } );
        variantRules = filteredVariantRules;
    }
    //add defaultVariantRule object at 1nd position in variantRules
    variantRules.splice( 0, 0, noVariantRule );

    return variantRules;
};
export let applySelectedVariantRuleOnFSC = function( data ) {
    var appliedVariantRules = paramgmtUtilSvc.getRequiredPropValueFromConfigurationContext( 'variant_rule' );
   ///set  saved variant rule to fsc context
   if( appliedVariantRules ) {
    _.set( appCtxSvc, 'ctx.fscContext.currentAppliedVRs', [ appliedVariantRules.dbValues[0] ] );
   }
};
export let initializeFSCForOtherObjThanProject = function( openedObject ) {
    exports.resetHasVariantConfigContext();
    if( openedObject ) {
        appCtxSvc.updateCtx( 'selected', cdm.getObject( openedObject.props.crt0Domain.dbValues[0] ) );
    }
};

/**
 * Variant Info Configuration service utility
 */

export default exports = {
    resetHasVariantConfigContext,
    initializeFSCForOtherObjThanProject,
    getAppliedVariantRuleFromProject,
    applySavedVariantRule,
    applyVariantRuleSelectionChange,
    processVariantRules,
    applySelectedVariantRuleOnFSC
};
app.factory( 'Att1VariantInfoConfigurationService', () => exports );
