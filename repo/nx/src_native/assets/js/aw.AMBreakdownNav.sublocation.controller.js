// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.AMBreakdownNavSubLocationCtrl}
 *
 * @module js/aw.AMBreakdownNav.sublocation.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import 'js/selection.service';
import 'soa/dataManagementService';
import 'js/AMBreakdownNavigationTreeService';
import AwStateService from 'js/awStateService';

'use strict';

/**
 * Object navigation controller. Extends the {@link  NgControllers.ObjectNavSubLocationCtrl}.
 *
 * @class NgControllers.AMBreakdownNavSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'AMBreakdownNavSubLocationCtrl', [
    '$scope',
    '$controller',
    '$q',
    'appCtxService',
    'soa_kernel_clientDataModel',
    'selectionService',
    'soa_dataManagementService',
    'AMBreakdownNavigationTreeService',
    function( $scope, $controller, $q, appCtxService, cdm, selectionService, dms, AMBreakdownNavigationTreeService ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'ObjectNavSubLocationCtrl', {
            $scope: $scope
        } ) );


        //Add additional information into the context
        //Triggered when URL changes
        $scope.addSearchContext = function( searchContext ) {
            if( !searchContext.criteria ) {
                searchContext.criteria = {};
            }

            var type = appCtxService.getCtx( 'selected' ).type;

            if( appCtxService.getCtx( 'search' )
            && appCtxService.getCtx( 'search' ).criteria
            && appCtxService.getCtx( 'search' ).criteria.objectSet ) {
                searchContext.criteria.objectSet = appCtxService.getCtx( 'search' ).criteria.objectSet;
            } else {
                if( type === 'Clr0ProductAppBreakdown' ) {
                    searchContext.criteria.objectSet = 'clr0ChildAppAreaBreakdown.Clr0AppearanceAreaBreakdown';
                } else if( type === 'Clr0AppearanceAreaBreakdown' ) {
                    searchContext.criteria.objectSet = 'clr0Children.WorkspaceObject';
                } else if( type === 'Clr0AppearanceArea' ) {
                    searchContext.criteria.objectSet = 'clr0ChildAppDesignators.Clr0AppearanceDesignator';
                }
            }
            searchContext.criteria.parentUid = AwStateService.instance.params.uid;
            searchContext.criteria.returnTargetObjs = 'true';
            if( AwStateService.instance.params.d_uids && !AMBreakdownNavigationTreeService.isTreeViewMode( $scope.view ) ) {
                var d_uids = AwStateService.instance.params.d_uids.split( '^' );
                searchContext.criteria.parentUid = d_uids[ d_uids.length - 1 ];
            }
            if( $scope.baseSelection.uid !== searchContext.criteria.parentUid ) {
                //Note - This should not result in a SOA call in most cases because
                //show object location controller has been modified to ensure d_uids are also loaded before revealing sublocation
                return dms.loadObjects( [ searchContext.criteria.parentUid ] ).then(
                    function() {
                        appCtxService.updatePartialCtx( 'locationContext.modelObject', cdm
                            .getObject( searchContext.criteria.parentUid ) );
                    } ).then( function() {
                    return searchContext;
                } );
            }
            return $q.when( searchContext );
        };

    }
] );
