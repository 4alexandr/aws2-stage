// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/createAnalysisRequestFromDigramUtils
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmdMapSvc from 'js/commandsMapService';
import _ from 'lodash';

var exports = {};

function _getVisibleChildren( selectedNode, groupGraph, children ) {
    var childrenOfSelectedElement = groupGraph.getChildNodes( selectedNode );

    _.forEach( childrenOfSelectedElement, function( child ) {
        if( child.isVisible() ) {
            children.push( child.modelObject );
        }
    } );

    if( childrenOfSelectedElement.length > 0 ) {
        _.forEach( childrenOfSelectedElement, function( child ) {
            _getVisibleChildren( child, groupGraph, children );
        } );
    }
}

export let addAllVisibleConnection = function( graphModel, visibleEdgeModel, visibleConnections, _selectedObjects ) {
    var groupGraph = graphModel.graphControl.groupGraph;
    visibleEdgeModel = graphModel.graphControl.graph.getVisibleEdges();
    var isSourcePresent = false;
    var isTargetPresent = false;

    _.forEach( visibleEdgeModel, function( edgeModel ) {
        var sourceObject = edgeModel.getSourceNode();
        var targetObject = edgeModel.getTargetNode();
        var relObject = edgeModel;

        if( sourceObject && targetObject && relObject && !_selectedObjects.includes( relObject ) ) {
            if( _selectedObjects.includes( sourceObject.modelObject ) ) {
                isSourcePresent = true;
            } else {
                isSourcePresent = isParentExists( groupGraph, sourceObject, _selectedObjects );
            }

            if( _selectedObjects.includes( targetObject.modelObject ) ) {
                isTargetPresent = true;
            } else {
                isTargetPresent = isParentExists( groupGraph, targetObject, _selectedObjects );
            }

            if( isSourcePresent && isTargetPresent ) {
                visibleConnections.push( relObject );
            }
        }
    } );
};

export let addAllVisibleElements = function( selectedNodesOfDiagram, groupGraph, _parentChildMap, _selectedObjects ) {
    var visibleElements = [];
    _.forEach( selectedNodesOfDiagram, function( selectedNode ) {
        var selectedNodeObject = selectedNode.modelObject;
        var children = [];
        _getVisibleChildren( selectedNode, groupGraph, children );

        _parentChildMap[ selectedNodeObject.uid ] = children;

        for( var idx = 0; idx < children.length; ++idx ) {
            visibleElements.push( children[ idx ] );
        }

    } );

    if( visibleElements.length > 0 ) {
        _.forEach( visibleElements, function( visibleElement ) {
            if( !_selectedObjects.includes( visibleElement ) ) {
                _selectedObjects.push( visibleElement );
            }

        } );
    }
};

export let addAllVisibleEndElementsOfTracelink = function( selectedTraceLink, groupGraph, _selectedElementsInPWA,
    _parentChildMap, _selectedObjects ) {
    _.forEach( selectedTraceLink, function( traceLink ) {
        var endElementsOfTraceLink = getVisibleEndNodesOfTraceLink( traceLink );

        _.forEach( endElementsOfTraceLink, function( element ) {

            var childdren = [];
            childdren.push( element );
            if( !_selectedObjects.includes( element.modelObject ) ) {
                _selectedObjects.push( element.modelObject );
                var parent;
                if( element.modelObject.uid === traceLink.getSourceNode().modelObject.uid ) {
                    parent = getTopSelectedNode( traceLink.getSourceNode(), _selectedElementsInPWA, groupGraph );
                } else {
                    parent = getTopSelectedNode( traceLink.getTargetNode(), _selectedElementsInPWA, groupGraph );
                }

                if( parent ) {
                    _parentChildMap[ parent ] = childdren;
                }
            }
        } );
    } );
};

export let addAllVisibleEndElementsOfConnection = function( selectedConnections, groupGraph, elements,
    _parentChildMap, _selectedObjects ) {
    var visibleElementsOfConnection = getAllVisibleElementsOfSelectedConnection( selectedConnections, groupGraph );

    _.forEach( visibleElementsOfConnection, function( visibleElement ) {
        if( !_selectedObjects.includes( visibleElement ) ) {
            _selectedObjects.push( visibleElement );
            elements.push( visibleElement );
        }
    } );

    _.forEach( selectedConnections, function( connection ) {
        var endNodesOfConnection = getVisibleEndNodesOfConnection( connection );

        _.forEach( endNodesOfConnection, function( node ) {
            if( !_parentChildMap.hasOwnProperty( node.modelObject.uid ) ) {
                var children = [];
                _getVisibleChildren( node, groupGraph, children );
                _parentChildMap[ node.modelObject.uid ] = children;
                if( !elements.includes( node.modelObject ) ) {
                    elements.push( node.modelObject );
                }
            }

        } );

    } );
};

export let getConnectionOfVisibleElements = function( _selectedObjects, elements, graphModel ) {
    if( elements.length > 0 ) {
        var visibleConnections = getConnections( elements, graphModel, _selectedObjects );

        _.forEach( visibleConnections, function( VisibleConnection ) {
            if( !_selectedObjects.includes( VisibleConnection ) ) {
                _selectedObjects.push( VisibleConnection );
            }
        } );
    }
};

function getConnections( elements, graphModel, _selectedObjects ) {
    var visibleConnections = [];
    var visibleEdgeModel = graphModel.graphControl.graph.getVisibleEdges();
    var isSourcePresent = false;
    var isTargetPresent = false;
    var groupGraph = graphModel.graphControl.groupGraph;

    _.forEach( visibleEdgeModel, function( edgeModel ) {
        var sourceObject = edgeModel.getSourceNode();
        var targetObject = edgeModel.getTargetNode();
        var relObject = edgeModel.modelObject;

        if( sourceObject && targetObject && relObject ) {
            if( elements.includes( sourceObject.modelObject ) ) {
                isSourcePresent = true;
            } else {
                isSourcePresent = isParentExists( groupGraph, sourceObject, _selectedObjects );
            }

            if( elements.includes( targetObject.modelObject ) ) {
                isTargetPresent = true;
            } else {
                isTargetPresent = isParentExists( groupGraph, targetObject, _selectedObjects );
            }

            if( isSourcePresent && isTargetPresent ) {
                visibleConnections.push( relObject );
            }
        }
    } );
    return visibleConnections;
}

/**
 * Get the opened object uid
 */
export let getOpenedObjectUid = function() {
    var occ = appCtxSvc.getCtx( "occmgmtContext" );
    if( !occ || !occ.openedElement ) {
        return "";
    }
    var openObj = occ.openedElement;
    return openObj.uid;
};

function getAllVisibleElementsOfSelectedConnection( selectedConnections, groupGraph ) {
    var children = [];
    _.forEach( selectedConnections, function( edgeModel ) {
        var isSourceVisible = edgeModel.getSourceNode().isVisible();
        var isTargetVisible = edgeModel.getTargetNode().isVisible();

        if( isSourceVisible && isTargetVisible ) {
            _getVisibleChildren( edgeModel.getSourceNode(), groupGraph, children );
            _getVisibleChildren( edgeModel.getTargetNode(), groupGraph, children );
        }

    } );

    return children;
}

function getVisibleEndNodesOfConnection( connection ) {
    var endElementsOfConnection = [];

    var isSourceVisible = connection.getSourceNode().isVisible();
    var isTargetVisible = connection.getTargetNode().isVisible();

    if( isSourceVisible && isTargetVisible ) {
        endElementsOfConnection.push( connection.getSourceNode() );
        endElementsOfConnection.push( connection.getTargetNode() );
    }

    return endElementsOfConnection;
}

function getVisibleEndNodesOfTraceLink( traceLink ) {
    var endElementsOfTraceLink = [];

    if( traceLink ) {
        endElementsOfTraceLink.push( traceLink.getSourceNode() );
        endElementsOfTraceLink.push( traceLink.getTargetNode() );
    }

    return endElementsOfTraceLink;
}

/**
 * Checks if parent is exists for selected node
 */
function isParentExists( groupGraph, node, _selectedObjects ) {

    var isParentAvaliable = false;
    var parent = groupGraph.getParent( node );
    if( parent ) {
        if( _selectedObjects.includes( parent.modelObject ) ) {
            isParentAvaliable = true;
        } else {
            isParentAvaliable = isParentExists( groupGraph, parent, _selectedObjects );
        }
    }
    return isParentAvaliable;
}

function getTopSelectedNode( element, selectedElements, groupGraph ) {
    var topSelectedNode = null;
    var parent = groupGraph.getParent( element );

    if( parent ) {
        if( selectedElements.includes( parent.modelObject ) ) {
            topSelectedNode = parent.modelObject;
        } else {
            topSelectedNode = getTopSelectedNode( parent, selectedElements, groupGraph );
        }
    }
    return topSelectedNode;
}

function getTopSelectedElementOfVisibleChild( child, _parentChildMap ) {
    var topNode = null;
    var childElement = cdm.getObject( child );
    _.forOwn( _parentChildMap, function( value, key ) {

        var children = value;
        var keyElement = cdm.getObject( key );
        if( childElement && children.includes( childElement ) ) {
            topNode = keyElement;
        }
    } );

    return topNode;
}

function getContextLine( elem ) {
    if( cmdMapSvc.isInstanceOf( 'Awb0Element', elem.modelType ) && elem.props.awb0Parent ) {
        var contextLine = elem;

        while( contextLine.props.awb0Parent && contextLine.props.awb0Parent.dbValues[ 0 ] !== null ) {
            contextLine = cdm.getObject( contextLine.props.awb0Parent.dbValues[ 0 ] );
        }
        return contextLine;
    }
    return null;
}

export let setSOAInput = function( elementsToAddIntoAR, _parentChildMap, isArchTabSelected ) {
    var selections = {};
    var selectedElements = {};
    selectedElements[ "selectedElements" ] = [];
    selections[ "selections" ] = selectedElements;
    appCtxSvc.registerCtx( "analysisRequestContext", selections );

    var arContext = appCtxSvc.getCtx( "analysisRequestContext" );
    arContext.isInArchTab = isArchTabSelected;
    appCtxSvc.updatePartialCtx( "analysisRequestContext", arContext );

    if( elementsToAddIntoAR && elementsToAddIntoAR.length > 0 ) {
        var diagramAction = isArchTabSelected ? "update" : "create";

        var elementInputs = [];
        _.forEach( elementsToAddIntoAR, function( elem ) {

            var productLine;

            var topNode = getTopSelectedElementOfVisibleChild( elem, _parentChildMap );
            if( topNode ) {
                productLine = getContextLine( topNode );
            } else {
                productLine = getContextLine( elem );
            }

            var elementInput = {};
            elementInput.end = elem;
            elementInput.endContext = productLine;
            elementInput.portToInterfaceDefsMap = [
                [],
                []
            ];
            elementInputs.push( elementInput );

        } );

        var addElementsToContextMapArray = elementInputs;

        selectedElements[ "selectedElements" ] = elementsToAddIntoAR;
        selections[ "selections" ] = selectedElements;
        appCtxSvc.updatePartialCtx( "analysisRequestContext", selections );

        var addElementsToARSoaInputMap = {
            "diagramAction": diagramAction,
            "traceLinkType": "Crt0ValidationLink",
            "addElementsToContextMap": addElementsToContextMapArray
        };

        var analysisRequestContext = appCtxSvc.getCtx( "analysisRequestContext" );
        analysisRequestContext.addElementsToARSoaInput = addElementsToARSoaInputMap;

        appCtxSvc.updatePartialCtx( "analysisRequestContext", analysisRequestContext );
    }
};

/**
 * Returns the createAnalysisRequestFromDigramUtils instance
 *
 * @member createAnalysisRequestFromDigramUtils
 */

export default exports = {
    addAllVisibleConnection,
    addAllVisibleElements,
    addAllVisibleEndElementsOfTracelink,
    addAllVisibleEndElementsOfConnection,
    getConnectionOfVisibleElements,
    getOpenedObjectUid,
    setSOAInput
};
app.factory( 'createAnalysisRequestFromDigramUtils', () => exports );
