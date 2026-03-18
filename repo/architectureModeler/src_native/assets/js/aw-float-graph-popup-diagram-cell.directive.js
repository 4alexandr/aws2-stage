// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support default cell implementation.
 *
 * @module js/aw-float-graph-popup-diagram-cell.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-model-icon.directive';
import 'js/aw-default-cell-content.directive';
import 'js/aw-property-image.directive';
import 'js/exist-when.directive';

'use strict';

/**
 * Directive for default cell implementation.
 *
 * @example <aw-default-cell vmo="model"></aw-default-cell>
 *
 * @member aw-default-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awFloatGraphPopupDiagramCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-float-graph-popup-diagram-cell.directive.html',
        controller: [ //
            '$scope', //
            function( $scope ) {

                $scope.previewDiagram = function() {
                    if( this.vmo && this.vmo.uid && this.vmo.props ) {
                        var showDiagramEventData = {
                            "diagramVMO": this.vmo,
                            "diagramUID": this.vmo.uid,
                            "diagramName": this.vmo.props.object_string.dbValue
                        };

                        eventBus.publish( "awFloatGraphPopup.dblClickDiagramInList", showDiagramEventData );
                    }
                };

            }
        ]
    };
} ] );
