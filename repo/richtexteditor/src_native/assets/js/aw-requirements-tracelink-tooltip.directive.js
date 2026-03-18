// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive is used to show the tracelink tooltip.
 *
 * @module js/aw-requirements-tracelink-tooltip.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import 'js/aw-requirements-tooltip-cell.directive';
import 'js/aw-list.directive';
import 'js/aw-i18n.directive';
import 'js/aw-panel.directive';

'use strict';

/**
 * Definition for the 'aw-requirements-tracelink-tooltip' directive used to show the tracelink tooltip.
 *
 * @example <aw-requirements-tracelink-tooltip data="data" ></aw-requirements-tracelink-tooltip>
 *
 * @member aw-requirements-tracelink-tooltip
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsTracelinkTooltip', function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-tracelink-tooltip.directive.html',
        transclude: true,
        link: function( $scope, $element ) {
            $element.addClass( 'aw-requirement-tracelinkTooltip' );

            var panelId = 'Arm0TraceLinkTooltipBalloonPopup';
            var awTracelinkBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
            if( awTracelinkBalloonPopup && awTracelinkBalloonPopup.length > 0 ) {
                awTracelinkBalloonPopup[ 0 ].addEventListener( 'mouseleave', function( evt ) {
                    eventBus.publish( 'Arm0TracelinkTooltip.closeTracelinkTooltip' );
                } );
            }
        },
        controller: [ '$scope', function( $scope ) {
            $scope.moreTracelinkClicked = function( object ) {
                setTimeout( function() {
                    var eventData = {
                        sourceObject: {
                            uid: object.uid
                        },
                        viewExistingTracelink: true
                    };
                    eventBus.publish( 'requirementDocumentation.addObjectToTracelinkPanel', eventData );
                }, 100 );
            };
        } ]

    };
} );
