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
 * Directive to support requirement editor implementation.
 * 
 * @module js/aw-requirements-editor.directive
 */
import app from 'app';
import 'js/aw-requirements-editor.controller';

'use strict';

/**
 * Directive for Requirement Editor.
 * 
 * @example <aw-requirements-editor prop="data.editorProps"></aw-requirements-editor>
 * 
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsEditor', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        controller: 'awRequirementsEditorController as vm',
        bindToController: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-editor.directive.html',
        replace: true,
        link: function( $scope, $element, attrs, controller ) {

            controller.init();
            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             * 
             * @return {Void}
             */
            $scope.$on( '$destroy', function() {
                //Cleanup
                controller.destroy();
                $element = null;
            } );

        }
    };
} ] );
