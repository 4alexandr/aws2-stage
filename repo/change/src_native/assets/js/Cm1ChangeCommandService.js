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
 * @module js/Cm1ChangeCommandService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';
import commandsMapService from 'js/commandsMapService';
import appCtxService from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import dmSvc from 'soa/dataManagementService';
import cmUtils from 'js/changeMgmtUtils';


var exports = {};

export let openSetLineagePanel = function( commandId, location ) {
    var selection = selectionService.getSelection();
    var selected = selection.selected;
    if( selected && selected.length > 0 ) {
        var SolutionItems = 'SolutionItems';
        var itemsSelected = {
            items: selected
        };
        appCtxService.registerCtx( SolutionItems, itemsSelected );

        var changeObject = 'changeObject';
        var changeobj = {
            object: selection.parent
        };
        appCtxService.registerCtx( changeObject, changeobj );

        var otherSideType = 'otherSideType';
        var typeName = {
            type: 'Cm1LineageImpactedProvider.' + exports.getSelectionType( selected[ 0 ] )
        };
        appCtxService.registerCtx( otherSideType, typeName );

        commandPanelService.activateCommandPanel( commandId, location );
    }
};

export let openCreateChangePanel = function( commandId, location, params ) {
    var isDeriveCommand = false;
    if( commandId === 'Cm1ShowDeriveChange' ) {
        isDeriveCommand = true;
    }

    var selection = null;
    if( commandId !== 'Cm1ShowCreateChange' ) {
        selection = selectionService.getSelection().selected;
    }

    var currentCtx = appCtxService.getCtx( 'appCreateChangePanel' );
    if( currentCtx ) {
        var appicationSelectedObjects = currentCtx.appSelectedObjects;
        if( appicationSelectedObjects ) {
            selection = appicationSelectedObjects;
        }
    }

    //Default type is "ChangeItem"
    var typeNameToCreate = 'ChangeItem';

    //If sub location has "defaultTypeForCreate" argument than always consider that type as base type for CreateChange Panel
    if( params && params.defaultTypeForCreate ) {
        typeNameToCreate = params.defaultTypeForCreate;
    }

    //If cmdArg is provided than it will override all other type setting. For example cmdArg is provided when user click on Problem Report tile.
    if( params && params.cmdArg ) {
        typeNameToCreate = params.cmdArg;
        if( params.cmdArg === 'ProblemReport' ) {
            typeNameToCreate = 'GnProblemReport';
            params.cmdArg = ''; //Clearing this argument so sub sequent create change doens't take this into consideration.
        }
    }

    var prefNames = [ 'AWC_DefaultCreateTypes' ];
    var prefPromise = preferenceSvc.getStringValues( prefNames );
    if( prefPromise ) {
        prefPromise
            .then( function( values ) {
                var types = [];

                if( values === null ) {
                    types.push( 'ItemRevision' );
                } else {
                    for( var i = 0; i < values.length; i++ ) {
                        types.push( values[ i ] );
                    }
                }

                var attachmentTypes = '';
                for( var j = 0; j < types.length; j++ ) {
                    attachmentTypes += types[ j ];
                    if( j !== types.length - 1 ) {
                        attachmentTypes += ',';
                    }
                }

                var objectsToLoadUid = [];
                if( selection ) {
                    selection = cmUtils.getAdaptedObjectsForSelectedObjects(selection);
                   
                    for( var k = 0; k < selection.length; k++ ) {
                        if( selection[ k ] && selection[ k ].modelType ) {
                            var typeHier = selection[ k ].modelType.typeHierarchyArray;
                            objectsToLoadUid.push( selection[ k ].uid );
                         
                            if( !( typeHier.indexOf( 'WorkspaceObject' ) > -1 ) &&
                                !( typeHier.indexOf( 'BOMLine' ) > -1 ) ) {
                                typeNameToCreate = 'GnProblemReport';
                            }
                        }
                    }
                }

                if( appCtxService.getCtx( 'aw_hosting_state.currentHostedComponentId' ) === 'com.siemens.splm.client.change.CreateChangeComponent' ) {
                    typeNameToCreate = 'ChangeNotice';
                }
                //In case of ACE runtime object, the underlying object might not be loaded yet. So load the underlying object first.
                var promiseLoadObject = dmSvc.loadObjects( objectsToLoadUid );
                promiseLoadObject.then( function() {
                    var CreateChangePanel = 'CreateChangePanel';
                    var createChangeObj;

                    if( selection && selection[ 0 ] !== undefined ) {
                        createChangeObj = {
                            baseType: typeNameToCreate,
                            typesForAttachement: attachmentTypes,
                            selectedObjects: selection,
                            isDerive: isDeriveCommand

                        };
                    } else {
                        createChangeObj = {
                            baseType: typeNameToCreate,
                            typesForAttachement: attachmentTypes,
                            isDerive: isDeriveCommand

                        };
                    }
                    appCtxService.registerCtx( CreateChangePanel, createChangeObj );

                    commandPanelService.activateCommandPanel( commandId, location );
                } );
            } );
    }
};

export let getSelectionType = function( object ) {
    var selectedObjectType = null;
    if( commandsMapService.isInstanceOf( 'Mdl0ConditionalElement', object.modelType ) ) {
        selectedObjectType = 'Mdl0ConditionalElement';
    }
    if( commandsMapService.isInstanceOf( 'Cfg0AbsConfiguratorWSO', object.modelType ) ) {
        selectedObjectType = 'Cfg0AbsConfiguratorWSO';
    }
    if( commandsMapService.isInstanceOf( 'Bom0ConfigurableBomElement', object.modelType ) ) {
        selectedObjectType = 'Bom0ConfigurableBomElement';
    }
    if( commandsMapService.isInstanceOf( 'ItemRevision', object.modelType ) ) {
        selectedObjectType = 'ItemRevision';
    }
    return selectedObjectType;
};

export default exports = {
    openSetLineagePanel,
    openCreateChangePanel,
    getSelectionType
};
/**
 * Reports panel service utility
 *
 * @memberof NgServices
 * @member reportsPanelService
 */
app.factory( 'Cm1ChangeCommandService', () => exports );
