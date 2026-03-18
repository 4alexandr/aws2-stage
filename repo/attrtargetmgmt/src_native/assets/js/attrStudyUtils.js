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
 * @module js/attrStudyUtils
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import selectionService from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

var _studySelection = null;
var exports = {};

/*
 * Gets space separated UIDs sting for select study.
 */
export let getSelectedStudyUids = function() {
    var parentUids = '';
    var isStudySelected = false;
    if( appCtxSvc.ctx.xrtSummaryContextObject.type === 'Crt0StudyRevision' && appCtxSvc.ctx.mselected[ 0 ].type === 'Crt0StudyRevision' && ( !appCtxSvc.ctx.studyTableColumnFilters ||  appCtxSvc.ctx.studyTableColumnFilters.length === 0 ) ) {
        parentUids = '';
    }else if( appCtxSvc.ctx.xrtSummaryContextObject.type === 'IAV0TestStudyRevision' && appCtxSvc.ctx.mselected[ 0 ].type === 'IAV0TestStudyRevision' && ( !appCtxSvc.ctx.studyTableColumnFilters ||  appCtxSvc.ctx.studyTableColumnFilters.length === 0 ) ) {
        parentUids = '';
    }
    else if( !appCtxSvc.ctx.studyTableColumnFilters || appCtxSvc.ctx.studyTableColumnFilters.length === 0 ) {
        // Studies selected to view study parameters
        if( appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected.length >= 1 &&
            appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) {
            isStudySelected = true;
            parentUids = appCtxSvc.ctx.mselected[ 0 ].uid;
            for( var i = 1; i < appCtxSvc.ctx.mselected.length; i++ ) {
                parentUids = parentUids.concat( '#', appCtxSvc.ctx.mselected[ i ].uid );
            }
        }
    } else {
        isStudySelected = true;
        // Click on bar chart to view parameters
        parentUids = appCtxSvc.ctx.parentUids;
    }
    appCtxSvc.registerCtx( 'isStudySelected', isStudySelected );
    return parentUids;
};

/*
 * Checks if select object is study or its sub-types.
 */
export let checkIfStudySelected = function() {
    var isStudySelected = false;
    if( appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) {
        isStudySelected = true;
    }
    appCtxSvc.registerCtx( 'isStudySelected', isStudySelected );
};

/*
 * Checks if select object is study or its sub-types.
 */
export let checkIfStudyORARSelected = function() {
    var isStudySelected = false;

    if( appCtxSvc.ctx.selected &&
        appCtxSvc.ctx.selected.modelType &&
        ( appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 || appCtxSvc.ctx.selected.modelType.typeHierarchyArray
            .indexOf( 'Crt0VldnContractRevision' ) > -1 ) ) {
        isStudySelected = true;
        _studySelection = selectionService.getSelection();
    }
    appCtxSvc.registerCtx( 'isStudySelected', isStudySelected );
    if( appCtxSvc.ctx.isStudySelected ) {
        eventBus.publish( 'Att1ShowStudyAttrsTable.refreshStudyTable' );
    }
};

/*
 * Corrects selection to be attribute instead of proxy object
 */
export let changeSelectionToAttribute = function( dataProvider ) {
    var selection = selectionService.getSelection();
    var selectedObjects = dataProvider.selectedObjects;

    // Clear the selected proxy objects
    appCtxSvc.registerCtx( 'selectedAttrProxyObjects', [] );

    if( selectedObjects && selectedObjects.length !== 0 ) {
        var objUid = selectedObjects[ 0 ].props.att1SourceAttribute.dbValue;
        var attribute = cdm.getObject( objUid );

        var correctedSelection = [];
        correctedSelection.push( attribute );

        selectionService.updateSelection( correctedSelection, selection.parent );
    } else if( _studySelection ) {
        selectionService.updateSelection( _studySelection.selected, _studySelection.parent );
    }
};
export let getColumnFilters = function( data ) {
    if( appCtxSvc.ctx.studyTableColumnFilters ) {
        data.columnProviders.studyAttrsColumnProvider.columnFilters = appCtxSvc.ctx.studyTableColumnFilters;
    }
    return data.columnProviders.studyAttrsColumnProvider.columnFilters;
};
/**
 * Returns the attrStudyUtils instance
 *
 * @member attrStudyUtils
 */

export default exports = {
    getSelectedStudyUids,
    checkIfStudySelected,
    checkIfStudyORARSelected,
    changeSelectionToAttribute,
    getColumnFilters
};
app.factory( 'attrStudyUtils', () => exports );
