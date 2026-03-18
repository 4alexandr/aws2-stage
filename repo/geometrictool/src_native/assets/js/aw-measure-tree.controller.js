// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines controller for <aw-measure-tree> directive.
 *
 * @module js/aw-measure-tree.controller
 */
import * as app from 'app';

'use strict';

/**
 * Defines awMeasureTree controller
 *
 * @member awMeasureTreeController
 * @memberof NgControllers
 */
app.controller( 'awMeasureTreeController', [ '$scope', '$element',
    function( $scope, $element ) {
        $scope.$on( '$destroy', function() {
            $scope.treedata = null;
            $element.remove();
            $element.empty();
        } );
    }
] );
