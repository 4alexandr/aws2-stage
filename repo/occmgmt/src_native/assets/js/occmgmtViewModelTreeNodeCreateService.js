//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*
 global define
 */

/**
 * @module js/occmgmtViewModelTreeNodeCreateService
 */
import app from 'app';
import awTableSvc from 'js/awTableService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import occmgmtIconService from 'js/occmgmtIconService';
import appCtxSvc from 'js/appCtxService';

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * @param {IModelObject} modelObj - IModelObject Information to base the new node upon.
 * @param {Number} childNdx - child Index
 * @param {Number} levelNdx - Level index
 *
 * @return {ViewModelTreeNode} View Model Tree Node
 */
export let createVMNodeUsingModelObjectInfo = function( modelObj, childNdx, levelNdx ) {
    var displayName;

    if( modelObj.props && modelObj.props.object_string ) {
        displayName = modelObj.props.object_string.uiValues[ 0 ];
    } else {
        if( modelObj.toString ) {
            displayName = modelObj.toString();
        }
    }

    var occUid = modelObj.uid;
    var occType = modelObj.type;
    var props = modelObj.props;
    var nChild = props && props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] : 0;

    if( !displayName ) {
        displayName = occUid;
    }

    var iconURL = occmgmtIconService.getTypeIconURL( modelObj, occType );

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, occType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = nChild <= 0;
    /**
     * "stableId" property on occurrence is intended to be used strictly for maintaining expansion state of nodes in
     * Tree views. DO NOT USE IT FOR OTHER PURPOSES.
     */
    if( props && props.awb0Parent && props.awb0CopyStableId ) {
        vmNode.stableId = objectToCSIDGeneratorService.getCloneStableIdChain( modelObj );
        // The following line replaces all instances of "/" in the stableId property with ":" so that it is in sync with the value when sent by server.
        // This is a temporary change and should be rolled back as soon as "objectToCSIDGeneratorService" is changed to use ":" as separator.
        vmNode.stableId = vmNode.stableId.replace( /\//g, ':' );
    }

    if( props && props.awb0BreadcrumbAncestor ) {
        vmNode.parentUid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
    }

    return vmNode;
}; // _createVMNodeUsingModelObjectInfo

/**
 * Adds two numbers together.
 * @param {ViewModelTreeNode} vmNode Node being created.
 * @param {String} parentUid Parent uid of vm node.
 */
function _propogateParentInformationToVMNode( vmNode, parentUid ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    if( vmc ) {
        var parentObjNdx = vmc.findViewModelObjectById( parentUid );
        var parentNode = vmc.getViewModelObject( parentObjNdx );

        if( parentNode && parentNode.isGreyedOutElement ) {
            vmNode.isGreyedOutElement = parentNode.isGreyedOutElement;
        }
    }

    vmNode.parentUid = parentUid;
}

/**
 * @param {SoaOccurrenceInfo} occInfo - Occurrence Information returned by server
 * @param {Number} childNdx - child Index
 * @param {Number} levelNdx - Level index
 * @param {String} pciUid - PCI uid of the element which this node is going to represent
 * @param {String} parentUid - Parent uid of vm node
 *
 * @return {ViewModelTreeNode} View Model Tree Node
 */
export let createVMNodeUsingOccInfo = function( occInfo, childNdx, levelNdx, pciUid, parentUid ) {
    var displayName = occInfo.displayName;
    var occUid = occInfo.occurrenceId;
    var occType = occInfo.underlyingObjectType;
    var props = occInfo.props;
    var nChild = props && props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] :
        occInfo.numberOfChildren;

    if( !displayName ) {
        displayName = occUid;
    }

    var iconURL = occmgmtIconService.getTypeIconURL( occInfo, occType );

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, occType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = nChild <= 0;
    /**
     * "stableId" property on occurrence is intended to be used strictly for maintaining expansion state of nodes in
     * Tree views. DO NOT USE IT FOR OTHER PURPOSES.
     */
    vmNode.stableId = occInfo.stableId;
    vmNode.pciUid = pciUid;

    if( parentUid ) {
        _propogateParentInformationToVMNode( vmNode, parentUid );
    }

    return vmNode;
};

export let createVMNodesForGivenOccurrences = function( childOccInfos, levelNdx, pciUid, elementToPciMap, parentUid ) {
    var vmNodes = [];

    for( var childNdx = 0; childNdx < childOccInfos.length; childNdx++ ) {
        var elementPciUid = pciUid;

        if( elementToPciMap && elementToPciMap[ childOccInfos[ childNdx ].occurrenceId ] ) {
            elementPciUid = elementToPciMap[ childOccInfos[ childNdx ].occurrenceId ];
        }

        var vmNode = exports.createVMNodeUsingOccInfo( childOccInfos[ childNdx ], childNdx, levelNdx, elementPciUid, parentUid );
        vmNodes.push( vmNode );
    }

    return vmNodes;
};

export default exports = {
    createVMNodeUsingModelObjectInfo,
    createVMNodeUsingOccInfo,
    createVMNodesForGivenOccurrences
};
/**
 * @memberof NgServices
 * @member occmgmtViewModelTreeNodeCreateService
 */
app.factory( 'occmgmtViewModelTreeNodeCreateService', () => exports );
