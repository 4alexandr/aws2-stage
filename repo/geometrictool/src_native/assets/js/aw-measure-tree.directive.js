//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
define
*/

/**
 * @module js/aw-measure-tree.directive
 */
import * as app from 'app';
import 'js/aw-measure-tree.controller';
import 'js/aw-check-list.directive';
import 'js/aw-repeat.directive';

'use strict';

/**
 * Directive to display viewer measurement option in tree
 *
 * @example <aw-measure-tree prop="data.xxx" ></aw-measure-tree>
 *
 * @member aw-measure-tree
 * @memberof NgElementDirectives
 */
app.directive( 'awMeasureTree', [ function() {
    return {
        restrict: 'E',
        scope: {
            treedata: '='
        },
        controller: 'awMeasureTreeController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-measure-tree.directive.html'
    };
} ] );
