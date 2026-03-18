// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*
 global
 define
 */

/**
 * component of the overview panel
 * @module js/workinstr-overview-panel.controller
 */
import * as app from 'app';
import 'js/viewModelService';

'use strict';

/**
 * Defines workinstrOverviewPanel controller
 *
 * @param {Object} $scope - Directive scope
 * @param {Object} viewModelService - viewModelService
 *
 * @member workinstrOverviewPanelController
 * @memberof NgControllers
 */
app.controller( 'workinstrOverviewPanelController', [ '$scope', 'viewModelService',
    function( $scope, viewModelService ) {
        var self = this;

        /**
         * The on button clicked event. This will be called when one of the overview commands is being clicked
         * @param {String} action - the action to be performed.
         * @param {Boolean} activeState - the current active state of the button
         */
        self.onButtonClicked = function( action, activeState ) {
            if( !activeState ) {
                var viewModelData = viewModelService.getViewModel( $scope, true );
                viewModelService.executeCommand( viewModelData, action, $scope );
                self.setActiveOnly( action );
            }
        };

        /**
         * This methods sets only one of the overview commands as currently active. The other commands will be not
         * currently active.
         * @param {String} commandAction - the commandAction of the command that should be currently active
         */
        self.setActiveOnly = function( commandAction ) {
            var commandsLen = self.overviewCommands.length;
            for( var cmdIndx = 0; cmdIndx < commandsLen; cmdIndx++ ) {
                var cmd = self.overviewCommands[ cmdIndx ];
                cmd.active = cmd.action === commandAction;
            }
        };
    }
] );
