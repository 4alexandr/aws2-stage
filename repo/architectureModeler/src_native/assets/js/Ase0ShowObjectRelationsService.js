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
 * Service to provide utility methods to support showing Object Relations panel
 *
 * @module js/Ase0ShowObjectRelationsService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Filters the other end objects based on the property value match
 *
 * @param {Array} viewModelObjs - list of view model objects of other end objects
 * @param {String} filter - filter text
 * @return {Array} filtered list of view model objects
 */
export let checkFilter = function( viewModelObjs, filter ) {
    var rData = [];
    var filterText;
    if( !_.isEmpty( filter ) ) {
        filterText = filter.toLocaleLowerCase().replace( /\\|\s/g, "" );
    }

    _.forEach( viewModelObjs, function( viewModelObj ) {
        if( filterText ) {
            var modelObj = cdm.getObject( viewModelObj.uid );
            // We have a filter, don't add nodes unless the filter matches a cell property
            var cellProps = modelObj.props.awp0CellProperties.dbValues;
            _.forEach( cellProps, function( property ) {
                var tmpProperty = property.toLocaleLowerCase().replace( /\\|\s/g, "" );
                if( tmpProperty.indexOf( filterText ) > -1 ) {
                    // Filter matches a property, add node to output elementList and go to next node
                    rData.push( viewModelObj );
                    return false;
                }
            } );
        } else {
            // No filter, just add the node to output elementList
            rData.push( viewModelObj );
        }
    } );
    return rData;
};

/**
 * Return true for processing connection
 *
 * @param {Object} data decl view model object - The declarative view model object
 * @return {Boolean} is connection tab active
 */
export let isProcessConnection = function( data ) {
    var isConnectionTabActive = 'false';
    if( data.selectedTab && data.selectedTab.tabKey && data.selectedTab.tabKey === 'connections' ) {
        isConnectionTabActive = 'true';
    }
    return isConnectionTabActive;
};

/**
 * Return true for processing tracelink
 *
 * @param {Object} data decl view model object - The declarative view model object
 * @return {Boolean} true for processing tracelink
 */
export let isProcessTracelink = function( data ) {
    var isProcessTracelinkTab = 'false';
    if( data.selectedTab && data.selectedTab.tabKey && data.selectedTab.tabKey === 'tracelinks' ) {
        isProcessTracelinkTab = 'true';
    }
    return isProcessTracelinkTab;
};

/**
 * update current selected tab
 *
 * @param {Object} data - The declarative data view model object
 */
export let updateTabSelection = function( data ) {
    var relCtx = appCtxSvc.ctx.ArchitectureRelationCtx;
    if( relCtx && relCtx.activeTab && relCtx.activeTab !== data.selectedTab.tabKey && data.lastSelectedTab ) {
        var tab = {
            "tabKey": relCtx.activeTab
        };
        eventBus.publish( "awTab.setSelected", tab );
    } else {
        setSelectedTab( data.selectedTab.tabKey );
    }
    data.lastSelectedTab = false;
};
export let setLastSelectedTab = function( data ) {
    var relCtx = appCtxSvc.ctx.ArchitectureRelationCtx;
    if( relCtx && relCtx.activeTab ) {
        data.lastSelectedTab = true;
    } else {
        setSelectedTab( data.preferences.AWC_Relations_Panel_Tabs[ 0 ] );
    }
};

var setSelectedTab = function( selectedTab ) {
    if( appCtxSvc.getCtx( 'ArchitectureRelationCtx' ) ) {
        appCtxSvc.updatePartialCtx( "ArchitectureRelationCtx.activeTab", selectedTab );
    } else {
        appCtxSvc.registerCtx( "ArchitectureRelationCtx", {
            "activeTab": selectedTab
        } );
    }
};

/**
 * Process the response and extract the relations from the related model objects
 * Filter and return list of related data
 *
 * @param {Object} data - response from SOA
 */
export let processSoaResponseFunc = function( data ) {
    var rData = [];
    if( data.searchResults && data.searchResults.objects ) {
        rData = data.searchResults.objects;
    }
    data.relatedDataList.dbValue = rData;
    data.relatedDataFilterList.dbValue = data.relatedDataList.dbValue;
};

/**
 * Filter and return list of related data
 *
 * @param {Object} data - The view model data
 */
export let actionFilterList = function( data ) {
    // maintaining list of original data
    var rData = data.relatedDataList.dbValue;

    var filter = "";
    if( data.filterBox && data.filterBox.dbValue ) {
        filter = data.filterBox.dbValue;
    }

    if( rData.length > 0 ) {
        //update the list based on filter criteria
        data.relatedDataFilterList.dbValue = exports.checkFilter( rData, filter );
    }
};

/**
 * update inverse selection
 *
 * @param {Object} data - The view model data
 */
export let onInverseSelection = function( data ) {
    var dataProvider = data.dataProviders.dataProviderRelatedNodeList;
    var selectionModel = dataProvider.selectionModel;
    //Toggle selection on every object in the list
    selectionModel.toggleSelection( dataProvider.viewModelCollection.getLoadedViewModelObjects() );
};

/**
 * The method joins the UIDs array (keys of elementToPCIMap) into a space-separated string/list.
 *
 * @return {String} Space seperated uids of all root elements in context
 */
export let getRootElementUids = function() {
    var uidRootElements;
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    if( aceActiveContext ) {
        if( aceActiveContext.context.elementToPCIMap ) {
            uidRootElements = Object.keys( aceActiveContext.context.elementToPCIMap ).join( " " );
        } else if( aceActiveContext.context.topElement ) {
            uidRootElements = aceActiveContext.context.topElement.uid;
        }
    }

    return uidRootElements;
};

/**
 * The method joins the UIDs array (values of elementToPCIMap) into a space-separated string/list.
 *
 * @return {String} Space seperated uids of all product context in context
 */
export let getProductContextUids = function() {
    var uidProductContexts;
    var aceActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    if( aceActiveContext ) {
        if( aceActiveContext.context.elementToPCIMap ) {
            uidProductContexts = _.values( aceActiveContext.context.elementToPCIMap ).join( " " );
        } else if( aceActiveContext.context.productContextInfo ) {
            uidProductContexts = aceActiveContext.context.productContextInfo.uid;
        }
    }
    return uidProductContexts;
};

export default exports = {
    checkFilter,
    isProcessConnection,
    isProcessTracelink,
    updateTabSelection,
    setLastSelectedTab,
    processSoaResponseFunc,
    actionFilterList,
    onInverseSelection,
    getRootElementUids,
    getProductContextUids
};
/**
 * Return an Object of Ase0ShowObjectRelationsService
 *
 * @memberof NgServices
 * @param {Object} cdm Client Data Model
 * @param {Object} appCtxSvc appCtxService
 * @return {Object} service exports exports
 */
app.factory( 'Ase0ShowObjectRelationsService', () => exports );
