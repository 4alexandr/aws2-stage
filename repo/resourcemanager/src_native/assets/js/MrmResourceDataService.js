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
 * @module js/MrmResourceDataService
 */
import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import awTableSvc from 'js/awTableService';
import mrmOccmgmtGetService from 'js/MrmOccmgmtGetService';
import mrmOccmgmtGetOccsResponseService from 'js/MrmOccmgmtGetOccsResponseService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import aceStaleRowMarkerService from 'js/aceStaleRowMarkerService';
import assert from 'assert';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import mrmResourceGraphUtils from 'js/MrmResourceGraphUtils';

var exports = {};

export let getContextKeyFromParentScope = function( parentScope ) {
    return contextStateMgmtService.getContextKeyFromParentScope( parentScope );
};

/**
 * loadResourceData
 *
 * @param {ResourceLoadInput} resourceLoadInput -
 * @param {IModelObject} openedObject -
 * @param {OccCursorObject} cursorObject -
 *
 * @return {Promise} Promise resolves with the resulting ResourceLoadResult object.
 */
export let loadResourceData = function( resourceLoadInput, openedObject, cursorObject, contextKey, declViewModel, panelContext ) {

    if( !contextKey || !appCtxSvc.ctx[ contextKey ] ) {
        return;
    }

    var currentViewModeContext = appCtxSvc.ctx.ViewModeContext;
    if (currentViewModeContext) {
        if (!(currentViewModeContext.ViewModeContext === 'ResourceView' || currentViewModeContext.ViewModeContext === 'ResourceSummaryView')) {
            return;
        }
    }

    var isDataReloaded = false;
    if( declViewModel.resourceLoadResult ) {
        //It means data is reloading
        isDataReloaded = true;
    }

    var currentContext = appCtxSvc.ctx[ contextKey ];
    var soaInput = mrmOccmgmtGetService.getDefaultSoaInput();
    var clearExistingSelections = appCtxSvc.getCtx( contextKey ).clearExistingSelections;

    if( panelContext ) {
        declViewModel.resourceGraphSelectionModel = panelContext.selectionModel;
    }

    if( clearExistingSelections ) {
        resourceLoadInput.clearExistingSelections = true;
        appCtxSvc.updatePartialCtx( contextKey + '.clearExistingSelections', false );
    }

    resourceLoadInput.parentElement = cdmSvc.NULL_UID;

    var isNodeExpanded = false;

    /**
     * Determine UID of 'parent' to load from.
     */
    if( resourceLoadInput.parentUid ) {
        /**
         * In case of expand the graph node, parent will the node which is going to be expand.
         */
        resourceLoadInput.parentElement = resourceLoadInput.parentUid;
        currentContext.currentState.o_uid = resourceLoadInput.parentUid;
        currentContext.currentState.c_uid = resourceLoadInput.parentUid;
        isNodeExpanded = true;
    } else if( cdmSvc.isValidObjectUid( currentContext.currentState.o_uid ) ) {
        resourceLoadInput.parentElement = currentContext.currentState.o_uid;
    }

    assert( resourceLoadInput.parentElement, 'Invalid parent ID' );

    /**
     * Check if the resourceLoadInput does NOT specifiy a cursorIbject but the dataProvider does.<BR>
     * If so: Use it.
     */
    if( !resourceLoadInput.cursorObject && cursorObject ) {
        resourceLoadInput.cursorObject = cursorObject;
    }

    resourceLoadInput.displayMode = "Resource";

    /** Default paze size is 40 but user may try to add multiple instance using "Add" dialog
     *  We have increased page size to number of nodes already in the graph plus max value allow in "Number of Elements" in "Add" dialog
     */
    var numberOfExistingNodes = 0;
    if (appCtxSvc.ctx.graph && appCtxSvc.ctx.graph.graphModel.nodeMap) {
        numberOfExistingNodes = Object.keys(appCtxSvc.ctx.graph.graphModel.nodeMap).length;
    }

    resourceLoadInput.pageSize = numberOfExistingNodes + 10000;

    return mrmOccmgmtGetService
        .getOccurrences( resourceLoadInput, soaInput, currentContext )
        .then(
            function( response ) {
                if( !declViewModel.isDestroyed() ) {
                    var newState = mrmOccmgmtGetOccsResponseService.getNewStateFromGetOccResponse( response,
                        contextKey );

                    var oModelObject = cdmSvc.getObject(newState.o_uid);

                    if (isNodeExpanded && currentContext.topElement) {
                        //After expanding a node it should set top element as open element, otherwise newly added element will not be visible
                        oModelObject = cdmSvc.getObject(currentContext.topElement.uid);
                    }

                    var tModelObject = cdmSvc.getObject( newState.t_uid );
                    var pModelObject = cdmSvc.getObject( newState.pci_uid );

                    if( resourceLoadInput.clearExistingSelections ) {
                        currentContext.pwaSelectionModel.selectNone();
                    }

                    if( resourceLoadInput.clearExistingSelections ) {
                        currentContext.pwaSelectionModel.selectNone();
                    }

                    if( resourceLoadInput.skipFocusOccurrenceCheck &&
                        appCtxSvc.ctx[ contextKey ].previousState.c_uid ) {
                        delete newState.c_uid;
                        delete newState.o_uid;
                    }

                    if( !cdmSvc.isValidObjectUid( resourceLoadInput.parentUid ) ) {
                        contextStateMgmtService.syncContextState( contextKey, newState );

                    }

                    var childOccurrences = [];

                    _.forEach( response.graph.nodes, function( childOccInfo ) {

                        if( childOccInfo.resourceOccurrence.props && childOccInfo.resourceOccurrence.props[ "MRMPSP" ])
                        {
                            delete childOccInfo.resourceOccurrence.props[ "MRMPSP" ];
                        }

                        if( childOccInfo.resourceProps ) {
                            childOccInfo.resourceOccurrence.props[ "MRMPSP" ] = childOccInfo.resourceProps[ "MRM PSP" ];
                        }

                        //awb0NumberOfChildren includes GCS CP and CSYS lines we need to exclude those lines from count
                        //childOccInfo.numberOfChildren excludes those lines
                        if( childOccInfo.resourceOccurrence.props && childOccInfo.resourceOccurrenceId !== response.parentResourceOccurrence.resourceOccurrenceId) {
                            childOccInfo.resourceOccurrence.props.awb0NumberOfChildren.dbValues[ 0 ] = childOccInfo.numberOfChildren;
                        }

                        //While expanding a node no need to process parent occurrence as it is already drawn in graph
                        //This time parent occurrence is expanded node which is already in graph
                        if( !( resourceLoadInput.expandNode && childOccInfo.resourceOccurrenceId === response.parentResourceOccurrence.resourceOccurrenceId ) ) {
                            childOccurrences.push( childOccInfo.resourceOccurrence );
                        }
                    } );

                    var totalChildCount = childOccurrences.length;

                    if( !response.cursor.endReached ) {
                        totalChildCount++;
                    }

                    var resourceLoadResult = awTableSvc.createListLoadResult( response.parentResourceOccurrence,
                        childOccurrences, totalChildCount, 0, response.parentResourceOccurrence );

                    /** Common load result properties */
                    resourceLoadResult.baseModelObject = oModelObject;
                    resourceLoadResult.pciModelObject = pModelObject;
                    resourceLoadResult.openedObject = oModelObject;
                    resourceLoadResult.openedModelObject = oModelObject;
                    resourceLoadResult.topModelObject = tModelObject;
                    resourceLoadResult.showTopNode = true;
                    resourceLoadResult.changeContext = "";

                    resourceLoadResult.sublocationAttributes = response.userWorkingContextInfo ? response.userWorkingContextInfo.sublocationAttributes : {};

                    resourceLoadResult.autoSavedSessiontime = response.userWorkingContextInfo.autoSavedSessiontime;

                    resourceLoadResult.filter = response.filter;

                    mrmOccmgmtGetOccsResponseService.populateSourceContextToInfoMapOnOccmgmtContext( resourceLoadResult,
                        response );

                    resourceLoadResult.requestPref = {
                        savedSessionMode: "restore",
                        startFreshNavigation: false,
                        useGlobalRevRule: false,
                        criteriaType: currentContext.requestPref.criteriaType,
                        showUntracedParts: currentContext.requestPref.showUntracedParts,
                        configContext: {}
                    };

                    resourceLoadResult.configContext = {};

                    if( response.requestPref && response.requestPref.ignoreIndexForPCIs ) {
                        resourceLoadResult.requestPref.ignoreIndexForPCIs = response.requestPref.ignoreIndexForPCIs;
                    }

                    /**
                     * Populate the decision for objectQuota loading from the requestPref
                     */
                    resourceLoadResult.useObjectQuotatoUnload = false;
                    if( response.requestPref && response.requestPref.UseObjectQuotatoUnload ) {
                        if( response.requestPref.UseObjectQuotatoUnload[ 0 ] === "true" ) {
                            resourceLoadResult.useObjectQuotatoUnload = true;
                        }
                    }

                    resourceLoadResult.elementToPCIMap = mrmOccmgmtGetOccsResponseService
                        .updateElementToPCIMap( response );

                    resourceLoadResult.cursorObject = response.cursor;

                    resourceLoadResult.columnConfig = response.columnConfig;

                    aceStaleRowMarkerService.updateCtxWithStaleUids( response.requestPref, response.occurrences );

                    mrmOccmgmtGetOccsResponseService.populateRequestPrefInfoOnOccmgmtContext( resourceLoadResult, response );

                    mrmOccmgmtGetOccsResponseService.populateFeaturesInfoOnOccmgmtContext( resourceLoadResult, response, contextKey );

                    resourceLoadResult.edges = response.graph.edges;

                    if( declViewModel.dataProviders ) {
                        resourceLoadResult.vmc = mrmResourceGraphUtils.getCurrentResourceDataProvider( declViewModel.dataProviders ).viewModelCollection;
                    }

                    declViewModel.resourceLoadResult = resourceLoadResult;

                    if( isDataReloaded ) {
                        //If we retrieve resource data after changing revision rules it returns same components but with different UIDs
                        //We need to change old top element to new top element before redraw the resource graph
                        if(currentContext.topElement.uid !== tModelObject.uid)
                        {
                            currentContext.topElement = tModelObject;
                        }
                        //It means data is reloaded and need to draw graph with newly loaded data
                        eventBus.publish( 'MrmResourceGraph.drawResourceGraph' );
                    }
                    else{
                        
                        if(declViewModel.reInitializedLegendData)
                        {
                            // Legend data may be initialized before loading resource data
                            // In this case we have to reinitialized legend data
                            // It make sure resource and legend data are loaded to draw the resource graph
                            eventBus.publish( 'MrmResourceGraph.initLegendData' );
                        }
                    }

                    return {
                        resourceLoadResult: resourceLoadResult
                    };
                }
            } );
};

export default exports = {
    getContextKeyFromParentScope,
    loadResourceData
};
/**
 * Register this service with AngularJS.
 *
 * @memberOf NgServices
 * @member MrmResourceDataService
 */
app.factory( 'MrmResourceDataService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */
