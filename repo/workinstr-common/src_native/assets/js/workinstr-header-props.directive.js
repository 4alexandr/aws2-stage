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
 * Directive used as header property
 * 
 * @module js/workinstr-header-props.directive
 */
import * as app from 'app';
import 'js/workinstr-header-props.controller';
import 'js/aw-repeat.directive';
import 'js/aw-widget.directive';

'use strict';

/**
 * Directive used to display the header properties.
 * 
 * 
 * Parameters: propdata - Any name value properties to display in the header
 * 
 * @example <workinstr-header-props [propdata=""]></aw-header--props>
 * 
 * @member workinstr-header-props
 * @memberof NgElementDirectives
 */
app.directive( 'workinstrHeaderProps', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-header-props.directive.html',
        scope: {
            propdata: '=?'
        },
        controller: 'workinstrHeaderPropsController',
        link: function postLink( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'propdata', $controller.setHeaderProperties, true );
        }
    };
} ] );
