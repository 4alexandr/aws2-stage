// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Ase0ArchitecturePageService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import diagramSaveService from 'js/Ase0ArchitectureDiagramSaveService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _architectureUnloadedEventListener = null;
var _architectureAddElementEventListeners = [];
var _productContextChanged = null;
var _occDataLoadedEvent = null;

var _reviseEventListener = null;
var _architectureEditHandlerStateChangeListeners = [];
var _productRestoreLister = null;
/**
 * Unregister context on Architecture view load.
 */
export let handleNativeArchitectureLoad = function () {
    var architectureCtx = appCtxSvc.getCtx('architectureCtx');
    if (architectureCtx) {
        architectureCtx.isModelerActive = true;
        appCtxSvc.updateCtx('architectureCtx', architectureCtx);
    } else {
        architectureCtx = {
            isModelerActive: true
        };
        appCtxSvc.registerCtx('architectureCtx', architectureCtx);
    }
    appCtxSvc.registerCtx('activeArchDgmCtx', 'architectureCtx');
    updateHiddenCommandContextForArchitecture(true);

    if (!_architectureUnloadedEventListener) {
        _architectureUnloadedEventListener = eventBus.subscribe('Ase0ArchitecturePrimary.contentUnloaded',
            function () {
                handleNativeArchitectureUnloaded();
            }, 'Ase0ArchitecturePageService');
    }

    if (!_reviseEventListener) {
        _reviseEventListener = eventBus.subscribe('Awp0ShowSaveAs.saveAsComplete',
            function (eventData) {
                exports.setReviseState(eventData);
            }, 'Ase0ArchitecturePageService');
    }

    // subscribe to ACE addElement events
    if (_architectureAddElementEventListeners.length <= 0) {
        // The below 2 events are being subscribed to since those are triggered by Ase0ArchitectureGraphViewModel.json and not by ACE
        var eventsToListen = ['addElement.updateSelectionInPWA', 'addElement.updatePwaDisplay'];
        _.forEach(eventsToListen, function (eventName) {
            var subDef = eventBus.subscribe(eventName, function (eventData) {
                var localEventData = {
                    objectToSelect: eventData.objectToSelect
                };
                eventBus.publish('AM.PwaSelectionUpdated', localEventData);
            }, 'Ase0ArchitecturePageService');
            _architectureAddElementEventListeners.push(subDef);
        });

        // The below event is being listened to since ACE triggers it.
        var subDef = eventBus.subscribe('addElement.elementsAdded', function (eventData) {
            var uidsToSelect = eventData.objectsToSelect.map(function (object) {
                return object.uid;
            });
            var localEventData = {
                objectToSelect: uidsToSelect,
                deletedObjects: []
            };

            // the drag & drop also deletes the original elements; which need to be removed
            // from the diagram
            var _deletedUids = _.get(eventData, 'addElementResponse.ServiceData.deleted');
            _.forEach(_deletedUids, function (deletedUid) {
                localEventData.deletedObjects.push({ uid: deletedUid });
            });

            // the intent is captured to ensure that deleted objects are for the
            // correct use case of drag & drop
            localEventData.intent = _.get(eventData, 'addElementInput.addObjectIntent');
            eventBus.publish('AM.elementAdded', localEventData);
        }, 'Ase0ArchitecturePageService');
        _architectureAddElementEventListeners.push(subDef);
        var editHandlerStateChangeSubDef = eventBus.subscribe('editHandlerStateChange', function (eventData) {
            if (eventData.state === 'saved') {
                eventBus.publish('AM.owningNodeRefresh', eventData);
            }
        });
        _architectureEditHandlerStateChangeListeners.push(editHandlerStateChangeSubDef);
    }
};

/**
 *  Update Context for Supported/Un-supported commands in Architecture.
 * @param {Object} value -false to support,true if Not supported.
 */
var updateHiddenCommandContextForArchitecture = function (value) {
    var hiddenCommandCtx = appCtxSvc.getCtx('hiddenCommands');
    if (!hiddenCommandCtx) {
        hiddenCommandCtx = {};
    }
    if (value) {
        hiddenCommandCtx.isSaveWorkingContextNotSupported = value;
    } else {
        delete hiddenCommandCtx.isSaveWorkingContextNotSupported;
    }
    appCtxSvc.updatePartialCtx('hiddenCommands', hiddenCommandCtx);
};

/**
 * Function to subscribe to product context change event on configuration changed
 *
 * @param {Object} value value object
 */
export let configurationChanged = function (value) {
    if (value && Object.keys(value.aceActiveContext.context.configContext).length > 0) {
        if (!_productContextChanged) {
            _productContextChanged = eventBus.subscribe('productContextChangedEvent', function () {
                productContextChanged(true);
            });
        }
    }
};

/**
 * Function to subscribe to product context change event on reset command execution
 */
export let resetContent = function () {
    if (!_productContextChanged) {
        _productContextChanged = eventBus.subscribe('productContextChangedEvent', function () {
            productContextChanged(false);
            // if in diagramming context
            // then after Reset, Save Diagram Icon should be hidden and  set diagramOpeningComplete to false
            if (diagramSaveService.isWorkingContextTypeDiagram()) {
                appCtxSvc.ctx.architectureCtx.diagram.diagramOpeningComplete = false;
                diagramSaveService.setHasPendingChange(false);
                diagramSaveService.setHasPendingChangeInDiagram(false);
            }
        });
    }
};

/**
 * Function to clear diagram if effectivity added
 */
export let resetContentOnEffectivityAdded = function () {
    clearOpenDiagram(false);
};

/**
 * Function to clear and open diagram
 *
 * @param {boolean} isApplyGlobalLayout the flag to apply global layout or not.
 */
var productContextChanged = function (isApplyGlobalLayout) {
    if (_productContextChanged) {
        eventBus.unsubscribe(_productContextChanged);
        _productContextChanged = null;
    }
    clearOpenDiagram(isApplyGlobalLayout);
};

/**
 * Function to clear and open diagram
 *
 * @param {boolean} isApplyGlobalLayout the flag to apply global layout or not.
 */
var clearOpenDiagram = function (isApplyGlobalLayout) {
    var eventData = {
        userAction: 'OpenDiagram',
        isApplyGlobalLayout: isApplyGlobalLayout
    };
    //Publish clear diagram event, which will trigger action handleClearDiagram. Which will clear the node,edge,port map and then clears graph
    eventBus.publish('AMGraphEvent.clearDiagram', eventData);
};

export let setViewChange = function (data, view) {
    data.selectedView = view;
};

export let changeView = function (view) {
    appCtxSvc.updatePartialCtx('architectureCtx.viewMode', view);
};

export let refreshDiagram = function () {
    productContextChanged(false);
};
/**
 * Unregister context on Architecture view load.
 */
function handleNativeArchitectureUnloaded() {
    eventBus.unsubscribe(_architectureUnloadedEventListener);
    eventBus.unsubscribe(_reviseEventListener);
    _reviseEventListener = null;
    _.forEach(_architectureAddElementEventListeners, function (subDef) {
        eventBus.unsubscribe(subDef);
    });
    _architectureAddElementEventListeners = [];
    // unsubscribe _architectureEditHandlerStateChangeListeners
    _.forEach(_architectureEditHandlerStateChangeListeners, function (subDef) {
        eventBus.unsubscribe(subDef);
    });
    _architectureEditHandlerStateChangeListeners = [];
    _architectureUnloadedEventListener = null;
    updateHiddenCommandContextForArchitecture(false);
    //unregister Architecture DiagramEditHandler if Active
    if (diagramSaveService.diagramEditHandlerIsActive()) {
        diagramSaveService.removeEditAndLeaveHandler();
    }
    appCtxSvc.unRegisterCtx('architectureCtx');
    eventBus.publish('occMgmt.visibilityStateChanged');
    appCtxSvc.unRegisterCtx('activeArchDgmCtx');
}

/**
 * Updating occmgmt context isShowConnection
 *
 * @param {boolean}toBeShowConnectionModeAce show connections mode in ACE
 * @param {Sting} viewKey ccommand context viewkey
 */
export let updateCtxWithShowConnectionValue = function (toBeShowConnectionModeAce, viewKey) {
    var isTrue = (toBeShowConnectionModeAce === 'true');

    appCtxSvc.updatePartialCtx(viewKey, isTrue);
    //also update diagram ctx to prevent leave confirmation
    _.set(appCtxSvc, 'ctx.architectureCtx.diagram.leaveConfirmByPwaReset', true);
    eventBus.publish('occMgmt.visibilityStateChanged');
};
/**
 * Function to process occDataLoadedEvent on revise or saveAs action
 */
var onOccDataLoadedEvent = function () {
    var architectureCtx = appCtxSvc.getCtx('architectureCtx');
    if (architectureCtx && architectureCtx.isModelerActive && architectureCtx.reviseInProgress) {
        // unsubscribe occDataLoadedEvent event
        eventBus.unsubscribe(_occDataLoadedEvent);
        _occDataLoadedEvent = null;

        // reset reviseInProgress flag
        architectureCtx.reviseInProgress = false;
        appCtxSvc.updateCtx('architectureCtx', architectureCtx);

        var eventData = {
            userAction: 'OpenDiagram',
            isApplyGlobalLayout: false
        };

        //Publish clear diagram event and open diagram
        //Publish AMManagediagram event with user action as "OpenDiagram", which will call manageDiagram2 SOA
        eventBus.publish('AMGraphEvent.clearDiagram', eventData);
    }
};

/**
 * Function to process saveas or revise action
 */
export let setReviseState = function (eventData) {
    var architectureCtx = appCtxSvc.getCtx('architectureCtx');
    if (architectureCtx && architectureCtx.isModelerActive) {
        // set revised object uid
        architectureCtx.revisedUid = eventData.newObjectUid;
        // set reviseInProgress flag
        architectureCtx.reviseInProgress = true;
        appCtxSvc.updateCtx('architectureCtx', architectureCtx);

        // subscribe occDataLoadedEvent event
        _occDataLoadedEvent = eventBus.subscribe('occDataLoadedEvent', function () {
            onOccDataLoadedEvent();
        });
    }
};


/**
 * Function to process restore action from ACE tree
 */
export let restoreProductInArchitecture = function () {
    if (!_productRestoreLister) {
        _productRestoreLister = eventBus.subscribe('productContextChangedEvent', function () {
            eventBus.unsubscribe( _productRestoreLister );
            _productRestoreLister = null;
            var eventData = {
                userAction: 'OpenDiagram'
            };
            eventBus.publish('AMGraphEvent.clearDiagram', eventData);
        });
    }
};

export default exports = {
    handleNativeArchitectureLoad,
    configurationChanged,
    resetContent,
    resetContentOnEffectivityAdded,
    setViewChange,
    changeView,
    refreshDiagram,
    updateCtxWithShowConnectionValue,
    setReviseState,
    restoreProductInArchitecture
};
app.factory('Ase0ArchitecturePageService', () => exports);
