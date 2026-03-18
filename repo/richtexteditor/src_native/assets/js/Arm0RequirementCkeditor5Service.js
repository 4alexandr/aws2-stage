//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 CKEDITOR5
 */

/**
 * Module for the Ckeditor5 in Requirement Documentation Page
 *
 * @module js/Arm0RequirementCkeditor5Service
 */
import app from 'app';
import _appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import iconSvc from 'js/iconService';
import localeService from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';

import Arm0CkeditorConfigProvider from 'js/Arm0CkeditorConfigProvider';
import RMInsertImage from 'js/rmCkeInsertImage/rmInsertImage';
import RMImageSchemaExtender from 'js/rmCkeInsertImage/rmImageSchemaExtender';
import RMInsertOLE from 'js/rmCkeInsertOLE/rmInsertOLE';
import pageDown from 'js/rmPageDownHandler/pagedown';
import pageUp from 'js/rmPageUpHandler/pageup';
import RequirementWidget from 'js/rmCkeRequirementWidget/requirementWidget';
import RMCrossSelection from 'js/rmCkeCrossSelection/rmCkeCrossSelection';
import RMSpan from 'js/rmCkeSpanHandler/span';
import RMContentTable from 'js/rmCkeRMContentTable/rmContentTable';
import RMSelectionHandler from 'js/rmCkeSelectionHandler/rmSelectionHandler';
import Mathematics from 'js/rmCkeInsertEquation/math';
import RMSplitRequirement from 'js/rmCkeSplitRequirement/rmCkeSplitRequirement';
import RMReuseIntegration from 'js/rmCkeReuseToolIntegration/rmReuseIntegration';
import RMCrossReferenceLink from 'js/rmCkeCrossReferenceLink/crossReferenceLink';
import { ConvertDivAttributes, ConvertParaAttributes} from 'js/rmCkeAttributeHandler/rmAttributeHandler';
import Mention from 'js/rmCkeReuseToolIntegration/rmCkeMentionPlugin/mention';
import RMParamToReqHandler from 'js/rmCkeParamToReqHandler/rmParamToReqHandler';
var exports = {};

var _data;
var _cke = null;
var resizePromise;

var initCKEditorListener;
var resizeReqViewerOnCmdResizeListener;
var resizeReqViewerOnSplitterUpdateListener;
var resizeReqViewerOnSidePanelOpenListener;
var registerEventListenerToResizeEditor;
var resizeReqViewerOnInitCkeEventListener;

/**
 * Generate unique Id for Ck Editor
 *
 * @return {String} random id
 */
function _generateID() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return 'ckeditor-instance-' + Math.random().toString( 36 ).substr( 2, 9 );
}

/**
 * Sets the viewer height
 *
 * @return {Void}
 */
function setEditorHeight() {
    var height = 0;
    var element = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[ 0 ];
    if( element && element.getElementsByClassName( 'ck-editor__top' ).length > 0 && element.getElementsByClassName( 'ck-content' ).length > 0 ) {
        var top_ele = element.getElementsByClassName( 'ck-editor__top' )[0];
        var content_ele = element.getElementsByClassName( 'ck-content' )[ 0 ];
        var commandBarEle = document.getElementsByClassName( 'aw-requirements-commandBarIcon' );
        var commandBarExpanded = true;
        if( commandBarEle && commandBarEle.length > 0 && commandBarEle[0].offsetHeight <= 5 ) {
            commandBarExpanded = false; // If commandBar not expanded yet, skip 40 px for commandbar
        }
        var mainLayoutElement = _getMainLayoutPanel( content_ele );
        if( mainLayoutElement ) {
            height = mainLayoutElement.offsetHeight - top_ele.offsetHeight - 1 - 2; //1px is roud up ad client offset height in decimal. 2px is margin for cke content div
            height = !commandBarExpanded ? height - 40 : height;
        } else if( window.innerHeight > element.offsetTop ) {
            height = window.innerHeight - element.offsetTop - top_ele.offsetHeight - 12;
            height = !commandBarExpanded ? height - 40 : height;
            height = height > 300 ? height : 300;
        } else {
            // this means panel section of UV is drop downed and have to scroll to view it.
            height = window.innerHeight - 120; // 60px from header + 60px from footer
        }

        if( _cke && _cke.editing && _cke.editing.view && !_appCtxSvc.ctx.Arm0SingleRequirementWidePanelEditorActive ) {
            _cke.editing.view.change( writer => {
                writer.setStyle( 'height', height + 'px', _cke.editing.view.document.getRoot() );
            } );
        }
    }
}

/**
 * Find if given element is added inside the main panel, if yes return main panel element
 *
 * @param {Object} element - html dom element
 * @returns {Object} html dom element or null
 */
function _getMainLayoutPanel( element ) {
    if( !element ) {
        return null;
    }
    if( element.classList.contains( 'aw-layout-panelMain' ) ) {
        return element;
    }
    return _getMainLayoutPanel( element.parentElement );
}

/**
 * Implements promise for window resize event
 *
 * @return {Void}
 */
function _resizeTimer() {
    resizePromise = setTimeout( function() {
        if( self && setEditorHeight ) {
            setEditorHeight();
        }
    }, 0 );
}

/**
 * Implements handler for window resize event
 *
 * @return {Void}
 */
export let resizeEditor = function() {
    if( resizePromise ) {
        clearTimeout( resizePromise );
    }
    _resizeTimer();
};
/**
 * Return true if need to exclude insert ole command
 * @returns {Boolean} -
 */
function _isExcludeInsertOLECommand( editorProp ) {
    if( editorProp.dbValue && editorProp.dbValue.excludeInsertOLECommand === true ) {
        return true;
    }
    return false;
}
/**
 *
 */
function _getAdvanceCKEditorConfig() {
    var config = new Arm0CkeditorConfigProvider( _data.prop );
    config = config.getCkeditor5Config();
    config.extraPlugins = [ RMInsertImage, RMSpan, RequirementWidget, RMCrossSelection, ConvertDivAttributes, ConvertParaAttributes,
        RMReuseIntegration, Mention, RMSelectionHandler, RMCrossReferenceLink, RMContentTable, RMParamToReqHandler, RMImageSchemaExtender, RMSplitRequirement,
        Mathematics ];
    if( !_isExcludeInsertOLECommand( _data.prop ) ) {
        config.extraPlugins.push( RMInsertOLE );
    }
        var page_size = 0;
    if( _data.prop.preferences && _data.prop.preferences.AWC_req_viewer_page_size ) {
        page_size = parseInt( _data.prop.preferences.AWC_req_viewer_page_size[ 0 ] );
    }
    if( page_size > 0 ) {
        config.extraPlugins.push( pageUp );
        config.toolbar.push( 'pageUp' );
        config.extraPlugins.push( pageDown );
        config.toolbar.push( 'pageDown' );
    }
    return config;
}

/**
 *
 */
function _showCkEditor() {
    var ckEditorId = _data.prop.id;
    var _advanceNoDropConfig = _getAdvanceCKEditorConfig();
    var config = _advanceNoDropConfig;

    _createInstance( ckEditorId, config ).then(
        function( response ) {
            _cke = response;
            _cke.iconSvc = iconSvc;
            _cke.eventBus = eventBus;
            _cke.getBaseURL = browserUtils.getBaseURL();
            _cke.getBaseUrlPath = app.getBaseUrlPath();

            var resource = 'RichTextEditorCommandPanelsMessages';
            var localTextBundle = localeService.getLoadedText( resource );

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
            var addImgSrc = app.getBaseUrlPath() + '/image/' + 'cmdAdd24.svg';
            _cke.addIconImgElement = '<img class="aw-base-icon" src="' + addImgSrc + '" />';
            var removeImgSrc = app.getBaseUrlPath() + '/image/' + 'cmdRemove24.svg';
            _cke.removeIconImgElement = '<img class="aw-base-icon" src="' + removeImgSrc + '" />';
            var coSrc = app.getBaseUrlPath() + '/image/' + 'indicatorCheckedOut16.svg';
            _cke.checkoutIconImgElement = '<img class="aw-base-icon" src="' + coSrc + '" />';
            _cke.createTraceLinkTitle = localTextBundle.createTraceLinkTitle;

            registerCkeditorInstanceIsReady( ckEditorId, response );
        } );
}

/**
 *
 * @param {String} ckeditorid - id
 * @param {Object} config - json object
 */
function _createInstance( ckeditorid, config ) {
    var deferred = AwPromiseService.instance.defer();
    var editorDiv = document.querySelector( '#' + ckeditorid );
    if( !editorDiv ) {
        editorDiv = document.querySelector( '.aw-ckeditor-panel.aw-requirements-mainPanel' );
        editorDiv = editorDiv.firstElementChild;
    }

    CKEDITOR5.ClassicEditor.create( editorDiv, config ).then( editor => {
            exports.resizeEditor();
            editor.editing.view.change( writer => {
                writer.setAttribute( 'contenteditable', 'false', editor.editing.view.document.getRoot() );
            } );
            deferred.resolve( editor );
        } )
        .catch( error => {
            console.error( error.stack );
        } );

    return deferred.promise;
}

/**
 * Cleanup all watchers and instance members when this is destroyed.
 *
 * @return {Void}
 */
export let destroyCkeditor = function() {
    if( initCKEditorListener ) {
        eventBus.unsubscribe( initCKEditorListener );
    }
    if( _cke ) {
        eventBus.unsubscribe( resizeReqViewerOnCmdResizeListener );
        eventBus.unsubscribe( resizeReqViewerOnSplitterUpdateListener );
        eventBus.unsubscribe( resizeReqViewerOnSidePanelOpenListener );
        eventBus.unsubscribe( registerEventListenerToResizeEditor );
        eventBus.unsubscribe( resizeReqViewerOnInitCkeEventListener );
        _cke.destroy();
        ckeditorInstanceDestroyed();
    }
};

/**
 * Controller Init.
 *
 * @return {Void}
 */
export let initCkeditor = function( data ) {
    var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    if( !subPanelContext ) {
        return;
    }

    _data = data;
    data.prop = subPanelContext;
    if( !data.prop.id ) {
        data.prop.id = _generateID();
    }

    registerCkeditorInstanceNotReady( _data.prop.id );

    if( data.prop.showCKEditor ) {
        setTimeout( function() {
            _showCkEditor();
        }, 100 );
    } else {
        // Register event for initCKEditorEvent
        initCKEditorListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function() {
            eventBus.unsubscribe( initCKEditorListener );
            initCKEditorListener = undefined;
            _showCkEditor();
        }, data );
    }

    resizeReqViewerOnCmdResizeListener = eventBus.subscribe( 'commandBarResized', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnSplitterUpdateListener = eventBus.subscribe( 'aw-splitter-update', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnSidePanelOpenListener = eventBus.subscribe( 'appCtx.register', function( eventData ) {
        // Resize if user opens/close command panel
        if( eventData && eventData.name === 'activeToolsAndInfoCommand' ) {
            _resizeTimer();
        }
    } );

    registerEventListenerToResizeEditor = eventBus.subscribe( 'requirementsEditor.resizeEditor', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnInitCkeEventListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function() {
        _resizeTimer();
    } );
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
 * @param {Object} editorInstance - ckeditor instance
 */
function registerCkeditorInstanceIsReady( ckeditorId, editorInstance ) {
    _appCtxSvc.updateCtx( 'AWRequirementsEditor', { ready: true, id: ckeditorId, editor: editorInstance } );
}

/**
 * Update ctx, ckeditor is instance destroyed
 */
function ckeditorInstanceDestroyed() {
    _appCtxSvc.unRegisterCtx( 'AWRequirementsEditor' );
}

export default exports = {
    destroyCkeditor,
    initCkeditor,
    resizeEditor
};
/**
 * This factory creates a service for ckeditor5
 *
 * @memberof NgServices
 * @member Arm0RequirementCkeditor5Service
 * @param {Object} appCtxSvc app context service
 * @return {Object} service exports exports
 */
app.factory( 'Arm0RequirementCkeditor5Service', () => exports );
