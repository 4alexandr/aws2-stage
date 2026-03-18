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
 * Directive to display a gallery panel
 *
 * @module js/workinstr-overview-panel.component
 */
import * as app from 'app';
import 'js/aw-panel-body.directive';
import 'js/aw-graph.directive';
import 'js/aw-i18n.directive';
import 'js/aw-transclude.directive';
import 'js/aw-command.directive';
import 'js/aw-icon.directive';
import 'js/workinstr-overview-panel.controller';

'use strict';

/**
 * Directive used to display an overview of an buisness object and it's entire tree.
 *
 * @example - In Ewi we present the entire tree in
 *
 *
 * Parameters:
 * @parameter overview-commands - a list of commands that you want to display
 * @parameter graph-model - the model that is needed for the aw-graph directive
 * @parameter finished-initial-load - a boolean value to know when to hide the message displayed before all of the
 *            data is loaded
 *
 * @example <workinstr-overview-panel overview-commands="<%value%>" graph-model="<%value%>"
 *          finished-initial-load="<%value%>"></workinstr-overview-panel>
 *
 * @member workinstr-overview-panel
 * @memberof NgElementComponentes
 */
app.component( 'workinstrOverviewPanel', {
    transclude: true,
    bindings: {
        overviewCommands: '=',
        graphModel: '<',
        finishedInitialLoad: '<',
        displayGraph: '<'
    },
    controller: 'workinstrOverviewPanelController',
    templateUrl: app.getBaseUrlPath() + '/html/workinstr-overview-panel.component.html'
} );
