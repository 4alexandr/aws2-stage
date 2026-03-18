// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for Pert
 *
 * @module js/pertUtils
 */

'use strict';

/**
 * This methods updates the input mode of the diagram to move mode
 *
 * @param graphModel - the graph model
 */
export function setMoveMode( graphModel ) {
    graphModel.graphControl.updateInputMode( graphModel.inputModes.viewInputMode );
}

/**
 * This methods updates the input mode of the diagram to editing mode
 *
 * @param graphModel - the graph model
 */
export function setEditMode( graphModel ) {
    graphModel.graphControl.updateInputMode( graphModel.inputModes.editingMode );
}

// eslint-disable-next-line no-unused-vars
let exports;
export default exports = {
    setMoveMode,
    setEditMode
};
