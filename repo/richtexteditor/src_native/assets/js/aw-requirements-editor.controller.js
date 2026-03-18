// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global CKEDITOR */

/**
 * Defines controller
 *
 * @module js/aw-requirements-editor.controller
 */
import app from 'app';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import $ from 'jquery';
import 'js/appCtxService';
import 'js/iconService';
import 'js/localeService';
import Arm0CkeditorConfigProvider from 'js/Arm0CkeditorConfigProvider';
import 'js/Arm0CkeditorService';

'use strict';

/**
 * Defines awRequirementsEditor controller
 *
 * @member awRequirementsEditorController
 * @memberof NgControllers
 */
app.controller( 'awRequirementsEditorController', [
    'appCtxService',
    '$scope',
    '$element',
    'iconService',
    'localeService',
    '$timeout',
    function( _appCtxSvc, $scope, $element, iconSvc, localeSvc, $timeout ) {
        var self = this;
        var _cke = null;
        var _cke_height = 0;
        var UI_COLOR = '#FFFFFF';
        self.element = $element;

        /**
         * Generate unique Id for Ck Editor
         *
         * @return {Void}
         */
        self._generateID = function() {
            // Math.random should be unique because of its seeding algorithm.
            // Convert it to base 36 (numbers + letters), and grab the first 9 characters
            // after the decimal.
            return 'ckeditor-instance-' + Math.random().toString( 36 ).substr( 2, 9 );
        };

        /**
         * Sets the viewer height
         *
         * @return {Void}
         */
        self.setEditorHeight = function() {
            var height = 0;
            if( self.element ) {
                // this means panel section of UV is in the view

                    // first try to find if directive is added in main panel, if yes main panel will already have correct height
                    var mainLayoutElement = self._getMainLayoutPanel( self.element[0] );
                    if( mainLayoutElement ) {
                        height = mainLayoutElement.offsetHeight;
                    }else if( window.innerHeight > self.element.offset().top ) {
                    height = window.innerHeight - self.element.offset().top - 10;
                    height = height > 300 ? height : 300;
                } else {
                    // this means panel section of UV is drop downed and have to scroll to view it.
                    height = window.innerHeight - 120; // 60px from header + 60px from footer
                }
                if( _cke && _cke.document && _cke.document.getWindow() && _cke.document.getWindow().$ ) {
                    if( _cke_height !== height ) {
                        _cke.resize( _cke.width, height );
                        _cke_height = height;
                    }
                }
            }
        };

        /**
             * Find if given element is added inside the main panel, if yes return main panel element
             *
             * @param {Object} element - html dom element
             * @returns {Object} html dom element or null
             */
            self._getMainLayoutPanel = function( element ) {
                if( !element ) {
                    return null;
                }
                if( element.classList.contains( 'aw-layout-panelMain' ) ) {
                    return element;
                }
                return self._getMainLayoutPanel( element.parentElement );
            };

            /**
         * Implements promise for window resize event
         *
         * @return {Void}
         */
        self.resizeTimer = function() {
            self.resizePromise = $timeout( function() {
                if( self && self.setEditorHeight ) {
                    self.setEditorHeight();
                }
            }, 0 );
        };

        /**
         * Implements handler for window resize event
         *
         * @return {Void}
         */
        self.resizeEditor = function() {
            if( self.resizePromise ) {
                $timeout.cancel( self.resizePromise );
            }
            self.resizeTimer();
        };

        /**
         * Binds window resize event to resizeEditor handler function
         */
        $scope.$on( 'windowResize', self.resizeEditor );

        var resizeReqViewerOnCmdResizeListener = eventBus.subscribe( 'commandBarResized', function() {
            self.resizeTimer();
        } );

        var resizeReqViewerOnSplitterUpdateListener = eventBus.subscribe( 'aw-splitter-update', function() {
            self.resizeTimer();
        } );

        var resizeReqViewerOnSidePanelOpenListener = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            // Resize if user opens/close command panel
            if( eventData && eventData.name === 'activeToolsAndInfoCommand' ) {
                self.resizeTimer();
            }
        } );

        var registerEventListenerToResizeEditor = eventBus.subscribe( 'requirementsEditor.resizeEditor', function() {
            self.resizeTimer();
        } );

        self._isEditorForMultipleRequirements = function( ) {
            if( self.prop.dbValue && self.prop.dbValue.addNavigationCommands === true ) {
                return true;
            }
            return false;
        };

        self._showCkEditor = function() {
            /* globals CKEDITOR: false */
            var ckEditorId = self.element[0].getElementsByTagName( 'textarea' )[0].id;
            self.prop.id = ckEditorId;

            CKEDITOR.dtd.$removeEmpty.span = 0;

            var config = new Arm0CkeditorConfigProvider( self.prop );
            _cke = CKEDITOR.replace( ckEditorId, config.getCkeditor4Config() );

            _cke.iconSvc = iconSvc;
            _cke.eventBus = eventBus;
            _cke.getBaseURL = browserUtils.getBaseURL();
            _cke.getBaseUrlPath = app.getBaseUrlPath();

            var resource = 'RichTextEditorCommandPanelsMessages';
            var localTextBundle = localeSvc.getLoadedText( resource );

            _cke.changeTypeTitle = localTextBundle.changeTypeTitle;
            _cke.addTitle = localTextBundle.addTitle;
            _cke.removeTitle = localTextBundle.removeTitle;
            _cke.addSiblingKeyTitle = localTextBundle.addSiblingKeyTitle;
            _cke.addChildKeyTitle = localTextBundle.addChildKeyTitle;
            _cke.childTitle = localTextBundle.childTitle;
            _cke.siblingTitle = localTextBundle.siblingTitle;
            _cke.tocSettingsCmdTitle = localTextBundle.tocSettingsCmdTitle;
            _cke.update = localTextBundle.update;
            _cke.delete = localTextBundle.delete;
            _cke.addParameter = localTextBundle.addParameter;
            _cke.mapExistingParameter = localTextBundle.mapExistingParameter;
            var imgSrc = app.getBaseUrlPath() + '/image/' + 'cmdAdd24.svg';
            _cke.addIconImgElement = '<img class="aw-base-icon" src="' + imgSrc + '" />';
            var coSrc = app.getBaseUrlPath() + '/image/' + 'indicatorCheckedOut16.svg';
            _cke.checkoutIconImgElement = '<img class="aw-base-icon" src="' + coSrc + '" />';


            CKEDITOR.on( 'instanceReady', function( event ) {
                if( event && event.editor && event.editor.name === ckEditorId ) {
                    registerCkeditorInstanceIsReady( ckEditorId );

                    event.editor.on( 'contentDom', function( ev ) {
                        self.resizeEditor();
                    } );
                }
            }, ckEditorId );

            CKEDITOR.on( 'instanceLoaded', function( ev ) {
                ev.editor.on( 'contentDom', function( ev ) {
                    // get the body of the document in the cdeditor iframe
                    if( CKEDITOR.instances[ ckEditorId ] ) {
                        var editorDocumentBody = CKEDITOR.instances[ ckEditorId ].document.getBody();
                        // set the content editable attributes as false
                        if( self.prop.type === 'ADVANCED' || self.prop.type === 'ADVANCED_NODROP' ||
                            self.prop.type === 'MINI' ) {
                            editorDocumentBody.setAttribute( 'contenteditable', 'false' );
                        }
                        // Add css class for document like view
                        var existingClassName = editorDocumentBody.getAttribute( 'class' );
                        if( self.prop.a4SizeEditor ) {
                            editorDocumentBody.setAttribute( 'class', existingClassName +
                            ' aw-ckeditor-document aw-ckeditor-a4SizePaper' );
                        }else if( self.prop.isWidePanelEditor ) {
                            editorDocumentBody.setAttribute( 'class', existingClassName +
                            ' aw-ckeditor-document aw-ckeditor-documentWidePanelPaper' );
                        } else{
                        editorDocumentBody.setAttribute( 'class', existingClassName +
                            ' aw-ckeditor-document aw-ckeditor-documentPaper' );
                        }
                        var editable = ev.editor.editable();
                        if( editable ) {
                            editable.attachListener( editable.getDocument(), 'scroll', function() {
                                // Close tracelink tooltip, if any
                                if( _appCtxSvc.ctx.Arm0TraceLinkTooltipBalloonPopupVisible ) {
                                    eventBus.publish( 'Arm0TracelinkTooltip.closeExistingTracelinkTooltipWithoutHoverCheck' );
                                }
                                // Close action panel popup
                                if( _appCtxSvc.ctx.Arm0ShowActionPanelVisible ) {
                                    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
                                }
                            } );
                        }
                        var editorDocument = ev.editor.document;
                        if( editorDocument && editorDocument.$ && editorDocument.$.body ) {
                            editorDocument.$.body.addEventListener( 'click', function() {
                                // Close tracelink tootip, if any
                                if( _appCtxSvc.ctx.Arm0TraceLinkTooltipBalloonPopupVisible ) {
                                    eventBus.publish( 'Arm0TracelinkTooltip.closeExistingTracelinkTooltipWithoutHoverCheck' );
                                }

                                // Close action panel popup
                                if( _appCtxSvc.ctx.Arm0ShowActionPanelVisible ) {
                                    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
                                }
                            } );
                        }
                        // Handle lov outside ACE
                        if( !self._isEditorForMultipleRequirements() && editorDocument && editorDocument.$ && editorDocument.$.body ) {
                            handleCkeditorLOVs( editorDocument.$.body );
                        }

                        // Place the cursor in first editable element outside ACE
                        if( !self._isEditorForMultipleRequirements() ) {
                            var editor = CKEDITOR.instances[ ckEditorId ];
                            editor.focus();
                            var body = editor.document.getBody();
                            var editableElement = body.$.querySelectorAll( '[contenteditable="true"]' );
                            if( editableElement && editableElement.length > 0 ) {
                                setTimeout( function() {
                                    editableElement[ 0 ].focus();
                                    var range = editor.createRange();
                                    range.moveToPosition( new CKEDITOR.dom.element( editableElement[ 0 ] ), CKEDITOR.POSITION_AFTER_START );
                                }, 0 );
                            }
                        }
                    }

                    // LCS-228664 - Handle mouse move on iframe which is causing an issue while moving splitter
                    // Get ckeditor iframe
                    var ckeditorFrame = document.getElementsByClassName( 'cke_wysiwyg_frame' );
                    if( ckeditorFrame && ckeditorFrame.length > 0 ) {
                        handleIframeMouseMove( ckeditorFrame[ 0 ] );
                    }

                    // Target only IE browsers
                    if( CKEDITOR.env.ie ) {
                        CKEDITOR.instances[ ckEditorId ].on( 'insertElement', function( eventInsertEle ) {
                            if( eventInsertEle.data && eventInsertEle.data.getName().toUpperCase() === 'SPAN' && eventInsertEle.data.$ && eventInsertEle.data.$.firstElementChild && eventInsertEle.data.$.firstElementChild.classList.contains( eventInsertEle.editor.config.mathJaxClass ) ) {
                                // Change event is not getting fired on insert equation
                                eventInsertEle.editor.fire( 'change' );
                            }
                        } );
                    }
                } );

                ev.editor.setKeystroke( CKEDITOR.CTRL + 13, 'addSiblingRequirementWidget' );
                ev.editor.setKeystroke( CKEDITOR.SHIFT + 13, 'addChildRequirementWidget' );
            } );
        };

        /**
         * Attach a mousemove listener to iframe
         * @param {Object} iframe - ckeditor iframe
         */
        function handleIframeMouseMove( iframe ) {
            // Save any previous onmousemove handler
            var existingOnMouseMove = iframe.contentWindow.onmousemove;

            // Attach a new onmousemove listener
            iframe.contentWindow.onmousemove = function( e ) {
                // Fire any existing onmousemove listener
                if( existingOnMouseMove ) {
                    existingOnMouseMove( e );
                }

                // Create a new event for the this window
                var evt = document.createEvent( 'MouseEvents' );

                // Required to offset the mouse move
                var boundingClientRect = iframe.getBoundingClientRect();

                // Initialize the event, copying exiting event values to the new one
                evt.initMouseEvent(
                    'mousemove',
                    true, // bubbles
                    false, // not cancelable
                    window,
                    e.detail,
                    e.screenX,
                    e.screenY,
                    e.clientX + boundingClientRect.left,
                    e.clientY + boundingClientRect.top,
                    e.ctrlKey,
                    e.altKey,
                    e.shiftKey,
                    e.metaKey,
                    e.button,
                    null // no related element
                );

                // Dispatch the mousemove event on the iframe element
                iframe.dispatchEvent( evt );
            };
        }

        var initCKEditorListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function( eventData ) {
            eventBus.unsubscribe( initCKEditorListener );
            if( eventData && eventData.pageSize && self.prop.dbValue ) {
                self.prop.dbValue.pageSize = parseInt( eventData.pageSize );
            }
            initCKEditorListener = undefined;

            if( self && self.prop ) {
                self._showCkEditor();
            }
        } );

        /**
         * Handles LOV events from CKEditor
         *
         * @param {Object} editorBody - ckeditor document body element
         */
        function handleCkeditorLOVs( editorBody ) {
            var lovSpanElements = editorBody.getElementsByClassName( 'aw-requirement-lovProperties' );
            for( var index = 0; index < lovSpanElements.length; index++ ) {
                var span = lovSpanElements[ index ];
                span.removeAttribute( 'contenteditable' );
                var lovElements = span.getElementsByTagName( 'Select' );
                if( lovElements && lovElements.length > 0 ) {
                    var lov = lovElements[ 0 ];
                    if( lov.hasAttribute( 'multiple' ) ) {
                        lov.onchange = function( evt ) {
                            var selectedOptionsObject = this.selectedOptions;
                            var selectedOptions = Object.values( selectedOptionsObject ); //convert to array
                            for( var i = 0; i < this.options.length; i++ ) {
                                var option = this.options[ i ];
                                if( selectedOptions.indexOf( option ) === -1 ) {
                                    option.removeAttribute( 'selected' );
                                } else {
                                    option.setAttribute( 'selected', 'selected' );
                                }
                            }
                        };
                    } else {
                        lov.onchange = function( evt ) {
                            var selectedOption = this.options[ this.selectedIndex ];
                            selectedOption.setAttribute( 'selected', 'selected' );
                            for( var i = 0; i < this.options.length; i++ ) {
                                var option = this.options[ i ];
                                if( option !== selectedOption ) {
                                    option.removeAttribute( 'selected' );
                                }
                            }
                        };
                    }
                }
            }
        }

        /**
         * Cleanup all watchers and instance members when this is destroyed.
         *
         * @return {Void}
         */
        self.destroy = function() {
            if( initCKEditorListener ) {
                eventBus.unsubscribe( initCKEditorListener );
            }
            if( _cke ) {
                eventBus.unsubscribe( resizeReqViewerOnCmdResizeListener );
                eventBus.unsubscribe( resizeReqViewerOnSplitterUpdateListener );
                eventBus.unsubscribe( resizeReqViewerOnSidePanelOpenListener );
                eventBus.unsubscribe( registerEventListenerToResizeEditor );
                _cke.destroy();
                ckeditorInstanceDestroyed();
            }
        };
        /**
         * Controller Init.
         *
         * @return {Void}
         */
        self.init = function() {
            if( !self.prop.id ) {
                self.prop.id = self._generateID();
            }
            registerCkeditorInstanceNotReady( self.prop.id );
            if( self.prop.showCKEditor ) {
                setTimeout( function() {
                    self._showCkEditor();
                }, 100 );
            }
        };

        /**
         * Update ctx, ckeditor is getting instantiated and it is not yet ready
         *
         * @param {String} ckeditorId - ckeditor instance id
         */
        function registerCkeditorInstanceNotReady( ckeditorId ) {
            _appCtxSvc.registerCtx( 'AWRequirementsEditor', { ready: false, id: ckeditorId } );
        }

        /**
         * Update ctx, ckeditor is instantiated and it is ready
         *
         * @param {String} ckeditorId - ckeditor instance id
         */
        function registerCkeditorInstanceIsReady( ckeditorId ) {
            _appCtxSvc.updateCtx( 'AWRequirementsEditor', { ready: true, id: ckeditorId } );
        }

        /**
         * Update ctx, ckeditor is instance destroyed
         */
        function ckeditorInstanceDestroyed() {
            _appCtxSvc.unRegisterCtx( 'AWRequirementsEditor' );
        }
    }
] );
