// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This is a service for loading and saving data for PERT
 * 
 * @module js/epViewModelObjectService
 */
'use strict';

import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import declUtils from 'js/declUtils';
import actionService from 'js/actionService';
import cfgSvc from 'js/configurationService';
import viewModelService from 'js/viewModelService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {ViewModelObject} a view model object which represents the given modelObject
 */

function createViewModelObjectFromModelObject( modelObject ) {
    var deferred = AwPromiseService.instance.defer();
    let dataCtxNode;
    if( modelObject ) {
        let vmo = createAndAddEpVmos( modelObject );
        let promise = cfgSvc.getCfg( 'epViewModelProperties' );
        promise.then( function( epViewModelProperties ) {
            if( !_declViewModel ) {
                return createViewModel( epViewModelProperties ).then( function( declViewModel ) {
                    _declViewModel = declViewModel;
                    dataCtxNode = {
                        data: _declViewModel,
                        ctx: appCtxService.ctx,
                        epVMOPropertyContext: { vmo: vmo }
                    };
                    _.forEach( epViewModelProperties.actions, function( queuedSrcObjInfo ) {
                        return declUtils.loadDependentModule( queuedSrcObjInfo.deps ).then( function( depModuleObj ) {
                            return actionService.executeAction( _declViewModel, queuedSrcObjInfo, dataCtxNode, depModuleObj, false ).then( function( res ) {
                                deferred.resolve( res );
                            } );
                        } );
                    } );
                } );
            } else {
                dataCtxNode = {
                    data: _declViewModel,
                    ctx: appCtxService.ctx,
                    epVMOPropertyContext: { vmo: vmo }
                };
                _.forEach( epViewModelProperties.actions, function( queuedSrcObjInfo ) {
                    return declUtils.loadDependentModule( queuedSrcObjInfo.deps ).then( function( depModuleObj ) {
                        return actionService.executeAction( _declViewModel, queuedSrcObjInfo, dataCtxNode, depModuleObj, false ).then( function( res ) {
                            deferred.resolve( res );
                        } );
                    } );
                } );
            }
        } );
        return deferred.promise;
    }

}
/**
 * Create the declartive viewModel from all combined epViewModelProperties.json
 *
 * @param {Object} viewModel - event data information with name and value of changes
 * @returns {Promise} promise with decl view model json
 */
function createViewModel( viewModel ) {
    viewModel._viewModelId = 'epViewModel_' + Math.random;
    viewModel.skipClone = true;
    return viewModelService.populateViewModelPropertiesFromJson( viewModel, null, null, true )
        .then( function( populatedViewModelJson ) {
            return populatedViewModelJson;
        } );
}

/**
 *
 * @param {viewModelObject} vmo - a given viewModelObject
 */
function createAndAddEpVmos( modelObject ) {
    let vmo = viewModelObjectSvc.createViewModelObject( modelObject );
    if( !uidToVMOsArray[ vmo.uid ] ) {
        uidToVMOsArray[ vmo.uid ] = [];
    }
    uidToVMOsArray[ vmo.uid ].push( vmo );
    return vmo;
}

/**
 *
 * @param {modelObject} modelObject - a given modelObject
 * @return {ViewModelObject} a view model object which represents the given modelObject
 */

function updateViewModelObjectFromModelObject( modelObject ) {
    var deferred = AwPromiseService.instance.defer();
    let dataCtxNode;
    if( modelObject ) {
        let vmo = createAndAddEpVmos( modelObject );
        let promise = cfgSvc.getCfg( 'epViewModelProperties' );
        promise.then( function( epViewModelProperties ) {
                dataCtxNode = {
                    data: _declViewModel,
                    ctx: appCtxService.ctx,
                    epVMOPropertyContext: { vmo: vmo }
                };
                _.forEach( epViewModelProperties.actions, function( queuedSrcObjInfo ) {
                    return declUtils.loadDependentModule( queuedSrcObjInfo.deps ).then( function( depModuleObj ) {
                        return actionService.executeAction( _declViewModel, queuedSrcObjInfo, dataCtxNode, depModuleObj, false ).then( function( res ) {
                            deferred.resolve( res );
                        } );
                    } );
                } );

        } );
        return deferred.promise;
    }

}

/**
 * initializes the service which listens to relevant events
 */
function init() {
    updatedEventSubscription = eventBus.subscribe( 'ep.saveEvents', function( eventData ) {
        let saveEvents = eventData.saveEvents;
        let affectedVmos = [];
        let affectedVmoIds = [];
        var promises = [];
        saveEvents.forEach( ( saveEvent ) => {
            let result = Object.keys( uidToVMOsArray ).filter( uidVmo => uidVmo === saveEvent.eventObjectUid );
            if( result.length > 0 ) {
                if( saveEvent.eventType === 'delete' ) {
                    delete uidToVMOsArray[ saveEvent.eventObjectUid ];
                } else {
                    var promise = updateViewModelObjectFromModelObject(cdm.getObject( result ));
                    promises.push( promise );
                    affectedVmoIds.push(  result  );                 
                    
                }
            }
        } );

        return AwPromiseService.instance.all( promises ).then( ( results ) => {
            if( results.length ) {
                _.forEach( results, ( result ) => {
                    if( result !== null ) {
                        affectedVmos.push( result );
                    }
                } );
            } else {
                affectedVmos.push( results );
            }
            //this event is fired after all VMOs have been updated
            //view models which listen to this event will surely use the up-to-date VMOs
            eventBus.publish( 'epViewModelObject.updated', { affectedVmos } );
            return affectedVmos;
        } );

    } );
}

/**
 * Unsubscribes from listening to cdm events
 *
 */
function destroy() {
    eventBus.unsubscribe( updatedEventSubscription );
    updatedEventSubscription = null;
    uidToVMOsArray = {};
}

// eslint-disable-next-line no-unused-vars
let exports = {};
let _declViewModel;
let uidToVMOsArray = {};
let updatedEventSubscription;
let modifiedEventSubscription;

export default exports = {
    createViewModelObjectFromModelObject,
    createAndAddEpVmos,
    init,
    destroy
};
