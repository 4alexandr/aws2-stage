// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display copy options on create change panel for derive.
 *
 * @module js/aw-cm-derive-copy-options.directive
 */
import app from 'app';
import 'js/localeService';
import 'js/aw-cm-derive-relation-panel.directive';
import 'js/aw-repeat.directive';
import 'js/visible-when.directive';
import 'js/appCtxService';
import 'soa/dataManagementService';
import 'soa/kernel/clientDataModel';
import 'soa/kernel/soaService';
import 'soa/kernel/clientMetaModel';

'use strict';

/**
 * Directive to display copy options on create change panel for derive.
 *
 * @example <aw-cm-derive-copy-options></aw-cm-derive-copy-options>
 * @member aw-cm-derive-copy-options
 * @memberof NgElementDirectives
 */
app.directive( 'awCmDeriveCopyOptions', [
    'appCtxService',
    'soa_dataManagementService',
    'localeService',
    'soa_kernel_clientDataModel',
    'soa_kernel_soaService',
    'soa_kernel_clientMetaModel',
    function( appCtxService, dmSvc, localeSvc, cdm, soaSvc, cmm ) {
        return {
            restrict: 'E',
            scope: {},
            controller: [
                '$scope',
                function( $scope ) {
                    appCtxService.ctx.deriveRelationsDataProviders = [];

                    //Show Copy Options
                    $scope.showCopyOptions = false;

                    //Copy Option Text
                    localeSvc.getLocalizedText( 'ChangeMessages', 'copyOptionsText' ).then( function( result ) {
                        $scope.copyOptionsText = result;
                    } );

                    //By default relation list is collapsed.
                    $scope.showRelationPanel = false;

                    //Function expand-collapse list of related objects.
                    $scope.toggleExpansion = function() {
                        if( $scope.showRelationPanel ) {
                            $scope.showRelationPanel = false;
                        } else {
                            $scope.showRelationPanel = true;
                        }
                    };

                    //whether to select all related objects by default.
                    $scope.propagaeAllRelations = false;
                    var propagaeAllRelations = appCtxService.ctx.autoPropagateRel;
                    if( propagaeAllRelations ) {
                        $scope.propagaeAllRelations = true;
                    }

                    //relations which needs to be displayed.
                    $scope.relationNames = [];
                    $scope.relationDisplayNames = [];

                    var cmUtils = app.getInjector().get( 'changeMgmtUtils' );
                    if( cmUtils.callNewSOAForDerive() ) {
                        //Get relation names from DeepCopy data and pass to relation panel
                        var selectedChangeObject = appCtxService.ctx.mselected[ 0 ];
                        var inputData = {
                            deepCopyDataInput: [ {
                                operation: 'cm0DeriveChange',
                                businessObject: selectedChangeObject
                            } ]
                        };
                        var deepCopyInfoMap = [];

                        soaSvc.post( 'Core-2014-10-DataManagement', 'getDeepCopyData', inputData ).then( function( response ) {
                            if( response !== undefined ) {
                                deepCopyInfoMap = response.deepCopyInfoMap;

                                var deepCopyData = deepCopyInfoMap[ 1 ][ 0 ];
                                appCtxService.ctx.deepCopyData = [];

                                var allRelationTypes = [];
                                for( var a in deepCopyData ) {
                                    var relName = deepCopyData[ a ].propertyValuesMap.propertyName[ 0 ];
                                    var deepCopyPropertyType = deepCopyData[ a ].propertyValuesMap.propertyType;
                                    if( deepCopyPropertyType[ 0 ] === 'Relation' ) {
                                        allRelationTypes.push( relName );
                                    }
                                }
                                soaSvc.ensureModelTypesLoaded( allRelationTypes ).then( function() {
                                    selectedChangeObject.deepCopyData = {};
                                    for( var a in deepCopyData ) {
                                        //Only process relation for derive
                                        var deepCopyPropertyType = deepCopyData[ a ].propertyValuesMap.propertyType;
                                        if( deepCopyPropertyType[ 0 ] !== 'Relation' ) {
                                            continue;
                                        }

                                        var deepCopyCopyAction = deepCopyData[ a ].propertyValuesMap.copyAction;
                                        if( deepCopyCopyAction[ 0 ] === 'NoCopy' ) {
                                            continue;
                                        }

                                        var relName = deepCopyData[ a ].propertyValuesMap.propertyName[ 0 ];
                                        if( !$scope.relationNames.includes( relName ) ) {
                                            $scope.relationNames.push( relName );
                                        }
                                        //Getrelation type
                                        var relType = cmm.getType( relName );

                                        var attachedObject = deepCopyData[ a ].attachedObject;
                                        if( !selectedChangeObject.deepCopyData[ relName ] ) {
                                            selectedChangeObject.deepCopyData[ relName ] = {};
                                            selectedChangeObject.deepCopyData[ relName ].dbValues = [];
                                        }
                                        selectedChangeObject.deepCopyData[ relName ].dbValues.push( attachedObject.uid );
                                        selectedChangeObject.deepCopyData[ relName ].relationType = relType;

                                        appCtxService.ctx.deepCopyData.push( deepCopyData[ a ] );
                                    }

                                    //found one relation so show copy option
                                    if( $scope.relationNames.length > 0 ) {
                                        $scope.showCopyOptions = true;
                                    }
                                } );
                            }
                        } );
                    } else {
                        //Get all relations first
                        var allObjectUid = [];
                        var propsToLoad = appCtxService.ctx.relationToPropagate;

                        var selectedChangeObjects = appCtxService.ctx.mselected;
                        for( var i = 0; i < selectedChangeObjects.length; i++ ) {
                            allObjectUid.push( selectedChangeObjects[ i ].uid );
                        }

                        dmSvc.getProperties( allObjectUid, propsToLoad ).then( function() {
                            var selectedChangeObject = cdm.getObject( allObjectUid[ 0 ] );
                            var relationsToPropagate = appCtxService.ctx.relationToPropagate;
                            for( var i in relationsToPropagate ) {
                                if( selectedChangeObject.props[ relationsToPropagate[ i ] ] ) {
                                    var relName = relationsToPropagate[ i ];
                                    if( selectedChangeObject.props[ relName ] ) {
                                        var numOfRelations = selectedChangeObject.props[ relName ].dbValues;
                                        if( numOfRelations.length > 0 ) {
                                            $scope.relationNames.push( relName );
                                        }
                                    }
                                }
                            }

                            //found one relation so show copy option
                            if( $scope.relationNames.length > 0 ) {
                                $scope.showCopyOptions = true;
                            }
                        } );
                    }
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cm-derive-copy-options.directive.html'
        };
    }
] );
