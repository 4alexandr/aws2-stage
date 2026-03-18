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
 * Directive to support logical object cell implementation.
 * 
 * @module js/aw-logicalobj-cell.directive
 */
import app from 'app';
import 'js/awIconService';
import 'js/aw-default-cell-content.directive';

'use strict';

/**
 * Directive for logical object cell implementation.
 * 
 * @example <aw-logicalobj-cell vmo="model"></aw-logicalobj-cell>
 * 
 * @member aw-logicalobj-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awLogicalobjCell', [ 'awIconService', function( awIconSvc ) {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.$watch( 'vmo', function() {
                var typeHierarchy = [];
                if( $scope.vmo ) {
                    var type = $scope.vmo.type;
                    var typeName = $scope.vmo.props.type_name.dbValue;
                    var parentTypes = $scope.vmo.props.parent_types.dbValues;

                    if( type === "ImanType" && typeName ) {
                        typeHierarchy.push( typeName );
                    }

                    for( var j in parentTypes ) {
                        // parentType is of form "TYPE::Item::Item::WorkspaceObject"
                        var arr = parentTypes[ j ].split( '::' );
                        typeHierarchy.push( arr[ 1 ] );
                    }
                }

                if( typeHierarchy.length === 0 ) {
                    typeHierarchy.push( "BusinessObject" );
                }

                $scope.typeIcon = awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );
            } );
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-logicalobj-cell.directive.html'
    };
} ] );
