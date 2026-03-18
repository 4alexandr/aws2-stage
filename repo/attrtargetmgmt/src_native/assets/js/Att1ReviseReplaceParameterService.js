// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
  define
 */

/**
 * @module js/Att1ReviseReplaceParameterService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/uwPropertyService';

var exports = {};

export let getInputForReviseReplace = function() {
    var inputs = [];
    var selectedParent = _.get( appCtxSvc, 'ctx.pselected', undefined );
    var locationContext = _.get( appCtxSvc, 'ctx.locationContext', undefined );
    //in case of Home Folder And item revision in its own location
    if( locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 || selectedParent.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        inputs = exports.getInputForItemRevision( selectedParent );
    } else {
        inputs = exports.getReviseReplaceInputInAceContext();
    }
    return inputs;
};
export let getReviseReplaceInputInAceContext = function( targetParameter ) {
    var inputs = [];
    var parentParameterMap = _.get( appCtxSvc, 'ctx.parammgmtctx.parameterTableCtx.parentParameterMap', undefined );
    for( const [ parentId, parameterList ] of parentParameterMap.entries() ) {
        var replaceParams = [];
        _.forEach( parameterList, function( parameter ) {
            var sourceAttribute = cdm.getObject( _.get( parameter, 'props.att1SourceAttribute.dbValues[0]', undefined ) );
            var replaceParam;
            if( targetParameter ) {
                replaceParam = { selectedParam: sourceAttribute, targetParam: targetParameter, reviseAndReplace: false };
            } else {
                replaceParam = { selectedParam: sourceAttribute, reviseAndReplace: true };
            }
            replaceParams.push( replaceParam );
        } );
        var input = { clientId: 'AW_ATT1', parent: cdm.getObject( parentId ), replaceParams: replaceParams };
        inputs.push( input );
    }
    return inputs;
};
export let getInputForItemRevision = function( selectedParent, targetParameter ) {
    var inputs = [];
    var selectedParameters = _.get( appCtxSvc, 'ctx.mselected', undefined );
    var replaceParams = [];
    _.forEach( selectedParameters, function( parameter ) {
        if( targetParameter ) {
            replaceParams.push( { selectedParam: parameter, targetParam: targetParameter, reviseAndReplace: false } );
        } else {
            replaceParams.push( { selectedParam: parameter, reviseAndReplace: true } );
        }
    } );
    var input = { clientId: 'AW_ATT1', parent: selectedParent, replaceParams: replaceParams };
    inputs.push( input );
    return inputs;
};
export let getInputForReplaceRevision = function( data ) {
    var inputs = [];
    var selectedParent = _.get( appCtxSvc, 'ctx.pselected', undefined );
    var locationContext = _.get( appCtxSvc, 'ctx.locationContext', undefined );

    var targetParameter = data.dataProviders.paramRevisionListProvider.selectedObjects[ 0 ];
    //in case of Home Folder And item revision in its own location
    if( locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 || selectedParent.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        inputs = exports.getInputForItemRevision( selectedParent, targetParameter );
    } else {
        inputs = exports.getReviseReplaceInputInAceContext( targetParameter );
    }
    return inputs;
};

export default exports = {
    getInputForReviseReplace,
    getReviseReplaceInputInAceContext,
    getInputForItemRevision,
    getInputForReplaceRevision
};
app.factory( 'Att1ReviseReplaceParameterService', () => exports );
