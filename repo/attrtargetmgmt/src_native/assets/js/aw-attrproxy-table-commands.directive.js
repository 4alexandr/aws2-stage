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
 * Directive to add command bar in attribute proxy table
 * 
 * @module js/aw-attrproxy-table-commands.directive
 */
import * as app from 'app';
import 'js/aw-transclude.directive';
import 'js/aw-command-bar.directive';

'use strict';

/**
 * Directive for defining commands on table.
 * 
 * @example <aw-attrproxy-table-commands></aw-attrproxy-table-commands>
 * 
 */
app.directive( 'awAttrproxyTableCommands', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-attrproxy-table-commands.directive.html'
    };
} ] );
