// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to show default viewer
 *
 * @module js/workinstr-default-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';
import 'js/localeService';

'use strict';

/**
 * Native default viewer directive
 *
 * @example <workinstr-default-viewer data="dataset">...</workinstr-default-viewer>
 *
 * @param {Object} localeSvc - locale service
 *
 * @member workinstr-default-viewer
 * @memberof NgElementDirectives
 *
 * @return {Object} workinstrDefaultViewer directive
 */
app.directive( 'workinstrDefaultViewer', [ 'localeService',
    function( localeSvc ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/workinstr-default-viewer.directive.html',
            // Isolate the scope
            scope: {
                data: '='
            },
            link: function( $scope ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'workinstrDefaultViewer';

                var fileName = $scope.data.datasetData.props.ref_list.displayValues[ 0 ];

                var resource = 'WorkinstrMessages';
                var localTextBundle = localeSvc.getLoadedText( resource );
                var fileOpenedInExtViewerLabel = localTextBundle.fileOpenedInExtViewer;
                fileOpenedInExtViewerLabel = fileOpenedInExtViewerLabel.replace( '{0}', fileName );

                $scope.messageText = fileOpenedInExtViewerLabel;
                $scope.messageLink = localTextBundle.clickHereToOpen;
                $scope.fileUrl = $scope.data.fileData.fileUrl;
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
