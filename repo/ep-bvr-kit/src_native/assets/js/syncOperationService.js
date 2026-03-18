// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Service for Planning / twin / sync creation
 *
 * @module js/syncOperationService
 */
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import msgSvc from 'js/messagingService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfeHostingMessagingService from 'js/services/mfeHostingMessagingService';
import _ from 'lodash';

'use strict';

/**
 * Create sync for the Plant /Plant BOP with associated plant BOP or Plant
 *
 * @param {ModelObject} objToSync - the object to sync
 * @param {boolean} isRemoveObsoleteLine - flag to remove async lines
 */
export const createSync = function( objToSync, isRemoveObsoleteLine ) {
    const epPageContext = appCtxService.getCtx( 'epPageContext' );
    const collaborationContext = epPageContext.collaborationContext;
    let objectsToSyncUids = [];
    let objectsToSync = [];

    if( !Array.isArray( objToSync ) ) {
        objectsToSync.push( objToSync );
    } else{
        objectsToSync = objToSync;
    }

    if ( isRemoveObsoleteLine === undefined ) {
        isRemoveObsoleteLine = 'false';
    }
    _.each( objectsToSync, function( selectedNode ) {
        if( selectedNode.uid ) {
            objectsToSyncUids.push( selectedNode.uid );
        }
    } );
    if( collaborationContext ) {
        let pageContextModelObject = {
            Object: collaborationContext.uid,
            syncFrom: objectsToSyncUids,
            isRemoveObsoleteTwin: isRemoveObsoleteLine
        };

        let saveInputWriter = saveInputWriterService.get();
        saveInputWriter.addSyncObject( pageContextModelObject );
        saveInputWriter.addRelatedObjects( objectsToSync );
        epSaveService.saveChanges( saveInputWriter, true, [ collaborationContext ] ).then( ( response ) => {
            if( objectsToSync[0].type === epBvrConstants.MBC_WORKAREA_ELEMENT ) {
            let nodesToToggle = [];
            let treeDataObject = appCtxService.getCtx( 'aceTreeLoadDataResult' );
                _.each( treeDataObject.vmc.loadedVMObjects, function( child ) {
                        if( objectsToSyncUids.includes( child.uid ) ) {
                            nodesToToggle.push( child );
}
                } );
                _.each( nodesToToggle, function( node ) {
                    fireTreeExpandEvent( node );
                } );
            }
            else{
                eventBus.publish( 'ep.syncSuccess' ); 
            }
            //No saveResults in case saveChanges fails
            if ( response.saveResults ) {
                showSynSuccessMessage( response.saveResults );              
            }
        } );
    }
};

/**
 * Show the message stating the sync action was successful.
 * @param {*} saveResults
 */
function showSynSuccessMessage( saveResults ) {
    const source = saveResults[ 0 ].saveResultObject.props.object_string.uiValues[ 0 ];
    let localTextBundle = localeService.getLoadedText( 'TwinMessages' );
    let successResponseMessage = localTextBundle.syncSuccessful;
    let msg =  successResponseMessage.replace( '{0}', source );
    msgSvc.showInfo( msg );

    /* TODO :Ashwini ( Remove in AW5.1)
    When user is clicking on the sync command , as it is the pull , grid should get refresh.
    The SOA (saveData3) is returning the entire reload object. As the reload data is in pure json and
    grid is in the GWT which expect the data should in IModel and IProperty format , we can not convert that.
    So for this release we are adding the option to reload page after some wait as it will first show the success popup
    then expect to reload the page.
    Note that : In next release we are converting the page decl , so this code will not get reuse as it will be splm-tree
    */
    setTimeout( function() {
        if( appCtxService.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'ProcessArea'  ) {
            const hostedWindow = document.getElementById( mfeHostingMessagingService.getDefaultHostedIframeID() );
            hostedWindow.contentWindow.location.reload();
        }
    }, 2000 );
}

/**
 * Expand/Collapse selected node
 * @param {Object} treeNodeToToggle tree node to be toggled
 */
 function fireTreeExpandEvent( treeNodeToToggle ) {
    /* If this node is already expanded, then we have to collapse and
    then expand this tree to refresh the contents of this node. */
    if ( treeNodeToToggle.isExpanded ) {
        treeNodeToToggle.isExpanded = false;
        eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', treeNodeToToggle );
    }
    if( treeNodeToToggle.__expandState ) {
        delete treeNodeToToggle.__expandState;
    }
    treeNodeToToggle.isExpanded = true;
    eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', treeNodeToToggle );
}

let exports;
export default exports = {
    createSync
};
