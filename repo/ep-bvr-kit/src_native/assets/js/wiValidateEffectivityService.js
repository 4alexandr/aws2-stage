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
 * @module js/wiValidateEffectivityService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import { constants as _epBvrConstants } from 'js/epBvrConstants';
import { constants as _epLoadConstants } from 'js/epLoadConstants';
import messagingService from 'js/messagingService';
import popupService from 'js/popupService';
import popupUtils from 'js/popupUtils';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import { constants as wiCtxConstants } from 'js/wiCtxConstants';
import wiEffectivityContainer from 'js/wiEffectivityContainer';
import { constants as _wiEffectivityConstants } from 'js/wiEffectivityConstants';
import wiSaveEffectivitySvc from 'js/wiSaveEffectivityService';
import _ from 'lodash';
import $ from 'jquery';

'use strict';

let selectedEndItem = null;
let endItemList = {};
let endItemListForPopup = [];
let endItemToObjData = {};
let noEffectivitiesSetObj = [];

let upRangeMaxVal = 888888;
let POPUP_WIDTH_RATIO = 0.95;
let POPUP_HEIGHT_RATIO = 0.9;
let svgns = "http://www.w3.org/2000/svg";
let BOX_SHADOW = 'boxShadow';
let LEFT_SHADOW = '10px 0 10px -10px rgba(0, 0, 0, 0.3) inset';
let RIGHT_SHADOW = '-10px 0 10px -10px rgba(0, 0, 0, 0.3) inset';
let SCROLL = 'scroll';
let HEIGHT = 'height';
let WIDTH = 'width';
let FILL = 'fill';
let SVG = 'svg';
let RECT = 'rect';
let wiValidateEffectivityPopupRef = {};

export function initializeValidateEffectivityPopup( selectedObjects ) {
    const policyId = registerPolicy();
    loadPopupData( selectedObjects, _epLoadConstants.GET_PROPERTIES, [ _epBvrConstants.BL_OCC_EFFECTIVITY_PROP_NAME ] ).then( ( result ) => {
        propertyPolicySvc.unregister( policyId );
        return result;
    } );

}

/**
 * Function accepts loadTypeInputs for creating inputs data for SOA call
 *
 * @param {string} objUid the node uid
 * @param {String} loadType the load type
 * @param {array} propertiesToLoad the props to load
 * @param {string} targetUid the target uid
 * @param {array} additionalLoadParams additional params
 *
 * @returns {Object} data for table
 */
function loadPopupData( selectedObjects, loadType, propertiesToLoad, targetUid, additionalLoadParams ) {
    let loadTypeInput = [];
    selectedObjects.forEach( obj => {
        const loadTypeforObj = epLoadInputHelper.getLoadTypeInputs( [ loadType ], obj.uid, propertiesToLoad, targetUid, additionalLoadParams );
        loadTypeInput.push( loadTypeforObj[ 0 ] );
    } );

    return epLoadService.loadObject( loadTypeInput, false ).then( ( response ) => {
        createEndItemData( selectedObjects, response.ServiceData.modelObjects );
        if( endItemListForPopup.length > 0 ) {
            showPopup();

        } else {
            clearData();
            showNoUnitEffectivityAppliedErrorMsg();
        }
    } );
}
function showNoUnitEffectivityAppliedErrorMsg(){
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/InstructionsEffectivityMessages' );
    messagingService.showError( resource.noUnitEffectivityAppliedErrorMessage );
}
function showPopup() {
    // For optimal popup size as per UX guidelines
    const popupHeight = ( window.innerHeight ) * POPUP_HEIGHT_RATIO;
    const popupWidth = ( window.innerWidth ) * POPUP_WIDTH_RATIO;
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/InstructionsEffectivityMessages' );
    const popupParams = {

        "declView": "wiValidateEffectivityPopup",
        "locals": {
            "anchor": "closeValidateEffectivityPopupAnchor",
            "caption": resource.validateEffectivityPopupTitle
        },
        "options": {
            "isModal": false,
            "containerHeight": popupHeight,
            "containerWidth": popupWidth,
            "height": popupHeight,
            "width": popupWidth,
            "clickOutsideToClose": false,
            "customClass": "aw-epInstructionsEffectivity-wiValidateEffectivityPopup"
        }
    };
    popupService.show( popupParams ).then( function( popupRef ) {
        wiValidateEffectivityPopupRef = popupRef;
        eventBus.subscribe( 'aw.windowResize', resizePopup );
        resizePopup().then( () => popupRef );
    } );
}

/**
 * resize popup after window resize
 *
 * @returns {Promise} popup promise
 */
function resizePopup() {
    if( wiValidateEffectivityPopupRef ) {
        const popupHeight = ( window.innerHeight ) * POPUP_HEIGHT_RATIO;
    const popupWidth = ( window.innerWidth ) * POPUP_WIDTH_RATIO;
        popupUtils.processOptions( wiValidateEffectivityPopupRef.panelEl, {
            containerWidth: popupWidth,
            containerHeight: popupHeight,
            height: popupHeight,
            width: popupWidth
        } );
        return popupService.update( wiValidateEffectivityPopupRef.panelEl );
    }
}

/**
 * Register the policy
 *
 * @return {Object}  null
 */
function registerPolicy() {
    let effectivityLoadPolicy = {
        types: [ {
                name: _epBvrConstants.MFG_BVR_PROCESS,
                properties: [ {
                    name: _epBvrConstants.BL_OCC_EFFECTIVITY_PROP_NAME,
                    "modifiers": [ {
                        "name": "withProperties",
                        "Value": "true"
                    } ]
                } ]
            },
            {
                name: _epBvrConstants.MFG_BVR_OPERATION,
                properties: [ {
                    name: _epBvrConstants.BL_OCC_EFFECTIVITY_PROP_NAME,
                    "modifiers": [ {
                        "name": "withProperties",
                        "Value": "true"
                    } ]
                } ]
            },
            {
                name: _wiEffectivityConstants.EFFECTIVITY,
                properties: [ {
                        name: _wiEffectivityConstants.EFFECTIVITY_UNITS
                    },
                    {
                        name: _wiEffectivityConstants.END_ITEM
                    }
                ]
            }
        ]
    };
    return propertyPolicySvc.register( effectivityLoadPolicy );
}
//map of end item uid to its operations with unit ranges
/**
 * endItemUid1:{[
 *     op1:{
 *          ranges: [{
 *              start:1,
 *              end:9,
 *
 *              effectivityObj :effectivityObj
 *          }]
 *          up : true
 *     }]
 *      endItemObj: end item POM obj(with dbValue and uiValue)
 *      upMaxLimit:
 *      minLimit:
 *      valideObject: //list of all the valid object for selected end item
 * }
 */
//get selected operations and create maps for end item
function createEndItemData( selectedObjects, modelObjects ) {
    _.forEach( selectedObjects, function( object ) {
        object = modelObjects[ object.uid ];
        setEndItemToObjDataMap( object );

    } );

    //Sort End Item to Obj Data According to Effectivity Start Range
    _.forEach( endItemToObjData, function( endItemData, currentEndItem ) {
        endItemData = _.sortBy( endItemData, function( objectData ) {
            let minRange = _.minBy( objectData.effectivityUnitRanges, function( effectivityUnitRange ) {
                return effectivityUnitRange.start;
            } );
            return minRange.start;
        } );
        endItemToObjData[ currentEndItem ] = endItemData;
    } );

    updatePerEndItemData();

    appendAlwaysEffectiveObjects();

    //create endItem list for popup
    _.forEach( endItemList, function( endItem ) {
        endItemListForPopup.push( {
            propInternalValue: endItem.propInternalValue,
            propDisplayValue: endItem.propDisplayValue,
            isEditable: false
        } );
    } );
    if( endItemListForPopup.length > 0 ) {
        selectedEndItem = endItemListForPopup[ 0 ].propInternalValue;
        let validateEffectivityData = {
            endItemList: endItemListForPopup,
            endItemToObjData: endItemToObjData
        };
        appCtxService.updatePartialCtx( "validateEffectivityData", validateEffectivityData );
    }

}

function setEndItemToObjDataMap( object ) {
    if( object && object.props.bl_occ_effectivity && object.props.bl_occ_effectivity.dbValues ) {

        if( object.props.bl_occ_effectivity.dbValues.length > 0 ) {
            let effectivityObjs = object.props.bl_occ_effectivity.dbValues;
            _.forEach( effectivityObjs, function( effectivityObjUid ) {
                let effectivityObj = cdm.getObject( effectivityObjUid );
                let effectivityUnit = effectivityObj.props.effectivity_units.dbValues;
                let endItem = effectivityObj.props.end_item.dbValues;
                if( endItem.length > 0 ) {

                    let effectivityUnitRanges = [];
                    let isUpRange = false;

                    for( let count = 0; count < effectivityUnit.length; count += 2 ) {
                        let endRange;
                        if( !effectivityUnit[ count + 1 ] || effectivityUnit[ count + 1 ] === "2147483647" ) {

                            endRange = upRangeMaxVal;
                            isUpRange = true;
                        } else {
                            endRange = effectivityUnit[ count + 1 ];
                        }
                        effectivityUnitRanges.push( {
                            start: parseInt( effectivityUnit[ count ] ),
                            end: parseInt( endRange )
                        } );
                    }

                    if( !endItemToObjData[ endItem[ 0 ] ] ) {
                        endItemToObjData[ endItem[ 0 ] ] = [];
                    }

                    let foundNdx = _.findIndex( endItemToObjData[ endItem[ 0 ] ],
                        function( obj ) { return obj.object === object; } );
                    if( foundNdx === -1 ) {
                        endItemToObjData[ endItem[ 0 ] ].push( {
                            object: object,
                            effectivityUnitRanges: effectivityUnitRanges,
                            effectivityObj: effectivityObj,
                            isUp: isUpRange
                        } );
                    } else {
                        for( let i = 0; i < endItemToObjData[ endItem[ 0 ] ].length; ++i ) {
                            let oldObject = endItemToObjData[ endItem[ 0 ] ][ i ].object;
                            if( oldObject.uid === object.uid ) {
                                endItemToObjData[ endItem[ 0 ] ][ i ] = {
                                    object: object,
                                    effectivityUnitRanges: effectivityUnitRanges,
                                    effectivityObj: effectivityObj,
                                    isUp: isUpRange
                                };
                                break;
                            }
                        }
                    }
                    endItemList[ endItem[ 0 ] ] = {
                        propInternalValue: endItem[ 0 ],
                        propDisplayValue: effectivityObj.props.end_item.uiValues[ 0 ]
                    };
                }
            } );
        } else if( object.props.bl_occ_effectivity.dbValues.length === 0 ) {
            noEffectivitiesSetObj.push( object );
        }

    }
}

function updatePerEndItemData() {
    _.forEach( endItemToObjData, function( endItemData, currentEndItem ) {
        let units = [];
        let validObjects = [];
        _.forEach( endItemData, function( obj ) {
            _.forEach( obj.effectivityUnitRanges, function( range ) {
                units.push( _.parseInt( range.start ) );
                if( range.end !== upRangeMaxVal ) {
                    units.push( _.parseInt( range.end ) );
                }
            } );
            validObjects.push( obj.object );
        } );
        const minStartUnit = Math.min.apply( Math, units );
        const maxEndUnit = Math.max.apply( Math, units );
        endItemToObjData[ currentEndItem ].minStartUnit = minStartUnit;
        endItemToObjData[ currentEndItem ].maxEndUnit = maxEndUnit;
        endItemToObjData[ currentEndItem ].validObjects = validObjects.concat( noEffectivitiesSetObj );

    } );
}

function appendAlwaysEffectiveObjects() {
    _.forEach( endItemList, function( endItem ) {

        _.forEach( noEffectivitiesSetObj, function( object ) {
            let effectivityUnitRanges = [];
            let isUpRange = true;
            effectivityUnitRanges.push( {
                start: endItemToObjData[ endItem.propInternalValue ].minStartUnit,
                end: upRangeMaxVal
            } );
            endItemToObjData[ endItem.propInternalValue ].push( {
                object: object,
                effectivityUnitRanges: effectivityUnitRanges,
                isUp: isUpRange
            } );
        } );

    } );
}
// remove, always effectivie object from other end items, once updated for current end item.
// Note : we can use arr.splice method instead of _.remove, but not sure IE and firefox supports this method.
function removeUpdatedEndItemData( object ) {
    for( let i = 0; i < noEffectivitiesSetObj.length; ++i ) {
        if( noEffectivitiesSetObj[ i ].uid === object.uid ) {
            _.remove( noEffectivitiesSetObj, function( noEffObj ) {
                return noEffObj.uid === object.uid;
            } );
            _.forEach( endItemList, function( endItem ) {
                if( endItem.propInternalValue !== selectedEndItem ) {
                    _.remove( endItemToObjData[ endItem.propInternalValue ], function( objData ) {
                        return objData.object.uid === object.uid;
                    } );
                    _.remove( endItemToObjData[ endItem.propInternalValue ].validObjects, function( validObj ) {
                        return validObj.uid === object.uid;
                    } );
                }
            } );
            break;
        }
    }
}

function endItemSelectionChange( endItem ) {
    if( wiEffectivityContainer.hasEffectivityUpdated() ) {
        const event = {
            eventType: 'wi.endItemSelectionChangeEvent',
            eventData: endItem
        };
        wiSaveEffectivitySvc.handleUnsavedEffectivity( event ).then(
            function() {
                appCtxService.updatePartialCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, false );
            } );
    } else {
        endItemSelectionChangeAfterConfirmation( endItem );
    }
}

function endItemSelectionChangeAfterConfirmation( endItem ) {
    selectedEndItem = endItem;
    wiEffectivityContainer.setEndItem( selectedEndItem );
    wiEffectivityContainer.refreshEffectivityContainer( endItemToObjData[ selectedEndItem ] );
}

function updateEndItemData( data ) {
    _.forEach( data.updatedSelectedObjects, function( object ) {
        object = data.viewModelObjects[ object.uid ];
        setEndItemToObjDataMap( object );
        wiEffectivityContainer.updateDirtyFlagOfRowObject( object.uid, false );
        removeUpdatedEndItemData( object );
    } );
}

function initializeEffectivityValidator() {
    let rowSvg = document.createElementNS( svgns, SVG );
    rowSvg.setAttributeNS( null, WIDTH, 70 );
    rowSvg.setAttributeNS( null, HEIGHT, 70 );
    let rect = document.createElementNS( svgns, RECT );
    rect.setAttributeNS( null, WIDTH, 70 );
    rect.setAttributeNS( null, HEIGHT, 70 );
    rect.setAttributeNS( null, FILL, '#005f87' );

    rowSvg.appendChild( rect );
    wiEffectivityContainer.refreshEffectivityContainer( endItemToObjData[ selectedEndItem ] );
    //Scroll synchronization between divisions
    $( '.aw-epInstructionsEffectivity-operationPlot' ).on( SCROLL, function() {
        $( '.aw-epInstructionsEffectivity-summaryPlot' ).scrollLeft( $( this ).scrollLeft() );
        updateShadowLines( $( this ) );
    } );

    $( '.aw-epInstructionsEffectivity-operationUpCheckbox' ).on( SCROLL, function() {
        $( '.aw-epInstructionsEffectivity-operationPlot' ).scrollTop( $( this ).scrollTop() );
        $( '.aw-epInstructionsEffectivity-operationRowName' ).scrollTop( $( this ).scrollTop() );
    } );
}

function updateShadowLines( div ) {
    let boxShadow = LEFT_SHADOW + ',' + RIGHT_SHADOW;

    //Offset 2px
    let offset = 2;
    if( div[ 0 ].scrollWidth - div.scrollLeft() - div.width() <= 2 ) {
        boxShadow = LEFT_SHADOW;
    } else if( div.scrollLeft() <= offset ) {
        boxShadow = RIGHT_SHADOW;
    }

    div[ 0 ].style[ BOX_SHADOW ] = boxShadow;
}
function closePopup() {

    if( wiEffectivityContainer.hasEffectivityUpdated() ) {
        wiSaveEffectivitySvc.handleUnsavedEffectivity().then(
            function() {
                appCtxService.updatePartialCtx( wiCtxConstants.WI_EFFECTIVITY_IS_DIRTY, false );
                closePopupAfterConfirmation();
            } );
    } else {
        closePopupAfterConfirmation();
    }
}

function closePopupAfterConfirmation() {
    clearData();
    popupService.hide( wiValidateEffectivityPopupRef );
}

function clearData() {
    selectedEndItem = null;
    endItemList = {};
    endItemListForPopup = [];
    noEffectivitiesSetObj = [];
    endItemToObjData = {};
    wiEffectivityContainer.destroyObject();
    appCtxService.updatePartialCtx( "validateEffectivityData", {} );
}
const exports = {
    closePopup,
    endItemSelectionChange,
    endItemSelectionChangeAfterConfirmation,
    initializeEffectivityValidator,
    initializeValidateEffectivityPopup,
    updateEndItemData
};

export default exports;
