// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Display the icon associated with a given group member 'ViewModelObject'.
 *
 * @module js/aw-userpanel-icon.directive
 */
import * as app from 'app';
import 'js/aw-userpanel-cell.controller';

'use strict';

/**
 * Display the icon associated with a given group member 'ViewModelObject'.
 *
 * @example <aw-userpanel-icon vmo="[ViewModelObject]"></aw-userpanel-icon>
 *
 * @memberof NgDirectives
 * @member aw-userpanel-icon
 */
app.directive( 'awUserpanelIcon', [ function() {
    return {
        restrct: 'E',
        scope: {
            vmo: '=',
            hideoverlay: '<'
        },
        controller: 'UserPanelCellCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            $scope.$watch( 'vmo', $controller.updateIcon );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-userpanel-icon.directive.html'
    };
} ] );
