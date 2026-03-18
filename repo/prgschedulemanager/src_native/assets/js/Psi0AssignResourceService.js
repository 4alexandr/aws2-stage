// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Psi0AssignResourceService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

export let assignResourcePanel = function (commandId, location, ctx, data) {

    let selectedObjects = ctx.mselected;
    let message = '';
    if (ctx.xrtPageContext.primaryXrtPageID === "tc_xrt_Deliverables" ||
        ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Navigate' ||
        (ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Timeline' && ctx.selected.modelType.typeHierarchyArray.indexOf('ItemRevision') > -1)) {

        let selectedOtherObjects = [];
        let selectedPrgDelRevisionObjects = [];
        let releasedPrgDelRevisionObjects = [];

        selectedObjects.forEach(function (selectedObject) {
            if (selectedObject.modelType.typeHierarchyArray.indexOf("Psi0PrgDelRevision") === -1) {
                selectedOtherObjects.push(selectedObject);
            } else {
                if (selectedObject.props.release_status_list.dbValues.length !== 0) {
                    releasedPrgDelRevisionObjects.push(selectedObject);
                } else {
                    selectedPrgDelRevisionObjects.push(selectedObject);
                }
            }

        });

        let simlilarObjLength = selectedPrgDelRevisionObjects.length;
        let otherObjLength = selectedOtherObjects.length;
        let releasedObjLength = releasedPrgDelRevisionObjects.length;

        if (otherObjLength || releasedObjLength) {
            let resource = 'PrgScheduleManagerMessages';
            let localTextBundle = localeSvc.getLoadedText(resource);
            let otherObjErrorMessage = "";
            let releaseStatusErrorMessage = "";
            let prgDelErrorMessage = "";
            let totalSelectedObj = selectedObjects.length;

            if (totalSelectedObj > 1) {
                prgDelErrorMessage = localTextBundle.prgDelTypeObjectMessage;
                prgDelErrorMessage = messagingService.applyMessageParams(prgDelErrorMessage, ["{{simlilarObjLength}}", "{{totalSelectedObj}}"], {
                    'simlilarObjLength': simlilarObjLength,
                    'totalSelectedObj': totalSelectedObj
                });
                message = prgDelErrorMessage;
            }

            if (otherObjLength) {
                selectedOtherObjects.map(function (otherObject) {
                    let otherTypeObjectMessage = localTextBundle.otherTypeObjectMessage;
                    otherTypeObjectMessage = messagingService.applyMessageParams(otherTypeObjectMessage, ["{{otherObject}}"], {
                        'otherObject': otherObject
                    });
                    otherObjErrorMessage = otherObjErrorMessage + '</br>' + otherTypeObjectMessage;
                    otherTypeObjectMessage = null;
                });
                message = message + otherObjErrorMessage;
            }

            if (releasedObjLength) {
                releasedPrgDelRevisionObjects.map(function (releasedPrgDelRevisionObject) {
                    let releaseStatusErrorMsg = localTextBundle.releaseStatusErrorMsg;
                    releaseStatusErrorMsg = messagingService.applyMessageParams(releaseStatusErrorMsg, ["{{releasedPrgDelRevisionObject}}"], {
                        'releasedPrgDelRevisionObject': releasedPrgDelRevisionObject
                    });
                    releaseStatusErrorMessage = releaseStatusErrorMessage + '</br>' + releaseStatusErrorMsg;
                    releaseStatusErrorMsg = null;
                });
                message = message + releaseStatusErrorMessage;
            }

            if (simlilarObjLength !== 0 && (simlilarObjLength + releasedObjLength) >= 1) {
                let buttons = [{
                    addClass: 'btn btn-notify',
                    text: data.i18n.CancelText,
                    onClick: function ($noty) {
                        $noty.close();
                    }
                },
                {
                    addClass: 'btn btn-notify',
                    text: data.i18n.ProceedText,
                    onClick: function ($noty) {
                        $noty.close();
                        commandPanelService.activateCommandPanel(commandId, location);
                        ctx.mselected = selectedPrgDelRevisionObjects;
                    }
                }
                ];
                messagingService.showWarning(message, buttons);
            } else {
                messagingService.showError(message);
            }
        }
    }
    if (!message) {
        commandPanelService.activateCommandPanel(commandId, location);
    }
};

export let checkForExistingResourcePoolAndDelete = function (ctx, data) {
    let relationsObj = [];
    let selectedObjects = ctx.mselected;
    selectedObjects.forEach(function (selectedObject) {
        if (selectedObject.modelType.typeHierarchyArray.indexOf("Psi0PrgDelRevision") > -1) {
            selectedObject = cdm.getObject(selectedObject.uid);
            if ( selectedObject.props.psi0ResourceAssignment && selectedObject.props.psi0ResourceAssignment.dbValues.length > 0 ) {
                let relationObject = {
                    primaryObject : selectedObject,
                    secondaryObject: {
                        uid: selectedObject.props.psi0ResourceAssignment.dbValues[0],
                        type: 'Resource Pool'
                    },
                    relationType: 'Prg0ResourceAssignment'
                };
                relationsObj.push(relationObject);
            }
        }
    });
    if (relationsObj.length) {
        var delRelInput = {
            input: relationsObj
        };
        soaSvc.post( "Core-2006-03-DataManagement", "deleteRelations", delRelInput );
    }
};

export let getObjectsWithRelation = function (ctx, data) {
    let input = [];
    let selectedObjects = ctx.mselected;

    selectedObjects.forEach(function (selectedObject) {
        if (selectedObject.modelType.typeHierarchyArray.indexOf("Psi0PrgDelRevision") > -1) {
            let inputData = {
                primaryObject: selectedObject,
                secondaryObject: data.dataProviders.getResourcePool.selectedObjects[0],
                relationType: "Prg0ResourceAssignment",
                clientId: "CreateObject",
                userData: ""
            };
            input.push(inputData);
        }
    });
    return input;
};

export let getPropagateUsersInput = function (ctx) {
    let contextObj = cdm.getObject( ctx.mselected[0].uid );
    let delObjs = contextObj.modelType.typeHierarchyArray.indexOf('Prg0AbsEvent') > -1 ? contextObj.props.Psi0EventPrgDel.dbValues : contextObj.props.Psi0PlanPrgDel.dbValues;
    
    let propagateUsersInputs = [
        {
            "parentObject": contextObj
        }
    ];
    return propagateUsersInputs;
};

export default exports = {
    assignResourcePanel,
    getObjectsWithRelation,
    getPropagateUsersInput,
    checkForExistingResourcePoolAndDelete
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Psi0AssignResourceService
 */
app.factory('Psi0AssignResourceService', () => exports);
