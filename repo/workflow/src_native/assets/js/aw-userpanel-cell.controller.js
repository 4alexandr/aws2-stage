// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * userpanel cell controller.
 *
 * @module js/aw-userpanel-cell.controller
 */
import * as app from 'app';
import 'js/awIconService';
import 'soa/kernel/clientDataModel';
import 'js/localeService';

'use strict';

/**
 * The controller for the userpanel cell directive
 *
 * @class UserPanelCellCtrl
 * @param $scope {Object} - Directive scope
 * @param awIconSvc {Object} - Icon service
 * @param cdm {Object} - Client data model service
 * @param soaSvc {Object} - SOA service
 * @param viewModelObjectSvc {Object} - View model object service
 * @memberof NgControllers
 */
app.controller( 'UserPanelCellCtrl', [
    '$scope',
    'awIconService',
    'soa_kernel_clientDataModel',
    'localeService',
    function( $scope, awIconSvc, cdm, localeSvc ) {
        var ctrl = this;

        /**
         * Get the model object that need to be render so that correct icon will be shown
         *
         * @param {Object} objectToRender: modelObject
         * @return {Object} modelObject
         */
        var _getModelObject = function( objectToRender ) {
            var modelObject = objectToRender;
            if( modelObject && modelObject.props && modelObject.props.user ) {
                modelObject = cdm.getObject( modelObject.props.user.dbValues[ 0 ] );
            }
            return modelObject;
        };

        /**
         * Update the type icon and thumbnail image based on the current VMO.
         *
         * @method updateIcon
         * @memberof UserPanelCellCtrl
         */
        ctrl.updateIcon = function() {
            //Clear any previous thumbnail
            $scope.vmo.thumbnailUrl = '';
            $scope.vmo.typeIconFileUrl = '';
            $scope.vmo.hasThumbnail = false;

            // Check if input object is of type resource pool then show the resource pool icon
            // and if it's of type user then show the user icon
            var modelObject = _getModelObject( $scope.vmo );

            //Get the updated type icon url
            $scope.vmo.typeIconFileUrl = awIconSvc.getTypeIconFileUrl( modelObject );
            if( $scope.vmo.type === 'KeyRole' ) {
                $scope.vmo.typeIconFileUrl =  $scope.vmo.typeIconURL;
            }
            if( $scope.vmo ) {
                //and thumbnail url
                var thumbnailUrl = awIconSvc.getThumbnailFileUrl( modelObject );
                $scope.vmo.thumbnailUrl = thumbnailUrl;

                if( thumbnailUrl ) {
                    $scope.vmo.hasThumbnail = true;
                }
            }
        };

        /**
         * Render the cell properties for Resource pool
         *
         * @param {Object} objectToRender: modelObject
         * @param {String} anyString: anyString
         */
        var _renderResourcepoolCellProperties = function( objectToRender, anyString ) {
            var modelObject = objectToRender;
            if( modelObject && modelObject.props && modelObject.props.user ) {
                modelObject = cdm.getObject( modelObject.props.user.dbValues[ 0 ] );
            }
            var groupName = '';
            var roleName = '';

            // Check if object string property is correct loaded for input model object then get that
            // property value to populate the cell properties
            if( modelObject.props.object_string && modelObject.props.object_string.uiValues ) {
                // Get the property value and split it with "/"
                var cellProps = modelObject.props.object_string.uiValues[ 0 ];
                var keyValue = cellProps.split( '/' );

                // Check if key value is not null and has length > 1
                if( keyValue && keyValue.length > 1 ) {
                    // Get the 0th index value for parse and check if it is equal to * then
                    // replace the * with ANY string and set it to cell header 1 object
                    if( keyValue[ 0 ] ) {
                        if( keyValue[ 0 ] === '*' ) {
                            keyValue[ 0 ] = anyString;
                        }
                        groupName = keyValue[ 0 ];
                    }

                    // Get the 1st index value for parse and check if it is equal to * then
                    // replace the * with ANY string and set it to cell header 2 object
                    if( keyValue[ 1 ] ) {
                        if( keyValue[ 1 ] === '*' ) {
                            keyValue[ 1 ] = anyString;
                        }
                        roleName = keyValue[ 1 ];
                    }
                }
            }
            modelObject.groupName = groupName;
            modelObject.roleName = roleName;
        };

        /**
         * Update the type icon and thumbnail image based on the current VMO.
         *
         * @method renderCellProperties
         * @memberOf UserPanelCellCtrl
         */
        ctrl.renderCellProperties = function() {
            if( $scope.vmo && $scope.vmo.type === 'ResourcePool' ) {
                localeSvc.getLocalizedText( 'WorkflowCommandPanelsMessages', 'any' ).then( function( anyString ) {
                    _renderResourcepoolCellProperties( $scope.vmo, anyString );
                } );
            }
        };
    }
] );
