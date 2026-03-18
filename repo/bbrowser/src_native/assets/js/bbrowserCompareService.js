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
 * @module js/bbrowserCompareService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import LocationNavigationService from 'js/locationNavigation.service';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import preferenceService from 'soa/preferenceService';
import assert from 'assert';
import _ from 'lodash';

var exports = {};

var _locData = null;

/**
 * Internally adds the first selection as a source and second selection as target and launches compare location.
 *
 * @param {String} srcUID - The UID of the briefcase that is the source file
 * @param {String} targetUID - The UID of the briefcase that is the target file
 * @param {String} srcMapUID - The UID of the transfer option set used to map the source briefcase
 * @param {String} targetMapUID - The UID of the transfer option set used to map the target briefcase
 */
export let launchBriefcaseCompare = function( srcUID, targetUID, srcMapUID, targetMapUID ) {
    //initializeCompareList();
    var toParams = {};
    toParams.src_uid = srcUID;
    toParams.trg_uid = targetUID;

    var mappedUIDsrc = srcMapUID.dbValue;

    if( mappedUIDsrc === null ) {
        mappedUIDsrc = '';
    } else {
        mappedUIDsrc = srcMapUID.dbValue;
    }
    toParams.src_map_uid = mappedUIDsrc;

    preferenceService.setStringValue( 'TC_defaultTransferOptionSet_briefcase_src', [ mappedUIDsrc ] );

    var mappedUIDtrg = targetMapUID.dbValue;

    if( mappedUIDtrg === null ) {
        mappedUIDtrg = '';
    } else {
        mappedUIDtrg = targetMapUID.dbValue;
    }
    toParams.tar_map_uid = mappedUIDtrg;

    preferenceService.setStringValue( 'TC_defaultTransferOptionSet_briefcase_trg', [ mappedUIDtrg ] );

    var transitionTo = 'compareBriefcase';
    LocationNavigationService.instance.go( transitionTo, toParams );
};

/**
 * Returns the selected source
 *
 * @return {IModelObject} The source IModelObject.
 */
export let getSourceContexts = function() {
    var deferred = AwPromiseService.instance.defer();
    var srcContext = [];
    if( AwStateService.instance.params.src_uid ) {
        var uidsForLoadObject = [ AwStateService.instance.params.src_uid ];
        if( AwStateService.instance.params.spci_uid ) {
            uidsForLoadObject.push( AwStateService.instance.params.spci_uid );
        }
        return dataManagementSvc.loadObjects( uidsForLoadObject ).then( function() {
            var oUidObject = cdm.getObject( AwStateService.instance.params.src_uid );
            srcContext.push( oUidObject );
            deferred.resolve( srcContext );
            return deferred.promise;
        } );
    }
    return deferred.promise;
};

/**
 * Gets the value from the transfer option set name in order to display the name on the compare page.
 *
 * @param {*} Data - the data object from the compare page to modify the transfer set values.
 */
export let getMappingContexts = function( Data ) {
    if( Data ) {
        _locData = Data;
        _locData.sourceTransferSet.uiValue = 'No Option Set Selected';
        _locData.sourceTransferSet.dbValue = 'No Option Set Selected';
        _locData.targetTransferSet.uiValue = 'No Option Set Selected';
        _locData.targetTransferSet.dbValue = 'No Option Set Selected';
    }
    if( AwStateService.instance.params.src_map_uid || AwStateService.instance.params.tar_map_uid ) {
        var soaInput = { inputs: { isPush: false, isExport: false } };
        soaSvc.postUnchecked( 'GlobalMultiSite-2007-06-ImportExport', 'getAvailableTransferOptionSets', soaInput ).then(
            function( response ) {
                _handleTransferResponse( response );
            } );
    }
};

/**
 * This function handles the response from the get available transfer option sets SOA
 * 
 * @param {*} response - the information given back from the SOA call that contains  
 */
function _handleTransferResponse( response ) {
    var props = response.ServiceData;
    if( props ) {
        for( var idx = 0; idx < props.plain.length; idx++ ) {
            if( props.plain[ idx ] === AwStateService.instance.params.src_map_uid ) {
                if( _locData ) {
                    _locData.sourceTransferSet.uiValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
                    _locData.sourceTransferSet.dbValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
                }
            }
            if( props.plain[ idx ] === AwStateService.instance.params.tar_map_uid ) {
                if( _locData ) {
                    _locData.targetTransferSet.uiValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
                    _locData.targetTransferSet.dbValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
                }
            }
        }
    }
}
/**
 * Returns the selected target
 *
 * @return {IModelObject} The source IModelObject.
 */
export let getTargetContexts = function() {
    var deferred = AwPromiseService.instance.defer();
    var tgtContext = [];
    if( AwStateService.instance.params.trg_uid ) {
        var uidsForLoadObject = [ AwStateService.instance.params.trg_uid ];
        if( AwStateService.instance.params.tpci_uid ) {
            uidsForLoadObject.push( AwStateService.instance.params.tpci_uid );
        }
        return dataManagementSvc.loadObjects( uidsForLoadObject ).then( function() {
            var oUidObject = cdm.getObject( AwStateService.instance.params.trg_uid );
            tgtContext.push( oUidObject );
            deferred.resolve( tgtContext );
            return deferred.promise;
        } );
    }
    return deferred.promise;
};

export default exports = {
    launchBriefcaseCompare,
    getSourceContexts,
    getMappingContexts,
    getTargetContexts
};
/**
 * @memberof NgServices
 * @member bbrowserCompareService
 */
app.factory( 'bbrowserCompareService', () => exports );
