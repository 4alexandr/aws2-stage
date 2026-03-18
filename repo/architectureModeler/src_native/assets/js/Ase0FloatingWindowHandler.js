// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0FloatingWindowHandler
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import vmcs from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';
import manageDiagramSoaSvc from 'js/Ase0ManageDiagramSoaService';
import { popupService } from 'js/popupService';
import popupUtils from 'js/popupUtils';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import cmm from 'soa/kernel/clientMetaModel';

import 'js/command.service';

var exports = {};
var _popupRef;

var _previewDiagramCache = {};

export let initializeContentClickListener = function( data ) {
    data.sendViewChangeEvent = function( requestedView ) {
        eventBus.publish( "awFloatGraphPopup.requestView", {
            "view": requestedView,
            "source": "header"
        } );
    };
};

export let diagramDoubleClicked = function( data, graphDoubleClickItem ) {
    if( graphDoubleClickItem && graphDoubleClickItem.getItemType() === 'Node' ) {
        if( data.currentObject.props.awb0UnderlyingObject !== graphDoubleClickItem.modelObject.props.awb0UnderlyingObject ) {
            eventBus.publish( 'awFloatGraphPopup.getAssociatedDiagrams', { object: graphDoubleClickItem.modelObject } );
        } else if( data.relatedDiagramList.dbValue.length > 1 ) {
            exports.requestView( data, 'DiagramSelect' );
        }
    }
};

var updateLocation = function( data, eventData ) {
    if( data && data.breadcrumb.provider && data.breadcrumb.provider.crumbs ) {
        if( eventData.selectedCrumb ) {
            var newCrumbs = [];
            var selectedCrumb = eventData.selectedCrumb;

            for( var i = 0; i < data.breadcrumb.provider.crumbs.length; i++ ) {
                var element = data.breadcrumb.provider.crumbs[ i ];

                if( element === selectedCrumb ) {
                    var newCrumbTemp = {
                        clicked: false,
                        displayName: selectedCrumb.displayName,
                        selectedCrumb: true,
                        width: 200,
                        data: selectedCrumb.data
                    };

                    newCrumbs.push( newCrumbTemp );
                    break;
                } else {
                    newCrumbs.push( element );
                }
            }

            data.breadcrumb.provider.crumbs = newCrumbs;
        } else {
            var displayName = '';

            if( eventData.object.props.awb0UnderlyingObject ) {
                displayName = eventData.object.props.awb0UnderlyingObject.uiValues[ '0' ];
            } else if( eventData.object.props.awp0CellProperties ) {
                displayName = eventData.object.props.awp0CellProperties.uiValues[ '0' ];
            }
            var newCrumb = {
                clicked: false,
                displayName: displayName,
                selectedCrumb: true,
                width: 200,
                data: eventData.object
            };

            if( data.breadcrumb.provider.crumbs > 0 ) {
                var lastCrumb = _.last( data.breadcrumb.provider.crumbs );

                if( lastCrumb && lastCrumb.displayName === displayName ) {
                    return;
                }
            }

            _.forEach( data.breadcrumb.provider.crumbs, function( crumb ) {
                crumb.selectedCrumb = false;
                crumb.clicked = false;
            } );

            data.breadcrumb.provider.crumbs.push( newCrumb );
        }
    }
};

export let onBreadcrumbClicked = function( selectedCrumb ) {
    eventBus.publish( 'awFloatGraphPopup.getAssociatedDiagrams', {
        object: selectedCrumb.data,
        selectedCrumb: selectedCrumb
    } );
};

export let initBreadcrumb = function( ctx, data ) {
    if( data && data.breadcrumb && data.breadcrumb.provider ) {
        if( !data.breadcrumb.provider.crumbs ) {
            data.breadcrumb.provider.crumbs = [];
        }

        data.breadcrumb.provider.onSelect = exports.onBreadcrumbClicked;
    }
};

export let showFloatingWindowPopup = function( popupData ) {
    popupService.show( popupData ).then( function( popupRef ) {
        _popupRef = popupRef;
    } );
};

export let closeFGPopup = function() {
    _.defer( function() {
        _popupRef.options.disableClose = false;
        popupService.hide( _popupRef );
    } );
};

export let getAssociatedDiagramsInput = function( ctx, data, eventData ) {
    // Check for invalid input.
    if( !ctx || !data || !eventData ) {
        return {};
    }
    var nodeObject;
    if( eventData.object ) {
        nodeObject = eventData.object;
    } else {
        nodeObject = eventData.modelObject;
    }
    // Loading property for future use in breadcrumb
    dmSvc.getProperties( [ nodeObject.uid ], [ 'awb0UnderlyingObject' ] );

    var selection = ctx.mselected[ 0 ];
    selection = nodeObject;
    var startIndex;
    if( data.dataProviders && data.dataProviders.associatedDiagramsList ) {
        startIndex = data.dataProviders.associatedDiagramsList.startIndex;
    } else {
        startIndex = 0;
    }
    var searchInput = {
        maxToLoad: 50,
        maxToReturn: 50,
        providerName: 'Ase0AssocDiagramProvider',
        searchCriteria: {
            elementUids: selection.uid,
            productContextUids: ctx.occmgmtContext.productContextInfo.uid
        },
        startIndex: startIndex
    };

    return searchInput;
};

var clearGraph = function( graphModel ) {
    if( graphModel && graphModel.graphControl ) {
        graphModel.nodeMap = null;
        graphModel.edgeMap = null;
        graphModel.portMap = null;
        //clear the graph
        var graph = graphModel.graphControl.graph;

        if( graph ) {
            graph.update( function() {
                graph.clear();
            } );
        }

        graphModel.graphControl.layout = null;
    }
};

/**
 * create input for manageDiagram2 SOA
 */
export let getManageDiagram2Input = function( data, manageDiagramQueue, eventData ) {
    if( !data || !manageDiagramQueue || !eventData || !eventData.diagramUID ) {
        return [];
    }

    _.set( eventData, 'userAction', 'OpenFloatDiagram' );
    var input = manageDiagramSoaSvc.getManageDiagram2Input( eventData, manageDiagramQueue );

    input[ 0 ].primaryObjects = [ {
        type: 'Ase0Diagram',
        uid: eventData.diagramUID
    } ];

    if( data.archGraphModel && data.archGraphModel.isGraphFitted ) {
        data.archGraphModel.isGraphFitted = false;
    }

    if( data.graphModel ) {
        clearGraph( data.graphModel );
    }

    return input;
};
/*
 * method to get manageDiagram2 SOA response and pass it to FGManageDiagramComplete event for further processing.
 */
export let getManageDiagram2Response = function( response ) {
    var graphData = _.clone( response );
    var eventData = {
        graphData: graphData
    };
    eventBus.publish( 'FGManageDiagramComplete', eventData );
    return graphData;
};
/**
 * Switches the active view within the popup window.
 *
 * @param {DeclViewModel} data - Model that owns the action.
 * @param {String} view - Name of the view to show.
 *
 * @returns {Promise} A promise that calls {@link deferred~resolve} once the
 *     desired view loaded successfully, {@link deferred~reject} otherwise.
 */
export let requestView = function( data, view ) {
    var deferred = AwPromiseService.instance.defer();

    if( !data ) {
        deferred.reject( 'Invalid argument! Missing \'data\' parameter. ' );
    } else if( typeof view !== 'string' || view.trim().length === 0 ) {
        deferred.reject( 'Invalid argument. Improper view string.' );
    } else {
        if( data.activeView !== view ) {
            data.activeView = view;
        }

        AwTimeoutService.instance( function() {
            deferred.resolve();
        } );
    }

    return deferred.promise;
};

export let dblClickDiagramInList = function( data ) {
    exports.showDiagramAndCache( data.currentObject, data.eventData );
};

export let previewDiagram = function( data ) {
    var selectedObjects = data.dataProviders.associatedDiagramsList.getSelectedObjects();

    if( selectedObjects.length > 0 ) {
        var diagram = selectedObjects[ '0' ];

        var showDiagramEventData = {
            diagramVMO: diagram,
            diagramUID: diagram.uid,
            diagramName: diagram.props.object_string.dbValue
        };

        exports.showDiagramAndCache( data.currentObject, showDiagramEventData );
    }
};

export let showDiagramAndCache = function( currentObject, showDiagramEventData ) {
    _previewDiagramCache[ currentObject ] = showDiagramEventData;

    eventBus.publish( 'awFloatGraphPopup.showDiagram', showDiagramEventData );
};

export let setAsDefaultDiagram = function( data ) {
    // Make sure the object is modifiable.
    if( data.currentObject.props.is_modifiable.uiValues[ '0' ] === 'False' ) {
        return AwPromiseService.instance.reject();
    }

    var selectedObjects = data.dataProviders.associatedDiagramsList.getSelectedObjects();

    // Nothing selected or too many selected or already the default diagram
    if( !selectedObjects || selectedObjects.length === 0 || selectedObjects.length > 1 || selectedObjects[ 0 ].ase0IsDefaultDiagram ) {
        return AwPromiseService.instance.reject();
    }

    var currentDefault;
    var deferred = AwPromiseService.instance.defer();

    // Get all of the loaded Diagram VMOs.
    var diagramVMOs = data.dataProviders.associatedDiagramsList.viewModelCollection.getLoadedViewModelObjects();

    // Clear the is default diagram checkmark from all diagrams.
    _.forEach( diagramVMOs, function( diagramVMO ) {
        if( diagramVMO.ase0IsDefaultDiagram ) {
            currentDefault = diagramVMO;
        }
        diagramVMO.ase0IsDefaultDiagram = false;
    } );

    // Add the checkmark to the selected object.
    selectedObjects[ 0 ].ase0IsDefaultDiagram = true;

    // When the default is set, it should be the cached diagram
    var showDiagramEventData = {
        diagramVMO: selectedObjects[ 0 ],
        diagramUID: selectedObjects[ 0 ].uid,
        diagramName: selectedObjects[ 0 ].props.object_string.dbValue
    };
    _previewDiagramCache[ data.currentObject ] = showDiagramEventData;

    // Kick off a background SOA call to
    // update the default diagram.
    dmSvc.setProperties(
        [ {
            object: {
                uid: selectedObjects[ 0 ].relUID,
                type: 'Ase0DiagramRelation'
            },
            vecNameVal: [ {
                name: 'ase0IsDefaultDiagram',
                values: [
                    'true'
                ]
            } ]
        } ] ).then( deferred.resolve(), function setDefaultDiagramFailure( SoaResponse ) {
        // Return the list to before the call.
        if( currentDefault ) {
            currentDefault.ase0IsDefaultDiagram = true;
        }

        selectedObjects[ 0 ].ase0IsDefaultDiagram = false;

        deferred.reject( SoaResponse );
    } );

    return deferred.promise;
};

export let refitGraph = function( params ) {
    setTimeout( function() {
        params.graphModel.graphControl.fitGraph();
    } );
};

/**
 * Processes the getAssociatedDiagrams SOA response data and
 * stores the results in the data.
 *
 * This is intentionally left as a promise so we can specify
 * conditional events in the JSON.
 *
 * @param {DeclViewModel} data - Model that owns the action.
 *
 * @returns {Promise} A promise that calls {@link deferred~resolve} once the
 *     desired view loaded successfully, {@link deferred~reject} otherwise.
 */
export let processGetAssociatedDiagramsResponse = function( data, context ) {
    var rData = [];
    var response;
    if( data.searchResults && data.searchResultObjects ) {
        response = data;
    } else {
        response = context;
    }

    _.forEach( response.searchResults.objects, function( diagramProxyObj ) {
        var diagramProxyObject = vmcs.createViewModelObject( diagramProxyObj.uid, 'EDIT' );

        if( diagramProxyObject.props && diagramProxyObject.props.ase0EndObject &&
            diagramProxyObject.props.ase0EndObject.dbValues ) {
            var diagramModelObject = vmcs.createViewModelObject(
                diagramProxyObject.props.ase0EndObject.dbValue, 'EDIT' );

            if( diagramModelObject && cmm.isInstanceOf( 'Ase0Diagram', diagramModelObject.modelType ) &&
                diagramProxyObject.props.ase0Relation &&
                diagramProxyObject.props.ase0Relation.dbValues &&
                diagramProxyObject.props.ase0Relation.dbValues[ 0 ] ) {
                // Store the Diagram Relation's UID.
                diagramModelObject.relUID = diagramProxyObject.props.ase0Relation.dbValues[ 0 ];

                var diagramRelationObj = response.searchResultObjects[ diagramModelObject.relUID ];

                // Check if it's the default diagram.
                if( diagramRelationObj && diagramRelationObj.props && diagramRelationObj.props.ase0IsDefaultDiagram &&
                    diagramRelationObj.props.ase0IsDefaultDiagram.uiValues[ '0' ] === 'True' ) {
                    // Update the view model object.
                    diagramModelObject.ase0IsDefaultDiagram = true;
                } else {
                    // Update the view model object.
                    diagramModelObject.ase0IsDefaultDiagram = false;
                }
                rData.push( diagramModelObject );
            }
        }
    } );

    // Set the data and resolve.
    data.relatedDiagramList.dbValue = rData;
    data.relatedDiagramFilterList.dbValue = data.relatedDiagramList.dbValue;

    // Return a resolved promise.
    return AwPromiseService.instance.resolve();
};

var checkDiagramToLoad = function( data ) {
    // Check if one of the diagrams was previewed.
    var diagramToLoad = _previewDiagramCache[ data.currentObject ];

    // Check the diagrams list.
    if( !diagramToLoad && data.relatedDiagramList.dbValue.length > 0 ) {
        var defaultDiagramVMO = null;

        // If there's only one, show it.
        if( data.relatedDiagramList.dbValue.length === 1 ) {
            defaultDiagramVMO = data.relatedDiagramList.dbValue[ 0 ];

            // Check if there is a default diagram.
        } else {
            defaultDiagramVMO = _.find( data.relatedDiagramList.dbValue, { ase0IsDefaultDiagram: true } );
        }

        // Format the result as expected.
        if( defaultDiagramVMO ) {
            diagramToLoad = {
                diagramVMO: defaultDiagramVMO,
                diagramUID: defaultDiagramVMO.uid,
                diagramName: defaultDiagramVMO.props.object_string.dbValue
            };
        }
    }

    return diagramToLoad;
};

export let onDiagramLoadComplete = function( data, eventData ) {
    data.currentDiagram = eventData.diagramVMO;
};

export let onGetAssociatedDiagramsComplete = function( data, context, eventDataPopup ) {
    if( !data || !context || !eventDataPopup ) {
        // Throw err.
    }

    if( data.relatedDiagramList && data.relatedDiagramList.dbValue && data.relatedDiagramList.dbValue.length > 0 ) {
        data.currentDiagram = null;
        var evntData = null;
        if( eventDataPopup && eventDataPopup.object ) {
            evntData = eventDataPopup;
        } else if( context.object ){
            evntData = context;
        }
        if ( evntData )
        {
            data.currentObject = evntData.object;
            updateLocation( data, evntData );
        }
        var diagramToLoad = checkDiagramToLoad( data );

        if( diagramToLoad ) {
            eventBus.publish( 'awFloatGraphPopup.showDiagram', diagramToLoad );
        } else {
            eventBus.publish( 'awFloatGraphPopup.requestView', { view: 'DiagramSelect' } );
        }
    }
};

/**
 * Ase0FloatingWindowHandler factory
 */

// Angular JS.

// DeclViewModel loaders.

// View Model Service.

// Data Management Service.

// Command Panel Service.

export default exports = {
    initializeContentClickListener,
    diagramDoubleClicked,
    onBreadcrumbClicked,
    initBreadcrumb,
    getAssociatedDiagramsInput,
    getManageDiagram2Input,
    getManageDiagram2Response,
    requestView,
    dblClickDiagramInList,
    previewDiagram,
    showDiagramAndCache,
    setAsDefaultDiagram,
    refitGraph,
    processGetAssociatedDiagramsResponse,
    onDiagramLoadComplete,
    onGetAssociatedDiagramsComplete,
    closeFGPopup,
    showFloatingWindowPopup
};
app.factory( 'Ase0FloatingWindowHandler', () => exports );
