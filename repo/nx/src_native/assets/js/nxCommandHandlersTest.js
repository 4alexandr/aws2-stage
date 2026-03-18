// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 window
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/nxCommandHandlersTest
 */
import app from 'app';
import notyService from 'js/NotyModule';
import hostUtils from 'js/hosting/hostUtils';
import cfgSvc from 'js/configurationService';

import 'config/testdatamaster';

var exports = {};

var _itemMap = cfgSvc.getCfgCached( 'testdatamaster' ).itemMap;

var _setDefaultFolderMap = cfgSvc.getCfgCached( 'testdatamaster' ).setDefaultFolderNxMap;

function createEncodedPayloadData( sourceObjs ) {
    var targets = [];
    for( var i = 0; i < sourceObjs.length; i++ ) {
        var data = {
            DBId: "",
            ObjId: sourceObjs[ i ].uid,
            ObjType: sourceObjs[ i ].type
        };
        var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
        var datatoPush = {
            DBId: sourceObjs[ i ].props.object_string.dbValues[ 0 ],
            Data: encodedData,
            ObjType: sourceObjs[ i ].type,
            Type: "UID"
        };
        targets.push( datatoPush );
    }
    return targets;
}

function setPayloadData( payloadData ) {
    for( var i = 0; i < payloadData.length; i++ ) {
        var item = payloadData[ i ];
        var itemName = payloadData[ i ].DBId;
        var itemType = payloadData[ i ].ObjType;
        var itemData = payloadData[ i ].Data;
        if( itemType === "ItemRevision" ) {
            for( var y in _itemMap ) {
                var containsItem = false;
                if( itemName === y ) {
                    _itemMap[ itemName ] = itemData;
                    containsItem = true;
                } else {
                    containsItem = false;
                    //if file does not contain the item key what do we do....?
                }
            }
        } else {
            for( var y in _setDefaultFolderMap ) {
                var containsItem = false;
                if( itemName === y ) {
                    _setDefaultFolderMap[ itemName ] = itemData;
                    containsItem = true;
                } else {
                    containsItem = false;
                }
            }
        }
    }
}

function verifyPayloadData( itemName, payloadValue ) {
    var verified = false;
    if( _itemMap[ itemName ] === payloadValue || _setDefaultFolderMap[ itemName ] === payloadValue ) {
        verified = true;
    }
    return verified;
}

function verifyItemSelection( itemName ) {
    var verify = null;
    for( var i in _itemMap ) {
        if( itemName === _itemMap[ i ] ) {
            verify = true;
        }
    }
    return verify;
}

function verifyFolderSelection( itemName ) {
    var verify = null;
    for( var i in _setDefaultFolderMap ) {
        if( itemName === _setDefaultFolderMap[ i ] ) {
            verify = true;
        }
    }
    return verify;
}

export let nxCheckinCheckoutCommandDelegate = function( sourceObjects, operation ) {

    // TODO: This payload creation must be removed once Hosting module is converted to native.
    var data = {
        DBId: "",
        ObjId: sourceObjects[ 0 ].uid,
        ObjType: "UGMASTER"
    };
    var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
    var payload = {
        Version: "_2016_03",
        Operation: operation,
        Targets: [ {
            Data: encodedData,
            Type: "UID"
        } ]
    };
};

export let openInNxHandler = function( sourceObjects ) {
    var payloadData = createEncodedPayloadData( sourceObjects );
    setPayloadData( payloadData );
    var isCorrect = false;
    for( var i = 0; i < sourceObjects.length; i++ ) {
        var data = {
            DBId: "",
            ObjId: sourceObjects[ i ].uid,
            ObjType: sourceObjects[ i ].type
        };
        var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
        var itemName = sourceObjects[ i ].props.object_string.dbValues[ 0 ];
        if( verifyItemSelection ) {
            isCorrect = verifyPayloadData( itemName, encodedData );
        }
        if( isCorrect === true ) {
            notyService.showInfo( "The correct payload was sent to the Host" );
        } else {
            notyService.showInfo( "The incorrect payload was sent to the Host" );
        }
    }
};

export let addComponentHandler = function( sourceObjects ) {
    var payloadData = createEncodedPayloadData( sourceObjects );
    setPayloadData( payloadData );
    var isCorrect = false;
    for( var i = 0; i < sourceObjects.length; i++ ) {
        var data = {
            DBId: "",
            ObjId: sourceObjects[ i ].uid,
            ObjType: sourceObjects[ i ].type
        };
        var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
        var itemName = sourceObjects[ i ].props.object_string.dbValues[ 0 ];
        if( verifyItemSelection ) {
            isCorrect = verifyPayloadData( itemName, encodedData );
        }
        if( isCorrect === true ) {
            notyService.showInfo( "The correct payload was sent to the Host" );
        } else {
            notyService.showInfo( "The incorrect payload was sent to the Host" );
        }
    }

};

export let openWithContextHandler = function( sourceObjects, context ) {
    if( context === "com.siemens.splm.client.nx.hosted.internal.operations.SetDefaultFolderHostedOperation" ) {
        var payloadData = createEncodedPayloadData( sourceObjects );
        setPayloadData( payloadData );
        var isCorrect = false;
        for( var i = 0; i < sourceObjects.length; i++ ) {
            var data = {
                DBId: "",
                ObjId: sourceObjects[ i ].uid,
                ObjType: sourceObjects[ i ].type
            };
            var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
            var itemName = sourceObjects[ i ].props.object_string.dbValues[ 0 ];
            if( verifyItemSelection ) {
                isCorrect = verifyPayloadData( itemName, encodedData );
            }
            if( isCorrect === true ) {
                notyService.showInfo( "The correct payload was sent to the Host" );
            } else {
                notyService.showInfo( "The incorrect payload was sent to the Host" );
            }
        }

    } else {
        var payloadData = createEncodedPayloadData( sourceObjects );
        setPayloadData( payloadData );
        var isCorrect = false;
        for( var i = 0; i < sourceObjects.length; i++ ) {
            var data = {
                DBId: "",
                ObjId: sourceObjects[ i ].uid,
                ObjType: sourceObjects[ i ].type
            };
            var encodedData = hostUtils.encodeEmbeddedJson( JSON.stringify( data ) );
            var itemName = sourceObjects[ i ].props.object_string.dbValues[ 0 ];
            if( verifyItemSelection ) {
                isCorrect = verifyPayloadData( itemName, encodedData );
            }
            if( isCorrect === true ) {
                notyService.showInfo( "The correct payload was sent to the Host" );
            } else {
                notyService.showInfo( "The incorrect payload was sent to the Host" );
            }
        }
    }
};

export default exports = {
    nxCheckinCheckoutCommandDelegate,
    openInNxHandler,
    addComponentHandler,
    openWithContextHandler
};
/**
 * TODO
 *
 * @member nxCommandHandlers
 * @memberof NgServices
 */
app.factory( 'nxCommandHandlersTest', () => exports );
