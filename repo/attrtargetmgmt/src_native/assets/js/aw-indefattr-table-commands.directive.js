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
 * Directive to add command bar in interface definition attribute table
 * 
 * @module js/aw-indefattr-table-commands.directive
 */
import * as app from 'app';
import 'js/aw-transclude.directive';
import 'js/aw-command-bar.directive';

'use strict';

/**
 * Directive for defining commands on table.
 * 
 * @example <aw-indefattr-table-commands></aw-indefattr-table-commands>
 * 
 */
app.directive( 'awIndefattrTableCommands', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-indefattr-table-commands.directive.html'
    };
} ] );
