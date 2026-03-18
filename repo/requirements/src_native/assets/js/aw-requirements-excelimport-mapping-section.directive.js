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
 * Directive to display a Widget for mapping of mapping and property in import panel.
 * 
 * @module js/aw-requirements-excelimport-mapping-section.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-property-image.directive';
import 'js/aw-i18n.directive';
import 'js/aw-property-val.directive';
import 'js/exist-when.directive';

'use strict';

/**
 * Directive to display a Active Widget.
 * 
 * @example <aw-requirements-excelimport-mapping-section prop="prop"></aw-requirements-excelimport-mapping-section>
 * 
 * @member aw-requirements-excelimport-mapping-section class
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsExcelimportMappingSection', //
    [ function() {
        return {
            restrict: 'E',
            scope: {
                prop: '='
            },

            controller: [ '$scope', function( $scope ) {
                $scope.toggleDropdown = function() {
                    eventBus.publish( "importSpecification.resetNewGroupNameVisibilty" );
                };

            } ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-excelimport-mapping-section.directive.html'
        };
    } ] );
