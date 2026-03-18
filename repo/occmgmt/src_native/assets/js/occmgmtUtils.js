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
 * @module js/occmgmtUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import occmgmtStateHandler from 'js/occurrenceManagementStateHandler';
import _ from 'lodash';

var exports = {};

var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

/**
 * This method is needed for cases where UID is present but object not loaded in client.
 * e.g. In URL refresh case, object UID is present on URL , needs to be passed to server.
 * @param{String} Object UID
 * @returns Object from client data model if present. Else, IModelObject with uid and unknown type.
 */

export let getObject = function( uid ) {
    if( cdmService.isValidObjectUid( uid ) ) {
        var obj = cdmService.getObject( uid );

        if( !obj ) {
            return new IModelObject( uid, 'unknownType' );
        }

        return obj;
    }

    return new IModelObject( cdmService.NULL_UID, 'unknownType' );
};

/**
 * @param {Object} inputContext Context from which the PCI needs to be figured out
 * @return {String} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
let getContexts = function( inputContext ) {
    let currentContexts = [];
    if( inputContext ) {
        currentContexts.push( inputContext );
    } else if( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) {
        _.forEach( appCtxService.ctx.splitView.viewKeys, function( viewKey ) {
            currentContexts.push( appCtxService.ctx[ viewKey ] );
        } );
    } else if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context ) {
        currentContexts.push( appCtxService.ctx.aceActiveContext.context );
    }
    return currentContexts;
};
/**
* @param {Object} object Object whose UID needs to be figured out
* @return Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
*         the productContext from the URL otherwise
*/
export let getProductContextForProvidedObject = function( object, inputContext ) {
   var currentContext = inputContext;

   if( _.isUndefined( currentContext ) ) {
       if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context ) {
           currentContext = appCtxService.ctx.aceActiveContext.context;
       }
   }

   if( currentContext ) {
       if( currentContext.elementToPCIMap ) {
           var parentObject = object;
           do {
               if( currentContext.elementToPCIMap[ parentObject.uid ] ) {
                   return currentContext.elementToPCIMap[ parentObject.uid ];
               }

               var parentUid = exports.getParentUid( parentObject );
               parentObject = cdmService.getObject( parentUid );
           } while( parentObject );
       } else {
           return currentContext.currentState.pci_uid;
       }
   }
   return null;
};

/**
 * @param {Object} object Object whose UID needs to be figured out
 * @param {Object} inputContext Context from which the PCI needs to be figured out
 * @return {String} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
export let getProductContextInfoForProvidedObject = function( object, inputContext ) {
    let currentContexts = getContexts( inputContext );

    // Remove the check on context length when minimum TC version is 13.1.
    // In all cases, we should do a root object lookup and return the pci_uid.
    // Clean up will be done as a part of LCS-452815.
    if( currentContexts.length > 1 ) {
        let rootObj = getRootObject( object );
        for( var idx = 0; idx < currentContexts.length; ++idx ) {
            if( currentContexts[ idx ] ) {
                if( currentContexts[ idx ].elementToPCIMap ) {
                    if( currentContexts[ idx ].elementToPCIMap[ rootObj.uid ] ) {
                        return currentContexts[ idx ].elementToPCIMap[ rootObj.uid ];
                    }
                } else if( rootObj.uid === currentContexts[ idx ].currentState.t_uid ) {
                    return currentContexts[ idx ].currentState.pci_uid;
                }
            }
        }
        return null;
    }
    return currentContexts[ 0 ].currentState.pci_uid;
};

/**
 * @param {Object} object Object whose Root object needs to be figured out
 * @return {Object} Root Object
 */
let getRootObject = function( object ) {
    var parentObject = object;
    var rootObj;
    do {
        rootObj = parentObject;
        var parentUid = exports.getParentUid( parentObject );
        if( parentUid === null ) {
            return rootObj;
        }
        parentObject = cdmService.getObject( parentUid );
    } while( parentObject );
};

export let getParentUid = function( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;

        var uid;

        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmService.isValidObjectUid( uid ) ) {
            return uid;
        }
    }

    return null;
};

/**
 *
 * @return {Boolean} true if sorting is supported
 */
export let isSortingSupported = function( contextState ) {
    var productContextInfo = cdmService.getObject( contextState.context.currentState.pci_uid );
    var supportedFeatures = occmgmtStateHandler.getSupportedFeaturesFromPCI( productContextInfo );

    if( supportedFeatures && supportedFeatures.Awb0SortFeature ) {
        return true;
    }

    return false;
};

/**
 * @return true if current view mode is Tree or Tree with Summary; false otherwise.
 */
export let isTreeView = function() {
    var viewModeInfo = appCtxService.ctx.ViewModeContext;

    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'TreeView' || viewModeInfo.ViewModeContext === 'TreeSummaryView' ) ) {
        return true;
    }

    return false;
};

/**
 * @return true if current view mode is Resource or Resource with Summary; false otherwise.
 */
export let isResourceView = function() {
    var viewModeInfo = appCtxService.ctx.ViewModeContext;

    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'ResourceView' || viewModeInfo.ViewModeContext === 'ResourceSummaryView' ) ) {
        return true;
    }

    return false;
};

/**
 * @param {boolean} value toggle state value for decorator flag.
 * @param {boolean} restoreOldValue true if you want to restore old value while disabling decorator toggle.
 */
export let setDecoratorToggle = function( value, restoreOldValue ) {
    if( value === true ) {
        var oldDecoratorToggle = appCtxService.getCtx( 'decoratorToggle' );
        appCtxService.updatePartialCtx( 'oldDecoratorToggleValue', oldDecoratorToggle );
    } else {
        if( restoreOldValue === true ) {
            oldDecoratorToggle = appCtxService.getCtx( 'oldDecoratorToggleValue' );
            value = oldDecoratorToggle ? oldDecoratorToggle : value;
        }
        appCtxService.unRegisterCtx( 'oldDecoratorToggleValue' );
    }
    appCtxService.updatePartialCtx( 'decoratorToggle', value );
};

/**
 * Gets the current data provider. If access mode is tree.
 * @param {*} dataProviders
 */
export var getCurrentTreeDataProvider = function( dataProviders ) {
    for( var dp in dataProviders ) {
        if( dataProviders[ dp ].accessMode && dataProviders[ dp ].accessMode === 'tree' ) {
            return dataProviders[ dp ];
        }
    }
    return;
};

/**
 * This method is returns first level children of given node.
 * It also checks in cache if present it returns children form cache.
 * @param {Object} parentNode - parent vmo.
 * @return{String} children of given node
 */
export let getImmediateChildrenOfGivenParentNode = function( parentNode ) {
    if( parentNode ) {
        var children = parentNode.children;
        if( !children && parentNode.__expandState ) {
            children = parentNode.__expandState.children;
        }
        return children;
    }
};

export default exports = {
    getObject,
    getProductContextForProvidedObject,
    getProductContextInfoForProvidedObject,
    getParentUid,
    isSortingSupported,
    isTreeView,
    isResourceView,
    setDecoratorToggle,
    getCurrentTreeDataProvider,
    getImmediateChildrenOfGivenParentNode
};
/**
 * @memberof NgServices
 * @member occmgmtUtils
 */
app.factory( 'occmgmtUtils', () => exports );
