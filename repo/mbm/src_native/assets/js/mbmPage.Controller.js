// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the {@link NgControllers.mbmPageController}
 *
 * @module js/mbmPage.Controller
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-include.directive';
import 'js/appCtxService';
import localStrg from 'js/localStorage';
import 'js/occurrenceManagementServiceManager';
import 'soa/dataManagementService';
import 'js/localeService';
import eventBus from 'js/eventBus';
import 'js/mbmCompareUtils';
import 'js/messagingService';
import mbmLicenseService from 'js/mbmLicenseService';
import mbmViewUtils from 'js/mbmViewUtils';

'use strict';

/**
 * mbmPage controller.
 *
 * @class mbmPageController
 * @memberOf NgControllers
 */
app.controller( 'mbmPageController', [ '$scope', '$state', 'appCtxService', 'occurrenceManagementServiceManager',
    'soa_dataManagementService', 'soa_kernel_clientDataModel', 'localeService', 'mbmCompareUtils','messagingService',
    function( $scope, $state, appCtxService, occMgmtServiceManager, dataManagementService, cdmSvc, localeService, mbmCompareUtils, messagingService) {
        mbmLicenseService.validateMbmLicense().then( function( isMbmLicenseValidated ) {
                mbmViewUtils.get3DViewerContentLayoutPreference();
                $scope.isMbmLicenseValidated = isMbmLicenseValidated;
                const SESSION_OUT_LISTENER = 'sessionOutListener';
                const contextKeys = [ 'ebomContext', 'mbomContext' ];
                let taskPageContext = {};
                appCtxService.ctx.requestPref = appCtxService.ctx.requestPref || {};
                appCtxService.ctx.requestPref.savedSessionMode = 'ignore';
                appCtxService.updatePartialCtx( 'splitView.mode', true );
                appCtxService.updatePartialCtx( 'splitView.viewKeys', contextKeys );
                appCtxService.ctx.skipAutoBookmark = true;
                // don't need to show the Right Wall.
                appCtxService.ctx.hideRightWall = true;

                localeService.getLocalizedText( 'mbmMessages', 'subTaskName' ).then( function( result ) {
                    taskPageContext.subTaskName = result;
                } );
                localeService.getLocalizedText( 'mbmMessages', 'taskName' ).then( function( result ) {
                    taskPageContext.taskName = result;
                } );
                let objectToLoad = [];
                let cc_uid = $state.params.cc_uid;
                let pci_uid = $state.params.pci_uid;
                let pci_uid2 = $state.params.pci_uid2;
                let cn_uid = $state.params.cn_uid;
                if( cc_uid ) {
                    objectToLoad.push( cc_uid );
                }
                if( cn_uid ) {
                    objectToLoad.push( cn_uid );
                    mbmCompareUtils.setOpenWithChangeNotice( true );
                }
                if( pci_uid ) {
                    objectToLoad.push( pci_uid );
                }
                if( pci_uid2 ) {
                    objectToLoad.push( pci_uid2 );
                }
                if( objectToLoad.length > 0 ) {
                    dataManagementService.loadObjects( objectToLoad ).then( function() {
                        let ccObject = cdmSvc.getObject( cc_uid );
                        let cnObject = cdmSvc.getObject( cn_uid );
                        let pciObject = cdmSvc.getObject( pci_uid );
                        let pciObject2 = cdmSvc.getObject( pci_uid2 );
                        if( cnObject ) {
                            taskPageContext.cnObject = cnObject;
                            $scope.cnObject = cnObject;
                        }
                        if( ccObject ) {
                            taskPageContext.ccName = ccObject.props.object_string.dbValues[ 0 ];
                            appCtxService.updateCtx( 'taskPageContext', taskPageContext );
                            $scope.modelObjectsToOpen = {
                                ebomContextInfo: {
                                    modelObject: ccObject,
                                    productContext: pciObject
                                },
                                mbomContextInfo: {
                                    modelObject: ccObject,
                                    productContext: pciObject2
                                }
                            };
                            occMgmtServiceManager.initializeOccMgmtServices();
                        }
                    } );
                }

                if( !appCtxService.getCtx( SESSION_OUT_LISTENER ) ) {
                    appCtxService.registerCtx( SESSION_OUT_LISTENER, eventBus.subscribe( 'session.signOut', function() {
                        let mbmTreeContextKeys = appCtxService.getCtx( 'mbmTreeContextKeys' );
                        if( mbmTreeContextKeys ) {
                            let allLocalStates = localStrg.get( 'awTreeTableState' );
                            let allLocalStatesJson = JSON.parse( allLocalStates );
                            _.forEach( mbmTreeContextKeys, function( mbmTreeContextKey ) {
                                delete allLocalStatesJson[ mbmTreeContextKey ];
                            } );
                            let stringToPersist = JSON.stringify( allLocalStatesJson );

                            localStrg.publish( 'awTreeTableState', stringToPersist );
                            let _sessionOutListener = appCtxService.getCtx( SESSION_OUT_LISTENER );
                            if( _sessionOutListener ) {
                                eventBus.unsubscribe( _sessionOutListener );
                                appCtxService.unRegisterCtx( SESSION_OUT_LISTENER );
                                appCtxService.unRegisterCtx( 'mbmTreeContextKeys' );
                            }
                        }
                    } ) );
                }

                $scope.$on( '$destroy', function() {
                    appCtxService.unRegisterCtx( 'splitView' );
                    appCtxService.unRegisterCtx( 'taskPageContext' );
                    mbmCompareUtils.resetCompareContext();
                    occMgmtServiceManager.destroyOccMgmtServices();
                    appCtxService.ctx.hideRightWall = undefined;
                } );
            }
        );
    }
] );
