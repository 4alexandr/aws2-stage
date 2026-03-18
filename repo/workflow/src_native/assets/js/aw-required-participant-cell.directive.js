// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to support required participant cell implementation.
 *
 * @module js/aw-required-participant-cell.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import $ from 'jquery';
import 'js/aw-model-icon.directive';
import 'js/exist-when.directive';

'use strict';

/**
 * Directive for default cell implementation.
 *
 * @example <aw-required-participant-cell vmo="model"></aw-required-participant-cell>
 *
 * @member aw-required-participant-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awRequiredParticipantCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },

        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-required-participant-cell.directive.html',
        // This function will traverse the DOM element to find the titilekey of the objectset and assign that titlekey
        // into the required VMO, so that when the user will add object in the objectSet we have a information that which
        // objectSet is modified and then we can remove the required VMO from that objectSet.
        link: function( $scope, $element ) {
            var requiredParticipantListener = eventBus.subscribe( 'workflowRequiredParticipant.PropertiesLoaded',
                function() {
                    var walkerView = $.find( "aw-walker-view" );
                    var childrenElements = walkerView[ 0 ].children;
                    if( childrenElements && childrenElements.length > 0 ) {
                        for( var idx = 0; idx < childrenElements.length; idx++ ) {
                            var el1 = $( childrenElements[ idx ] ).find( $element );

                            if( el1 && el1.length > 0 ) {
                                var objectSetElement = $( childrenElements[ idx ] ).find( 'aw-walker-objectset' );

                                if( objectSetElement && objectSetElement.length > 0 && $scope.vmo ) {
                                    if( objectSetElement[ 0 ].attributes && objectSetElement[ 0 ].attributes.length > 0 ) {

                                        for( var ii = 0; ii < objectSetElement[ 0 ].attributes.length; ii++ ) {
                                            var attr = objectSetElement[ 0 ].attributes[ ii ];

                                            if( attr.name === 'titlekey' ) {
                                                $scope.vmo.particiapntType = attr.nodeValue;
                                                break;
                                            }

                                        }

                                    }
                                }
                            }
                        }
                    }
                } );

            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( requiredParticipantListener );
            } );

        }
    };
} ] );
