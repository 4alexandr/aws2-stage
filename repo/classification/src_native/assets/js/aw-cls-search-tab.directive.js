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
 * Directive to support classification search location to display VNC tab and search result tab.
 *
 * @module js/aw-cls-search-tab.directive
 */
import app from 'app';
import 'js/aw-command-panel-section.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/visible-when.directive';
import 'js/aw-tab-set.directive';
import 'js/aw-cls-vnc.directive';
import 'js/aw-tree.directive';
import 'js/aw-panel-body.directive';
import 'js/aw-column.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-navigate-breadcrumb.directive';
import 'js/aw-default-cell.directive';
import 'js/exist-when.directive';
import 'js/aw-link-with-popup-menu.directive';


/**
 * Directive for classification search location for implemting VNC and search results
 *
 * @example <aw-cls-search-tab></aw-cls-search-tab>
 *
 * @member aw-cls-search-tab.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awClsSearchTab', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-search-tab.directive.html'
    };
} ] );
