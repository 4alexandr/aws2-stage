// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
   define
 */

/**
 * @module js/Att1RevisionRuleConfigurationService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import parammgmtUtlSvc from 'js/Att1ParameterMgmtUtilService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

var exports = {};

/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let populateConfPanelWithCurrentRevisionRule = function( data ) {
    if( data ) {
        var currentRevisionRule = getCurrentlyAppliedRevisionRule( data );
        if( currentRevisionRule ) {
            data.currentRevisionRule = currentRevisionRule;
        }
    }
};
export let applyRevisionRuleSelectionChange = function( data ) {
    var activeRevisionRule = null;
    var currentRevisionRule = getCurrentlyAppliedRevisionRule( data );
    var selectedRevisionRuleUID = _.get( data, 'eventData.selectedObjects[0].uid', undefined );
    //check for the case when user has selected same value as applied rev rule
    if( currentRevisionRule.dbValue !== selectedRevisionRuleUID ) {
        activeRevisionRule = data.eventData.selectedObjects[ 0 ].uid;
        _.set( appCtxSvc, 'ctx.parammgmtctx.activeRevisionRule', activeRevisionRule );
        eventBus.publish( 'primaryWorkarea.reset' );
    } else {
        eventBus.publish( 'awPopupWidget.close' );
    }
};

/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let applySavedRevisionRule = function( data ) {
    if( data && data.eventData && data.eventData.activeRevisionRuleObj ) {
        var currentRevisionRule = getCurrentlyAppliedRevisionRule( data );
        //it means that cdm object is not in sync with server so update the selected value to UI
        if( currentRevisionRule.dbValue !== data.eventData.activeRevisionRuleObj.dbValue ) {
            var revRuleVMP = { dbValues: [ data.eventData.activeRevisionRuleObj.dbValue ], uiValues: [ data.eventData.activeRevisionRuleObj.props.object_string.dbValues[ 0 ] ] };
            data.currentRevisionRule = parammgmtUtlSvc.createViewModelProperty( revRuleVMP );
        } else {
            data.currentRevisionRule = currentRevisionRule;
        }
    }
    //refresh SWA ParameterTable
    eventBus.publish( 'refreshAtt1ShowParamProxyTable' );
    eventBus.publish( 'awPopupWidget.close' );
};

/**First try to get the revision rule from Configuration Context Object. If its not available then
 *  Apply the Latest Working Revision Rule from Preference.
 *  @param {Object} data - The 'data' object from viewModel.
 * Returns the Currently applied variant Rule
 * @returns {object} appliedRevisionRule
 */
var getCurrentlyAppliedRevisionRule = function( data ) {
    var appliedRevisionRule = null;
    var revRuleVmProperty = null;
    appliedRevisionRule = parammgmtUtlSvc.getRequiredPropValueFromConfigurationContext( 'revision_rule' );
    if( !appliedRevisionRule ) {
        var defaultRevisionRule = null;
        if( data && data.preferences && data.preferences.TC_config_rule_name && data.preferences.TC_config_rule_name.length !== 0 ) {
            defaultRevisionRule = data.preferences.TC_config_rule_name[ 0 ];
        } else {
            defaultRevisionRule = 'Latest Working';
        }
        appliedRevisionRule = { dbValues: [ 'QkWtKD8yJcQ1ZA' ], uiValues: [ defaultRevisionRule ] };
    }
    revRuleVmProperty = parammgmtUtlSvc.createViewModelProperty( appliedRevisionRule );
    return revRuleVmProperty;
};
/**
 * Process the response from Server
 * @argument {Object} response  soa response
 * @returns {Object} revisionRules revision rules
 */
export let processRevisionRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var revisionRules = [];
    if( response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                var uid = searchResults.objects[ x ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                if( obj ) {
                    revisionRules.push( obj );
                }
            }
        }
    }
    return revisionRules;
};
export default exports = {
    populateConfPanelWithCurrentRevisionRule,
    applyRevisionRuleSelectionChange,
    applySavedRevisionRule,
    processRevisionRules
};
app.factory( 'Att1RevisionRuleConfigurationService', () => exports );
