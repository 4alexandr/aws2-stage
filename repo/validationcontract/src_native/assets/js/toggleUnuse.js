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
 * @module js/toggleUnuse
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import mesgSvc from 'js/messagingService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import _ from 'lodash';
import 'lodash';

var exports = {};

var proxyMeasurableAttrs;

var pselected = null;

var i18n = null;
var _onXRTPageContextEventListener = null;
var _mappingTableContextName = 'Att1ShowMappedAttribute';

var setSelectedProxyObjects = function() {
    proxyMeasurableAttrs = [];
    pselected = cdm.getObject( getOpenedObjectUid() );

    var selectedProxyObjects = appCtxSvc.getCtx( 'selectedProxyObjects' );
    for( var i = 0; selectedProxyObjects && i < selectedProxyObjects.length; i++ ) {
        if( cmm.isInstanceOf( 'Att1AttributeAlignmentProxy', selectedProxyObjects[ i ].modelType ) ) {
            proxyMeasurableAttrs.push( selectedProxyObjects[ i ] );
        }
    }
};

var performAssignAttrSOA = function( inputs, refreshEvent ) {
    var input = {
        input: inputs
    };
    soaSvc.post( 'Internal-ValidationContractAW-2018-12-VCManagement', 'setMeasurableAttrDirection', input ).then(
        function() {
            if( refreshEvent ) {
                eventBus.publish( refreshEvent );
            } else {
                eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
            }

            var unusedAttrs = appCtxSvc.getCtx( 'unusedAttrsSelected' );
            if( unusedAttrs && unusedAttrs.length > 0 ) {
                var msg = i18n.ignoreUnusedAttrSelectMsg.replace( '{0}', unusedAttrs );
                mesgSvc.showInfo( msg );
                appCtxSvc.unRegisterCtx( 'unusedAttrsSelected' );
                appCtxSvc.unRegisterCtx( 'selectedAttrsName' );
            }
            var availAttrs = appCtxSvc.getCtx( 'invalidAttrsForToggle' );
            if( availAttrs && availAttrs.length > 0 ) {
                var msg1 = i18n.ignoreAvailableAttrSelectMsg.replace( '{0}', availAttrs );
                mesgSvc.showInfo( msg1 );
                appCtxSvc.unRegisterCtx( 'invalidAttrsForToggle' );
            }
        } );
};

/**
 * @param {Object} attrObj the attribute
 * @param {Array} invalidAttrsForToggle the invalid attributes
 * @returns {Array} the invalid attributes
 */
function _ignoreAttrsForToggle( attrObj, invalidAttrsForToggle ) {
    if( invalidAttrsForToggle.length > 0 ) {
        invalidAttrsForToggle = invalidAttrsForToggle.concat( ', ' );
    }
    invalidAttrsForToggle = invalidAttrsForToggle.concat( TypeDisplayNameService.instance.getDisplayName( attrObj ) );
    appCtxSvc.updatePartialCtx( 'invalidAttrsForToggle', invalidAttrsForToggle );
    return invalidAttrsForToggle;
}

/**
 * @param {Array} inputs the inputs
 * @returns {Array} the SOA inputs
 */
function _getARAttrsForToggleInput( inputs ) {
    var invalidAttrsForToggle = '';

    var unusedAttrs = [];
    var inOutAttrs = [];

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];

        if( attrType === 'unused' ) {
            unusedAttrs.push( proxyMeasurableAttrs[ j ] );
        } else if( attrType === 'not_available' || attrType === '' ) {
            invalidAttrsForToggle = _ignoreAttrsForToggle( proxyMeasurableAttrs[ j ], invalidAttrsForToggle );
            continue;
        } else {
            inOutAttrs.push( proxyMeasurableAttrs[ j ] );
        }
    }

    var parentElementObj = null;
    var idCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    if( idCtx && idCtx.isPortSelected && idCtx.targetModelObject ) {
        parentElementObj = cdm.getObject( idCtx.targetModelObject.uid );
    }

    if( unusedAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: parentElementObj,
                attrs: unusedAttrs,
                direction: 'input'
            } ]
        } );
    }

    if( inOutAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: parentElementObj,
                attrs: inOutAttrs,
                direction: 'automatic'
            } ]
        } );
    }

    return inputs;
}

function _getStudyAttrsForToggleInput( inputs ) {
    var invalidAttrsForToggle = '';
    var studyUnuseAttrs = [];

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];

        if( attrType === 'input' || attrType === 'output' || attrType === 'not_available' || attrType === '' ) {
            invalidAttrsForToggle = _ignoreAttrsForToggle( proxyMeasurableAttrs[ j ], invalidAttrsForToggle );
            continue;
        }
        studyUnuseAttrs.push( proxyMeasurableAttrs[ j ] );
    }

    if( studyUnuseAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: null,
                attrs: studyUnuseAttrs,
                direction: "input"
            } ]
        } );
    }
    return inputs;
}

var prepareInputForSOA = function() {
    var inputs = [];
    inputs = _getARAttrsForToggleInput( inputs );
    return inputs;
};

export let performToggleOperationForMappedTable = function( data ) {
    setSelectedProxyObjects();
    var inputs = prepareInputForSOA();
    i18n = data.i18n;
    performAssignAttrSOA( inputs );
};

export let performToggleOperationForProxyTable = function( data, ctx, refreshEvent ) {
    pselected = cdm.getObject( getOpenedObjectUid() );
    proxyMeasurableAttrs = ctx.selectedAttrProxyObjects;
    var inputs = prepareInputForSOA();
    i18n = data.i18n;
    performAssignAttrSOA( inputs, refreshEvent );
};

export let unusedAttrsOperationForMappedTable = function() {
    var objectName = '';
    var unusedAttrs = '';
    setSelectedProxyObjects();

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];
        if( objectName.length > 0 ) {
            objectName = objectName.concat( ',' );
        }
        if( attrType === 'unused' || attrType === 'not_available' || attrType === '' ) {
            if( unusedAttrs.length > 0 ) {
                unusedAttrs = unusedAttrs.concat( ', ' );
            }
            unusedAttrs = unusedAttrs.concat( TypeDisplayNameService.instance.getDisplayName( proxyMeasurableAttrs[ j ] ) );
        }
        objectName = objectName.concat( TypeDisplayNameService.instance.getDisplayName( proxyMeasurableAttrs[ j ] ) );
    }
    appCtxSvc.registerCtx( 'selectedAttrsName', objectName );
    appCtxSvc.registerCtx( 'unusedAttrsSelected', unusedAttrs );
};

export let unusedAttrsOperationForProxyTable = function( ctx ) {
    var objectName = '';
    var unusedAttrs = '';
    pselected = cdm.getObject( getOpenedObjectUid() );
    proxyMeasurableAttrs = ctx.selectedAttrProxyObjects;

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];
        if( objectName.length > 0 ) {
            objectName = objectName.concat( ',' );
        }
        if( attrType === 'unused' || attrType === 'not_available' || attrType === '' ) {
            if( unusedAttrs.length > 0 ) {
                unusedAttrs = unusedAttrs.concat( ', ' );
            }
            unusedAttrs = unusedAttrs.concat( TypeDisplayNameService.instance.getDisplayName( proxyMeasurableAttrs[ j ] ) );
        }
        objectName = objectName.concat( TypeDisplayNameService.instance.getDisplayName( proxyMeasurableAttrs[ j ] ) );
    }
    appCtxSvc.registerCtx( 'selectedAttrsName', objectName );
    appCtxSvc.registerCtx( 'unusedAttrsSelected', unusedAttrs );
};

export let unsetAttributesForMappedTable = function( data ) {
    var inputs = [];
    var inOutAttrs = [];

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];
        if( attrType === 'input' || attrType === 'output' ) {
            inOutAttrs.push( proxyMeasurableAttrs[ j ] );
        }
    }

    if( inOutAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: null,
                attrs: inOutAttrs,
                direction: 'unuse'
            } ]
        } );
    }
    i18n = data.i18n;
    performAssignAttrSOA( inputs );
};

export let unsetAttributesForProxyTable = function( data, refreshEvent ) {
    var inputs = [];
    var inOutAttrs = [];

    for( var j = 0; j < proxyMeasurableAttrs.length; j++ ) {
        var attrType = proxyMeasurableAttrs[ j ].props.att1AttrInOut.dbValues[ 0 ];
        if( attrType === 'input' || attrType === 'output' ) {
            inOutAttrs.push( proxyMeasurableAttrs[ j ] );
        }
    }

    if( inOutAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: null,
                attrs: inOutAttrs,
                direction: 'unuse'
            } ]
        } );
    }
    i18n = data.i18n;
    performAssignAttrSOA( inputs, refreshEvent );
};

export let unusedAttrsFilterForProxyTable = function( params, showUnusedAttrs ) {
    // Trigger selection or deselection of command button
    appCtxSvc.updateCtx( showUnusedAttrs, params.showUnusedAttrs );

    // flip the current value of the parameter to show unused attributes
    if( params.showUnusedAttrs === 'true' ) {
        params.showUnusedAttrs = 'false';
    } else {
        params.showUnusedAttrs = 'true';
    }

    // Update the table
    eventBus.publish( params.refreshEvent );
};

export let unusedAttrsFilterForMappedTable = function() {
    var selectUnusedAttrsFilter = appCtxSvc.getCtx( 'selectUnusedAttrsFilter' );
    if( selectUnusedAttrsFilter === undefined || selectUnusedAttrsFilter === null ||
        selectUnusedAttrsFilter === 'false' ) {
        appCtxSvc.registerCtx( 'selectUnusedAttrsFilter', 'true' );
        selectUnusedAttrsFilter = 'true';
    } else if( selectUnusedAttrsFilter === 'true' ) {
        appCtxSvc.updateCtx( 'selectUnusedAttrsFilter', 'false' );
        selectUnusedAttrsFilter = 'false';
    }

    if( appCtxSvc.ctx.subscribeToXRTPageContext === undefined ) {
        _onXRTPageContextEventListener = eventBus.subscribe( 'appCtx.update', function( eventData ) {
            if( eventData.name === 'xrtPageContext' && appCtxSvc.ctx.subscribeToXRTPageContext === true ) {
                _unregisterPropPolicies();
            }
        }, 'Att1AttributeMappingService' );
        appCtxSvc.updatePartialCtx( 'subscribeToXRTPageContext', true );
    }

    var mapContext = appCtxSvc.getCtx( _mappingTableContextName );
    mapContext.showUnusedAttrs = selectUnusedAttrsFilter;
    mapContext.openedObjectUid = getOpenedObjectUid();
    appCtxSvc.updatePartialCtx( _mappingTableContextName, mapContext );

    eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
};

export let performSetUsageOperationForProxyTable = function( data, ctx, usage ) {

    //Get from which parameter table setUsage operation is performed
    //Proxy Table / Mapped Table / InDef Table
    var pramTableCategory = _getParamTableCategory();
    appCtxSvc.registerCtx( 'pramTableCategory', pramTableCategory );

    if(pramTableCategory === 'PARAM_PROXY_TABLE' || pramTableCategory === 'PARAM_INDEF_TABLE')
    {
        proxyMeasurableAttrs = ctx.selectedAttrProxyObjects;
    }
    else if(pramTableCategory === 'PARAM_MAPPED_TABLE')
    {
        setSelectedProxyObjects();
    }

    pselected = cdm.getObject( getOpenedObjectUid() );
    //var inputs = prepareInputForSOA();
    var inputs = [];
    var parentElementObj = null;
    var idCtx = appCtxSvc.getCtx( 'interfaceDetails' );
    if( idCtx && idCtx.isPortSelected && idCtx.targetModelObject ) {
        parentElementObj = cdm.getObject( idCtx.targetModelObject.uid );
    }

    if( proxyMeasurableAttrs.length > 0 ) {
        inputs.push( {
            clientId: 'InputOrOutputOrNone',
            analysisRequest: pselected,
            data: [ {
                parentElement: parentElementObj,
                attrs: proxyMeasurableAttrs,
                direction: usage
            } ]
        } );
    }

    i18n = data.i18n;
    //performAssignAttrSOA( inputs, refreshEvent );
    var input = {
        input: inputs
    };
    soaSvc.post( 'Internal-ValidationContractAW-2018-12-VCManagement', 'setMeasurableAttrDirection', input ).then(
        function() {
            _postSetUsageAction(pramTableCategory);
        } );
};

/**
 * Unregister Property Policies as soon as AR Content tab is unloaded.
 */
function _unregisterPropPolicies() {
    eventBus.unsubscribe( _onXRTPageContextEventListener );
    appCtxSvc.unRegisterCtx( 'subscribeToXRTPageContext' );
    appCtxSvc.unRegisterCtx( 'selectUnusedAttrsFilter' );
    appCtxSvc.unRegisterCtx( _mappingTableContextName );
}

/**
 * Get the opened object uid
 */
function getOpenedObjectUid() {
    var openedObjectUid = '';
        var stateSvc = AwStateService.instance;
        if( stateSvc && stateSvc.params ) {
            var params = stateSvc.params;
            if( params.s_uid ) {
                openedObjectUid = params.s_uid;
            } else if( params.uid ) {
                openedObjectUid = params.uid;
            }
        }
    return openedObjectUid;
}

/**
 * This function will return which parameter table is in use
 */
function _getParamTableCategory()
{
    var paramTableCategory;

    var interfaceDetails = _.get( appCtxSvc, 'ctx.interfaceDetails', undefined );
    var selectedObjectsFromProxyTable = _.get( appCtxSvc, 'ctx.selectedAttrProxyObjects', undefined );
    var selectedObjectsFromMappedTable = _.get( appCtxSvc, 'ctx.selectedProxyObjects', undefined );

    if(selectedObjectsFromProxyTable && selectedObjectsFromProxyTable.length > 0 && interfaceDetails && interfaceDetails.isPortSelected)
    {
        paramTableCategory = "PARAM_INDEF_TABLE";
    }
    else if(selectedObjectsFromProxyTable && selectedObjectsFromProxyTable.length > 0)
    {
        paramTableCategory = "PARAM_PROXY_TABLE";
    }
    else if(selectedObjectsFromMappedTable && selectedObjectsFromMappedTable.length > 0)
    {
        paramTableCategory = "PARAM_MAPPED_TABLE";
    }

    return paramTableCategory;
}

function _postSetUsageAction(pramTableCategory)
{
    if(pramTableCategory === 'PARAM_PROXY_TABLE')
    {
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
    else if(pramTableCategory === 'PARAM_INDEF_TABLE')
    {
        eventBus.publish( 'Att1ShowInterfaceDefAttrsTable.refreshTable' );
    }
    else if(pramTableCategory === 'PARAM_MAPPED_TABLE')
    {
        eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
    }
}

/**
 * Returns the toggleInputOutput instance
 *
 * @member toggleInputOutput
 */

export default exports = {
    performToggleOperationForMappedTable,
    performToggleOperationForProxyTable,
    unusedAttrsOperationForMappedTable,
    unusedAttrsOperationForProxyTable,
    unsetAttributesForMappedTable,
    unsetAttributesForProxyTable,
    unusedAttrsFilterForProxyTable,
    unusedAttrsFilterForMappedTable,
    performSetUsageOperationForProxyTable
};
app.factory( 'toggleUnuse', () => exports );
