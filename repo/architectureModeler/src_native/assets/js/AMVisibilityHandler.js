//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Visibility Handler for Architecture Tab
 *
 * @module js/AMVisibilityHandler
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _amPanelHideEventDef = null;

/**
 * Toggle Visibility of object
 *
 * @param {Object} modelObject object to toggle visibility for
 */
var toggleVisibility = function (modelObject) {
    if (appCtxSvc && modelObject) {

        var selectedViewModelObjects = [];
        var isRelationProxy = cmm.isInstanceOf('Ase0RelationProxyObject', modelObject.modelType);
        if (isRelationProxy) {
            var selectionModel = appCtxSvc.ctx.ArchitectureRelationCtx.selectionModel;
            if (selectionModel) {
                selectedViewModelObjects = selectionModel.getSelection();
                if (!_.find(selectedViewModelObjects, ['uid', modelObject.uid])) {
                    // if clicked object is not in selection list, ignore selection list
                    selectedViewModelObjects = [];
                }
            }

            toggleRelatedObjectVisibility(modelObject, selectedViewModelObjects);

            return;
        }

        if (isOccVisible(modelObject)) {
            eventBus.publish("AM.toggleOffVisibilityEvent", {
                elementsToRemove: [modelObject]
            });
        } else {
            eventBus.publish("AM.toggleOnVisibilityEvent", {
                elementsToAdd: [modelObject]
            });
        }
    }
};

/**
 * Toggle Visibility for related objects
 *
 * @param {Object} clickedObject object clicked to toggle visibility
 * @param {Array} selectedObjects selected objects
 */
var toggleRelatedObjectVisibility = function (clickedObject, selectedObjects) {
    var isObjectVisible = isOccVisible(clickedObject);
    if (!isObjectVisible) {
        var objectToAdd = [];
        objectToAdd.push(clickedObject);
        _.forEach(selectedObjects, function (selectedObject) {
            if (objectToAdd.indexOf(selectedObject) < 0) {
                objectToAdd.push(selectedObject);
            }

        });
        var eventData1 = {
            elementsToAdd: objectToAdd

        };
        eventBus.publish("AM.toggleOnVisibilityEvent", eventData1);
    } else { //User is going to toggle of connection and tracelink from diagram
        var objectsToRemove = [];
        objectsToRemove.push(cdm.getObject(clickedObject.props.ase0RelationElement.dbValues[0]));
        _.forEach(selectedObjects, function (selObject) {
            if (cmm.isInstanceOf('Ase0RelationProxyObject', selObject.modelType)) {
                var selectedRelationUid = selObject.props.ase0RelationElement.dbValues[0];
                var selectedRelationObject = cdm.getObject(selectedRelationUid);
                if (isOccVisible(selectedRelationObject)) {
                    if (objectsToRemove.indexOf(selectedRelationObject) < 0) {
                        objectsToRemove.push(selectedRelationObject);
                    }
                }
            }
        });
        var eventData2 = {
            elementsToRemove: objectsToRemove
        };
        eventBus.publish("AM.toggleOffEvent", eventData2);
    }
};

/**
 * Check whether occurrence visible on graph
 *
 * @param {Object} modelObject object whose visibility to check
 * @return {Boolean} occurrence visibility true or false
 */
var isOccVisible = function (modelObject) {
    if (appCtxSvc && modelObject && appCtxSvc.ctx.graph && appCtxSvc.ctx.graph.graphModel) {
        var uidToCheckVisibility = modelObject.uid;
        var isConnection = false;       
        if (cmm.isInstanceOf('Ase0RelationProxyObject', modelObject.modelType)) {
            if (modelObject.props.ase0RelationElement) {
                uidToCheckVisibility = modelObject.props.ase0RelationElement.dbValues[0];
                var end1Element = null;
                var end2Element = null;
                isConnection = cmm.isInstanceOf('Ase0ConnectionRelationProxy', modelObject.modelType);
                if (modelObject.props.ase0Direction.dbValues[0]) {
                    var direction = modelObject.props.ase0Direction.dbValues[0];
                    if (direction === 'Defining') {
                        end2Element = modelObject.props.ase0SelectedElement;
                        end1Element = modelObject.props.ase0RelatedElement;
                    } else if (direction === 'Complying') {
                        end2Element = modelObject.props.ase0RelatedElement;
                        end1Element = modelObject.props.ase0SelectedElement;
                    }
                }
            }
        } else {
            isConnection = cmm.isInstanceOf('Awb0Connection', modelObject.modelType);
        }
        if (appCtxSvc.ctx.graph.graphModel.nodeMap) {
            var nodeObject = appCtxSvc.ctx.graph.graphModel.nodeMap[uidToCheckVisibility];
            if (nodeObject) {
                return nodeObject.isVisible();
            }
        }
        if (appCtxSvc.ctx.graph.graphModel.portMap) {
            let portObject = appCtxSvc.ctx.graph.graphModel.portMap[uidToCheckVisibility];
            if (portObject) {
                return portObject.isVisible();
            }
        }
        if (appCtxSvc.ctx.graph.graphModel.edgeMap) {
            var edgeObject = null;
            if (isConnection) {
                edgeObject = appCtxSvc.ctx.graph.graphModel.edgeMap[uidToCheckVisibility];
            } else {
                if (end1Element && end2Element && end1Element.dbValues[0] && end2Element.dbValues[0]) {
                    edgeObject = appCtxSvc.ctx.graph.graphModel.edgeMap[uidToCheckVisibility + '+' + end1Element.dbValues[0] + '+' + end2Element.dbValues[0]];
                }
            }
            if (edgeObject) {
                return edgeObject.isVisible();
            }
        }
    }
    return false;
};

/**
 * Un-register visibility handler
 */
var unRegisterVisiblilityHandlers = function () {
    appCtxSvc.updatePartialCtx("occmgmtContext.cellVisibility.toggleOccVisibility", null);
    appCtxSvc.updatePartialCtx("occmgmtContext.cellVisibility.getOccVisibility", null);

    // Un-subscribe tab switch event
    if (_amPanelHideEventDef) {
        eventBus.unsubscribe(_amPanelHideEventDef);
        _amPanelHideEventDef = null;
    }
};

/**
 * Register visibility handler
 */
export let registerVisiblilityHandlers = function () {
    var _toggleVisibility = toggleVisibility;
    appCtxSvc.updatePartialCtx("occmgmtContext.cellVisibility.toggleOccVisibility", _toggleVisibility);

    var _isOccVisible = isOccVisible;
    appCtxSvc.updatePartialCtx("occmgmtContext.cellVisibility.getOccVisibility", _isOccVisible);

    // Register to listen event on tab switch to another tab
    if (!_amPanelHideEventDef) {
        _amPanelHideEventDef = eventBus.subscribe("Ase0ArchitectureGraph.contentUnloaded", function () {
            unRegisterVisiblilityHandlers();
        });
    }
};

export default exports = {
    registerVisiblilityHandlers
};
app.factory('AMVisibilityHandler', () => exports);
