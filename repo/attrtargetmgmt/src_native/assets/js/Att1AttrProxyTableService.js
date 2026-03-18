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
 * @module js/Att1AttrProxyTableService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import selectionService from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';
import attrTableUtils from 'js/attrTableUtils';
import parammgmtUtlSvc from 'js/Att1ParameterMgmtUtilService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/*
 * Corrects selection to be attribute instead of proxy object
 */
export let changeSelectionToAttribute = function( data ) {
    var dataProvider = null;
    var selectedObjects = [];
    if( data && data.dataProviders && data.dataProviders.showAttrProxyTableProvider ) {
        dataProvider = data.dataProviders.showAttrProxyTableProvider;
        selectedObjects = dataProvider.selectedObjects;
    } else if( data && data.selectedObjects && data.selectedObjects.length > 0 ) {
        selectedObjects = data.selectedObjects;
    }
    appCtxService.unRegisterCtx( 'overriddenParamsSelected' );
    //set The ParamTableContext
    if( !_.get( appCtxService, 'ctx.Att1ShowInterfaceDefAttrsTable', undefined ) ) {
        parammgmtUtlSvc.setParamTableCtx( data, selectedObjects );
    }
    var selection = selectionService.getSelection();

    // Keep a copy of the original selected proxy objects
    appCtxService.registerCtx( 'selectedAttrProxyObjects', selectedObjects );
    if( selectedObjects.length === 0 ) {
        appCtxService.unRegisterCtx( 'syncCandidates' );
        appCtxService.unRegisterCtx( 'publishCandidates' );
        appCtxService.unRegisterCtx( 'unusedCommandVisibility' );
    } else {
        _getSyncPublishCandidates( selectedObjects );
    }

    if( selectedObjects ) {
        var correctedSelection = [];
        var parentSelection;
        var selectedElementsInPWA = _.get( appCtxService, 'ctx.occmgmtContext.selectedModelObjects', [] );
        if( selectedObjects.length > 0 && selectedElementsInPWA.length === 1 ) {
            parentSelection = selectedElementsInPWA[0];
        }else{
            parentSelection = selection.parent;
        }
    // if there is no rows selected in the table, reset the current selection
    if( selectedObjects.length === 0 && selection.selected[0].modelType.typeHierarchyArray.indexOf('Att0MeasurableAttribute') > -1) {
            var newSelection = null;
            if( appCtxService.ctx.occmgmtContext && appCtxService.ctx.occmgmtContext.currentState ) {
                if( appCtxService.ctx.ATTRIBUTE_TABLE_CONTEXT ) {
                    // Interface Def attr table within the ACE view, set the selected to the parent Interface Def
                    newSelection = parentSelection;
                } else {
                    // ACE view, set the selection to the selected child element
                    newSelection = cdm.getObject( appCtxService.ctx.occmgmtContext.currentState.c_uid );
                }
            } else {
                // AR inputs/overview view, set the selection to the AR
                newSelection = cdm.getObject( appCtxService.ctx.locationContext.modelObject.uid );
            }
            if( newSelection !== null ) {
                correctedSelection.push( newSelection );
            }
        }

        // get the selected attributes
        var overriddenParams = [];
        for( var j = 0; j < selectedObjects.length; ++j ) {
            var objUid = selectedObjects[ j ].props.att1SourceAttribute.dbValue;
            var attribute = cdm.getObject( objUid );

            if( attribute && attribute.props.att1InContext.dbValues[ 0 ] === '1' ) {
                overriddenParams.push( attribute );
            }

            correctedSelection.push( attribute );
        }

        appCtxService.registerCtx( 'overriddenParamsSelected', overriddenParams );

        // change the current selection
        if( correctedSelection.length > 0 ) {
            selectionService.updateSelection( correctedSelection, parentSelection );
        }
    }
};

/**
 * @param {array} selectedObjects the selected objects
 */
function _getSyncPublishCandidates( selectedObjects ) {
    var proxyMeasurableAttrs = selectedObjects;
    var syncCadidates = [];
    var publishCandidates = [];
    var unusedAttr = [];
    var inputAttr = [];
    var outputAttr = [];
    var unusedCommand = true;


    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        if( proxyMeasurableAttrs[ j ].props.att1AttrInOutStatus ) {
            var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOutStatus.dbValues[ 0 ];
            if( attrType === 'Unsynchronized' ) {
                syncCadidates.push( proxyMeasurableAttrs[ j ] );
            } else if( attrType === 'Unpublished' ) {
                publishCandidates.push( proxyMeasurableAttrs[ j ] );
            }

            var attrStatus = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValue;
            if ( attrStatus === 'unused' ) {
                unusedAttr.push( proxyMeasurableAttrs[ j ] );
            } else if ( attrStatus === 'input' ) {
                inputAttr.push( proxyMeasurableAttrs[ j ] );
            } else if ( attrStatus === 'output' ) {
                outputAttr.push( proxyMeasurableAttrs[ j ] );
            }
        }
    }
     if( unusedAttr.length > 0 && inputAttr.length === 0 && outputAttr.length === 0 ) {
        unusedCommand = false;
     }
    appCtxService.registerCtx( 'syncCandidates', syncCadidates );
    appCtxService.registerCtx( 'publishCandidates', publishCandidates );
    appCtxService.registerCtx( 'unusedCommandVisibility', unusedCommand );
}

/**
 * Get the in or out filter
 */
export let unregisterSyncPublishSelection = function() {
    appCtxService.unRegisterCtx( 'syncCandidates' );
    appCtxService.unRegisterCtx( 'publishCandidates' );
    appCtxService.unRegisterCtx( 'unusedCommandVisibility' );
};

/*
 * Corrects the command "Show Unused" selection state
 */
export let updateShowUnusedSelection = function( from, to, data ) {
    appCtxService.registerCtx( to, from );
    parammgmtUtlSvc.resetParentAccess();
};

/**
 * @param {Object} ctx the application context
 * @returns {boolean} true if the currently selected tab is Attributes in the ACE view
 */
function _onAttributesTab( ctx ) {
    if( ctx.showAttrProxyTable ) {
        return ctx.showAttrProxyTable.inAttributesTab;
    }

    // normally would avoid checking the spageId but if multiple elements are selected and the page under Content is
    //  changed, the secondaryXrtPageID does not update!
    var numSelectedElements = ctx.mselected.length;

    var numSelectedElementsCheck = numSelectedElements === 1 &&
        ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_AttributesForDCP' || numSelectedElements > 1 &&
        ctx.occmgmtContext && ctx.occmgmtContext.currentState && ctx.occmgmtContext.currentState.spageId === 'Parameters';

    return ctx.occmgmtContext && numSelectedElementsCheck;
}

/**
 * @param {appCtx} ctx the application context
 * @returns {boolean} true if search should use AR Input table
 */
function _showARInputTable( ctx ) {
    if( _onAttributesTab( ctx ) ) {
        // DCP case
        return ctx.openedARObject && ctx.openedARObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1;
    } else if( ctx.xrtSummaryContextObject ) {
        // Overview/Inputs case
        return ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1;
    }
}

/**
 * @param {appCtx} ctx the application context
 * @returns {boolean} true if search is retrieving attributes in Content tab for Occurrence
 */
function _showElementAttrTable( ctx ) {
    return _onAttributesTab( ctx );
}

/**
 * @param {appCtx} ctx the application context
 * @returns {boolean} true if search is retrieving attributes in Content tab for AR
 */
function _showElementAttrForARTable( ctx ) {
    return _onAttributesTab( ctx ) && ctx.openedARObject &&
        ctx.openedARObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1;
}

/**
 * @param {appCtx} ctx the application context
 */
function _initShowAttrProxyContext( ctx ) {
    // This is invoked when gathering the inputs for the performSearchViewmModel2 SOA.
    // Store the selected elements in case the table gets refreshed after the selection
    //  has been changed (for example, to a measurable attribute on the table).
    var selectionCtx = ctx.showAttrProxyTable;
    appCtxService.unRegisterCtx( 'showAttrProxyTable' );

    // The selection is only needed in the DCP case because we need to get the attributes
    //  for the selected elements. In the AR cases we get all the attributes on the AR,
    //  and the selection is unimportant.
    if( _showElementAttrTable( ctx ) ) {
        if( ctx.selected && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
            // Store the selected Awb0Elements in case the table is refreshed after the selection has changed
            selectionCtx = {
                selectedElements: ctx.mselected,
                inAttributesTab: _onAttributesTab( ctx )
            };
        }
        // else don't change the context
    } else {
        selectionCtx = {
            selectedElements: [],
            inAttributesTab: false
        };
    }

    appCtxService.registerCtx( 'showAttrProxyTable', selectionCtx );
}

/**
 * @param {appCtx} ctx the application context
 * @returns {string} the client scope URI
 */
export let getClientScopeURI = function( ctx ) {
    // before anything else, determine the context for the table
    _initShowAttrProxyContext( ctx );
    var clientScopeURI;
    if( _showARInputTable( ctx ) ) {
        if( isVRCreatedWithProject( ctx ) ) {
            clientScopeURI = 'ARProjectInputAttrTable';
        } else {
            clientScopeURI = 'ARInputAttrTable';
        }
    } else if( _showElementAttrTable( ctx ) ) {
        if( parammgmtUtlSvc.isTCReleaseAtLeast122() ) {
            clientScopeURI = 'ShowAttrProxyTableForDCP_TC122';
        } else {
            clientScopeURI = 'ShowAttrProxyTableForDCP';
        }
    }
    return clientScopeURI;
};

/**
 * @param {appCtx} ctx the application context
 * @returns {string} the opened object UID
 */
export let getOpenedObjectUidForDCP = function( ctx ) {
    var openedObjectUid;
    if( _showElementAttrForARTable( ctx ) ) {
        // AR DCP case
        openedObjectUid = ctx.openedARObject.uid;
    } else if( _showARInputTable( ctx ) ) {
        // Overview/Inputs case
        openedObjectUid = ctx.xrtSummaryContextObject.uid;
    } else if( _showElementAttrTable( ctx ) ) {
        // Occurences DCP case
        openedObjectUid = ctx.occmgmtContext.openedElement.uid;
    }
    return openedObjectUid;
};

/**
 * @param {appCtx} ctx the application context
 * @returns {string} list of parent UIDS separated by whitespace
 */
export let getParentUids = function( ctx ) {
    var parentUids = '';
    if( _showElementAttrTable( ctx ) ) {
        // DCP case
        var selections = ctx.showAttrProxyTable.selectedElements;
        var selectedUids = '';
        for( var i = 0; i < selections.length; i++ ) {
            selectedUids = selectedUids.concat( selections[ i ].uid, ' ' );
        }
        parentUids = selectedUids.trim();
    }
    return parentUids;
};

/**
 * @param {appCtx} ctx the application context
 * @param {string} showInOut the "show in/out" internal value
 * @returns {string} the "show in/out" search parameter value
 */
export let getShowInOut = function( ctx, showInOut ) {
    //unregister sync and publish status every time when loading the attribute table of AR.
    appCtxService.unRegisterCtx( 'syncCandidates' );
    appCtxService.unRegisterCtx( 'publishCandidates' );
    appCtxService.unRegisterCtx( 'unusedCommandVisibility' );


    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_OutputForDCP' ) {
        showInOut = 'out';
    } else {
        showInOut = '';
    }

    return showInOut;
};

/**
 * Get the opened object uid. Return nothing if the parentUids return a openedObjectUid that will should have
 * attribute data. If openedObjectUid is empty it will show user an error.
 *
 * @param {Object} ctx the application context
 * @param {Array} parentUids the parent UIDs
 * @return {String} the opened object UID
 */
export let getOpenedObjectUidForInterfaceDefs = function( ctx, parentUids ) {
    if( parentUids === null || parentUids === undefined || parentUids.length === 0 ) {
        return ctx.selected.uid;
    }

    return attrTableUtils.getOpenedObjectUid();
};

var isVRCreatedWithProject = function( ctx ) {
    if( ctx.selected.props.crt0Domain && ctx.selected.props.crt0Domain.dbValues[ 0 ] !== null ) {
        var uid = ctx.selected.props.crt0Domain.dbValues[ 0 ];
        var crt0DomainObj = cdm.getObject( uid );
        if( crt0DomainObj.type === 'Att0ParamProject' ) {
            return true;
        }
    }

    return false;
};
export let getColumnFilters = function( data ) {
    if( appCtxService.ctx.paramTableColumnFilters ) {
        data.columnProviders.showAttrProxyColumnProvider.columnFilters = appCtxService.ctx.paramTableColumnFilters;
    }
    return data.columnProviders.showAttrProxyColumnProvider.columnFilters;
};

/**
 * @param {appCtx} ctx the application context
 * @returns {string} list of parent UIDS separated by whitespace
 */
export let isVROrStudyOverviewPageOpened = function( ctx ) {
    var isVROrStudyOverviewPageOpened = 'false';
if( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
    isVROrStudyOverviewPageOpened = 'True';
}
    return isVROrStudyOverviewPageOpened;
};

export let clearProviderSelection = function( data ) {
    if(data && data.dataProviders)
    {
        var dataProvider = data.dataProviders.showAttrProxyTableProvider;
        if(dataProvider)
        {
            dataProvider.selectNone();
        }
    }
};

/**
 * Returns the Att1AttrProxyTableService instance
 *
 * @member Att1AttrProxyTableService
 */

export default exports = {
    changeSelectionToAttribute,
    unregisterSyncPublishSelection,
    updateShowUnusedSelection,
    getClientScopeURI,
    getOpenedObjectUidForDCP,
    getParentUids,
    getShowInOut,
    getOpenedObjectUidForInterfaceDefs,
    getColumnFilters,
    isVROrStudyOverviewPageOpened,
    clearProviderSelection
};
app.factory( 'Att1AttrProxyTableService', () => exports );
