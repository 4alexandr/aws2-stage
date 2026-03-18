// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to display a Active Widget.
 *
 * @module js/aw-cls-attribute-annotation-location.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-property-label.directive';
import 'js/aw-property-val.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/uwSupportService';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/classifyService';
import 'js/aw-icon.directive';
import 'js/classifyFullViewService';
import 'js/aw-numeric.directive';
import 'js/aw-date.directive';

/**
 * Directive to display a Active Widget.
 *
 * @example <aw-cls-attribute-annotation-location prop="prop"></aw-cls-attribute-annotation-location>
 *
 * @member aw-cls-attribute-annotation-location
 * @memberof NgElementDirectives
 */
app.directive( 'awClsAttributeAnnotationLocation', //
    [ 'viewModelService', 'uwPropertyService', 'uwSupportService', 'classifyService', 'classifyFullViewService', //
        function( viewModelSvc, uwPropertyService, uwSupportSvc, classifySvc, classifyFullViewSvc ) {
            return {
                restrict: 'E',
                scope: {
                    prop: '=',
                    attribute: '=?',
                    modifiable: '=?',
                    hint: '@?',
                    labeldisplay: '@?',
                    parentattribute: '=?',
                    cardinalattribute: '=?'
                },
                controller: [ '$scope', function( $scope ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    if( $scope.prop ) {
                        if( $scope.modifiable !== undefined ) {
                            uwPropertyService.setIsPropertyModifiable( $scope.prop, $scope.modifiable );
                        }

                        if( $scope.labeldisplay ) {
                            var propertyLabelDisplay = uwSupportSvc.retrievePropertyLabelDisplay( $scope.labeldisplay );
                            uwPropertyService.setPropertyLabelDisplay( $scope.prop, propertyLabelDisplay );
                        }
                    }
                } ],
                templateUrl: app.getBaseUrlPath() + '/html/aw-cls-attribute-annotation-location.directive.html'
            };
        }
    ] );
