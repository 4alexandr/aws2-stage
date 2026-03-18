// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * work instructions Gallery cell controller.
 *
 * @module js/workinstr-gallery-cell.controller
 * @requires app
 * @requires js/awIconService
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/awIconService';
import 'soa/kernel/clientDataModel';

'use strict';

var _cdm = null;

/**
 * The controller for the workinstr-gallery-cell directive
 *
 * @class workinstrGalleryCellCtrl
 * @param {Object} $scope - Directive scope
 * @param {Object} awIconSvc - Icon service
 * @param {Object} cdm - soa_kernel_clientDataModel
 * @param {Object} workinstrFmsSvc - workinstrFileTicketService
 *
 * @memberof NgControllers
 */
app.controller( 'workinstrGalleryCellCtrl', [ '$scope', 'awIconService', 'soa_kernel_clientDataModel', 'workinstrFileTicketService',
    function( $scope, awIconSvc, cdm, workinstrFmsSvc ) {
        _cdm = cdm;

        var self = this;

        /**
         * Update the type icon and thumbnail image based on the current VMO.
         *
         * @method updateIcon
         * @memberOf workinstrGalleryCellCtrl
         */
        self.updateIcon = function() {
            // Clear any previous thumbnail
            $scope.thumbnailUrl = null;

            // Get the updated type icon url
            var vmo = $scope.vmo;
            $scope.typeIconFileUrl = awIconSvc.getTypeIconFileUrl( vmo );
            if( vmo ) {
                // and thumbnail url
                var thumbUrl = awIconSvc.getThumbnailFileUrl( vmo );
                if( !_.isEmpty( thumbUrl ) ) {
                    $scope.thumbnailUrl = thumbUrl;
                } else {
                    var fileTypes = [ 'JPEG', 'Bitmap', 'GIF', 'TIF' ];
                    if( fileTypes.indexOf( vmo.type ) > -1 ) {
                        var thumbnailUid = vmo.props.ref_list.dbValue[ 0 ];
                        var promise = workinstrFmsSvc.getFileTickets( [ thumbnailUid ] );
                        promise.then( function( fileTicketsResponse ) {
                            var fileTicket = fileTicketsResponse[ thumbnailUid ];
                            if( fileTicket ) {
                                $scope.thumbnailUrl = workinstrFmsSvc.getFileURL( fileTicket[ 0 ] );
                            }
                        } );
                    }
                }
            }
        };

        /**
         * Update the title based on the current VMO.
         *
         * @method updateTitle
         * @memberOf workinstrGalleryCellCtrl
         */
        self.updateTitle = function() {
            var vmo = $scope.vmo;

            $scope.caption = '';
            var originalFileName = null;

            var props = null;
            if( vmo.props ) {
                props = vmo.props;
            } else if( vmo.properties ) {
                props = vmo.properties;
            }

            if( props ) {
                var fileTypes = [ 'SnapShotViewData', 'Web Link', 'FullText', 'CME_Report' ];
                if( fileTypes.indexOf( vmo.type ) === -1 ) {
                    var imanFiles = props.ref_list;
                    if( imanFiles && imanFiles.dbValues.length > 0 ) {
                        var imanFileUid = imanFiles.dbValues[ 0 ]; // Process only first file uid
                        var imanFileModelObject = _cdm.getObject( imanFileUid );

                        if( imanFileModelObject ) {
                            originalFileName = imanFileModelObject.props.original_file_name.uiValues[ 0 ];
                        }
                    }

                    if( originalFileName === null ) {
                        originalFileName = props.object_name.dbValue;
                    }
                } else {
                    originalFileName = props.object_string.displayValues[ 0 ];

                    if( originalFileName === null ) {
                        originalFileName = props.object_string.dbValue;
                    }
                }
            }

            $scope.caption = originalFileName;
        };

        /**
         * Update the cell data
         */
        self.updateIcon();
        self.updateTitle();
    }
] );
