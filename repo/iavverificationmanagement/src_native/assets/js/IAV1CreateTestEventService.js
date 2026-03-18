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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/IAV1CreateTestEventService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import dateTimeSvc from 'js/dateTimeService';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/viewModelObjectService';
import 'js/messagingService';
import 'js/localeService';

// Exports to hold the methods to be used
var exports = {};
// App context service

/**
 * @private
 *
 * @property {soa_kernel_clientDataModel} Cached reference to the injected AngularJS service.
 */

export let getCreateInput = function( data ) {
    var name = data.object_name.dbValues[ 0 ];
    var desc = data.object_desc.dbValues[ 0 ];
    var eventState = data.revision__iav0TestEventState.dbValues[ 0 ];
    if( eventState === null ) {
        eventState = '';
    }
    var vmProp2 = _.get( data, 'revision__iav0TestEventDate' );
    var eventDate = '';
    if( vmProp2 ) {
        eventDate = dateTimeSvc.formatUTC( vmProp2.dbValue );
    }

    data.isEmptyTestEvent = false;
    if( !desc ) {
        desc = '';
    }

    var testProcedureUid = '';

    if( appCtxSvc.ctx.pselected.props.awb0UnderlyingObject ) {
        testProcedureUid = appCtxSvc.ctx.pselected.props.awb0UnderlyingObject.dbValues[ 0 ];
        if( appCtxSvc.ctx.mselected.length === 1 && appCtxSvc.ctx.mselected[ 0 ].type === 'Arm0RequirementSpecElement' ) {
            data.isEmptyTestEvent = true;
        } else {
            data.isEmptyTestEvent = false;
        }
    } else if( appCtxSvc.ctx.xrtSummaryContextObject && appCtxSvc.ctx.xrtSummaryContextObject.uid &&
        appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestProcedurRevision' ) > -1 ) {
        testProcedureUid = appCtxSvc.ctx.xrtSummaryContextObject.uid;
        data.isEmptyTestEvent = true;
    }

    var createInput = {
        clientId: 'CreateObject',
        createData: {
            boName: 'IAV0TestEvent',
            propertyNameValues: {
                object_name: [ name ],
                object_desc: [ desc ]
            },
            compoundCreateInput: {
                revision: [ {
                    boName: 'IAV0TestEventRevision',
                    propertyNameValues: {
                        iav0TestEventDate: [ eventDate ],
                        iav0TestEventState: [ eventState ]
                    }
                } ]
            }
        },
        dataToBeRelated: {},
        pasteProp: 'IAV0VerificationTL',
        targetObject: {
            type: 'IAV0TestProcedurRevision',
            uid: testProcedureUid
        }
    };
    return [ createInput ];
};

export let getCreateRelationInputForTestProPredecessor = function( data ) {
    var input = [];
    var secondaryObject_type = null;
    var secondaryObject_uid = null;
    var primaryObject_type = null;
    var primaryObject_uid = null;
    for( var i = 0; i < data.sourceObjects.length; i++ ) {
        secondaryObject_type = data.sourceObjects[ i ].type;
        secondaryObject_uid = data.sourceObjects[ i ].uid;
        primaryObject_type = 'IAV0TestProcedurRevision';
        primaryObject_uid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[ 0 ];

        var jsoObj = {
            clientId: '',
            primaryObject: {
                type: primaryObject_type,
                uid: primaryObject_uid
            },
            relationType: 'IAV0TestProcPredecessor',
            secondaryObject: {
                type: secondaryObject_type,
                uid: secondaryObject_uid
            }
        };
        input.push( jsoObj );
    }
    return input;
};

export let getCreateRelationInputForPlanLevelEvents = function( data ) {
    var input = [];
    var secondaryObject_type = null;
    var secondaryObject_uid = null;
    var primaryObject_type = null;
    var primaryObject_uid = null;
    for( var i = 0; i < data.sourceObjects.length; i++ ) {
        secondaryObject_type = 'Crt0VldnContractRevision';
        secondaryObject_uid = appCtxSvc.ctx.xrtSummaryContextObject.uid;
        primaryObject_type = data.sourceObjects[ i ].type;
        primaryObject_uid = data.sourceObjects[ i ].uid;

        var jsoObj = {
            clientId: '',
            primaryObject: {
                type: primaryObject_type,
                uid: primaryObject_uid
            },
            relationType: 'Psi0EventPrgDel',
            secondaryObject: {
                type: secondaryObject_type,
                uid: secondaryObject_uid
            }
        };
        input.push( jsoObj );
    }
    return input;
};

export let getCreateRelationInputForBOM = function( data ) {
    var input = [];
    var _type = null;
    var targetObj = cdm.getObject( appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[ 0 ] );

    if( targetObj.type === 'IAV0TestRequestRevision' ) {
        _type = 'IAV0TestRequestRevision';
    } else if( targetObj.type === 'IAV0TestProcedurRevision' ) {
        _type = 'IAV0TestProcedurRevision';
    }
    var jsoObj = {
        clientId: '',
        primaryObject: {
            type: _type,
            uid: appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[ 0 ]
        },
        relationType: 'IAV0BOMConfigTL',
        secondaryObject: {
            type: data.sourceObjects[ 0 ].type,
            uid: data.sourceObjects[ 0 ].uid
        }
    };
    input.push( jsoObj );
    return input;
};

export let getElementsToAdd = function( data ) {
    var objects = [];
    for( var i = 0; i < appCtxSvc.ctx.mselected.length; i++ ) {
        var jsoObj = {
            uid: appCtxSvc.ctx.mselected[ i ].props.awb0UnderlyingObject.dbValues[ 0 ]
        };
        objects.push( jsoObj );
    }
    return objects;
};

export let getTestEvent = function( data ) {
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2018-05-OccurrenceManagement', 'getOccurrences7', {
        inputData: {
            product: {
                type: 'IAV0TestEventRevision', // IAV0TestEventRevision
                uid: data.outputCreatedObject.uid //data.outputCreatedObject
            }
        }
    } ).then(
        function( response ) {
            data.testContext = response.parentOccurrence.occurrence;
            eventBus.publish( 'addChildInTestEvent1' );
        } );
};

export default exports = {
    getCreateInput,
    getCreateRelationInputForTestProPredecessor,
    getCreateRelationInputForPlanLevelEvents,
    getCreateRelationInputForBOM,
    getElementsToAdd,
    getTestEvent
};
/**
 * Service takes care of the various operations required to create the remote link
 *
 * @memberof NgServices
 * @member Awp0NewWorkflowProcess
 */
app.factory( 'IAV1CreateTestEventService', () => exports );
