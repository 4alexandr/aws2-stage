// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-individual-bulk-filter.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-property-image.directive';
import 'js/aw-transclude.directive';


/**
 *
 *
 * @example <aw-cls-individual-bulk-filter >
 *          </aw-cls-individual-bulk-filter>
 *
 * @member aw-cls-individual-bulk-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awClsIndividualBulkFilter', [ 'viewModelService',
    function( viewModelSvc ) {
        return {

            transclude: true,
            restrict: 'E',
            scope: {
                filterName: '=',
                filterDisplayName: '=',
                appliedFilterArray: '=',
                removeAction: '=',
                removeAllAction: '='
            },
            controller: [ '$scope', function( $scope ) {
                /**
                 * Removes the item from array cell list.
                 *
                 * @memberof NgControllers.awPropertyArrayValController
                 *
                 * @param {Number} $index - index of the cell list item which needs to be moved.
                 */
                $scope.remove = function( $index ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    if( $index < $scope.appliedFilterArray.length ) {
                        $scope.indexToBeRemoved = $index;
                        viewModelSvc.executeCommand( declViewModel, $scope.removeAction, $scope );
                    }
                    // $scope.appliedFilterArray.splice($index, 1);
                };

                $scope.removeAll = function() {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    viewModelSvc.executeCommand( declViewModel, $scope.removeAllAction, $scope );
                    // $scope.appliedFilterArray.splice(0, $scope.appliedFilterArray.length);
                };
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-individual-bulk-filter.directive.html'
        };
    }
] );
