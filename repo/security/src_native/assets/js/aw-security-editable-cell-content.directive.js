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
 * Directive to support default cell content implementation.
 * 
 * @module js/aw-security-editable-cell-content.directive
 */
import app from 'app';
import parsingUtils from 'js/parsingUtils';
import 'js/aw-list.controller';
import 'js/aw-visual-indicator.directive';
import 'js/aw-widget.directive';

'use strict';

/**
 * Directive for editable cell content implementation.
 * 
 * @example <aw-security-editable-cell-content vmo="model"></aw-security-editable-cell-content>
 * 
 * @member aw-security-editable-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awSecurityEditableCellContent', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.cellEditMode = false;
            $scope.modifiable = false;
            var editableVmObj = parsingUtils.parentGet( $scope, 'authProps' );
            if( editableVmObj ) {
                $scope.editableProps = editableVmObj.dbValues;
            }
            $scope.$on( 'startEdit', function( events, args ) {
                $scope.modifiable = args;
                $scope.cellEditMode = args;
            } );
            $scope.$on( 'saveEdit', function( events, args ) {
                $scope.modifiable = args;
                $scope.cellEditMode = args;
            } );
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-security-editable-cell-content.directive.html'
    };
} ] );
