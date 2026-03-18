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
 * @module js/zoneFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/*Due to framework limition in dataParser and dataParseDefinition need to create the ViewModelProperties using JS code */

/**
 * Create ViewModelProperties object to render CheckBox on UI for each BoxZone/PlaneZone returned in perform search results
 *
 * @param  {Object} performSearchRespons performSearch SOA response
 * @return {ViewModelProperties[]} List of ViewModelProperties to use for rendering of CheckBox
 */
export let createCheckBoxViewModelPropertiesForZones = function( performSearchRespons ) {
    var checkBoxPropertiesForZones = [];

    _.forEach( performSearchRespons.searchResults, function( zoneObj ) {
        if( zoneObj.props && zoneObj.props.object_string ) {
            var displayName = zoneObj.props.object_string.uiValues[ 0 ];
            var checkBoxProperty = uwPropertyService.createViewModelProperty( '', displayName, 'BOOLEAN', '', '' );
            checkBoxProperty.isEditable = true;
            checkBoxProperty.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
            checkBoxProperty.propInternalVal = zoneObj.uid;
            checkBoxPropertiesForZones.push( checkBoxProperty );
        }
    } );

    return checkBoxPropertiesForZones;
};

/**
 * Function to get the list of selected BoxZone/PlaneZone uids from the list of CheckBox ViewModelProperties
 *
 * @param  {ViewModelProperties[]} selectedInputs List of ViewModelProperties object used for rendering Check-box on UI
 * @return {String[]} List of selected BoxZone/PlaneZone UIDs
 */
export let updateSelectedZoneList = function( selectedInputs ) {
    var selectedInputUIDs = [];
    _.forEach( selectedInputs, function( viewModelProperty ) {
        if( viewModelProperty.dbValue ) {
            selectedInputUIDs.push( viewModelProperty.propInternalVal );
        }
    } );
    return selectedInputUIDs;
};

/**
 * Function to create the BoxZone/PlaneZone recipe and apply box/plane zone filter
 *
 * @param {String[]} selectedZoneUIds selected BoxZone UIDs to use for recipe creation
 * @param {String} searchOption Selected search option on UI to use for BoxZone recipe creation
 * @param {String}  ZoneType    To determine if its a boxZone/planeZone
 *
 */
export let applyZoneFilter = function( selectedZoneUIds, searchOption, zoneType ) {
    var criteriaVal = [];
    var criteriaType;
    //Key indicating selected boxes information
    if( zoneType === 'BoxZone' ) {
        criteriaVal = [ 'Boxes' ];
        criteriaType = 'BoxZone';
    } else if( zoneType === 'PlaneZone' ) {
        criteriaVal = [ 'Planes' ];
        criteriaType = 'PlaneZone';
    }
    criteriaVal = criteriaVal.concat( selectedZoneUIds );
    criteriaVal.push( searchOption );

    //create BoxZone/PlaneZone criteria
    var zoneCriteria = [];
    zoneCriteria = {
        criteriaDisplayValue: '',
        criteriaOperatorType: appCtxSvc.ctx.aceActiveContext.context.recipeOperator,
        criteriaType: criteriaType,
        criteriaValues: criteriaVal,
        subCriteria: []
    };

    //While applying boxZone/planeZone filters, we are ensuring to read existing recipe and
    //add newly applied boxzone term to it. This is because boxzone/planeZone filters are sent as a part of recipe to SOA input.
    var recipe = _.clone( appCtxSvc.ctx.aceActiveContext.context.recipe );
    recipe.push( zoneCriteria );

    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.updatedRecipe', recipe );
    // BoxZone is not a filter on the URL/state but treated as a recipe. Recipes are not added to the URL.
    // Hence just trigger the reload
    eventBus.publish( 'structureFilter.syncFilter', recipe );
};

/**
 * Dummy action to full the compiler. This is needed to simply do the assignment in the ViewModel
 */
export let dummyAction = function( totalFound ) {
    return totalFound;
};

export default exports = {
    createCheckBoxViewModelPropertiesForZones,
    updateSelectedZoneList,
    applyZoneFilter,
    dummyAction
};
app.factory( 'zoneFilterService', () => exports );
