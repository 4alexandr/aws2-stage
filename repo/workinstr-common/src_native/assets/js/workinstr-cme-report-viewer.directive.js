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
 * Directive to show native CME_report viewer
 *
 * @module js/workinstr-cme-report-viewer.directive
 */
import * as app from 'app';
import $ from 'jquery';
import 'js/aw-universal-viewer.controller';
import 'soa/kernel/clientDataModel';

'use strict';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native CME_report viewer directive
 *
 * @example <workinstr-cme-report-viewer data="cme_reportDataset">...</workinstr-cme-report-viewer>
 *
 * @param {Object} $http - $http service
 * @param {Object} $sce - $sce service
 * @param {Object} $timeout - $timeout service
 * @param {Object} cdm - soa_kernel_clientDataModel

 * @member workinstr-cme-report-viewer
 * @memberof NgElementDirectives
 *
 * @return {Object} workinstrCmeReportViewer directive
 */
app.directive( 'workinstrCmeReportViewer', [ '$http', '$sce', '$timeout', 'soa_kernel_clientDataModel', function( $http, $sce, $timeout, cdm ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/workinstr-cme-report-viewer.directive.html',
        // Isolate the scope
        scope: {
            data: '='
        },
        link: function( $scope, $element, attrs, controller ) {
            /**
             * Qualifier for current controller
             */
            $scope.whoAmI = 'workinstrCmeReportViewer';

            /**
             * Initialize _element
             */
            _element = $element;

            // Populate the iframe with CME_report content
            var promise = controller.initViewer( _element );
            promise.then( function() {
                $http.get( $scope.fileUrl ).then( function( response ) {
                    $scope.reportContent = $sce.trustAsHtml( response.data );
                    $timeout(
                        function() {
                            // Replace the href links in CME_report
                            replaceHrefs();
                        }, 5 );
                } );
            } );

            /**
             * Replace the href links in CME_report
             */
            var replaceHrefs = function() {
                var item = $scope.data.datasetData;
                var refList = item.props.ref_list;
                if( !refList && item.refList ) {
                    refList = item.refList;
                }
                if( refList ) {
                    var refFilesList = refList.uiValues;
                    var refFileLength = refFilesList.length;

                    var cmeReportViewers = $( '#workinstr-cme-report-viewer' );
                    var aElements = cmeReportViewers.find( 'a' );
                    var aElementsLen = aElements.length;
                    for( var aElemIndx = 0; aElemIndx < aElementsLen; aElemIndx++ ) {
                        var currHrefElem = aElements[ aElemIndx ];
                        var hrefStr = $( currHrefElem ).attr( 'href' );
                        for( var refIndex = 0; refIndex < refFileLength; refIndex++ ) {
                            var refFileName = refFilesList[ refIndex ];
                            if( hrefStr && hrefStr.indexOf( refFileName ) > -1 ) {
                                $( currHrefElem ).removeAttr( 'href' );
                                var fileObjUid = refList.value[ refIndex ];
                                $( currHrefElem ).data( 'uid', fileObjUid );
                                $( currHrefElem ).click( function() {
                                    var objUid = [ $( this ).data( 'uid' ) ];
                                    var selectedObj = cdm.getObject( objUid );

                                    $scope.data.myGalleryPanel.itemSelected( selectedObj, refList );
                                } );
                                break;
                            }
                        }
                    }
                }
            };

            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             *
             * @return {Void}
             */
            $scope.$on( '$destroy', function() {
                // Cleanup
                $element = null;
            } );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
