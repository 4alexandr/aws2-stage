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
 * @module js/removeOutput
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import 'lodash';

var exports = {};

export let deleteOutputTraceLinkInput = function() {
    var mselected = appCtxSvc.getCtx( "mselected" );
    var pselected = appCtxSvc.getCtx( "pselected" );
    var relInputArray = [];
    for( var i = 0; i < mselected.length; i++ ) {
        relInputArray.push( {
            "relationType": "Crt0ValidationLink",
            "primaryObject": pselected,
            "secondaryObject": mselected[ i ]
        } );
    }
    return relInputArray;
};

/**
 * Returns the removeOutput instance
 * 
 * @member removeOutput
 */

export default exports = {
    deleteOutputTraceLinkInput
};
app.factory( 'removeOutput', () => exports );
