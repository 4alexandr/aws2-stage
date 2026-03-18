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
 * @module js/Evm1ConfigurationPanelService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import uwPropertyService from 'js/uwPropertyService';
import viewModelObjectService from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import omStateHandler from 'js/occurrenceManagementStateHandler';
import dateTimeService from 'js/dateTimeService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/kernel/soaService';

var exports = {};

var _isSeparatorAdded = false;
var _defaultDate = null;
var _defaultGroupValue = null;
var _defaultUnitValue = null;
var DEFAULT_UNIT = -1;
var _defaultVariantRule = null;
var _customVariantRule = null;
var _data = null;

/**
 * This method is used to initialize the Revision Rule for the Configuration Panel and set it on data
 * @param {Object} data The viewModel data for revision rule view
 */
export let getInitialRevisionRuleConfigData = function( data ) {
    if( data ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        var currentRevisionRule;
        if( recipeCtx && recipeCtx.builderConfigValues ) {
            currentRevisionRule = recipeCtx.builderConfigValues.revisionRule;
            if( currentRevisionRule && currentRevisionRule.uiValue ) {
                data.currentRevisionRule = convertRevisionRuleIntoVMProperty( currentRevisionRule );
            } else {
                data.currentRevisionRule = currentRevisionRule;
            }
            // If we have productContextInfo in the recipeCtx it means its a BOM recipe.
            // For BOM recipe we need to create Context Key object which will be used by ACE to add new Rev Rule.
            if( recipeCtx.productContextInfo ){
                var contextKayObj = {
                    productContextInfo : {
                        uid : recipeCtx.productContextInfo.uid,
                        props: {
                            awb0CurrentRevRule: currentRevisionRule,
                            awb0UseGlobalRevisionRule: {
                                dbValues: [ '0' ]
                            }
                        }
                    },
                    supportedFeatures : {
                        Awb0EnableUseGlobalRevisionRuleFeature : true
                    }
                };
                appCtxSvc.registerCtx( 'evm1ActiveContext', contextKayObj );
            } else {
                // if there is no product context then there should be no evm1ActiveContext
                var evm1ActiveContext = appCtxSvc.getCtx( 'evm1ActiveContext' );
                if( evm1ActiveContext )
                {
                    appCtxSvc.unRegisterCtx( 'evm1ActiveContext' );
                }
            }
        }
    }
};

var convertRevisionRuleIntoVMProperty = function( currentRevisionRule ) {
    var revRuleVMProperty = uwPropertyService.createViewModelProperty( currentRevisionRule.uiValue,
        currentRevisionRule.uiValue, 'STRING', currentRevisionRule.uiValue, '' );
    revRuleVMProperty.uiValue = currentRevisionRule.uiValue;
    revRuleVMProperty.classData = currentRevisionRule;
    return revRuleVMProperty;
};

/**
 * Evaluate starting index of revision rule data provider
 *
 * @param {Object} dp - The revision rule data provider object.
 * @return {integer} start index for revision rule data provider
 */
export let evaluateStartIndexForRevisionRuleDataProvider = function( dp ) {
    if( dp.startIndex === 0 ) {
        return 0;
    }

    var isMarkerPresent = false;

    for( var i = 0; i < dp.viewModelCollection.loadedVMObjects.length; i++ ) {
        if( dp.viewModelCollection.loadedVMObjects[ i ].marker ) {
            isMarkerPresent = true;
            break;
        }
    }
    var extraObjectInList = 0;

    if( isMarkerPresent ) {
        extraObjectInList += 1;
    }
    return dp.viewModelCollection.loadedVMObjects.length - extraObjectInList;
};

/**
 * Process the response from Server to get all the revision rule
 * @param {Object} response The response from SOA
 * @returns {return} The processed revision Rule
 */
export let processRevisionRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var revisionRules = [];
    if( response.endIndex <= 20 ) {
        _isSeparatorAdded = false;
    }
    if( response && response.revisionRules ) {
        var separatorObject = tcViewModelObjectService.createViewModelObjectById( 'separatorObject' );
        separatorObject.marker = response.marker + 1;

        var revisionRulesList = response.revisionRules;
        revisionRulesList.forEach( function( revRuleInfo ) {
            var revisionRule = revRuleInfo.revisionRule;
            revisionRule.serializedRevRule = revRuleInfo.serializedRevRule;
            revisionRules.push( revisionRule );
        } );

        if( !_isSeparatorAdded && response.marker >= 0 && response.marker <= response.endIndex ) {
            revisionRules.splice( response.marker, 0, separatorObject );
            response.totalFound += 1;
            _isSeparatorAdded = true;
        }
    }
    // This is commented out as ACE also considers for couple of preferences associated with Revision Rule which we are not doing currently
    //We might need to support it depending on at what level of depth we want to mimic ACE behaviour
    /* if( response && response.globalRevisionRule && !isDefaultRevisionRuleSupported() ) {
        addGlobalRevisionRuleEntryIfApplicable( response, revisionRules );
    } */
    return revisionRules;
};

// This is commented out as ACE also considers for couple of preferences associated with Revision Rule which we are not doing currently
//We might need to support it depending on at what level of depth we want to mimic ACE behaviour
/* var isDefaultRevisionRuleSupported = function() {
    return omStateHandler.isFeatureSupported( 'Awb0EnableUseDefaultRevisionRuleFeature' );
}; */

/**
 * This method is used to select the changed Revision Rule for the Configuration Panel and set it on data
 * @param {Object} data The viewModel data for revision rule view
 */
export let selectChangedRevisionRule = function( data ) {
    var selectedObjectsLength = _.get( data, 'dataProviders.getRevisionRules.selectedObjects.length', 0 );
    if( selectedObjectsLength > 0 ) {
        var selectedRevRule = data.dataProviders.getRevisionRules.selectedObjects[ 0 ].props.object_name;
        data.currentRevisionRule = convertRevisionRuleIntoVMProperty( selectedRevRule );
        var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );
        if( recipeConfigCtx ) {
            recipeConfigCtx.currentRevisionRule = data.currentRevisionRule;
            appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
        } else {
            recipeConfigCtx = {
                currentRevisionRule: data.currentRevisionRule
            };
            appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
        }
    } else {
        // Update Revision Rule For Non-Bom Use Case.
        var eventData = data.eventMap[ 'awlinkPopup.selected' ];
        if( eventData ) {
            var upadtedRevRule = eventData.property.dbValue.propDisplayValue;

            var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

            if( recipeCtx ) {
                recipeCtx.revisionRuleNB = upadtedRevRule;
                appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
            } else {
                recipeCtx = {
                    revisionRuleNB: upadtedRevRule
                };
                appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
            }
        }
    }
};

/**
 * This method is used to initialize the date effectivity for the Configuration Panel and set it on data
 * @param {Object} data The viewModel data for date effectivity view
 */
export let getInitialDateEffectivityConfigurationData = function( data ) {
    if( data ) {
        clearDateEffDataProvider( data );
        if( data.occurrenceManagementTodayTitle ) {
            _defaultDate = data.occurrenceManagementTodayTitle.uiValue;
        }
    }
    populateEffectiveDate( data );
};

var clearDateEffDataProvider = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getPreferredDateEffectivities ) {
        data.dataProviders.getPreferredDateEffectivities.viewModelCollection.clear();
        data.dataProviders.getPreferredDateEffectivities.selectedObjects = [];
    }
};

var populateEffectiveDate = function( data ) {
    if( data ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx && recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.effecDate ) {
            var builderEffecDate = recipeCtx.builderConfigValues.effecDate;
            var currentEffectiveDate = convertEffectiveDateIntoVMProperty( builderEffecDate );
            if( currentEffectiveDate || currentEffectiveDate.uiValue ) {
                data.currentEffectiveDate = currentEffectiveDate;
            }
        }
    }
};

var convertEffectiveDateIntoVMProperty = function( builderEffecDate ) {
    var effectiveDateVMProperty = uwPropertyService.createViewModelProperty(
        builderEffecDate.uiValue,
        builderEffecDate.uiValue, 'DATE',
        builderEffecDate.uiValue, '' );
    effectiveDateVMProperty.uiValue = builderEffecDate.uiValue;
    return effectiveDateVMProperty;
};

/**
 * This method is used to select the changed date effectivity for the Configuration Panel and set it on data
 * @param {Object} data The viewModel data for date effectivity view
 * @param {Object} eventData The event data from the event
 */
export let selectChangedEffectivityDate = function( data, eventData ) {
    // The effectivity date which is given by event data is actually the current time.
    // The directive by ACE which is used returns this. In order to get the selected date, the directive sets that
    //  on the currentEffectiveData' db value of data. Hence the UI value and DB value of currentEffectiveDate does not reflect
    // the correct synced information.
    var selectedEffecTime = eventData.effectivityDate;
    var selectedEffecDate = data.currentEffectiveDate.dbValue;
    var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );

    if( !selectedEffecTime ) {
        data.currentEffectiveDate.dbValue = _defaultDate;
    }
    if( !selectedEffecDate || selectedEffecDate === null ) {
        data.currentEffectiveDate.dbValue = _defaultDate;
        selectedEffecDate = _defaultDate;
    }
    if( recipeConfigCtx ) {
        recipeConfigCtx.selectedEffecDate = selectedEffecDate;
        appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
    } else {
        recipeConfigCtx = {
            selectedEffecDate: selectedEffecDate
        };
        appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
    }
};

/**
 * Get EndItems
 * @returns {object} The computed end item
 */
export let getEndItems = function() {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    var endItems = [];
    if( recipeCtx && recipeCtx.builderConfigValues ) {
        var builderConfigValues = recipeCtx.builderConfigValues;
        if( builderConfigValues && builderConfigValues.endItems ) {
            endItems = builderConfigValues && builderConfigValues.endItems;
        }
    }
    // place this endItem in endItemToRender context.
    var endItemCtx = appCtxSvc.getCtx( 'endItemToRender' );

    if( !endItemCtx ) {
        appCtxSvc.registerCtx( 'endItemToRender', endItems[ 0 ] );
    } else {
        endItemCtx = endItems[ 0 ];
        appCtxSvc.updateCtx( 'endItemToRender', endItemCtx );
    }

    return { endItems };
};

/**
 * This method is used to get the end item from the context
 * @param {object} data The view model data
 */
export let getEndItemFromContext = function( data, eventData ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    var endItems = [];
    if( recipeCtx && recipeCtx.builderConfigValues ) {
        var builderConfigValues = recipeCtx.builderConfigValues;
        if( builderConfigValues && builderConfigValues.endItemsFromContext ) {
            endItems = builderConfigValues.endItemsFromContext;
        } else if( builderConfigValues && builderConfigValues.endItems ) {
            endItems = builderConfigValues.endItems;
        }
    }
    data.endItems = endItems;
    if( eventData && eventData.isNavigateToConfigPanel ) {
        var navigateEventData = {
            destPanelId: 'Evm1ConfigPanelFilters'
        };
        eventBus.publish( 'awPanel.navigate', navigateEventData );
    }
    eventBus.publish( 'evm1ConfigPanel.revealEndItems' );
};

/**
 * This method is used to initialize the unit effectivity for the Configuration Panel and set it on data
 * @param {Object} data The viewModel data for unit effectivity view
 * @returns {object} the current effectivity unot
 */
export let getInitialUnitEffectivityConfigurationData = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( data && recipeCtx) {
        var currentEffectiveUnit = _.get( recipeCtx, 'builderConfigValues.effecUnits', undefined );
        if( currentEffectiveUnit || currentEffectiveUnit.uiValue ) {
            data.currentEffectiveUnit = currentEffectiveUnit;
        }
        // Check for productContextInfo in the recipeCtx.
        // For BOM recipe we need to create Context Key object which will be used by ACE to add Unit effectivity.
        if( recipeCtx.productContextInfo ){
            var contextKayObj = {
                productContextInfo : {
                    uid : recipeCtx.productContextInfo.uid,
                    props: {
                        awb0EffUnitNo : data.currentEffectiveUnit
                    }
                },
                supportedFeatures : {
                    Awb0GroupEffectivityFeature : false
                }
            };
            appCtxSvc.registerCtx( 'evm1ActiveContextEffectivity', contextKayObj );
        }
    }
};

/**
 * This method is used to select the changed unit Effectivity
 * @param {Object} eventData The event data from the event
 */
export let selectChangedUnitEffectivity = function( eventData ) {
    if( eventData && eventData.effectiveUnit ) {
        var selectedEffecUnit = eventData.effectiveUnit;
        var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );
        if( recipeConfigCtx ) {
            recipeConfigCtx.currentEffecUnit = selectedEffecUnit;
            appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
        } else {
            recipeConfigCtx = {
                currentEffecUnit: selectedEffecUnit
            };
            appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
        }
    }
};

/**
 * Initialize SVR Owning end items Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let initSVROwningItems = function( data ) {
    if( data ) {
        populateSVROwningItems( data );
        eventBus.publish( 'evm1ConfigPanel.revealSVROwningItems' );
    }
};

var populateSVROwningItems = function( data ) {
    if( data ) {
        var svrOwningItemFromPCI = getSVROwningItemFromProductContextInfo();
        updatePanelWithSVROwningItemToRender( svrOwningItemFromPCI );
    }
};

var getSVROwningItemFromProductContextInfo = function() {
    var recipeXtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeXtx && recipeXtx.builderConfigValues && recipeXtx.builderConfigValues.svrOwningItem ) {
        var svrOwningItem = recipeXtx.builderConfigValues.svrOwningItem;
        return svrOwningItem;
    }
};

var updatePanelWithSVROwningItemToRender = function( svrOwningItemToRender ) {
    if( svrOwningItemToRender ) {
        appCtxSvc.updateCtx( 'svrOwningItemToRender', svrOwningItemToRender );
    }
};

/**
 * Get SVROwningItems
 * @return {Array} the SRV owning item
 */
export let getSVROwningItems = function() {
    var svrOwningItemToRender;
    // Check if the SVROwing item was selected, if so then render that
    svrOwningItemToRender = appCtxSvc.getCtx( 'svrOwningItemSelected' );
    if( svrOwningItemToRender ) {
        var svrOwningItems = [];
        svrOwningItems.push( svrOwningItemToRender );
        // unregister the CTX
        svrOwningItemToRender = appCtxSvc.unRegisterCtx( 'svrOwningItemSelected' );
        return svrOwningItems;
    }
    svrOwningItemToRender = appCtxSvc.getCtx( 'svrOwningItemToRender' );
    if( svrOwningItemToRender ) {
        var svrOwningItems = [];
        svrOwningItems.push( svrOwningItemToRender );
        return svrOwningItems;
    }
    return;
};

/**
 * Initialize the Variant Info Configuration Section
 * @param {Object} data the view model data for the variant rules view
 * @returns {Object} view model property of variant rule
 */
export let getInitialVariantConfigurationData = function( data ) {
    if( data ) {
        populateVariantRule( data );
        populateOpenedProduct( data );
        if( data.defaultVariantRule ) {
            _defaultVariantRule = data.defaultVariantRule.propertyDisplayName;
        }
        if( data.customVariantRule ) {
            _customVariantRule = data.customVariantRule.propertyDisplayName;
        }
        clearVariantDataProviderCache( data );
        if( _data !== data ) {
            _data = data;
        }
        return data.appliedVariantRules;
    }
};

var populateVariantRule = function( data ) {
    if( data ) {
        var currentVariantRules = getVariantRuleFromProductContextInfo();
        appCtxSvc.ctx.variantRule = appCtxSvc.ctx.variantRule || {};
        if( currentVariantRules || currentVariantRules[ 0 ].uiValue ) {
            appCtxSvc.ctx.variantRule.showOverlayCommand = true;
            data.appliedVariantRules = currentVariantRules;
            //Since currently property widget is being used instead of ACE widget,
            //have to set the variant rule to the property widget as well
            data.variantRuleList.dbValue = currentVariantRules[ 0 ].dbValue;
            data.variantRuleList.displayValues = [ currentVariantRules[ 0 ].uiValue ];
            data.variantRuleList.newDisplayValues = [ currentVariantRules[ 0 ].uiValue ];
            data.variantRuleList.newValue = currentVariantRules[ 0 ].uiValue;
            data.variantRuleList.uiValue = currentVariantRules[ 0 ].uiValue;
            data.variantRuleList.displayValsModel = [];
        } else {
            appCtxSvc.ctx.variantRule.showOverlayCommand = false;
        }
    }
};

var getVariantRuleFromProductContextInfo = function() {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx && recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.variantRules ) {
        var currentVariantRules = recipeCtx.builderConfigValues.variantRules;
        if( currentVariantRules && currentVariantRules.uiValue ) {
            var variantRuleVMProperties = convertVariantRulesIntoVMProperty( currentVariantRules );
            return variantRuleVMProperties;
        }
    }
};

var convertVariantRulesIntoVMProperty = function( currentVariantRules ) {
    var variantRuleVMProperties = [];
    var variantRuleVMProperty = uwPropertyService.createViewModelProperty(
        currentVariantRules.uiValue,
        currentVariantRules.uiValue, 'STRING',
        currentVariantRules.uiValue, '' );
    variantRuleVMProperty.uiValue = currentVariantRules.uiValue;
    //Set an index for applied rules. This index will be used to determine the index of clicked rule link in case of overlay.
    //This will be helpful when user has applied the same rule multiple times and we want to determine which link of the rule has been clicked.
    variantRuleVMProperty.ruleIndex = 0;
    variantRuleVMProperties[ 0 ] = variantRuleVMProperty;
    return variantRuleVMProperties;
};

var populateOpenedProduct = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx && recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.openProduct ) {
        data.openProduct = recipeCtx.openedProduct;
    }
};

var clearVariantDataProviderCache = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getAllVariantRules ) {
        data.dataProviders.getAllVariantRules.viewModelCollection.clear();
        data.dataProviders.getAllVariantRules.selectedObjects = [];
    }
};

/**
 * Evaluate starting index of variant rule data provider
 *
 * @param {Object} dp - The variant rule data provider object.
 * @return {integer} start index for variant rule data provider
 */
export let evaluateStartIndexForVariantRuleDataProvider = function( dp ) {
    if( dp.startIndex === 0 ) {
        return 0;
    }

    var isMarkerPresent = false;

    for( var i = 0; i < dp.viewModelCollection.loadedVMObjects.length; i++ ) {
        if( dp.viewModelCollection.loadedVMObjects[ i ].marker ) {
            isMarkerPresent = true;
            break;
        }
    }

    var extraObjectsInList = 1; // When only 'No Variant Rule' is present in list
    if( isMarkerPresent ) {
        extraObjectsInList++;
    }
    if( omStateHandler.isFeatureSupported( 'Awb0SupportsCustomVariantRule' ) ) {
        extraObjectsInList++;
    }

    return dp.viewModelCollection.loadedVMObjects.length -
        extraObjectsInList;
};

/**
 * Process the response from Server
 * @param {Object} response The response from SOA call
 * @returns {object} The processed variant rules
 */
export let processVariantRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var variantRules = [];
    if( response.endIndex <= 20 ) {
        _isSeparatorAdded = false;
    }

    var increment = 1;
    var customRuleSupported = omStateHandler.isFeatureSupported( 'Awb0SupportsCustomVariantRule' );

    //Temporary check. Will be removed once we start supporting custom rule panel launch from header
    var parent = $( 'aw-link-with-popup[prop=\'variantRule\'] aw-popup-panel .aw-layout-popup' ).parents( 'aw-header-contribution' );
    if( parent.length && parent[ 0 ].nodeName === 'AW-HEADER-CONTRIBUTION' ) {
        customRuleSupported = false;
    }

    if( customRuleSupported ) {
        increment = 2;
    }

    // Add separator
    if( response.variantRules ) {
        variantRules = response.variantRules;
        addSeparatorToVariantRulesList( response, variantRules, increment );
    }
    // Show filtered items based on search string
    showFilteredVariantRules( response, variantRules, customRuleSupported );

    var processedVariantRules = [];
    for( var i = 0; i < variantRules.length; i++ ) {
        var variantRuleElement = variantRules[ i ];
        if( variantRuleElement && variantRuleElement.props ) {
            var elementProp = variantRuleElement.props;
            var eleObjectString = elementProp.object_string;
            var propertyValue = '';
            if( eleObjectString ) {
                if( eleObjectString.dbValue ) {
                    propertyValue = eleObjectString.dbValue;
                }
                if( eleObjectString.dbValues && eleObjectString.dbValues.length > 0 ) {
                    propertyValue = eleObjectString.dbValues[ 0 ];
                }
                if( propertyValue && propertyValue !== '' ) {
                    var uid = '';
                    if( variantRuleElement.uid ) {
                        uid = variantRuleElement.uid;
                    }
                    processedVariantRules.push( {
                        propDisplayValue: propertyValue,
                        propInternalValue: propertyValue,
                        uid: uid
                    } );
                }
            }
        }
    }
    return processedVariantRules;
};

var addSeparatorToVariantRulesList = function( response, variantRules, increment ) {
    //create separator object with marker information
    var separatorObject = tcViewModelObjectService.createViewModelObjectById( 'separatorObject' );
    separatorObject.marker = response.marker + increment;
    separatorObject.props.object_string = {
        dbValue: ''
    };
    //add separator object to response to render separator in list
    if( !_isSeparatorAdded && response.marker >= 0 && response.marker <= response.endIndex ) {
        variantRules.splice( response.marker, 0, separatorObject );
        response.totalFound++;
        _isSeparatorAdded = true;
    }
};

var showFilteredVariantRules = function( response, variantRules, customRuleSupported ) {
    if( response.endIndex <= 20 ) {
        var matchedItem = null;
        var allVariants = tcViewModelObjectService.createViewModelObjectById( '_defaultVariantRule' );

        allVariants.props.object_string = {
            dbValue: _defaultVariantRule
        };

        var customRule = tcViewModelObjectService.createViewModelObjectById( '_customVariantRule' );

        customRule.props.object_string = {
            dbValue: _customVariantRule
        };

        // No matching rule with search string
        if( response.totalFound === 0 && _data && _data.variantRuleFilterBox.dbValue ) {
            // Show rule based on matching search criteria
            if( _.startsWith( _defaultVariantRule.toUpperCase(), _data.variantRuleFilterBox.dbValue
                    .toUpperCase() ) ) {
                matchedItem = allVariants;
            } else if( customRuleSupported &&
                _.startsWith( _customVariantRule.toUpperCase(), _data.variantRuleFilterBox.dbValue
                    .toUpperCase() ) ) {
                matchedItem = customRule;
            }
        }

        var increment = 1;
        if( matchedItem ) {
            variantRules.splice( 0, 0, matchedItem );
        } else {
            if( customRuleSupported ) {
                // add 'custom' rule at 1st position in response
                variantRules.splice( 0, 0, customRule );
                //add all variants object at 2nd position in response
                variantRules.splice( 1, 0, allVariants );
                increment = 2;
            } else {
                //add all variants object at 1st position in response
                variantRules.splice( 0, 0, allVariants );
            }
        }
        response.totalFound += increment;
    }
};

/**
 * This method is used to select the changed variant Rule
 * @param {Object} data the view model data
 * @param {Object} eventData the event data from the event
 */
export let selectChangedVariantInfo = function( data, eventData ) {
    if( data && eventData && eventData.lovValue ) {
        var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );
        if( recipeConfigCtx ) {
            recipeConfigCtx.currentVariantRule = eventData.lovValue.propDisplayValue;
            recipeConfigCtx.currentVariantRuleUid = eventData.lovValue.uid;
            appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
        } else {
            recipeConfigCtx = {
                currentVariantRule: eventData.lovValue.propDisplayValue,
                currentVariantRuleUid: eventData.lovValue.uid
            };
            appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
        }
    }
};

/**
 * This method is used to clear the variant configuration data provider
 * @param {Object} data the view model data
 */
export let clearVariantConfigurationData = function( data ) {
    if( data ) {
        clearDataProviderCache( data );
        eventBus.publish( 'evm1ConfigPanel.revealSVROwningItems' );
        if( _data !== data ) {
            _data = data;
        }
    }
};

var clearDataProviderCache = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getAllVariantRules ) {
        data.dataProviders.getAllVariantRules.viewModelCollection.clear();
        data.dataProviders.getAllVariantRules.selectedObjects = [];
    }
};

/**
 * This method is used to process the response to get the SvrOwingItem
 * @param {Object} response response to be processed
 * @return {Object} svrOwingItems the svrOwingObject object
 */
export let processSVROwningItems = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var svrOwningItems = populateEndItemsOrSVROwningItems( response.preferredVarRuleOwningObjects );
    svrOwningItems = addOpenObjectAsPreferredIfApplicable( svrOwningItems, response.addOpenObjAsPreferredEndItem );
    return svrOwningItems;
};

var populateEndItemsOrSVROwningItems = function( allItems ) {
    var uniqueItems = [];
    if( allItems ) {
        for( var i = 0; i < allItems.length; i++ ) {
            var found = false;
            for( var j = 0; j < uniqueItems.length; j++ ) {
                if( allItems[ i ].uid === uniqueItems[ j ].uid ) {
                    found = true;
                    break;
                }
            }
            if( !found && allItems[ i ].uid !== 'AAAAAAAAAAAAAA' ) {
                uniqueItems.push( allItems[ i ] );
            }
        }
    }
    return uniqueItems;
};

var addOpenObjectAsPreferredIfApplicable = function( endItemsOrSVROwningItems, addOpenObjAsPreferredEndItem ) {
    if( addOpenObjAsPreferredEndItem ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx && recipeCtx.productContextInfo ) {
            endItemsOrSVROwningItems.push( recipeCtx.productContextInfo.props.awb0Product );
        }
    }
    return endItemsOrSVROwningItems;
};

/**
 * Update Config Items
 * @param {Object} newItemSelected The new SVROwingItem selected
 */
export let updateConfigItems = function( newItemSelected ) {
    if( newItemSelected ) {
        // First we we register svrOwningItemSelected ctx for New SVR item Selected.
        appCtxSvc.registerCtx( 'svrOwningItemSelected', newItemSelected );

        // Now we fire evm1ConfigPanel.getProductContext event so that we get the updated product context
        // for new SVR item and this new product context is stored in productContextForVariantRule.
        eventBus.publish( 'evm1ConfigPanel.getProductContext' );

        // now We need to reset the existing value of Varient rule if the
        // new SVR item selection is valid.
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx && recipeCtx.builderConfigValues ) {
            var oldSVRItemuid = recipeCtx.builderConfigValues.svrOwningItem.dbValues[ 0 ];
            if( oldSVRItemuid !== newItemSelected.uid ) {
                eventBus.publish( 'evm1ConfigPanel.resetVariantRuleList' );
            }
        }

        // now Update the recipeConfigCtx object to add currentSVROwningItemUid and currentSVROwningItemType
        // so that we can send SVR item info while applying configuration.
        var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );
        if( recipeConfigCtx ) {
            recipeConfigCtx.currentSVROwningItemUid = newItemSelected.uid;
            recipeConfigCtx.currentSVROwningItemType = newItemSelected.type;
            appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
        } else {
            recipeConfigCtx = {
                currentSVROwningItemUid: newItemSelected.uid,
                currentSVROwningItemType: newItemSelected.type
            };
            appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
        }
    }
};

/**
 * This method is used to process the response
 * @param {Object} response response to be processed
 * @return {Object} all the nameTypes
 */
export let processSoaResponseForBOTypes = function( response ) {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * This method is used to add the configuration values from Configuration Panel to teh Builder config values of Recipe
 */
export let addConfigOnRecipeBuilder = function() {
    var evm1ActiveContext = appCtxSvc.getCtx( 'evm1ActiveContext' );
    var recipeConfigCtx = appCtxSvc.getCtx( 'recipeConfigCtx' );

    // If revision rule is changed then ACE create configContext object in evm1ActiveContext so checking
    // If this object is not there means revision rule is not changed
    if( evm1ActiveContext && evm1ActiveContext.configContext ) {
        var uid = evm1ActiveContext.configContext.r_uid;
        // If uid is missing and useGlobalRevRule is defined that means use global revision rule.
        if( !uid && evm1ActiveContext.configContext.useGlobalRevRule) {
            var userSessionObject = cdm.getUserSession();
            if( userSessionObject ) {
                var globalRevRuleProperty = userSessionObject.props.awp0RevRule;
                uid = globalRevRuleProperty.dbValues[0];
            }
        }
        if( uid ) {
            // After getting Uid of changd revision rule we add that into recipeConfigCtx for further process.
            var object = viewModelObjectService.createViewModelObject(uid);
            var changedRevisionRuleName = object.props.object_name;
            var changedRevisionRule = convertRevisionRuleIntoVMProperty( changedRevisionRuleName );

            if( recipeConfigCtx ) {
                recipeConfigCtx.currentRevisionRule = changedRevisionRule;
                appCtxSvc.updateCtx( 'recipeConfigCtx', recipeConfigCtx );
            } else {
                recipeConfigCtx = {
                    currentRevisionRule: changedRevisionRule
                };
                appCtxSvc.registerCtx( 'recipeConfigCtx', recipeConfigCtx );
            }
        }
    }
    
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeConfigCtx && recipeCtx ) {
        if( recipeConfigCtx.currentRevisionRule || recipeConfigCtx.selectedEffecDate ||
            recipeConfigCtx.currentEffecUnit || recipeConfigCtx.currentVariantRule ) {
            var isRevisionRuleUnChanged = true;
            var isEffecUnitUnChanged = true;
            var isEffecDateUnChanged = true;
            var isVariantRuleUnChanged = true;
            var effecDate = '';
            var svrOwingItem = {
                uid: '',
                type: ''
            };

            if( recipeConfigCtx.currentSVROwningItemUid ) {
                svrOwingItem.uid = recipeConfigCtx.currentSVROwningItemUid;
            }

            if( recipeConfigCtx.currentRevisionRule ) {
                isRevisionRuleUnChanged = Boolean( recipeCtx.builderConfigValues.revisionRule.uiValue === recipeConfigCtx.currentRevisionRule.uiValue );
            }

            if( recipeConfigCtx.currentEffecUnit ) {
                isEffecUnitUnChanged = Boolean( recipeCtx.builderConfigValues.effecUnits.uiValue === recipeConfigCtx.currentEffecUnit );
            }

            if( recipeConfigCtx.selectedEffecDate ) {
                effecDate = dateTimeService.formatDate( recipeConfigCtx.selectedEffecDate );
                isEffecDateUnChanged = Boolean( recipeCtx.builderConfigValues.effecDate.uiValue === effecDate );
            }

            if( recipeConfigCtx.currentVariantRule ) {
                // Though Variant Rules can potentially be list of array, and there is provision for the same, but currently ace does not support
                // multiple selections and hence we are just checking the below condition as comparision of string value. When array are implemented
                // then we would need to check the elements in array
                isVariantRuleUnChanged = Boolean( recipeCtx.builderConfigValues.variantRules.uiValue === recipeConfigCtx.currentVariantRule );
            }
            if( !isRevisionRuleUnChanged || !isEffecUnitUnChanged || !isEffecDateUnChanged || !isVariantRuleUnChanged ) {
                var eventData = {
                    manageAction: 'ApplyConfig',
                    effectivityEndItem: {
                        uid: '',
                        type: ''
                    },
                    effectivityGroups: []
                };

                eventData.variantRules = getVariantRulesForInput( recipeConfigCtx, recipeCtx );
                eventData.revisionRule = getRevisionRuleForInput( recipeConfigCtx, recipeCtx );
                eventData.effectivityDate = getEffecDateForInput( recipeConfigCtx, recipeCtx );
                eventData.effectivityUnit = getEffectivityUnitForInput( recipeConfigCtx, recipeCtx );
                eventData.svrOwningItem = svrOwingItem;

                //End item is not editable now. This will be available with following changes
                //Currently End item is top by default
                setEndItemForInput( eventData, recipeCtx );

                { var seedSelections = []; }
                if( recipeCtx.seedSelections && recipeCtx.seedSelections.length ) {
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
                }
                eventData.seedObjects = seedSelections;
                eventBus.publish( 'evm1ConfigurationChanged', eventData );
            }
        }
    } else {
        getRevisionRuleForInputNonBOM( recipeCtx );
    }
    if( recipeConfigCtx ) {
        appCtxSvc.unRegisterCtx( 'recipeConfigCtx' );
    }
    if( evm1ActiveContext ){
        appCtxSvc.unRegisterCtx( 'evm1ActiveContext' );
    }
};

var getRevisionRuleForInput = function( recipeConfigCtx, recipeCtx ) {
    // If revision rule is changed then take the latest form the recipeConfigCtx
    // Else take the original value from recipeCtx
    if( recipeConfigCtx.currentRevisionRule && recipeConfigCtx.currentRevisionRule.uiValue ) {
        return recipeConfigCtx.currentRevisionRule.uiValue;
    } else if( recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.revisionRule ) {
        return recipeCtx.builderConfigValues.revisionRule.uiValue;
    }
};

var getEffecDateForInput = function( recipeConfigCtx, recipeCtx ) {
    // If effec date is blank i.e. its value is not changed then we will use the original value from recipeCtx
    // If the effec date is Today then we don't need to set it.
    // Else convert the effec date in proper formate and set it
    var effecDate;
    if( recipeConfigCtx.selectedEffecDate ) {
        effecDate = recipeConfigCtx.selectedEffecDate;
        if( effecDate === 'Today' || effecDate === 'today' ) {
            return '';
        }
        var year = effecDate.getUTCFullYear();
        var month = effecDate.getUTCMonth() + 1;
        var date = effecDate.getUTCDate() + 1;
        return year + '-' + month + '-' + date + 'T00:00:00+00:00';
    }
    effecDate = recipeCtx.builderConfigValues.effecDate.uiValue;
    if( effecDate === 'Today' || effecDate === 'today' ) {
        return '';
    }
    return effecDate;
};

var getEffectivityUnitForInput = function( recipeConfigCtx, recipeCtx ) {
    var units = -1;
    if( recipeConfigCtx.currentEffecUnit ) {
        units = recipeConfigCtx.currentEffecUnit;
        if( units === 'None' ) {
            return -1;
        }
    } else if( recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.effecUnits ) {
        units = recipeCtx.builderConfigValues.effecUnits.uiValue;
        if( units === 'None' ) {
            return -1;
        }
        units = parseInt( units );
    }
    return units;
};

var getVariantRulesForInput = function( recipeConfigCtx, recipeCtx ) {
    var variantRules = [];
    if( recipeConfigCtx.currentVariantRuleUid ) {
        var uid = recipeConfigCtx.currentVariantRuleUid;
        if( uid === '_defaultVariantRule' || recipeConfigCtx.currentVariantRule === 'No Variant Rule' ) {
            uid = '';
        }
        variantRules.push( {
            uid: uid,
            type: ''
        } );
    } else if( recipeCtx.builderConfigValues.variantRules.dbValue ) {
        variantRules.push( {
            uid: recipeCtx.builderConfigValues.variantRules.dbValue,
            type: ''
        } );
    }
    return variantRules;
};

var setEndItemForInput = function( eventData, recipeCtx ) {
    if( recipeCtx.builderConfigValues.endItems && recipeCtx.builderConfigValues.endItems.length > 0 ) {
        if( recipeCtx.builderConfigValues.endItems[ 0 ].dbValues && recipeCtx.builderConfigValues.endItems[ 0 ].dbValues[ 0 ] ) {
            return eventData.effectivityEndItem.uid = recipeCtx.builderConfigValues.endItems[ 0 ].dbValues[ 0 ];
        } else if( recipeCtx.builderConfigValues.endItems[ 0 ].uid ) {
            return eventData.effectivityEndItem.uid = recipeCtx.builderConfigValues.endItems[ 0 ].uid;
        }
    }
};

var getRevisionRuleForInputNonBOM = function( recipeCtx ) {
    var revisionRule;
    if( recipeCtx && recipeCtx.revisionRuleNB ) {
        revisionRule = recipeCtx.revisionRuleNB;
    } else if( recipeCtx && recipeCtx.builderConfigValues && recipeCtx.builderConfigValues.revisionRule ) {
        revisionRule = recipeCtx.builderConfigValues.revisionRule.uiValue;
    }
    var eventData1 = {
        revisionRule: revisionRule
    };

    eventBus.publish( 'evm1RevRuleChanged', eventData1 );
};

/**
 * This method is used create the input for calling the ManageRecipe SOA for GetProductContext action
 * @param {Object} eventData The view-model data
 */
export let ManageRecipesInputForContext = function( eventData ) {
    var input = [];
    var svrItem = appCtxSvc.getCtx( 'svrOwningItemSelected' );
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

    var inputData = {
        clientId: 'GetProductContext',
        manageAction: 'GetProductContext',
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

    var seedObj = {
        uid: recipeCtx.seedSelections[ 0 ].uid,
        type: recipeCtx.seedSelections[ 0 ].type
    };

    inputData.criteriaInput = {
        selectContentInputs: [ seedObj ],
        configSet: {
            revisionRule: recipeCtx.builderConfigValues.revisionRule.dbValue,
            variantRules: [],
            svrOwningItem: {
                uid: svrItem.uid,
                type: svrItem.type
            },
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
        productContext: {
            uid: '',
            type: ''
        },
        isConfigChanged: false
    };

    input.push( inputData );
    return input;
};

var getProductContext = function( output ) {
    var serviceData = output.ServiceData;
    var productContextFromSOA;
    if( serviceData && serviceData.modelObjects ) {
        for( var key in serviceData.modelObjects ) {
            var modelObjEle = serviceData.modelObjects[ key ];
            if( modelObjEle.type.trim() === 'Awb0ProductContextInfo' ) {
                productContextFromSOA = modelObjEle;
            }
        }
    }
    return productContextFromSOA;
};

var updateCtxWithProductContext = function( productContextFromSOA, data ) {
    if( productContextFromSOA ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx ) {
            recipeCtx.productContextForVariantRule = productContextFromSOA.uid;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx.productContextForVariantRule = productContextFromSOA.uid;
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
    }
};

/**
 * This method is used to process the response coming from manageRecipe3 SOA. In case of GetProductContext operation,
 * we change the productContextForVariantRule field in the recipeCtx
 * @param {Object} output The response from manageRecipe SOA
 * @param {Object} data The view-model data
 */
export let getManageRecipeResponseForContext = function( output, data ) {
    if( output.partialErrors || output.ServiceData && output.ServiceData.partialErrors ) {
        return output;
    }

    //var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

    if( output && data && output.recipeOutput && output.recipeOutput.length > 0 && output.recipeOutput[ 0 ].recipeOutput &&
        output.recipeOutput[ 0 ].recipeObject.uid === appCtxSvc.ctx.xrtSummaryContextObject.uid ) {
        var productContextFromSOA;

        if( output.recipeOutput[ 0 ].clientId === 'GetProductContext' ) {
            // Get the product context from the service data if received
            productContextFromSOA = getProductContext( output );
            // Update the context with the productContext info
            updateCtxWithProductContext( productContextFromSOA, data );
        }
    }
};

/**
 * This method is used to select the changed variant Rule
 * @param {Object} data the view model data
 * @param {Object} eventData the event data from the event
 */
export let resetVariantRuleList = function( data ) {
    if( data ) {
        data.variantRuleList.dbValue = _defaultVariantRule;
        data.variantRuleList.displayValues = [ _defaultVariantRule ];
        data.variantRuleList.newDisplayValues = [ _defaultVariantRule ];
        data.variantRuleList.newValue = _defaultVariantRule;
        data.variantRuleList.uiValue = _defaultVariantRule;
        data.variantRuleList.displayValsModel = [];
    }
};

/**
 * This method is used to process the response of getConfigurationRules2 SOA
 * @param {Object} response response to be processed
 * @return {Object} effectivity dates information
 */
export let processDateEffectivity = function( response ) {
    var effectivityDates = [];
    var today = {
        date: _defaultDate
    };

    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    effectivityDates.splice( 0, 0, today );
    return effectivityDates;
};

export default exports = {
    getInitialRevisionRuleConfigData,
    evaluateStartIndexForRevisionRuleDataProvider,
    processRevisionRules,
    selectChangedRevisionRule,
    getInitialDateEffectivityConfigurationData,
    selectChangedEffectivityDate,
    getEndItems,
    getEndItemFromContext,
    getInitialUnitEffectivityConfigurationData,
    selectChangedUnitEffectivity,
    initSVROwningItems,
    getSVROwningItems,
    getInitialVariantConfigurationData,
    evaluateStartIndexForVariantRuleDataProvider,
    processVariantRules,
    selectChangedVariantInfo,
    clearVariantConfigurationData,
    processSVROwningItems,
    updateConfigItems,
    processSoaResponseForBOTypes,
    addConfigOnRecipeBuilder,
    ManageRecipesInputForContext,
    getManageRecipeResponseForContext,
    resetVariantRuleList,
    processDateEffectivity
};
app.factory( 'Evm1ConfigurationPanelService', () => exports );
