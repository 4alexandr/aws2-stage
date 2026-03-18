// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
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
 * @module js/moveCommandsRequirement
 */
import app from 'app';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import reqACEUtils from 'js/requirementsACEUtils';
import cdm from 'soa/kernel/clientDataModel';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';

var exports = {};

var PAGE_SIZE = 3;

/**
 * Get Input context for move operation.
 */
export let getInputContext = function() {
    return reqACEUtils.getInputContext();
};

/**
 * Set Move operation type.
 *
 * @param {IModelObject} selectedObject - The selected object.
 */
export let setMoveOperationType = function( data, operationType ) {
    data.operationType = operationType;
};

/**
 * Move up operation move selected element one position up in same level of hierarchy
 */
export let MoveUpHtmlSpecTemplateAndPreview = function() {
    eventBus.publish( 'Arm0HTMLSpecTemplateEditAndPreview.MoveUp' );
};

/**
 * Move down operation move selected element one position below in same level of hierarchy
 */
export let MoveDownHtmlSpecTemplateAndPreview = function() {
    eventBus.publish( 'Arm0HTMLSpecTemplateEditAndPreview.MoveDown' );
};

/**
 * Promote operation move selected element to parent level of hierarchy
 */
export let PromoteHtmlSpecTemplateAndPreview = function() {
    eventBus.publish( 'Arm0HTMLSpecTemplateEditAndPreview.Promote' );
};

/**
 * Demote operation move selected element to its sibling's children  hierarchy
 */
export let DemoteHtmlSpecTemplateAndPreview = function() {
    eventBus.publish( 'Arm0HTMLSpecTemplateEditAndPreview.Demote' );
};

/**
 * Service for Move operation in Requirement for non indexed structure.
 *
 * @member moveCommandsRequirement
 */

export default exports = {
    getInputContext,
    setMoveOperationType,
    MoveUpHtmlSpecTemplateAndPreview,
    MoveDownHtmlSpecTemplateAndPreview,
    PromoteHtmlSpecTemplateAndPreview,
    DemoteHtmlSpecTemplateAndPreview
};
app.factory( 'moveCommandsRequirement', () => exports );
