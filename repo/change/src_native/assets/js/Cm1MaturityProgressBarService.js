// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Cm1MaturityProgressBarService
 */
import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dateTimeSvc from 'js/dateTimeService';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import _ from 'js/eventBus';

var exports = {};
export let maturityPropLoad = function() {};

export let setMaturityValues = function( data, filterData, lov, lovInput, propertyName ) {
    soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', { initialData: { filterData: filterData, lov: lov, lovInput: lovInput, propertyName: propertyName } } ).then( function( responseData ) {
        var allLovEntries = [];
        var allLovEntriesInternalValues = [];
        var i = 0;
        var allLovKeys = responseData.lovValues;
        data.steps = [];
        var currentVal = appCtxSvc.ctx.mselected[ 0 ].props.CMMaturity.dbValues[ 0 ];
        Object.keys( allLovKeys ).forEach( function( allLovValues ) {
            allLovEntries[ i ] = allLovKeys[ allLovValues ].propDisplayValues.lov_values[ 0 ];
            allLovEntriesInternalValues[ i ] = allLovKeys[ allLovValues ].propInternalValues.lov_values[ 0 ];
            i++;
        } );

        showSteps( data, allLovEntries, allLovEntriesInternalValues, currentVal );
    } );
};

function showSteps( data, allLovEntries, allLovEntriesInternalValues, currentVal ) {
    var beg = 0,
        end = 0;
    var i;
    var positions = getBegEndPosition( allLovEntriesInternalValues, currentVal );
    beg = positions[ 0 ];
    end = positions[ 1 ];
    var maturityState = [];
    var lovEntries = [];
    var currentElemPos = positions[ 2 ];
    for( var i = beg; i <= end; ++i ) {
        // lovEntries.push({ value: allLovEntries[i] , isActive: true });
        if( i === currentElemPos ) {
            maturityState.push( 0 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: true } );
        } else if( i < currentElemPos ) {
            maturityState.push( -1 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: false } );
        } else {
            maturityState.push( 1 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: false } );
        }
    }
    for( i = 0; i < lovEntries.length; i++ ) {
        data.steps[ i ] = {
            dbValue: lovEntries[ i ].value,
            isCurrentActive: lovEntries[ i ].isActive,
            propertyDisplayName: lovEntries[ i ].value
        };
    }
}

function getBegEndPosition( allLovEntries, currValue ) {
    var length = allLovEntries.length;
    var beg = 0;
    var end = length - 1;

    var currentElemPos = -1;
    for( var k = 0; k < length; ++k ) {
        if( allLovEntries[ k ] === currValue ) {
            currentElemPos = k;
            break;
        }
    }

    // Even if page has enough width we show only 6 relevant elements which is computed by below logic
    var maxPosition = 5;
    var halfMaxPosition = Math.floor( maxPosition / 2 );
    if( end > maxPosition ) {
        // current state is among 1st 3 LOV values then show first 6 elements.
        if( currentElemPos <= halfMaxPosition ) {
            end = maxPosition;
        }
        // current state is among last 3 LOV values then show last 3 elements.
        else if( end - currentElemPos <= halfMaxPosition ) {
            beg = end - maxPosition;
        }
        // current state is not any of 3 begin or end states
        else {
            // count of initial state to current state is less than or equal to count of end state to current state + 1
            if( currentElemPos <= end - currentElemPos ) {
                beg = currentElemPos - halfMaxPosition;
                end = currentElemPos + halfMaxPosition + 1;
            }
            // count of initial state to current state is more than count of end state to current state + 1
            else {
                beg = currentElemPos - halfMaxPosition - 1;
                end = currentElemPos + halfMaxPosition;
            }
        }
    }

    return [ beg, end, currentElemPos ];
}

export default exports = {
    maturityPropLoad,
    setMaturityValues
};
app.factory( 'Cm1MaturityProgressBarService', () => exports );
