//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * @module js/Ase1AddInterfaceDefinitionService
 */
import * as app from 'app';
import addObjectUtils from 'js/addObjectUtils';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';

var exports = {};

//Build the input for createRelateAndSubmitObjects SOA.
export let processCreateInput = function( data ) {
    var inputs = addObjectUtils.getCreateInput( data );

    //Set the target object.uid is underlying object of port.
    if( !inputs[ 0 ].targetObject ) {
        inputs[ 0 ].targetObject = {
            uid: appCtxSvc.ctx.interfaceDetails.targetModelObject.props.awb0UnderlyingObject.dbValues[ 0 ]
        };
    }
    inputs[ 0 ].pasteProp = "Seg0Implements";
    return inputs;
};

//Build the input for createRelation SOA
export let prepareCreateRelationInput = function( data ) {
    var inputs = addObjectUtils.getCreateRelationsInput( data );
    var primaryObject = null;

    if( !inputs[ 0 ].primaryObject ) {
        primaryObject = viewModelObjectService
            .createViewModelObject( appCtxSvc.ctx.interfaceDetails.targetModelObject.props.awb0UnderlyingObject.dbValues[ 0 ] );
    } else {
        primaryObject = viewModelObjectService.createViewModelObject( inputs[ 0 ].primaryObject.dbValues[ 0 ] );
    }

    for( var index = 0; index < inputs.length; index++ ) {
        inputs[ index ].primaryObject = primaryObject;
        if ( _.get( inputs[ index ], 'relationType', '' ) !== 'Seg0Implements' )
        {
            inputs[ index ].relationType = 'Seg0Implements';
        }
    }

    return inputs;
};

/**
 * @member Ase1AddInterfaceDefinitionService
 *
 * @param {Object} addObjectUtils addObjectUtils
 * @param {Object} appCtxSvc appCtxService
 * @param {Object} viewModelObjectService viewModelObjectService
 *
 * @return {Object} exports
 */

export default exports = {
    processCreateInput,
    prepareCreateRelationInput
};
app.factory( 'Ase1AddInterfaceDefinitionService', () => exports );
