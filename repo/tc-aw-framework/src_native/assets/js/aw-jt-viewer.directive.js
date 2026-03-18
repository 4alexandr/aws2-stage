// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgElementDirectives.aw-jt-viewer}
 *
 * @module js/aw-jt-viewer.directive
 */
import * as app from 'app';
import 'js/appCtxService';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';

'use strict';

/**
 * Directive to display the JT viewer.
 *
 *
 * @example <aw-jt-viewer></aw-jt-viewer>
 *
 * @member aw-jt-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awJtViewer', [ 'appCtxService', function( appCtxSvc ) {
    return {
        restrict: 'E',
        scope: {
            data: '=',
            enableHeader: '@?'
        },
        templateUrl: app.getBaseUrlPath() + "/html/aw-jt-viewer.directive.html",
        link: function( $scope, $element, attrs, controller ) {
            controller.initViewer( $element, true );
            //set the selected object as viewer context object for JT viewer
            //to align with Image Capture as implemented in earlier versions
            $scope.contextObject = appCtxSvc.getCtx( 'selected' );
            $scope.afterPresenterLoaded = function() {
                controller.setViewerDimensions();
                $element.find( ".aw-xrt-viewerPanel" ).height( $scope.viewerHeight );
            };

            /**
             * Set callback on window resize
             */
            controller.setResizeCallback( $scope.afterPresenterLoaded );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
