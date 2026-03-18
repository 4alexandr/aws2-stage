// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to support markup group implementation.
 *
 * @module js/aw-markup-group.directive
 */
import app from 'app';
import 'js/aw-markup-cell.directive';
import 'js/Awp0MarkupService';
import 'js/aw-icon.directive';

'use strict';

/**
 * Directive for markup group implementation.
 *
 * @example <aw-markup-group vmo="item"></aw-markup-group>
 *
 * @member aw-markup-group
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupGroup', [
    function() {
        return {
            restrict: 'E',
            scope: { vmo: '=' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-group.directive.html',
            controller: [ '$scope', 'Awp0MarkupService', function( $scope, markupService ) {
                $scope.toggleGroup = markupService.toggleGroup;
            } ]
        };
    }
] );
