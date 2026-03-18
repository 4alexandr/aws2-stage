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
 * Directive to show native mht viewer
 *
 * @module js/workinstr-mht-viewer.directive
 */
import * as app from 'app';
import 'js/aw-universal-viewer.controller';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

var lineBreak = '=\r\n';

/**
 * Native mht viewer directive
 *
 * @example <workinstr-mht-viewer data="mhtDataset">...</workinstr-mht-viewer>
 *
 * @param {Object} $http - $http service
 * @param {Object} $sce - $sce service
 *
 * @member workinstr-mht-viewer
 * @memberof NgElementDirectives
 *
 * @return {Object} workinstrMhtViewer directive
 */
app.directive( 'workinstrMhtViewer', [ '$http', '$sce', function( $http, $sce ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-mht-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Qualifier for current controller
             */
            $scope.whoAmI = 'workinstrMhtViewer';

            /**
             * Initialize _element
             */
            _element = $element;

            // Populate the iframe with mht content
            var promise = controller.initViewer( _element );
            promise.then( function() {
                $http.get( $scope.fileUrl ).then( function( response ) {
                    var text = response.data;
                    var temp = text.toLowerCase();
                    var begin = temp.indexOf( '<html' );
                    var end = temp.indexOf( '</html>' );
                    if( begin !== -1 && end !== -1 ) {
                        text = text.substr( begin, end ).replace( new RegExp( lineBreak, 'g' ), '' ).replace( new RegExp( '=3D', 'g' ), '=' );
                    }
                    $scope.mhtContent = $sce.trustAsHtml( text );
                } );
            } );

            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             *
             * @return {Void}
             */
            $scope.$on( '$destroy', function() {
                // Cleanup
                $element = null;
            } );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
