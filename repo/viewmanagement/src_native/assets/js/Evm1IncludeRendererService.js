// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/Evm1IncludeRendererService
 * @requires app
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Cascades the checkbox status to children in tree
 * @param {Object} data - the viewModel data
 */
export let handleIncludeToggle = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    var isClientRefreshRequired = false;

    if( data.vmo.props.evm1Include.dbValue !== data.evm1IncludeData.dbValue ) {
        data.vmo.props.evm1Include.dbValue = data.evm1IncludeData.dbValue;
    }

    if( recipeCtx && recipeCtx.loadedSeedTreeNodes && recipeCtx.loadedSeedTreeNodes.length > 0 ) {
        if( recipeCtx.context && data.vmo.levelNdx === 0 && data.vmo.uid === recipeCtx.context.uid ) {
            _.forEach( recipeCtx.loadedSeedTreeNodes, function( treeNode ) {
                if( treeNode.levelNdx > 0 ) {
                    if( treeNode.props.evm1Include.isEditable !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.isEditable = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                    if( treeNode.props.evm1Include.isEnabled !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.isEnabled = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                    if( treeNode.props.evm1Include.dbValue !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.dbValue = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                }
            } );
        } else if( data.vmo.levelNdx >= 0 ) {
            _.forEach( recipeCtx.loadedSeedTreeNodes, function( treeNode ) {
                var parentUid = _.get( treeNode, 'props.evm1SeedParent.dbValue', undefined );

                if( parentUid === data.vmo.uid ) {
                    if( treeNode.props.evm1Include.isEditable !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.isEditable = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                    if( treeNode.props.evm1Include.isEnabled !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.isEnabled = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                    if( treeNode.props.evm1Include.dbValue !== data.evm1IncludeData.dbValue ) {
                        treeNode.props.evm1Include.dbValue = data.evm1IncludeData.dbValue;
                        isClientRefreshRequired = true;
                    }
                }
            } );
        }
    }

    if( isClientRefreshRequired ) {
        eventBus.publish( 'seedTreeGrid.plTable.clientRefresh' );
    }
};

export default exports = {
    handleIncludeToggle
};
app.factory( 'Evm1IncludeRendererService', () => exports );
