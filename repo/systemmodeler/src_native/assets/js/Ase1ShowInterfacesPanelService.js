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
 * @module js/Ase1ShowInterfacesPanelService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import dataManagementSvc from 'soa/dataManagementService';
import Ase0VisSelectionService from 'js/Ase0VisSelectionService';
import eventBus from 'js/eventBus';

var exports = {};
var _bundledConnectionmMap = {};
var _filter = null;

/**
 * Extract all the external nodes from the return data
 *
 * @param {data} - The declarative data view model object.
 */
export let modifyResultsList = function( data ) {
    if( !data ) {
        return null;
    }

    var deferred = AwPromiseService.instance.defer();

    data.panelIsActive = true;
    var retResults = [];
    _bundledConnectionmMap = {};

    for( var iResults = 0; iResults < data.results.length; iResults++ ) {
        for( var i = 0; i < data.results[ iResults ].edgeData.length; i++ ) {
            var edge = data.results[ iResults ].edgeData[ i ];
            // Workaround for issue with getInterfaces returning duplicate edges
            if( !_bundledConnectionmMap[ edge.end2Element.uid ] ) {
                retResults.push( edge.end2Element );
            }
            _bundledConnectionmMap[ edge.end2Element.uid ] = edge.edge;
        }
    }

    var filter = "";
    if( _filter !== null ) {
        filter = _filter.dbValue;
    }

    var uids = [];

    for( var iRetResults = 0; iRetResults < retResults.length; iRetResults++ ) {
        uids.push( retResults[ iRetResults ].uid );
    }

    var columnPropNames = [];
    columnPropNames.push( 'awb0ArchetypeName' );
    columnPropNames.push( 'awb0ArchetypeRevName' );
    columnPropNames.push( 'awb0ArchetypeId' );
    columnPropNames.push( 'awb0ArchetypeRevId' );

    var promise = dataManagementSvc.getProperties( uids, columnPropNames );

    promise.then( function() {
        if( retResults.length > 0 ) {
            var endElements = exports.checkFilter( retResults, filter );
            retResults = endElements;
        }
        deferred.resolve( retResults );
    } );

    return deferred.promise;
};

export let processData = function( data ) {
    data.panelIsActive = true;
    _filter = data.filterBox;
    return "showSystemPanel";
};

export let onButtonClick = function( data, prodContext, selectedObj ) {
    data.panelIsActive = false;

    var selObjects = [];
    selObjects.push( selectedObj );

    for( var i = 0; i < data.dataProviders.showInterfacesDataProvider.selectedObjects.length; i++ ) {
        var obj = data.dataProviders.showInterfacesDataProvider.selectedObjects[ i ];

        // Push the end element
        selObjects.push( obj );

        // Push the bundled connection
        var edge = _bundledConnectionmMap[ obj.uid ];
        selObjects.push( edge );
    }

    Ase0VisSelectionService.setViewerVisibility( selObjects, 'selectedOn', 'awDefaultViewer' );
    _bundledConnectionmMap = {};
    _filter = null;

    // Close the panel
    eventBus.publish( 'complete', {
        source: 'toolAndInfoPanel'
    } );
};

/**
 * Filters the other end objects based on the property value match
 *
 * @param {String} elementList - list of other end objects
 * @param {String} filter - filter text
 */
export let checkFilter = function( elementList, filter ) {
    var rData = [];
    for( var i = 0; i < elementList.length; ++i ) {
        if( filter !== "" ) {
            // We have a filter, don't add nodes unless the filter matches a cell property
            for( var idx = 0; idx < elementList[ i ].props.awp0CellProperties.dbValues.length; idx++ ) {
                var property = elementList[ i ].props.awp0CellProperties.dbValues[ idx ].toLocaleLowerCase()
                    .replace( /\\|\s/g, "" );
                if( property.indexOf( filter.toLocaleLowerCase().replace( /\\|\s/g, "" ) ) !== -1 ) {
                    // Filter matches a property, add node to output elementList and go to next node
                    rData.push( elementList[ i ] );
                    break;
                }
            }
        } else {
            // No filter, just add the node to output elementList
            rData.push( elementList[ i ] );
        }
    }
    return rData;
};

/**
 * update inverse selection
 *
 * @param {viewModelJsonData} data - The view model data
 */
export let onInverseSelection = function( data ) {
    var dataProvider = data.dataProviders.showInterfacesDataProvider;
    var selectionModel = dataProvider.selectionModel;
    //Toggle selection on every object in the list
    selectionModel.toggleSelection( dataProvider.viewModelCollection.getLoadedViewModelObjects() );
};

/**
 * Factory
 */

export default exports = {
    modifyResultsList,
    processData,
    onButtonClick,
    checkFilter,
    onInverseSelection
};
app.factory( 'Ase1ShowInterfacesPanelService', () => exports );
