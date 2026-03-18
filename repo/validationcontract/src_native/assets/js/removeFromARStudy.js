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
 * @module js/removeFromARStudy
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropSvc from 'js/uwPropertyService';
import soaSvc from 'soa/kernel/soaService';
import mesgSvc from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import 'lodash';
import 'js/eventBus';
import 'js/fmsUtils';

var exports = {};

export let getVCObject = function() {
    var state = appCtxSvc.getCtx( "state" );
    var vcObject = cdm.getObject( state.params.uid );
    return vcObject;
};

var getAreObjectsAddedToAnalysisRequestInput = function( input, study, selected ) {
    input.push( {
        "analysisRequest": study,
        "objects": selected
    } );
    return input;
};

var getStudiesForAR = function( vcObject ) {
    var studyUids = [];
    if( vcObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) === -1 ) {
        studyUids = vcObject.props.crt0ChildrenStudies.dbValues;
    }
    var studyList = [];
    for( var i = 0; i < studyUids.length; i++ ) {
        studyList[ i ] = cdm.getObject( studyUids[ i ] );
    }
    return studyList;
};

export let removeOperation = function() {
    var state = appCtxSvc.getCtx( "state" );
    var mselected = appCtxSvc.getCtx( "mselected" );
    var input = [];
    var vcObject = cdm.getObject( state.params.uid );
    var studiesForAR = getStudiesForAR( vcObject );
    for( var i = 0; i < studiesForAR.length; i++ ) {
        input = getAreObjectsAddedToAnalysisRequestInput( input, studiesForAR[ i ], mselected );
    }

    return {
        "studiesForAR": studiesForAR,
        "input": input
    };
};

export let removeFromARStudyInput = function() {
    var state = appCtxSvc.getCtx( "state" );
    var vcObject = cdm.getObject( state.params.uid );
    var mselected = appCtxSvc.getCtx( "mselected" );
    var input = [];
    input = getAreObjectsAddedToAnalysisRequestInput( input, vcObject, mselected );
    var studiesForAR = getStudiesForAR( vcObject );
    for( var i = 0; i < studiesForAR.length; i++ ) {
        input = getAreObjectsAddedToAnalysisRequestInput( input, studiesForAR[ i ], mselected );
    }

    return {
        "studiesForAR": studiesForAR,
        "input": input
    };
};

export let getTraceLinks = function( response ) {
    var xrtPageContext = appCtxSvc.getCtx( "xrtPageContext" );
    var traceLinks = appCtxSvc.getCtx( "traceLinks" );
    if( xrtPageContext.primaryXrtPageID === 'tc_xrt_Input' || xrtPageContext.primaryXrtPageID === 'tc_xrt_InputForDCP' ) {
        appCtxSvc.unRegisterCtx( "traceLinks" );
        appCtxSvc.registerCtx( "traceLinks", [] );
        traceLinks = appCtxSvc.getCtx( "traceLinks" );
    }
    for( var i = 0; i < response.objectsStatusOutput.length; i++ ) {
        for( var j = 0; j < response.objectsStatusOutput[ i ].objectStatus[ 1 ].length; j++ ) {
            if( response.objectsStatusOutput[ i ].objectStatus[ 1 ][ j ].addStatus ) {
                traceLinks.push( cdm
                    .getObject( response.objectsStatusOutput[ i ].objectStatus[ 1 ][ j ].validationLink.uid ) );
            }
        }
    }
};

export let deleteTraceLinkInput = function() {
    var traceLinks = appCtxSvc.getCtx( "traceLinks" );
    var relInputArray = [];
    if( traceLinks && traceLinks.length > 0 ) {
        for( var i = 0; i < traceLinks.length; i++ ) {
            relInputArray.push( {
                "clientId": "",
                "relationType": "Crt0ValidationLink",
                "primaryObject": cdm.getObject( traceLinks[ i ].props.primary_object.dbValues[ 0 ] ),
                "secondaryObject": cdm.getObject( traceLinks[ i ].props.secondary_object.dbValues[ 0 ] )
            } );
        }
    }
    appCtxSvc.unRegisterCtx( "traceLinks" );
    return relInputArray;
};

/**
 * Returns the removeFromARStudy instance
 *
 * @member removeFromARStudy
 */

export default exports = {
    getVCObject,
    removeOperation,
    removeFromARStudyInput,
    getTraceLinks,
    deleteTraceLinkInput
};
app.factory( 'removeFromARStudy', () => exports );
