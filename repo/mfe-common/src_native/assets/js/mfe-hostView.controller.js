/* eslint-disable no-console */
// Copyright 2020 Siemens Product Lifecycle Management Software Inc.
/**
 * This module contains a controller that handles hosting.
 *
 * @module js/mfe-hostView.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import 'lib/splmBrowserInterOpMin';
import 'js/aw.base.sublocation.controller';
import mfeHostingService from 'js/services/mfeHostingService';
import browserUtils from 'js/browserUtils';

'use strict';

app.controller( 'HostedViewCtrl', [
    '$scope',
    '$controller',
    '$state',
    function( $scope, $controller, $state ) {
        const ctrl = this;

        ngModule.extend( ctrl, $controller( 'BaseSubLocationCtrl', {
            $scope: $scope
        } ) );

        $scope.$on( '$destroy', () => {
            mfeHostingService.destroyHosting();
        } );

        $scope.baseUrlPath = app.getBaseUrlPath();

        $scope.fullScreen = false;

        /**
         * Location requirements
         */
        $scope.locationPages = [ {
            pageId: 0,
            pageIndex: 0,
            selectedTab: true,
            displayTab: true,
            classValue: 'aw-base-tabTitle',
            title: '',
            name: '',
            visible: true,
            navigation: true,
            xrtProps: [],
            columns: []
        } ];

        const hostingconf = mfeHostingService.initHosting( $state.current.data.hostApplication, $state.$current.url.prefix, $state.params );
        const iFrame = document.getElementById( 'hostedIframe' );

        //fix for NX only when loading page to NX the page is not shown entirely
        if (browserUtils.isQt){
          iFrame.style.height="-webkit-fill-available";
          iFrame.style.width="calc(100% - 8px)";
        }

        iFrame.src = hostingconf.src;
        $scope.hostControlInstance = hostingconf.hostControlInstance;
        //This is needed when we navigate using breadcrumbs on same page but different object
        $scope.$on( '$locationChangeSuccess', function() {
            const hostingconf = mfeHostingService.initHosting( $state.current.data.hostApplication, $state.$current.url.prefix, $state.params );
            const iFrame = document.getElementById( 'hostedIframe' );
            if( iFrame ) {
                iFrame.src = hostingconf.src;
            }
            $scope.hostControlInstance = hostingconf.hostControlInstance;
        } );
    }
] );
