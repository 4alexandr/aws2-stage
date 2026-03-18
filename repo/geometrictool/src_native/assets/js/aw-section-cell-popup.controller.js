// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines controller for <aw-section-cell-popup> directive.
 *
 * @module js/aw-section-cell-popup.controller
 */
import * as app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';

'use strict';

/**
 * Defines awSectionCellPopup controller
 *
 * @member awSectionCellPopupController
 * @memberof NgControllers
 */
app.controller( 'awSectionCellPopupController', [
    '$scope', '$element', '$timeout',
    function( $scope, $element, $timeout ) {

        var self = this;
        var _touchHandlerAttached = false;
        self._uiProperty = $scope.prop;
        self._sectionId = self._uiProperty.dbValue[ 0 ].sectionId;
        self._itemValues = self._uiProperty.dbValue[ 0 ].itemValues;
        self._allCommands = [];

        $scope.expanded = false;

        if( self._itemValues ) {
            for( var i = 0; i < self._itemValues.length; i++ ) {
                var command = {};
                command.id = self._itemValues[ i ].itemId;
                command.iconName = self._itemValues[ i ].iconName;
                command.tooltip = self._itemValues[ i ].tooltip;
                command.action = self._itemValues[ i ].action;
                command.isSelected = self._itemValues[ i ].isSelected;
                if( self._itemValues[ i ].itemId === self._uiProperty.dbValue[ 0 ].defaultId ) {
                    self._defaultId = self._itemValues[ i ].itemId;
                    self._defaultDisplayName = self._itemValues[ i ].tooltip;
                    self._defaultIconName = self._itemValues[ i ].iconName;
                    command.isSelected = true;
                }
                self._allCommands.push( command );
            }
        }

        $scope.commands = self._allCommands;

        /**
         * toggle drop-down
         *
         * @return {Void}
         */
        self._toggleDropdown = function( newVal, oldVal ) {
            if( newVal !== oldVal ) {
                if( $scope.expanded ) {
                    $scope.collapseDropdown();
                } else {
                    $scope.expandDropdown();
                }
            }
        };

        //Collapse on window resize
        $scope.$on( 'windowResize', function() {
            if( $scope.expanded ) {
                $scope.collapseDropdown();
            }
        } );

        /**
         * Expand the drop-down
         *
         * @return {Void}
         */
        $scope.expandDropdown = function() {
            // Setup the click handler
            $( 'body' ).on( 'click touchstart', $scope.exitFieldHandler );
                var createSectionButton = $( $element ).parent().find( 'div.aw-widgets-textStyle' ).first()[ 0 ];
            var choiceElemDimensions = createSectionButton.getBoundingClientRect();
            $scope.dropDownVerticalAdj = 0;
            $scope.prop.sectionCellPopUpLeft = choiceElemDimensions.left;
            $scope.prop.sectionCellPopUpTop = window.pageYOffset + choiceElemDimensions.top + choiceElemDimensions.height;
                $( $element ).find( 'div.aw-layout-popup' ).css( 'position', 'fixed' );
            if( !_touchHandlerAttached ) {
                _touchHandlerAttached = true;
                    var allListElements = $element.find( 'li.aw-widgets-cellListItem' );
                for( var i = 0; i < allListElements.length; i++ ) {
                    var listElement = $( allListElements[ i ] );
                    listElement.on( 'touchstart', {
                        command: $( allListElements[ i ] ).scope().command
                    }, self._changeSelectionTouch );
                }
            }
            $timeout( function() {
                $scope.expanded = true;
            }, 0 );
        };

        /**
         * Collapse the drop-down
         *
         * @return {Void}
         */
        $scope.collapseDropdown = function() {
            $( 'body' ).off( 'click touchstart', $scope.exitFieldHandler );
            $timeout( function() {
                $scope.expanded = false;
            }, 0 );
        };

        /**
         * Perform the action
         *
         * @param {Object} event
         * @return {Void}
         */
        self._changeSelectionTouch = function( event ) {
            event.preventDefault();
            $scope.changeSelection( event.data.command );
        };

        /**
         * Exit field handler which gets triggered when user clicks outside element
         *
         * @param {DOMEvent} event -
         *
         * @return {Void}
         */
        $scope.exitFieldHandler = function() {
            if( $scope.expanded ) {
                $scope.collapseDropdown();
            }
        };

        /**
         * Update the widget to reflect the latest selection
         *
         * @param {Object} selectedCommand - selection from the dropdown menu
         *
         * @return {Void}
         */
        $scope.changeSelection = function( selectedCommand ) {
            for( var i = 0; i < $scope.commands.length; i++ ) {
                var listCommand = $scope.commands[ i ];
                if( listCommand === selectedCommand ) {
                    listCommand.isSelected = true;
                } else {
                    if( listCommand.isSelected ) {
                        listCommand.isSelected = false;
                    }
                }
            }
                $scope.$parent[selectedCommand.action]( selectedCommand );




        };

        $scope.$watch( 'prop.showPopup', self._toggleDropdown );

        $scope.$on( '$destroy', function() {
            $scope.expanded = null;
            $scope.commands = null;
            $scope.prop = null;

            $element.remove();
            $element.empty();
        } );
    }
] );
