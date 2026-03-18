// Copyright 2020 Siemens Product Lifecycle Management Software Inc.
/* eslint-disable max-lines */
/* eslint-disable complexity */
/*
global
*/

/**
 * 
 *
 * @module js/epRevisionRuleListWidgeService
 */

export function revisionRuleListSelectionChange( subPanelContext, viewModelData ) {
    const placeholder = subPanelContext.revisionRuleListWidgetKey.key;
    subPanelContext[ placeholder ] = viewModelData.revisionRuleListBox;
}
let exports = {};
export default exports = {
    revisionRuleListSelectionChange
};
