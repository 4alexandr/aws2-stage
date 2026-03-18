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
 * @module js/bbrowserOneClickViewerService
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
 * Internally adds the first selection as a source and launches viewer location.
 * @param {String} srcUID - The UID of the briefcase that is the source file
 * @param {String} srcMapUID - The UID of the transfer option set that the
 */
export let launchOneClickViewer = function( srcUID, srcMapUID ) {
    //initializeCompareList();
    var toParams = {};
    toParams.src_uid = srcUID;
    var mappedUID = srcMapUID.dbValue;

    if( mappedUID === null ) {
        mappedUID = '';
    } else {
        mappedUID = srcMapUID.dbValue;
    }
    toParams.src_map_uid = mappedUID;

    var srcPreference = [ mappedUID ];
    preferenceService.setStringValue( 'TC_defaultTransferOptionSet_briefcase_src', srcPreference );

    var transitionTo = 'viewerBriefcase';
    LocationNavigationService.instance.go( transitionTo, toParams );
};

export let previewContext = function( uidToLoad ) {
    var deferred = AwPromiseService.instance.defer();
    var srcContext = [];
    if( uidToLoad ) {
        var uidsForLoadObject = [ uidToLoad ];
        return dataManagementSvc.loadObjects( uidsForLoadObject ).then( function() {
            var oUidObject = cdm.getObject( uidToLoad );
            srcContext.push( oUidObject );
            deferred.resolve( srcContext );
            return deferred.promise;
        } );
    }
    return deferred.promise;
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
 * Gets the value from the transfer option set name in order to display the name on the one click viewer page.
 *
 * @param {*} Data - the data object from the one click viewer page to modify the transfer set value.
 */
export let getSourceMappingContexts = function( Data ) {
    if( Data ) {
        _locData = Data;
    }
    if( AwStateService.instance.params.src_map_uid ) {
        var soaInput = { inputs: { isPush: false, isExport: false } };
        soaSvc.postUnchecked( 'GlobalMultiSite-2007-06-ImportExport', 'getAvailableTransferOptionSets', soaInput ).then(
            function( response ) {
                _handleTransferResponse( response );
            } );
    } else {
        if( _locData ) {
            _locData.sourceTransferSet.uiValue = 'No Option Set Selected';
            _locData.sourceTransferSet.dbValue = 'No Option Set Selected';
        }
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
        }
    }
}

export default exports = {
    launchOneClickViewer,
    previewContext,
    getSourceContexts,
    getSourceMappingContexts
};
/**
 * @memberof NgServices
 * @member bbrowserOneClickViewerService
 */
app.factory( 'bbrowserOneClickViewerService', () => exports );
