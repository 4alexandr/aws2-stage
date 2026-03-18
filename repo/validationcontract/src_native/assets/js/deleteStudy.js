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
 * @module js/deleteStudy
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import 'lodash';

var exports = {};

export let removeStudy = function() {
    var mselected = appCtxSvc.getCtx( "mselected" );
    var studyObjects = [];
    var temp = null;
    for( var i = 0; i < mselected.length; i++ ) {
        temp = cdm.getObject( mselected[ i ].uid );
        studyObjects.push( cdm.getObject( temp.props.items_tag.dbValues[ 0 ] ) );
    }

    return studyObjects;

};

/**
 * Returns the deleteStudy instance
 * 
 * @member deleteStudy
 */

export default exports = {
    removeStudy
};
app.factory( 'deleteStudy', () => exports );
