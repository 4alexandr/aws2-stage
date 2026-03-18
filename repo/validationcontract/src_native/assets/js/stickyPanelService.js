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
 * @module js/stickyPanelService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import mesgSvc from 'js/messagingService';
import awDragAndDropUtils from 'js/awDragAndDropUtils';
import commandsMapService from 'js/commandsMapService';
import popupUtils from 'js/popupUtils';
import { popupService } from 'js/popupService';
import localStrg from 'js/localStorage';
import AwPromiseService from 'js/awPromiseService';
import tcVmoService from 'js/tcViewModelObjectService';
import { DOMAPIs as dom } from 'js/domUtils';
import createAnalysisRequest from 'js/createAnalysisRequest';
import manageVerificationService from 'js/manageVerificationService';

var exports = {};
var _sideNavEventSub;
var _locationCompleteEventSub;
var ITEM_LIST = 'stickyPanelList';
var _loadingTracelinkPopup = false;
var _popupRef;
var parentData = {};
var modelObjectsList = [];

export const dragOverCustomHighlight = ( dragAndDropParams ) => {
    let sourceObjects = awDragAndDropUtils.getCachedDragData();
    var draggedObjects = [];
    sourceObjects.uidList.forEach( uid => {
        draggedObjects.push( cdm.getObject( uid ) );
    } );
    var isValidSourceType = false;
    for( let i = 0; i < draggedObjects.length; i++ ) {
        isValidSourceType = _isOccurence( draggedObjects[ i ] ) || _isWorkspceObject( draggedObjects[ i ] );
        if( !isValidSourceType ) {
            break;
        }
    }
    var isListItem = dragAndDropParams.targetElement.classList.contains( 'aw-widgets-cellListItem' );
    var dropTarget;
    if( isListItem ) {
        dropTarget = dragAndDropParams.targetElement.parentElement.parentElement.parentElement.parentElement;
    } else {
        dropTarget = dragAndDropParams.targetElement;
    }
    if( isValidSourceType ) {
        dragAndDropParams.callbackAPIs.highlightTarget( {
            isHighlightFlag: true,
            targetElement: dropTarget
        } );
        return {
            preventDefault: true,
            dropEffect: 'copy'
        };
    }
    return {
        dropEffect: 'none'
    };
};

export const dropCustomHighlight = ( dragAndDropParams ) => {
    let sourceObjects = awDragAndDropUtils.getCachedDragData();
    var targetObject = {
        targetObjectViewId: dragAndDropParams.declViewModel.getViewId()
    };
    if( targetObject.targetObjectViewId === 'Crt1ObjectListToAddInVR' ) {
        targetObject.uid = 'stickyPanelList';
    } else {
        clearCachedDragDropData();
        return {
            preventDefault: false
        };
    }
    var draggedObjects = [];
    sourceObjects.uidList.forEach( uid => {
        draggedObjects.push( cdm.getObject( uid ) );
    } );
    pasteObjectsInList( targetObject, draggedObjects );

    clearCachedDragDropData();
    return {
        preventDefault: true
    };
};
const clearCachedDragDropData = () => {
    awDragAndDropUtils._clearCachedData();
};

/**
 * Check Is Occurence.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {boolean} true/false
 */
var _isOccurence = function( obj ) {
    if( commandsMapService.isInstanceOf( 'Awb0Element', obj.modelType ) ) {
        return true;
    }
    return false;
};
var _isWorkspceObject = function( obj ) {
    if( commandsMapService.isInstanceOf( 'WorkspaceObject', obj.modelType ) ) {
        return true;
    }
    return false;
};
/**
 *
 */
export let unRegisterLocalStorageAndClosePopup = function( data ) {
    _.defer( function() {
        appCtxSvc.unRegisterCtx( 'CreateStickyPanelPopupCtx' );
        eventBus.unsubscribe( _sideNavEventSub );
        eventBus.unsubscribe( _locationCompleteEventSub );

        // TODO - need to pass data from commandsViewModel
        if( data && data.startItems1 && data.startItems1 ) {
            var objects = [];
            if( data.startItems1 && data.startItems1.dbValue.length > 0 ) {
                objects = objects.concat( data.startItems1.dbValue );
            }
            if( data.endItems1 && data.endItems1.dbValue.length > 0 ) {
                objects = objects.concat( data.endItems1.dbValue );
            }
            exports.removeObjectReferences( objects );
        }
        _popupRef.options.disableClose = false;
        popupService.hide( _popupRef );
        if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === "tc_xrt_Content" ) {
            eventBus.publish( 'CreateStickyPanelPopup.MoveToOriginalPage' );
        } else {
            eventBus.publish( 'Crt1ContentsTable.refreshTable' );
        }

    } );
};

/**
 *
 */
export let unRegisterLocalStorageAndClosePopup1 = function( data, isLocationChanged ) {
    _.defer( function() {
        var eventData = data.eventData;
        appCtxSvc.unRegisterCtx( 'CreateStickyPanelPopupCtx' );
        var isVROpened = false;
        var closePanel = true;
        var ctx = appCtxSvc.ctx;
        var page = appCtxSvc.ctx.state.params.pageId;
        var uid = appCtxSvc.ctx.state.processed.uid;
        if( uid !== undefined ) {
            var obj = cdm.getObject( uid );
            if( obj && obj.modelType.typeHierarchyArray.indexOf( 'Crt0ContractRevision' ) > -1 ) {
                isVROpened = true;
            }
        }
        if( isVROpened === true && page === 'tc_xrt_Content' && ctx.occmgmtContext ) {
            closePanel = false;
        }
        if( closePanel ) {
            // TODO - need to pass data from commandsViewModel
            if( data && data.startItems1 && data.startItems1 ) {
                var objects = [];
                if( data.startItems1 && data.startItems1.dbValue.length > 0 ) {
                    objects = objects.concat( data.startItems1.dbValue );
                }
                if( data.endItems1 && data.endItems1.dbValue.length > 0 ) {
                    objects = objects.concat( data.endItems1.dbValue );
                }
                exports.removeObjectReferences( objects );
            }
            _popupRef.options.disableClose = false;
            popupService.hide( _popupRef );
        }

    } );
};

/**
 * Remove reference from objects, so that those objects will be free to remove from cache on page change
 * @param {Array} objects - start and end objects
 */
export let removeObjectReferences = function( objects ) {
    objects.forEach( function( obj ) {
        if( _.isFunction( obj.removeReference ) ) {
            obj.removeReference();
        }
    } );
};
/**
 * Show popup
 * @param {Object} popupData - data to open popup panel
 */
export let showStickyPanel = function( popupData ) {
    if( !appCtxSvc.ctx.CreateStickyPanelPopupCtx && _popupRef && _popupRef.panelEl ) {
        // Don't process the call if panel loading is in process Or panel is initiated but context is not yet updated
        return;
    }
    if( !appCtxSvc.ctx.CreateStickyPanelPopupCtx && ( !_popupRef || !_popupRef.panelEl ) ) {
        _loadingTracelinkPopup = true;
        // check if aw_toolsAndInfo panel is already opened
        var ref = '#aw_toolsAndInfo';
        var referenceEl = popupUtils.getElement( popupUtils.extendSelector( ref ) );
        if( referenceEl && referenceEl.offsetHeight > 0 ) {
            popupData.options.reference = '#aw_toolsAndInfo';
        }
        popupService.show( popupData ).then( function( popupRef ) {
            _popupRef = popupRef;
            _loadingTracelinkPopup = false;
            eventBus.publish( 'CreateStickyPanelPopup.reveal' );
            _sideNavEventSub = eventBus.subscribe( 'awsidenav.openClose', function( eventData ) {
                if( eventData && eventData.id === 'aw_toolsAndInfo' ) {
                    setTimeout( function() {
                        exports.updatePopupPosition();
                    }, 300 );
                }
            } );

            _locationCompleteEventSub = eventBus.subscribe( 'LOCATION_CHANGE_COMPLETE', function() {
                setTimeout( function() {
                    exports.updatePopupPosition();
                }, 300 );
            } );
        } );
    } else {
        exports.unRegisterLocalStorageAndClosePopup();
    }
};

/**
 * Update Popup position
 */
export let updatePopupPosition = function() {
    var ref = '#aw_toolsAndInfo';
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( ref ) );
    if( !referenceEl ) {
        return;
    }
    if( referenceEl.offsetHeight <= 0 ) {
        ref = '.aw-layout-infoCommandbar';
        referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-layout-infoCommandbar' ) );
    }
    if( referenceEl ) {
        var options = _popupRef.options;
        options.userOptions.reference = ref;
        options.reference = referenceEl;
        popupService.update( _popupRef );
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
        _removeFromDataProvider( data.endItems1, obj );
        updateLocalStorageData( data );
    }
    setTimeout( () => {
        eventBus.publish( 'Refresh.stickyPanel' );
    }, 50 );
};

/**
 * Remove given object from End Item List.
 *
 * @param {Object} data - The view model data
 * @param {Object} obj - Object to be removed
 */
export let addToVR = function( data, obj ) {
    var _manageAction = 'addObject';
    var createdAR = appCtxSvc.getCtx( 'openedARObject' );
    if( createdAR === undefined ) {
        createdAR = appCtxSvc.ctx.xrtSummaryContextObject;
    }
    var elementsToAdd = data.endItems1.dbValue;
    var recipeId = '';
    var seedObjects = [];

    var manageARInputForCreateVR = createAnalysisRequest.getManageARInputForCreateVR( createdAR, _manageAction, elementsToAdd, recipeId, seedObjects );
    manageVerificationService.callManageVerificationSOA( manageARInputForCreateVR.input, manageARInputForCreateVR.pref );

    setTimeout( () => {
        eventBus.publish( 'Refresh.stickyPanel' );
    }, 50 );
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
            if( _hasSameUnderlyingRevision( dataProvider.dbValue[ i ], obj ) ) {
                dataProvider.dbValue.splice( i, 1 );
                return true;
            }
        }
    }
    return true;
};
/**
 * @param {Object} targetObject - drop target object
 * @param {Array} sourceObjects - dragged sources objects
 * @returns {Promise} Resolved when all processing is complete.
 */
export let pasteObjectsInList = function( targetObject, sourceObjects ) {
    var deferred = AwPromiseService.instance.defer();
    if( targetObject && targetObject.uid === ITEM_LIST ) {
        _addInObjectList( parentData, parentData.endItems1, parentData.startItems1, sourceObjects );
    }
    eventBus.publish( 'Refresh.stickyPanel' );
    deferred.resolve();
    return deferred.promise;
};
/**
 * Add in Object List.
 *
 * @param {Object} data - The view model data
 * @param {Object} newObjs - objects to be added in End Item list
 */
var _addInObjectList = function( data, destObjectList, otherObjectList, newObjs ) {
    data.errorManyToManyTracelink = false;
    var objectsToLoad = [];
    for( var i = 0; i <= newObjs.length - 1; i++ ) {
        var newObj = _getRevisionObject( newObjs[ i ] );
        objectsToLoad.push( newObj );
        _addInDataProvider( destObjectList, newObjs[ i ] );
    }

    // refresh the objects where has_trace_link property value is different for occurrence & revision.
    if( objectsToLoad.length > 0 ) {
        soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: objectsToLoad
        } );
    }
    var propertiesToLoad = [ 'awp0CellProperties', 'object_string' ];
    for( var ii = 0; ii <= newObjs.length - 1; ii++ ) {
        if( _isOccurence( newObjs[ ii ] ) ) {
            propertiesToLoad.push( 'awb0UnderlyingObject' );
            break;
        }
    }
    loadModelObjects( newObjs, propertiesToLoad ).then( function() {
        eventBus.publish( 'Refresh.stickyPanel' );
    } );

    return true;
};
/**
 * Add in Data provide List.
 *
 * @param {Object} dataProvider - The data provider
 * @param {Object} newObj - The new object to be added
 * @returns {Boolean} is object added in data provider list
 */
var _addInDataProvider = function( dataProvider, newObj ) {
    var flagAdd = _isExistRevObjectInArray( dataProvider.dbValue, newObj );
    var isElementSelectedFromContentPWA = isElementSelectedFromContentPWAAction( newObj );
    var isAddToVR = _isElementAddedToVR( newObj );

    if( !flagAdd && !isAddToVR && isElementSelectedFromContentPWA ) {
        var obj = cdm.getObject( newObj.uid );
        dataProvider.dbValue.push( obj );
        modelObjectsList.push( obj );
        return true;
    }
    return false;
};

/**
 * Is Object added to VR
 *
 * @param {Object} objToSearch - The object to search
 * @returns {Boolean} is object Exist in data provider list
 */
var isElementSelectedFromContentPWAAction = function( objToSearch ) {
    var isAddedToVR = false;
    var modelObj = cdm.getObject( objToSearch.uid );
    if( modelObj.props.crt1AddedToAnalysisRequest) {
        isAddedToVR = true;
    }
    return isAddedToVR;
};

/**
 * Is Object added to VR
 *
 * @param {Object} objToSearch - The object to search
 * @returns {Boolean} is object Exist in data provider list
 */
var _isElementAddedToVR = function( objToSearch ) {
    var isAddedToVR = false;
    var modelObj = cdm.getObject( objToSearch.uid );
    if( modelObj.props.crt1AddedToAnalysisRequest && modelObj.props.crt1AddedToAnalysisRequest.dbValues[ 0 ] === '1' ) {
        isAddedToVR = true;
    }
    return isAddedToVR;
};
/**
 * Is Object Exist in Object Array
 *
 * @param {Object} arrObjects - array of objects
 * @param {Object} objToSearch - The object to search
 * @returns {Boolean} is object Exist in data provider list
 */
var _isExistRevObjectInArray = function( arrObjects, objToSearch ) {
    for( var i = 0; i < arrObjects.length; i++ ) {
        if( _hasSameUnderlyingRevision( arrObjects[ i ], objToSearch ) ) {
            return true;
        }
    }
    return false;
};
/**
 * Check if underlying revision object is same
 *
 * @param {Object} obj1 - firstObject
 * @param {Object} obj2 - second object
 * @returns {Boolean} return true if both are same revision objects
 */
var _hasSameUnderlyingRevision = function( obj1, obj2 ) {
    var obj1Rev = _getRevisionObject( obj1 );
    var obj2Rev = _getRevisionObject( obj2 );

    if( obj1Rev && obj2Rev && obj1Rev.uid === obj2Rev.uid || obj1 && obj2 && _isSameObjects( obj1, obj2 ) ) {
        //If object name and RevId are same but uid are different then add obj in the list.
        if(obj1.uid !== obj2.uid)
        {
            return false;
        }
        return true;
    }
    return false;
};
/**
 * Check if given objects is same
 *
 * @param {Object} obj1 - firstObject
 * @param {Object} obj2 - second object
 * @returns {Boolean} return true if both are same objects
 */
var _isSameObjects = function( obj1, obj2 ) {
    if( obj1 && obj2 && obj1.uid === obj2.uid ) {
        return true;
    }
    return false;
};
/**
 * get Revision Object.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {Object} Revision Object
 */
var _getRevisionObject = function( obj ) {
    var revObject = null;

    if( _isOccurence( obj ) ) {
        if( obj.props.awb0UnderlyingObject && obj.props.awb0UnderlyingObject.dbValues.length > 0 ) {
            revObject = cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }
    } else {
        revObject = cdm.getObject( obj.uid );
    }

    return revObject;
};

export let RegisterOriginalPageId = function() {
    var OriginalPageId = appCtxSvc.ctx.xrtPageContext.primaryXrtPageID;
    appCtxSvc.registerCtx( 'OriginalPageId', OriginalPageId );
};
/**
 * Init Start Item List Types
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context
 */
export let initStartItemList1 = function( data, ctx ) {
    parentData = data;
    modelObjectsList = [];
    data.sourceObject = [];
        // Get selected objects from the app context
        //var objList = JSON.parse( JSON.stringify( ctx.mselected ) );
        var objList = ctx.mselected;
        for( var ob = 0; ob < objList.length; ob++ ) {
            var obj = cdm.getObject( objList[ ob ].uid );
            modelObjectsList.push( obj );
        }
    var endObjectsList = [];
        parentData.startItems1.dbValue = _.clone( modelObjectsList );
        var arrModelObjs = parentData.startItems1.dbValue;
        var propertiesToLoad = [ 'awp0CellProperties', 'object_string' ];
        for( var ii = 0; ii <= arrModelObjs.length - 1; ii++ ) {
            if( _isOccurence( arrModelObjs[ ii ] ) ) {
                propertiesToLoad.push( 'awb0UnderlyingObject' );
                break;
            }
        }
        loadModelObjects( arrModelObjs, propertiesToLoad ).then( function() {
            setTimeout( function() {
                eventBus.publish( 'Refresh.stickyPanel' );
                updateHeight();
            }, 500 );
        } );
    data.modelProperty = {};
};


/**
 * Update tracelink popup data in local storage
 * @param {Object} data - object which contains start and end objects
 */
export let updateLocalStorageData = function( data ) {
    // No need to update if popup is not opened
    if( !appCtxSvc.ctx.CreateStickyPanelPopupCtx ) {
        return;
    }

    if( data ) {
        var objects = [];
        if( data.startItems1 && data.startItems1.dbValue.length > 0 ) {
            objects = objects.concat( data.startItems1.dbValue );
        }
        if( data.endItems1 && data.endItems1.dbValue.length > 0 ) {
            objects = objects.concat( data.endItems1.dbValue );
        }

        // Add reference to the object so that it will not getting clean when new page is loaded
        objects.forEach( function( obj ) {
            if( _.isFunction( obj.removeReference ) ) {
                obj.removeReference();
            }
        } );

        // Add reference to the object so that it will not getting clean when new page is loaded
        objects.forEach( function( obj ) {
            if( _.isFunction( obj.addReference ) ) {
                obj.addReference();
            }
        } );
    }

    if( data && data.startItems1 && data.endItems1 ) {
        var starts = _.map( data.startItems1.dbValue, 'uid' );
        var ends = _.map( data.endItems1.dbValue, 'uid' );
        var obj = {
            startItems1: starts,
            endItems1: ends
        };

        //Update the height of the Create TraceLink PopUp
        exports.updateHeight();
    }
};
export let updateHeight = function() {
    if( _popupRef && _popupRef.panelEl ) {
        var el = dom.get( 'div.aw-layout-panelContent', _popupRef.panelEl );
        // el.style.height = '100%';
        el.style.maxHeight = document.children[ 0 ].clientHeight - 84 + 'px';
    }
};
/**
 * Load model objects common properties require to show on tracelink panel
 * @param {Array} objsToLoad - Model object list
 * returns the model objects from the given input
 */

export let loadModelObjects = function( objsToLoad, cellProp ) {
    var deferred = AwPromiseService.instance.defer();
    tcVmoService.getViewModelProperties( objsToLoad, cellProp ).then( function( response ) {
        deferred.resolve( response );
    } );
    return deferred.promise;
};

export let attachVMOToItemLists1 = ( data, isStartItemList ) => {
    var uid;
    var uiValue;
    if( isStartItemList ) {
        //uid = START_ITEM_LIST;
        uiValue = 'Start';
    } else {
        uid = ITEM_LIST;
        uiValue = 'End';
    }
    data.vmo = {
        uid: uid,
        props: {
            object_string: {
                uiValues: [ uiValue ]
            }
        },
        modelType: {
            typeHierarchyArray: [ 'CreateTracelink' ]
        }
    };
};

export default exports = {
    dragOverCustomHighlight,
    dropCustomHighlight,
    clearCachedDragDropData,
    _isOccurence,
    _isWorkspceObject,
    unRegisterLocalStorageAndClosePopup,
    removeObjectReferences,
    updatePopupPosition,
    showStickyPanel,
    removeFromEndItems,
    _removeFromDataProvider,
    pasteObjectsInList,
    _addInObjectList,
    _addInDataProvider,
    _isExistRevObjectInArray,
    _isElementAddedToVR,
    _hasSameUnderlyingRevision,
    _getRevisionObject,
    initStartItemList1,
    loadModelObjects,
    _isSameObjects,
    updateHeight,
    updateLocalStorageData,
    addToVR,
    RegisterOriginalPageId,
    unRegisterLocalStorageAndClosePopup1,
    isElementSelectedFromContentPWAAction,
    attachVMOToItemLists1
};
app.factory( 'stickyPanelService', () => exports );
