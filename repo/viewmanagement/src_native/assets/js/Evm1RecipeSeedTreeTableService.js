//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 *
 *
 * @module js/Evm1RecipeSeedTreeTableService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import vmcs from 'js/viewModelObjectService';
import uwPropertyService from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import selectionService from 'js/selection.service';
import showObjectCommandHandler from 'js/showObjectCommandHandler';
import evm1RecipeBuilderService from 'js/Evm1RecipeBuilderService';
import clientMetaModel from 'soa/kernel/clientMetaModel';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'soa/kernel/soaService';

import 'js/dateTimeService';

import 'js/messagingService';

var exports = {};

var expandTopBOMNodes = function( parentNode, seeds, levelNdx, rootChildNdx, data, treeNodes ) {
    _.forEach( seeds, function( seed ) {
        var seedVMO = vmcs.createViewModelObject( seed.uid, 'EDIT' );
        var underLyingObjectVMO = vmcs.createViewModelObject( seedVMO.props.awb0UnderlyingObject.dbValues[ 0 ], 'EDIT' );
        var iconURL = underLyingObjectVMO.typeIconURL;
        var seedTreeNode = awTableSvc.createViewModelTreeNode( seedVMO.uid, seedVMO.type, seedVMO.props.object_string.uiValues[ 0 ], levelNdx, rootChildNdx, iconURL );
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

        seedTreeNode.isLeaf = true;
        seedTreeNode.props = seedVMO.props;
        seedTreeNode.props.CustType = uwPropertyService.createViewModelProperty( 'CustType', data.i18n.evm1CategoryColumn,
            'STRING', data.i18n.Selection, [ data.i18n.Selection ] );

        var seedEvm1Include;

        if( recipeCtx ) {
            seedEvm1Include = recipeCtx.includeToggleMap[ seedVMO.uid ];
        }
        if( !seedEvm1Include ) {
            seedEvm1Include = uwPropertyService.createViewModelProperty( 'evm1Include', data.i18n.evm1IncludeColumn,
                'BOOLEAN', true, [ 'True' ] );
            seedEvm1Include.isEditable = true;
            seedEvm1Include.isEnabled = true;
            recipeCtx.includeToggleMap[ seedVMO.uid ] = seedEvm1Include;
        }
        seedTreeNode.props.evm1Include = seedEvm1Include;
        seedTreeNode.props.item_revision_id = underLyingObjectVMO.props.item_revision_id;
        seedTreeNode.props.owning_user = underLyingObjectVMO.props.owning_user;
        if( parentNode ) {
            seedTreeNode.props.evm1SeedParent = uwPropertyService.createViewModelProperty( 'evm1SeedParent', "Parent",
                'STRING', parentNode.uid, [ parentNode.uid ] );
        }
        treeNodes.push( seedTreeNode );
        rootChildNdx += 1;
    } );
};

/**
 * This method is for creating the TreeTable for seed when we expand the tree node
 * @param {Object} data the view-model data
 * @returns {Object} outputData the outputData with TreeTable result
 */
export let getSeedTreeChildren = function( data ) {
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    var levelNdx = treeLoadInput.parentNode.levelNdx + 1;
    var treeNodes = [];
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    var rootChildNdx = 0;
    var contextChildNdx = 0;

    treeLoadInput.displayMode = 'Tree';
    treeLoadInput.parentElement = treeLoadInput.parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : treeLoadInput.parentNode.uid;
    if( recipeCtx.context ) {
        // expand context
        if( levelNdx === 1 ) {
            _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
                var rootElementModel = cdm.getObject( seedInfo.rootElement.uid );

                if( rootElementModel ) {
                    var rootElementVMO = vmcs.createViewModelObject( rootElementModel.uid, 'EDIT' );
                    var underLyingObjectVMO = cdm.getObject( rootElementVMO.props.awb0UnderlyingObject.dbValues[ 0 ] );
                    var custTypeTopBOM = data.i18n.evm1TOPBOMNode;
                    var iconURL = underLyingObjectVMO.typeIconURL;
                    var rootTreeNode = awTableSvc.createViewModelTreeNode( rootElementVMO.uid, rootElementVMO.type, rootElementVMO.props.object_string.uiValues[ 0 ], levelNdx, contextChildNdx, iconURL );

                    if( _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === rootElementVMO.uid; } ) !== -1 ) {
                        custTypeTopBOM = data.i18n.evm1TOPBOMNodeAndSeed;
                        _.remove( seedInfo.seeds, function( seed ) {
                            return seed.uid === rootElementVMO.uid;
                        } );
                    }
                    rootTreeNode.isLeaf = !seedInfo.seeds || seedInfo.seeds && seedInfo.seeds.length === 0;
                    rootTreeNode.props = rootElementVMO.props;
                    rootTreeNode.props.CustType = uwPropertyService.createViewModelProperty( 'CustType', data.i18n.evm1CategoryColumn,
                        'STRING', custTypeTopBOM, [ custTypeTopBOM ] );

                    var rootEvm1Include = recipeCtx.includeToggleMap[ rootElementVMO.uid ];

                    if( !rootEvm1Include ) {
                        rootEvm1Include = uwPropertyService.createViewModelProperty( 'evm1Include', data.i18n.evm1IncludeColumn,
                            'BOOLEAN', true, [ 'True' ] );
                        rootEvm1Include.isEditable = true;
                        rootEvm1Include.isEnabled = true;
                        recipeCtx.includeToggleMap[ rootElementVMO.uid ] = rootEvm1Include;
                    }
                    rootTreeNode.props.evm1Include = rootEvm1Include;
                    rootTreeNode.props.item_revision_id = underLyingObjectVMO.props.item_revision_id;
                    rootTreeNode.props.owning_user = underLyingObjectVMO.props.owning_user;
                    if( treeLoadInput.parentNode ) {
                        rootTreeNode.props.evm1SeedParent = uwPropertyService.createViewModelProperty( 'evm1SeedParent', "Parent",
                            'STRING', treeLoadInput.parentNode.uid, [ treeLoadInput.parentNode.uid ] );
                    }
                    treeNodes.push( rootTreeNode );
                    contextChildNdx += 1;
                }
            } );
        }
        // expand Top NOM Node
        else {
            _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
                if( treeLoadInput.parentNode.uid === seedInfo.rootElement.uid ) {
                    rootChildNdx = 0;
                    expandTopBOMNodes( treeLoadInput.parentNode, seedInfo.seeds, levelNdx, rootChildNdx, data, treeNodes );
                }
            } );
        }
    }
    // expand Top BOM Node
    else {
        _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
            if( treeLoadInput.parentNode.uid === seedInfo.rootElement.uid ) {
                rootChildNdx = 0;
                expandTopBOMNodes( treeLoadInput.parentNode, seedInfo.seeds, levelNdx, rootChildNdx, data, treeNodes );
            }
        } );
    }

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, treeNodes, false, true, true, null );
    var outputData = {
        treeLoadResult: treeLoadResult
    };

    return outputData;
};

/**
 * This method is for creating the TreeTable for seed
 * @param {Object} data the view-model data
 * @returns {Object} outputData the outputData with TreeTable result
 */
export let loadSeedTreeData = function( data ) {
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    var levelNdx = treeLoadInput.parentNode.levelNdx + 1;

    var treeNodes = [];
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    var topChildNdx = 0;
    var rootChildNdx = 0;
    var contextChildNdx = 0;
    var iconURL = null;
    var contextTreeNode;

    treeLoadInput.displayMode = 'Tree';
    treeLoadInput.parentElement = treeLoadInput.parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : treeLoadInput.parentNode.uid;

    // Add Context node if there
    if( levelNdx === 0 ) {
        if( recipeCtx.context ) {
            var custTypeContext = data.i18n.evm1Context;

            if( _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === recipeCtx.context.uid; } ) !== -1 ) {
                custTypeContext = data.i18n.evm1ContextAndSeed;
                _.remove( recipeCtx.seedInfos, function( seedInfo ) {
                    _.remove( seedInfo.seeds, function( seed ) {
                        return seed.uid === recipeCtx.context.uid;
                    } );
                    return seedInfo.seeds.length === 0;
                } );
            }

            iconURL = iconSvc.getTypeIconURL( recipeCtx.context.type );
            contextTreeNode = awTableSvc.createViewModelTreeNode( recipeCtx.context.uid, recipeCtx.context.type, recipeCtx.context.props.object_string.uiValues[ 0 ], levelNdx, topChildNdx, iconURL );
            contextTreeNode.isLeaf = true;
            contextTreeNode.props = recipeCtx.context.props;
            contextTreeNode.props.CustType = uwPropertyService.createViewModelProperty( 'CustType', data.i18n.evm1CategoryColumn,
                'STRING', custTypeContext, [ custTypeContext ] );

            var evm1Include = recipeCtx.includeToggleMap[ recipeCtx.context.uid ];

            if( !evm1Include ) {
                evm1Include = uwPropertyService.createViewModelProperty( 'evm1Include', data.i18n.evm1IncludeColumn,
                    'BOOLEAN', true, [ 'True' ] );
                evm1Include.isEditable = true;
                evm1Include.isEnabled = true;
                recipeCtx.includeToggleMap[ recipeCtx.context.uid ] = evm1Include;
            }
            contextTreeNode.props.evm1Include = evm1Include;
            contextTreeNode.isExpanded = true;
            contextTreeNode.expanded = true;
            treeNodes.push( contextTreeNode );
            topChildNdx += 1;
        }
    }

    // Add Top BOM Nodes and their seeds
    _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
        var rootElementModel = cdm.getObject( seedInfo.rootElement.uid );
        var underLyingObjectVMO = null;

        if( rootElementModel ) {
            var rootElementVMO = vmcs.createViewModelObject( rootElementModel.uid, 'EDIT' );
            var rootLevelNdx = levelNdx;
            var custTypeTopBOM = data.i18n.evm1TOPBOMNode;

            underLyingObjectVMO = vmcs.createViewModelObject( rootElementVMO.props.awb0UnderlyingObject.dbValues[ 0 ], 'EDIT' );
            if( contextTreeNode ) {
                contextTreeNode.isLeaf = false;
                rootLevelNdx = contextTreeNode.levelNdx + 1;
            }
            iconURL = underLyingObjectVMO.typeIconURL;

            var rootTreeNode = awTableSvc.createViewModelTreeNode( rootElementVMO.uid, rootElementVMO.type, rootElementVMO.props.object_string.uiValues[ 0 ], rootLevelNdx, contextChildNdx, iconURL );

            if( _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === rootElementVMO.uid; } ) !== -1 ) {
                custTypeTopBOM = data.i18n.evm1TOPBOMNodeAndSeed;
                _.remove( seedInfo.seeds, function( seed ) {
                    return seed.uid === rootElementVMO.uid;
                } );
            }
            rootTreeNode.isLeaf = !seedInfo.seeds || seedInfo.seeds && seedInfo.seeds.length === 0;
            rootTreeNode.props = rootElementVMO.props;
            rootTreeNode.props.CustType = uwPropertyService.createViewModelProperty( 'CustType', data.i18n.evm1CategoryColumn,
                'STRING', custTypeTopBOM, [ custTypeTopBOM ] );

            var rootEvm1Include = recipeCtx.includeToggleMap[ rootElementVMO.uid ];

            if( !rootEvm1Include ) {
                rootEvm1Include = uwPropertyService.createViewModelProperty( 'evm1Include', data.i18n.evm1IncludeColumn,
                    'BOOLEAN', true, [ 'True' ] );
                rootEvm1Include.isEditable = true;
                rootEvm1Include.isEnabled = true;
                recipeCtx.includeToggleMap[ rootElementVMO.uid ] = rootEvm1Include;
            }
            rootTreeNode.props.evm1Include = rootEvm1Include;
            rootTreeNode.props.item_revision_id = underLyingObjectVMO.props.item_revision_id;
            rootTreeNode.props.owning_user = underLyingObjectVMO.props.owning_user;
            if( contextTreeNode ) {
                rootTreeNode.props.evm1SeedParent = uwPropertyService.createViewModelProperty( 'evm1SeedParent', "Parent",
                    'STRING', contextTreeNode.uid, [ contextTreeNode.uid ] );
            }
            treeNodes.push( rootTreeNode );
            if( !rootTreeNode.isLeaf ) {
                rootTreeNode.isExpanded = true;
                rootTreeNode.expanded = true;
                rootChildNdx = 0;
                expandTopBOMNodes( rootTreeNode, seedInfo.seeds, rootLevelNdx + 1, rootChildNdx, data, treeNodes );
            }
            contextChildNdx += 1;
        }
    } );

    // Add Non BOM Nodes
    _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
        var rootElementModel = cdm.getObject( seedInfo.rootElement.uid );

        if( !rootElementModel ) {
            if( !recipeCtx.context ) {
                topChildNdx = contextChildNdx;
            }
            _.forEach( seedInfo.seeds, function( seed ) {
                var seedVMO = vmcs.createViewModelObject( seed.uid, 'EDIT' );
                var seedName = _.get( seedVMO, 'props.object_string.uiValues[0]', undefined );
                var propsToLoad = [ 'item_revision_id', 'owning_user' ];

                if( !seedName ) {
                    seedName = _.get( seed, 'props.object_string.uiValues[0]', undefined );
                    propsToLoad.push( 'object_string' );
                }

                iconURL = seedVMO.typeIconURL;
                var nonBOMTreeNode = awTableSvc.createViewModelTreeNode( seedVMO.uid, seedVMO.type, seedName, levelNdx, topChildNdx, iconURL );

                nonBOMTreeNode.isLeaf = true;
                if( !seedVMO.props.item_revision_id || !seedVMO.props.owning_user ) {
                    //loadProperties
                    dmSvc.getProperties( [ seedVMO.uid ], propsToLoad ).then(
                        function() {
                            var seedModel = cdm.getObject( seedVMO.uid );
                            exports.updateSeedTreeOnObjectChanged( [ seedModel ], data.dataProviders.seedTreeDataProvider.viewModelCollection.loadedVMObjects );
                        } );
                }
                nonBOMTreeNode.props = seedVMO.props;
                nonBOMTreeNode.props.CustType = uwPropertyService.createViewModelProperty( 'CustType', data.i18n.evm1CategoryColumn,
                    'STRING', data.i18n.Selection, [ data.i18n.Selection ] );

                var seedEvm1Include = recipeCtx.includeToggleMap[ seedVMO.uid ];

                if( !seedEvm1Include ) {
                    seedEvm1Include = uwPropertyService.createViewModelProperty( 'evm1Include', data.i18n.evm1IncludeColumn,
                        'BOOLEAN', true, [ 'True' ] );
                    seedEvm1Include.isEditable = true;
                    seedEvm1Include.isEnabled = true;
                    recipeCtx.includeToggleMap[ seedVMO.uid ] = seedEvm1Include;
                }
                nonBOMTreeNode.props.evm1Include = seedEvm1Include;
                treeNodes.push( nonBOMTreeNode );
                topChildNdx += 1;
            } );
        }

    } );

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, treeNodes, false, true, true, null );
    var outputData = {
        treeLoadResult: treeLoadResult
    };

    return outputData;
};

/**
 * This method is used to process the selections made in the seed tree table
 * @param {Object} data the view-model data
 * @param {object} eventData the event-data which has the selected tree node in the tree table
 */
export let processSeedTreeSelection = function( data, eventData ) {
    if( eventData && eventData.selectedObjects && eventData.selectedObjects.length > 0 ) {
        data.selectedTreeNode = eventData.selectedObjects[ 0 ];

        //Update the selections with the current selected seed
        var selection = cdm.getObject( eventData.selectedObjects[ 0 ].uid );
        var parentSelection = selectionService.getSelection().parent;

        if( !parentSelection ) {
            parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
        }
        selectionService.updateSelection( selection, parentSelection );

        //Set the flag for remove command for recipe. Only for leaf nodes the remove command should be visible
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        if( recipeCtx && recipeCtx.seedSelections && _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === eventData.selectedObjects[ 0 ].uid; } ) !== -1 ) {
            data.childSeedSelectedInTree = true;
        } else {
            data.childSeedSelectedInTree = false;
            data.selectedTreeNode = {};
        }
    } else {
        // For deselect move selection back to recipe.
        var parentSelection = selectionService.getSelection().parent;

        if( !parentSelection ) {
            parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
        }
        data.childSeedSelectedInTree = false;
        data.selectedTreeNode = {};
        selectionService.updateSelection( parentSelection );
    }
};

/**
 * This method is used to get the seed selections from the recipeCtx is set it in data which is consumed by data provider
 * @param {Object} data the view-model data
 * @returns {Object} data the modified data
 */
export let getSeedSelections = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    if( recipeCtx && recipeCtx.seedSelections ) {
        data.seedObjects = recipeCtx.seedSelections;
    }

    if( recipeCtx.userAction === 'execute' ) {
        // perform show results operation
        eventBus.publish( 'evm1ShowExecuteRecipeResults' );
    }
    // Set the flag for showing the Seeds TreeTable
    data.showSeedsTree = true;
    //eventBus.publish( 'evm1seedTreeDataProvider.reset' );
    return data;
};

/**
 * This method is used to store the seed selections, in the recipeCtx, from listening to storeSeedSelectionFromEvent
 * @param {Object} data the view-model  data
 * @param {Object} eventData the eventData
 *
 */
export let storeSeedSelectionFromEvent = function( data, eventData ) {
    if( data && eventData ) {
        var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
        // Add the selected object from eventData to the current Seed Selections
        if( recipeCtx ) {
            if( recipeCtx.seedSelections && recipeCtx.seedSelections.length > 0 ) {
                recipeCtx.seedSelections = _.unionBy( recipeCtx.seedSelections, eventData, 'uid' );
            } else {
                recipeCtx.seedSelections = eventData;
            }

            _.forEach( eventData, function( vmo ) {
                var seedInfo = {
                    rootElement: {
                        uid: '',
                        type: ''
                    },
                    seeds: [ vmo ]
                };

                if( recipeCtx.seedInfos ) {
                    recipeCtx.seedInfos.push( seedInfo );
                } else {
                    recipeCtx.seedInfos = [ seedInfo ];
                }
            } );
            recipeCtx.seedsIsDirty = true;
            appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
        } else {
            recipeCtx = {
                seedSelections: eventData
            };

            _.forEach( eventData, function( vmo ) {
                var seedInfo = {
                    rootElement: {
                        uid: '',
                        type: ''
                    },
                    seeds: [ vmo ]
                };

                if( recipeCtx.seedInfos ) {
                    recipeCtx.seedInfos.push( seedInfo );
                } else {
                    recipeCtx.seedInfos = [ seedInfo ];
                }
            } );
            recipeCtx.seedsIsDirty = true;
            appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
        }
        // Publish event to reset the data provider
        data.childSeedSelectedInTree = false;
        data.selectedTreeNode = {};
        eventBus.publish( 'evm1SeedSelectionProvider.reset' );
        eventBus.publish( 'evm1seedTreeDataProvider.reset' );
    }
};

/**
 * This method is used to delete the seed selection from the ctx when it is removed
 * @param {Object} data the viewModel data
 */
export let deleteSeedSelection = function( data ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );
    // if the object exist in the ctx then remove it
    if( recipeCtx && recipeCtx.seedSelections && recipeCtx.seedSelections.length > 0 && data && data.selectedTreeNode ) {
        removeSeed( recipeCtx, data.selectedTreeNode, data );
        // Unset the flag for remove seed command
        data.childSeedSelectedInTree = false;
        data.selectedTreeNode = {};
        evm1RecipeBuilderService.validateInScopeNavigation( data, recipeCtx );
    }
};

var removeSeed = function( recipeCtx, seedObjectToRemove, data ) {
    var isSeedRemoved = false;

    recipeCtx.seedSelections = _.remove( recipeCtx.seedSelections, function( seedObject ) {
        return seedObject.uid !== seedObjectToRemove.uid;
    } );

    var seedsToRemoveUids = [];

    if( recipeCtx.context && seedObjectToRemove.uid === recipeCtx.context.uid ) {
        // Remove all BOM seeds
        _.remove( recipeCtx.seedInfos, function( seedInfo ) {
            var rootElementModel = cdm.getObject( seedInfo.rootElement.uid );

            if( rootElementModel ) {
                seedsToRemoveUids.push( seedInfo.rootElement.uid );
                _.forEach( seedInfo.seeds, function( seed ) {
                    seedsToRemoveUids.push( seed.uid );
                } );
                return true;
            }
        } );
    } else {
        _.remove( recipeCtx.seedInfos, function( seedInfo ) {
            if( seedObjectToRemove.uid === seedInfo.rootElement.uid ) {
                seedsToRemoveUids.push( seedInfo.rootElement.uid );
                _.forEach( seedInfo.seeds, function( seed ) {
                    seedsToRemoveUids.push( seed.uid );
                } );
                return true;
            }

            _.remove( seedInfo.seeds, function( seed ) {
                var isRemoveSeed = false;

                if( seed.uid === seedObjectToRemove.uid ) {
                    seedsToRemoveUids.push( seed.uid );
                    isRemoveSeed = true;
                }
                return isRemoveSeed;
            } );

            var isRemoveRoot = false;

            if( seedInfo.seeds.length === 0 && _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === seedInfo.rootElement.uid; } ) === -1 ) {
                seedsToRemoveUids.push( seedInfo.rootElement.uid );
                isRemoveRoot = true;
            }
            return isRemoveRoot;
        } );
    }

    _.remove( recipeCtx.seedSelections, function( seedSelection ) {
        return ( _.findIndex( seedsToRemoveUids, function( seedsToRemoveUid ) { return seedsToRemoveUid === seedSelection.uid; } ) !== -1 );
    } );

    // Check if we need to remove Context as well
    if( recipeCtx.context ) {
        var isAllBOMSeedsRemoved = true;

        _.forEach( recipeCtx.seedInfos, function( seedInfo ) {
            var rootElement = cdm.getObject( seedInfo.rootElement.uid );

            if( rootElement ) {

                isAllBOMSeedsRemoved = false;
                return;
            }

        } );
        if( isAllBOMSeedsRemoved ) {
            if( _.findIndex( recipeCtx.seedSelections, function( o ) { return o.uid === recipeCtx.context.uid; } ) === -1 ) {
                seedsToRemoveUids.push( recipeCtx.context.uid );
                recipeCtx.context = undefined;
                data.context = undefined;
            }
        }
    }

    _.forEach( seedsToRemoveUids, function( seedsToRemoveUid ) {
        recipeCtx.includeToggleMap[ seedsToRemoveUid ] = undefined;
    } );

    appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );

    var parentSelection = selectionService.getSelection().parent;

    if( !parentSelection ) {
        parentSelection = cdm.getObject( appCtxSvc.ctx.xrtSummaryContextObject.uid );
    }
    selectionService.updateSelection( parentSelection );
    // Publish event to reset the data provider
    eventBus.publish( 'evm1SeedSelectionProvider.reset' );
    eventBus.publish( 'evm1seedTreeDataProvider.reset' );
};

/**
 * This method is used to update SeedTreeViewModel objects display name when its related ModelObject is updated.
 * @param {Array} updatedObjects updated ModelObjects
 * @param {Array} seedTreeNodes loaded SeedTreeViewModel objects
 */
export let updateSeedTreeOnObjectChanged = function( updatedObjects, seedTreeNodes ) {
    var isClientRefreshRequired = false;
    _.forEach( updatedObjects, function( updatedObject ) {
        var treeNode = _.find( seedTreeNodes, function( treeNode ) {
            return treeNode.uid === updatedObject.uid;
        } );

        if( treeNode ) {
            isClientRefreshRequired = true;

            var custProp = treeNode.props.CustType;
            var evm1Include = treeNode.props.evm1Include;
            var item_revision_id;
            var owning_user;
            var updatedObjectVMO = vmcs.createViewModelObject( updatedObject.uid, 'EDIT' );

            treeNode.displayName = updatedObjectVMO.props.object_string.uiValues[ 0 ];
            if( clientMetaModel.isInstanceOf( 'Awb0Element', updatedObjectVMO.modelType ) && _.get( updatedObjectVMO, 'props.awb0UnderlyingObject.dbValues[0]', undefined ) ) {
                var UnderlyingObjectVMO = cdm.getObject( updatedObjectVMO.props.awb0UnderlyingObject.dbValues[ 0 ] );
                item_revision_id = UnderlyingObjectVMO.props.item_revision_id;
                owning_user = UnderlyingObjectVMO.props.owning_user;
            }
            treeNode.props = updatedObjectVMO.props;
            treeNode.props.CustType = custProp;
            treeNode.props.evm1Include = evm1Include;
            if( item_revision_id ) {
                treeNode.props.item_revision_id = item_revision_id;
            }
            if( owning_user ) {
                treeNode.props.owning_user = owning_user;
            }
        }
    } );
    if( isClientRefreshRequired ) {
        eventBus.publish( 'seedTreeGrid.plTable.clientRefresh' );
    }
};

/**
 * Register or update context for with loaded seed TreeViewModel objects
 * @param {Array} seedTreeNodes loaded SeedTreeViewModel objects
 */
export let updateLoadedSeedTreeNodes = function( seedTreeNodes ) {
    var recipeCtx = appCtxSvc.getCtx( 'recipeCtx' );

    if( recipeCtx ) {
        recipeCtx.loadedSeedTreeNodes = seedTreeNodes;
        appCtxSvc.updateCtx( 'recipeCtx', recipeCtx );
    } else {
        recipeCtx = {
            loadedSeedTreeNodes: seedTreeNodes
        };
        appCtxSvc.registerCtx( 'recipeCtx', recipeCtx );
    }
};

export default exports = {
    getSeedTreeChildren,
    loadSeedTreeData,
    processSeedTreeSelection,
    getSeedSelections,
    storeSeedSelectionFromEvent,
    deleteSeedSelection,
    updateSeedTreeOnObjectChanged,
    updateLoadedSeedTreeNodes
};
app.factory( 'Evm1RecipeSeedTreeTableService', () => exports );
