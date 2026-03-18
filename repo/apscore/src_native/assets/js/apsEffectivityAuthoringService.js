// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Service for managing unit and date effectivity authoring.
 *
 * @module js/apsEffectivityAuthoringService
 */
import * as app from 'app';
import localeSvc from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import dateTimeService from 'js/dateTimeService';
import ApsEffectivityValidationService from 'js/apsEffectivityValidationService';
import apsEffIntentSvc from 'js/apsEffectivityIntentService';

var _separator = ', ';

/** "SO" (Stock Out) value for date effectivity with time format in GMT. */
var _SO_DATE_WITH_TIME_IN_GMT = '9999-12-26T00:00:00+00:00';

/** "UP" value for date effectivity with time format in GMT. */
var _UP_DATE_WITH_TIME_IN_GMT = '9999-12-30T00:00:00+00:00';

/** "SO" (Stock Out) date object for date effectivity in GMT. */
var _SO_JS_DATE = dateTimeService.getJSDate( _SO_DATE_WITH_TIME_IN_GMT );

/** "UP" date object for date effectivity in GMT. */
var _UP_JS_DATE =  dateTimeService.getJSDate( _UP_DATE_WITH_TIME_IN_GMT );


var exports = {};

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @return {String} localized string for the input key.
 */
function getLocalizedValueFromKey( key ) {
    var resource = 'ApsEffectivityMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    return localTextBundle[ key ];
}

/**
 * This method will return a decorated string that represent the current applied Unit Effectivity.
 * The decoration is done by prefixing 'Unit=' for any input unit range. For example, if the input unit range
 * is UnitIn=1 & UnitOut=10, then the decorated display string will be: 'Unit=1..10'.
 * Note: For now this method is only used for constructing a decorated Unit display string for configuration panel
 * in 4GD and 4GPM world.
 *
 * @param {String} unitIn: String that contains input unit In value.
 * @param {String} unitOut: String that contains input unit out value.
 * @return {String} unitEffDecoratedStr: A decorated display string for this input set of Unit values.
 */
export let getDecoratedUnitEffectivityDisplayStr = function( unitIn, unitOut ) {
    var unitEffValuesArr = [];

    // Insert the prefix.
    unitEffValuesArr.push( getLocalizedValueFromKey( 'UNIT_PREFIX' ) );

    if( Number( unitIn ) >= Number( ApsEffectivityValidationService.instance.UNIT_MIN_VAL ) ) {
        unitEffValuesArr.push( unitIn );
    }

    // Insert the range separator
    if( Number( unitIn ) !== Number( unitOut ) ) {
        unitEffValuesArr.push( '..' );
    } else {
        unitEffValuesArr.push( '' );
        return constructDecoratedStrFromArray( unitEffValuesArr, getLocalizedValueFromKey( 'ALL_UNITS' ) );
    }

    if( Number( unitOut ) >= Number( ApsEffectivityValidationService.instance.UNIT_MIN_VAL ) ) {
        if( Number( unitOut ) === Number( ApsEffectivityValidationService.instance.UP_UNIT_VAL ) ) {
            unitEffValuesArr.push( ApsEffectivityValidationService.instance.UP );
        } else if( Number( unitOut ) === Number( ApsEffectivityValidationService.instance.SO_UNIT_VAL ) ) {
            unitEffValuesArr.push( ApsEffectivityValidationService.instance.SO );
        } else {
            unitEffValuesArr.push( unitOut );
        }
    }

    return constructDecoratedStrFromArray( unitEffValuesArr, getLocalizedValueFromKey( 'ALL_UNITS' ) );
};

/**
 * This function will convert an input array of strings into a single decorated output string.
 * @param {Array} inputStrArray : Array of strings that needs to be constructed into a single string.
 * @param {String} localizedString : Localized string to be displayed.
 * @return {String}: A decorated string.
 */
function constructDecoratedStrFromArray( inputStrArray, localizedString ) {
    var effDecoratedStr = '';

    // We always have two entries in the array, therefore anything more than that
    // should signify that we need to build the string.
    if( inputStrArray.length > 2 ) {
        inputStrArray.forEach( function( effValue ) {
            effDecoratedStr += effValue;
        } );
    } else {
        effDecoratedStr = localizedString;
    }
    return effDecoratedStr;
}

/**
 * This method will return a decorated string that represent the current applied Date Effectivity.
 * The decoration is done by prefixing 'Date=' for any input Date range. For example, if the input date range
 * is Date=2018-09-29 & UnitOut=2018-09-30, then the decorated display string will be: 'Date=2018-09-29..2018-09-30'.
 * Note: For now this method is only used for constructing a decorated Unit display string for configuration panel
 * in 4GD and 4GPM world.
 *
 * @param {String} dateIn: String that contains input Date In value.
 * @param {String} dateOut: String that contains input Date out value.
 * @return {String} dateEffDecoratedStr: A decorated display string for this input set of Date values.
 */
export let getDecoratedDateEffectivityDisplayStr = function( dateIn, dateOut ) {
    var dateEffValuesArr = [];

    // Insert a prefix for unit display string. This is needed to display the Date value
    // in the configuration panel for effectivity.
    dateEffValuesArr.push( getLocalizedValueFromKey( 'DATE_PREFIX' ) );

    //var startDate = dateTimeService.formatDate( effObject.dateIn );
    var startDate = dateTimeService.formatNonStandardDate( dateIn, 'yyyy-MM-dd' );
    var endDate = dateTimeService.formatNonStandardDate( dateOut, 'yyyy-MM-dd' );

    if( dateIn && dateIn !== null && dateIn !== dateTimeService.NULLDATE ) {
        dateEffValuesArr.push( startDate );
    }

    // Insert the separator.
    if( dateTimeService.compare( startDate, endDate ) !== 0 ) {
        dateEffValuesArr.push( '..' );
    } else {
        dateEffValuesArr.push( '' );
        return constructDecoratedStrFromArray( dateEffValuesArr, getLocalizedValueFromKey( 'ALL_DATES' ) );
    }

    if( dateOut && dateOut !== null && dateOut !== dateTimeService.NULLDATE ) {
        if( startDate === endDate ) {
            dateEffValuesArr.push( endDate );
        } else {
            var endJSDate = dateTimeService.getJSDate( dateOut );

            if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
                dateEffValuesArr.push( ApsEffectivityValidationService.instance.UP );
            } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
                dateEffValuesArr.push( ApsEffectivityValidationService.instance.SO );
            } else {
                dateEffValuesArr.push( endDate );
            }
        }
    }

    return constructDecoratedStrFromArray( dateEffValuesArr, getLocalizedValueFromKey( 'ALL_DATES' ) );
};

/**
 * Returns the unit effectivity display value
 *
 * @param {Object} effObject - Effectivity object
 *
 * @return {String} - Unit effectivity display value
 */
function getUnitEffectivityDisplayValue( effObject ) {
    var unitEffDispValue = '';
    var unitEffValuesArr = [];

    if( effObject.unitIn >= ApsEffectivityValidationService.instance.UNIT_MIN_VAL ) {
        unitEffValuesArr.push( effObject.unitIn );
    }

    if( effObject.unitOut >= ApsEffectivityValidationService.instance.UNIT_MIN_VAL ) {
        unitEffValuesArr.push( '..' );

        if( Number( effObject.unitOut ) === Number( ApsEffectivityValidationService.instance.UP_UNIT_VAL ) ) {
            unitEffValuesArr.push( ApsEffectivityValidationService.instance.UP );
        } else if( Number( effObject.unitOut ) === Number( ApsEffectivityValidationService.instance.SO_UNIT_VAL ) ) {
            unitEffValuesArr.push( ApsEffectivityValidationService.instance.SO );
        } else if( ApsEffectivityValidationService.instance.isUnitEffectivityFromToMode() === true ) {
            // Since TO Unit is exclusive, we need to show unit value less by 1
            unitEffValuesArr.push( effObject.unitOut - 1 );

            // If From Unit equals To Unit then show it as single value only
            if( unitEffValuesArr.length === 3 && unitEffValuesArr[ 0 ] === unitEffValuesArr[ 2 ] ) {
                unitEffValuesArr.pop();
                unitEffValuesArr.pop();
            }
        } else if( ApsEffectivityValidationService.instance.isUnitEffectivityFromToMode() === false ) {
            unitEffValuesArr.push( effObject.unitOut );

            // If From Unit equals (To Unit - 1) then show it as single value only
            if( unitEffValuesArr.length === 3 && unitEffValuesArr[ 0 ] ===  Number( unitEffValuesArr[ 2 ] ) - 1  ) {
                unitEffValuesArr.pop();
                unitEffValuesArr.pop();
            }
        }
    } else {
        unitEffValuesArr.push( '..' );
    }

    if( unitEffValuesArr.length === 1 && unitEffValuesArr[ 0 ] === '..' ) {
        return unitEffDispValue;
    } else if( unitEffValuesArr.length > 0 ) {
        unitEffValuesArr.forEach( function( effValue ) {
            unitEffDispValue += effValue;
        } );
    }

    return unitEffDispValue;
}

/**
 * Returns the date effectivity display value
 *
 * @param {Object} effObject - Effectivity object
 *
 * @return {String} - Date effectivity display value
 */
function getDateEffectivityDisplayValue( effObject ) {
    var dateEffDispValue = '';
    var dateEffValuesArr = [];

    var startDate = dateTimeService.formatDate( effObject.dateIn );
    var endDate = dateTimeService.formatDate( effObject.dateOut );

    if( effObject.dateIn !== dateTimeService.NULLDATE ) {
        dateEffValuesArr.push( startDate );
    }

    if( effObject.dateOut !== dateTimeService.NULLDATE ) {
        dateEffValuesArr.push( '..' );

        if( startDate === endDate ) {
            dateEffValuesArr.push( endDate );
        } else {
            var endJSDate = dateTimeService.getJSDate( effObject.dateOut );

            if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
                dateEffValuesArr.push( ApsEffectivityValidationService.instance.UP );
            } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
                dateEffValuesArr.push( ApsEffectivityValidationService.instance.SO );
            } else if( ApsEffectivityValidationService.instance.isDateEffectivityFromToMode() === true ) {
                // Since TO date is exclusive, we need to show date value less by 1 day.
                endJSDate.setDate( endJSDate.getDate() - 1 );
                endDate = dateTimeService.formatUTC( endJSDate );
                endDate = dateTimeService.formatDate( endDate );

                dateEffValuesArr.push( endDate );
            } else if( ApsEffectivityValidationService.instance.isDateEffectivityFromToMode() === false ) {
                endDate = dateTimeService.formatDate( effObject.dateOut );
                dateEffValuesArr.push( endDate );
            }
        }
    }

    if( dateEffValuesArr.length > 0 ) {
        dateEffValuesArr.forEach( function( effValue ) {
            dateEffDispValue += effValue;
        } );
    }

    return dateEffDispValue;
}

/**
 * Sets the localized value in property
 *
 * @param {Object} object - object
 * @param {String} objectProperty - property name of object
 * @param {String} resourceKey - resource key in the locale file
 */
function setLocalizedValue( object, objectProperty, resourceKey ) {
    var resource = 'ApsEffectivityMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    if( localTextBundle ) {
        object[ objectProperty ] = localTextBundle[ resourceKey ];
    } else {
        var asyncFun = function( localTextBundle ) {
            object[ objectProperty ] = localTextBundle[ resourceKey ];
        };
        localeSvc.getTextPromise( resource ).then( asyncFun( localTextBundle ) );
    }
}

/**
 * Clears date effectivity fields
 *
 * @param {Object} data - data object
 */
function clearDateEffectivityFields( data ) {
    data.startDate.dateApi.dateValue = '';
    data.startDate.dateApi.timeValue = '';
    data.startDate.dbValue = '';
    exports.clearEndDate( data );
    data.endDateOptions.dbValue = 'Date';
    data.isDateRangeValid = true;
    setLocalizedValue( data.endDateOptions, 'uiValue', 'dateEffectivity' );
}

/**
 * Clears unit effectivity fields
 *
 * @param {Object} data - data object
 */
function clearUnitEffectivityFields( data ) {
    data.unitRangeText.dbValue = '';
    data.isUnitRangeValid = true;
}

/**
 * Checks if the end date is open ended or not.
 *
 * @param {Object} data - data object
 *
 * @return {boolean} - true if end date is open ended false otherwise
 */
function isEndDateOpenEnded( data ) {
    return data.endDateOptions.dbValue !== undefined &&
        ( data.endDateOptions.dbValue === 'UP' || data.endDateOptions.dbValue === 'SO' );
}

/**
 * Checks if the unit effectivity value is open ended or not.
 *
 * @param {String} unitValue - unit effectivity value
 *
 * @return {boolean} - true if unit effectivity value is open ended false otherwise
 */
function isUnitValueOpenEnded( unitValue ) {
    if( unitValue === ApsEffectivityValidationService.instance.UP_UNIT_VAL || unitValue === ApsEffectivityValidationService.instance.SO_UNIT_VAL ) {
        return true;
    }
    return false;
}

/**
 * Returns the context object for effectivity.
 *
 * @return {Object} - context object
 */
export let getContextObject = function() {
    var contextObj = null;
    var selectedObjs = appCtxSvc.getCtx( 'mselected' );

    if( selectedObjs && selectedObjs.length === 1 ) {
        contextObj = selectedObjs[ 0 ];
    }
    if( contextObj !== null && contextObj.props.awb0UnderlyingObject !== undefined ) {
        // We got an Awb0Element as input
        contextObj = cdmSvc.getObject( contextObj.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }

    return contextObj;
};

/**
 * Process the response and retrieve effectivity list.
 *
 * @param {Object} response - SOA response
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityList = function( response ) {
    var effectivities = [];

    if( response ) {
        // LCS-159253: need to split effectivity rows if formula contains or (this aligns with effectivity intent in RAC)
        var effTableRows = [];
        response.effectivityTables[ 0 ].effectivityTableRows.forEach( function( curRow ) {
            if( curRow.rest.formula !== '' ) {
                curRow.rest.formula.split( ' | ' ).forEach( function( subFormula ) {
                    var copyRow = JSON.parse( JSON.stringify( curRow ) );
                    copyRow.rest.formula = subFormula;
                    effTableRows.push( copyRow );
                } );
            } else {
                effTableRows.push( curRow );
            }
        } );

        effTableRows.forEach( function( effRow ) {
            var effectivityInfo = {
                effObject: {}, //-----------------Effectivity object
                effType: '', //-------------------Effectivity Type - Date / Unit / All
                effDisplayString: '', //----------Effectivity Display String
                effSecondaryDisplayString: '', //--Effectivity Secondary Display String
                formulaStrings: []
            };

            var isUnitEffType = false;
            var isDateEffType = false;
            var unitEffDispValue = getUnitEffectivityDisplayValue( effRow );
            var dateEffDispValue = getDateEffectivityDisplayValue( effRow );

            if( unitEffDispValue !== '' ) {
                isUnitEffType = true;
                effectivityInfo.effType = 'Unit';
                effectivityInfo.effDisplayString = unitEffDispValue;
            }

            if( dateEffDispValue !== '' ) {
                isDateEffType = true;
                effectivityInfo.effType = 'Date';
                effectivityInfo.effDisplayString = dateEffDispValue;
            }

            if( isUnitEffType && isDateEffType ) {
                effectivityInfo.effType = 'All';
                effectivityInfo.effDisplayString = dateEffDispValue;
                effectivityInfo.effSecondaryDisplayString = unitEffDispValue;
            }

            // Retrieve intent info & include formula in display name for effectivity
            effectivityInfo.formulaStr = effRow.rest.formula;
            if( effRow.rest.formula !== '' ) {
                var effStrs = [];
                effRow.rest.formula.split( ' & ' ).forEach( function( sStr ) {
                    effStrs.push( sStr.substr( sStr.indexOf( ']' ) + 1, sStr.length ) );
                } );
                effectivityInfo.formulaStrings = effStrs;
            }
            effectivityInfo.effObject = effRow;

            effectivities.push( effectivityInfo );
        } );
    }

    return effectivities;
};

/**
 * Returns the effectivity expression table for adding new effectivity.
 *
 * @param {Object} data - data object
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getExpressionTableForAddEffectivity = function( data, existingEffs ) {
    var effRows = [];

    if( existingEffs.length > 0 ) {
        existingEffs.forEach( function( effRow ) {
            effRows.push( effRow.effObject );
        } );
    }

    var newEffRow = {
        unitIn: -1,
        unitOut: -1,
        dateIn: ApsEffectivityValidationService.instance.NULLDATE_WITH_TIME,
        dateOut: ApsEffectivityValidationService.instance.NULLDATE_WITH_TIME
    };

    if( data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
        var startDateString = dateTimeService.formatUTC( data.startDate.dateApi.dateObject );
        var endDateString = '';

        if( data.endDateOptions.dbValue === ApsEffectivityValidationService.instance.UP ) {
            endDateString = _UP_DATE_WITH_TIME_IN_GMT;
        } else if( data.endDateOptions.dbValue === ApsEffectivityValidationService.instance.SO ) {
            endDateString = _SO_DATE_WITH_TIME_IN_GMT;
        } else {
            endDateString = dateTimeService.formatUTC( data.endDate.dateApi.dateObject );
        }

        newEffRow.dateIn = startDateString;
        newEffRow.dateOut = endDateString;
    } else {
        var units = ApsEffectivityValidationService.instance.getUnitRangesFromEffectivityString( data.unitRangeText.dbValue );

        var startUnitValue = Number( units.startUnit );
        var endUnitValue = Number( units.endUnit );

        if( !isUnitValueOpenEnded( units.endUnit ) && units.endUnit >= 0 &&
            ApsEffectivityValidationService.instance.isUnitEffectivityFromToMode() === true ) {
            // For FROM-TO mode, we set TO unit as +1 as it is exclusive
            endUnitValue += 1;
        }

        newEffRow.unitIn = startUnitValue;
        newEffRow.unitOut = endUnitValue;
    }

    var rest = {};
    rest.productName = '';
    rest.productNameSpace = '';
    rest.formula = exports.getExpressionFormula();
    newEffRow.rest = rest;

    effRows.push( newEffRow );

    return effRows;
};

/**
 * Returns the effectivity formula.
 *
 * @return {Object} - effectivity formula
 */
export let getExpressionFormula = function() {
    return apsEffIntentSvc.getEffIntentFormula();
};

/**
 * Returns the effectivity expression table for removing existing effectivity.
 *
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getExpressionTableForRemoveEffectivity = function( existingEffs ) {
    var effRows = [];

    existingEffs.forEach( function( effRow ) {
        if( !effRow.selected ) {
            effRows.push( effRow.effObject );
        }
    } );

    return effRows;
};

/**
 * Returns the effectivity expression table for editing existing effectivity.
 *
 * @param {Object} data - data object
 *
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getExpressionTableForEditEffectivity = function( data, existingEffs ) {
    var effRows = [];

    existingEffs.forEach( function( effRow ) {
        if( effRow.effObject !== data.selectedCell.effObject ) {
            effRows.push( effRow.effObject );
        }
    } );

    var newEffRow = {
        unitIn: -1,
        unitOut: -1,
        dateIn: ApsEffectivityValidationService.instance.NULLDATE_WITH_TIME,
        dateOut: ApsEffectivityValidationService.instance.NULLDATE_WITH_TIME
    };

    if( data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
        var startDateString = dateTimeService.formatUTC( data.startDate.dateApi.dateObject );
        var endDateString = '';

        if( data.endDateOptions.dbValue === ApsEffectivityValidationService.instance.UP ) {
            endDateString = _UP_DATE_WITH_TIME_IN_GMT;
        } else if( data.endDateOptions.dbValue === ApsEffectivityValidationService.instance.SO ) {
            endDateString = _SO_DATE_WITH_TIME_IN_GMT;
        } else {
            endDateString = dateTimeService.formatUTC( data.endDate.dateApi.dateObject );
        }

        newEffRow.dateIn = startDateString;
        newEffRow.dateOut = endDateString;
    } else {
        var units = ApsEffectivityValidationService.instance.getUnitRangesFromEffectivityString( data.unitRangeText.dbValue );

        var startUnitValue = Number( units.startUnit );
        var endUnitValue = Number( units.endUnit );

        if( !isUnitValueOpenEnded( units.endUnit ) && units.endUnit >= 0 &&
            ApsEffectivityValidationService.instance.isUnitEffectivityFromToMode() === true ) {
            // For FROM-TO mode, we set TO unit as +1 as it is exclusive
            endUnitValue += 1;
        }

        newEffRow.unitIn = startUnitValue;
        newEffRow.unitOut = endUnitValue;
    }

    var rest = {};
    rest.productName = '';
    rest.productNameSpace = '';
    rest.formula = exports.getExpressionFormula();
    newEffRow.rest = rest;

    effRows.push( newEffRow );

    return effRows;
};

/**
 * Clears date and unit effectivity fields
 *
 * @param {Object} data - data object
 *
 * @return {boolean} - Date or Unit effectivity type
 */
export let clearDateAndUnitEffectivity = function( data ) {
    clearDateEffectivityFields( data );
    clearUnitEffectivityFields( data );
    return data.dateOrUnitEffectivityTypeRadioButton.dbValue;
};

/**
 * Clears end date fields.
 *
 * @param {Object} data - data object
 */
export let clearEndDate = function( data ) {
    data.endDate.dateApi.dateValue = '';
    data.endDate.dateApi.timeValue = '';
    data.endDate.dbValue = '';
};

/**
 * Checks if the date range is valid.
 *
 * @param {Object} data - data object
 * @param {boolean} isAuthoringMode - should be true if authoring mode, false for configuration mode
 *
 * @return {boolean} - true if date range is valid, false otherwise
 */
export let isDateRangeValid = function( data, isAuthoringMode ) {
    var isDateMode = data.dateOrUnitEffectivityTypeRadioButton.dbValue;

    var isStartDateValid = ApsEffectivityValidationService.instance.checkDateValidity( data.startDate );
    var isEndDateValid = data.endDateOptions.dbValue === 'Date' && ApsEffectivityValidationService.instance.checkDateValidity( data.endDate );

    if( isDateMode && isStartDateValid && isEndDateOpenEnded( data ) ) {
        data.isDateRangeValid = true;
        return true;
    } else if( isDateMode && isStartDateValid && isEndDateValid ) {
        data.isDateRangeValid = ApsEffectivityValidationService.instance.isDateRangeValid( data.startDate, data.endDate, isAuthoringMode );
        return data.isDateRangeValid;
    }
    return false;
};

/**
 * To set effectivity field for edit effectivity panel.
 *
 * @param {Object} data - data object
 */
export let setProperties = function( data ) {
    // trim formular from effectivity string
    var effUnitOrDateStr = data.selectedCell.effDisplayString;
    if( data.selectedCell.effDisplayString.includes( _separator ) ) {
        effUnitOrDateStr = data.selectedCell.effDisplayString.substr( 0, data.selectedCell.effDisplayString.indexOf( _separator ) );
    }

    if( data.selectedCell.effType === 'Date' ) {
        data.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
        data.startDate.dbValue =  new Date( data.selectedCell.effObject.dateIn ).getTime();

        data.startDate.dateApi.dateValue = dateTimeService.formatDate( new Date( data.startDate.dbValue ) );

        data.startDate.dateApi.dateObject = new Date( data.selectedCell.effObject.dateIn );

        if( effUnitOrDateStr.endsWith( ApsEffectivityValidationService.instance.UP ) ) {
            data.endDateOptions.dbValue = ApsEffectivityValidationService.instance.UP;
            setLocalizedValue( data.endDateOptions, 'uiValue', 'upText' );
        } else if( effUnitOrDateStr.endsWith( ApsEffectivityValidationService.instance.SO ) ) {
            data.endDateOptions.dbValue = ApsEffectivityValidationService.instance.SO;
            setLocalizedValue( data.endDateOptions, 'uiValue', 'soText' );
        } else {
            data.endDate.dbValue =  new Date( data.selectedCell.effObject.dateOut ).getTime();

            data.endDate.dateApi.dateValue = dateTimeService.formatDate( new Date( data.endDate.dbValue ) );

            data.endDate.dateApi.dateObject = new Date( data.selectedCell.effObject.dateOut );
        }
    } else if( data.selectedCell.effType === 'Unit' ) {
        data.unitRangeText.dbValue = effUnitOrDateStr;
        data.dateOrUnitEffectivityTypeRadioButton.dbValue = false;
    }

    // Set formula from current row as active for editing in intent panel.
    apsEffIntentSvc.setIntentFormulaToEdit( data.selectedCell.formulaStr );
};

export default exports = {
    getDecoratedUnitEffectivityDisplayStr,
    getDecoratedDateEffectivityDisplayStr,
    getContextObject,
    getEffectivityList,
    getExpressionTableForAddEffectivity,
    getExpressionFormula,
    getExpressionTableForRemoveEffectivity,
    getExpressionTableForEditEffectivity,
    clearDateAndUnitEffectivity,
    clearEndDate,
    isDateRangeValid,
    setProperties
};
/**
 * APS effectivity authoring service.
 *
 * @param {Object} localeSvc - localeService
 * @param {Object} appCtxSvc - appCtxService
 * @param {Object} cdmSvc - soa_kernel_clientDataModel
 * @param {Object} dateTimeService - dateTimeService
 * @param {Object} apsEffValSvc - apsEffectivityValidationService
 * @param {Object} apsEffIntentSvc - apsEffectivityIntentService
 *
 * @return {Object} - Service instance
 *
 * @memberof NgServices
 * @member swcService
 */
app.factory( 'apsEffectivityAuthoringService', () => exports );
