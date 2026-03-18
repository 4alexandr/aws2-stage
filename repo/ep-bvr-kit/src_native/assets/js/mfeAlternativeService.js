// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**

 * @module js/mfeAlternativeService
 */

import app from 'app';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import { constants as _epBvrConstants } from 'js/epBvrConstants';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import TypeUtils from 'js/utils/mfeTypeUtils';
import epLoadInputHelper from 'js/epLoadInputHelper';
import { constants as _epLoadConstants } from 'js/epLoadConstants';
import epLoadService from 'js/epLoadService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import _soaService from 'soa/kernel/soaService';
import epNavigationService from 'js/epNavigationService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';

'use strict';

const ALTERNATIVE_UID = 'AlternativeUID';
let objectToNavigate;
const NAVIGATE_TO_NEWTAB = 'newTab';

/**
 * createPartialAlternative: for creating partial alternative
 * @param  data
 * @param {boolean} openOnActionBox
 */
export function createPartialAlternative( data, openOnActionBox ) {
    let saveInputWriter = saveInputWriterService.get();
    let object = appCtxService.getCtx( 'ep.scopeObject' );
    let inputObj = {
        newPlantBOPName: data.plantBOPName.dbValue,
        newPackageName: data.packageName.dbValue,
        newDescription: data.description.dbValue,
        isPartial: true
    };
    saveInputWriter.addAlternativeInput( object, inputObj, ALTERNATIVE_UID );
    epSaveService.saveChanges( saveInputWriter, false, [ object ] ).then( function( result ) {
        let ccuid = null;
        for( let index in result.saveResults ) {
            if( result.saveResults[ index ].clientID === ALTERNATIVE_UID ) {
                ccuid = result.saveResults[ index ].saveResultObject.uid;
            }
        }

        objectToNavigate = cdm.getObject( ccuid );
        eventBus.publish( 'AlternativePopupClose' );
        if( openOnActionBox ) {
            epNavigationService.navigateToObject( objectToNavigate, null, NAVIGATE_TO_NEWTAB );
        }
    } );
}

/**
 * createAlternative: for creating alternative
 * @param  data
 */
export function createAlternative( data ) {
    //disable create button

    let pageContext = appCtxService.getCtx( 'epPageContext' );

    let loadedObject = pageContext.loadedObject;
    let openOnActionBox = data.openOnActionBoxCreate.dbValue;

    if( pageContext.collaborationContext.props[ _epBvrConstants.MBC_MASTER_CC ].dbValues[ 0 ] ) {
        openOnActionBox = data.openOnActionBoxClone.dbValue;
    }
    if( TypeUtils.isOfType( loadedObject, _epBvrConstants.MFG_PLANT_BOP ) ) {
        createWorkPackageAlternative( data, openOnActionBox );
    } else {
        createPartialAlternative( data, openOnActionBox );
    }
}

/**
 *createWorkPackageAlternative : for creating full alternative
 * @param  data
 * @param {boolean} openOnActionBox
 */
function createWorkPackageAlternative( data, openOnActionBox ) {
    let modelObjs = appCtxService.getCtx( 'epPageContext' );

    let objectType = getObjectType( modelObjs );

    _soaService.post( 'Core-2006-03-DataManagement', 'generateItemIdsAndInitialRevisionIds', {
        input: [ {
            item: null,
            itemType: objectType,
            count: 1
        } ]
    } ).then( function( response ) {
        if( response.outputItemIdsAndInitialRevisionIds[ 0 ][ 0 ] ) {
            var itemId = response.outputItemIdsAndInitialRevisionIds[ 0 ][ 0 ].newItemId;
            var itemRevId = response.outputItemIdsAndInitialRevisionIds[ 0 ][ 0 ].newRevId;
        }
        createAlternativeWorkPackage( itemId, itemRevId, data, openOnActionBox );
    } );
}

/**
 *  We need to create the same type of plant BOP as that in the master CC.
 * Thus need to know what type of object was used for creating plant BOP in master CC.
 * @param  itemId
 * @param  itemRevId
 * @param data
 *  @param {boolean} openOnActionBox
 */
function createAlternativeWorkPackage( itemId, itemRevId, data, openOnActionBox ) {
    //SOA Call
    let saveInputWriter = saveInputWriterService.get();
    let object = appCtxService.getCtx( 'ep.scopeObject' );
    let inputObj = {
        newPlantBOPName: data.plantBOPName.dbValue,
        newPackageName: data.packageName.dbValue,
        newDescription: data.description.dbValue,
        isPartial: false
    };

    saveInputWriter.addAlternativeInput( object, inputObj, ALTERNATIVE_UID );

    epSaveService.saveChanges( saveInputWriter, false, [ object ] ).then( function( result ) {
        let ccuid = null;
        for( let index in result.saveResults ) {
            if( result.saveResults[ index ].clientID === ALTERNATIVE_UID ) {
                ccuid = result.saveResults[ index ].saveResultObject.uid;
            }
        }

        objectToNavigate = cdm.getObject( ccuid );
        eventBus.publish( 'AlternativePopupClose' );
        if( openOnActionBox ) {
            epNavigationService.navigateToManagePage( objectToNavigate, NAVIGATE_TO_NEWTAB );
        }
    } );
}

/**
 * Go to master collaboration context structure
 */
export function goToMaster() {
    const object = appCtxService.getCtx( 'ep.scopeObject' );
    const loadTypeInputs = epLoadInputHelper
        .getLoadTypeInputs( _epLoadConstants.ALTERNATIVE_WP_INFO, object.uid );
    epLoadService
        .loadObject( loadTypeInputs, false )
        .then(
            function( result ) {
                //TODO
                const alternativeWP_uid = result.relatedObjectsMap[ object.uid ].additionalPropertiesMap2.alternativeWPs[ 0 ];
                const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs(
                    _epLoadConstants.OBJ_IN_RELATED_PACKAGE, object.uid, null, alternativeWP_uid );
                epLoadService
                    .loadObject( loadTypeInputs, false )
                    .then(
                        function( result ) {
                            const params = {
                                uid: result.relatedObjectsMap[ object.uid ].additionalPropertiesMap2.objectInRelatedPackage[ 0 ],
                                mcn: null
                            };
                            epNavigationService.navigateToObject( params.uid, params.mcn, NAVIGATE_TO_NEWTAB );
                        } );
            } );
}

/**
 * Search for partial alternatives
 */
export function searchPartialAlternative() {
    const awPromise = AwPromiseService.instance;
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/AlternativeMessages' );
    let listOfAltCCs = [];
    const currentObject = appCtxService.getCtx( 'ep.scopeObject' );
    const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( _epLoadConstants.ALTERNATIVE_WP_INFO,
        currentObject.uid );

    return awPromise.resolve( epLoadService.loadObject( loadTypeInputs, false ).then(
        function( output ) {
            const ccMap = output.loadedObjectsMap;
            for( let key in ccMap ) {
                for( let itr = 0; itr < ccMap[ key ].length; ++itr ) {
                    listOfAltCCs.push( ccMap[ key ][ itr ] );
                }
            }
            if( listOfAltCCs.length === 0 ) {
                messagingService.showInfo( resource.noAlternativeMessage
                    .format( currentObject.props.object_string.dbValues[ 0 ] ) );
            } else {
                appCtxService.registerCtx( 'allAltCCsList', listOfAltCCs );
            }
        } ) );
}

/**
 * @param  {Objects} modelObjs get object
 * @return {String} Object type
 */
function getObjectType( modelObjs ) {
    let processStruct = cdm.getObject( modelObjs.processStructure.uid );
    let objectProps = processStruct.props[ _epBvrConstants.BL_ITEM_FND_MFKINFO ].dbValues[ 0 ];
    let propArr = objectProps.split( ',' );
    for( var i in propArr ) {
        if( _.includes( propArr[ i ], 'object_type' ) ) {
            break;
        }
    }
    var propValArr = propArr[ i ].split( '=' );
    return propValArr[ 1 ];
}

let exports = {};
export default exports = {
    createAlternative,
    goToMaster,
    searchPartialAlternative
};
