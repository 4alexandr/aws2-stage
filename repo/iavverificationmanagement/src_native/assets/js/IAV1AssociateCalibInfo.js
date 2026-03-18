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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/IAV1AssociateCalibInfo
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import ClipboardService from 'js/clipboardService';
import reqUtils from 'js/requirementsUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};
var parentData = {};
var modelObjectsList = [];

/**
 * get Revision Object.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {Object} Revision Object
 */
var _getRevisionObject = function( obj ) {
    return cdm.getObject( obj.uid );
};

/**
 * Add in Data provide List.
 *
 * @param {Object} dataProvider - The data provider
 * @param {Object} newObj - The new object to be added
 * @returns {Boolean} is object added in data provider list
 */
var _addInDataProvider = function( dataProvider, newObj ) {
    dataProvider.dbValue.push( newObj );
    modelObjectsList.push( newObj );
    return true;
};

/**
 * Remove given object from provider list.
 *
 * @param {Object} dataProvider - The view model dataProvider
 * @param {Object} obj - The object to be removed
 * @returns {Boolean} is object removed from data provider list
 */
var _removeFromDataProvider = function( dataProvider, obj ) {

    if( obj ) {
        for( var i = dataProvider.dbValue.length - 1; i >= 0; i-- ) {
            dataProvider.dbValue.splice( i, 1 );
        }
    }
    return true;
};

/**
 * Add in Object List.
 *
 * @param {Object} data - The view model data
 * @param {Object} newObjs - objects to be added in End Item list
 * @param {Object} data - Existing(Start/End) objects list
 * @param {Object} data - Other objects list
 * @returns {boolean} isAdded - is added in list
 */
var _addInObjectList = function( data, destObjectList, otherObjectList, newObjs ) {

    for( var i = 0; i <= newObjs.length - 1; i++ ) {
        var newObj = _getRevisionObject( newObjs[ i ] );
        if( newObj ) {
            _addInDataProvider( destObjectList, newObjs[ i ] );
        }
    }

    var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];

    reqUtils.loadModelObjects( destObjectList.dbValue, cellProp ).then( function() {
        eventBus.publish( "CreateTracelink.refreshStartItemList" );
        eventBus.publish( "CreateTracelink.refreshEndItemList" );
    } );

    return true;
};

/**
 * Remove given object from Start Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} obj - The Object to be removed from Start Item list
 */
export let removeFromStartItems = function( data, obj ) {
    if( obj ) {
        _removeFromDataProvider( data.startItems, obj );
    }
};

/**
 * Remove given object from End Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} obj - Object to be removed
 */
export let removeFromEndItems = function( data, obj ) {
    if( obj ) {
        _removeFromDataProvider( data.endItems, obj );
    }
};

/**
 * Paste In End Item List.
 *
 * @param {Object} data - The view model data
 */
export let pasteInStartItems = function( data ) {

    var clipboardObjects = ClipboardService.instance.getContents();

    if( clipboardObjects && clipboardObjects.length > 0 ) {
        _addInObjectList( data, parentData.startItems, parentData.endItems, clipboardObjects );
    }
};

/**
 * Paste In End Item List.
 *
 * @param {Object} data - The view model data
 */
export let pasteInEndItems = function( data ) {

    var clipboardObjects = ClipboardService.instance.getContents();

    if( clipboardObjects && clipboardObjects.length > 0 ) {
        _addInObjectList( data, parentData.endItems, parentData.startItems, clipboardObjects );
    }

};

/**
 * Generate json input data for create tracelink
 *
 * @param {Object} primaryObject - Defining Object
 * @param {Object} secondaryObject - Complying Object
 * @param {String} tracelinkType - Tracelink type
 * @param {Array} propNameValues - Properties
 * @return {Object} input data for trace link creation
 */
var _generateInputforCreateTraceLink = function( primaryObject, secondaryObject, propNameValues ) {

    var primary = _getObjects( primaryObject );
    var secondary = _getObjects( secondaryObject );
    var tracelinkType = "IAV0VerificationTL";
    var requestPref = {};

    var objInput = {
        "clientId": "",
        "tracelinkCreateInput": {
            "boName": tracelinkType,
            "propertyNameValues": propNameValues,
            "compoundCreateInput": {}
        },
        "primaryObj": {
            "uid": primary.uid,
            "type": primary.type
        },
        "secondaryObj": {
            "uid": secondary.uid,
            "type": secondary.type
        },
        "requestPref": requestPref
    };

    return objInput;

};

/**
 * Get input data for trace link creation
 *
 * @param {Object} items - start or end item list
 * @return {Array} updated item list
 */
var _processItemList = function( items ) {

    var updatedItems = items.slice( 0 );
    return updatedItems;

};
/**
 * Get input data for trace link creation in ACE
 *
 * @param {Object} data - The panel's view model object
 * @return {Array} input data for trace link creation
 */
export let getCreateTraceLinkInput = function( data ) {
    var arrInput = [];

    var startItemsRev = _processItemList( data.startItems.dbValue );
    var endItemsRev = _processItemList( data.endItems.dbValue );

    var primaryObject = startItemsRev[ 0 ];
    var secondaryObject = endItemsRev[ 0 ];

    //var objInput = _getCreateTraceLinkInput(data, primaryObject, secondaryObject);
    var propNameValues = {};
    var objInput = _generateInputforCreateTraceLink( primaryObject, secondaryObject, propNameValues );

    arrInput.push( objInput );
    return arrInput;
};

/**
 * Init Start Item List Types
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context
 */
export let initStartItemList = function( data, ctx ) {

    //_iav1TracelinkService.resetToggleType();
    ctx.createTraceLinkWorkSpace = {};

    parentData = data;
    modelObjectsList = [];

    var cellProp = [ 'awp0CellProperties', 'awb0UnderlyingObject' ];

    // Get selected objects from the app context
    modelObjectsList = JSON.parse( JSON.stringify( ctx.mselected ) );

    parentData.startItems.dbValue = JSON.parse( JSON.stringify( modelObjectsList ) );

    var arrModelObjs = parentData.startItems.dbValue;

    reqUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
        setTimeout( function() {
            eventBus.publish( "CreateTracelink.refreshStartItemList" );
            eventBus.publish( "CreateTracelink.refreshEndItemList" );
        }, 500 );

    } );

    // Pin the panel when open
    exports.setPin( data, ctx.createTraceLinkWorkSpace );

    //data.modelProperty = {};

};

/**
 * Add in Start Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} newObjs - objects to be added in Start Item list
 */
var _addInStartItemList = function( data, newObjs ) {

    data.multipleSelectionStart = false;

    if( newObjs.length === 1 && ( newObjs[ 0 ].modelType.typeHierarchyArray.indexOf( 'PhysicalPartRevision' ) > -1 || newObjs[ 0 ].modelType.typeHierarchyArray.indexOf( 'Sam1AsMaintainedElement' ) > -1 ) ) {
        var isAdded = false;
        isAdded = _addInObjectList( data, parentData.startItems, parentData.endItems, newObjs );
        if( isAdded ) {
            parentData.activeView = "IAV1AssociateCalibInfoSub";
        }
    } else {
        data.multipleSelectionStart = true;
    }

};

/**
 * Add in End Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} newObjs - objects to be added in End Item list
 */
var _addInEndItemList = function( data, newObjs ) {

    data.multipleSelectionEnd = false;

    if( newObjs.length === 1 && newObjs[ 0 ].modelType.typeHierarchyArray.indexOf( 'IAV0CalibDataRevision' ) > -1 ) {
        var isAdded = false;
        isAdded = _addInObjectList( data, parentData.endItems, parentData.startItems, newObjs );

        if( isAdded ) {
            parentData.activeView = "IAV1AssociateCalibInfoSub";
        }
    } else {
        data.multipleSelectionEnd = true;
    }

};

/**
 * Add in Start/End Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} newObjs - objects to be added in respective Item list
 */
export let addInItemList = function( data, newObjs ) {
    if( parentData.addInStartItemList ) {
        _addInStartItemList( data, newObjs );
    } else if( parentData.addInEndItemList ) {
        _addInEndItemList( data, newObjs );
    }
};

/**
 * Post create Link.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @event RM.PostTraceLinkCreated event
 */
export let postCreateTracelink = function( data ) {

    var arrObjs = [];
    if( data.outputCreateRelation ) {
        for( var i = 0; i < data.outputCreateRelation.length; i++ ) {

            var objCreated = data.outputCreateRelation[ i ].tracelinkObject;

            if( objCreated ) {
                arrObjs.push( objCreated );
            }
        }
    }
    data.createdObject = arrObjs;
    var eventData = {
        relationObjects: arrObjs,
        startItems: data.startItems.dbValue,
        endItems: data.endItems.dbValue
    };
    eventBus.publish( "RM.PostTraceLinkCreated", eventData );
};

/**
 * set the pin on the data
 *
 * @param {Object} - Data
 * @param {object} - Context Object
 * @return {Object} The model object
 */
export let setPin = function( data, ctx ) {
    data.isPanelPinned.dbValue = true;

    if( ctx ) {
        ctx.isPanelPinned = true;
        ctx.modelObjects = modelObjectsList;
    }
};

/**
 * set unpin on the data
 *
 * @param {Object} - Data
 * @param {object} - Context Object
 * @return {Object} the model object
 */
export let setUnPin = function( data, ctx ) {
    data.isPanelPinned.dbValue = false;

    if( ctx ) {
        ctx.isPanelPinned = false;
        ctx.modelObjects = [];
    }
};

/**
 * Fire an event to navigate to the Add Item panel
 * @param {Object} - Data
 * @event awPanel.navigate event
 */
var _navigateToAddPanel = function( data ) {

    var destPanelId = "IAV1AssociateCalibInfoAddItemPanelSub";
    var activePanel = parentData.getSubPanel( data.activeView );
    if( activePanel ) {
        activePanel.contextChanged = true;
    }

    var addTitle = "";
    if( data.addInStartItemList ) {
        addTitle = data.i18n.addInStartBucket;
    } else {
        addTitle = data.i18n.addInEndBucket;
    }
    var context = {
        destPanelId: destPanelId,
        title: addTitle,
        supportGoBack: true,
        recreatePanel: true,
        isolateMode: true
    };

    eventBus.publish( "awPanel.navigate", context );
};

/**
 * Navigate to the Add Properties panel for Start Item List
 * @param {Object} data - the viewmodel data for this panel
 */
export let openAddPanelForStartItemList = function( data ) {
    parentData.addInStartItemList = true;
    parentData.addInEndItemList = false;
    _navigateToAddPanel( data );
};

/**
 * Navigate to the Add Properties panel for End Item List
 * @param {Object} data - the viewmodel data for this panel
 */
export let openAddPanelForEndItemList = function( data ) {
    parentData.addInStartItemList = false;
    parentData.addInEndItemList = true;
    _navigateToAddPanel( data );
};

var lastContext = {
    getClipboardProvider: null,
    getFavoriteProvider: null,
    getRecentObjsProvider: null
};

/**
 * This function handles selection from any of the clipboard/favorites/recent dataProvider on palette tab
 * @param {Object} ctx - ctx
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} dataProviderId - palette data provide ID
 * @param {Object} context - selected objects on clipboard/favorites/recent dataProvider on palette tab
 */
export let handlePaletteSelection = function( ctx, data, dataProviderId, context ) {
    if( context._refire ) { return; }
    var dataProviderSet = Object.keys( lastContext );
    lastContext[ dataProviderId ] = context;
    var otherDataProviders = _.pull( dataProviderSet, dataProviderId );

    // Clear the selections on other two sections
    if( context.selectedObjects.length > 0 ) {
        for( var i = 0; i < otherDataProviders.length; i++ ) {
            if( ctx[ otherDataProviders[ i ] ] !== undefined ) {
                var dp = ctx[ otherDataProviders[ i ] ];
                if( dp.selectedObjects.length > 0 ) {
                    dp.selectionModel.setSelection( [] );
                }
            }
        }
        data.paletteSelection = context.selectedObjects;
    }
};

/**
 * Get selected objects from palette/search tab.
 * @param {Object} ctx - ctx
 * @param {Object} data - the viewmodel data for this panel
 * @returns {Array} selected objects from palette/search tab
 */
export let getSelectionAddPanel = function( ctx, data ) {

    var paletteSelection = [];
    data.errorMultipleSelection = false;

    if( data.selectedTab.panelId === "paletteTabPageSub" ) {

        if( ctx.getClipboardProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getClipboardProvider.selectedObjects;
        } else if( ctx.getFavoriteProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getFavoriteProvider.selectedObjects;
        } else if( ctx.getRecentObjsProvider.selectedObjects.length > 0 ) {
            paletteSelection = ctx.getRecentObjsProvider.selectedObjects;
        }
    } else if( data.searchSelection ) {
        paletteSelection = data.searchSelection;
    }

    return paletteSelection;

};

/**
 * Clear search results on search panel.
 * @param {Object} data - the viewmodel data for this panel
 */
export let clearSearchResult = function( data ) {
    data.dataProviders.performSearchInContext.viewModelCollection.clear();
    if( data.dataProviders.performSearch ) {
        data.dataProviders.performSearch.viewModelCollection.clear();
    }
};

/**
 * Set the selected objects on search panel.
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} selectedObjects - selected objects on search results
 */
export let handleSearchSelection = function( data, selectedObjects ) {
    if( data && selectedObjects ) {
        data.searchSelection = selectedObjects;
    }
};

/**
 * This function returns the Item from ItemRevision.
 *
 * @param {String} uid - uid of an Item Revision.
 * @returns {Object} Item Object.
 */
var _getObjects = function( itemRev ) {

    var item = null,
        selected = null,
        mObject = null,
        obj = {};

    if( itemRev.modelType.typeHierarchyArray.indexOf( 'PhysicalPartRevision' ) > -1 || itemRev.modelType.typeHierarchyArray.indexOf( 'IAV0CalibDataRevision' ) > -1 ) {

        mObject = cdm.getObject( itemRev.uid );
        selected = mObject.props.items_tag.dbValues[ 0 ];

    } else if( itemRev.modelType.typeHierarchyArray.indexOf( 'Sam1AsMaintainedElement' ) > -1 ) {

        var uid = itemRev.props.awb0UnderlyingObject.dbValues[ 0 ];
        mObject = cdm.getObject( uid );
        selected = mObject.props.items_tag.dbValues[ 0 ];

    }

    item = cdm.getObject( selected );
    obj = {
        type: item.type,
        uid: item.uid
    };
    return obj;
};

export default exports = {
    removeFromStartItems,
    removeFromEndItems,
    pasteInStartItems,
    pasteInEndItems,
    getCreateTraceLinkInput,
    initStartItemList,
    addInItemList,
    postCreateTracelink,
    setPin,
    setUnPin,
    openAddPanelForStartItemList,
    openAddPanelForEndItemList,
    handlePaletteSelection,
    getSelectionAddPanel,
    clearSearchResult,
    handleSearchSelection
};
/**
 * Create Trace Link panel service utility
 *
 * @memberof NgServices
 * @member Arm0ExportToOfficeApp
 */
app.factory( 'IAV1AssociateCalibInfo', () => exports );
