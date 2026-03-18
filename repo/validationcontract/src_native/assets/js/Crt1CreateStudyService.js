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
 * @module js/Crt1CreateStudyService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import dmSvc from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import cmdMapSvc from 'js/commandsMapService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import 'lodash';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Sets up the needed data for the create panel
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let initCreateStudyPanel = function( data ) {
    // this needs to be here or the aw-title-link does not get initialized properly
    data.displayedType.propertyDisplayName = 'Study';
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 &&
      !(appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1)) {
        data.displayedType.propertyDisplayName = 'Run';
    }
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1 ) {
        data.displayedType.propertyDisplayName = 'Test Event';
    }
    // get the subtypes of Study that can be created
    eventBus.publish( 'CreateStudy.getStudySubtypes' );

    // get the parent validation contract
    data.parentContract = null;
    var $state = AwStateService.instance;
    var selectedObj = cdm.getObject( $state.params.uid );
    if( cmdMapSvc.isInstanceOf( 'Crt0VldnContractRevision', selectedObj.modelType ) ) {
        data.parentContract = selectedObj;
    } else if( appCtxSvc.ctx.selected &&
        cmdMapSvc.isInstanceOf( 'Crt0VldnContractRevision', appCtxSvc.ctx.selected.modelType ) ) {
        data.parentContract = appCtxSvc.ctx.selected;
    } else {
        var selectedObjs = appCtxSvc.ctx.sublocation.getSelection().getSelectedObjects();
        if( selectedObjs && selectedObjs.length === 1 ) {
            var modelObject = selectedObjs[ 0 ];
            if( cmdMapSvc.isInstanceOf( 'Crt0VldnContractRevision', modelObject.modelType ) ) {
                data.parentContract = modelObject;
            }
        }
    }

    // populate the population list
    data.populationInput = [];
    if( !data.parentContract ) {
        return;
    }
    data.populationInput.push( data.parentContract );

    // have to refresh the parent object in case the child studies prop value has changed
    soaSvc.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
        objects: [ data.parentContract ]
    } ).then( function() {
        // get the child studies
        var propNames = [];
        propNames.push( 'crt0ChildrenStudies' );

        var objects = [];
        objects.push( data.parentContract );


        dmSvc.getPropertiesUnchecked( objects, propNames ).then( function() {
            var childStudyUids = data.parentContract.props.crt0ChildrenStudies.dbValues;
            for( var i = 0; i < childStudyUids.length; i++ ) {
                var object = cdm.getObject( childStudyUids[ i ] );
                if( data.populationInput.indexOf( object ) === -1  ) {
                data.populationInput.push( object );
              }
            }

            eventBus.publish( 'CreateStudy.convertStudiesToList' );
        } );
    } );
};

/**
 * Retrieves the list of study subtype names
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let initStudySubtypeList = function( data ) {
    data.studySubtypeNames = data.getStudySubtypesResponse.output[ 0 ].subTypeNames;

    eventBus.publish( 'CreateStudy.receivedSubtypes2' );
};

/**
 * Ensure study types are present in cache
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let ensureStudyTypesLoadedJs = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var returnedTypes = [];
    var displayableStudyTypes = data.studySubtypeNames;

    var promise = soaSvc.ensureModelTypesLoaded( displayableStudyTypes );
    if( promise ) {
        promise.then( function() {
            var typeUids = [];
            for( var i = 0; i < displayableStudyTypes.length; i++ ) {
                if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 &&
                !(appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1)) {
                    var modelType = cmm.getType( displayableStudyTypes[ i ] );
                    if( modelType.typeHierarchyArray.indexOf( 'Crt0Study' ) > -1 && !( modelType.typeHierarchyArray.indexOf( 'Crt0Run' ) > -1 )  ) {
                    returnedTypes.push( modelType );
                    typeUids.push( modelType.uid );
                    }
            }else if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 &&
                !(appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1)) {
                    var modelType = cmm.getType( displayableStudyTypes[ i ] );
                    if( modelType.typeHierarchyArray.indexOf( 'Crt0Run' ) > -1 && !( modelType.typeHierarchyArray.indexOf( 'IAV0TestRun' ) > -1 )  ) {
                    returnedTypes.push( modelType );
                    typeUids.push( modelType.uid );
                    }
            }else if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1 ) {
                    var modelType = cmm.getType( displayableStudyTypes[ i ] );
                    if( modelType.typeHierarchyArray.indexOf( 'IAV0TestRun' ) > -1 ) {
                    returnedTypes.push( modelType );
                    typeUids.push( modelType.uid );
                    }
            }
            }
            //ensure the ImanType objects are loaded
            var policyId = propPolicySvc.register( {
                types: [ {
                    name: 'ImanType',
                    properties: [ {
                        name: 'parent_types'
                    }, {
                        name: 'type_name'
                    } ]
                } ]
            } );

            dmSvc.loadObjects( typeUids ).then( function() {
                var returneddata = {
                    searchResults: returnedTypes,
                    totalFound: returnedTypes.length
                };

                propPolicySvc.unregister( policyId );

                deferred.resolve( returneddata );
            } );
        } );
    }

    return deferred.promise;
};

/**
 * Clear selected type when user click on type link on create form
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let clearSelectedTypeJs = function( data ) {
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) {
        data.selectedType.dbValue = '';
        data.displayedType.propertyDisplayName = '';
    }else{
    data.selectedType.dbValue = appCtxSvc.ctx.dbVal;
    }
};

/**
 * When user select type from type selection panel we need to navigate to create form. This method will set few
 * variable to hide type selector panel and to show create form.
 *
 * @param {Object} data - The panel's view model object
 */
export let handleTypeSelectionJs = function( data ) {
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 ) {
        var selectedType = data.dataProviders.getStudyTypes.selectedObjects;
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        data.displayedType.propertyDisplayName = selectedType[ 0 ].props.object_string.dbValue;
    } else {
        data.selectedType.dbValue = '';
        data.displayedType.propertyDisplayName = '';
    }
    }
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
    var selectedType = data.dataProviders.getStudyTypes.selectedObjects;
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        var dbVal = data.selectedType.dbValue;
        appCtxSvc.registerCtx( 'dbVal', dbVal );
        data.displayedType.propertyDisplayName = selectedType[ 0 ].props.object_string.dbValue;
        data.selectedType.dbValue = '';
    }
}
};

/**
 * Initializes the inputs for the create SOA
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let createStudyInit = function( data ) {
    if( data.object_desc.dbValue === null ) {
        data.object_desc.dbValue = '';
    }
    data.crt0ParentVldnContract = data.parentContract.uid;
    var popValue = data.populationValues.dbValue;
    if( popValue.uid ) {
        data.crt0Population = popValue.uid;
    } else {
        data.crt0Population = '';
    }
    data.revisionType =  appCtxSvc.ctx.dbVal + 'Revision';
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0StudyRevision' ) > -1 &&
      !(appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1)) {
        var dbVal = 'Crt0Run';
        appCtxSvc.registerCtx( 'dbVal', dbVal );
        data.revisionType =  appCtxSvc.ctx.dbVal + 'Revision';
    }
    if( appCtxSvc.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'IAV0TestStudyRevision' ) > -1 ) {
        var dbVal = 'IAV0TestRun';
        appCtxSvc.registerCtx( 'dbVal', dbVal );
        data.revisionType =  appCtxSvc.ctx.dbVal + 'Revision';
    }


    eventBus.publish( 'CreateStudy.createStudy' );
};

/**
 * Performs any necessary post-create operations
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let postCreateStudy = function( data ) {
    eventBus.publish( 'drawBarChart' );
};

export default exports = {
    initCreateStudyPanel,
    initStudySubtypeList,
    ensureStudyTypesLoadedJs,
    clearSelectedTypeJs,
    handleTypeSelectionJs,
    createStudyInit,
    postCreateStudy
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServicescrt1
 * @member Crt1CreateStudyService
 */
app.factory( 'Crt1CreateStudyService', () => exports );
