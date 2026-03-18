// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Service for handling effectivity intent with available families and their values.
 *
 * @module js/apsEffectivityIntentService
 */
import * as app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

/** formula for effectivity intent */
var _formula = null;
var _existingFormulaToEdit = null;
var _existingIntentCtx;
var _availableEffResp = null;

var exports = {};

/**
 * This function will initialize the active ACE context with the Intent Item Id and namespace.
 * This value will be used by the view model of the effectivity intent sub view to query the
 * available effectivity intents.
 */
export let initIntentContext = function() {
    // Populate effectivity intent related context info if we are in ACE.
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    if( activeContext ) {
        // Populate the current intent formula, if any. Clear otherwise.
        populateInitialIntentFormula( activeContext );
        _existingIntentCtx = activeContext.effIntentCtx;
        var readyOnly = false;
        if( activeContext.productContextInfo ) {
            readyOnly = isReadOnly( activeContext.productContextInfo );

            if( !readyOnly && activeContext.productContextInfo.props.fgf0EffContextId &&
                activeContext.productContextInfo.props.fgf0EffContextId.dbValues[ 0 ] ) {
                if( !_existingIntentCtx ) {
                    activeContext.effIntentCtx = {
                        effIntentCtxId: activeContext.productContextInfo.props.fgf0EffContextId.dbValues[ 0 ],
                        effIntentCtxNamespace: activeContext.productContextInfo.props.fgf0EffContextNamespace.dbValues[ 0 ],
                        isReadOnly: readyOnly
                    };

                    // Now fire an event to let the Intent sub view model know that the context ID has changed and it need to
                    // fetch new values
                    _availableEffResp = null;
                    eventBus.publish( 'apscoreIntentPanel.retrieveNewIntentValues' );
                } else if( activeContext.productContextInfo.props.fgf0EffContextId.dbValues[ 0 ] !== _existingIntentCtx.effIntentCtxId ) {
                    activeContext.effIntentCtx = {
                        effIntentCtxId: activeContext.productContextInfo.props.fgf0EffContextId.dbValues[ 0 ],
                        effIntentCtxNamespace: activeContext.productContextInfo.props.fgf0EffContextNamespace.dbValues[ 0 ],
                        isReadOnly: readyOnly
                    };

                    // Now fire an event to let the Intent sub view model know that the context ID has changed and it need to
                    // fetch new values
                    _availableEffResp = null;
                    eventBus.publish( 'apscoreIntentPanel.retrieveNewIntentValues' );
                } else if( _availableEffResp ) {
                    // Nothing to be fetched from the server, so just recreate the widget.
                    exports.loadIntentFamilies( _availableEffResp );
                } else {
                    eventBus.publish( 'apscoreIntentPanel.retrieveNewIntentValues' );
                }
            } else {
                delete activeContext.effIntentCtx;
            }
        }
    }
};

// This function will make sure that the intent formula is properly set, no matter where the intent directive is loaded from.
var populateInitialIntentFormula = function( activeContext ) {
    // If we are in configuration panel then the intent formula needs to be extracted from the PCI.
    if( appCtxSvc.ctx.activeNavigationCommand && appCtxSvc.ctx.activeNavigationCommand.commandId === 'Fgf0ConfigurationFilter' ) {
        // To support MSM, retrieve new intent as multiple contexts exist.
        // exports.clearExistingFormula();
        _availableEffResp = null;
        eventBus.publish( 'apscoreIntentPanel.retrieveNewIntentValues' );
    }
};

// This function will try to find out whether the active effectivity feature is read only or not.
var isReadOnly = function( productContextInfo ) {
    var supportedFeaturesObjects = productContextInfo.props.awb0SupportedFeatures;
    if( supportedFeaturesObjects ) {
        for( var supportedFeatureObject = 0; supportedFeatureObject < supportedFeaturesObjects.dbValues.length; supportedFeatureObject++ ) {
            var featureObject = cdm.getObject( supportedFeaturesObjects.dbValues[ supportedFeatureObject ] );

            if( featureObject.type === 'Awb0FeatureList' ) {
                var nonModifiableFeatures = featureObject.props.awb0NonModifiableFeatures;

                for( var feature = 0; feature < nonModifiableFeatures.dbValues.length; feature++ ) {
                    if( nonModifiableFeatures.dbValues[ feature ] === 'Awb0UnitRangeEffectivityFeature' ||
                        nonModifiableFeatures.dbValues[ feature ] === 'Awb0DateRangeEffectivityFeature' ||
                        nonModifiableFeatures.dbValues[ feature ] === 'Fgf0AllEffectivityConfigFeature' ||
                        nonModifiableFeatures.dbValues[ feature ] === 'Fgf0EffectivityIntentFeature' ) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
};

/**
 * Retrieves intent families and their values recursively from configExpressions.
 *
 * @param {Object} effIntents - effectivity intents object
 *
 * @param {Object} configExpression - config expressions
 *
 */
function loadIntentFamiliesInternal( effIntents, currentValueMap, configExpression ) {
    if( configExpression.value !== null ) {
        var family = configExpression.value.family;
        if( family.type === 'ConfigurationFamily' ) {
            var namespace = family.props.namespace.dbValues[ 0 ];
            var famName = family.props.name.dbValues[ 0 ];

            if( namespace !== 'Teamcenter::' ) {
                var value = configExpression.value.name;

                if( !effIntents.familiesValuesMap[ famName ] ) {
                    effIntents.familiesValuesMap[ famName ] = {};
                    effIntents.familiesValuesMap[ famName ].response = [];

                    var famProperty = exports.createIntentProperty( famName, false );
                    var famKey = {};
                    famKey.famProp = famProperty;

                    // populate current value from getEffectivitySubsetTable SOA
                    var curValProperty;
                    var anyValProperty = exports.createIntentProperty( exports.getAnyValueDisplayName(), false );
                    if( currentValueMap !== {} && currentValueMap.hasOwnProperty( famName ) ) {
                        curValProperty = exports.createIntentProperty( currentValueMap[ famName ], false );
                    } else {
                        curValProperty = anyValProperty;
                    }

                    famKey.currentValue = curValProperty;
                    effIntents.families.push( famKey );

                    // Add any to values list
                    effIntents.familiesValuesMap[ famName ].response.push( anyValProperty );
                }

                var exist = false;
                for( var inx = 0; inx < effIntents.familiesValuesMap[ famName ].response.length; inx++ ) {
                    if( effIntents.familiesValuesMap[ famName ].response[ inx ].uiValue === value ) {
                        exist = true;
                        break;
                    }
                }
                if( !exist ) {
                    var valProp = exports.createIntentProperty( value, true );
                    valProp.familyName = famName;
                    effIntents.familiesValuesMap[ famName ].response.push( valProp );
                }
            }
        }
    }

    for( var i = 0; i < configExpression.subExpressions.length; i++ ) {
        loadIntentFamiliesInternal( effIntents, currentValueMap, configExpression.subExpressions[ i ] );
    }
}

/**
 * Get display name of Any text from i10n.
 *
 * @return {Object} - the localized text for Any
 *
 */
export let getAnyValueDisplayName = function() {
    var localTextBundle = localeService.getLoadedText( 'ApsEffectivityMessages' );
    return localTextBundle.ApsAny;
};

/**
 * Creates a view model property for given property value.
 *
 * @return {Object} - the view model property created.
 *
 */
export let createIntentProperty = function( propVal, setPropVal ) {
    var vwProp = uwPropertyService.createViewModelProperty( propVal, propVal, 'STRING', '', '' );
    if( setPropVal ) {
        vwProp.dbValue = propVal;
        vwProp.uiValue = propVal;
        vwProp.propertyDisplayName = propVal;
    }

    return vwProp;
};

/**
 * Retrieves effectivity intent families and their values and populate map data for intent authoring.
 *
 * @param {Object} data - data object
 *
 */
export let loadIntentFamilies = function( response ) {
    _availableEffResp = response;
    var effIntents = {};
    effIntents.familiesValuesMap = {};
    effIntents.families = [];
    var currentValueMap = {};
    if( exports.getExistingFormula() !== null ) {
        var formulaStrs = exports.getExistingFormula().split( ' & ' ).join( ' | ' ).split( ' | ' );
        formulaStrs.forEach( function( curFormula ) {
            var expressionStr = curFormula.substr( curFormula.indexOf( ']' ) + 1, curFormula.length );
            var famVal = expressionStr.split( ' = ' );
            currentValueMap[ famVal[ 0 ] ] = famVal[ 1 ];
        } );
    }
    loadIntentFamiliesInternal( effIntents, currentValueMap, response.configExpressions[ 0 ] );

    if( !appCtxSvc.ctx.effIntents ) {
        appCtxSvc.ctx.effIntents = {};
    }
    appCtxSvc.ctx.effIntents.families = effIntents.families;
    appCtxSvc.ctx.effIntents.familiesValuesMap = effIntents.familiesValuesMap;
};

/**
 * Retrieves effectivity intent existing formula string returned from getEffectivitySubsetTables SOA.
 * @returns {String} existing intent formula
 */
export let getExistingFormula = function() {
    // return existing formula
    return _existingFormulaToEdit;
};

/**
 * Clears the existing formula returned from getEffectivitySubsetTables SOA.
 *
 */
export let clearExistingFormula = function() {
    // clear existing formula
    _existingFormulaToEdit = null;
};

/**
 * This method returns effectivity intent formula based on data provided from intent UI.
 *
 * @return {object} - string formula
 */
export let getEffIntentFormula = function() {
    return _formula;
};

/**
 * This method returns effectivity intent formula based on data provided from intent UI.
 *
 * @return {object} - string formula
 */
export let setIntentFormulaToEdit = function( formulaStr ) {
    _existingFormulaToEdit = formulaStr;
    _formula = formulaStr;
};

/**
 * This method returns effectivity intent item.
 *
 * @return {object} - intent item object
 */
export let getIntentItem = function() {
    return appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.fgf0EffContextId.dbValues[ 0 ];
};

/**
 * This method builds effectivity intent formula based on data provided from intent UI.
 *
 * @param {Object} data - data object
 *
 * @return {object} - string formula
 */
export let setEffIntentFormula = function( effIntents ) {
    var formula = '';
    var andToken = ' & ';
    var intentItemName = exports.getIntentItem();

    for( var idx = 0; idx < effIntents.families.length; idx++ ) {
        var famName = effIntents.families[ idx ].famProp.propertyDisplayName;
        var valueName = effIntents.families[ idx ].currentValue.propertyDisplayName;
        if( valueName !== exports.getAnyValueDisplayName() ) {
            formula = formula + '[' + intentItemName + ']' + famName + '=' + valueName + andToken;
        }
    }

    // trim last token
    _formula = formula.substr( 0, formula.length - 3 );
};

export default exports = {
    initIntentContext,
    getAnyValueDisplayName,
    createIntentProperty,
    loadIntentFamilies,
    getExistingFormula,
    clearExistingFormula,
    getEffIntentFormula,
    setIntentFormulaToEdit,
    getIntentItem,
    setEffIntentFormula
};
/**
 * APS effectivity intent service.
 *
 * @param {Object} uwPropertyService - uw property service
 * @param {Object} localeService - locale service
 * @param {Object} appCtxSvc - application context service
 * @return {Object} - Service instance
 * @memberof NgServices
 * @member swcService
 */
app.factory( 'apsEffectivityIntentService', () => exports );
