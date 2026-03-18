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
 * @module js/aw-cls-properties-location.directive
 */
import app from 'app';
import angular from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-repeat.directive';
import 'js/aw-widget.directive';
import 'js/aw-cls-attribute-annotation-location.directive';
import 'js/exist-when.directive';
import 'js/aw-panel-section.directive';
import 'js/viewModelService';
import 'js/classifyService';
import 'js/classifyFullViewService';
import 'js/aw-property-image.directive';
import 'js/aw-row.directive';
import 'js/aw-splm-table.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-include.directive';
import 'js/aw-popup-command-bar.directive';


/**
 * Directive to display the class attributes for view, edit, and add operations
 *
 * @example <aw-cls-properties-location attributes="theAttributeArray" view="theViewMode"></aw-cls-properties-location>
 *
 * @member aw-cls-properties-location
 * @memberof NgElementDirectives
 */
app.directive( 'awClsPropertiesLocation', [ 'viewModelService', 'classifyService', 'classifyFullViewService', function( viewModelSvc, classifySvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',
        scope: {
            attributes: '=?',
            view: '=',
            showallprop: '=',
            activeview: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-properties-location.directive.html'
    };
} ] );
