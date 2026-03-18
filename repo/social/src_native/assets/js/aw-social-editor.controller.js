// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 CKEDITOR
 */

/**
 * Defines controller
 *
 * @module js/aw-social-editor.controller
 */
import app from 'app';
import 'js/S2clSocialService';
import 'js/localeService';
import awEditorService from 'js/awRichTextEditorService';

'use strict';

/**
 * Defines awSocialEditor controller
 *
 * @member awSocialEditorController
 * @memberof NgControllers
 */
app.controller( 'awSocialEditorController',
    [ '$scope', 'S2clSocialService', 'notyService', 'localeService',
        function( $scope, socialSrv, notifySvc, localeSvc ) {
            var self = this;
            var _isTextValid = false;

            self._getLocaleName = function() {
                var currentLocale = localeSvc.getLocale();
                var localeName = '';

                if( currentLocale !== null && currentLocale !== '' ) {
                    localeName = currentLocale.substring( 0, 2 );
                }

                // Normally first 2 characters, but we have 2 exceptions. And yes there is a dash and not an underscore.
                if( currentLocale === 'pt_BR' ) {
                    localeName = 'pt-br';
                } else if( currentLocale === 'zh_CN' ) {
                    localeName = 'zh-cn';
                }

                return localeName;
            };

            self._showCkEditor = function() {
                var localeName = self._getLocaleName();

                /* globals CKEDITOR: false */
                awEditorService.create( 'ckeditor', {
                    toolbar: [
                        'Bold', 'Italic', '|',
                        'NumberedList', 'BulletedList', '|',
                        'Link', 'Unlink', '|',
                        'ImageUpload', 'Smiley', '|',
                        'FontFamily', 'FontSize', '|',
                        'FontColor', 'FontBackgroundColor', '|'
                    ],
                    linkShowTargetTab: false,
                    toolbarCanCollapse: false,
                    skin: 'moono_cus',
                    height: 350,
                    language: localeName,
                    extraPlugins: [ 'clientImage' ],
                    removePlugins: [ 'resize', 'flash', 'save', 'iframe', 'pagebreak', 'horizontalrule', 'elementspath', 'div', 'scayt', 'wsc' ],
                    allowedContent: 'p img div span br strong em table tr td[*]{*}(*)'
                } ).then( cke => {
                    cke.on( 'change', function() {
                        var tmp = cke.getText().trim();

                        if ( tmp.length > 0 ) {
                            _isTextValid = true;
                        } else {
                            _isTextValid = false;
                        }
                        socialSrv.setIsTextValid( _isTextValid );
                        socialSrv.setRichText( cke.getData() );
                        socialSrv.setPlainText( cke.getText() );
                        $scope.$apply();
                    } );
                    cke.on( 'notificationShow', function( evt ) {
                        notifySvc.showInfo( evt.data.notification.message );
                        evt.cancel();
                    } );
                } );
            };

            if ( 'CKEDITOR' in window ) {
                // Add override CSS styles for inside editable contents area for iPad.
                CKEDITOR.addCss( '@media only screen and (min-device-width : 768px) and (max-device-width : 1024px) { html { background-color: #eeeeee; }}' );
            }

            // Make sure data is cleared
            socialSrv.setIsTextValid( _isTextValid );
            socialSrv.setRichText( '' );
            socialSrv.setPlainText( '' );

            self._showCkEditor();
        }
    ] );
