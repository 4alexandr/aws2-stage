// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-cls-unitsystem.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-property-label.directive';
import 'js/aw-radiobutton.directive';


/**
 * Directive to display the unit system radio button
 *
 * @example <aw-cls-unitsystem prop="data.unitSystem" action="convertValues"></aw-cls-unitsystem>
 *
 * @member aw-cls-unitsystem
 * @memberof NgElementDirectives
 */
app
    .directive(
        'awClsUnitsystem',
        [ 'viewModelService',
            function( viewModelSvc ) {
                return {
                    restrict: 'E',
                    scope: {
                        view: '=',
                        prop: '='
                    },
                    controller: [ '$scope', function( $scope ) {
                        //Watch the current active view, and if it changes to "View" mode we clear all of the current watchers that have been created
                        $scope.$watch( 'view', function() {
                            if( $scope.view === 'Awp0ViewClassificationSub' ) {
                                //Clear all current watchers
                                $scope.$$watchers = null;
                            }
                        } );
                    } ],
                    template: '<div class="aw-cls-unitSystemContainer"><aw-radiobutton prop="prop" view="view" action="convertValues"></aw-radiobutton></div>'
                };
            }
        ] );
