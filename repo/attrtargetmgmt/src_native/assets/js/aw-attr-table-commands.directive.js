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
 * Directive to add command bar in attribute table
 * 
 * @module js/aw-attr-table-commands.directive
 */
import * as app from 'app';
import 'js/aw-transclude.directive';
import 'js/aw-command-bar.directive';

'use strict';

/**
 * Directive for defining commands on table.
 * 
 * @example <aw-attr-table-commands></aw-attr-table-commands>
 * 
 */
app.directive( 'awAttrTableCommands', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-attr-table-commands.directive.html'
    };
} ] );
