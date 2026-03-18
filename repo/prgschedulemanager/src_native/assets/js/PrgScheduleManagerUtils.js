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
 * @module js/PrgScheduleManagerUtils
 */
import app from 'app';
import _appCtxService from 'js/appCtxService';
import _selectionService from 'js/selection.service';

var exports = {};

/**
 * Method for getting the selected object.
 *
 * @return {Object} _selectionService.getSelection().selected - The selected object
 */
export let getSelectedObjects = function() {
    if( _appCtxService.ctx.activeSplit ) {
        _appCtxService.ctx.Psi0SplitTimelineObjDeletedFlag = true;
    }
    return _selectionService.getSelection().selected;
};

export default exports = {
    getSelectedObjects
};
/**
 * Service for Remove Schedule.
 *
 * @member PrgScheduleManagerUtils
 * @memberof NgServices
 */
app.factory( 'PrgScheduleManagerUtils', () => exports );
