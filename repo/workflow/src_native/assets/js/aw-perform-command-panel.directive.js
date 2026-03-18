// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to display a command panel
 * <P>
 * Note: Typical children of aw-command-panel are aw-panel-header, aw-panel-body, aw-panel-footer
 *
 * @module js/aw-perform-command-panel.directive
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';
import _ from 'lodash';
import 'js/aw-command-sub-panel.directive';
import 'js/aw-navigate-panel.directive';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/aw-icon-button.directive';
import 'js/appCtxService';
import 'js/aw-command-bar.directive';

'use strict';

/**
 * Directive to display a command panel
 * <P>
 * Note: Typical children of aw-command-panel are aw-panel-header, aw-panel-body, aw-panel-footer The "caption"
 * doesn't accept plain text. Need define the caption text in view model i18n or data section.
 *
 * Bind to localization text:
 *
 * @example <aw-perform-command-panel caption="i18n.myPanelCaption">...</aw-perform-command-panel>
 *
 * Bind to non-localization text:
 * @example <aw-perform-command-panel caption="data.myPanelCaption">...</aw-perform-command-panel>
 *
 * @member aw-perform-command-panel
 * @memberof NgElementDirectives
 */
app.directive( 'awPerformCommandPanel', //
    [ 'viewModelService', //
        function( viewModelSvc ) {
            return {
                restrict: 'E',
                transclude: true,
                scope: {
                    caption: '=',
                    hideTitle: '=?',
                    commands: '=?',
                    anchor: '=?',
                    context: '=?'
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-perform-command-panel.directive.html',
                controller: [ '$scope', function( $scope ) {

                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    viewModelSvc.bindConditionStates( declViewModel, $scope );

                    $scope.conditions = declViewModel.getConditionStates();

                    // initialize all default command condition to true
                    _.forEach( $scope.commands, function( command ) {
                        if( command.condition === undefined ) {
                            command.condition = true;
                        }
                    } );

                } ],
                link: function( $scope ) {

                    eventBus.publish( "awPanel.reveal", {
                        "scope": $scope
                    } );
                },
                replace: true
            };
        }
    ] );
