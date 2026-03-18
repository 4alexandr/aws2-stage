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
 * Defines controller for '<workinstr-gallery-panel>' directive.
 *
 * @module js/workinstr-gallery-panel.controller
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/viewModelService';
import 'js/workinstrFileTicketService';
import 'js/workinstrSnapshotService';
import 'soa/kernel/clientDataModel';
import 'js/appCtxService';

'use strict';

var _cdm = null;

/**
 * Defines workinstrGalleryPanel controller
 *
 * @param {Object} $scope - Directive scope
 * @param {Object} $element - $element
 * @param {Object} $timeout - $timeout service
 * @param {Object} workinstrFmsSvc - workinstrFileTicketService
 * @param {Object} workinstrSnapshotSvc - workinstrSnapshotService
 * @param {Object} cdm - soa_kernel_clientDataModel
 * @param {Object} viewModelSvc - viewModelService
 * @param {Object} appCtxSrv - appCtxService
 *
 * @member workinstrGalleryPanelController
 * @memberof NgControllers
 */
app
    .controller(
        'workinstrGalleryPanelController',
        [
            '$scope',
            '$element',
            '$timeout',
            'workinstrFileTicketService',
            'workinstrSnapshotService',
            'soa_kernel_clientDataModel',
            'viewModelService',
            'appCtxService',
            function( $scope, $element, $timeout, workinstrFmsSvc, workinstrSnapshotSvc, cdm, viewModelSvc, appCtxSrv ) {
                _cdm = cdm;

                var self = this;

                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                viewModelSvc.bindConditionStates( declViewModel, $scope );

                $scope.conditions = declViewModel.getConditionStates();

                var autoLoad3D = _isAutoLoad3D();

                var datasetsToShow = sortDatasetsToShow();

                /**
                 * Sort DatasetsToShow
                 */
                function sortDatasetsToShow() {
                    if( appCtxSrv.ctx.sublocation.clientScopeURI !== 'Swi0SwiSubLocation' ) {
                    $scope.activeTab.tab.datasetsToShow = _.sortBy( $scope.activeTab.tab.datasetsToShow, function( modelObj ) {
                        return getThumbnailTitle( modelObj );
                    } );
                }
                }

                /**
                 * get Thumbnail Title
                 * @param {String} vmo vmo
                 * @return {String} Thumbnail Title
                 */
                function getThumbnailTitle( vmo ) {
                    var originalFileName = null;
                    var props = vmo.props;
                    if( props ) {
                        var fileTypes = [ 'SnapShotViewData', 'Web Link', 'FullText', 'CME_Report' ];
                        if( fileTypes.indexOf( vmo.type ) === -1 ) {
                            var imanFiles = props.ref_list;
                            if( imanFiles && imanFiles.dbValues.length > 0 ) {
                                var imanFileUid = imanFiles.dbValues[ 0 ]; //process only first file uid
                                var imanFileModelObject = _cdm.getObject( imanFileUid );
                                if( imanFileModelObject ) {
                                    originalFileName = imanFileModelObject.props.original_file_name.uiValues[ 0 ];
                                }
                            }

                            if( originalFileName === null ) {
                                originalFileName = props.object_name.dbValues;
                            }
                        } else {
                            originalFileName = props.object_string.uiValues[ 0 ];
                            if( originalFileName === null ) {
                                originalFileName = props.object_string.dbValues;
                            }
                        }
                    }
                    return originalFileName.toLowerCase ? originalFileName.toLowerCase() : originalFileName;
                }

                /**
                 * Check if 3D should be automatically loaded
                 *
                 * @return {String} when value is 'true' - 3D should be automatically loaded
                 */
                function _isAutoLoad3D() {
                    var workinstr0VisCtx = appCtxSrv.getCtx( 'workinstr0Vis' );
                    var isAutoLoad3D = 'false';
                    if( workinstr0VisCtx ) {
                        isAutoLoad3D = workinstr0VisCtx.autoLoad3D;
                    }
                    return isAutoLoad3D;
                }

                /**
                 * Get the selected PDF IFrame.
                 * For markup PDF as in MarkupPdf.js line 509 in setViewerContainer function
                 * it selects only the first viewer
                 *
                 * @return {IFrame} the selected PDF IFrame
                 */
                self.getViewerContainer = function() {
                    var myFrame = $element.find( '.aw-pdfjs-pdfViewerIFrame' );
                    if( myFrame && myFrame.length > 0 ) {
                        return myFrame[ 0 ].contentWindow;
                    }
                    return null;
                };

                /**
                 * Set the viewer data
                 *
                 * @param {ModelObject} item the item object to display in the viewer
                 * @param {String} fileTicket the file ticket
                 * @param {String} fileURL the file URL
                 * @param {String} viewer the viewer name to display the file in
                 */
                function _setViewerData( item, fileTicket, fileURL, viewer ) {
                    var typeViewer = viewer;
                    if( !typeViewer ) {
                        typeViewer = $scope.activeTab.tab.viewMode.viewer;
                    }
                    if( !typeViewer ) {
                        typeViewer = $scope.widgets[ item.type ];
                    }
                    if( !typeViewer ) {
                        const NOT_FOUND = -1;
                        if( item.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > NOT_FOUND ) {
                            typeViewer = $scope.widgets.ItemRevision;
                        }
                    }
                    if( !typeViewer ) {
                        if( item.props.file_ext ) {
                            typeViewer = $scope.widgets[ item.props.file_ext.dbValues[ 0 ] ];
                        } else if( item.props.ref_list ) {
                            var fileExt = workinstrFmsSvc.getFileExtension( item.props.ref_list.uiValue );
                            typeViewer = $scope.widgets[ fileExt ];
                        }
                    }
                    if( !typeViewer ) {
                        typeViewer = 'workinstrDefaultViewer';
                    }

                    // The cortona data should always be 3 file tickets:
                    // 1 - wrl movie file
                    // 2 - interactivity.xml file
                    // 3 - the work instructions xml file
                    var fmsTicket = fileTicket === null ? fileTicket : fileTicket[ 0 ];
                    var cortonaInteractivityTicket = fileTicket && fileTicket.length > 1 ? fileTicket[ 1 ] : null;
                    var cortonaWorkInstructionsTicket = fileTicket && fileTicket.length > 2 ? fileTicket[ 2 ] : null;

                    var contextNamespace = $scope.activeTab.tab.workareaName === 'popupMainPanelTabs' ? 'workinstrPopupViewer' : 'workinstrViewer';
                    item.contextNamespace = contextNamespace;

                    var viewerData = {
                        fileData: {
                            file: item,
                            fmsTicket: fmsTicket,
                            fileUrl: fileURL,
                            viewer: typeViewer,
                            cortonaInteractivityTicket: cortonaInteractivityTicket,
                            cortonaWorkInstructionsTicket: cortonaWorkInstructionsTicket,
                            useParentDimensions: true,
                            contextNamespace: contextNamespace
                        },
                        hasMoreDatasets: false,
                        uid: item.uid,
                        useParentDimensions: true,
                        myGalleryPanel: self
                    };
                    viewerData.datasetData = item;

                    $timeout( function() {
                        $scope.viewerData = viewerData;
                        // Hide AW viewer commands
                        appCtxSrv.ctx.viewerContext = {};
                        // Set the command context data
                        $scope.setCmdContext( $scope.viewerData );
                    }, 200 );
                }

                /**
                 * For 3D view SnapShotViewData command
                 *
                 * @param {Object} data the command context data
                 */
                self.show3DSnapShotViewData = function( data ) {
                    data.fileData.viewer = 'workinstrSnapshotViewer';
                };

                /**
                 * For 2D view SnapShotViewData command
                 *
                 * @param {Object} data the command context data
                 */
                self.show2DSnapShotViewData = function( data ) {
                    data.fileData.viewer = 'Awp0ImageViewer';
                };

                /**
                 * Get the snapshot Preview image or imagecapture
                 *
                 * @param {ModelObject} item the selected item object to display in the viewer
                 * @returns {String} the image uid
                 */
                self.getSnapshotImageUid = function( item ) {
                    var imanFiles = item.props.ref_list;
                    var snapShotrefNames = item.props.ref_names.dbValues;
                    if( imanFiles && snapShotrefNames ) {
                        var refLen = snapShotrefNames.length;
                        for( var refIndx = 0; refIndx < refLen; refIndx++ ) {
                            if( _.endsWith( snapShotrefNames[ refIndx ], 'Image' ) ) {
                                var imageName = _.lowerCase( imanFiles.displayValues[ refIndx ] );
                                if( _.startsWith( imageName, 'imagecapture' ) || _.startsWith( imageName, 'preview' ) ) {
                                    return imanFiles.dbValues[ refIndx ];
                                }
                            }
                        }
                    }
                    return null;
                };

                /**
                 * Thumbnail item was selected in the gallery list
                 *
                 * @param {ModelObject} item the selected item object to display in the viewer
                 * @param {ModelObject} refList the parent item ref_list of the selected item, to have the ref_file in case of CME_Report
                 */
                self.itemSelected = function( item, refList ) {
                    $scope.viewerData = null;

                    if( item.type === 'ItemRevision' || item.type === 'String' || item.type === 'FullText' || item.type === 'DirectModel' || item.type === 'Epw0WIDataset' ) {
                        _setViewerData( item, null, null, null );
                    } else {
                        var fileObjUid;
                        var shouldGetTicket = false;
                        var fileURL;
                        if( refList ) {
                            item.refList = refList;
                        }
                        if( item.type === 'Web Link' ) {
                            var dataFileObj = cdm.getObject( item.props.data_file.dbValue );
                            fileURL = dataFileObj.props.url.dbValues[ 0 ];
                            _setViewerData( item, null, fileURL, null );
                        } else if( item.type === 'CME_Report' ) {
                            var refNames = item.props.ref_names.value;
                            var refLength = refNames.length;
                            for( var refIndex = 0; refIndex < refLength; refIndex++ ) {
                                if( refNames[ refIndex ] === 'Primary' ) {
                                    fileObjUid = item.props.ref_list.value[ refIndex ];
                                    break;
                                }
                            }
                            shouldGetTicket = true;
                        } else if( item.type === 'SnapShotViewData' ) {
                            var fileUid = self.getSnapshotImageUid( item );
                            if( fileUid && fileUid !== null ) {
                                var promiseTicket = workinstrFmsSvc.getFileTickets( [ fileUid ] );
                                promiseTicket.then( function( fileTicketsResponse ) {
                                    var fileTicket = fileTicketsResponse[ fileUid ];
                                    if( fileTicket ) {
                                        fileURL = workinstrFmsSvc.getFileURL( fileTicket[ 0 ] );
                                    }
                                    _setViewerData( item, null, fileURL, autoLoad3D === 'true' ? 'workinstrSnapshotViewer' : 'Awp0ImageViewer' );
                                } );
                            } else {
                                _setViewerData( item, null, item.thumbnailURL, autoLoad3D === 'true' ? 'workinstrSnapshotViewer' : 'Awp0ImageViewer' );
                            }
                        } else {
                            if( item.props.ref_list ) {
                                fileObjUid = item.props.ref_list.value[ 0 ];
                            } else {
                                fileObjUid = item.uid;
                            }
                            shouldGetTicket = true;
                        }

                        if( shouldGetTicket === true ) {
                            var promise = workinstrFmsSvc.getFileTickets( [ fileObjUid ] );
                            promise.then( function( fileTicketsResponse ) {
                                var fileTicket = fileTicketsResponse[ fileObjUid ];
                                if( fileTicket ) {
                                    fileURL = workinstrFmsSvc.getFileURL( fileTicket[ 0 ] );
                                }
                                _setViewerData( item, fileTicket, fileURL, null );
                            } );
                        }
                    }
                };
            }
        ] );
