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
 * @module js/manageVerificationService
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import mesgSvc from 'js/messagingService';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import 'lodash';

var exports = {};

export let callManageVerificationSOA = function( input, pref, data, tableContext ) {

    soaSvc.post( 'ValidationContractAW-2020-12-VCManagement', 'manageVerificationRequests', {
        input: input,
        pref: pref
    } ).then( function( response ) {
        exports.refreshTable( response, data, tableContext );
    }, function( response ) {
        exports.processPartialErrors( response );
    } );
};

export let processPartialErrors = function( response ) {
    if( response.cause && response.cause.partialErrors ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( response && response.cause.partialErrors ) {
        _.forEach( response.cause.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }
    mesgSvc.showError( msgObj.msg );
}
};

var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

var _handleInfoMessage = function( response, data ) {
    var elementsToAdd = data.getManageVRInputToAddToContentsTable.manageARElements;
    var elementsToAdd1 = data.getManageVRInputToAddToContentsTable.allManageARElements;
    var invalidObjects = data.getManageVRInputToAddToContentsTable.invalidObjects;

    // handle Info message
    if( response.output.length !== 0 && ( invalidObjects && invalidObjects.length !== 0 ) ) {
        var error = '';
        for( var i = 0; i < invalidObjects.length; i++ ) {
            error = error.concat( "'" + invalidObjects[ i ].props.object_string.dbValue + "'" + ' ' + 'is' + ' ' + "'" + invalidObjects[ i ].modelType.displayName +
                "(Classname ::" + invalidObjects[ i ].type + ")'" + '\n' );
        }
        var objName = response.output[ 0 ].verificationRequest.props.object_string.dbValues[ 0 ];
        var msg = data.i18n.throwError.replace( '{0}', elementsToAdd.length ).replace( '{1}', elementsToAdd1.length )
            .replace( '{2}', objName ).replace( '{3}', error );
        var errorString = msg + ' ';
        mesgSvc.showInfo( errorString );
    }
};

export let refreshTable = function( response, data, context ) {
    if( data && data.getManageVRInputToAddToContentsTable && data.getManageVRInputToAddToContentsTable.invalidObjects &&
        data.getManageVRInputToAddToContentsTable.invalidObjects[0] &&
        ( appCtxSvc.ctx.selected === null || ((appCtxSvc.ctx.selected.modelType.typeHierarchyArray[0] !== appCtxSvc.ctx.locationContext.modelObject.modelType.typeHierarchyArray[0]) ||
        (appCtxSvc.ctx.selected.modelType.typeHierarchyArray[0] === appCtxSvc.ctx.locationContext.modelObject.modelType.typeHierarchyArray[0] &&
            appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Crt0VldnContractRevision') > -1)))) {
        _handleInfoMessage( response, data );
    }
    if( context === 'contentsTable' && appCtxSvc.ctx.isContentTab === false ) {
        eventBus.publish( 'cdm.relatedModified', {
            "refreshLocationFlag": true,
            "relatedModified": [ data.getManageVRInputToAddToContentsTable.oobj ]
        } );
    }
    if( context === 'contentsTable' && appCtxSvc.ctx.isContentTab === true ) {
        eventBus.publish( 'Crt1ContentsTable.refreshTable', {
            "refreshParamTable": true
        } );
    }
    if( context === 'contentsTable' && appCtxSvc.ctx.isBOMAdded === true ) {
        eventBus.publish( 'Crt1ContentsTable.refreshTable', {
            "refreshBOMTable": true
        } );
    }
    if( context === 'contentsTable' && appCtxSvc.ctx.isTPAdded === true ) {
        eventBus.publish( 'Crt1ContentsTable.refreshTable', {
            "refreshTPTable": true
        } );
    }
    if( context === 'contentsTable' && appCtxSvc.ctx.isTMAdded === true ) {
        eventBus.publish( 'Crt1ContentsTable.refreshTable', {
            "refreshTMTable": true
        } );
    }
    if( context === 'TPTMTable' && appCtxSvc.ctx.isContentTab === true ) {
        if( appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTable' || appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsSibling' ||
            appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsChild' ||
            ( appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsChildChild' && appCtxSvc.ctx.TR_TPTableSelection ) ||
            ( appCtxSvc.ctx.ActiveCommandId === 'IAV1AddContentToTPTableAsSiblingSibling' && appCtxSvc.ctx.TR_TPTableSelection ) ) {
            eventBus.publish( 'IAV1ContentsTPTable.refreshTable' );
        } else {
            eventBus.publish( 'IAV1ContentsTMTable.refreshTable' );
        }
    }
    if( context === 'TPTMTable' && appCtxSvc.ctx.isContentTab === false ) {
        eventBus.publish( 'cdm.relatedModified', {
            "refreshLocationFlag": true,
            "relatedModified": [ data.getManageVRInputToAddToTPTMTable.oobj ]
        } );
    }
    if( context === 'TestBOMTable' ) {
        eventBus.publish( 'testAndProdBOMTableProvider.refreshTable' );
        eventBus.publish( 'Crt1ContentsTable.refreshTable' );
    }
    if( context === 'PhyBOMTable' ) {
        eventBus.publish( 'testEBOMTableProvider.refreshTable' );
        eventBus.publish( 'Crt1ContentsTable.refreshTable' );
    }
    if( context === 'removeFromAR' ) {
        if(appCtxSvc.ctx.TR_TestBOMTableSelection && appCtxSvc.ctx.TR_TestBOMTableSelection.length > 0 ) {
            eventBus.publish( 'testAndProdBOMTableProvider.refreshTable' );
        }
        else if(appCtxSvc.ctx.vrContentTableSelection && appCtxSvc.ctx.vrContentTableSelection.length > 0 ) {
            eventBus.publish( 'Crt1ContentsTable.refreshTable', {
                "refreshParamTable": true
            } );
        }
        else if( appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Content' ) {
            eventBus.publish( 'cdm.relatedModified', {
                "refreshLocationFlag": true,
                "relatedModified": [ data.manageARInput.oobj ]
            } );
        }
        else if(appCtxSvc.ctx.TR_TPTableSelection && appCtxSvc.ctx.TR_TPTableSelection.length > 0 ) {
            appCtxSvc.unRegisterCtx( 'TR_TPTableSelection' );
            eventBus.publish( 'IAV1ContentsTPTable.refreshTable' );
        }
        else if(appCtxSvc.ctx.TR_TMTableSelection && appCtxSvc.ctx.TR_TMTableSelection.length > 0 ) {
            appCtxSvc.unRegisterCtx( 'TR_TMTableSelection' );
            eventBus.publish( 'IAV1ContentsTMTable.refreshTable' );
        }
    }
};

export default exports = {
    callManageVerificationSOA,
    processPartialErrors,
    refreshTable
};
app.factory( 'manageVerificationService', () => exports );
