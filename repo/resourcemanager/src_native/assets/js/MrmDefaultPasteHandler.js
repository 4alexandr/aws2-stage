// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/MrmDefaultPasteHandler
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import viewModelSvc from 'js/viewModelService';
import panelContentSvc from 'js/panelContentService';
import AwRootScopeService from 'js/awRootScopeService';
import mrmAddElementService from 'js/MrmAddElementService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import pasteService from 'js/pasteService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};
var currentScope = null;

/**
 * set the variablity for Add Panel
 * @param{ModelObject} targetObject Parent to which the object is to be pasted
 */
var updateCtxForAddUsingElementDrop = function (targetObject) {
    var addElementInput = {};

    addElementInput.parentElement = targetObject;
    if (appCtxService.ctx.aceActiveContext.context.addObjectIntent && appCtxService.ctx.aceActiveContext.context.addObjectIntent === 'paste') {
        addElementInput.addObjectIntent = '';
        delete appCtxService.ctx.aceActiveContext.context.addObjectIntent;
    }

    appCtxService.ctx.aceActiveContext = appCtxService.ctx.aceActiveContext || {
        context: {}
    };
    appCtxService.ctx.aceActiveContext.context.addElementInput = addElementInput;

    mrmAddElementService.mrmProcessAddElementInput();
};

var addElement = function (sourceObjects) {
    if (!currentScope) {
        panelContentSvc.getViewModelById('Mrm0PasteOperation').then(
            function (response) {
                viewModelSvc.populateViewModelPropertiesFromJson(response.viewModel).then(
                    function (declViewModel) {
                        currentScope = AwRootScopeService.instance.$new();
                        declViewModel.sourceObjects = sourceObjects;
                        declViewModel.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
                        viewModelSvc.setupLifeCycle(currentScope, declViewModel);
                        viewModelSvc.executeCommand(declViewModel, 'addElements', currentScope);
                    });
            });
    } else {
        currentScope.data.sourceObjects = sourceObjects;
        currentScope.data.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
        viewModelSvc.executeCommand(currentScope.data, 'addElements', currentScope);
    }
};

export let mrmDefaultPasteHandler = function (targetObject, sourceObjects) {
    updateCtxForAddUsingElementDrop(targetObject);
    var underlyingObjects = [];
    for (var i = 0; i < sourceObjects.length; i++) {
        //Get underlying object, in resource/diagram view mode we always paste underlying object without any occurrence information.
        if (sourceObjects[i].props.awb0UnderlyingObject) {
            var underlyingObject = cdm.getObject(sourceObjects[i].props.awb0UnderlyingObject.dbValues[0]);
            if (underlyingObject !== null) {
                underlyingObjects.push(underlyingObject);
            }
        }
    }

    if (underlyingObjects.length > 0) {
        addElement(underlyingObjects);
    }
    else {
        //It means source objects are already underlying objects
        addElement(sourceObjects);
    }
};

export let mrmPasteObjectsFromClipboard = function () {
    appCtxService.ctx.aceActiveContext.context.addObjectIntent = 'paste';
    pasteService.execute(appCtxService.ctx.aceActiveContext.context.topElement, appCtxService.ctx.awClipBoardProvider, '');
};

export default exports = {
    mrmDefaultPasteHandler,
    mrmPasteObjectsFromClipboard
};
app.factory('MrmDefaultPasteHandler', () => exports);
