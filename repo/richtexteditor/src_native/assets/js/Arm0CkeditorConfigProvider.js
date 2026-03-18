// Copyright 2020 Siemens Product Lifecycle Management Software Inc.
/* eslint-disable class-methods-use-this, no-empty-function */

import app from 'app';
import { Arm0CkeditorConfigProviderBase } from 'js/Arm0CkeditorService';
import { getAutoCompleteItems } from 'js/rmCkeReuseToolIntegration/patternAssistHandler';
import localeSvc from 'js/localeService';

/**
 * Ckeditor Configuration provider
 * @module js/Arm0CkeditorConfigProvider
 */
export default class Arm0CkeditorConfigProvider extends Arm0CkeditorConfigProviderBase {
    /**
     *
     * @param {Object} props - editor properties object
     */
    constructor( prop ) {
        super();
        this.editorProp = prop;
    }
    getCkeditor4Config() {
        if( this.editorProp.type === 'MINI' ) {
            return _getMiniCKEditor4Config( this.editorProp );
        }
        return _getAdvanceCKEditor4Config( this.editorProp );
    }
    getCkeditor5Config() {
        if( this.editorProp.type === 'MINI' ) {
            return _getMiniCKEditor5Config( this.editorProp );
        }
        return _getAdvanceCKEditor5Config( this.editorProp );
    }
}

var UI_COLOR = '#FFFFFF';

/**
 * Return current local
 * @returns {String} locale name
 */
function _getLocaleName() {
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
}

/**
 * Return css file path
 * @returns {String} -
 */
function _getCSSFilePath() {
    return app.getBaseUrlPath() + '/lib/ckeditor4/document_view.css';
}

/**
 * Return mathjax file path
 * @returns {String} -
 */
function _getMathJaxFilePath() {
    return app.getBaseUrlPath() + '/lib/mathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
}

/**
 * Return true if editor supports for multiple reuirements for authoring
 * @returns {Boolean} -
 */
function _isEditorForMultipleRequirements( editorProp ) {
    if( editorProp.dbValue && editorProp.dbValue.addNavigationCommands === true ) {
        return true;
    }
    return false;
}

/**
 * Return truen of need to exclude insert ole command
 * @returns {Boolean} -
 */
function _isExcludeInsertOLECommand( editorProp ) {
    if( editorProp.dbValue && editorProp.dbValue.excludeInsertOLECommand === true ) {
        return true;
    }
    return false;
}

/**
 * Return list extra plugins
 * @returns {String} -
 */
function _getExtraPlugin( editorProp ) {
    var extraPluginsString = 'clientImage,tableresize,stylesheetparser,mathjax,rmImageHandler,mathml,rmPreventDelete,rmPasteImage,rmDisableCommands,rmSelectionHandler,rmContentTable,rmLinkHandler,rmFixTableSize';

    if( !_isExcludeInsertOLECommand( editorProp ) ) {
        extraPluginsString += ',rmOleHandler';
    }
    if( _isEditorForMultipleRequirements( editorProp ) ) {
        extraPluginsString += ',requirementWidget,rat,rmCrossReferenceLink,paramToReq';
        if( editorProp.dbValue &&  editorProp.dbValue.pageSize > 0 ) {
            extraPluginsString += ',rmPageUpHandler,rmPageDownHandler';
        }
    }
    return extraPluginsString;
}

/**
 * Return config for mini ckeditor for info panel
 * @param {Object} editorProp - editor property object
 * @returns {Object} -
 */
function _getMiniCKEditor4Config( editorProp ) {
    var localeName = _getLocaleName();
    var extraPluginsString = _getExtraPlugin( editorProp );
    var mathJaxJSFilePath = _getMathJaxFilePath();
    var cssFilePath = _getCSSFilePath();
    var buttonsToRemove = 'Smiley,Strike,Subscript,Superscript,RemoveFormat,Blockquote,CreateDiv,JustifyLeft,JustifyCenter,';
    buttonsToRemove += 'JustifyRight,JustifyBlock,BidiLtr,BidiRtl,Language,Anchor,Flash,';
    buttonsToRemove += 'HorizontalRule,SpecialChar,PageBreak,Smiley,Iframe,Styles,Format,ShowBlocks,Image';

    return {
        extraAllowedContent: 'img video p source[*]{*}(*)',
        extraPlugins: extraPluginsString,
        copyFormatting_disallowRules: 'div',
        language: localeName,
        uiColor: UI_COLOR,
        skin: 'moono_cus',
        removePlugins: 'clientImage,flash,save,iframe,pagebreak,horizontalrule,elementspath,div,scayt,wsc,magicline',
        toolbarCanCollapse: true,
        resize_enabled: false,
        toolbarGroups: [ {
            name: 'basicstyles',
            groups: [ 'basicstyles', 'cleanup' ]
        }, {
            name: 'paragraph',
            groups: [ 'list', 'indent' ]
        }, {
            name: 'insert',
            groups: [ 'table', 'image' ]
        }, {
            name: 'others'
        }, {
            name: 'styles'
        }, {
            name: 'colors'
        } ],
        removeButtons: buttonsToRemove,
        linkShowTargetTab: false,
        contentsCss: cssFilePath,
        mathJaxClass: 'equation',
        mathJaxLib: mathJaxJSFilePath
    };
}

/**
 * Return config for advanced ckeditor
 * @param {Object} editorProp - editor property object
 * @returns {Object} -
 */
function _getAdvanceCKEditor4Config( editorProp ) {
    var localeName = _getLocaleName();
    var extraPluginsString = _getExtraPlugin( editorProp );
    var mathJaxJSFilePath = _getMathJaxFilePath();
    var cssFilePath = _getCSSFilePath();

    return {
        extraAllowedContent: 'img video p div table td tr style source[*]{*}(*)',
        extraPlugins: extraPluginsString,
        copyFormatting_disallowRules: 'div',
        language: localeName,
        uiColor: UI_COLOR,
        skin: 'moono_cus',
        removePlugins: 'flash,save,iframe,scayt,wsc,clientImage,magicline,showblocks,newpage,div,Anchor,selectall,elementspath,showborders',
        toolbarCanCollapse: true,
        resize_enabled: false,
        toolbarGroups: [ {
                name: 'clipboard',
                groups: [ 'clipboard', 'undo' ]
            },
            {
                name: 'editing',
                groups: [ 'find', 'selection', 'spellchecker' ]
            },
            {
                name: 'links'
            },
            {
                name: 'others'
            },
            {
                name: 'insert',
                groups: [ 'image', 'clientImage', 'table', 'horizontalrule', 'smiley',
                    'specialchar', 'pagebreak'
                ]
            }, {
                name: 'tools'
            }, {
                name: 'basicstyles',
                groups: [ 'basicstyles', 'cleanup' ]
            }, {
                name: 'paragraph',
                groups: [ 'list', 'indent', 'blocks', 'align' ]
            }, {
                name: 'styles'
            }, {
                name: 'colors'
            }, {
                name: 'create'
                },
                {
                    name: 'rat'
            },
            {
                name: 'navigation',
                groups: [ 'navigation' ]
            }
        ],
        removeButtons: 'Image,Source,PageBreak,Smiley,HorizontalRule',
        linkShowTargetTab: false,
        contentsCss: cssFilePath,
        mathJaxClass: 'equation',
        mathJaxLib: mathJaxJSFilePath,
        height: '800px'
    };
}

/**
 * Return config for mini ckeditor for info panel
 * @param {Object} editorProp - editor property object
 * @returns {Object} -
 */
function _getMiniCKEditor5Config( editorProp ) {
    var localeName = _getLocaleName();
    return {
        toolbar: [
             'fontFamily',
             'fontSize',
             '|',
             'bold',
             'italic',
             'strikethrough',
             'link',
             'bulletedList',
             'numberedList',
             '|',
             'indent',
             'outdent',
             'alignment',
             '|',
             'insertTable',
             '|',
             'subscript',
             'superscript',
             '|',
             'fontBackgroundColor',
             'fontColor',
             '|',
             'undo',
             'redo',
             '|',
             // Custom commands
             'rmInsertImage',
             'rmInsertOLE'
         ],
         image: {
             toolbar: [
                 'imageTextAlternative',
                 'imageStyle:full',
                 'imageStyle:side'
             ]
         },
         table: {
             contentToolbar: [
                 'tableColumn',
                 'tableRow',
                 'mergeTableCells',
                 'tableCellProperties',
                 'tableProperties'
             ]
         },
         fontSize: {
            options: [ 'default', 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72 ],
            supportAllValues: true
        },
         language: localeName,
         mention: {
            feeds: [
                {
                    marker: ' ',
                    feed: getAutoCompleteItems
                }
            ]
        },
        fontFamily: {
            supportAllValues: true
        }
     };
}

/**
 * Return config for advanced ckeditor
 * @param {Object} editorProp - editor property object
 * @returns {Object} -
 */
function _getAdvanceCKEditor5Config( editorProp ) {
    var localeName = _getLocaleName();
    return {
        toolbar: [
             'fontFamily',
             'fontSize',
             '|',
             'bold',
             'italic',
             'strikethrough',
             'link',
             'bulletedList',
             'numberedList',
             '|',
             'indent',
             'outdent',
             'alignment',
             '|',
             'insertTable',
             '|',
             'subscript',
             'superscript',
             '|',
             'fontBackgroundColor',
             'fontColor',
             '|',
             'undo',
             'redo',
             '|',
             // Custom commands
             'rmInsertImage',
             'rmInsertOLE',
             'math'
         ],
         image: {
             toolbar: [
                 'imageTextAlternative',
                 'imageStyle:alignLeft',
                 'imageStyle:alignCenter',
                 'imageStyle:alignRight'
                ],
                styles: [
                   'alignLeft',
                   'alignCenter',
                   'alignRight'
               ]
         },
         table: {
             contentToolbar: [
                 'tableColumn',
                 'tableRow',
                 'mergeTableCells',
                 'tableCellProperties',
                 'tableProperties'
             ]
         },
         fontSize: {
            options: [ 'default', 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72 ],
            supportAllValues: true
        },
        fontFamily: {
            supportAllValues: true
        },
        language: localeName,
        math: {
            engine: 'mathjax', // or katex or function. E.g. (equation, element, display) => { ... }
            outputType: 'span', // or script
            forceOutputType: false, // forces output to use outputType
            enablePreview: true // Enable preview view
        },
         mention: {
            feeds: [
                {
                    marker: ' ',
                    feed: getAutoCompleteItems
                }
            ]
        }
};
}
