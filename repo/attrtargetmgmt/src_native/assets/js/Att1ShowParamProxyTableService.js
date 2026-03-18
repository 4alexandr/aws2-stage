// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Att1ShowParamProxyTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import selectionService from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';
import adapterService from 'js/adapterService';
import paramgmtUtil from 'js/Att1ParameterMgmtUtilService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let changeSelectionToAttribute = function( dataProvider ) {
    var selection = selectionService.getSelection();
    var selectedObjects = dataProvider.selectedObjects;
    var paramCtx = appCtxService.getCtx( 'parammgmtctx' );
    var parentOfInterests = paramgmtUtil.getParentOfInterests( selectedObjects );
    //handle flag for paramProject/Group ParameterSelection
    paramgmtUtil.parameterSelectedInPramProjectContext( selectedObjects );
    // Clear the selected proxy objects
    appCtxService.registerCtx( 'selectedAttrProxyObjects', [] );

    // Maintain proxy object selection for Verification Request.
    appCtxService.registerCtx( 'selectedAttrProxyObjectsForAR', selectedObjects );

    var sourceSelections = [];
    for( var j = 0; j < selectedObjects.length; ++j ) {
        var objUid = selectedObjects[ j ].props.att1SourceAttribute.dbValue;
        var sourceObj = cdm.getObject( objUid );
        sourceSelections.push( sourceObj );
    }
    if( sourceSelections.length > 0 ) {
        selectionService.updateSelection( sourceSelections, selection.parent );
    }
    if( paramCtx ) {
        paramCtx.selectedProxyParams = selectedObjects;
        //update parammgmtctx.mselected in case of selection in paramProxy Table
        if( sourceSelections.length > 0 ) {
            paramCtx.mselected = sourceSelections;
        } else {
            var mselected = selection.selected;
            sourceSelections = [];
            if ( mselected.length > 0 && mselected[0].type === 'Att1AttributeAlignmentProxy' ) {
                for ( var j = 0; j < mselected.length; ++j ) {
                    var objUid = mselected[j].props.att1SourceAttribute.dbValue;
                    var sourceObj = cdm.getObject( objUid );
                    sourceSelections.push( sourceObj );
                }
                paramCtx.mselected = sourceSelections;
            } else {
                paramCtx.mselected = mselected;
            }
        }
        appCtxService.updatePartialCtx( 'parammgmtctx', paramCtx );
        _.set( appCtxService, 'ctx.parammgmtctx.parameterTableCtx.parentOfInterests', parentOfInterests );
    }
};

/*
 * Clear Selection of proxy objects
 */
export let clearSelection = function() {
    appCtxService.unRegisterCtx( 'selectedAttrProxyObjectsForAR' );
};

/**
 * @param {appCtx} ctx the application context
 * @returns {string} list of parent UIDS separated by whitespace
 */
export let getParentUid = function() {
    var parentUId = null;
    var selectedNode = _.get( appCtxService, 'ctx.parammgmtctx.selected', undefined );
    //we are inside project or group
    if( selectedNode ) {
        parentUId = _getParamProjectorGroupUID( selectedNode );
    } else {
        //we are in Home Folder
        var selectedNodeInHome = _.get( appCtxService, 'ctx.xrtSummaryContextObject', undefined );
        if( selectedNodeInHome ) {
            parentUId = _getParamProjectorGroupUID( selectedNodeInHome );
        } else {
            selectedNodeInHome = _.get( appCtxService, 'ctx.selected', undefined );
            if( selectedNodeInHome ) {
                parentUId = _getParamProjectorGroupUID( selectedNodeInHome );
            }
        }
    }
    return parentUId;
};
var _getParamProjectorGroupUID = function( selectedNode ) {
    var _paramProjectorGroupUID = null;
    if( selectedNode && ( selectedNode.modelType.typeHierarchyArray.indexOf( 'Att0ParamGroup' ) > -1 || selectedNode.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) ) {
        _paramProjectorGroupUID = selectedNode.uid;
    } else if( selectedNode && ( selectedNode.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 || selectedNode.modelType.typeHierarchyArray.indexOf( 'Att1AttributeAlignmentProxy' ) > -1 ) ) {
        _paramProjectorGroupUID = _.get( appCtxService, 'ctx.pselected', undefined ).uid;
    }
    return _paramProjectorGroupUID;
};
export let syncSelection = function( data ) {
    var locationContext = appCtxService.getCtx( 'locationContext' );
    if( data && data.dataProviders && data.dataProviders.showParamProxyTableProvider ) {
        var dataProvider = data.dataProviders.showParamProxyTableProvider;
        dataProvider.selectNone();
    }
    if( locationContext && locationContext.modelObject && locationContext.modelObject.modelType && locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
        var selectedParent = _.get( appCtxService, 'ctx.xrtSummaryContextObject', undefined );
        selectionService.updateSelection( selectedParent, locationContext.modelObject );
        if( _.get( appCtxService, 'ctx.parammgmtctx.selectedProxyParams', undefined ) ) {
            delete appCtxService.ctx.parammgmtctx.selectedProxyParams;
        }
    } else {
        var createdObject = null;
        if( data && data.eventData && data.eventData.createdObject ) {
            createdObject = data.eventData.createdObject;
            var relatedModifiedData = {
                refreshParamTable: true,
                relatedModified: _.get( appCtxService, 'ctx.parammgmtctx.selected', undefined ),
                createdObject: createdObject
            };
            eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData );
        }
    }
};
/**
 * @param {sourceObjects} sourceObjects of the selected Objects
 * @returns {Objects} adapted Objects
 */
export let getAdaptedObjects = function( sourceObjects ) {
    var adaptedObjects = [];
    var selection = selectionService.getSelection();
    if( sourceObjects.length > 0 && selection && selection.parent ) {
        selectionService.updateSelection( sourceObjects, selection.parent );
        adaptedObjects = adapterService.getAdaptedObjects( sourceObjects );
    }
    return adaptedObjects;
};

/**
 * @param {sourceObjects} sourceObjects of the selected Objects
 * @returns {Objects} adapted Objects
 */
export let updateSelectionToOwningObjects = function( sourceObjects ) {
    var selection = selectionService.getSelection();
    if( sourceObjects.length > 0 && selection ) {
        selectionService.updateSelection( sourceObjects, selection.parent );
    }
};

/**
 * Returns the Att1ShowParamProxyTableService instance
 *
 * @member Att1ShowParamProxyTableService
 */

export default exports = {
    changeSelectionToAttribute,
    clearSelection,
    getParentUid,
    syncSelection,
    getAdaptedObjects,
    updateSelectionToOwningObjects
};
app.factory( 'Att1ShowParamProxyTableService', () => exports );
