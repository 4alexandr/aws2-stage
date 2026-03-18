// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 *
 *
 * @module js/aw-paramtable-col-checkbox.directive
 */
import app from 'app';
import 'angular';
import 'js/aw-i18n.directive';
import 'js/prm1ParameterViewService';

'use strict';

app.directive( 'awParamtableColCheckbox', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        controller: [ '$scope', 'prm1ParameterViewService', function( $scope, vpeViewSvc ) {

        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-paramtable-col-checkbox.directive.html'
    };
} ] );
