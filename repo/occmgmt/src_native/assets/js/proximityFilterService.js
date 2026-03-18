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
 * @module js/proximityFilterService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import prefService from 'soa/preferenceService';
import commandMapSvc from 'js/commandsMapService';
import clientDataModel from 'soa/kernel/clientDataModel';
import occmgmtSubsetUtils from 'js/occmgmtSubsetUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/uwPropertyService';

var exports = {};

var distanceUnitLabel = null;

/**
 * Build a single string filter that is displayed as a link.
 *
 * @param {object} filterValueObject The object that contains details about the filter values available.
 * @returns {Object} The string filter
 */
export let getFilterValue = function( filterValueObject ) {
    var filterValue = {};
    filterValue.name = filterValueObject.stringDisplayValue;
    filterValue.count = filterValueObject.count;
    filterValue.endDateValue = filterValueObject.endDateValue;
    filterValue.endNumericValue = filterValueObject.endNumericValue;
    filterValue.selected = filterValueObject.selected;
    filterValue.startDateValue = filterValueObject.startDateValue;
    filterValue.startStartEndRange = filterValueObject.startEndRange;
    filterValue.startNumericValue = filterValueObject.startNumericValue;
    filterValue.stringValue = filterValueObject.stringValue;
    filterValue.type = "StringFilter";
    filterValue.showCount = false;
    if( filterValue.name === "" && filterValue.stringValue === "$NONE" ) {
        filterValue.name = "Unassigned";
    }
    if( filterValueObject.hasChildren ) {
        filterValue.suffixIconId = "cmdChild";
        filterValue.showSuffixIcon = true;
    }
    return filterValue;
};

/**
 * Get the valid objects for proximity filter
 *
 * @returns {Object} Valid proximity target objects
 */
export let getValidProximityTarget = function() {
    var selections = appCtxSvc.getCtx( "aceActiveContext.context.selectedModelObjects" );
    var selectionObjs = [];
    if( selections ) {
        // fetch product of last selected element and it should be equal to product of rest selections
        var pciOfLastSelectedElement = clientDataModel.getObject( occmgmtSubsetUtils
            .getProductContextForProvidedObject( selections[ selections.length - 1 ] ) );
        if( pciOfLastSelectedElement ) {
            var productOfLastSelectedElement = pciOfLastSelectedElement.props.awb0Product.dbValues[ 0 ];

            if( selections !== null && selections.length > 0 ) {
                for( var i = 0; i < selections.length; i++ ) {
                    var underlyingObj = null;
                    
                    //For session, the opened item is not equal to root item. The selection of root item is
                    // not a valid target for proximity computation
                    if (appCtxSvc.ctx.aceActiveContext.context.openedElement.type === "Fnd0AppSession" &&
                        appCtxSvc.ctx.aceActiveContext.context.rootElement.uid === selections[i].uid) {
                        continue;
                    }

                    if( commandMapSvc.isInstanceOf( 'Awb0Element', selections[ i ].modelType ) &&
                        productOfLastSelectedElement === clientDataModel.getObject( occmgmtSubsetUtils
                            .getProductContextForProvidedObject( selections[ i ] ) ).props.awb0Product.dbValues[ 0 ] &&
                        ( appCtxSvc.ctx.aceActiveContext.context.openedElement.uid !== selections[ i ].uid )) {
                        underlyingObj = clientDataModel.getObject( selections[ i ].props.awb0UnderlyingObject.dbValues[ 0 ] );
                    }
                    if( underlyingObj !== null ) {
                        selectionObjs.push( selections[ i ] );
                    }
                }
            }
        }
    }
    return selectionObjs;
};

/**
 * Function to read the Distance unit of measure preference and the get the localized value for it
 *
 * @return {Promise} A promise that get resolved to return distance label
 */
export let getDistanceUnit = function() {
    var deferred = AwPromiseService.instance.defer();
    prefService.getStringValue( 'RDV_user_defined_units_of_measure' ).then( function( preferenceValue ) {
        var distanceLabel = null;
        if( preferenceValue ) {

            var distanceUnit = _.lowerCase( preferenceValue );

            //If Preference value is set to "UNKNOWN" then set the default UOM as "Meters". This is in synch with AW server code
            if( distanceUnit === "unknown" ) {
                distanceUnit = "meters";
            }
            var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
            distanceLabel = localeSvc.getLocalizedText( resource, distanceUnit );
        }
        deferred.resolve( distanceLabel );
    } );
    return deferred.promise;
};

/**
 * Function to apply proximity filter
 *          -update the modified recipe on the appContext
 *          -trigger acePwa.reset event to reload content
 *
 *@param {Number} distanceValue distance value
 *@param {Object[]} validTargets valid targets for proximity
 */
export let applyProximityFilterInRecipe = function( distanceValue, validTargets ) {
    appCtxSvc.updatePartialCtx( "aceActiveContext.context.requestPref.calculateFilters", true );
    var criteriaVal = [ "SelectedElement" ];
    for( var i = 0; i < validTargets.length; i++ ) {

        criteriaVal.push( validTargets[ i ].uid );
    }
    //Check if true shoudl work and enable.LCS-171974: Use Trueshape with proximity search - Enabled Trueshape by default. Corresponding UI widget will be exposed later based on need.
    criteriaVal.push( "True" );

    //CriteriaValues is String array
    //It is observed that sometimes viewModelProperty of type Double hold the string value, as a result there was no need to convert it to string.
    //But sometimes it has double value causing JSON parsing error. So convert the proximity double value to String before sending to server.
    criteriaVal.push( distanceValue.toString() );

    var proximityCriteria = {
        "criteriaDisplayValue": "",
        "criteriaOperatorType": appCtxSvc.ctx.aceActiveContext.context.recipeOperator,
        "criteriaType": "Proximity",
        "criteriaValues": criteriaVal,
        "subCriteria": []
    };

    //While applying proximity filters, we are ensuring to read existing recipe and
    //add newly applied proximity term to it. This is because proximity filters are sent as a part of recipe to SOA input.
    var recipe = _.clone( appCtxSvc.ctx.aceActiveContext.context.recipe );
    if( recipe === null ) {
        recipe = [];
    }

    recipe.push( proximityCriteria );

    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.updatedRecipe', recipe );

    // Clear selections if filters are being applied
    if( appCtxSvc.getCtx( 'aceActiveContext.context.pwaSelectionModel.multiSelectEnabled' ) ) {
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.clearExistingSelections', true );
    }
    // Proximity is not a filter on the URL/state but treated as a recipe. Recipes are not added to the URL.
    // Hence just trigger the reload
    eventBus.publish( 'structureFilter.syncFilter', recipe );
};
/**
 * Function to  get the n-Selected Text
 *@param {String } inputLabel i18nLabel displayNSelected
 *@param {Object[]} validTargets valid targets for proximity
 * @returns{String} formatted Label
 */
export let getNSelectedText = function( inputLabel, validTargets ) {

    return inputLabel.replace( "{0}", validTargets.length );
};

/**
 * Function to toggle the n-Selected link
 * @param {Boolean} value isExpanded flag
 *  @return{Boolean} isExpanded flag
 */
export let toggleExpand = function( value ) {
    return ( !value );
};

/**
 * initialize
 */
export let initialize = function() {
    var promise = exports.getDistanceUnit();
    if( promise ) {
        promise.then( function( distanceLabel ) {
            distanceUnitLabel = distanceLabel;
        } );
    }
};
/**
 * Function to  get the distance unit
 *
 *  @return{String} distance unit
 */
export let getDistanceText = function() {

    return distanceUnitLabel;
};

export default exports = {
    getFilterValue,
    getValidProximityTarget,
    getDistanceUnit,
    applyProximityFilterInRecipe,
    getNSelectedText,
    toggleExpand,
    initialize,
    getDistanceText
};
app.factory( 'proximityFilterService', () => exports );
