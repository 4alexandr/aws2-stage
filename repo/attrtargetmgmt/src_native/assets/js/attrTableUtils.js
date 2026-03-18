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
 * @module js/attrTableUtils
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import cmdMapSvc from 'js/commandsMapService';
import msgSvc from 'js/messagingService';
import dmSvc from 'soa/dataManagementService';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Gets space separated UIDs sting for PWA select elements.
 *
 * @returns {String} the list of parent UIDs separated by " "
 */
export let getSelectedElementUids = function() {
    var parentUids = '';
    var isAttrmultipleParentSelected = false;
    if( appCtxSvc.ctx.mselected && appCtxSvc.ctx.mselected.length > 0 ) {
        isAttrmultipleParentSelected = true;
        parentUids = appCtxSvc.ctx.mselected[ 0 ].uid;
        for( var i = 1; i < appCtxSvc.ctx.mselected.length; i++ ) {
            parentUids = parentUids.concat( '#', appCtxSvc.ctx.mselected[ i ].uid );
        }
    }
    appCtxSvc.registerCtx( 'isAttrmultipleParentSelected', isAttrmultipleParentSelected );

    return parentUids;
};

/**
 * @returns {String} the opened object UID
 */
export let getOpenedObjectUid = function() {
    var openedObjectUid = '';
    var stateSvc = AwStateService.instance;
    if( stateSvc && stateSvc.params ) {
        var params = stateSvc.params;
        if( params.s_uid ) {
            openedObjectUid = params.s_uid;
        } else if( params.uid ) {
            openedObjectUid = params.uid;
        } else if( appCtxSvc.ctx.sublocation && appCtxSvc.ctx.sublocation.nameToken === 'com.siemens.splm.client.search:SearchResultsSubLocation' &&
            appCtxSvc.ctx.selected ) {
            openedObjectUid = appCtxSvc.ctx.selected.uid;
        }
    }
    return openedObjectUid;
};

/**
 * @param {Array} createdObjects the created objects
 * @returns {boolean} true if any created objects are measurable attributes
 */
function _areAnyCreatedObjsAttrType( createdObjects ) {
    if( createdObjects ) {
        for( var j = 0; j < createdObjects.length; ++j ) {
            if( cmdMapSvc.isInstanceOf( 'Att0MeasurableAttribute', createdObjects[ j ].modelType ) ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Evaluates if a measurable attribute has been created and publishes an event to refresh
 * the UI if so.
 *
 * @param {Object} eventMap the event map
 * @param {Object} refreshEvent an event to publish if the UI needs to be refreshed
 */
export let isAttrItemCreated = function( eventMap, refreshEvent ) {
    var doRefresh = false;

    if( eventMap ) {
        var created = eventMap[ 'cdm.created' ];
        if( created ) {
            var createdObjects = created.createdObjects;
            doRefresh = _areAnyCreatedObjsAttrType( createdObjects );
        }
    }
    if( doRefresh ) {
        if( refreshEvent ) {
            eventBus.publish( refreshEvent );
        } else {
            eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
        }
    }
};

export let unRegisterCtxForMapTable = function() {
    appCtxSvc.unRegisterCtx( 'parammgmtctx' );
    appCtxSvc.unRegisterCtx( 'selectedProxyObjects' );
};

export let unRegisterCtxForProxyTable = function() {
    appCtxSvc.unRegisterCtx( 'parammgmtctx' );
    appCtxSvc.unRegisterCtx( 'selectedAttrProxyObjects' );
};

/**
 * Checks if refresh required with given input data.
 * @param {object} isAbsOccDataUpdated - OccData
 * @param {object} attrUpdated - updated attribute
 * @param {object} proxyUpdated - updated measure value
 * @param {object} valueUpdated - updated measure value
 * @param {object} doRefresh - true if refresh required
 * @return doRefresh
 */
function _isDataUpdated( isAbsOccDataUpdated, attrUpdated, proxyUpdated, valueUpdated, doRefresh ) {
    doRefresh = isAbsOccDataUpdated && attrUpdated > 0;
    if( !doRefresh ) {
        doRefresh = attrUpdated > proxyUpdated && proxyUpdated > 0;
        if( !doRefresh ) {
            doRefresh = valueUpdated > proxyUpdated && proxyUpdated > 0;
        }
    }

    return doRefresh;
}

/**
 * Publish Refresh event
 */
function publishRefreshEvent( refreshEvent ) {
    if( refreshEvent ) {
        eventBus.publish( refreshEvent );
    } else {
        eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
    }
}

/**
 * Evaluates if a measurable attribute has been overriden by a copy and publishes an event to refresh
 * the UI if so.
 *
 * @param {Object} eventMap the event map
 * @param {Object} refreshEvent an event to publish if the UI needs to be refreshed
 */
export let isAttrItemUpdated = function( eventMap, refreshEvent ) {
    var doRefresh = false;

    if( eventMap ) {
        var updated = eventMap[ 'cdm.updated' ];
        if( updated ) {
            var updatedObjects = updated.updatedObjects;
            var isAbsOccDataUpdated = false;
            var attrUpdated = 0;
            var valueUpdated = 0;
            var proxyUpdated = 0;

            if( updatedObjects ) {
                for( var i = 0; i < updatedObjects.length; ++i ) {
                    if( cmdMapSvc.isInstanceOf( 'AbsOccData', updatedObjects[ i ].modelType ) ) {
                        isAbsOccDataUpdated = true;
                    } else if( cmdMapSvc.isInstanceOf( 'Att0MeasurableAttribute', updatedObjects[ i ].modelType ) ) {
                        ++attrUpdated;
                    } else if( cmdMapSvc.isInstanceOf( 'Att0MeasureValue', updatedObjects[ i ].modelType ) ) {
                        ++valueUpdated;
                    } else if( cmdMapSvc.isInstanceOf( 'Att1AttributeAlignmentProxy', updatedObjects[ i ].modelType ) ) {
                        ++proxyUpdated;
                    }
                }
                // The table should be refreshed if the attribute is copied for attribute element,
                // so that correct values are rendered in table.
                // This is implied via more attributes being updated than the proxy objects.
                // It is actually a work-around and DCP should ideally be rendered correctly without table refresh.

                doRefresh = _isDataUpdated( isAbsOccDataUpdated, attrUpdated, proxyUpdated, valueUpdated, doRefresh );
            }
        }
    }

    if( doRefresh ) {
        publishRefreshEvent( refreshEvent );
    }
};

/**
 * When a measurable attribute is selected in the table, evaluates if the attribute needs its opened context
 * property updated.
 *
 * @param {Object} eventMap the event map
 */
export let onAttrSelection = function( eventMap ) {
    if( eventMap ) {
        var eventData = eventMap[ 'mappedAttrTable.gridSelection' ];
        if( !eventData ) {
            eventData = eventMap[ 'showAttrProxyTable.gridSelection' ];
        }
        if( !eventData ) {
            eventData = eventMap[ 'interfaceDefAttrsTable.gridSelection' ];
        }
        if( !eventData ) {
            return;
        }

        // only care about single selection case
        if( !eventData.selectedObjects || eventData.selectedObjects.length !== 1 ) {
            return;
        }

        var treeNode = eventData.selectedObjects[ 0 ];
        if( !cmm.isInstanceOf( 'Att1AttributeAlignmentProxy', treeNode.modelType ) ) {
            return;
        }

        // if the opened context is null, set it to the selected proxy
        // if it is not null, then it was already set on the server
        var measurableAttr = cdm.getObject( treeNode.props.att1SourceAttribute.dbValues[ 0 ] );
        if( measurableAttr.props.att1OpenedContext === null ) {
            dmSvc.setProperties( [ {
                object: measurableAttr,
                vecNameVal: [ {
                    name: 'att1OpenedContext',
                    values: [ treeNode.uid ]
                } ]
            } ] ).then( function( response ) {
                if( response && response.ServiceData && response.ServiceData.updated && response.ServiceData.updated.length === 0 ) {
                    logger.error( 'error occured while updating measurable attribute opened context' );
                }
            } );
        }
    }
};

/**
 * @param {Object} object the array
 * @returns {boolean} true if the array is populated
 */
function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

/**
 * @param {Array} nonModifiableObjects the array of non-modifiable objects
 * @param {Object} data the data object
 */
export let displayErrorMessage = function( nonModifiableObjects, data ) {
    if( _isArrayPopulated( nonModifiableObjects.nonModifialbleAttributesList ) ) {
        // Build Success part   Need to get both numbers
        var msg = data.i18n.multipleMappingSuccessful.replace( '{0}',
            nonModifiableObjects.nonModifialbleAttributesList.number_selected -
            nonModifiableObjects.nonModifialbleAttributesList.length );
        msg = msg.replace( '{1}', nonModifiableObjects.nonModifialbleAttributesList.number_selected );

        // need to loop though list that could not be mapped and build string
        var errorString = msg + '<br>';
        for( var idx = 0; idx < nonModifiableObjects.nonModifialbleAttributesList.length; ++idx ) {
            var failMsg = data.i18n.mapFailure.replace( '{0}',
                nonModifiableObjects.nonModifialbleAttributesList.AttributeNames[ idx ] );
            errorString = errorString + failMsg + '<br>';
        }

        // Add service to pump out message.
        msgSvc.showError( errorString );
    }
};

/**
 * @param {Object} newColumnConfig New conlumn config returned by the SOA getTableViewModelProperties
 * @param {Object} uwDataProvider The Data Provider object
 */
export let updateParamTreeColumns = function( newColumnConfig, uwDataProvider ) {
    if( uwDataProvider && newColumnConfig ) {
        uwDataProvider.columnConfig = newColumnConfig;

        for( var idx = 0; idx < newColumnConfig.columns.length; ++idx ) {
            uwDataProvider.columnConfig.columns[ idx ].typeName = newColumnConfig.columns[ idx ].associatedTypeName;
        }
    }
};
/**
 *Select attribute from table
 *
 * @param {Object} data the data object
 */
export let selectMappedAttrTableRow = function( data ) {
    var dataProvider = data.dataProviders.gridDataProvider;
    var selModel = dataProvider.selectionModel;
    var vmObjects = dataProvider.viewModelCollection.loadedVMObjects;
    var paramids = data.eventData.paramid;
    paramids = paramids.split( ',' );
    var objToSelect = [];
    for( var object in vmObjects ) {
        if( vmObjects[ object ].props && vmObjects[ object ].props.att1SourceAttribute.dbValue  ) {
            if( paramids.includes( vmObjects[ object ].props.att1SourceAttribute.dbValue ) ) {
                objToSelect.push( vmObjects[ object ] );
            }
        }
    }
    if( objToSelect.lenght !== 0 ) {
        selModel.setSelection( objToSelect );
    }
};

/**
 * Returns the attrTableUtils instance
 *
 * @member attrTableUtils
 */

export default exports = {
    getSelectedElementUids,
    getOpenedObjectUid,
    isAttrItemCreated,
    isAttrItemUpdated,
    onAttrSelection,
    displayErrorMessage,
    updateParamTreeColumns,
    selectMappedAttrTableRow,
    unRegisterCtxForMapTable,
    unRegisterCtxForProxyTable
};
app.factory( 'attrTableUtils', () => exports );
