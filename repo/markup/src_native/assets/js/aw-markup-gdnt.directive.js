// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to support markup GD&T implementation.
 *
 * @module js/aw-markup-gdnt.directive
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import 'js/aw-property-label.directive';
import 'js/viewModelService';

'use strict';

/**
 * Directive for markup GD&T implementation.
 *
 * @example <aw-markup-gdnt prop="data.gdntValue" list="data.gdntSymbolValues.dbValue" action="gdntValueChanged" ></aw-markup-gdnt>
 *
 * @member aw-markup-gdnt
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupGdnt', [ 'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            scope: { prop: '=', list: '=', action: '@' },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-gdnt.directive.html',
            controller: [ '$scope', '$element', function( $scope, $element ) {
                $scope.init = function() {
                    var res = $scope.prop.dbValue.match( />[^<]*<\/td>/gu );
                    $scope.textInputs = $element.find( 'input[type="text"]' );
                    for( var i = 0; i < $scope.textInputs.length; i++ ) {
                        $scope.textInputs[i].value = res && res[i] ? res[i].substring( 1, res[i].length-5 ) : '';
                    }

                    $scope.textInputs.change( $scope.updateDbValue );
                    $scope.textInputs.focus( function() {
                        $scope.focused = $( this );
                    });
                    $scope.textInputs[0].focus();
                };

                $scope.selected = function( v ) {
                    var newText = v.propInternalValue;
                    if( $scope.focused ) {
                        var el = $scope.focused[0];
                        var start = el.selectionStart;
                        var end = el.selectionEnd;
                        var text = el.value;
                        el.value = text.substring( 0, start ) + newText + text.substring( end, text.length );
                        el.selectionStart = el.selectionEnd = start + newText.length;
                        $scope.focused.focus();
                        $scope.updateDbValue();
                    }
                };

                $scope.updateDbValue = function() {
                    var row = '';
                    for( var i = 0; i < $scope.textInputs.length; i++ ) {
                        var val = $scope.textInputs[i].value;
                        if( val ) {
                            row += '<td style="border:1px solid black; padding: 2px 4px 2px 4px;">' + val + '</td>';
                        }
                    }
                    $scope.prop.dbValue = !row ? '':
                        '<table style="border:1px solid black; border-collapse:collapse; width:20px;">' +
                        '<tr>' + row + '</tr></table>';

                    if( $scope.action ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                    }
                };

                $scope.init();
            } ]
        };
    }
] );
