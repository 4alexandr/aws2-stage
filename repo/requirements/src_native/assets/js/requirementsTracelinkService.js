//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/requirementsTracelinkService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import dateTimeSvc from 'js/dateTimeService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};
var mapUidType = {};
var cellHeader1 = {};
var cellProperties = {};

/**
 * Resets the toggle map
 */
export let resetToggleType = function() {
    mapUidType = {};
    cellHeader1 = {};
    cellProperties = {};
};

/**
 * Map of property type with its corresponding place name.
 */
var _typeToPlace = {
    CHAR: 'stringProps',
    STRING: 'stringProps',
    STRINGARRAY: 'stringArrayProps',
    BOOLEAN: 'boolProps',
    BOOLEANARRAY: 'boolArrayProps',
    DATE: 'dateProps',
    DATEARRAY: 'dateArrayProps',
    OBJECT: 'tagProps',
    OBJECTARRAY: 'tagArrayProps',
    DOUBLE: 'doubleProps',
    DOUBLEARRAY: 'doubleArrayProps',
    INTEGER: 'intProps',
    INTEGERARRAY: 'intArrayProps'
};

/**
 * get Properties and its values.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @param {Array} propertyNameValues - array of properties
 */
export let getProperties2 = function( data, propertyNameValues ) {
    var properties = {};

    _.keys( propertyNameValues ).forEach( function( propName ) {
        var vmProp = data[ propName ];
        var place = _typeToPlace[ vmProp.type ];
        if( _.isUndefined( properties[ place ] ) ) {
            properties[ place ] = {};
        }

        switch ( vmProp.type ) {
            case 'STRING':
            case 'STRINGARRAY':
            case 'BOOLEAN':
            case 'BOOLEANARRAY':
            case 'DOUBLE':
            case 'DOUBLEARRAY':
            case 'INTEGER':
            case 'INTEGERARRAY':
                properties[ place ][ propName ] = [ vmProp.dbValue ];
                break;
            case 'DATE':
                properties[ place ][ propName ] = dateTimeSvc.formatUTC( vmProp.dbValue );
                break;
            case 'DATEARRAY':
                var rhs = [];
                _.forEach( vmProp.dbValue, function( val ) {
                    rhs.push( dateTimeSvc.formatUTC( val ) );
                } );
                properties[ place ][ propName ] = rhs;
                break;
            case 'OBJECT':
                properties[ place ][ propName ] = vmProp.dbValue;
                break;
            case 'OBJECTARRAY':
                var rhs = [];
                _.forEach( vmProp.dbValue, function( val ) {
                    rhs.push( val );
                } );
                properties[ place ][ propName ] = rhs;
                break;
            default:
                properties.stringProps[ propName ] = vmProp.dbValue;
                break;
        }
    } );

    return properties;
};

/**
 * Sets the toggle map type
 *
 * @param {Object} modelObject - model object
 */
export let setToggleType = function( modelObject ) {
    if( modelObject.modelType.typeHierarchyArray.includes( 'Awb0Element' ) ) {
        if( mapUidType[ modelObject.uid ] === 'Switch to Revision' ) {
            mapUidType[ modelObject.uid ] = 'Switch to Occurrence';
        } else {
            mapUidType[ modelObject.uid ] = 'Switch to Revision';
            modelObject.cellHeader1 = cellHeader1[ modelObject.uid ];
        }
    }
};

/**
 * Update this model object's awp cell properties which are stored as key/value inside an array property
 * awp0CellProperties.
 *
 * @param {ViewModelObject} viewModelObject - The object to update properties on.
 */
export let updateCellProperties = function( viewModelObject ) {
    /**
     * Pull any cell properties out of their encoded string and have them as 1st class properties of the
     * ViewModelObject.
     */
    if( viewModelObject.props && viewModelObject.props.awp0CellProperties ) {
        // We should look up for dbValue always,'dbValues' is redundant and need to cleanup any dependency on that
        // dbValue could be array or string based on the mode object
        var dbValue = viewModelObject.props.awp0CellProperties.dbValue;

        viewModelObject.cellProperties = {};
        for( var ii = 0; ii < dbValue.length; ii++ ) {
            var keyValue = dbValue[ ii ].split( '\\:' );

            var value = keyValue[ 1 ] || '';

            value = value.replace( '{__UTC_DATE_TIME}', '' );

            if( ii === 0 ) {
                viewModelObject.cellHeader1 = value;
            } else if( ii === 1 ) {
                viewModelObject.cellHeader2 = value;
            } else if( value ) {
                var key = keyValue[ 0 ];

                viewModelObject.cellProperties[ key ] = {
                    key: key,
                    value: value
                };
            }
        }
    }
};

/**
 * Retrieves the toggle map type
 *
 * @param {Object} modelObject - model object
 * @return {Any} revision or occurrence
 */
export let getToggleType = function( modelObject ) {
    if( modelObject.modelType.typeHierarchyArray.includes( 'Awb0Element' ) ) {
        if( !mapUidType[ modelObject.uid ] ) {
            mapUidType[ modelObject.uid ] = 'Switch to Occurrence';
        }

        return mapUidType[ modelObject.uid ];
    }
    return 'Revision';
};

/**
 * Retrieves the cell header
 *
 * @param {Object} modelObject - model object
 * @return {Any} cell header
 */

export let getCellHeader = function( modelObject ) {
    if( !cellProperties[ modelObject.uid ] ) {
        cellProperties[ modelObject.uid ] = modelObject.cellProperties;
    }

    modelObject.cellProperties = cellProperties[ modelObject.uid ];
    cellHeader1[ modelObject.uid ] = modelObject.props.object_string.dbValue;

    return modelObject.props.object_string.dbValue;
};

/**
 * Swaps the start and end list
 *
 */
export let swapLists = function( startList, endList ) {
    var temp = startList.dbValue;
    startList.dbValue = endList.dbValue;
    endList.dbValue = temp;
    eventBus.publish( 'CreateTracelink.refreshStartItemList' );
    eventBus.publish( 'CreateTracelink.refreshEndItemList' );
};

/**
 * The method joins the UIDs array (keys of elementToPCIMap) into a space-separated string/list.
 *
 * @return {String} Space seperated uids of all root elements in context
 */
export let getRootElementUids = function() {
    var uidRootElements;
    var aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    if( aceActiveContext ) {
        if( aceActiveContext.context.elementToPCIMap ) {
            uidRootElements = Object.keys( aceActiveContext.context.elementToPCIMap ).join( ' ' );
        } else if( aceActiveContext.context.topElement ) {
            uidRootElements = aceActiveContext.context.topElement.uid;
        }
    }
    return uidRootElements;
};

/**
 * Search for Working Context objects... maybe they have tracelinks.
 *
 * @param {Object} data - The panel's view model object
 */
export let searchAvailableWorkingContext = function( data ) {
    var soaInput = {
        columnConfigInput: {},
        inflateProperties: false,
        noServiceData: false,
        saveColumnConfigData: {},
        searchInput: {
            attributesToInflate: [ 'object_name', 'checked_out_user', 'object_desc' ],
            internalPropertyName: '',
            //TODO: How can I set max dynamically?
            maxToLoad: -1,
            maxToReturn: 0,
            providerName: 'Awp0FullTextSearchProvider',
            searchCriteria: { searchString: '*' },
            searchFilterFieldSortType: 'Priority',
            searchFilterMap6: { 'WorkspaceObject.object_type': [ { searchFilterType: 'StringFilter', stringValue: 'Awb0SavedBookmark' } ] },
            searchSortCriteria: []
        }
    };

    soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput )
        .then(
            function( response ) {
                console.log( 'get performSearchViewModel4 response' );

                var bookmarks = [ {
                    propDisplayValue: '',
                    propInternalValue: '',
                    uid: '',
                    type: ''
                } ];
                var keys = Object.keys( response.ServiceData.modelObjects );
                var len = keys.length;
                for( var ii = 0; ii < len; ii++ ) {
                    var key = Object.keys( response.ServiceData.modelObjects )[ ii ];
                    var value = response.ServiceData.modelObjects[ key ];
                    if( value.hasOwnProperty( 'props' ) && value.props.hasOwnProperty( 'object_name' ) ) {
                        bookmarks.push( {
                            propDisplayValue: value.props.object_name.dbValues[ 0 ],
                            propInternalValue: value.props.object_name.dbValues[ 0 ],
                            uid: value.uid,
                            type: value.type
                        } );
                    }
                }
                data.listofWorkingContextValues = bookmarks;
            } );
};

/**
 * Add element services
 */

export default exports = {
    resetToggleType,
    getProperties2,
    setToggleType,
    updateCellProperties,
    getToggleType,
    getCellHeader,
    swapLists,
    getRootElementUids,
    searchAvailableWorkingContext
};
app.factory( 'requirementsTracelinkService', () => exports );
