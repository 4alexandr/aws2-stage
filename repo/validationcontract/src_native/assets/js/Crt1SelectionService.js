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
 * @module js/Crt1SelectionService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import selectionService from 'js/selection.service';

var exports = {};

/*
 * Corrects selection to be elements from contents table of VR
 */
export let changeSelection = function( data ) {
    var dataProvider = null;
    var selectedObjects = [];
    if( data && data.dataProviders && data.dataProviders.contentsTableProvider ) {
        dataProvider = data.dataProviders.contentsTableProvider;
        selectedObjects = dataProvider.selectedObjects;
        appCtxSvc.registerCtx( 'vrContentTableSelection', selectedObjects );
    } else if( data && data.selectedObjects && data.selectedObjects.length > 0 ) {
        selectedObjects = data.selectedObjects;
    }
    var selection = selectionService.getSelection();
    var selectedElementsInPWA = _.get( appCtxSvc, 'ctx.occmgmtContext.selectedModelObjects', [] );
    if( selectedObjects.length > 0 && selectedElementsInPWA.length === 1 ) {
        parentSelection = selectedElementsInPWA[ 0 ];
    } else {
        if( !selection.parent ) {
            var parent = appCtxSvc.ctx.parentSelection;
            parentSelection = parent;
            appCtxSvc.registerCtx( 'pselected', parentSelection );
        } else {
            parentSelection = selection.parent;
            appCtxSvc.registerCtx( 'parentSelection', parentSelection );
        }
    }
    // After pie chart filter if contents are selected after the selection of SR/TR, clear SR/TR selections
    if( selectedObjects.length >= 1 && ( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) &&
    appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders.ObjectSet_2_Provider &&
    appCtxSvc.ctx.recentProviders.ObjectSet_2_Provider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.ObjectSet_2_Provider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of Event, clear Event selection
    if( selectedObjects.length >= 1 && ( ( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0Event' ) > -1 ) ||
    ( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf('IAV0TestRunRevision' ) > -1 ) ||
    ( !( selection.selected[ 0 ].props.crt1AddedToAnalysisRequest ) && appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' &&
    ( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestRunRevision' ) > -1 ||
    appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Crt0StudyRevision' ) > -1 ||
    appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0RunRevision' ) > -1 ) ) ) &&
    appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders.ObjectSet_1_Provider && appCtxSvc.ctx.recentProviders.ObjectSet_1_Provider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.ObjectSet_1_Provider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of Test/Prod bom, clear Test/Prod bom selection
    if( selectedObjects.length >= 1 && selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Awb0PartElement' ) > -1 &&
    appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' &&
    (appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1 ) &&
    appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders.testAndProdBOMTableProvider &&
    appCtxSvc.ctx.recentProviders.testAndProdBOMTableProvider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.testAndProdBOMTableProvider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of Physical bom, clear Physical bom selection
    if( selectedObjects.length >= 1 && selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Sam1AsMaintainedElement' ) > -1 &&
    appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Overview' &&
    ( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestRunRevision' ) > -1 ) &&
    appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders.testEBOMTableProvider &&
    appCtxSvc.ctx.recentProviders.testEBOMTableProvider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.testEBOMTableProvider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of TM, clear TM selection
    if( selectedObjects.length >= 1 && appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders
        .contentsTMTableProvider && appCtxSvc.ctx.recentProviders.contentsTMTableProvider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.contentsTMTableProvider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of TP, clear TP selection
    if( selectedObjects.length >= 1 && appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders.contentsTPTableProvider &&
        appCtxSvc.ctx.recentProviders.contentsTPTableProvider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.contentsTPTableProvider.selectNone();
    }
    // After pie chart filter if contents are selected after the selection of parameters, clear parameter selection
    if( selectedObjects.length >= 1 && appCtxSvc.ctx.recentProviders && appCtxSvc.ctx.recentProviders
        .showAttrProxyTableProvider && appCtxSvc.ctx.recentProviders.showAttrProxyTableProvider.selectedObjects.length !== 0 ) {
        var provider = appCtxSvc.ctx.recentProviders;
        provider.showAttrProxyTableProvider.selectNone();
    }

    if( selectedObjects ) {
        var correctedSelection = [];
        var parentSelection;

        // //if there is no rows selected in the table, reset the current selection
        if( selectedObjects.length === 0 && selection.selected[ 0 ].props.crt1AddedToAnalysisRequest &&
            !( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'IAV1VerifReqmtElement' ) > -1 ) &&
            ( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 ||
            selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 ||
            selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf('Arm0ParagraphElement' ) > -1 ) &&
            (appCtxSvc.ctx.isChangeSelectionForTPCalled || appCtxSvc.ctx.isChangeSelectionForTMCalled)) {

            correctedSelection.push( selection.selected[ 0 ] );

        } else if( ( selectedObjects.length === 0 && selection.selected[ 0 ].props.crt1AddedToAnalysisRequest &&
            !( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'IAV1VerifReqmtElement' ) > -1 )
            && ( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 ||
                selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 ||
                selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf('Arm0ParagraphElement' ) > -1 ) &&
                !appCtxSvc.ctx.isChangeSelectionForTPCalled) || ( selectedObjects.length === 0 && selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf('WorkspaceObject') > -1 ) ||
                ( selectedObjects.length === 0 && selection.selected[ 0 ].props.crt1AddedToAnalysisRequest ) &&
                !( selection.selected[ 0 ].modelType.typeHierarchyArray.indexOf( 'Awb0PartElement' ) > -1 )
                ) {
            var newSelection = null;

            // AR inputs/overview view, set the selection to the AR
            newSelection = cdm.getObject( appCtxSvc.ctx.locationContext.modelObject.uid );

            if( newSelection !== null ) {
                correctedSelection.push( newSelection );
            }
            //if any other object is selected apart from contents return that object and not VR
        } else if( selectedObjects.length === 0 && (selection.selected[0].type !== 'Crt0VldnContractRevision') && !( selection.selected[ 0 ].props.crt1AddedToAnalysisRequest ) ) {
            correctedSelection.push( selection.selected[ 0 ] );
        }
        appCtxSvc.unRegisterCtx('isChangeSelectionForTMCalled');
        appCtxSvc.unRegisterCtx('isChangeSelectionForTPCalled');
        // get the selected attributes
        for( var j = 0; j < selectedObjects.length; ++j ) {

            var objUid = selectedObjects[ j ].props.crt1SourceObject.value;
            var attribute = cdm.getObject( objUid );

            correctedSelection.push( attribute );
        }
        // change the current selection
        if( correctedSelection.length > 0 ) {
            selectionService.updateSelection( correctedSelection, parentSelection );
        }
    }
    //register Uid for opening in new context
    appCtxSvc.unRegisterCtx('newContextUid');
    if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.props.awb0UnderlyingObject){
        appCtxSvc.registerCtx( 'newContextUid', appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0] );
    }else{
        appCtxSvc.registerCtx( 'newContextUid', appCtxSvc.ctx.selected.uid );
    }
};

export let clearProviderSelection = function( data ) {
    if( data && data.dataProviders )
    {
        var dataProvider = data.dataProviders.contentsTableProvider;
        if( dataProvider )
        {
            dataProvider.selectNone();
        }
    }
};

export let updateTMTPSelection = function( ) {
    var newSelection = null;
    var correctedSelection = [];
        // AR inputs/overview view, set the selection to the AR
        newSelection = cdm.getObject( appCtxSvc.ctx.locationContext.modelObject.uid );

        if( newSelection !== null ) {
            correctedSelection.push( newSelection );
        }
        if(appCtxSvc.ctx.xrtSummaryContextObject ){
                    var parentSelection = appCtxSvc.ctx.xrtSummaryContextObject;
                    selectionService.updateSelection( parentSelection );
                }
        if( correctedSelection.length > 0 ) {
            selectionService.updateSelection( correctedSelection, parentSelection );
        }
};

export default exports = {
    changeSelection,
    clearProviderSelection,
    updateTMTPSelection
};
app.factory( 'Crt1SelectionService', () => exports );
