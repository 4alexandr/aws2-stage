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
 * Directive to show native cortona viewer
 *
 * @module js/workinstr-cortona-viewer.directive
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import 'js/appCtxService';
import { SimulationAPI } from 'lib/cortonajs/procedure_api';
import 'js/aw-universal-viewer.controller';
import 'js/workinstrFileTicketService';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native cortona viewer directive
 *
 * @example <workinstr-cortona-viewer data="cortonaDataset">...</workinstr-cortona-viewer>
 *
 * @member workinstr-cortona-viewer
 * @memberof NgElementDirectives
 *
 * @param {Object} appCtxSvc - appCtxService
 * @param {Object} $http - $http service
 * @param {Object} $timeout - $timeout service
 * @param {Object} workinstrFileTicketSvc - workinstrFileTicketService
 *
 * @return {Object} workinstrCortonaViewer directive
 */
app.directive( 'workinstrCortonaViewer', [ 'appCtxService', '$http', '$timeout', 'workinstrFileTicketService', function( appCtxSvc, $http, $timeout, workinstrFileTicketSvc ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-cortona-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Qualifier for current controller
             */
            $scope.whoAmI = 'workinstrCortonaViewer';

            /**
             * Initialize _element
             */
            _element = $element;

            // Populate the iframe with HTML content
            var promise = controller.initViewer( _element );
            promise.then( function() {
                $timeout(
                    function() {
                        setCortonaViewer();
                    }, 5 );
            } );

            /**
             * Get the cortona instractions and animation start and end point for a specific step
             */
            var getCurrentStepCotonaData = function() {
                var interactivityFile = workinstrFileTicketSvc.getFileURL( $scope.data.fileData.cortonaInteractivityTicket );
                $http.get( interactivityFile ).then( function( response ) {
                    // get the appref string of the current step and remove the last character
                    var currStep = appCtxSvc.getCtx( 'EWI0currentStep' );
                    var currentStepAppRef = currStep.props.ewi0cortona_app_ref.dbValues[ 0 ];
                    // check if the last character is a slash, if so need to remove it
                    if( currentStepAppRef.indexOf( '/' ) === currentStepAppRef.length - 1 ) { // endsWith '/'
                        currentStepAppRef = currentStepAppRef.substring( 0, currentStepAppRef.length - 1 );
                    }

                    // find the cortona id of the step matching the app ref of the step
                    var fileData = $( response.data );
                    var procedureElement = fileData.find( 'Procedure' )[ 0 ];
                    var comments = $( procedureElement.innerHTML ).find( 'Comment' )[ 0 ];
                    // default the start and end to be the root of the structure
                    var rootId = procedureElement.id;

                    getMovieRange( rootId, currentStepAppRef, comments );
                } );
            };

            /**
             * Get the cortona movie range to play for the current step
             *
             * @param {Integer} rootId the root of the structure
             * @param {String} currentStepAppRef the appref string of the current step
             * @param {NodesArray} comments Comment nodes array
             */
            var getMovieRange = function( rootId, currentStepAppRef, comments ) {
                var start = rootId;
                var end = start;

                // iterate over the Comments and find the matching app ref,
                // then collect the Actions inside the parent Item of the found Comment.
                var commentsLen = comments.length;
                for( var commentIndx = 0; commentIndx < commentsLen; commentIndx++ ) {
                    var currComment = comments[ commentIndx ];
                    if( !_.isEmpty( currComment.innerHTML ) && currComment.innerHTML.indexOf( '>' + currentStepAppRef + '<' ) !== -1 ) {
                        var parentNodeHTML = currComment.parentNode.innerHTML;
                        var actionNodes = $( parentNodeHTML ).find( 'Action' );
                        var actionsLen = actionNodes.length;
                        if( actionsLen > 0 ) {
                            start = actionNodes[ 0 ].id;
                            if( actionsLen === 1 ) {
                                end = start;
                            } else {
                                end = actionNodes[ actionsLen - 1 ].id;
                            }
                            break;
                        }
                    }
                }
                // Play the cortona animation for a specific step from start to end point
                playCortonaMovieStep( start, end );
            };

            /**
             * Play the cortona animation for a specific step from start to end point
             *
             * @param {String} start the animation start point
             * @param {String} end the animation end point
             */
            var playCortonaMovieStep = function( start, end ) {
                if( window.cortonaAPI ) {
                    window.cortonaAPI.unload();

                    window.cortonaAPI.load( $scope.fileUrl );
                    window.cortonaAPI.on_simulation_load = function( success ) {
                        if( success ) {
                            window.cortonaAPI.vcr_set_range( start, end );
                            window.cortonaAPI.vcr_play();
                        }
                    };
                }
            };

            /**
             * Initialize the Cortona API and play its movie
             */
            var setCortonaViewer = function() {
                var fileUrl = $scope.fileUrl;
                // Initialize the Cortona API only once. Otherwise user will get and exception saying
                // that the Cortona API cannot be initialized more than once.
                if( !window.cortonaAPI ) {
                    var cortona = $( '#cortona' );
                    window.cortonaAPI = new SimulationAPI( cortona[ 0 ] );
                    window.cortonaAPI.load( fileUrl );
                    window.cortonaAPI.on_simulation_load = function( success ) {
                        if( success ) {
                            window.cortonaAPI.set_ui_smoothcontrol( true );
                            window.cortonaAPI.set_ui_axis( true );
                            window.cortonaAPI.set_ui_vcr( true );
                            window.cortonaAPI.set_ui_zoom( true );
                            getCurrentStepCotonaData();
                        }
                    };
                } else {
                    // This is to solve the issue of displaying cortona, mp4 and then cortona again
                         getCurrentStepCotonaData();
                }
            };

            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             *
             * @return {Void}
             */
            $scope.$on( '$destroy', function() {
                // Cleanup
                    //To solve the issue of dataset failing to load after 1st time
                    window.cortonaAPI.unload();
                    window.cortonaAPI.delete();
                $element = null;
                    window.cortonaAPI = null;
            } );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
