// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to display work instructions tabs container.
 *
 * @module js/workinstr-tabs-container.directive
 */
import * as app from 'app';
import 'js/workinstr-tabs-container.controller';
import 'js/aw-transclude.directive';
import 'js/aw-include.directive';
import 'js/aw-tab.directive';
import 'js/aw-tab-container.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-i18n.directive';

'use strict';

/**
 * Directive to display work instructions tabs container.
 *
 * @example <workinstr-tabs-container tabs="tabsList"></workinstr-tabs-container>
 *
 * @member workinstr-tabs-container
 * @memberof NgElementDirectives
 *
 * @return {Object} workinstrTabsContainer directive
 */
app.directive( 'workinstrTabsContainer', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-tabs-container.directive.html',
        transclude: true,
        scope: {
            tabs: '<',
            selectedTab: '=?',
            allEmpty: '<?',
            filteredTabs: '<'
        },
        controller: 'workinstrTabsContainerCtrl'
    };
} ] );
