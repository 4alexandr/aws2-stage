// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to relations in derive panel.
 *
 * @module js/aw-cm-derive-relation-panel.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/localeService';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-icon-button.directive';
import 'js/visible-when.directive';
import 'js/aw-i18n.directive';
import 'js/aw-panel-section.directive';
import 'js/viewModelService';
import 'js/panelContentService';
import 'js/appCtxService';

'use strict';

/**
 * Directive to relations in derive panel.
 *
 * @example <aw-cm-derive-relation-panel relation-name="relation" propagate-all-relation="propagaeAllRelations"
 *          aw-repeat="relation : relationNames" visible-when="showRelationPanel"></aw-cm-derive-relation-panel>
 *
 * relation-name is relation for which objects needs to be displayed. propagate-all-relation is to indicate
 * whether all relations needs to be auto selected.
 *
 * @memberof NgElementDirectives
 */
app.directive( 'awCmDeriveRelationPanel', [
    'viewModelService',
    'panelContentService',
    'appCtxService',
    'clipboardService',
    'soa_kernel_clientDataModel',
    'localeService',
    function( viewModelSvc, panelContentSvc, appCtxService, clipboardSrv, cdm, localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                relationName: '=',
                propagateAllRelation: '='
            },
            controller: [
                '$scope',
                function( $scope ) {
                    panelContentSvc.getViewModelById( 'cmDeriveRelationDirective' ).then( function( response ) {
                        viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then( function( declViewModel ) {
                            //Initialize data
                            viewModelSvc.setupLifeCycle( $scope, declViewModel );

                            //variable which will give me selected object from this relation panel. Setting this on appContext object.
                            var deriveRelationProvider = {
                                relationName: $scope.relationName,
                                dataProvider: $scope.data.dataProviders.getPropagateRelationProvider
                            };

                            appCtxService.ctx.deriveRelationsDataProviders
                                .push( deriveRelationProvider );

                            //toggle method to show or hide list
                            $scope.toggleExpansion = function() {
                                if( $scope.data.showList.dbValue ) {
                                    $scope.data.showList.dbValue = false;
                                } else {
                                    $scope.data.showList.dbValue = true;
                                }
                            };


                            var relationToShow = $scope.relationName;

                            var relationSource = {};

                            var propertyDisplayName = '';
                            var dataDisplay = {};

                            var cmUtils = app.getInjector().get( 'changeMgmtUtils' );
                            if( cmUtils.callNewSOAForDerive() ) {
                                var selectedChangeObjectVMO = appCtxService.ctx.mselected[ 0 ];
                                relationSource = selectedChangeObjectVMO.deepCopyData;
                                propertyDisplayName = selectedChangeObjectVMO.deepCopyData[ relationToShow ].relationType.displayName;
                                dataDisplay = selectedChangeObjectVMO.deepCopyData[ relationToShow ].relationType;
                            } else {
                                var selectedChangeObjectModel = cdm.getObject( appCtxService.ctx.selected.uid );
                                relationSource = selectedChangeObjectModel.props;
                                propertyDisplayName = selectedChangeObjectModel.props[ relationToShow ].propertyDescriptor.displayName;
                                dataDisplay = $scope.data.displayedType;
                            }

                            //related object from source change object
                            $scope.data.relatedObjects = [];
                            var relatedObjectUid = relationSource[ relationToShow ].dbValues;
                            for( var uid in relatedObjectUid ) {
                                if( cdm.containsObject( relatedObjectUid[ uid ] ) ) {
                                    var mObject = cdm.getObject( relatedObjectUid[ uid ] );
                                    $scope.data.relatedObjects.push( mObject );
                                }
                            }

                            //Display name for the relation link

                            dataDisplay.propertyDisplayName = propertyDisplayName;
                            $scope.data.displayedType = dataDisplay;

                            //By default set it to 0 of total selected.getPropagateRelationProvider.modelObjectsUpdated will reset it to proper selected objects.
                            var resource = 'ChangeMessages';
                            var localTextBundle = localeSvc.getLoadedText( resource );
                            var countLabel = localTextBundle.countLabel;
                            countLabel = countLabel.replace( '{0}', '0' );
                            countLabel = countLabel.replace( '{1}',
                                relatedObjectUid.length );
                            var countDisplayProp = $scope.data.countLabel;
                            countDisplayProp.propertyDisplayName = countLabel;
                            $scope.data.countLabel = countDisplayProp;

                            //make the dataProider initialize
                            $scope.data.dataProviders.getPropagateRelationProvider
                                .initialize( $scope );

                            var dataProviderUpdateEvent = eventBus
                                .subscribe(
                                    'getPropagateRelationProvider.modelObjectsUpdated',
                                    function() {
                                        if( $scope.propagateAllRelation && $scope.data ) {
                                            $scope.data.dataProviders.getPropagateRelationProvider
                                                .selectAll();
                                        }
                                    } );

                            appCtxService.registerCtx( 'getPropagateRelationProvider',
                                $scope.data.dataProviders.getPropagateRelationProvider );

                            $scope.$on( '$destroy', function() {
                                eventBus.unsubscribe( dataProviderUpdateEvent );
                            } );
                        } );
                    } );
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cm-derive-relation-panel.directive.html'
        };
    }
] );
