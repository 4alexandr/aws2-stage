'use strict';

// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/mfe-bom-panel.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-flex-row.directive';
import 'js/aw-data-navigator.directive';
import 'js/appCtxService';
import 'js/aw-include.directive';
import 'js/exist-when.directive';
import 'js/aw-flex-column.directive';

'use strict';
/**
 *
 * @memberof NgDirectives
 */

app.directive( 'mfeBomPanel', [ function() {
    return {
        restrict: 'E',
        scope: {
            provider: '=',
            baseSelection: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/mfe-bomPanel.directive.html',
        controller: [ '$scope', '$state', 'appCtxService',
            function awMfeBomPanelCtrl( $scope, $state, appCtxService ) {
                const MBM_TREE_CONTEXT_KEYS = 'mbmTreeContextKeys';
                var _eventSubDefs = [];
                $scope.contextInfo = null;
                $scope.contextKey = $scope.provider.viewKey;
                let requestPref = {
                    savedSessionMode: 'ignore'
                };
                let currentContext = {};
                let modelObject = $scope.baseSelection.modelObject;
                let productCtx = $scope.baseSelection.productContext;

                let mbmTreeContextKeys = appCtxService.getCtx( MBM_TREE_CONTEXT_KEYS );
                if( !mbmTreeContextKeys ) {
                    mbmTreeContextKeys = [];
                    appCtxService.registerCtx( MBM_TREE_CONTEXT_KEYS, mbmTreeContextKeys );
                }
                if( $scope.provider.viewBase && $scope.provider.viewModes && $scope.provider.viewModes.TreeView && $scope.provider.viewModes.TreeView.primaryWorkArea ) {
                    let treeContextKey = $scope.provider.viewBase + _.upperFirst( $scope.provider.viewModes.TreeView.primaryWorkArea );
                    if( !_.find( mbmTreeContextKeys, function( value ) { return value === treeContextKey; } ) ) {
                        mbmTreeContextKeys.push( treeContextKey );
                    }
                }

                if( $scope.provider.openMode ) {
                    requestPref.openWPMode = $scope.provider.openMode;
                }
                if( productCtx ) {
                    currentContext.pci_uid = productCtx.uid;
                }
                currentContext.uid = modelObject.uid;
                let contextState = {
                    currentState: currentContext,
                    requestPref: requestPref,
                    expansionCriteria: {},
                    transientRequestPref:{},
                    modelObject: modelObject
                };

                if( $scope.provider.showTopNode ) {
                    contextState.showTopNode = $scope.provider.showTopNode;
                }
                appCtxService.registerCtx( $scope.contextKey, contextState );
                appCtxService.registerCtx( 'aceActiveContext', {
                    key: $scope.contextKey,
                    context: appCtxService.ctx[ $scope.contextKey ]
                } );
                appCtxService.registerCtx( 'showGraphics', false );
                $scope.$evalAsync( function() {
                    updateSubPanelContext();
                } );

                /**
                 * Utility to update the sub panel context
                 * @private
                 * @method updateSubPanelContext
                 */
                var updateSubPanelContext = function updateSubPanelContext() {
                    let topElement = appCtxService.getCtx( $scope.provider.viewKey ).modelObject;
                    if( topElement ) {
                        $scope.contextInfo = {
                            modelObject: topElement.type === 'MECollaborationContext' ? null : topElement.modelObject,
                            provider: $scope.provider
                        };
                    }
                };

                var updateReqPref = function( eventData ) {
                    let ctx = appCtxService.getCtx( eventData.contextKey );
                    let oldReqPref = ctx.requestPref ? ctx.requestPref : {};
                    oldReqPref.openWPMode = $scope.provider.openMode;
                    appCtxService.updatePartialCtx( eventData.contextKey + '.requestPref', oldReqPref );
                };

                var updateUrlFromCurrentState = function( updatedState ) {
                    _.forEach( updatedState, function( value, parameter ) {
                        if( parameter === 'pci_uid' ) {
                            if( $scope.provider.viewKey === 'ebomContext' ) {
                                $state.params.pci_uid = value;
                            }
                            if( $scope.provider.viewKey === 'mbomContext' ) {
                                $state.params.pci_uid2 = value;
                            }
                        }
                    } );

                    $state.go( $state.current.name, $state.params );
                };

                var _updateBreadCrumbs = function( eventData ) {
                    if( eventData.lastSelectedObject ) {
                        eventBus.publish( $scope.provider.breadcrumbConfig.vm + '.updateBreadCrumb', eventData );
                    }
                };
                _eventSubDefs.push( eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
                    if( eventData && eventData.contextKey && eventData.contextKey === $scope.contextKey ) {
                        updateSubPanelContext();
                        updateReqPref( eventData );
                        _updateBreadCrumbs( eventData = {
                            id: eventData.contextKey,
                            lastSelectedObject: eventData.context
                        } );
                    }
                } ) );
                _eventSubDefs.push( eventBus.subscribe( $scope.provider.breadcrumbConfig.vm + '.refresh', function( eventData ) {
                    if( eventData.lastSelectedObject && eventData.lastSelectedObject.type !== 'MECollaborationContext' ) {
                        _updateBreadCrumbs( eventData );
                    } else {
                        if( $scope.ctx && $scope.ctx[ $scope.provider.viewKey ].modelObject ) {
                            _updateBreadCrumbs( eventData = {
                                id: $scope.provider.viewKey,
                                lastSelectedObject: $scope.ctx[ $scope.provider.viewKey ].modelObject
                            } );
                        }
                    }
                } ) );

                _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( eventData ) {
                    if( eventData.name === $scope.contextKey && eventData.target === 'currentState' ) {
                        let updatedState = eventData.value[ $scope.contextKey ].currentState;
                        updateUrlFromCurrentState( updatedState );
                    }
                } ) );
                $scope.$on( '$destroy', function() {
                    for( let listener in _eventSubDefs ) {
                        eventBus.unsubscribe( listener );
                    }
                    appCtxService.unRegisterCtx( $scope.contextKey );
                    appCtxService.unRegisterCtx( 'aceActiveContext' );
                    appCtxService.unRegisterCtx( 'showGraphics' );
                } );
            }
        ],
        link: function link( $scope, $element, $attributes ) {
            $element.addClass( 'aw-layout-flexRow  aw-layout-flexbox' );
        }
    };
} ] );
