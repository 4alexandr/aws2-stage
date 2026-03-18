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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Att1AttrMappingTableSelectService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cmdMapSvc from 'js/commandsMapService';
import selectionService from 'js/selection.service';
import attrTableUtils from 'js/attrTableUtils';
import attrSvc from 'js/Att1MeasurableAttributeService';
import parammgmtUtilSvc from 'js/Att1ParameterMgmtUtilService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

var _mappingTableContextName = 'Att1ShowMappedAttribute';

export let initializeParamTableContext = function( data, dataProvider ) {
    parammgmtUtilSvc.setParamTableCtx( data, dataProvider.selectedObjects );
};

/**
 * @param {Object} contextObject the context
 * @returns {boolean} true if the contextObejct is valid and Modifiable
 */
function _isContextModifiable( contextObject ) {
    var inContextWritable = false;
    if( contextObject && contextObject.props && contextObject.props.is_modifiable.dbValues[ 0 ] === '1' ) {
        inContextWritable = true;
    }
    return inContextWritable;
}

/**
 * @param {Array} selectedProxyObjects the selected proxy objects
 * @param {Array} selectedProxyUids the selected proxy UIDs
 * @param {String} currentIDSelection the current selection UID
 * @param {Array} selectedAlignmentObjects the selected alignment objects
 * @param {Array} selectedAlignmentObjectsDisplayNames the selected alignment display names
 * @returns {Array} selectedProxyUids the selected proxy UIDs
 */
function _getSelectedProxyUIds( selectedProxyObjects, selectedProxyUids, currentIDSelection,
    selectedAlignmentObjects, selectedAlignmentObjectsDisplayNames ) {
    for( var idx = 0; idx < selectedProxyObjects.length; ++idx ) {
        var selectedObj = selectedProxyObjects[ idx ];
        if( selectedObj && selectedObj.props && selectedObj.props.att1SourceAttribute ) {
            // Create array for selection bus
            selectedProxyUids += selectedObj.uid;
            currentIDSelection.push( viewModelObjectSvc.createViewModelObject(
                selectedObj.props.att1SourceAttribute.dbValue, 'EDIT' ) );

            // Create Data for Map/Unmap Commands
            if( idx < selectedProxyObjects.length - 1 ) {
                selectedProxyUids += ' ';
            }
            if( selectedObj.props && selectedObj.props.att1ContextObject &&
                selectedObj.props.att1AttributeAlignment ) {
                var contextObject = cdm.getObject( selectedObj.props.att1ContextObject.dbValues[ 0 ] );
                if( _isContextModifiable( contextObject ) ) {
                    var aligmentObject = cdm.getObject( selectedObj.props.att1AttributeAlignment.dbValues[ 0 ] );

                    // Add if the object is not already on the list
                    if( selectedAlignmentObjects.indexOf( aligmentObject ) === -1 ) {
                        selectedAlignmentObjects.push( aligmentObject );
                    }

                    selectedAlignmentObjectsDisplayNames.push( selectedObj.displayName );
                }
            }
        }
    }

    return selectedProxyUids;
}

/**
 *
 * @param {Array} selectedProxyObjects the selected proxy objects
 */
function _evalStudyCmdVisibility( selectedProxyObjects ) {
    //Show toggle command for AR if attribute type is input/output/unused and for study if attribute type is unused.
    var openedObject = cdm.getObject( attrTableUtils.getOpenedObjectUid() );
    if( cmdMapSvc.isInstanceOf( 'Crt0VldnContractRevision', openedObject.modelType ) ) {
        appCtxSvc.unRegisterCtx( 'isARAttrSelected' );
        appCtxSvc.unRegisterCtx( 'isUnuseAttrSelected' );

        for( var idx = 0; idx < selectedProxyObjects.length; ++idx ) {
            var attrInOut = selectedProxyObjects[ idx ].props.att1AttrInOut.dbValue;
            if( attrInOut === 'input' || attrInOut === 'output' ) {
                appCtxSvc.updatePartialCtx( 'isARAttrSelected', true );
                break;
            }
        }

        for( var i = 0; i < selectedProxyObjects.length; ++i ) {
            var attrInOutStatus = selectedProxyObjects[ i ].props.att1AttrInOut.dbValue;
            if( attrInOutStatus === 'unused' ) {
                appCtxSvc.updatePartialCtx( 'isUnuseAttrSelected', true );
                break;
            }
        }
    }
}

/**
 */
function _getIncontextAttributes() {
    if( appCtxSvc.ctx.openedARObject === undefined ||
        appCtxSvc.ctx.openedARObject && !( appCtxSvc.ctx.openedARObject.type === 'Crt0StudyRevision' || appCtxSvc.ctx.openedARObject.type === 'Crt0VldnContractRevision' ) ) {
        appCtxSvc.unRegisterCtx( 'inContextAttr' );
        var proxyMeasurableAttrs = appCtxSvc.getCtx( 'selectedProxyObjects' );
        for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
            if( proxyMeasurableAttrs[ j ].props[ 'REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext' ] ) {
                var inContext = proxyMeasurableAttrs[ j ].props[ 'REF(att1SourceAttribute,Att0MeasurableAttribute).att1InContext' ].dbValue;
                if( inContext === true ) {
                    break;
                }
            }
        }
        appCtxSvc.registerCtx( 'inContextAttr', inContext );
    }
}

/**
 *
 * @param {Array} selectedProxyObjects the selected proxy objects
 */
export let tableRowSelection = function( selectedProxyObjects ) {
    appCtxSvc.registerCtx( 'selectedProxyObjects', selectedProxyObjects );

    _getIncontextAttributes();

    var selectedProxyUids = '';
    var selectedAlignmentObjects = [];
    var selectedAlignmentObjectsDisplayNames = [];
    var currentIDSelection = [];

    // Get parent selection object
    var _parentSelection1 = selectionService.getSelection();
    var parentSelection = _parentSelection1.selected;
    if( cmdMapSvc.isInstanceOf( 'Att0MeasurableAttribute', parentSelection[ 0 ].modelType ) ||
        cmdMapSvc.isInstanceOf( 'Att1AttributeAlignmentProxy', parentSelection[ 0 ].modelType ) ) {
        parentSelection = _parentSelection1.parent;
    }

    if( Array.isArray( parentSelection ) ) {
        parentSelection = parentSelection[ 0 ];
    }

    if( selectedProxyObjects ) {
        selectedProxyUids = _getSelectedProxyUIds( selectedProxyObjects, selectedProxyUids, currentIDSelection,
            selectedAlignmentObjects, selectedAlignmentObjectsDisplayNames );

        var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
        if( mapContext && mapContext.interactionSelected ) {
            //If interaction selection flag is true then select the current selection as tree table selection and parent selection as interaction
            if( currentIDSelection.length > 0 ) {
                selectionService.updateSelection( currentIDSelection, mapContext.selectedInteractionObject );
            } else {
                //Else set the current selection as interaction
                selectionService.updateSelection( mapContext.selectedInteractionObject,
                    mapContext.selectedConnection );
            }
        } else {
            // Publish events
            if( currentIDSelection.length > 0 ) {
                selectionService.updateSelection( currentIDSelection, parentSelection );
            } else {
                 //If no  parameter selected (in case of Documentation tab then selection should be set to PWA(requirements ))
                var selected = _.get( appCtxSvc, 'ctx.selected', undefined );
                var pwaSelections = _.get( appCtxSvc,  'ctx.occmgmtContext.selectedModelObjects', [] );
                if( selected &&  selected.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1  && pwaSelections.length === 1 ) {
                    var openedElement =  _.get( appCtxSvc, 'ctx.occmgmtContext.openedElement', undefined );
                    selectionService.updateSelection( pwaSelections[0], openedElement );
                }
                eventBus.publish( 'gwt.SplitPanelDeSelectEvent' );
            }
        }
    }

    appCtxSvc.registerCtx( 'selectedProxyObjectUids', selectedProxyUids );
    appCtxSvc.registerCtx( 'selectedAlignmentObjects', selectedAlignmentObjects );
    appCtxSvc.registerCtx( 'selectedAlignmentObjectsNames', selectedAlignmentObjectsDisplayNames );

    eventBus.publish( 'updateAttrMapping' );

    _evalStudyCmdVisibility( selectedProxyObjects );
};

/**
 *
 * @param {Array} selectedProxyObjects the selected proxy objects
 */
export let proxyListSelection = function( selectedProxyObjects ) {
    var isModifiable = false;
    if( selectedProxyObjects ) {
        for( var idx = 0; idx < selectedProxyObjects.length; ++idx ) {
            var selectedObj = selectedProxyObjects[ idx ];
            if( selectedObj && selectedObj.props && selectedObj.props.att1ContextObject ) {
                var contextObject = cdm.getObject( selectedObj.props.att1ContextObject.dbValue );
                if( contextObject && contextObject.props &&
                    contextObject.props.is_modifiable.dbValues[ 0 ] === '1' ) {
                    isModifiable = true;
                }
            }
        }
    }
    appCtxSvc.registerCtx( 'selectedListAlignmentObjectsModifiable', isModifiable );
};

/*
 * Gets space separated UIDs sting for PWA select elements.
 */
export let parentElementsSelectionChange = function() {
    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
    if( mapContext ) {
        var selectedObjectUids = attrTableUtils.getSelectedElementUids();
        mapContext.parentUids = selectedObjectUids;
        appCtxSvc.updatePartialCtx( _mappingTableContextName, mapContext );
        eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
    }
};

/*
 * Gets the attribute for open cell command
 */
export let getAttributeObject = function( obj ) {
    if( obj.props.att1SourceAttribute ) {
        // set the opened context property, if needed
        attrSvc.checkOpenedContext( obj );

        // return the attribute ID
        var measurableAttrUid = obj.props.att1SourceAttribute.dbValues[ 0 ];
        return cdm.getObject( measurableAttrUid );
    }
};

/*
 * Update the ctx with selected proxy objects.
 */
export let updateSelectedProxyObjects = function( data, dataProvider ) {
    var selectedObjects = dataProvider.selectedObjects;
    //these need to be set since when we select multiple parents table changes form Att1ShowAttrProxyTable-- to Att1ShowMappedAttribute
    exports.initializeParamTableContext( data, dataProvider );
    exports.tableRowSelection( selectedObjects );
};

/**
 * Att1AttrMappingTableSelectService factory
 */

export default exports = {
    initializeParamTableContext,
    tableRowSelection,
    proxyListSelection,
    parentElementsSelectionChange,
    getAttributeObject,
    updateSelectedProxyObjects
};
app.factory( 'Att1AttrMappingTableSelectService', () => exports );
