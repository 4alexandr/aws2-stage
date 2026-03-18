// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/wiEffectivityContainer
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import wiEffectivityRow from 'js/wiEffectivityRow';
import wiEffectivitySummaryRow from 'js/wiEffectivitySummaryRow';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import $ from 'jquery';
import _ from 'lodash';

'use strict';


var summaryEffectivity = null;
var rowObjectHandlerList = [];
var currentEndItem = null;

var minimumNumberOfUnits = 74;

function drawUnitEffectivityGraph( endItemToObjectDataMap ) {

    var graphCanvas = document.querySelector( "#wi-validateEffectivity-operationRow" );
    var graphCanvasSummaryRow = document.querySelector( "#wi-validateEffectivity-summaryRow" );

    var operationNameElement = document.querySelector( "#wi-validateEffectivity-name-operation" );
    var summaryNameElement = document.querySelector( "#wi-validateEffectivity-name-summary" );

    var operationUpCheckboxElement = document.querySelector( "#wi-validateEffectivity-upCheckbox-operation" );
    var summaryUpCheckboxElement = document.querySelector( "#wi-validateEffectivity-upCheckbox-summary" );

    var unitEffectivityMinRange = endItemToObjectDataMap.minStartUnit;
    var unitEffectivityMaxRange = endItemToObjectDataMap.maxEndUnit > endItemToObjectDataMap.minStartUnit + minimumNumberOfUnits ?
        endItemToObjectDataMap.maxEndUnit : endItemToObjectDataMap.minStartUnit + minimumNumberOfUnits;

    _.forEach( endItemToObjectDataMap, function( object ) {

        var effectivityRanges = object.effectivityUnitRanges;
        var objectConfiguration = {};
        objectConfiguration.object = object.object;
        objectConfiguration.effectivityObj = object.effectivityObj;
        objectConfiguration.layout = graphCanvas;
        objectConfiguration.operationNameElement = operationNameElement;
        objectConfiguration.operationUpCheckboxElement = operationUpCheckboxElement;
        objectConfiguration.minUnit = unitEffectivityMinRange;
        objectConfiguration.maxUnit = unitEffectivityMaxRange;
        objectConfiguration.effectivityRanges = effectivityRanges;
        objectConfiguration.isUP = object.isUp;
        objectConfiguration.isDirty = false;
        var objectEffectivity = wiEffectivityRow.createObjectEffectivity( objectConfiguration );
        objectEffectivity.drawUnitEffectivityRow();
        rowObjectHandlerList.push( objectEffectivity );
    } );

    // To draw summary row
    if( endItemToObjectDataMap && endItemToObjectDataMap.length !== 0 ) {
        var summaryObject = {
            name: 'Summary'
        };
        var summaryConfiguration = {};
        summaryConfiguration.object = summaryObject;
        summaryConfiguration.selectedObjects = endItemToObjectDataMap.validObjects;
        summaryConfiguration.layout = graphCanvasSummaryRow;
        summaryConfiguration.summaryNameElement = summaryNameElement;
        summaryConfiguration.summaryUpCheckboxElement = summaryUpCheckboxElement;
        summaryConfiguration.minUnit = unitEffectivityMinRange;
        summaryConfiguration.maxUnit = unitEffectivityMaxRange;

        if( isAnyRowWithUpEffectivity() ) {
            summaryConfiguration.isUP = true;
        } else {
            summaryConfiguration.isUP = false;
        }

        summaryEffectivity = wiEffectivitySummaryRow.createSummaryEffectivity( summaryConfiguration );
        summaryEffectivity.drawSummaryRow();
    }
}

function destroyObject () {
    summaryEffectivity = null;
    rowObjectHandlerList = [];
    currentEndItem = null;
}

function isAnyRowWithUpEffectivity () {
    var isUp = false;
    for( var i = 0; i < rowObjectHandlerList.length; ++i ) {
        if( rowObjectHandlerList[ i ].isUP ) {
            isUp = true;
            break;
        }
    }

    return isUp;
}

function summaryRowUpdate () {
    summaryEffectivity.isUP = isAnyRowWithUpEffectivity();
    summaryEffectivity.createSummaryUnitsStatusList();
}

function objectSliderDragEvent ( objectUid ) {
    var rowObject = getRowObject( objectUid );
    rowObject.updateRanges();
    rowObject.objectSliderEventHandler();
    summaryEffectivity.createSummaryUnitsStatusList();
}

function getRowObject ( objectUid ) {
    for( var i = 0; i < rowObjectHandlerList.length; ++i ) {
        if( rowObjectHandlerList[ i ].object.uid === objectUid ) {
            return rowObjectHandlerList[ i ];
        }
    }
}

function getUpdatedEffectivityData () {

    var rowObjectToEffectivityArray = [];
    _.forEach( rowObjectHandlerList, function( rowObject ) {
        var effectivityData = {
            object: rowObject.object,
            effectivityObj: rowObject.effectivityObj,
            effectivityString: rowObject.effectivityString,
            isDirty: rowObject.isDirty
        };
        rowObjectToEffectivityArray.push( effectivityData );
    } );
    return rowObjectToEffectivityArray;
}

function refreshEffectivityContainer ( endItemToObjectDataMap ) {
    summaryEffectivity = null;
    rowObjectHandlerList = [];
    $( "#wi-validateEffectivity-operationRow" ).empty();
    $( "#wi-validateEffectivity-summaryRow" ).empty();
    $( "#wi-validateEffectivity-name-operation" ).empty();
    $( "#wi-validateEffectivity-name-summary" ).empty();
    $( "#wi-validateEffectivity-upCheckbox-operation" ).empty();
    $( "#wi-validateEffectivity-upCheckbox-summary" ).empty();
    drawUnitEffectivityGraph( endItemToObjectDataMap );
}

function setEndItem ( selectedEndItem ) {
    currentEndItem = selectedEndItem;
}

function getEndItem () {
    return currentEndItem;
}

function hasEffectivityUpdated () {
    var isDirty = appCtxService.getCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY );
    return isDirty;
}

function updateDirtyFlagOfRowObject ( objectUid, flag ) {
    for( var i = 0; i < rowObjectHandlerList.length; ++i ) {
        if( rowObjectHandlerList[ i ].object.uid === objectUid ) {
            rowObjectHandlerList[ i ].isDirty = flag;
            break;
        }
    }
}

const exports = {
    destroyObject,
    drawUnitEffectivityGraph,
    hasEffectivityUpdated,
    getEndItem,
    getUpdatedEffectivityData,
    objectSliderDragEvent,
    refreshEffectivityContainer,
    setEndItem,
    summaryRowUpdate,
    updateDirtyFlagOfRowObject
};

export default exports;
