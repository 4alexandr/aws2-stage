// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to support default cell implementation.
 * 
 * @module js/aw-security-editable-cell.directive
 */
import app from 'app';
import $ from 'jquery';
import parsingUtils from 'js/parsingUtils';
import 'js/aw-list.controller';
import 'js/aw-model-icon.directive';
import 'js/aw-security-editable-cell-content.directive';
import 'js/editHandlerService';

'use strict';

/**
 * Directive for editable cell implementation.
 * 
 * @example <aw-security-editable-cell vmo="model"></aw-security-editable-cell>
 * 
 * @member aw-security-editable-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awSecurityEditableCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: [
            '$scope',
            function( $scope ) {
                $scope.isProgressEditing = false;
                $scope.authProps = {
                    "dbValues": [ "ead_paragraph" ]
                };

                /**
                 * Start edit the list cell
                 * 
                 * @return {Void}
                 */
                $scope.startCellEdit = function( event ) {
                    var editableVmObj = parsingUtils.parentGet( $scope, 'authProps' );
                    $scope.editableProps = editableVmObj.dbValues;
                    if( $scope.editableProps && !$scope.isProgressEditing &&
                        $scope.vmo.modelType.typeHierarchyArray.indexOf( "ITAR_License" ) !== -1 ) {

                        event.stopPropagation();
                        $scope.$broadcast( 'startEdit', true );

                        // trigger click event for stooping the editability of other cell if open
                        $( 'body' ).triggerHandler( 'click' );
                        for( var i = 0; i < $scope.editableProps.length; i++ ) {
                            var prop = $scope.vmo.props[ $scope.editableProps[ i ] ];
                            if( prop ) {
                                prop.autofocus = true;
                                prop.isEditable = true;
                                prop.isArray = false;
                                prop.type = 'STRING';
                            }
                        }

                        $scope.isProgressEditing = true;
                        $scope._bodyClickListener = function( event2 ) {
                            $scope.stopCellEdit( $scope, event2 );
                        };

                        $( 'body' ).off( 'click touchstart', $scope._bodyClickListener ).on( 'click touchstart',
                            $scope._bodyClickListener );
                    }
                };

                /**
                 * Stop edit the list cell
                 * 
                 * @return {Void}
                 */
                $scope.stopCellEdit = function( $scope, event ) {
                    var target = $( event.target );
                    var cell = target.closest( '.aw-widgets-propertyValContainer' );
                    if( cell.length === 0 || !cell.scope() || !cell.scope().prop &&
                        $scope.vmo.modelType.typeHierarchyArray.indexOf( "ITAR_License" ) !== -1 ) {

                        $scope.isProgressEditing = false;
                        $scope.$broadcast( 'saveEdit', false );
                        for( var i = 0; i < $scope.editableProps.length; i++ ) {
                            var prop = $scope.vmo.props[ $scope.editableProps[ i ] ];
                            if( prop ) {
                                prop.autofocus = false;
                                prop.isEditable = false;
                            }
                        }

                        $( 'body' ).off( 'click touchstart', $scope._bodyClickListener );
                        delete $scope._bodyClickListener;
                    }
                };

                /**
                 * destroy
                 * 
                 * @return {Void}
                 */

                $scope.$on( '$destroy', function handleDestroy() {
                    //remove edit handler 
                    $( 'body' ).off( 'click touchstart', $scope._bodyClickListener );
                    delete $scope._bodyClickListener;

                } );
            }
        ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-security-editable-cell.directive.html'
    };
} ] );
