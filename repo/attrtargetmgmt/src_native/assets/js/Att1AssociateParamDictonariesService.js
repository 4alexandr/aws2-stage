// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Att1AssociateParamDictonariesService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';

var exports = {};

export let setTargetObject = function( data, ctx ) {
    var targetObj;
    var locModelObj = ctx.locationContext.modelObject;
    if( locModelObj.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) {
        targetObj = locModelObj;
    } else if( ctx.pselected && ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) {
        targetObj = ctx.pselected;
    } else if( ctx.selected && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Att0ParamProject' ) > -1 ) {
        targetObj = ctx.selected;
    }

    data.addObjectData = {
        target: targetObj
    };
};

/**
 * Returns the Att1AssociateParamDictonariesService instance
 *
 * @member Att1AssociateParamDictonariesService
 */

export default exports = {
    setTargetObject
};
app.factory( 'Att1AssociateParamDictonariesService', () => exports );
