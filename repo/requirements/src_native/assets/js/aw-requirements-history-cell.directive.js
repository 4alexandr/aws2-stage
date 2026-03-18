// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to show the full text compare history
 *
 * @module js/aw-requirements-history-cell.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-break.directive';
import 'js/aw-icon.directive';
import 'js/Arm0CompareUtils';
import 'js/awIconService';

'use strict';

/**
 * Directive for compare history cell implementation.
 *
 * @example <aw-requirements-history-cell vmo="model"></aw-requirements-history-cell>
 *
 * @member aw-requirements-history-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementsHistoryCell', [ 'Arm0CompareUtils', 'awIconService', function( compareUtils, awIconSvc ) {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        link: function( $scope, $element ) {
            /**
             * Set content in the compare content div
             */
            var renderContent = function() {
                var contentElement = $element.find( 'div.aw-requirements-compareContent' )[ 0 ];
                contentElement.innerHTML = compareUtils.addCssInContents( $scope.vmo.props[ 9 ].propValues[ 0 ] );
            };


            $scope.openInNewTab = function( selectedObj ) {
                var uidToOpen = selectedObj.props[7].propValues[0];
                var eventData = {
                    objectToOpen:uidToOpen
                };
                eventBus.publish( 'Arm0RequirementHistory.openObjectInNewTab', eventData );
            };

            $scope.ShowOpenCommand = function( event ) {
                event.target.setAttribute( 'src', app.getBaseUrlPath() + '/image/cmdOpen24.svg' );
                var element = getHistoryHeader( event.target );

                var openCommand = element.getElementsByClassName( 'aw-requirements-history-openCommand' )[0];
                openCommand.classList.remove( 'hidden' );
            };

            $scope.hideOpenCommand = function( event ) {
                var element = getHistoryHeader( event.target );
                var openCommand = element.getElementsByClassName( 'aw-requirements-history-openCommand' )[0];
                openCommand.classList.add( 'hidden' );
            };

            var getHistoryHeader = function( ele ) {
                var element = ele;
                while( element !== null && !element.classList.contains( 'aw-requirements-compareHeader' ) ) {
                    element = element.parentElement;
                }
                return element;
            };


            $scope.$watch( 'vmo', renderContent );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-requirements-history-cell.directive.html'
    };
} ] );
