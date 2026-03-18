// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive is used to show the tracelink tooltip cell.
 *
 * @module js/aw-requirements-tooltip-cell.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-icon.directive';

'use strict';

/**
 * Definition for the 'aw-requirements-tooltip-cell' directive used to show the tracelink tooltip cell.
 *
 * @example <aw-requirements-tooltip-cell vmo="vmo" ></aw-requirements-tooltip-cell>
 *
 * @member aw-requirements-tooltip-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsTooltipCell', function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-tooltip-cell.directive.html',
        transclude: true,
        controller: [ '$scope', function( $scope ) {
            // Handle open TL object ci
            $scope.openTracelinkedObject = function( row ) {
                if( row.isTracelinkedItem ) {
                        eventBus.publish( 'Arm0TracelinkTooltip.openObjectInNewTab', {
                            sourceObject: row
                        } );
                }
            };
            // Handle delete tl click
            $scope.removeTracelinkedObject = function( row ) {
                if( row.isTracelinkedItem ) {
                    eventBus.publish( 'requirementDocumentation.removeTracelink', {
                            sourceObject: row
                        } );
                }
            };
            // Handle Review Suspect click
            $scope.reviewSuspectClick = function( row ) {
                if( row.suspectReviewTaskList && row.suspectReviewTaskList.length > 0 ) {
                    eventBus.publish( 'Arm0TracelinkTooltip.openSuspectTaskInNewTab', {
                        sourceObjects: row.suspectReviewTaskList
                    } );
                }
            };
            // Handle master object click
            $scope.openMasterReq = function( row ) {
                if( row.isBasedOn ) {
                    eventBus.publish( 'Arm0TracelinkTooltip.openObjectInNewTab', {
                        sourceObject: row
                    } );
                }
            };
        } ]

    };
} );
