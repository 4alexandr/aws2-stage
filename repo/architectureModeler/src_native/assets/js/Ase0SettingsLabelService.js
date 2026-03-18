//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * This file populates data related to label setting panel
 *
 * @module js/Ase0SettingsLabelService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import modelPropertySvc from 'js/modelPropertyService';
import _ from 'lodash';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

/*
 * Populate panel data @param {data} data - The qualified data of the viewModel
 */
export let populatePanelData = function( data ) {
    var architectureCtx = appCtxService.getCtx( 'architectureCtx' );
    var labelCategories = architectureCtx.diagram.labelCategories;
    _.forEach( labelCategories, function( category ) {
        var labelCategory = {
            displayName: category.categoryName,
            type: 'BOOLEAN',
            isRequired: 'false',
            isEditable: 'true',
            dispValue: category.internalName,
            labelPosition: 'PROPERTY_LABEL_AT_RIGHT',
            dbValue: category.categoryState
        };
        //Properties not getting loaded when using aw-repeat for checkbox so need to load it explicitly
        var prop = modelPropertySvc.createViewModelProperty( labelCategory );
        data.labelCategories.push( prop );
    } );
};
/*
 * Apply label setting data @param {data} data - The qualified data of the viewModel
 */
export let applyLabelSetting = function( data ) {
    var showHideCmdState = true;
    var panelCategories = data.labelCategories;
    var newLabelCategories = [];
    //Take panel data and apply it
    _.forEach( panelCategories, function( category ) {
        var updatedCat = {
            categoryName: category.propertyName,
            internalName: category.uiValues[ 0 ],
            categoryState: category.dbValue
        };
        newLabelCategories.push( updatedCat );
    } );
    var architectureCtx = appCtxService.getCtx( 'architectureCtx' );
    var graph = appCtxService.ctx.graph.graphModel.graphControl.graph;
    var edges = graph.getVisibleEdges();
    var ports = graph.getVisiblePorts();
    showHideCmdState = updateLabelVisibility( newLabelCategories, edges.concat( ports ) );
    if( data.resetLabelPositions.dbValue ) {
        resetAllLabelPosition( graph );
    }
    architectureCtx.diagram.labelCategories = newLabelCategories;
    appCtxService.ctx.architectureCtx.showLabels = showHideCmdState;
};
var updateLabelVisibility = function( labelCategories, graphItems ) {
    var showHideCmdState = true;
    var labels = [];
    var graph = appCtxService.ctx.graph.graphModel.graphControl.graph;
    _.forEach( graphItems, function( graphItem ) {
        var itemCategory = graphItem.category;
        var label = graphItem.getLabel();
        if( itemCategory ) {
            var state = _.find( labelCategories, { internalName: itemCategory } );
            if( state && state.categoryState ) {
                showHideCmdState = false;
                if( !label ) {
                    label = createGraphItemLabel( graphItem, graph );
                }
            }
            if( label ) {
                var labelState = {
                    label: label,
                    state: state
                };
                labels.push( labelState );
            }
        }
    } );
    graph.update( function() {
        _.forEach( labels, function( labelItem ) {
            labelItem.label.setVisible( labelItem.state.categoryState );
        } );
    } );
    return showHideCmdState;
};
var createGraphItemLabel = function( graphItem, graph ) {
    var modelObject = graphItem.modelObject;
    var labelText = null;
    if( cmm.isInstanceOf( 'Awb0Connection', modelObject.modelType ) && modelObject.props.object_string ) {
        labelText = modelObject.props.object_string.uiValues[ 0 ];
    } else if( cmm.isInstanceOf( 'FND_TraceLink', modelObject.modelType ) && modelObject.props.name ) {
        labelText = modelObject.props.name.uiValues[ 0 ];
    } else if( cmm.isInstanceOf( 'Awb0Interface', modelObject.modelType ) && modelObject.props.ase0InterfaceName ) {
        labelText = modelObject.props.ase0InterfaceName.uiValues[ 0 ];
    }
    graph.setLabel( graphItem, labelText );
    var label = graphItem.getLabel();
    if( graphItem.labelPosition ) {
        label.setPosition( graphItem.labelPosition );
    }
    return label;
};
/*
 *This function will show, hide labels depend on the input data from one step command group
 */
export let showHideLabels = function( showHide ) {
    var selectedEdges = appCtxService.ctx.graph.graphModel.graphControl.getSelected( 'Edge' );
    var selectedPorts = appCtxService.ctx.graph.graphModel.graphControl.getSelected( 'Port' );
    var graph = appCtxService.ctx.graph.graphModel.graphControl.graph;
    var graphItems = [];
    //Show/Hide/Reset label position depend on diagram selection or category selection
    if( selectedEdges.length > 0 || selectedPorts.length > 0 ) {
        _.forEach( selectedEdges, function( edgeItem ) {
            graphItems.push( edgeItem );
        } );
        _.forEach( selectedPorts, function( portItem ) {
            graphItems.push( portItem );
        } );
        showHideSelectedLabel( graphItems, graph, showHide );
        appCtxService.ctx.architectureCtx.showLabels = !showHide;
    } else {
        var architectureCtx = appCtxService.getCtx( 'architectureCtx' );
        var labelCategories = architectureCtx.diagram.labelCategories;
        var edges = graph.getVisibleEdges();
        var ports = graph.getVisiblePorts();
        graphItems = _.concat( edges, ports );
        showHideSelectedLabel( graphItems, graph, showHide );
        _.forEach( labelCategories, function( category ) {
            category.categoryState = showHide;
        } );
        appCtxService.ctx.architectureCtx.showLabels = !showHide;
    }
};
/*
 *This function will reset the label position
 */
export let resetLabel = function() {
    var selectedEdges = appCtxService.ctx.graph.graphModel.graphControl.getSelected( 'Edge' );
    var selectedPorts = appCtxService.ctx.graph.graphModel.graphControl.getSelected( 'Port' );
    var graph = appCtxService.ctx.graph.graphModel.graphControl.graph;
    var graphItems = [];
    var labels = [];
    if( selectedEdges.length > 0 || selectedPorts.length > 0 ) {
        _.forEach( selectedEdges, function( edgeItem ) {
            graphItems.push( edgeItem );
        } );
        _.forEach( selectedPorts, function( portItem ) {
            graphItems.push( portItem );
        } );
        _.forEach( graphItems, function( graphItem ) {
            var label = graphItem.getLabel();
            if( label ) {
                labels.push( label );
            }
        } );
    } else {
        var edges = graph.getVisibleEdges();
        var ports = graph.getVisiblePorts();
        var items = edges.concat( ports );
        _.forEach( items, function( item ) {
            var label = item.getLabel();
            if( label && !label.isFiltered() ) {
                labels.push( label );
            }
        } );
    }
    graph.update( function() {
        _.forEach( labels, function( label ) {
            label.resetPosition();
        } );
    } );
};
var showHideSelectedLabel = function( graphItems, graph, showHide ) {
    graph.update( function() {
        {
            _.forEach( graphItems, function( graphItem ) {
                var label = graphItem.getLabel();
                if( showHide && !label && graphItem.modelObject ) {
                    label = createGraphItemLabel( graphItem, graph );
                }
                if( label ) {
                    label.setVisible( showHide );
                }
            } );
        }
    } );
};
var resetAllLabelPosition = function( graph ) {
    var edges = graph.getVisibleEdges();
    var ports = graph.getVisiblePorts();
    var graphItems = edges.concat( ports );
    graph.update( function() {
        _.forEach( graphItems, function( item ) {
            var label = item.getLabel();
            if( label && !label.isFiltered() ) {
                label.resetPosition();
            }
        } );
    } );
};

export default exports = {
    populatePanelData,
    applyLabelSetting,
    showHideLabels,
    resetLabel
};
/**
 *
 * @memberof NgServices
 * @member Ase0SettingsLabelService
 */
app.factory( 'Ase0SettingsLabelService', () => exports );
