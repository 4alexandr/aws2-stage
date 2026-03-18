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
 * Interface Page service
 *
 * @module js/Ase1InterfacesPageService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _interfacesUnloadedEventListener = null;

var _productContextChanged = null;

/**
 * Register context on Interfaces tab load.
 */
export let handleInterfacesPageLoad = function() {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( interfacesCtx ) {
        interfacesCtx.isInterfacesActive = true;
        interfacesCtx.internalSystemsExists = false;
        interfacesCtx.nodeMap = {};
        interfacesCtx.edgeMap = {};
        interfacesCtx.selectedNodes = [];
        appCtxSvc.updateCtx( 'interfacesCtx', interfacesCtx );
    } else {
        interfacesCtx = {
            isInterfacesActive: true,
            internalSystemsExists: false,
            nodeMap: {},
            edgeMap: {},
            selectedNodes: []
        };
        appCtxSvc.registerCtx( 'interfacesCtx', interfacesCtx );
    }

    var interfacesViewModeCtx = appCtxSvc.getCtx( 'interfacesViewModeCtx' );
    if( !interfacesViewModeCtx ) {
        interfacesViewModeCtx = {
            viewMode: 'Ase1GraphView',
            selectedSplitPanelLocation: 'bottom'
        };
        appCtxSvc.registerCtx( 'interfacesViewModeCtx', interfacesViewModeCtx );
    }

    var interfacesLabelCtx = appCtxSvc.getCtx( 'interfacesLabelCtx' );
    if( !interfacesLabelCtx ) {
        interfacesLabelCtx = {
            LabelProperties: {}
        };
        appCtxSvc.registerCtx( 'interfacesLabelCtx', interfacesLabelCtx );
    }

    if( !_interfacesUnloadedEventListener ) {
        _interfacesUnloadedEventListener = eventBus.subscribe( 'Ase1InterfacesPage.contentUnloaded', function() {
            handleInterfacesUnloaded();
        }, 'Ase1InterfacesPageService' );
    }
};

/**
 * Unregister context on Interfaces tab load.
 */
function handleInterfacesUnloaded() {
    eventBus.unsubscribe( _interfacesUnloadedEventListener );
    _interfacesUnloadedEventListener = null;
    appCtxSvc.unRegisterCtx( 'interfacesCtx' );
}

/**
 * Getting external systems
 * @param {Object} externalSystems - external systems
 *
 * @return {Object} external system objects
 */
function getExternalSystemObjects( externalSystems ) {
    var externalSystemObjects = _.map( externalSystems, 'nodeObject' );
    return externalSystemObjects;
}

/**
 * Create input for getInterfaces SOA
 * @param {Object} eventData event data
 *
 * @return {Array} input data for get interfaces
 */
export let getInterfacesInput = function( eventData ) {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( !interfacesCtx ) {
        return null;
    }
    var occMgmnt = appCtxSvc.getCtx( 'occmgmtContext' );
    var input = [];
    var curDate = new Date();
    var clientId = eventData.navigationMode + curDate.getTime();
    var externalSystems = null;
    var systemInView = null;
    var isSystemOfViewExpanded = 'false';
    var sortBy = [];

    switch ( eventData.navigationMode ) {
        case 'ShowInterfaces':
            var soiNode = createNode( eventData.systemOfInterest, '', false );
            interfacesCtx.systemOfInterest = soiNode;
            systemInView = eventData.systemOfInterest;
            externalSystems = [];
            break;
        case 'ShowChildInterfaces':
        case 'ShowParentInterfaces':
            externalSystems = getExternalSystemObjects( interfacesCtx.externalSystems );
            systemInView = eventData.systemInView;
            break;
        case 'UpdateLabelProperties':
            externalSystems = getExternalSystemObjects( interfacesCtx.externalSystems );
            systemInView = interfacesCtx.systemInView.nodeObject;
            if( interfacesCtx.internalSystemsExists ) {
                isSystemOfViewExpanded = 'true';
            }
            sortBy.push( eventData.sortByLabel );
            break;
        default:
            break;
    }

    var inputData = {
        clientId: clientId,
        systemOfInterest: interfacesCtx.systemOfInterest.nodeObject,
        systemInView: systemInView,
        externalSystems: externalSystems,
        navigationMode: eventData.navigationMode,
        diagramInfo: {
            sortBy: sortBy,
            isSystemOfViewExpanded: [ isSystemOfViewExpanded ]
        },
        inputContext: {
            productContext: occMgmnt.productContextInfo
        }
    };

    input.push( inputData );
    return input;
};

var createNode = function( nodeObject, nodeLabel, isExternal ) {
    var node = {
        nodeObject: nodeObject,
        nodeLabel: nodeLabel,
        isExternal: isExternal
    };
    return node;
};

var processResponseToGetNodes = function( systems, isExternal ) {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    var nodes = [];
    _.forEach( systems, function( system ) {
        var nodeObject = system.node;
        if( !nodeObject ) {
            nodeObject = cdm.getObject( system.node.uid );
        }
        if( nodeObject ) {
            var nodeLabel = system.nodeInfo.displayProperties[ 0 ];
            var node = createNode( nodeObject, nodeLabel, isExternal );
            nodes.push( node );
            interfacesCtx.nodeMap[ nodeObject.uid ] = node;
        }
    } );

    return nodes;
};

var createEdge = function( edgeObject, end1Element, end2Element ) {
    var edge = {
        edgeObject: edgeObject,
        end1Element: end1Element,
        end2Element: end2Element
    };
    return edge;
};

var processResponseToGetEdges = function( edgesData ) {
    var edges = [];
    _.forEach( edgesData, function( edgeData ) {
        var edge = createEdge( edgeData.edge, edgeData.end1Element, edgeData.end2Element );
        edges.push( edge );
    } );

    return edges;
};

var updateModel = function( systemInView, internalNodes, externalNodes, edges ) {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    interfacesCtx.systemInView = systemInView;
    interfacesCtx.internalSystems = internalNodes;

    if( !internalNodes || internalNodes.length === 0 ) {
        interfacesCtx.externalSystems = externalNodes;
        interfacesCtx.internalSystemsExists = false;
    } else {
        interfacesCtx.internalSystemsExists = true;
    }

    interfacesCtx.visibleExternalSystems = externalNodes;
    interfacesCtx.edges = edges;
};

var populateLabelInfo = function( diagramInfo ) {
    if( !diagramInfo ) {
        return;
    }
    var interfacesLabelCtx = appCtxSvc.getCtx( 'interfacesLabelCtx' );
    if( interfacesLabelCtx && interfacesLabelCtx.LabelProperties ) {
        var labelPropMap = {};
        _.map( diagramInfo, function( value, key ) {
            if( key !== 'hasSystemModelerLicense' ) {
                labelPropMap[ key ] = value[ 0 ];
            }
        } );
        interfacesLabelCtx.LabelProperties = labelPropMap;

        if( !interfacesLabelCtx.selectedLabelProperty && appCtxSvc.ctx.preferences.ASE1_Interfaces_Node_Label_Property ) {
            interfacesLabelCtx.selectedLabelProperty = appCtxSvc.ctx.preferences.ASE1_Interfaces_Node_Label_Property[ 0 ];
        }
    }
};

/**
 * Update Interfaces tab view model data
 * @param {Object} viewData view model data
 */
export let updateInterfacesViewModel = function( viewData ) {
    if( viewData && viewData.results ) {
        var output = viewData.results[ 0 ];
        if( output.externalNodeData.length === 0 && output.internalNodeData.length === 0 && output.edgeData.length === 0 && output.navigationMode === 'ShowChildInterfaces' ) {
            return;
        }

        var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
        interfacesCtx.nodeMap = {};
        var externalSystems = output.externalNodeData;
        var internalSystems = output.internalNodeData;
        var edgeData = output.edgeData;

        if( output.diagramInfo && output.diagramInfo.hasSystemModelerLicense && output.diagramInfo.hasSystemModelerLicense.length > 0 ) {
            var hasSystemModelerLicense =  output.diagramInfo.hasSystemModelerLicense[ 0 ] === 'true';

            interfacesCtx.hasSystemModelerLicense = hasSystemModelerLicense;
            appCtxSvc.updateCtx( 'interfacesCtx', interfacesCtx );
        }

        var systemInView = createNode( output.systemInView.node, output.systemInView.nodeInfo.displayProperties[ 0 ],
            false );
        interfacesCtx.nodeMap[ systemInView.nodeObject.uid ] = systemInView;

        // Update label property for system of interest
        if( interfacesCtx.systemOfInterest.nodeObject.uid === systemInView.nodeObject.uid ) {
            interfacesCtx.systemOfInterest.nodeLabel = systemInView.nodeLabel;
        } else {
            interfacesCtx.nodeMap[ interfacesCtx.systemOfInterest.nodeObject.uid ] = interfacesCtx.systemOfInterest;
        }

        var externalNodes = processResponseToGetNodes( externalSystems, true );
        var internalNodes = processResponseToGetNodes( internalSystems, false );
        var edges = processResponseToGetEdges( edgeData );
        populateLabelInfo( output.diagramInfo );

        updateModel( systemInView, internalNodes, externalNodes, edges );
        eventBus.publish( 'Ase1InterfacesPage.modelUpdated' );
    }
};

var systemContainsIn = function( modelObject, systems ) {
    var isValidSystem = false;
    if( !modelObject || !systems || systems.length === 0 ) { return false; }

    var matchSystem = _.find( systems, function( system ) {
        return  system.nodeObject.uid === modelObject.uid;
    } );
    if( matchSystem ) {
        isValidSystem = true;
    }
    return isValidSystem;
};

var getSystemType = function( modelObject ) {
    if( !modelObject ) {
        return undefined;
    }
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( modelObject.uid === interfacesCtx.systemOfInterest.nodeObject.uid ) {
        return 'SystemOfInterest';
    }
    if( interfacesCtx.systemInView && modelObject.uid === interfacesCtx.systemInView.nodeObject.uid ) {
        return 'SystemInView';
    }
    if( interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 && systemContainsIn( modelObject, interfacesCtx.internalSystems ) ) {
        return 'InternalSystem';
    }
    if( interfacesCtx.externalSystems && interfacesCtx.externalSystems.length > 0 && systemContainsIn( modelObject, interfacesCtx.externalSystems ) ) {
        return 'ExternalSystem';
    }
    return 'BundledConnection';
};

var fireAceSelectionEvent = function( doubleClickedObject ) {
    if( !doubleClickedObject ) {
        return;
    }

    // check if awb0Parent property is loaded before firing ACE selection change event
    var parentObject = doubleClickedObject.props.awb0Parent;
    if( parentObject ) {
        eventBus.publish( 'aceElementsSelectedEvent', {
            elementsToSelect: [ doubleClickedObject ]
        } );
    } else {
        dms.getProperties( [ doubleClickedObject.uid ], [ 'awb0Parent' ] )
            .then(
                function() {
                    eventBus.publish( 'aceElementsSelectedEvent', {
                        elementsToSelect: [ doubleClickedObject ]
                    } );
                } );
    }
};

/**
 * Process double click on Interfaces tab.
 * @param {Object} doubleClickedObject double clicked object
 */
export let processObjectDoubleClick = function( doubleClickedObject ) {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( doubleClickedObject && interfacesCtx ) {
        // Checking if its system of interest or internal system
        var systemType = getSystemType( doubleClickedObject );
        if( !systemType ) {
            return;
        }
        if( systemType === 'SystemOfInterest' || systemType === 'InternalSystem' ) {
            var eventData = {
                navigationMode: 'ShowChildInterfaces',
                systemInView: doubleClickedObject
            };
            eventBus.publish( 'Ase1InterfacesPage.getInterfaces', eventData );
        } else if( systemType === 'ExternalSystem' ) {
            // Fire ACE selection change event
            fireAceSelectionEvent( doubleClickedObject );
        }
        // Reset the selectedNodes
        interfacesCtx.selectedNodes = [];
        interfacesCtx.isValidIntfSelection = false;
        appCtxSvc.updateCtx( 'interfacesCtx', interfacesCtx );
    }
};

/**
 * Process Go Up command click
 */
export let processGoUpCommandClick = function() {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( interfacesCtx ) {
        var eventData = {
            navigationMode: 'ShowParentInterfaces',
            systemInView: interfacesCtx.systemInView.nodeObject
        };
        interfacesCtx.isValidIntfSelection = false;
        appCtxSvc.updateCtx( 'interfacesCtx', interfacesCtx );
        eventBus.publish( 'Ase1InterfacesPage.getInterfaces', eventData );
    }
};

/**
 * Process selection change in Graph or Grid view
 * @param {Array} secondaryWorkAreaSelection selected objects in secondary workarea
 */
export let processSelectionChange = function( secondaryWorkAreaSelection ) {
    // Now process the selected Graph Items
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    interfacesCtx.selectedNodes = [];
    var localInternalSystemsUids = [];
    var systemType = '';
    _.forEach( secondaryWorkAreaSelection, function( selectedModelObj ) {
        systemType = getSystemType( selectedModelObj );
        if( systemType === 'ExternalSystem' || systemType === 'InternalSystem' || systemType === 'SystemOfInterest' ) {
            interfacesCtx.selectedNodes.push( selectedModelObj );
        }
    } );
    var isValidSelection = false;
    var isBundledConnectionSelection = false;
    var targetObjectUid = '';
    if( secondaryWorkAreaSelection.length > 0 ) {
        isValidSelection = true;
        if( cmm.isInstanceOf( 'Ase0BundledConnection', secondaryWorkAreaSelection[ 0 ].modelType ) ) {
            isBundledConnectionSelection = true;
        }
        targetObjectUid = secondaryWorkAreaSelection[ 0 ].uid;
        // Add the Internal systems uid only when internal systems exist and the selected node is
        // the system in view
        if( interfacesCtx.internalSystemsExists === true && targetObjectUid === interfacesCtx.systemInView.nodeObject.uid ) {
            localInternalSystemsUids = _.map( interfacesCtx.internalSystems, 'nodeObject.uid' );
        }
    }
    if( interfacesCtx ) {
        interfacesCtx.isValidIntfSelection = isValidSelection;
        interfacesCtx.isBundledConnSelection = isBundledConnectionSelection;
        interfacesCtx.systemType = systemType;
        interfacesCtx.targetModelObjectUid = targetObjectUid;
        interfacesCtx.internalSystemsUids = localInternalSystemsUids.join( '|' );
        appCtxSvc.updateCtx( 'interfacesCtx', interfacesCtx );
    }
    eventBus.publish( 'AM.SubLocationContentSelectionChangeEvent', {
        selections: secondaryWorkAreaSelection
    } );
};

/**
 * Process the Focus On System Command click
 */
export let processFocusOnSystemCommandClick = function() {
    var interfacesCtx = appCtxSvc.getCtx( 'interfacesCtx' );
    if( interfacesCtx.selectedNodes && interfacesCtx.selectedNodes.length > 0 ) {
        var noOfItems = interfacesCtx.selectedNodes.length;
        var selectedNodeObject = interfacesCtx.selectedNodes[  noOfItems - 1  ];
        if( selectedNodeObject.uid !== interfacesCtx.systemOfInterest.uid ) {
            fireAceSelectionEvent( selectedNodeObject );
        }
        // Reset the selectedNodes
        interfacesCtx.selectedNodes = [];
    }
};

/**
 * Function to subscribe to product context change event on configuration changed
 * @param {Object} value value object
 */
export let configurationChanged = function( value ) {
    // if startFreshNavigation flag is true then don't need to process further as there will be selection event from ACE
    // and Interfaces tab will react to it
    if( value && Object.keys( value.aceActiveContext.context.configContext ).length > 0
    && !value.aceActiveContext.context.configContext.startFreshNavigation ) {
        if( !_productContextChanged ) {
            _productContextChanged = eventBus.subscribe( 'productContextChangedEvent', function() {
                productContextChanged();
            } );
        }
    }
};

/**
 * Function to subscribe to product context change event on reset command execution
 */
export let resetContent = function() {
    if( !_productContextChanged ) {
        _productContextChanged = eventBus.subscribe( 'productContextChangedEvent', function() {
            productContextChanged();
        } );
    }
};

/**
 * execute handleInterfacesPageLoad on product context change event
 */
var productContextChanged = function() {
    eventBus.unsubscribe( _productContextChanged );
    _productContextChanged = null;
    eventBus.publish( 'Ase1InterfacesPage.contentLoaded' );
};

export default exports = {
    handleInterfacesPageLoad,
    getInterfacesInput,
    updateInterfacesViewModel,
    processObjectDoubleClick,
    processGoUpCommandClick,
    processSelectionChange,
    processFocusOnSystemCommandClick,
    configurationChanged,
    resetContent
};
app.factory( 'Ase1InterfacesPageService', () => exports );
