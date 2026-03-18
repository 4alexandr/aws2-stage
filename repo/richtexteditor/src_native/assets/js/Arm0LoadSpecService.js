//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Arm0LoadSpecService
 */
import app from 'app';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import reqACEUtils from 'js/requirementsACEUtils';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';

var exports = {};

var PAGE_SIZE = 3;
var content;


/**
 * Set content when documentation tab is loaded.
 *
 * @param {Object} data - The panel's view model object
 */
export let setDocumentationContent = function( data ) {
    content = data.content;
};

/**
 * Get content when documentation tab is loaded.
 */
export let getDocumentationContent = function() {
    return content;
};

/**
 * Get NextOccuraceData .
 *
 * @param {Object} data - view model data
 * @param {Object} ctx - ctx
 * @param {Object} inputCtxt -
 * @returns {Array} Next child occ data
 */
var _getNextOccuranceData = function( data, ctx, inputCtxt ) {
    var goForward = data.goForward;
    var curTopBottomInfo = {};
    var nextChildOccData = {};

    if( data.content && data.content.cursor ) {

        curTopBottomInfo = {
            "startOcc": data.content.cursor.startOcc,
            "endOcc": data.content.cursor.endOcc
        };

        nextChildOccData = reqACEUtils.getCursorInfoForNextFetch( data.content.cursor, PAGE_SIZE, goForward,
            curTopBottomInfo );

    }
    else {

        // Its first time loading
        data.goForward = true;
        var prodCtxt = occMgmtStateHandler.getProductContextInfo();
        if( prodCtxt ) {

            nextChildOccData = reqACEUtils.getCursorInfoForFirstFetch( prodCtxt, PAGE_SIZE, data.goForward, inputCtxt );

        }

    }

    return nextChildOccData;
};

/**
 * Get Input data for getSpecificationSegmentInputForSelected.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInputForSelected = function( data, ctx ) {

    var selectObj ={
        uid: ctx.selected.uid,
        type: ctx.selected.type
    };
    if( data.content && data.content.cursor ) {
        data.content.cursor.startOcc = { uid: "AAAAAAAAAAAAAA", type: "unknownType" };
        data.content.cursor.endOcc = { uid: "AAAAAAAAAAAAAA", type: "unknownType" };
    }
    data.goForward = true;
    var inputCtxt = reqACEUtils.getInputContext();
    var inputData = {
        inputCtxt: inputCtxt,
        inputObjects: [ selectObj ],
        nextOccData: _getNextOccuranceData( data, ctx, inputCtxt ),
        options: [ 'FirstLevelOnly', 'EditMode' ]
    };
    return inputData;
};

/**
 * Get Input data for getSpecificationSegment.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInput = function( data, ctx ) {

    // By default top element will be send as default input objects
    var selectObj = reqACEUtils.getTopSelectedObject( ctx );

    var page_size = 0;
    if( data.preferences && data.preferences.AWC_req_viewer_page_size ){
        page_size = parseInt( data.preferences.AWC_req_viewer_page_size[ 0 ] );
    }

    if( page_size > 0 ) {
        if( !data.content ) {
            //While first time loading;  if page size is greater then 0 ;To Ensure selected object content is loaded
            selectObj = {
                uid: ctx.selected.uid,
                type: ctx.selected.type
            };
        } else if( data.handleMoveOperationInPagination ) {
            selectObj = {
                uid: data.movedObject.uid,
                type: data.movedObject.type
            };
            data.content = undefined;
        } else if( !data.arm0PageUpOrDownAction ) {
            // Saving should retain selection and should not move to next page
            return exports.getSpecificationSegmentInputForSelected( data, ctx );
        }
    }
    var inputCtxt = reqACEUtils.getInputContext();
    var inputData = {
        inputCtxt: inputCtxt,
        inputObjects: [ selectObj ],
        nextOccData: _getNextOccuranceData( data, ctx, inputCtxt ),
        options: [ 'FirstLevelOnly', 'EditMode' ]
    };
    return inputData;
};

/**
 * Call SOA for getSpecificationSegment with Property Policy Override
 *
 * @param {Object} inputData Input Data for SOA call
 * @param {Object} propertyPolicyOverride Property Policy
 * @returns {Object} - Json object
 */
export let getSpecificationSegment = function( inputData, propertyPolicyOverride ) {
    return soaSvc.post( 'Internal-AwReqMgmtSe-2019-06-SpecNavigation', 'getSpecificationSegment', inputData, propertyPolicyOverride );
};

/**
 * Service for Arm0LoadSpecService.
 *
 * @member Arm0LoadSpecService
 */

export default exports = {
    getSpecificationSegmentInput,
    getSpecificationSegment,
    setDocumentationContent,
    getDocumentationContent,
    getSpecificationSegmentInputForSelected
};
app.factory( 'Arm0LoadSpecService', () => exports );
