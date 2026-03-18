// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0ArchitectureGraphService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import archGraphLegendManager from 'js/Ase0ArchitectureGraphLegendManager';
import architectureLayoutService from 'js/Ase0ArchitectureLayoutService';
import nodeService from 'js/Ase0ArchitectureNodeService';
import portService from 'js/Ase0ArchitecturePortService';
import edgeService from 'js/Ase0ArchitectureEdgeService';
import archDataCache from 'js/Ase0ArchitectureDataCache';
import archUtilService from 'js/Ase0ArchitectureUtilService';
import labelService from 'js/Ase0ArchitectureLabelService';
import annotationService from 'js/Ase0AnnotationService';
import autoLayoutHandler from 'js/Ase0ArchitectureAutoLayoutHandler';
import dmSvc from 'soa/dataManagementService';
import nodeCommandService from 'js/Ase0ArchitectureNodeCommandService';
import notyService from 'js/NotyModule';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphLegendSvc from 'js/graphLegendService';
import graphViewModeService from 'js/graphViewModeService';
import graphUtils from 'js/graphUtils';
import logger from 'js/logger';

var exports = {};

/*
 * method to fire event based on event details in queue after manageDiagram2 SOA completion.
 */
export let handleManageDiagram2Complete = function( manageDiagramQueue, graphData ) {
    var completeEventsFromQueue = null;
    if( !graphData ) {
        return;
    }
    _.forEach( manageDiagramQueue, function( manageDiagramCompleteEventDetails, eventDetailsIdx ) {
        _.forEach( manageDiagramCompleteEventDetails.clientIds, function( clientId ) {
            var graphDataClientId = null;
            if( graphData.output && graphData.output.length > 0 &&
                graphData.output[ 0 ].clientId ) {
                graphDataClientId = graphData.output[ 0 ].clientId;
            } else if( graphData.ServiceData && graphData.ServiceData.partialErrors &&
                graphData.ServiceData.partialErrors.length > 0 && graphData.ServiceData.partialErrors[ 0 ].clientId ) {
                graphDataClientId = graphData.ServiceData.partialErrors[ 0 ].clientId;
            }
            if( graphDataClientId && graphDataClientId === clientId ) {
                completeEventsFromQueue = manageDiagramCompleteEventDetails.eventsToFire;
                _.pullAt( manageDiagramQueue, eventDetailsIdx );
                return false;
            }
        } );
        if( completeEventsFromQueue ) {
            return false;
        }
    } );

    if( completeEventsFromQueue ) {
        _.forEach( completeEventsFromQueue, function( manageDiagramCompleteEvent ) {
            var clonedGraphData = _.clone( graphData );
            _.set( manageDiagramCompleteEvent, 'eventData.graphData', clonedGraphData );
            eventBus.publish( manageDiagramCompleteEvent.eventName, manageDiagramCompleteEvent.eventData );
        } );
        if( graphData.output && graphData.output.length > 0 && graphData.output[ 0 ].diagramInfo &&
            graphData.output[ 0 ].diagramInfo.associateIDNotification &&
            graphData.output[ 0 ].diagramInfo.associateIDNotification.length > 0 ) {
            notyService.showInfo( graphData.output[ 0 ].diagramInfo.associateIDNotification[ 0 ] );
        }
    }
};

/*
 * method to set label filter categories
 */
var setLabelFilters = function( labelFilters ) {
    var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
    if( activeCtx === 'architectureCtx' ) {
        var architectureCtx = appCtxSvc.getCtx( 'architectureCtx' );

        if( architectureCtx && architectureCtx.diagram && architectureCtx.diagram.labelCategories && architectureCtx.diagram.labelCategories.length > 0 ) {
            var labelCategories = architectureCtx.diagram.labelCategories;

            _.forEach( labelFilters, function( labelFilter ) {
                var labelCategory = _.find( labelCategories, {
                    internalName: labelFilter
                } );

                if( labelCategory ) {
                    labelCategory.categoryState = true;
                    architectureCtx.showLabels = false;
                }
            } );
        }
    }
};

/*
 * method to set view mode in graph and context
 */
var setViewMode = function( diagramInfo, graph ) {
    var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
    if( activeCtx === 'architectureCtx' ) {
        if( diagramInfo.viewMode && diagramInfo.viewMode.length > 0 ) {
            if( appCtxSvc.ctx.architectureCtx.viewMode ) {
                if( appCtxSvc.ctx.architectureCtx.viewMode !== 'Ase0NetworkView' ) {
                    graph.setNetworkMode( false );
                } else {
                    graph.setNetworkMode( true );
                }
            } else {
                graph.setNetworkMode( diagramInfo.viewMode[ 0 ] === 'NetworkView' );
                if( graph.isNetworkMode() ) {
                    appCtxSvc.updatePartialCtx( 'architectureCtx.viewMode', 'Ase0NetworkView' );
                } else {
                    appCtxSvc.updatePartialCtx( 'architectureCtx.viewMode', 'Ase0NestedView' );
                }
            }
        } else {
            appCtxSvc.updatePartialCtx( 'architectureCtx.viewMode', 'Ase0NestedView' );
        }
    }
};

/*
 * method to set license state in context also
 * disable start authoring and graph items positioning if license not present
 */
var processLicenseState = function( hasSystemModelerLicense, graphModel ) {
    var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
    if( activeCtx === 'architectureCtx' ) {
        var architectureCtx = appCtxSvc.getCtx( 'architectureCtx' );

        if( architectureCtx ) {
            architectureCtx.hasSystemModelerLicense = hasSystemModelerLicense;
            appCtxSvc.updateCtx( 'architectureCtx', architectureCtx );
        } else {
            architectureCtx = {
                hasSystemModelerLicense: hasSystemModelerLicense
            };
            appCtxSvc.registerCtx( 'architectureCtx', architectureCtx );
        }

        if( !hasSystemModelerLicense ) {
            // Disable start authoring
            graphModel.config.enableEdit = false;
            // Disable graph items positioning
            graphModel.config.movableItems = [];
        }
    }
};

/*
 * method to process diagramInfo from manageDiagram2 SOA response and update graph
 */
var processDiagramInfo = function( diagramInfo, graphModel, legendState, data, isOpenDiagram ) {
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    //clear old filters and add recalled filter into legendState
    if( isOpenDiagram ) {
        graphLegendSvc.clearFilter( graphModel, legendState );
        graphLegendSvc.clearLegend( graphModel, legendState, appCtxSvc.ctx.graph.legendData.legendViews );
        legendState.activeView.expand = true;
        legendState.activeView.showEnabled = true;
    }

    if( diagramInfo.hasSystemModelerLicense && diagramInfo.hasSystemModelerLicense.length > 0 ) {
        var hasSystemModelerLicense = diagramInfo.hasSystemModelerLicense[ 0 ] === 'true';
        processLicenseState( hasSystemModelerLicense, graphModel );
    }

    if( diagramInfo.nodeOpacityPropertyName && diagramInfo.nodeOpacityPropertyName.length > 0 ) {
        data.nodeOpacityPropName = diagramInfo.nodeOpacityPropertyName[ 0 ];
    }

    if( diagramInfo.autoLayoutState && diagramInfo.autoLayoutState.length > 0 ) {
        var autoLayoutState = diagramInfo.autoLayoutState[ 0 ] === 'true';
        appCtxSvc.updatePartialCtx( 'architectureCtx.diagram.isAutoLayoutOn', autoLayoutState );
        if( diagramInfo.autoLayoutState[ 0 ] === 'false' ) {
            autoLayoutHandler.disableAutoLayout();
        }
    }

    if( diagramInfo.layout && diagramInfo.layout.length > 0 ) {
        graphModel.config.layout.defaultOption = architectureLayoutService.LayoutDirections[ diagramInfo.layout[ 0 ] ];
    }

    if( diagramInfo.zoomLevel && diagramInfo.zoomLevel.length > 0 ) {
        graphControl.setZoom( Number( diagramInfo.zoomLevel[ 0 ] ) );
    }

    if( diagramInfo.viewPoint && diagramInfo.viewPoint.length > 0 ) {
        var positions = diagramInfo.viewPoint[ 0 ].split( ':' );

        if( positions.length === 2 ) {
            var viewPoint = _.clone( graphControl.getViewPoint() );

            viewPoint.x = Number( positions[ 0 ] );
            viewPoint.y = Number( positions[ 1 ] );
            graphControl.setViewPoint( viewPoint );
        }
    }

    setViewMode( diagramInfo, graph );

    if( diagramInfo.objectFilters && diagramInfo.objectFilters.length > 0 ) {
        archGraphLegendManager.setCategoryFilters( 'objects', diagramInfo.objectFilters, legendState.activeView );
    }

    if( diagramInfo.relationFilters && diagramInfo.relationFilters.length > 0 ) {
        archGraphLegendManager.setCategoryFilters( 'relations', diagramInfo.relationFilters, legendState.activeView );
    }

    if( diagramInfo.portFilters && diagramInfo.portFilters.length > 0 ) {
        archGraphLegendManager.setCategoryFilters( 'ports', diagramInfo.portFilters, legendState.activeView );
    }
    appCtxSvc.ctx.architectureCtx.showLabels = true;
    if( diagramInfo.labelFilters && diagramInfo.labelFilters.length > 0 ) {
        setLabelFilters( diagramInfo.labelFilters );
    }

    // Process Annotations
    annotationService.processAnnotationData( legendState.activeView, graphModel, diagramInfo );

    if( isOpenDiagram ) {
        graphLegendSvc.registerFilter( graphModel, legendState );
    }
    setGridOptions( graphModel, diagramInfo.gridOptions );
};

var setGridOptions = function( graphModel, gridOptions ) {
    var graph = graphModel.graphControl.graph;
    var preferences = graphModel.graphControl.grid.preferences;
    if( gridOptions ) {
        graph.update( function() {
            preferences.enabled = true;
            //when grid is on it makes minor and major line on by default, so making it off initially
            preferences.showMajorLines = false;
            preferences.showMinorLines = false;
            if( _.includes( gridOptions, 'Ase0MajorLines' ) ) {
                preferences.showMajorLines = true;
            }
            if( _.includes( gridOptions, 'Ase0MinorLines' ) ) {
                preferences.showMinorLines = true;
            }
            if( _.includes( gridOptions, 'Ase0SnapToGrid' ) ) {
                preferences.enableSnapping = true;
            }
        } );
    }

    // Don't update the architectureCtx values from the floating graph
    if( !graphModel.config.aName ) {
        var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
        if( activeCtx ) {
            var currentCtx = appCtxSvc.getCtx( activeCtx );
            if( currentCtx ) {
                if( currentCtx.diagram ) {
                    currentCtx.diagram.gridOptions = preferences.enabled;
                    currentCtx.diagram.Ase0MajorLines = preferences.showMajorLines;
                    currentCtx.diagram.Ase0MinorLines = preferences.showMinorLines;
                    currentCtx.diagram.Ase0SnapToGrid = preferences.enableSnapping;
                } else {
                    currentCtx.diagram = {
                        gridOptions: preferences.enabled,
                        Ase0MajorLines: preferences.showMajorLines,
                        Ase0MinorLines: preferences.showMinorLines,
                        Ase0SnapToGrid: preferences.enableSnapping
                    };
                }
            } else {
                var jso = {
                    diagram: {
                        gridOptions: preferences.enabled,
                        Ase0MajorLines: preferences.showMajorLines,
                        Ase0MinorLines: preferences.showMinorLines,
                        Ase0SnapToGrid: preferences.enableSnapping
                    }
                };
                appCtxSvc.registerCtx( activeCtx, jso );
            }
        }
    }
};

var getChildNodes = function( graphModel, node ) {
    var childNodes = [];
    var children = nodeService.getVisibleChildNodes( node, graphModel );
    if( children && children.length > 0 ) {
        childNodes = childNodes.concat( children );
        _.forEach( children, function( child ) {
            var children1 = nodeService.getVisibleChildNodes( child, graphModel );
            if( children1 && children1.length > 0 ) {
                childNodes = childNodes.concat( children1 );
            }
        } );
    }
    return childNodes;
};

var getAffectedNodeList = function( addedEdges, addedNodes, graphModel ) {
    var affectedNodeList = [];
    var groupedGraph = graphModel.graphControl.groupGraph;
    if( addedNodes && addedNodes.length > 0 ) {
        affectedNodeList = affectedNodeList.concat( addedNodes );
        _.forEach( addedNodes, function( node ) {
            var parentNode = groupedGraph.getParent( node );
            if( parentNode && parentNode.isVisible() ) {
                affectedNodeList.push( parentNode );
            }
            var childNodes = getChildNodes( graphModel, node );
            if( childNodes && childNodes.length > 0 ) {
                affectedNodeList = affectedNodeList.concat( childNodes );
            }
        } );
    }

    if( addedEdges && addedEdges.length > 0 ) {
        _.forEach( addedEdges, function( edge ) {
            if( edge.modelObject ) {
                var isConnection = cmm.isInstanceOf( 'Awb0Connection', edge.modelObject.modelType );
                if( isConnection ) {
                    var parentNode = groupedGraph.getParent( edge );
                    if( parentNode && parentNode.isVisible() ) {
                        //affectedNodeList.push( parentNode );
                    }
                }
            }

            var srcNode = edge.getSourceNode();
            if( srcNode && srcNode.isVisible() ) {
                affectedNodeList.push( srcNode );
            }
            var tarNode = edge.getTargetNode();
            if( tarNode && tarNode.isVisible() ) {
                affectedNodeList.push( tarNode );
            }
        } );
    }

    if( affectedNodeList && affectedNodeList.length > 0 ) {
        affectedNodeList = _.uniq( affectedNodeList );
    }
    return affectedNodeList;
};

var _drawGraph = function( graphData, data, isOpenDiagram ) {
    var activeLegendView = null;
    var legendState = null;

    var graphModel = data.graphModel;
    var graphContext = appCtxSvc.getCtx( 'graph' );
    var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
    if( activeCtx === 'architectureCtx' ) {
        var architectureCtx = appCtxSvc.getCtx( 'architectureCtx' );
        if( !architectureCtx.archPageData ) {
            architectureCtx.archPageData = data.archPageData;
        }
    }
    if( graphContext && graphContext.legendState ) {
        activeLegendView = graphContext.legendState.activeView;
        legendState = graphContext.legendState;
    }

    if( graphData && graphData.output && graphData.output.length > 0 ) {
        if( graphData.output[ 0 ].diagramInfo && legendState ) {
            processDiagramInfo( graphData.output[ 0 ].diagramInfo, graphModel, legendState, data, isOpenDiagram );
        }

        if( !graphModel.rootNodeList ) {
            graphModel.rootNodeList = [];
        }
        _.forEach( graphData.output, function( ouput ) {
            _.forEach( ouput.nodeData, function( nodeInformation ) {
                var nodeInfo = nodeInformation.nodeInfo;
                var isAnchor = false;
                if( nodeInfo.isAnchor[ 0 ] === '1' ) {
                    isAnchor = true;
                }
                if( isAnchor ) {
                    if( data.graphModel.rootNodeList.indexOf( nodeInformation.node.uid ) < 0 ) {
                        data.graphModel.rootNodeList.push( nodeInformation.node.uid );
                    }
                }
            } );
        } );
    }

    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
    }
    if( !graphModel.portMap ) {
        graphModel.portMap = {};
    }
    if( !graphModel.edgeMap ) {
        graphModel.edgeMap = {};
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    architectureLayoutService.clearGraphItemLists();

    if( graphData && graphData.output && graphData.output.length > 0 ) {
        archDataCache.setDiagramInfo( graphData.output );
    }
    var returnData = nodeService.processNodeData( activeLegendView, graphModel, graphData, data, isOpenDiagram );
    var addedNodes = returnData.addedNodes;
    var isKeepPosition = returnData.isKeepPosition;

    returnData = portService.processPortData( activeLegendView, graphModel, graphData, isOpenDiagram );

    var addedPorts = returnData.addedPorts;

    isKeepPosition = isKeepPosition && returnData.isKeepPosition;
    returnData = edgeService.processEdgeData( activeLegendView, graphModel, graphData, data.archPageData.edges, isOpenDiagram );
    isKeepPosition = isKeepPosition && returnData.isKeepPosition;

    var addedEdges = returnData.addedEdges;

    handleCollapsedNodes( graphModel, graphData, isOpenDiagram, addedNodes );

    if( !graphModel.categoryApi ) {
        archGraphLegendManager.initGraphCategoryApi( graphModel );
    }

    //apply graph filters and notify item added event
    graph.updateOnItemsAdded( [].concat( addedNodes, addedEdges, addedPorts ) );

    //update the edge style as per filtered data
    edgeService.updateEdgeStyle();

    if( addedNodes.length > 0 || addedEdges.length > 0 ) {
        var affectedNodeList = getAffectedNodeList( addedEdges, addedNodes, graphModel );
        if( affectedNodeList.length > 0 ) {
            nodeCommandService.updateGraphInfoOnNodes( affectedNodeList, graphModel, data );
        }
    }

    var itemsRemoved = [];
    var itemsAdded = [];
    if( addedNodes.length > 0 ) {
        itemsAdded.push.apply( itemsAdded, addedNodes );
    }
    if( addedPorts.length > 0 ) {
        itemsAdded.push.apply( itemsAdded, addedPorts );
    }
    if( addedEdges.length > 0 ) {
        itemsAdded.push.apply( itemsAdded, addedEdges );
    }

    // fire AMGraph.modelChanged Event
    eventBus.publish( 'AMGraph.modelChanged', {
        itemsAdded: itemsAdded,
        itemsRemoved: itemsRemoved
    } );

    return isKeepPosition;
};

/*
 * method to process manageDiagram2 SOA response and draw graph items(nodes, edges, ports, annotations) in graph
 */
export let drawGraph = function( graphData, data, isOpenDiagram, isApplyGlobalLayout ) {
    var graphModel = data.graphModel;
    var graphControl = graphModel.graphControl;
    data.isRecall = isOpenDiagram;

    var isKeepPosition = false;
    if( data.isInitialGraph || data.isRecall ) {
        //suppress graph change for performance
        graphControl.suppressGraphChanged( function() {
            isKeepPosition = _drawGraph( graphData, data, isOpenDiagram );
        } );
    } else {
        isKeepPosition = _drawGraph( graphData, data, isOpenDiagram );
    }

    applyGraphLayout( data, isKeepPosition, isOpenDiagram, isApplyGlobalLayout );

    if ( isOpenDiagram )
    {
        var architectureCtx = appCtxSvc.getCtx('architectureCtx');
        // set isModelChangeDueToOpenDiagram flag
        architectureCtx.isModelChangeDueToOpenDiagram = isOpenDiagram;
        appCtxSvc.updateCtx('architectureCtx', architectureCtx);
    }
    eventBus.publish( 'occMgmt.visibilityStateChanged' );
};

var applyGraphLayout = function( data, isKeepPosition, isOpenDiagram, isApplyGlobalLayout ) {
    if( data && data.graphModel ) {
        architectureLayoutService.applyGraphLayout( data.graphModel, isKeepPosition, isOpenDiagram, isApplyGlobalLayout );
        var graphControl = data.graphModel.graphControl;

        if( isApplyGlobalLayout ) {
            data.archGraphModel.isGraphFitted = true;
        } else if( !isKeepPosition && !data.archGraphModel.isGraphFitted ) {
            graphControl.fitGraph();
            data.archGraphModel.isGraphFitted = true;
        }
    }
};

/*
 * method to set group nodes in graph to collapsed based isExpand flag from manageDiagram2 SOA response
 */
var handleCollapsedNodes = function( graphModel, graphData, isOpenDiagram, addedNodes ) {
    var graphControl = graphModel.graphControl;
    var groupGraph = graphControl.groupGraph;

    if( graphData && graphData.output ) {
        _.forEach( graphData.output, function( output ) {
            _.forEach( output.nodeData, function( nodeInformation ) {
                var node = graphModel.nodeMap[ nodeInformation.node.uid ];
                if( node && groupGraph.isGroup( node ) && _.indexOf( addedNodes, node ) !== -1 ) {
                    if( nodeInformation.nodeInfo.isExpand.length > 0 && nodeInformation.nodeInfo.isExpand[ 0 ] === '0' ) {
                        if( !isOpenDiagram ) {
                            groupGraph.setExpanded( node, false );
                            architectureLayoutService.removeGroupNodeToExpand( node );
                        }
                        else {
                            node.setExpanded( false );
                        }
                    } else if( !groupGraph.isExpanded( node ) ) {
                        groupGraph.setExpanded( node, true );
                        if( !isOpenDiagram ) {
                            architectureLayoutService.addGroupNodeToExpand( node );
                        }
                    }
                }
            } );
        } );
    }
};

export let updateModelOnObjectChanged = function( modifiedObjects, graphModel, data ) {
    var node = null;
    var edge = null;
    var port = null;

    var nodeToUpdate = [];
    var edgeToUpdate = [];
    var portToUpdate = [];

    if( modifiedObjects && modifiedObjects.length > 0 && graphModel ) {
        _.forEach( modifiedObjects, function( modelObject ) {
            if( graphModel.nodeMap ) {
                node = graphModel.nodeMap[ modelObject.uid ];
                if( node ) {
                    nodeToUpdate.push( node );
                    return true;
                }
            }
            if( graphModel.edgeMap ) {
                var isConnection = false;
                isConnection = cmm.isInstanceOf( 'Awb0Connection', modelObject.modelType );
                if( !isConnection ) {
                    var keys = Object.keys( graphModel.edgeMap );
                    _.forEach( keys, function( key ) {
                        if( key.indexOf( modelObject.uid ) !== -1 ) {
                            var edgeObj = graphModel.edgeMap[ key ];
                            if( edgeObj ) {
                                edgeToUpdate.push( edgeObj );
                            }
                        }
                    } );
                    if( edgeToUpdate.length > 0 ) {
                        return true;
                    }
                } else {
                    edge = graphModel.edgeMap[ modelObject.uid ];
                    if( edge ) {
                        edgeToUpdate.push( edge );
                        return true;
                    }
                }
            }
            if( graphModel.portMap ) {
                port = graphModel.portMap[ modelObject.uid ];
                if( port ) {
                    portToUpdate.push( port );
                }
            }
        } );

        if( nodeToUpdate.length > 0 ) {
            nodeService.updateNodeProperties( nodeToUpdate, graphModel, data );
        }
        if( edgeToUpdate.length > 0 ) {
            labelService.updateEdgeLabel( edgeToUpdate, graphModel );
        }
        if( portToUpdate.length > 0 ) {
            labelService.updatePortLabel( portToUpdate, graphModel );
            portService.updatePortDirection( portToUpdate, graphModel );
        }
    }
};

// Invoke modelChanged when new nodes, edges, ports are drawn
export let modelChanged = function( itemsAdded, itemsRemoved ) {
    var isPortAddedOrRemoved = false;
    if( itemsAdded ) {
        isPortAddedOrRemoved = isAnyPortPresent( itemsAdded );
    }

    if( itemsRemoved ) {
        if( !isPortAddedOrRemoved ) {
            isPortAddedOrRemoved = isAnyPortPresent( itemsRemoved );
        }
    }

    if( isPortAddedOrRemoved ) {
        portService.evaluateShowPortsCondition();
    }
};

// Check if items contains any Port
var isAnyPortPresent = function( items ) {
    var isAnyPort = false;
    _.forEach( items, function( item ) {
        // Check if Item is of type Port
        var graphItemType = item.getItemType();
        if( graphItemType ) {
            if( graphItemType === 'Port' ) {
                isAnyPort = true;
                return false;
            }
        }
    } );

    return isAnyPort;
};

//Toggle from network view to nested view and vice versa
export let changeDiagramView = function( data, graphModel ) {
    if( graphModel ) {
        var activeCtx = appCtxSvc.getCtx( 'activeArchDgmCtx' );
        if( activeCtx === 'architectureCtx' ) {
            if( appCtxSvc.ctx.architectureCtx.viewMode && appCtxSvc.ctx.architectureCtx.viewMode === 'Ase0NetworkView' || appCtxSvc.ctx.architectureCtx.viewMode === 'Ase0NestedView' ) {
                //means user is switching to network or nested view
                var graphControl = graphModel.graphControl;
                var graph = graphControl.graph;
                var isNetworkMode = graph.isNetworkMode();
                var layout = graphControl.layout;
                var wasActive = false;
                if( layout && layout.isActive() ) {
                    wasActive = true;
                    layout.deactivate();
                }
                graphControl.suppressGraphChanged( function() {
                    if( isNetworkMode ) {
                        //convert to nested view
                        graphViewModeService.convertToNestedMode( graphModel );
                    } else {
                        //Convert it to network view
                        var groupRelationCategoryName = 'Structure';
                        graphViewModeService.convertToNetworkMode( graphModel, function( source, target ) {
                            var addedEdgeData = [];
                            var edgeData = {};
                            edgeData.end1Element = source.modelObject;
                            edgeData.end2Element = target.modelObject;
                            var edgeTypes = [ '' ];
                            edgeData.edgeInfo = { edgeType: edgeTypes };

                            edgeData.relationType = groupRelationCategoryName;
                            addedEdgeData.push( edgeData );
                            var outputData = [];
                            var edeInfo = {
                                edgeData: addedEdgeData
                            };
                            outputData.push( edeInfo );
                            var graphData = {
                                output: outputData
                            };
                            var activeLegendView = null;
                            if( appCtxSvc.ctx.graph.legendState ) {
                                activeLegendView = appCtxSvc.ctx.graph.legendState.activeView;
                            }

                            var returnData = edgeService.processEdgeData( activeLegendView, graphModel, graphData, addedEdgeData, false );
                            return returnData.structureEdges[ 0 ];
                        } );
                    }
                } );
                if( layout ) {
                    layout.applyLayout();

                    if( wasActive ) {
                        layout.activate();
                    }
                }
                graphControl.fitGraph();
            } else {
                var nodesArray = [];
                var edgesArray = [];
                if( graphModel.nodeMap && Object.keys( graphModel.nodeMap ).length > 0 ) {
                    _.forEach( graphModel.nodeMap, function( nodeItem ) {
                        nodesArray.push( nodeItem.modelObject );
                    } );
                }
                if( graphModel.edgeMap && Object.keys( graphModel.edgeMap ).length > 0 ) {
                    _.forEach( graphModel.edgeMap, function( edgeItem ) {
                        edgesArray.push( edgeItem.modelObject );
                    } );
                }
                var architectureCtx = appCtxSvc.getCtx( 'architectureCtx' );
                if( architectureCtx.archPageData ) {
                    architectureCtx.archPageData.nodes = nodesArray;
                    architectureCtx.archPageData.edges = edgesArray;
                }
            }
        }
    }
};

//Show the context menu on port
export let showContextMenuOnPort = function( graphModel, item ) {
    if( !graphModel || !item ) {
        return;
    }
    if( item.getItemType() === 'Port' ) {
        if( item.getConnections().length === 0 ) {
            dmSvc.getProperties( [ item.modelObject.uid ], [ 'is_modifiable' ] ).then( function() {
                graphUtils.showPopupMenu( graphModel, 'Ase0PortDirectionGroupCmd', item );
            } );
        }
    }
};

export let buildInputForLoadEditing = function( eventData ) {
    var inputs = [];
    var properties = [];

    properties.push( eventData.property );
    var input = {
        obj: eventData.modelObject,
        propertyNames: properties,
        isPessimisticLock: false
    };
    inputs.push( input );
    return inputs;
};

export let buildInputForSaveEditing = function( eventData ) {
    var inputs = [];
    var modifiedProperties = [];

    var propertyValues = [];
    propertyValues.push( eventData.propertyValue );
    var prop = {
        name: eventData.propertyName,
        values: propertyValues
    };
    modifiedProperties.push( prop );
    var input = {
        object: eventData.modelObject,
        objLsds: eventData.lsdData,
        propertyNameValues: modifiedProperties,
        isPessimisticLock: false
    };
    inputs.push( input );
    return inputs;
};

/**
 * update the port direction
 *
 * @param {object} modelObject model object to be updated
 * @param {string} property property name of object to be updated
 * @param {string} updatePropertyValue property value of object to be updated
 */
export let updatePortDirection = function( modelObject, property, updatePropertyValue ) {
    dmSvc.setProperties( [ {
        object: modelObject,
        vecNameVal: [ {
            name: property,
            values: [ updatePropertyValue ]
        } ]
    } ] ).then( function( response ) {
        if( response && response.ServiceData && response.ServiceData.updated && response.ServiceData.updated.length === 0 ) {
            logger.error( 'error occured while updating port direction' );
        }
    } );
};

export let handleFilterStatusChangedAction = function( categoryType ) {
    var doUpdateAceVisibilityState = false;
    if( categoryType ) {
        if( categoryType.data === 'objects' || categoryType.data === 'relations' ) {
            doUpdateAceVisibilityState = true;
        }
    }
    return doUpdateAceVisibilityState;
};

export let resetRecallState = function( data ) {
    data.isRecall = false;
};

/**
 * reset creation category in legend state
 *
 * @param {Object} graphModel graph model
 */
export let resetCreationCategoryLegendState = function( graphModel, data ) {
    if( data.getPanelId() !== 'graphLegend' && graphModel && graphModel.config && graphModel.config.inputMode && graphModel.config.inputMode !== 'viewInputMode' ) {
        graphModel.config.inputMode = 'editInputMode';
    }
};

/**
 * refresh the owning node
 *
 * @param {Object} data view model
 */
export let refreshOwningNode = function( data ) {
    // the updated object's uid
    var updatedObject = _.get( data, 'dataSource.vmo', null );

    if( updatedObject !== null ) {
        var portMap = _.get( appCtxSvc, 'graph.graphModel.portMap', null );
        var elementsToUpdate = [];

        elementsToUpdate.push( updatedObject );
        if( portMap !== null ) {
            var curPort = portMap[ updatedObject.uid ];
            var curPortOwner = curPort.getOwner();

            if( curPortOwner ) {
                elementsToUpdate.push( curPortOwner.modelObject );
            }
        }

        // make a manageDiagram2 call
        var eventDataRefresh = {
            userAction: 'UpdateDiagram',
            elementsToUpdate: elementsToUpdate,
            diagramElements: [],
            eventName: 'AMUpdateDiagramEvent'
        };

        eventBus.publish( 'AMManageDiagramEvent', eventDataRefresh );
    }
};

/**
 * updates the given diagram elements
 *
 * @param {Object} data view model
 */
export let updateDiagramElements = function( data ) {
    var ctx = appCtxSvc.ctx;
    var graph = ctx.graph;
    var graphModel = ctx.graph.graphModel;
    if( graph && graph.legendState ) {
        var activeLegendView = graph.legendState.activeView;
    }
    var eventData = data.eventData;
    var nodeDataToUpdate = eventData.graphData.output[ 0 ].nodeData;
    var nodesToUpdate = [];
    _.forEach( nodeDataToUpdate, function( nodeData ) {
        var uid = nodeData.node.uid;
        var curNode = graphModel.nodeMap[ uid ];
        if( curNode ) {
            nodesToUpdate.push( curNode );
        }
        nodeService.updateNodeDegreesFromNodeInformation( curNode, nodeData, activeLegendView );
    } );

    var portsToUpdate = [];
    _.forEach( eventData.graphData.output[ 0 ].portData, function( portData ) {
        var uid = portData.port.uid;
        var curPort = graphModel.portMap[ uid ];
        if( curPort ) {
            portsToUpdate.push( curPort );
        }
    } );
    if( portsToUpdate.length > 0 ) {
        labelService.updatePortLabel( portsToUpdate, graphModel );
        portService.updatePortDirection( portsToUpdate, graphModel );
    }
    nodeService.updateNodeProperties( nodesToUpdate, graphModel, data );
    nodeCommandService.updateGraphInfoOnNodes( nodesToUpdate, graphModel, data );
};

/**
 * updates the given diagram elements and then adds new elements
 *
 * @param {Object} data view model
 */
export let updateDiagramElementsAndTriggerAddDiagram = function( data ) {
    exports.updateDiagramElements( data );
    var eventData = data.eventData;

    var eventData = {
        elementsToAdd: data.eventData.elementsToAdd
    };

    eventBus.publish( 'DepAddObjectsToDiagramEvent', eventData );
};

export default exports = {
    handleManageDiagram2Complete,
    drawGraph,
    updateModelOnObjectChanged,
    modelChanged,
    changeDiagramView,
    showContextMenuOnPort,
    buildInputForLoadEditing,
    buildInputForSaveEditing,
    updatePortDirection,
    handleFilterStatusChangedAction,
    resetRecallState,
    resetCreationCategoryLegendState,
    refreshOwningNode,
    updateDiagramElements,
    updateDiagramElementsAndTriggerAddDiagram
};
app.factory( 'Ase0ArchitectureGraphService', () => exports );
