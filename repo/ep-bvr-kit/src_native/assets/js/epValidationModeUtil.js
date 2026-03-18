// Copyright (c) 2020 Siemens
/**
 * @module js/epValidationModeUtil
 */
import appCtxSvc from 'js/appCtxService';

const EP_VALIDATION_MODE = 'epPageContextCommandPanelLarge';
const MODE_VIEW = 'epValidation';

/**
 * toggle Validation Mode
 */
export function toggleValidationMode() {
    let selectionMode = appCtxSvc.getCtx( EP_VALIDATION_MODE );
    if( selectionMode === undefined ) {
        appCtxSvc.updateCtx( EP_VALIDATION_MODE, MODE_VIEW );
    } else {
        appCtxSvc.unRegisterCtx( EP_VALIDATION_MODE );
    }
}

/**
 * initialize the context with the default value of the toggle.
 */
export function initializeValidationMode() {
    appCtxSvc.updatePartialCtx( EP_VALIDATION_MODE, MODE_VIEW );
}

const exports = {
    toggleValidationMode,
    initializeValidationMode
};

export default exports;
