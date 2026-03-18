/* eslint-disable  max-lines */
/* @<COPYRIGHT>@
==================================================
Copyright 2020.
Siemens Product Lifecycle Management Software Inc.
All Rights Reserved.
==================================================
@<COPYRIGHT>@ */

/*global
  CKEDITOR5
 */
/**
 * @module js/ckEditor5Utils
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import browserUtils from 'js/browserUtils';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import reqACEUtils from 'js/requirementsACEUtils';
import ckeditorOperations from 'js/ckeditorOperations';
import { attachPatternAssistToggle } from 'js/rmCkeReuseToolIntegration/reuseToolIntegrationUtil';
import markupViewModel from 'js/Arm0MarkupViewModel';
import arm0MarkupText from 'js/Arm0Ck5CommentsHandler';
import _ from 'lodash';
import reqUtils from 'js/requirementsUtils';
import markupService from 'js/Arm0MarkupService';
import markupRequirement from 'js/MarkupRequirement';
import markupUtil from 'js/Arm0MarkupUtil';
import Arm0DocumentationUtil from 'js/Arm0DocumentationUtil';

'use strict';

var exports = {};

var objectInitialContentsMap = {};
var objectInitialTitleMap = {};
var origCkeditorContentMap = {};
var commentIdVsStartPath = new Map();
var commentIdVsEndPath = new Map();
var processedComments = {};
var halfProcessedComments = {};

// totat RCH parsed in a req Widget
var totalRCHParsed = 0;
// totat Ch parsed for a entire parent node
var totalCharParsed = 0;
// last text parent that was traversed
var lastTextParent;
// elements to ignore for creating model path
var noOfElementToIgnore = 0;
var dirtyFlagforCk5 = false;

// MarkupText instance
let _markupTextInstance = arm0MarkupText;

/**
 * Set CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @param {Object} ctx - context object
 */
export let setCKEditorContent = function( id, content, ctx ) {
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor && ctx.AWRequirementsEditor.editor.setData ) {
        ctx.AWRequirementsEditor.editor.setData( content );
    }
};

/**
 * Set data in ckeditor 5
 *
 *  @param {String} content - context object
 *  @param {Object} ctx - context object
 */
var _setCkeditorData = function( content, ctx ) {
    eventBus.publish( 'progress.start' );
    appCtxSvc.updateCtx( 'requirementEditorSetData', true );
    ctx.AWRequirementsEditor.editor.setData( content );
    exports.resetUndo( ctx.AWRequirementsEditor.id, ctx );
    appCtxSvc.updateCtx( 'requirementEditorSetData', false );
    eventBus.publish( 'progress.end' );
};

/**
 * Update original content map
 *
 *  @param {Object} htmlContent - html Content
 */
export let updateOriginalContentsMap = function( reqContent ) {
    var origHtmlReq = reqContent.html;
    var contentElement = document.createElement( 'div' );
    contentElement.innerHTML = origHtmlReq;

    _setOriginalReqHtml( origHtmlReq );

    var requirementDivElements = contentElement.getElementsByClassName( 'requirement' );
    for ( var ind = 0; ind < requirementDivElements.length; ind++ ) {
        var requirementDiv = requirementDivElements[ind];
        var idAttribute = requirementDiv.getAttribute( 'id' );
        var reqContentEle = _getRequirementContent( requirementDiv );
        var contentText = reqContentEle.innerHTML;
        objectInitialContentsMap[idAttribute] = contentText;

        var reqTitle = _getTitle( requirementDiv );
        objectInitialTitleMap[idAttribute] = reqTitle;
    }
};
/**
 * Set initial data in map
 *
 *  @param {Object} ctx - context object
 */
var _setobjectInitialContentsMap = function( ctx ) {
    setTimeout( function() {
        var documentData = ctx.AWRequirementsEditor.editor.getData();
        var doc = document.createElement( 'div' );
        doc.innerHTML = documentData;
        var allwidgets = doc.getElementsByClassName( 'requirement' );
        for ( var index = 0; index < allwidgets.length; index++ ) {
            var domElement = allwidgets[index];
            var idAttribute = domElement.getAttribute( 'id' );
            var reqContentEle = _getRequirementContent( domElement );
            var contentText = reqContentEle.innerHTML;
            objectInitialContentsMap[idAttribute] = contentText;

            var reqTitle = _getTitle( domElement );
            objectInitialTitleMap[idAttribute] = reqTitle;
        }
    }, 0 );
};

/**
 * Set CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @param {Object} ctx - context object
 * @return {String} Return when content gets loaded in ckeditor
 */
export let setCKEditorContentAsync = function( id, content, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.registerCtx( 'requirementEditorSetData', false );
        _setCkeditorData( content, ctx );
        eventBus.publish( 'ckeditor.postLoadSubscription' );

        origCkeditorContentMap = {};
        objectInitialContentsMap = {};
        objectInitialTitleMap = {};
        _setOriginalReqHtml( content );
        _setobjectInitialContentsMap( ctx );

        deferred.resolve();
    } else {
        deferred.reject();
    }
    return deferred.promise;
};

/**
 * Get CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @return content of CKEditor
 */
export let getCKEditorContent = function( id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor && appCtxSvc.ctx.AWRequirementsEditor.editor.getData ) {
        // whenever editor content is empty, an empty string will be returned without outer divs, with default trim:'empty'
        return appCtxSvc.ctx.AWRequirementsEditor.editor.getData( { trim: 'none' } );
    }
};

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @return {Boolean} isDirty
 *
 */
export let checkCKEditorDirty = function( id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor && appCtxSvc.ctx.AWRequirementsEditor.editor.checkDirty ) {
        return appCtxSvc.ctx.AWRequirementsEditor.editor.checkDirty();
    }
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor
        && ( appCtxSvc.ctx.Arm0SingleRequirementWidePanelEditorActive || appCtxSvc.ctx.isRMDocumentationTabActive ) ) {
       return dirtyFlagforCk5;
   }
    // TODO
    return true;
};

/**
 * Set the CKEditor content changed / Dirty.
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @param {String} flagForClose - dirty flag
 */
export let setCkeditorDirtyFlag = function( id, ctx, flagForClose ) {
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        ctx.AWRequirementsEditor.editor.model.document.on( 'change:data', ( eventInfo, batch ) => {
            if ( ctx && !ctx.requirementEditorSetData && !appCtxSvc.ctx.AWRequirementsEditor.editor.ignoreDataChangeEvent ) {
                ctx.AWRequirementsEditor.dirtyFlagforCkEditor  = true;
                dirtyFlagforCk5 = true;
            }
        } );
    }
    if ( flagForClose === 'close' ) {
        dirtyFlagforCk5 = false;
        ctx.AWRequirementsEditor.dirtyFlagforCkEditor  = false;
    }
};


/**
 * Method to set thechange evenet listner on all markers.
 * @param {Marker} marker the marker on which event to be added
 */
export let setMarkerChangeEveneListener = function( marker ) {
    if( marker ) {
        marker.on( 'change:range', function( eventInfo, oldRange, data ) {
            var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
            var editor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
            if( data.deletionPosition ) {
                var deletedPath = data.deletionPosition.path;
                var liveRangePath = oldRange.start.path;
                var isEqual = isEqualPath( deletedPath, liveRangePath );
                var isDeleted = isPathDeleted( deletedPath, liveRangePath );
                if( isEqual || isDeleted ) {
                    var marker = getCommentMarker( eventInfo );
                    var markup = markupViewModel.getMarkupFromId( marker.name );
                    markupViewModel.deleteMarkup( markup, true );
                    markupService.updateMarkupList( true );
                    updateDeletedCommentsMap( marker.name, markup );
                    editor.model.change( ( writer ) => {
                            try {
                                writer.removeMarker( marker );
                            } catch ( error ) {
                                //do nothihing. marker not present
                            }
                    } );
                }
            } else{
                var marker = getCommentMarker( eventInfo );
                var start = marker._liveRange.start.path;
                var end = marker._liveRange.end.path;
                var isEqual = isEqualPath( start, end );
                if( isEqual ) {
                    var markup = markupViewModel.getMarkupFromId( marker.name );
                    markupViewModel.deleteMarkup( markup, true );
                    markupService.updateMarkupList( true );
                    updateDeletedCommentsMap( marker.name, markup );
                    editor.model.change( ( writer ) => {
                        try {
                            writer.removeMarker( marker );
                        } catch ( error ) {
                            //do nothihing. marker not present
                        }
                    } );
                }
            }
        } );
    }
};

/**
 * Method to add entry in deleted markups map
 * @param {String} id the is of the markup
 * @param {Object} markup the markup oject
 */
function updateDeletedCommentsMap( id, markup ) {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx && markupCtx.deletedMarkups ) {
        appCtxSvc.ctx.reqMarkupCtx.deletedMarkups.set( id, markup );
    } else if( markupCtx && !markupCtx.deletedMarkups ) {
        var deletedMarkpsMap = new Map();
        deletedMarkpsMap.set( id, markup );
        appCtxSvc.ctx.reqMarkupCtx.deletedMarkups = deletedMarkpsMap;
    }
}

/**
 * Method to get Marker from eventInfo
 */
function getCommentMarker( eventInfo ) {
    var paths = eventInfo.path;
    for( var i = 0; i < paths.length; i++ ) {
        var path = paths[i];
        if( path.name && path.name.startsWith( 'RM::Markup' ) ) {
            return path;
        }
    }
}

/**
 * Insert image tag with given info
 *
 * @param {Object} id - ckeditor id
 * @param {Object} imageURL - image url
 * @param {Object} img_id - image id
 *
 */
export let insertImage = function( id, imageURL, img_id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        const content = '<img src=' + imageURL + ' id=' + img_id + ' alt="" />';
        const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( content );
        const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment );
    }
};

/**
 * Insert ole with given info
 *
 * @param {Object} id - ckeditor id
 * @param {Object} ole_id - ole_id
 * @param {Object} thumbnailURL - thumbnailURL
 * @param {Object} fileName - fileName
 * @param {Object} type - type
 * @param {Object} ctx - context
 *
 */
export let insertOLE = function( id, ole_id, thumbnailURL, fileName, type, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.change( writer => {
            const oleImage = writer.createElement( 'oleimage', {
                src: thumbnailURL,
                datasettype: type,
                style: 'width:48px;height:48px;cursor:pointer;margin-top:10px;margin:0px;',
                oleid: ole_id,
                alt: ''
            } );

            const content = '<span>' + fileName + '</span>';
            const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( content );
            const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );

            writer.insert( oleImage, writer.createPositionAt( modelFragment.getChild( 0 ), 0 ) );

            appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment, appCtxSvc.ctx.AWRequirementsEditor.editor.model.document.selection );
        } );
    }
};

/**
 * Set the content change event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} clickHandler - function to handel the click event
 * @param {Object} ctx - context object
 */
export let setCkeditorChangeHandler = function( id, clickHandler, ctx ) {
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        ctx.AWRequirementsEditor.editor.model.document.on( 'change:data', ( eventInfo, batch ) => {
            if ( appCtxSvc && appCtxSvc.ctx && !appCtxSvc.ctx.requirementEditorSetData && !appCtxSvc.ctx.AWRequirementsEditor.editor.ignoreDataChangeEvent ) {
                var isDataChange = true;
                if ( eventInfo.path && eventInfo.path[0] && eventInfo.path[0].differ && eventInfo.path[0].differ._changesInElement ) {
                    for ( let [ key ] of eventInfo.path[0].differ._changesInElement.entries() ) {
                        //check for Marker change like tracelink create and delete
                        if ( key.name === 'requirementMarker' ) {
                            isDataChange = false;
                            break;
                        }
                    }
                    undoCommentsIfAny( eventInfo, ctx.AWRequirementsEditor.editor );
                }

                if ( isDataChange ) {
                    clickHandler( eventInfo );
                }
            }
        } );
    }
};

/**
 * Methdod to undo the deletedd comments
 * @param {Object} eventInfo the model change event infon
 * @param {CKEDITOR} editor the ckedtor instance
 */
function undoCommentsIfAny( eventInfo, editor ) {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx && markupCtx.deletedMarkups && markupCtx.deletedMarkups.size > 0 ) {
        var undoMarkupsPaths = new Map();
        var changes = eventInfo.path && eventInfo.path[ 0 ].differ.getChanges();
        for( var i = 0; i < changes.length; i++ ) {
            var change = changes[ i ];
            if( change && change.type === 'insert' ) {
                var position = change.position;
                var parent = position.parent;
                if( parent ) {
                    createPathForUndoComments( parent, markupCtx.deletedMarkups, editor, undoMarkupsPaths );
                }
            }
        }
        if( undoMarkupsPaths.size > 0 ) {
            undoComments( markupCtx.deletedMarkups, undoMarkupsPaths, editor );
        }
    }
}

/**
 * Methdod to create path for deleted comments
 * @param {ModelElement} parent the parent of the inserted element in undo operation
 * @param {Map} deletedComments the map of deleted comments
 * @param {CKEDITOR} editor the ckedtor instance
 * @param {Map} undoMarkupsPaths the map to store start and end path of undo markups
 */
function createPathForUndoComments( parent, deletedComments, editor, undoMarkupsPaths ) {
    if( parent && parent._children ) {
        var children = parent._children._nodes;
        if( children ) {
            for( var i = 0; i < children.length; i++ ) {
                var child = children[ i ];
                createPathForUndoComments( child, deletedComments, editor, undoMarkupsPaths );
                var spanId = child._attrs.get( 'spanId' );
                if( spanId ) {
                    var values = spanId.split( ',' );
                    for( var j = 0; j < values.length; j++ ) {
                        var id = values[ j ];
                        if( id ) {
                            var deletedmarkup = deletedComments.get( id );
                            if( deletedmarkup ) {
                                var startPath = child.getPath();
                                var markupData = {};
                                var endPath = _.cloneDeep( startPath );
                                if( !undoMarkupsPaths.has( id ) ) {
                                    endPath[ endPath.length - 1 ] = child.endOffset;
                                    markupData.start = startPath;
                                    markupData.end = endPath;
                                    undoMarkupsPaths.set( id, markupData );
                                } else {
                                    endPath = child.getPath();
                                    endPath[ endPath.length - 1 ] = child.endOffset;
                                    markupData = undoMarkupsPaths.get( id );
                                    markupData.end = endPath;
                                    undoMarkupsPaths.set( id, markupData );
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Method to undo the command and add marker to editor
 * @param {Map} deletedComments the map of deleted comments
 * @param {Map} undoMarkupsPath the map to store start and end path of undo markups
 * @param {CKEDITOR} editor the ckedtor instance
 */
function undoComments( deletedComments, undoMarkupsPath, editor ) {
    const doc = editor.model.document;
    const root = doc.getRoot();
    for( let [ key, value ] of undoMarkupsPath.entries() ) {
        editor.model.change( writer => {
            try {
                const startPos = writer.createPositionFromPath( root, value.start, 'toNext' );
                const endPos = writer.createPositionFromPath( root, value.end, 'toPrevious' );
                const currentRange = writer.createRange( startPos, endPos );
                var preRange = [];
                var postRange = [];
                var isEqualRange = getRangesForOverlappedAndNestedComments( editor, writer, key, currentRange, preRange, postRange );
                createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, key );
                const range = {};
                range.range = currentRange;
                range.usingOperation = false;
                if( !editor.model.markers._markers.get( key ) ) {
                    var marker = writer.addMarker( key, range );
                    setMarkerChangeEveneListener( marker );
                    if( !appCtxSvc.ctx.ckeditor5Markers ) {
                        appCtxSvc.ctx.ckeditor5Markers = [];
                    }
                    appCtxSvc.ctx.ckeditor5Markers.push( marker );
                }
                var markup = markupViewModel.getMarkupFromId( key );
                markupViewModel.undoDeleteMarkup( markup );
                markupService.updateMarkupList( true );
                deletedComments.delete( key );
            } catch ( error ) {
                console.error( 'error occurred while undo comments. Unable to create marker for ' + key );
            }
        } );
    }
}
/**
 * Get the instance of ckeditor for given id
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @return {Object} editor
 */
export let getCKEditorInstance = function( id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        return appCtxSvc.ctx.AWRequirementsEditor.editor;
    }
};

/**
 * Return the element from ckeditor frame from given element id
 * @param {String} ckeditorId - Ckeditor id
 * @param {String} elementId - element id which needs to be searched in ckeditor
 * @returns {Object} - Dom element
 */
export let getElementById = function( ckeditorId, elementId ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === ckeditorId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        //var requirementRoot = editor.model.document.getRoot();
        return document.getElementById( elementId );
    }
};

/**
 * Clear the highlighting of quality metric data
 * @param {String} id - ckeditor instance id
 * @param {Object} ctx - context object
 */
export let clearQualityHighlighting = function( id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        //ctx.AWRequirementsEditor.editor.fire( 'clearHighlightInvalidMetricData' );
    }
};

/**
 * Get recalculate comment position
 *
 * @param {Object} reqBodyText - the added widgets
 */
var recalculateCommentPosition = function( eventInfo ) {
    var changes = eventInfo.source.model.document.differ.getChanges();
    if ( changes && changes.length > 1 ) {
        var modelParentNode = changes[1].position && changes[1].position.parent;
        if ( modelParentNode ) {
            getSpanWIthID( modelParentNode );
        }
    }
    //Recalculating logic will go here: TODO
};

/**
 * Change style for deleted markup
 *
 * @param {Object} reqBodyText - the added widgets
 */
var getSpanWIthID = function( parentNode, spanId ) {
    for ( var i = 0; i < parentNode._children._nodes.length; i++ ) {
        var child = parentNode._children._nodes[i];
        if ( child && child._children &&
            child._children._nodes && child._children._nodes.length > 0 ) {
            var childModel = getSpanWIthID( child, spanId );
            if ( childModel ) {
                return childModel;
            }
        }
        if ( child.getAttribute( 'spanId' ) === spanId ) {
            return child;
        }
    }
};

/**
 * Change style for deleted markup
 *
 * @param {Object} reqBodyText - the added widgets
 */
var getMarkerSpan = function( parentNode, markerSpanID ) {
    for ( var i = 0; i < parentNode._children.length; i++ ) {
        var childern = parentNode._children[i];
        if ( childern && childern._children && childern._children.length > 0 ) {
            var markerSpan = getMarkerSpan( childern, markerSpanID );
            if ( markerSpan ) {
                return markerSpan;
            }
        }
        if ( childern && childern.name && childern.name === 'span' ) {
            if ( childern._attrs.get( 'id' ) === markerSpanID ) {
                return childern;
            }
        }
    }
};

function getRequirementElement( cSpan ) {
    var parent = cSpan.parentElement;
    while ( parent ) {
        if ( parent.classList.contains( 'requirement' ) ) {
            return parent;
        }
        parent = parent.parentElement;
    }
}


/**
 * Add created objects in list
 *
 * @param {Array} addedWidgets - the added widgets
 * @param {Array} createdInput - input created with the widgets
 */
var _addCreatedObjectsInList = function( addedWidgets, createdInput ) {
    for ( var index = 0; index < addedWidgets.length; index++ ) {
        var widget = addedWidgets[index];
        var newElementId = widget.getAttribute( 'id' );
        var pId = widget.getAttribute( 'parentid' );
        var pType = widget.getAttribute( 'parenttype' );
        var sId = widget.getAttribute( 'siblingid' );
        var sType = widget.getAttribute( 'siblingtype' );
        var position = 1;//widget.getAttribute('position');

        var siblingElement = {};
        var parentElement = {};
        var parentId = null;
        var siblingId = null;
        // if sibling uid is not present, then the current element is a added as a child
        if ( pId && pId.indexOf( 'RM::NEW::' ) === -1 ) {
            parentElement = {
                uid: pId,
                type: pType
            };
        }
        if ( sId && sId.indexOf( 'RM::NEW::' ) === -1 ) {
            siblingElement = {
                uid: sId,
                type: sType
            };
        }
        if ( pId && pId.indexOf( 'RM::NEW::' ) >= 0 ) {
            parentId = pId;
        }
        if ( sId && sId.indexOf( 'RM::NEW::' ) >= 0 ) {
            siblingId = sId;
        }
        var widgetName = _getTitle( widget );

        var widgetType = widget.getAttribute( 'objectType' );

        var contentElement = _getRequirementContent( widget );
        // Get BodyText div and remove cke specific classes before saving
        if ( contentElement ) {
            var bodyTextDiv = contentElement.getElementsByClassName( 'aw-requirement-bodytext' );
            if ( bodyTextDiv.length > 0 ) {
                reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[0] );
            } //aw-requirement-properties
            var propertiesSpans = contentElement.getElementsByClassName( 'aw-requirement-properties' );
            for ( var ii = 0; ii < propertiesSpans.length; ii++ ) {
                reqUtils.removeCkeditorSpecificClasses( propertiesSpans[ii] );
            }
        }
        var widgetData = contentElement.innerHTML;
        widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor

        // If contents of the created object is plain text, wrap it in p tag to make it as a html.
        widgetData = _wrapPlainContentsIntoP( widgetData );

        // encode special characters in html text
        //widgetData = _encodeBodyTextString( widgetData );

        createdInput.push( {
            elementID: newElementId,
            name: widgetName,
            type: widgetType,
            contents: widgetData,
            siblingElement: siblingElement,
            parentElement: parentElement,
            position: parseInt( position ),
            parentID: parentId,
            siblingID: siblingId
        } );
    }
};

/**
 * Get requirementContent from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getRequirementContent = function( domElement ) {
    var reqContentElement = domElement.getElementsByClassName( 'aw-requirement-content' );
    return reqContentElement ? reqContentElement[0] : null;
};
/**
 * Get bodytext from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getBodyText = function( domElement ) {
    var reqContent = _getRequirementContent( domElement );
    var reqBodyText;
    if ( reqContent ) {
        reqBodyText = reqContent.getElementsByClassName( 'aw-requirement-bodytext' )[0];
    }
    return reqBodyText;
};
/**
 * Get bodytext from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getTitle = function( domElement ) {
    var reqHeader = domElement.getElementsByClassName( 'aw-requirement-header' )[0];
    var reqTitle = '';
    if ( reqHeader && reqHeader.getElementsByClassName( 'aw-requirement-title' )[0] ) {
        reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-title' )[0].innerText;
    } else if ( reqHeader && reqHeader.getElementsByClassName( 'aw-requirement-properties' )[0] ) {
        reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-properties' )[0].innerText;
    }
    return reqTitle;
};
/**
 * Get html from bodytext element
 *
 * @param {Object} reqBodyText - the added widgets
 */
var _getBodyTextHtml = function( reqBodyText ) {
    var reqHtml = reqBodyText.innerHTML;
    reqHtml = '<div class="aw-requirement-bodytext">' + reqHtml + '</div>';
    return reqHtml;
};
/**
 * Gets all the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param frame The frame element.
 * @param id The editor instance ID.
 * @return The editor data.
 */
export let getAllWidgetData = function( id, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var addedWidgets = [];
    var documentData = editor.getData();
    var doc = document.createElement( 'div' );
    doc.innerHTML = documentData;
    var widgets = doc.getElementsByClassName( 'requirement' );
    for ( var index = 0; index < widgets.length; index++ ) {
        var domElement = widgets[index];
        addedWidgets.push( domElement );
    }
    var allObjects = [];
    // Add created objects in list
    for ( var index = 0; index < addedWidgets.length; index++ ) {
        var widget = addedWidgets[index];
        var newElementId = widget.id;
        var pId = widget.getAttribute( 'parentId' );
        var parentId = null;
        parentId = pId;
        var widgetName = _getTitle( widget );
        widgetName = widgetName.trim();
        var widgetType = widget.getAttribute( 'objectType' );
        var widgetData = _getBodyTextHtml( _getBodyText( widget ) );
        widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor
        allObjects.push( {
            elementID: newElementId,
            name: widgetName,
            type: widgetType,
            contents: widgetData,
            parentID: parentId
        } );
    }
    return {
        elements: allObjects
    };
};

/**
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param {String} id The editor instance ID.
 * @param {Object} ctx - context object
 * @returns {Object} The widgets to be saved
 */
export let getWidePanelWidgetData = function( id, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var updatedInput = [];
    var documentData = editor.getData();
    var doc = document.createElement( 'div' );
    doc.innerHTML = documentData;
    var allwidgets = doc.getElementsByClassName( 'requirement' );
    for ( var index = 0; index < allwidgets.length; index++ ) {
        var domElement = allwidgets[index];
        var idAttribute = domElement.getAttribute( 'id' );
        var obj = appCtxSvc.getCtx( 'selected' );
        idAttribute = obj.uid;
        var isContentDirty = false;
        var rContent = '';
        var reqContentEle = _getRequirementContent( domElement );
        var reqContentHtml = reqContentEle.innerHTML;
        if ( reqContentHtml ) {
            isContentDirty = true;
            // Get BodyText div and remove cke specific classes before saving
            var bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
            if ( bodyTextDiv.length > 0 ) {
                reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[0] );
            }
            rContent = reqContentEle.innerHTML;
        }

        if ( isContentDirty ) {
            updatedInput.push( {
                uid: idAttribute,
                contents: rContent
            } );
        }
    }

    return {
        setContentInput: updatedInput,
        createInput: []
    };
};

/**
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param {String} id The editor instance ID.
 * @param {Object} ctx - context object
 * @returns {Object} The widgets to be saved
 */
export let getWidgetData = function( id, ctx, viewModelData ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var updatedInput = [];
    var addedWidgets = [];
    var documentData = editor.getData();
    var doc = document.createElement( 'div' );
    doc.innerHTML = documentData;
    var allwidgets = doc.getElementsByClassName( 'requirement' );

    for ( var index = 0; index < allwidgets.length; index++ ) {
        var domElement = allwidgets[index];
        var idAttribute = domElement.getAttribute( 'id' );

        if ( idAttribute && !idAttribute.startsWith( 'RM::NEW::' ) ) {
            var isContentDirty = false;
            var isHeaderDirty = false;
            var data = '';
            var rContent = '';
            var updatedHeader = '';

            var reqTitle = _getTitle( domElement );
            var reqContentEle = _getRequirementContent( domElement );
            var reqContentHtml = reqContentEle.innerHTML;
            var bodyTextDiv;
            if( reqContentEle ) {
                bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
                if( isNonEditableRequirement( bodyTextDiv, viewModelData ) ) {
                    continue;
                }
            }
            if ( objectInitialContentsMap[idAttribute] !== reqContentHtml ) {
                isContentDirty = true;
                // Get BodyText div and remove cke specific classes before saving
                if( !bodyTextDiv ) {
                     bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
                }
                if ( bodyTextDiv.length > 0 ) {
                     reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[0] );
                }

                rContent = reqContentEle.innerHTML;
            }
            if ( objectInitialTitleMap[idAttribute] !== reqTitle && !domElement.getAttribute( 'TOP_LINE' ) ) {
                isHeaderDirty = true;
                var reqHeader = domElement.getElementsByClassName( 'aw-requirement-header' )[0];
                var headerData = reqHeader.getElementsByClassName( 'aw-requirement-properties' )[0];
                if ( headerData ) {
                    headerData.classList.remove( 'cke_widget_editable_focused' );
                    updatedHeader = '<p>' + headerData.outerHTML + '</p>';
                }
                var widgetName = _getTitle( domElement );
                var widgetName_temp = reqUtils.correctCharactersInText( widgetName );
                // If requirement is not valid (e.g. No title provided)
                if ( widgetName_temp === '' ) {
                    return null;
                }
                // Add uid in ctx to refresh the object in tree after save
                _UpdateCtxToRefreshOccurrances( idAttribute );
            }

            if ( !isContentDirty && isHeaderDirty ) {
                data = updatedHeader;
            } else if ( isContentDirty && !isHeaderDirty ) {
                data = rContent;
            } else if ( isContentDirty && isHeaderDirty ) {
                data = updatedHeader + rContent;
            }

            if ( isHeaderDirty || isContentDirty ) {
                updatedInput.push( {
                    uid: idAttribute,
                    contents: data
                } );
            }
        } else {
            var widgetName = _getTitle( domElement );
            var widgetName_temp = reqUtils.correctCharactersInText( widgetName );
            // If newly added requirement is not valid (e.g. No title provided)
            if ( widgetName_temp === '' ) {
                return null;
            }
            //newly created requirements
            addedWidgets.push( domElement );
        }
    }

    var createdInput = [];
    _addCreatedObjectsInList( addedWidgets, createdInput );

    return {
        setContentInput: updatedInput,
        createInput: createdInput
    };
};

/**
 * Method to check whether requirement in non editable
 */
function isNonEditableRequirement( bodyTextDiv, viewModelData ) {
    if( bodyTextDiv && bodyTextDiv.length > 0 &&  viewModelData && viewModelData.i18n ) {
        var title = bodyTextDiv[0].getAttribute( 'title' );
        var nonEditableMsg = viewModelData.i18n.readOnlyReqCanNotBeEdited;
        if( title === nonEditableMsg && bodyTextDiv[0].getAttribute( 'contenttype' ) === 'READONLY' ) {
            return true;
         }
    }
    return false;
}
/**
 * Update the ctx with given uid
 *
 * @param {String} uid - model object uid
 */
var _UpdateCtxToRefreshOccurrances = function( uid ) {
    var updatedHeaderUids = appCtxSvc.getCtx( 'arm0ReqDocACEUpdatedHeaderOccUids' );
    if ( updatedHeaderUids ) {
        updatedHeaderUids.push( uid );
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    } else {
        updatedHeaderUids = [ uid ];
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    }
};


/**
 * Set the content undo event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} undoHandler - function to handel the undo event
 * @param {object} ctx - context object
 */
export let setCkeditorUndoHandler = function( id, undoHandler, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        const undoCommand = appCtxSvc.ctx.AWRequirementsEditor.editor.commands.get( 'undo' );
        const redoCommand = appCtxSvc.ctx.AWRequirementsEditor.editor.commands.get( 'redo' );

        undoCommand.on( 'execute', eventInfo => {
            // handle before undo
            undoHandler();
        } );

        redoCommand.on( 'execute', eventInfo => {
            // handle before redo
            undoHandler();
        } );
    }
};

/**
 * Scroll ckeditor content to given object element.
 *
 * @param {String} id - CKEditor ID
 * @param {String} objectUid - object uid
 * @param {object} isPagingEnabled - is Paging Enabled
 */
export let scrollCKEditorToGivenObject = function( id, objectUid, isPagingEnabled ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var ckEditor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        // Find Requirement model object
        var element = _getWidgetFromUid( ckEditor, objectUid );
        if ( element ) {
            eventBus.publish( 'ckeditor.handleSelectionChange', {
                objectUid: objectUid
            } );
        } else if ( isPagingEnabled ) {
            eventBus.publish( 'requirementDocumentation.loadSelectedObjectContentFromServer' );
        }
    }
};

/**
 * Reset ckeditor's undo state
 *
 * @param {String} id - CKEditor ID
 * @param {object} ctx - context object
 */
export let resetUndo = function( id, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var ckEditor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        var undocmd = ckEditor.commands.get( 'undo' );
        undocmd.clearStack();
        undocmd.refresh();
    }
};

/**
 * Check if given object is visible in ckeditor
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @param {object} ctx - context object
 * @return {boolean} true, if object with given uid is visible in editor.
 */
export let isObjectVisibleInEditor = function( id, objId, ctx ) {
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        if ( origCkeditorContentMap[objId] ) {
            return true;
        }
    }
    return false;
};

/**
 * Get all properties for given object
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @return {Array} - array of properties
 */
export let getPropertiesFromEditor = function( id, objId ) {
    var props = [];
    var element = document.getElementById( objId );
    if ( element ) {
        props.push( { name: 'revisionid', value: element.getAttribute( 'revisionid' ) } );
        var properties = element.getElementsByClassName( 'aw-requirement-properties' );
        _.forEach( properties, function( property ) {
            var prop = {
                name: property.getAttribute( 'internalname' ),
                value: property.textContent
            };
            props.push( prop );
        } );
    }
    return props;
};

/**
 * Update the given properties
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @param {Array} updatedProperties array of updated properties.
 */
export let updateObjectProperties = function( id, objId, updatedProperties, data ) {
    // TODO

    var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
    // Find Requirement model object
    var reqObject = _getWidgetFromUid( editor, objId );
    if ( !reqObject ) {
        return;
    }
    const rangeReq = editor.model.createRangeIn( reqObject );
    for ( var item of rangeReq.getItems() ) {
        // Update Object title in header
        if ( updatedProperties.object_name && item.name && item.name === 'requirementHeader' ) {
            var originalTitle = objectInitialTitleMap[objId];
            if ( originalTitle !== updatedProperties.object_name ) {
                _updateHeaderTitle( editor, item, updatedProperties.object_name );
            }
        } else if ( item.name && item.name === 'requirementProperty' && updatedProperties[item.getAttribute( 'internalname' )] ) {
            // Update object property
            updateTextValueInNode( editor, item, updatedProperties[item.getAttribute( 'internalname' )] );
        } else if ( item.name && item.name === 'requirementLovProperty' && updatedProperties[item.getAttribute( 'internalname' )] ) {
            // Update lov property
        }
    }
};

/**
 * Function to update text value in the child of given node
 * @param {Object} editor  - editor instance
 * @param {Object} node - Parent node
 * @param {String} newValue - updated value
 */
function updateTextValueInNode( editor, node, newValue ) {
    var propTxtNode = node.getChild( 0 );

    editor.model.change( writer => {
        if ( propTxtNode ) {
            const position = writer.createPositionBefore( propTxtNode );
            const attributes = propTxtNode.getAttributes();
            writer.remove( propTxtNode );
            writer.insertText( newValue, attributes, position );
        } else {
            writer.insertText( newValue, node );
        }
    } );
}


/**
 * Set latest tracelink icon from dom element
 *
 * @param {Object} reqElement - the requirement widget element
 * @param {Object} currentElement - the current requirement widget element
 */
var _updateTracelinkMarkers = function( reqElement, currentElement ) {
    var tlIconPlaceHolder = reqElement.getElementsByTagName( 'tracelinkicon' );
    var currentTlIconPlaceHolder = currentElement.getElementsByTagName( 'tracelinkicon' );
    var marker = reqElement.getElementsByClassName( 'aw-requirement-marker' )[0];
    marker.replaceChild( currentTlIconPlaceHolder[0], tlIconPlaceHolder[0] );
};

/**
 *   @param {object} editor - editor
  *  @param {String} uid - object uid
 */
var _getWidgetFromUid = function( editor, uid ) {
    var reqObject = null;
    // Find Requirement model object
    const range = editor.model.createRangeIn( editor.model.document.getRoot() );
    for ( var item of range.getItems() ) {
        if ( item.name === 'requirement' && item.getAttribute( 'id' ) === uid ) {
            reqObject = item;
            break;
        }
    }
    return reqObject;
};

/**
 * Update Header title
 *   @param {object} editor - editor
  *  @param {object} headerElement - headerElement title to be updated
  *  @param {String} newTitle - new Title
 */
var _updateHeaderTitle = function( editor, headerElement, newTitle ) {
    var position = null;
    var retainCursorPos = false;
    if ( headerElement ) {
        const eleRange = editor.model.createRangeIn( headerElement );
        var selectRange = editor.model.document.selection.getFirstRange();

        if ( eleRange.containsRange( selectRange ) ) {
            position = editor.model.document.selection.getFirstPosition();
            retainCursorPos = true;
        }
        updateTextValueInNode( editor, headerElement, newTitle );
    }

    if ( retainCursorPos && position ) {
        editor.model.change( writer => {
            var newOffset = position.offset > newTitle.length ? newTitle.length : position.offset;
            position.offset = newOffset;
            writer.setSelection( position );
        } );
    }
};

/**
 * Check if to update Body text
 *   @param {String} originalReqHtml - Original requirement HTML
  *  @param {String} newReqHTML - new requirement HTML
  *  @returns {Boolean} true/false
 */
var _isUpdateBodyText = function( originalReqHtml, newReqHTML ) {
    var originalReqDiv = document.createElement( 'div' );
    originalReqDiv.innerHTML = originalReqHtml;

    var newReqDiv = document.createElement( 'div' );
    newReqDiv.innerHTML = newReqHTML;

    var origHtmlBodyText = '';
    var newHtmlBodyText = '';

    var tmpBodyText = originalReqDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if ( tmpBodyText && tmpBodyText.length > 0 ) {
        origHtmlBodyText = tmpBodyText[0].innerHTML;
        origHtmlBodyText = origHtmlBodyText.replace( /(\r\n|\n|\r)/gm, '' );
    }

    tmpBodyText = newReqDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if ( tmpBodyText && tmpBodyText.length > 0 ) {
        newHtmlBodyText = tmpBodyText[0].innerHTML;
        newHtmlBodyText = newHtmlBodyText.replace( /(\r\n|\n|\r)/gm, '' );
    }

    if ( origHtmlBodyText !== newHtmlBodyText ) {
        return true;
    }

    return false;
};
/**
 * Calculate cursor offset postion in while updating body text
 *   @param {object} editor - editor
 *  @param {object} modleEle - Body text model element to be updated
 *  @param {Number} postion - new requirement HTML
 *  @returns {number} new offset
 */
var _getNewCursorPostion = function( editor, modleEle, postion ) {
    var total_length = 0;
    var offSet = postion;

    const range = editor.model.createRangeIn( modleEle );
    for ( const item of range.getItems( { ignoreElementEnd: true } ) ) {
        if ( item._data || item.textNode ) {
            var text = item.textNode._data;
            total_length += text.length;
        }
    }
    if ( offSet > total_length ) {
        offSet = total_length;
    }
    return offSet;
};
/**
* Method to return model fragment of html content
*/
var _convertHtmlToModel = function( htmlContent, editor ) {
    const viewFragment = editor.data.processor.toView( htmlContent );
    return editor.data.toModel( viewFragment );
};

// Get Model Element within tree of other model element
var _getModelElement = function( editor, containerElement, nameModelEle ) {
    const range = editor.model.createRangeIn( containerElement );
    for ( const modelElement of range.getItems( { ignoreElementEnd: true } ) ) {
        if ( modelElement.name === nameModelEle ) {
            return modelElement;
        }
    }
    return null;
};

/**
 *   @param {object} editor - editor
  *  @param {object} currReqWidget - requirement Widget to be updated
  *  @param {String} newReqWidget - new requirement widget
 */
var _updateBodyText = function( editor, currReqWidget, newReqWidget, mode ) {
    if ( newReqWidget ) {
        var currBodyText = _getModelElement( editor, currReqWidget, 'requirementBodyText' );
        var newBodyText = _getModelElement( editor, newReqWidget, 'requirementBodyText' );

        var position = null;
        var retainCursorPos = false;

        editor.model.change( writer => {
            try{
                const eleRange = editor.model.createRangeIn( currBodyText );
                var selectRange = editor.model.document.selection.getFirstRange();

                if ( eleRange.containsRange( selectRange ) ) {
                    retainCursorPos = true;
                    position = editor.model.document.selection.getFirstPosition();
                }
                var posBodyText = writer.createPositionBefore( currBodyText );
                writer.remove( currBodyText );
                writer.insert( newBodyText, posBodyText );
            }catch( error ) {
                //nothing to do. failed to update the requirement
            }
        } );

        editor.model.change( writer => {
            if ( retainCursorPos && position && mode !== 'reset' ) {
                try {
                    var newOffset = _getNewCursorPostion( editor, newBodyText, position.offset );
                    position.offset = newOffset;
                    writer.setSelection( position );
                } catch ( error ) {
                    //nothing to do. Failed to set the selection on given position
                }
            }
        } );
    }
};

/**
 *   @param {object} editor - editor
  *  @param {object} reqWidget - requirement Widget to be updated
 */
var _updateMarkup = function( editor, reqWidget ) {
    if ( reqWidget ) {
        var markupReqModelEle = _getModelElement( editor, reqWidget, 'requirementMarker' );
        if ( markupReqModelEle ) {
            editor.model.change( writer => {
                var posBodyText = null;

                var countChild = markupReqModelEle.childCount;
                for ( var ii = countChild - 1; ii >= 0; ii-- ) {
                    var child = markupReqModelEle.getChild( ii );
                    if ( child.name === 'checkedout' ) {
                        // posBodyText = writer.createPositionBefore( child );
                        writer.remove( child );
                    }
                }

                posBodyText = writer.createPositionAt( markupReqModelEle, 1 );
                if ( posBodyText ) {
                    const newCheckoutEle = writer.createElement( 'checkedout', {} );
                    writer.insert( newCheckoutEle, posBodyText );
                }
            } );
        }
    }
};
/**
 *   @param {object} editor - editor
  *  @param {object} currReqWidget - requirement Widget to be updated
  *  @param {String} newReqHtml - new requirement HTML
 */
var _updateRequirement = function( editor, currReqWidget, newReqHtml, mode ) {
    var modelFregment = _convertHtmlToModel( newReqHtml, editor );
    if ( !modelFregment || modelFregment.childCount < 1 ) { return; }

    const newReqWidget = modelFregment.getChild( 0 );

    // get original RequirementContent
    if( newReqWidget && currReqWidget ) {
        if( mode === 'reset' ) {
            replaceRequirement( editor, currReqWidget, newReqHtml );
        } else {
            _updateMarkup( editor, currReqWidget );

            var idAttribute = currReqWidget.getAttribute( 'id' );
            var originalReqHtml = _getOriginalReqHtml( idAttribute );

            if(  _isUpdateBodyText( originalReqHtml, newReqHtml ) ) {
                _updateBodyText( editor, currReqWidget, newReqWidget, mode );
            }
        }
    }
};
/**
 * Set CKEditor Content.
 *
 * @param {String} id- CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @return {String} Return when content gets loaded in ckeditor
 */

export let updateHtmlDivs = function( id, updatedObjects, updatedContents, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    editor.ignoreDataChangeEvent = true;

    for ( var i = 0; i < updatedObjects.length; i++ ) {
        var currReqWidget = _getWidgetFromUid( editor, updatedObjects[i].uid );
        if ( !currReqWidget ) {
            continue;
        }
        editor.model.change( writer => {
            writer.removeAttribute( 'checkedoutby', currReqWidget );
            writer.removeAttribute( 'checkedouttime', currReqWidget );
        } );

        _updateRequirement( editor, currReqWidget, updatedContents[i].trim() );
    }
    editor.ignoreDataChangeEvent = false;
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    editor.ignoreDataChangeEvent = true;

    var currReqWidget = _getWidgetFromUid( editor, ctx.rmselected[0].uid );
    if ( !currReqWidget ) {
        return;
    }
    var originalReqHtml = _getOriginalReqHtml(  ctx.rmselected[0].uid );
    originalReqHtml = updateStyleForOverwrite( originalReqHtml );
    replaceRequirement( editor, currReqWidget, originalReqHtml );
    editor.ignoreDataChangeEvent = false;
};

/**
 * Method to replace requiement widget with new requirment
 * @param {Object} editor the ckeditor instance
 * @param {Object} currReqWidget - the current requirement widget
 * @param {String} newReqhtml the html of new requirement to be updated
 */
function replaceRequirement( editor, currReqWidget, newReqhtml ) {
    var modelFregment = _convertHtmlToModel( newReqhtml, editor );
    if ( !modelFregment || modelFregment.childCount < 1 ) { return; }

    const newReqWidget = modelFregment.getChild( 0 );
        editor.model.change( writer => {
            var posBodyText = writer.createPositionBefore( currReqWidget );
            writer.remove( currReqWidget );
            writer.insert( newReqWidget, posBodyText );
        } );
        editor.ignoreDataChangeEvent = false;
}

/**
 * Method to update the requirements overwritten object in derived specification
 * @param {String} html - the html to be updated
 * @returns {String} the updated html
 */
function updateStyleForOverwrite( html ) {
    var element = document.createElement( 'div' );
    element.innerHTML = html;
    element = element.firstElementChild;
    var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
    reqBodyText.setAttribute( 'contenteditable', 'TRUE' );
    reqBodyText.removeAttribute( 'contenttype' );
    var isOverwrite = reqBodyText.getAttribute( 'isOverwrite' );
    if( !isOverwrite ) {
        reqBodyText.setAttribute( 'isOverwrite', 'true' );
    }
    var indicatorElement = element.getElementsByClassName( 'aw-requirement-readOnly' )[0];
    indicatorElement.classList.add( 'aw-requirements-editable' );
    element.style.backgroundColor = 'transparent';
    element.style.cursor = 'auto';
    return element.outerHTML;
}
/**
 * Converts the dom markup span into ckeditor5 model
 * * @param {Object} markup - markup object
 */
export let renderComment = function( markup, markupList, allMarkups ) {
    appCtxSvc.ctx.isNewComment = true;
    if( markup.editMode === 'reply' ) {
        markupList.push( markup );
        var index = allMarkups.indexOf( markup );
        if( index === -1 ) {
            allMarkups.push( markup );
        }
    } else {
        var commentId = markup.reqData.commentid;
        var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
        var ckeditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
        var commentStyle = 'background-color:rgba(255, 0, 0, 0.125)';
        const selection = ckeditor.model.document.selection;
        if ( selection && !selection.isCollapsed ) {
            ckeditor.model.change( writer => {
                appCtxSvc.ctx.isRequirementsCommentsHighlightInProgress = true;
                const currentRange = selection.getFirstRange();
                var preRange = [];
                var postRange = [];
                var isEqualRange = getRangesForOverlappedAndNestedComments( ckeditor, writer, commentId, currentRange, preRange, postRange );
                createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, commentId );
                const range = {};
                range.range = currentRange;
                range.usingOperation = false;
                if( !ckeditor.model.markers._markers.get( commentId ) ) {
                    var marker = writer.addMarker( commentId, range );
                    setMarkerChangeEveneListener( marker );
                    commentIdVsStartPath.set( commentId, marker._liveRange.start.path );
                    commentIdVsEndPath.set( commentId, marker._liveRange.end.path );
                    if( !appCtxSvc.ctx.ckeditor5Markers ) {
                        appCtxSvc.ctx.ckeditor5Markers = [];
                    }
                    appCtxSvc.ctx.ckeditor5Markers.push( marker );
                }
            } );
        } else if ( selection && selection.isCollapsed ) {
            getSelection( selection, ckeditor, commentId, commentStyle );
        }
        var currentSpanInserted = document.querySelectorAll( 'span[id*="' + commentId + '"]' );
        for( var k = 0; k < currentSpanInserted.length; k++ ) {
            if( currentSpanInserted[k] ) {
                _markupTextInstance.setMarkupEventListeners( currentSpanInserted[k] );
                markupList.push( markup );
                var index = allMarkups.indexOf( markup );
                if( index === -1 ) {
                    allMarkups.push( markup );
                }
            }
        }
    }
    markupViewModel.sortMarkupList();
};

/**
 * Method to create span for markup
 */
function createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, commentId ) {
    var comment = markupViewModel.getComment( commentId );
    if( comment && comment.reqData && !comment.reqData.parentCommentid && !comment.reqData.parentCommentid !== '' ) {
        var user = markupViewModel.getUser( comment );
        var commentStyle = 'background-color:' + user.color;
        try{
            if( preRange.length > 0 || postRange.length > 0 ) {
                if( preRange.length > 0 ) {
                    writer.setAttribute( 'spanId', commentId, preRange[0] );
                    writer.setAttribute( 'spanStyle', commentStyle, preRange[0] );
                }
                if( postRange.length > 0 ) {
                    writer.setAttribute( 'spanId', commentId, postRange[0] );
                    writer.setAttribute( 'spanStyle', commentStyle, postRange[0] );
                }
            } else if( !isEqualRange ) {
                writer.setAttribute( 'spanId', commentId, currentRange );
                writer.setAttribute( 'spanStyle', commentStyle, currentRange );
            }
        } catch( error ) {
            // Nothing to do. Failed to add attributes on given range
        }
    }
}

/**
 *  Method to get pre and post range that needs to be added to span for the given comemnt id
 *  @param {CKEDITOR} ckeditor - ckeditor instance
 *  @param {ModelWriter} writer - the ckeditor model writer
 *  @param {String} commentId - the newly ceated comment id
 *  @param {Range} currentRange - the range for which comemnt to be added
 *  @param {Array} preRange - the pre range to be added in markup span
 *  @param {Array} postRange - the post range to be added in markup span
 *  @return {Boolean} the lag to indicate selected range is equal to current range
 */
function getRangesForOverlappedAndNestedComments( ckeditor, writer, commentId, currentRange, preRange, postRange ) {
    var preRanges = [];
    var postRanges = [];
    var isEqual = false;
    const markersIntersectingRange = [ ...ckeditor.model.markers.getMarkersIntersectingRange( currentRange ) ];
    if( markersIntersectingRange.length > 0 ) {
        for( const marker of markersIntersectingRange ) {
            const markerRange = marker.getRange();
            var differenceRanges = [ ...currentRange.getDifference( markerRange ) ];
            if( differenceRanges.length === 2 ) {
                preRanges.push( differenceRanges[ 0 ] );
                postRanges.push( differenceRanges[ 1 ] );
            } else if( differenceRanges.length === 1 ) {
                var intersectingRange = currentRange.getIntersection( markerRange );
                if( isStartingWithSamePath( markerRange, currentRange ) ) {
                    addCommentIdToExistingSpan( writer, intersectingRange, commentId );
                    postRanges.push( differenceRanges[ 0 ] );
                }else if( isEndingWithSamePath( markerRange, currentRange ) ) {
                    preRanges.push( differenceRanges[ 0 ] );
                }else {
                    preRanges.push( intersectingRange );
                    postRanges.push( differenceRanges[ 0 ] );
                }
            } else {
                if( currentRange.isEqual( markerRange ) ) {
                    isEqual = true;
                    addCommentIdToExistingSpan( writer, currentRange, commentId );
                }
            }
        }
        if( preRanges.length > 0 ) {
            preRange.push( getIntersectingRange( ckeditor, preRanges ) );
        }
        if( postRanges.length > 0 ) {
            postRange.push( getIntersectingRange( ckeditor, postRanges ) );
        }
    }
    return isEqual;
}


/**
 * Combine new comment id with existing in case of comments starting from same postion or are same
 *  @param {ModelWriter} writer - the ckeditor model writer
 *  @param {Range} intersectingRange - the intersecting range which contains existing span
 *  @param {String} commentId - the newly ceated comment id
 *
 */
function addCommentIdToExistingSpan( writer, intersectingRange, commentId ) {
    var comment = markupViewModel.getComment( commentId );
    if( comment && comment.reqData && !comment.reqData.parentCommentid && !comment.reqData.parentCommentid !== '' ) {
        for( const item of intersectingRange.getItems() ) {
            var existingSpanId = item.getAttribute( 'spanId' );
            writer.setAttribute( 'spanId', existingSpanId + ',' + commentId, item );
        }
    }
}

/**
 * Method to identify whether two range start at same position
 * @param {Range} range1 - the first range
 * @param {Range} range2 - the second range
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isStartingWithSamePath( range1, range2 ) {
    var startPath = range1.start.path;
    var startPathCurreentRange = range2.start.path;
    return isEqualPath( startPath, startPathCurreentRange );
}

/**
 * Method to identify whether two range start at same position
 * @param {Range} firstPath - the first path
 * @param {Range} secondPath - the second path
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isEqualPath( firstPath, secondPath  ) {
    var startPath = firstPath;
    var startPathCurreentRange = secondPath;
    return Array.isArray( startPath ) && Array.isArray( startPathCurreentRange ) && startPath.length === startPathCurreentRange.length &&
        startPathCurreentRange.every( ( val, index ) => val === startPath[ index ] );
}

/**
 * Method to identify whether deleted path is ssmaller that the range start path
 * @param {Range} firstPath - the first path
 * @param {Range} secondPath - the second path
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isPathDeleted( deletedPath, rangeStartPath ) {
    var isPathDeleted = false;
    var startPath = deletedPath;
    var startPathCurreentRange = rangeStartPath;
    var isLengthEqual = Array.isArray( startPath ) && Array.isArray( startPathCurreentRange ) && startPath.length === startPathCurreentRange.length;
    if( isLengthEqual ) {
        for( var i = 0; i < startPath.length; i++ ) {
            var deletedPathVal = startPath[ i ];
            var startPathCurreentRangeVal = startPathCurreentRange[ i ];
            if( i < startPath.length - 1 && deletedPathVal === startPathCurreentRangeVal ) {
                continue;
            } else {
                deletedPathVal < startPathCurreentRangeVal ? isPathDeleted = true : isPathDeleted = false;
            }
        }
    }
    return isPathDeleted;
}

/**
 * Method to identify whether two range end at same position
 * @param {Range} range1 - the first range
 * @param {Range} range2 - the second range
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isEndingWithSamePath( range1, range2 ) {
    var endPath = range1.end.path;
    var endPathCurreentRange = range2.end.path;
    return Array.isArray( endPath ) && Array.isArray( endPathCurreentRange ) && endPath.length === endPathCurreentRange.length &&
        endPathCurreentRange.every( ( val, index ) => val === endPath[ index ] );
}

/**
 * Method tol find the intersecting range of all ranges
 * @param {CKEDITOR} editor - ckeditor instance
 * @param {Array} ranges - the array of ranges for which intersection needs to be find
 * @returns {Range} the calculated intersecting range
 */
function getIntersectingRange( editor, ranges ) {
    var intersectingRange;
    if( ranges.length > 0 ) {
        intersectingRange = ranges[ 0 ];
        for( var i = 1; i < ranges.length; i++ ) {
            intersectingRange = ranges[ i ].getIntersection( intersectingRange );
        }
    }
    return intersectingRange;
}

/**
 * Get selection in case of range when start and end is same.
 *  @param {Object} selection - markup object
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} modelFragment - modelFragment object
 */
function getSelection( selection, ckeditor, commentId, commentStyle ) {
    var stringNode = selection._ranges[0].start.textNode._data;
    var cursorPath = selection._ranges[0].start.path;
    var startOffset = selection._ranges[0].start.textNode.startOffset;
    var cursorPosition = cursorPath[cursorPath.length - 1];
    var cloneCursorPositionForStart = _.cloneDeep( cursorPosition );
    var cloneCursorPositionForEnd = _.cloneDeep( cursorPosition );

    var startPosition = cloneCursorPositionForStart;
    var endPosition = cloneCursorPositionForEnd;

    var clonedStartPath = _.cloneDeep( cursorPath );
    var clonedEndPath = _.cloneDeep( cursorPath );


    cloneCursorPositionForStart = cloneCursorPositionForStart - startOffset - 1;
    cloneCursorPositionForEnd = cloneCursorPositionForEnd - startOffset - 1;

    if ( stringNode.charCodeAt( cloneCursorPositionForStart ) === 32 && stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) === 32 &&
        stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) === 32 ) {
        return;
    }           // text | x
    else if ( stringNode.charCodeAt( cloneCursorPositionForStart ) === 32
        && stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32 ) { // |Text
        startPosition = cloneCursorPositionForStart;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[clonedStartPath.length - 1] = startPosition + startOffset + 1;

        while ( stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32 && cloneCursorPositionForStart <= stringNode.length ) {
            ++cloneCursorPositionForStart;
        }

        endPosition = cloneCursorPositionForStart;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[clonedEndPath.length - 1] = endPosition + startOffset + 1;
    } else if ( stringNode.charCodeAt( cloneCursorPositionForEnd + 1 ) === 32
        && stringNode.charCodeAt( cloneCursorPositionForEnd ) !== 32 ) { // Text|
        endPosition = cloneCursorPositionForEnd;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[clonedEndPath.length - 1] = endPosition + startOffset + 1;
        while ( stringNode.charCodeAt( cloneCursorPositionForEnd - 1 ) !== 32 && cloneCursorPositionForStart >= 0 ) {
            --cloneCursorPositionForEnd;
        }

        startPosition = cloneCursorPositionForEnd;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[clonedStartPath.length - 1] = startPosition + startOffset;
    } else if ( stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32
        && stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) !== 32 ) { // Te|xt
        while ( stringNode.charCodeAt( cloneCursorPositionForEnd + 1 ) !== 32 && cloneCursorPositionForStart <= stringNode.length ) {
            ++cloneCursorPositionForEnd;
        }
        endPosition = cloneCursorPositionForEnd;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[clonedEndPath.length - 1] = endPosition + startOffset + 1;


        while ( stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) !== 32 && cloneCursorPositionForStart >= 0 ) {
            --cloneCursorPositionForStart;
        }
        startPosition = cloneCursorPositionForStart;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[clonedStartPath.length - 1] = startPosition + startOffset;
    }

    const doc = ckeditor.model.document;
    const root = doc.getRoot();

    ckeditor.model.change( writer => {
        var startPath = clonedStartPath;
        var endPath = clonedEndPath;
        const startPos = writer.createPositionFromPath( root, startPath, 'toNext' );
        const endPos = writer.createPositionFromPath( root, endPath, 'toPrevious' );
        const currentRange = writer.createRange( startPos, endPos );
        writer.setAttribute( 'spanId', commentId, currentRange );
        writer.setAttribute( 'spanStyle', commentStyle, currentRange );
    } );
}

/**
 * Highlight comments when save-reload page
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
export let highlightComments = function( reqMarkupCtx ) {
    processedComments = [];
    halfProcessedComments = [];
    commentIdVsStartPath.clear();
    commentIdVsEndPath.clear();
    var parsedResponse = parseServerResponse( reqMarkupCtx );
    var serverResponse = parsedResponse;
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = exports.getCKEditorInstance( editorId, appCtxSvc.ctx );
    editor.ignoreDataChangeEvent = true;
    var requirementRoot = editor.model.document.getRoot();
    if ( serverResponse && requirementRoot && requirementRoot._children && requirementRoot._children._nodes ) {
        var requirentWidgets = requirementRoot._children._nodes;
        //getting only the requirement widgets which have markups created in them
        _.forEach( serverResponse, function( markupObj ) {
            var revisionId = markupObj.baseObject.uid;
            var markups = _.cloneDeep( markupObj.markups );
            markups.sort( function( a, b ) {
                return a.start.rch - b.start.rch;
            } );
            _.forEach( requirentWidgets, function( requirentWidget ) {
                var currentRevisionid = requirentWidget.getAttribute( 'revisionid' );
                var obj = appCtxSvc.getCtx( 'summaryTableSelectedObjUid' );
                var selectedObjs = appCtxSvc.getCtx( 'selected' );
                if( !currentRevisionid && obj && obj.revID ) {
                    currentRevisionid = obj && obj.revID;
                }else if( !currentRevisionid && !obj ) {
                    var revObject = Arm0DocumentationUtil.getRevisionObject( selectedObjs );
                    currentRevisionid = revObject && revObject.uid;
                }
                if ( revisionId === currentRevisionid ) {
                    var modelPath = requirentWidget.getPath();
                    var cloneModelPath = _.cloneDeep( modelPath );
                    //We don't get accurate model path for <requirementContent>
                    cloneModelPath[1] = 2;
                    cloneModelPath.push( 0 );
                    var requirmentContent = getRequirementContentElement( requirentWidget );
                    var requirmentBodyText = getRequirementBodyContent( requirmentContent );
                    totalRCHParsed = 0;
                    totalCharParsed = 0;
                    getModelPath( requirmentBodyText, editor, cloneModelPath, markups, halfProcessedComments );
                    highlightComment( editor );
                }
            } );
        } );
    }
    editor.ignoreDataChangeEvent = false;
};

/**
 * Convert markup response in json
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
function parseServerResponse( reqMarkupCtx ) {
    if ( reqMarkupCtx && reqMarkupCtx.response && reqMarkupCtx.response.markups ) {
        var json = reqMarkupCtx.response.markups;
        var list = [];
        var escaped = json.replace( /[\u007f-\uffff]/g, function( c ) {
            return '\\u' + ( '0000' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
        } );

        var objs = JSON.parse( escaped, function( key, value ) {
            return key === 'date' ? new Date( value ) :
                key === 'geometry' && typeof value === 'string' ? JSON.parse( value ) : value;
        } );

        for ( var i = 0; i < objs.length; i++ ) {
            var markup = objs[i];
            markup.id = String( list.length );
            markup.displayname = markup.username +
                ( markup.userid.length > 0 ? ' (' + markup.userid + ')' :
                    ' [' + markup.initial + ']' );

            markup.visible = true;
            markup.editMode = null;
            markup.selected = false;
            list.push( markup );
        }
        if( list.length > 0 ) {
            markupViewModel.populateMarkupList( list, json );
        }
        return sortedMarkup( list, reqMarkupCtx.serverReqMarkupsData );
    }
}

/**
 * Get sorted markup object
 *  @param {Object} markups - markups object
 *  @param {Object} serverReqMarkupsData - server requirment markup data
 */
function sortedMarkup( markups, serverReqMarkupsData ) {
    var cloneServerData = _.cloneDeep( serverReqMarkupsData );
    _.forEach( cloneServerData, function( markupObj ) {
        var revisionId = markupObj.baseObject.uid;
        var tempArray = [];
        _.forEach( markups, function( markup ) {
            if ( revisionId === markup.objId ) {
                tempArray.push( markup );
            }
        } );
        markupObj.markups = tempArray;
    } );

    return cloneServerData;
}

/**
 * Get the ckeditor model path
 *  @param {Object} modelReq - Requirement Widget
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} cloneModelPath - the ckeditor model path of the requirement widget
 *  @param {Object} markups - markups object
 */
function getModelPath( modelReq, editor, cloneModelPath, markups, halfProcessedComments ) {
    for ( var i = 0; i < modelReq._children.length; i++ ) {
        var currentNode = modelReq._children._nodes[i];
        updateNodeToSkipCount( currentNode );
        if ( isTextModelNode( currentNode ) ) {
            var text = currentNode._data;
            if ( lastTextParent !== currentNode.parent ) {
                if ( !( lastTextParent && lastTextParent.rootName && lastTextParent.rootName === '$graveyard' ) ) {
                    totalCharParsed = 0;
                }
            }
            var text = currentNode._data;
            var length = text.length;
            totalRCHParsed += length;
            lastTextParent = currentNode.parent;
            totalCharParsed += length;
            for( var j = 0; j < markups.length; j++ ) {
                var startFound = false;
                var endFound = false;
                var markup = markups[ j ];
                var commentId = markup.reqData.commentid;
                var startRch = markup.start.rch;
                var endRch = markup.end.rch;
                var startOffset = -1;
                var endOffset = -1;
                if( startRch <= totalRCHParsed && !processedComments[commentId]
                        && !halfProcessedComments[commentId] ) {
                    var position = totalRCHParsed - totalCharParsed;
                    startOffset = startRch - position;
                    startFound = true;
                    createPath( currentNode, startOffset, commentId, commentIdVsStartPath );
                }
                if( endRch <= totalRCHParsed && !processedComments[commentId] ) {
                    var position = totalRCHParsed - totalCharParsed;
                    endOffset = endRch - position;
                    endFound = true;
                    createPath( currentNode, endOffset, commentId, commentIdVsEndPath );
                    processedComments[commentId] = 'done';
                    delete halfProcessedComments[commentId];
                }
                if( startFound && !endFound ) {
                    halfProcessedComments[commentId] = markup;
                }
            }
        }
        if( currentNode && currentNode._children && currentNode._children._nodes && currentNode._children._nodes.length > 0 ) {
            getModelPath( currentNode, editor, cloneModelPath, markups, halfProcessedComments );
        }
    }
}


/**
 *
 */
function createPath( currentNode, offset, commentId, mapToAdd ) {
    var path = _.cloneDeep( currentNode.getPath() );
    path[ 3 ] -= noOfElementToIgnore;
    path[ path.length - 1 ] = offset;
    mapToAdd.set( commentId, path );
}

/**
 * highlight comments
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} markups - markups object
 */
function highlightComment( editor ) {
    const doc = editor.model.document;
    const root = doc.getRoot();
    for( let [ key, value ] of commentIdVsStartPath.entries() ) {
        var startPath = value;
        var endPath = commentIdVsEndPath.get( key );
        if( startPath && endPath ) {
            if( doc && root ) {
                editor.model.change( writer => {
                    appCtxSvc.ctx.isRequirementsCommentsHighlightInProgress = true;
                    try {
                        const startPos = writer.createPositionFromPath( root, startPath, 'toNext' );
                        const endPos = writer.createPositionFromPath( root, endPath, 'toPrevious' );
                        const currentRange = writer.createRange( startPos, endPos );
                        var preRange = [];
                        var postRange = [];
                        var isEqualRange = getRangesForOverlappedAndNestedComments( editor, writer, key, currentRange, preRange, postRange );
                        createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, key );
                        const range = {};
                        range.range = currentRange;
                        range.usingOperation = false;
                        // set attribute on range
                        /*writer.setAttribute( 'spanId', key, currentRange );
                        writer.setAttribute( 'spanStyle', commentStyle, currentRange );*/
                        if( !editor.model.markers._markers.get( key ) ) {
                            var marker = writer.addMarker( key, range );
                            setMarkerChangeEveneListener( marker );
                            if( !appCtxSvc.ctx.ckeditor5Markers ) {
                                appCtxSvc.ctx.ckeditor5Markers = [];
                            }
                            appCtxSvc.ctx.ckeditor5Markers.push( marker );
                        }
                    } catch ( error ) {
                        //nothing to do here. cannot highlight comment because of invalid range
                    }
                } );
                var currentSpanInserted = document.querySelectorAll( 'span[id*="' + key + '"]' );
                for( var k = 0; k < currentSpanInserted.length; k++ ) {
                    if( currentSpanInserted[ k ] ) {
                        _markupTextInstance.setMarkupEventListeners( currentSpanInserted[ k ] );
                    }
                }
            }
        }
    }
    commentIdVsStartPath.clear();
    commentIdVsEndPath.clear();
}

function getElementByClass( childrens, clasName ) {
    for ( var i = 0; i < childrens.length; i++ ) {
        var sub = childrens[i];
        var classesList = sub._classes;
        if ( classesList && classesList.entries() ) {
            var value = classesList.entries().next().value;
            if ( value && value.includes( clasName ) ) {
                return sub;
            }
        }
    }
}

/**
 *  @param {Object} node - ckeditor node
 */
function updateNodeToSkipCount( node ) {
    if ( isImmediateBodyTextModelNode( node ) ) {
        var claaAttr = node._attrs.get( 'class' );
        if ( claaAttr === 'ck ck-widget__selection-handle' || claaAttr === 'ck ck-reset_all ck-widget__type-around' ) {
            noOfElementToIgnore++;
        }
    }
}

/**
 *  @param {Object} node - ckeditor node
 */
function isTextModelNode( node ) {
    if ( node && node._data ) {
        return true;
    }
    return false;
}

/**
 *  @param {Object} node - ckeditor node
 */
function isBodyTextNodeNode( node ) {
    if ( node && node.name ) {
        return node.name === 'requirementBodyText';
    }
    return false;
}

/**
 *  @param {Object} node - ckeditor node
 */
function isImmediateBodyTextModelNode( node ) {
    if ( node && isBodyTextNodeNode( node.parent ) ) {
        return true;
    }
    return false;
}

function getRequirementContentElement( reqWidget ) {
    if ( !reqWidget ) {
        return null;
    }

    for ( var i = 0; i < reqWidget.childCount; i++ ) {
        for ( var j = 0; j < reqWidget._children._nodes.length; j++ ) {
            if ( reqWidget._children._nodes[j].name === 'requirementContent' ) {
                return reqWidget._children._nodes[j];
            }
        }
    }
}

/**
 *  @param {Object} node - ckeditor node
 */
function getRequirementBodyContent( requirmentContent ) {
    if ( !requirmentContent ) {
        return null;
    }
    var widget = requirmentContent._children._nodes;
    for ( var i = 0; i < widget.length; i++ ) {
        if ( widget[i].name === 'requirementBodyText' ) {
            return widget[i];
        }
    }
}

/**
 * Remove markup spans if present
 * * @param {Object} widgetsToSave - widgets to save
 */
export let removeMarkupSpans = function( widgetsToSave ) {
    var textRoots = widgetsToSave.setContentInput;
    for ( var i = 0; i < textRoots.length; i++ ) {
        if( textRoots[ i ] ) {
            var parentDiv = document.createElement( 'DIV' );
            parentDiv.innerHTML = textRoots[ i ].contents;
            removeMarkupSpansForRequirement( parentDiv );
        }
        textRoots[ i ].contents = parentDiv.innerHTML;
    }
    widgetsToSave.setContentInput = textRoots;
};


/**
 * @param {Element} widgetToSave the requirement div to save
 */
function removeMarkupSpansForRequirement( widgetToSave ) {
    var children = widgetToSave.childNodes;
    for( var j = 0; j < children.length; j++ ) {
        var childNode = children[ j ];
        if( isText( childNode ) ) {
            removeMarkupSpan( childNode );
            arm0MarkupText.removeMarkupSpan( childNode );
        }
        if( childNode.childNodes.length > 0 ) {
            removeMarkupSpansForRequirement( childNode );
        }
    }
}

/**
 * Function to get string representation of the markups
 * @return {String} the markups string
 */
export function stringifyMarkups() {
    var markups = markupViewModel.getMarkups();
    return markupUtil._stringifyRequirementMarkup( markups );
}

/**
 * Checks whether the `node` is a
 * CKEDITOR.plugins.widget#editables
 *
 * @param {CKEDITOR.dom.node} node node
 *
 * @returns {Boolean} element present or not
 */
function isBodyContentElement( node ) {
    if ( !node ) {
        return null;
    }
    if ( node.className && node.className.indexOf( 'aw-requirement-bodytext' ) === 0 ) {
        return true;
    }
    return isBodyContentElement( node.parentNode );
}


/**
 * Remove markup span above a node
 *
 * @param {Node} node - the node to remove markup spans
 */
function removeMarkupSpan( node ) {
    var parent = node.parentNode;
    if ( isMarkupSpan( parent ) ) {
        var grandParent = parent.parentNode;
        var prev = parent.previousSibling;
        var next = parent.nextSibling;
        var first = parent.firstChild;

        if ( prev && prev.nodeName === 'SPAN' && next && next.nodeName === 'SPAN' && first && parent ) {
            prev.appendChild( first );
            for ( var i = 0; i < next.childNodes.length; i++ ) {
                prev.appendChild( next.childNodes[i] );
            }
            grandParent.removeChild( parent );
            grandParent.removeChild( next );
        } else if ( !prev && next && next.nodeName === 'SPAN' && first ) {
            if ( next.childNodes.length > 0 ) {
                next.insertBefore( first, next.childNodes[0] );
                grandParent.removeChild( parent );
            }
        } else if ( prev && prev.nodeName === 'SPAN' && !next && first ) {
            prev.appendChild( first );
            grandParent.removeChild( parent );
        }
    }
}

/**
 * Is object a root?
 *
 * @param {Node} obj The object to be tested
 * @param {boolean} ture if it is
 */
function isRoot( obj ) {
    return !isNaN( obj.rootIndex );
}

/**
 * Is object a span node with markups?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isMarkupSpan( obj ) {
    return obj.nodeName === 'SPAN' && obj.id.indexOf( 'RM::Markup::' ) >= 0;
}

/**
 * Is object a text node?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isText( obj ) {
    return obj.nodeType === 3;
}

/**
 * Is object a selectable text node? Ignore the inter-element white space
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isSelectableText( obj ) {
    return obj.nodeType === 3 && obj.parentNode.nodeType === 1 &&
        ( isMarkupSpan( obj.parentNode ) || obj.nodeValue.match( /\S+/ ) || !isInterElement( obj ) );
}

/**
 * Is object inter-element? Given that it is a white space text node
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isInterElement( obj ) {
    var prev = obj.previousSibling;
    var next = obj.nextSibling;
    var pElem = prev && !isText( prev ) && !isMarkupSpan( prev );
    var nElem = next && !isText( next ) && !isMarkupSpan( next );
    return pElem && nElem || pElem && !next || nElem && !prev;
}

/**
 * Get the first node under the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the first node
 */
function getFirstNode( node ) {
    var first = node;
    while ( first.firstChild ) {
        first = first.firstChild;
    }

    return isSelectableText( first ) ? first : getNextNode( first );
}

/**
 * Get the next node following the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the next node
 */
function getNextNode( node ) {
    var next = node;
    while ( next ) {
        if ( isRoot( next ) ) {
            return null;
        } else if ( next.nextSibling ) {
            return getFirstNode( next.nextSibling );
        }
        next = next.parentNode;
    }

    return null;
}

/**
 * Set Viewer Container for ckeditor and adjust coordinates
 ** @param {Object} viewerContainer - viewerContainer
 */
export let setViewerContainer = function( viewerContainer ) {
    _markupTextInstance.setViewerContainer( viewerContainer, false );
};

/**
 * Recalculate markups
 */
export let recalculateMarkups = function() {
    _markupTextInstance.recalcAllMarkupPositions();
};

/**
 * Returns Arm0MarkupText Instance
 ** @return {Object} Arm0MarkupText - Instance
 */
export let getMarkupTextInstance = function(  ) {
    return _markupTextInstance;
};

/**
 * Shows comments panel
 */
export let showPanelforComments = function( markupCtx ) {
    markupService.showPanelforComments();
};

/**
 * Saves markup edit
 */
export let saveCommentEdit = function( data ) {
    markupService.saveMarkupEdit( data, true );
};

/**
 * Ends markup edit
 */
export let endCommentEdit = function( data ) {
    markupService.endCommentEdit( data );
};

/**
 * initialization for comments
 */
export let initializationForComments = function() {
    var viewerContainer = null;
    markupRequirement.initializeCallbacksforCk5();
    _markupTextInstance.setTextRoot();
    var reqMainPanel = document.getElementsByClassName( 'aw-requirements-mainPanel' );
    if( reqMainPanel.length > 0 ) {
        viewerContainer = reqMainPanel[ 0 ];
        if( viewerContainer ) {
            exports.setViewerContainer( viewerContainer );
        }
    }
    markupService.setLoginUser( true );
    markupViewModel.setRole( 'author' );
};

/**
 * shows the current selected markup
 */
export let markupSelected = function( eventData ) {
    markupService.commentSelected( eventData );
};

/**
 * Delete selected Markup
 */
export let deleteMarkup = function( ) {
    markupService.deleteComment( );
};

/**
 * get Status of Comments
 */
export let getStatusComments = function( markup ) {
    return markupService.getStatusComments( markup, _markupTextInstance );
};

/************************************************************************************************************************
 * This section has functions necessary for Reuse Tool Integration
 * **********************************************************************************************************************
 */

/**
* Get contents of the selected Requirement
*
*/
export let getRequirementContent = function( data ) {
    var content = '';
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    var selectedElement = ckEditor.selectedRequirement;
    var newSelectedElement = ckEditor.newSelectedRequirement;
    var childrens;
    if ( newSelectedElement ) {
        if ( newSelectedElement._children._nodes ) {
            childrens = newSelectedElement._children._nodes;
        } else {
            childrens = newSelectedElement._children;
        }
        content = getContent( childrens, 'aw-requirement-content', false );
    } else if ( selectedElement ) {
        childrens = selectedElement._children;
        content = getContent( childrens, 'aw-requirement-content', false );
    }
    return content + ' ';
};

function getContent( childrens, classToCheck, isHeader ) {
    var content = '';
    for ( var i = 0; i < childrens.length; i++ ) {
        var sub = childrens[i];
        var classesList = sub._classes;
        if ( classesList && classesList.entries() ) {
            var value = classesList.entries().next().value;
            if ( value && value.includes( classToCheck ) ) {
                if ( isHeader ) {
                    content = viewToPlainText( sub.getChild( 0 ).getChild( 1 ) );
                    break;
                } else {
                    content = viewToPlainText( sub.getChild( 0 ) );
                    break;
                }
            }
        }
    }
    return content;
}

/**
 * Converts {@link module:engine/view/item~Item view item} and all of its children to plain text.
 *
 * @param {module:engine/view/item~Item} viewItem View item to convert.
 * @returns {String} Plain text representation of `viewItem`.
 */
function viewToPlainText( viewItem ) {
    const smallPaddingElements = [ 'figcaption', 'li' ];
    let text = '';
    if ( viewItem.is( 'text' ) || viewItem.is( 'textProxy' ) ) {
        // If item is `Text` or `TextProxy` simple take its text data.
        text = viewItem.data;
    } else if ( viewItem.is( 'element', 'img' ) && viewItem.hasAttribute( 'alt' ) ) {
        // Special case for images - use alt attribute if it is provided.
        text = viewItem.getAttribute( 'alt' );
    } else {
        // Other elements are document fragments, attribute elements or container elements.
        // They don't have their own text value, so convert their children.
        let prev = null;
        for ( const child of viewItem.getChildren() ) {
            const childText = viewToPlainText( child );
            // Separate container element children with one or more new-line characters.
            if ( prev && ( prev.is( 'containerElement' ) || child.is( 'containerElement' ) ) ) {
                if ( smallPaddingElements.includes( prev.name ) || smallPaddingElements.includes( child.name ) ) {
                    text += '\n';
                } else {
                    text += '\n\n';
                }
            }
            text += childText;
            prev = child;
        }
    }
    return text;
}


/**
* Get header of the selected Requirement
*
*/
export let getRequirementHeader = function( data ) {
    var content = '';
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    var selectedReq = ckEditor.selectedRequirement;
    var newSelectedElement = ckEditor.newSelectedRequirement;
    var childrens;
    if ( newSelectedElement ) {
        if ( newSelectedElement._children._nodes ) {
            childrens = newSelectedElement._children._nodes;
        } else {
            childrens = newSelectedElement._children;
        }
        content = getContent( childrens, 'aw-requirement-header', true );
    } else if ( selectedReq ) {
        childrens = selectedReq._children;
        content = getContent( childrens, 'aw-requirement-header', true );
    }
    return content;
};

/**
* Update the CkEditor instance
*
*/
export let updateCKEditorInstance = function( qualityShown, calculateInProcess ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    ckEditor.RATData.CALCULATE_QUALITY_IN_PROCESS = calculateInProcess;
};

/**
* showReqQualityData
*
*/
export let showReqQualityData = function( data, _reConnecting ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    if ( !appCtxSvc.ctx.showRequirementQualityData ) {
        // Subscribe an event to know when quality metric tables are visible
        var _registerEventQualityMetricTableVisible = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentLoaded', function() {
            // Fire an event to resize editor once quality metric tables are visible
            eventBus.publish( 'Arm0ShowQualityMetricData.reveal', { ReuseSessionId: data.ReuseSessionId } );
            eventBus.publish( 'requirementsEditor.resizeEditor' );
            eventBus.unsubscribe( _registerEventQualityMetricTableVisible );
        } );

        // Subscribe an event to know when quality metric tables are removed/hidden
        var _registerEventQualityMetricTableHidden = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentUnloaded', function() {
            data.ReuseSessionId = null;
            appCtxSvc.unRegisterCtx( 'showRequirementQualityData' );
            if ( ckEditor ) {
                ckEditor.fire( 'disablePatternAssist' );
            }
            // Fire an event to resize editor once quality metric tables are hidden
            eventBus.publish( 'requirementsEditor.resizeEditor' );
            eventBus.unsubscribe( _registerEventQualityMetricTableHidden );
            // Inform to ckeditor that, Reuse API is disconnected.
            //_updateCKEditorInstance( false, false ); // <--- make this as a common for both
            ckeditorOperations.updateCKEditorInstance( false, false );
        } );

        appCtxSvc.registerCtx( 'showRequirementQualityData', true );
    } else if ( _reConnecting ) {
        eventBus.publish( 'Arm0ShowQualityMetricData.reveal', { ReuseSessionId: data.ReuseSessionId } );
    } else {
        data.ReuseSessionId = null;
        appCtxSvc.unRegisterCtx( 'showRequirementQualityData' );
        if ( ckEditor ) {
            ckEditor.fire( 'disablePatternAssist' );
        }
    }
    var selectedReqId = ckEditor.selectedRequirement ? ckEditor.selectedRequirement._attrs.get( 'id' ) : '';
    if ( selectedReqId.length > 0 && appCtxSvc.ctx.showRequirementQualityData ) {
        attachPatternAssistToggle( document.getElementById( selectedReqId ), ckEditor, false );
    }
};

/**
* qualityRuleSelected
*
*/
export let qualityRuleSelected = function( selectedRule ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    if ( selectedRule && selectedRule.length > 0 && selectedRule[0].props && selectedRule[0].props.instances ) {
        var instances = selectedRule[0].props.instances.uiValue;
        if ( ckEditor ) {
            ckEditor.fire( 'highlightInvalidMetricData', instances );
        }
    } else if ( selectedRule && selectedRule.length === 0 ) {
        if ( ckEditor ) {
            ckEditor.fire( 'clearHighlightInvalidMetricData' );
        }
    }
};

/**
* clearHighlighting
*
*/
export let clearHighlighting = function() {
    //not required for ckeditor 5
};

export let processAfterResponse = function( response ) {
    var instancesArray = [];
    var totalInvalidMetric = 0;
    var metricIdArray = [];
    var qualityData = response.qualityData;
    if ( qualityData && qualityData.metricInvalid ) {
        _.forEach( qualityData.metricInvalid, function( metric ) {
            if ( metric.metricValue && metric.instances.length !== 0 ) {
                var numberMetricValue = parseInt( metric.metricValue );
                totalInvalidMetric += numberMetricValue;
                var tempMetricInstance = metric.instances;
                tempMetricInstance.forEach( function( instance ) {
                    if ( !_contains( instancesArray, instance ) ) {
                        instancesArray.push( instance );
                        metricIdArray.push( metric.metricId );
                    }
                } );
            }
        } );
    }
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    if ( ckEditor ) {
        ckEditor.fire( 'updateCorrectionCount', totalInvalidMetric, instancesArray, metricIdArray );
    }
};


var _contains = function( array, item ) {
    for ( var i in array ) {
        if ( array[i] === item ) {
            return true;
        }
    }
    return false;
};

/**
 * Set CKEditor Template.
 *
 * @param {String} id - CKEditor ID
 * @param {String} template - template to set in CK Editor
 * @param {map} templateMap - template map
 * @param {function} callback - callback function
 */
export let setCKEditorSafeTemplate = function( id, template, templateMap, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    if ( !editor.config.objectTemplateGlobalMap ) {
        editor.config.objectTemplateGlobalMap = [];
    }

    //Sanitize the template. Detect any special "{%keywords}"" here and replace them with "keywords".
    var regex = new RegExp( /\{%(.*?)\}/g );
    for ( var jj = 0; jj < templateMap.length; jj++ ) {
        var realTypeName = templateMap[jj].realTypeName;
        var template = templateMap[jj].template;
        var oldtemplate = template.toString();
        var newtemplate = null;
        var reqkeywords = oldtemplate.match( regex );
        if ( reqkeywords && reqkeywords.length > 0 ) {
            reqkeywords = reqkeywords.toString();
            var splitkeywords = reqkeywords.split( ',' );
            var safeTemplate = oldtemplate;
            //Remove special chars "{%"" and "}" but leave clean prop name.
            for ( var ii = 0; ii < splitkeywords.length; ii++ ) {
                var cleanprop = splitkeywords[ii].replace( '{%', '' );
                cleanprop = cleanprop.replace( '}', '' );
                safeTemplate = safeTemplate.replace( splitkeywords[ii], cleanprop );
            }
            newtemplate = new CKEDITOR5.template( safeTemplate );
            newtemplate = safeTemplate;
        }
        editor.config.objectTemplateGlobalMap.push( {
            realTypeName: realTypeName,
            template: newtemplate ? newtemplate : oldtemplate
            //template: newtemplate ? newtemplate : new CKEDITOR5.template( oldtemplate )
        } );
        if ( template.toLowerCase() === realTypeName.toLowerCase() ) {
            var reqwidget = editor.widgets.registered.requirementWidget;
            reqwidget.template = newtemplate ? newtemplate : oldtemplate;
            //reqwidget.template = newtemplate ? newtemplate : new CKEDITOR5.template( oldtemplate );
        }
    }
};

export let downloadReqQualityReport = function( data ) {
    var jsonRequestData = {};
    jsonRequestData.sessionId = data.ReuseSessionId;
    jsonRequestData.reportRequirements = [];

    var plain_text = '';
    var obj_header = '';
    var url = '';
    var allwidgets = exports.getAllWidgets( appCtxSvc.ctx );
    for ( let index = 0; index < allwidgets.length; index++ ) {
        obj_header = allwidgets[index].header;
        plain_text = allwidgets[index].content;
        url = '/' + data.ProductInfo.projectName + '/' + obj_header.split( ' ' )[0];
        url = url.replace( / /g, '' );
        jsonRequestData.reportRequirements.push( {
            AbsoluteNumber: obj_header,
            Header: '',
            Description: plain_text,
            URL: url,
            AuthorName: '',
            UserName: '',
            LastModificationUser: '',
            Level: 0,
            Code: obj_header,
            VersionCount: 0,
            NumOleObjects: 0,
            ModuleVolatilityCount: 0,
            AuthorEmailAddress: ''
        } );
    }

    return jsonRequestData;
};

export let getAllWidgets = function( ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var doc = document;
    doc.innerHTML = editor.getData();
    var id;
    var header;
    var headerDomElement;
    var content;
    var contentDomElement;
    var widgets = [];
    var allRequirements = doc.getElementsByClassName( 'requirement' );
    for ( let i = 0; i < allRequirements.length; i++ ) {
        id = allRequirements[i].getAttribute( 'id' );
        headerDomElement = allRequirements[i].getElementsByClassName( 'aw-requirement-header' );
        contentDomElement = allRequirements[i].getElementsByClassName( 'aw-requirement-content' );

        if ( headerDomElement[0].innerText.indexOf( '|' ) > 0 ) {
            header = headerDomElement[0].innerText.substr( 0, headerDomElement[0].innerText.indexOf( '|' ) ).trim();
        } else {
            header = headerDomElement[0].innerText.trim();
        }
        content = contentDomElement[0].innerText.replace( /[\n\r]+|[\s]{2,}/g, ' ' ).trim();
        widgets.push( {
            header: header,
            headerDom: headerDomElement[0],
            content: content,
            contentDom: contentDomElement[0],
            id: id
        } );
    }
    return widgets;
};

/**
 * Get Html spec template
 *
 * @param {String} id- CKEditor ID
 * @return content of CKEditor
 */

export let getObjHtmlTemplate = function( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText ) {
    return '<div class="requirement" hastracelink="FALSE" id="' + uniqueID + '" objecttype="' + objType + '" itemtype="' + objType + '" parentid="' + parentId + '" parenttype="' + parentType + '" parentItemType="' + parentType + '">' +

        '<div class = "aw-requirement-header" contenttype="TITLE" contenteditable="false">' +
        '<h3><span class="aw-requirement-headerId aw-requirement-headerNonEditable" contenteditable="false">' +
        strLevel + '</span><span><span class="aw-requirement-title aw-requirement-properties" contenteditable="true" internalname="object_name"> ' + objName + '</span></span></h3>' +
        '</div>' +
        '<div class="aw-requirement-content" contenteditable="FALSE" style="outline:none;">' +
        updatedBodyText +
        '</div>' +
        '</div>';
};

/**
 * If contents of the created object is plain text, wrap it in p tag to make it as a html.
 *
 * @param {String} widgetData - widget content data
 * @returns {String} html contents
 */
var _wrapPlainContentsIntoP = function( widgetData ) {
    var dummyDiv = document.createElement( 'div' );
    dummyDiv.innerHTML = widgetData;
    var reqDiv = dummyDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if ( reqDiv && reqDiv.length > 0 ) {
        var div = reqDiv[0];
        if ( div.childNodes && div.childNodes.length > 0 && div.childNodes[0].nodeType === Node.TEXT_NODE ) {
            var node = div.childNodes[0];
            if ( node.nodeType === Node.TEXT_NODE ) {
                var dummyP = document.createElement( 'p' );
                dummyP.innerHTML = node.nodeValue;
                node.parentNode.replaceChild( dummyP, node );
                widgetData = dummyDiv.innerHTML;
            }
        }
    }
    return widgetData;
};

/**
 * Gets the modified requirement div for checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} changeEvent - changeEvent
 * @param {object} ctx - context object
 *
 * @return  requirement html element
 */

export let getSelectedReqDiv = function( id, changeEvent, ctx ) {
    var reqDiv;
    var idAttr;
    var widget;
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        //one of the differ elements is requirement widget
        var differences = changeEvent.source.model.document.differ;
        var changes = differences && differences.getChanges();
        if ( changes && changes.length > 0 ) {
            var position = changes[0] && changes[0].position;
            var ancestors = position && position.getAncestors();
            if ( ancestors ) {
                for ( var i = 0; i < ancestors.length; i++ ) {
                    var modelElement = ancestors[i];
                    if ( modelElement && modelElement.parent && modelElement.name === 'requirement' ) {
                        reqDiv = modelElement;
                        idAttr = reqDiv.getAttribute( 'id' );
                        break;
                    }
                }
            }
        }
        if ( !reqDiv || reqDiv.getAttribute( 'checkedoutby' ) ) {
            return null;
        }

        //check dirty
        var editor = ctx.AWRequirementsEditor.editor;
        var documentData = editor.getData();
        var doc = document.createElement( 'div' );
        doc.innerHTML = documentData;
        var allwidgets = doc.getElementsByClassName( 'requirement' );

        for ( var index = 0; index < allwidgets.length; index++ ) {
            var domElement = allwidgets[index];
            var idAttribute = domElement.getAttribute( 'id' );

            if ( idAttribute && !idAttribute.startsWith( 'RM::NEW::' ) && idAttr === idAttribute ) {
                var reqTitle = _getTitle( domElement );
                var reqBodyText = _getBodyText( domElement );
                var bodyText = reqBodyText.innerHTML;
                if ( objectInitialContentsMap[idAttribute] === bodyText && objectInitialTitleMap[idAttribute] === reqTitle ) {
                    return null;
                }

                break;
            }
        }
    }
    return {
        widget: widget,
        reqDiv: reqDiv
    };
};

/**
  * Cache original ckeditor content locally, one or more requirement content can be
  * cached.
  * @param {String} htmlContent - html content
 */
var _setOriginalReqHtml = function( htmlContent ) {
    var doc = document.createElement( 'div' );
    doc.innerHTML = htmlContent;
    var allwidgets = doc.getElementsByClassName( 'requirement' );
    for ( var index = 0; index < allwidgets.length; index++ ) {
        var domElement = allwidgets[index];
        var reqId = domElement.getAttribute( 'id' );
        origCkeditorContentMap[reqId] = domElement.outerHTML;
    }
};
/**
  * Get original Requirement content
  * @param {String} idAttribute - requirement Element ID
 */
var _getOriginalReqHtml = function( idAttribute ) {
    return origCkeditorContentMap[idAttribute];
};
/**
 * Sets the contents of the widget to latest or makes it read-only after a failed checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} reqDiv requirement html element
 * @param {IModelObject} reqRev requirement revision
 * @param {Widget} widget CKEditor widget representing the requirement
 * @param {Object} input input data
 * @param {object} ctx - context object
 */

export let setSelectedReqDivData = function( id, reqDiv, reqRev, widget, input, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;

    var idAttribute = reqDiv.getAttribute( 'id' );
    var bodyTextClass = 'aw-requirement-bodytext';

    var originalReqHtml = _getOriginalReqHtml( idAttribute );

    var originalReqDiv = document.createElement( 'div' );
    originalReqDiv.innerHTML = originalReqHtml;

    var ckeditorReqBodyText = originalReqDiv.getElementsByClassName( bodyTextClass )[0];
    var reqHeader = originalReqDiv.getElementsByClassName( 'aw-requirement-header' )[0];
    var reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-properties' )[0];


    var content;
    var title;
    if ( input.mode === 'reset' ) {
        //get original content for req
        content = objectInitialContentsMap[idAttribute];
        title = objectInitialTitleMap[idAttribute];
    }

    var currReqWidget = _getWidgetFromUid( editor, idAttribute );
    if ( currReqWidget ) {
        editor.model.change( writer => {
            writer.removeAttribute( 'checkedoutby', currReqWidget );
            writer.removeAttribute( 'checkedouttime', currReqWidget );
        } );

        if ( input.mode === 'reset' ) {
            if ( input.checkedOutByUpd ) {
                editor.model.change( writer => {
                    writer.setAttribute( 'checkedoutby', input.checkedOutByUpd, currReqWidget );
                    writer.setAttribute( 'checkedouttime', reqRev.props.checked_out_date.uiValues[0], currReqWidget );
                } );
            }
            var element = document.createElement( 'div' );
            element.innerHTML = content;
            var bodyText = element.getElementsByClassName( bodyTextClass );
            if( bodyText ) {
                bodyText = bodyText[ 0 ];
                ckeditorReqBodyText.innerHTML = bodyText.innerHTML;
            } else {
                ckeditorReqBodyText.innerHTML = content;
            }
            ckeditorReqBodyText.setAttribute( 'contentType', 'READONLY' );


            if ( reqTitle ) {
                reqTitle.innerText = title;
            }
            reqACEUtils.setReadOnlyForRequirement( input.data, originalReqDiv.firstElementChild );
            _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML, input.mode );
        } else {
            editor.model.change( writer => {
                writer.setAttribute( 'checkedoutby', reqRev.props.checked_out_user.uiValues[0], currReqWidget );
                writer.setAttribute( 'checkedouttime', reqRev.props.checked_out_date.uiValues[0], currReqWidget );
            } );

            if ( input.contents !== '' ) {
                var reqSpan = document.createElement( 'div' );
                reqSpan.innerHTML = input.contents;
                var bodyText = reqSpan.getElementsByClassName( 'aw-requirement-bodytext' )[0];
                var titleText = reqSpan.getElementsByClassName( 'aw-requirement-header' )[0];

                ckeditorReqBodyText.outerHTML = bodyText.outerHTML;
                objectInitialContentsMap[idAttribute] = ckeditorReqBodyText.innerHTML;
                reqHeader.outerHTML = titleText.outerHTML;
                reqACEUtils.setReadOnlyForRequirement( null, originalReqDiv );
                _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML );
            } else {
                _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML );
            }
        }
    }
};

/**
 * Insert the CrossReference Link into the content
 *
 * @param {String} id - CKEditor ID
 * @param {String} reqObjectID - occurence id
 * @param {String} revID - revision id
 * @param {String} name - revision name
 * @param {String} iconURL - the icon URL
 * @param {object} ctx - context object
 */
export let insertCrossReferenceLink = function( id, reqObjectID, revID, name, iconURL, ctx ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.change( writer => {
            const htmlToInsert = '<div><p class=\'aw-requirement-crossRefLink\' revID="' + revID + '" occID="' + reqObjectID + '">' + name + '</p> </div>';
            const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( htmlToInsert );
            const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );

            if ( iconURL ) {
                const crossRefimage = writer.createElement( 'crossRefimage', {
                    src: iconURL,
                    class: 'aw-requirement-crossRefLink',
                    style: 'cursor:pointer;height:16px;width:16px;float:left;',
                    crossrefimg: 'test'
                } );
                const div = modelFragment.getChild( 0 );
                writer.insert( crossRefimage, writer.createPositionAt( div.getChild( 0 ), 0 ) );
            }
            appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment, appCtxSvc.ctx.AWRequirementsEditor.editor.model.document.selection );
        } );
    }
};

/**
 * Navigate to the cross referenced object
 *
 * @param {Object} crossRefLinkElement - cross referenced element
 * @param {String} id - CKEditor ID
 * @param {object} ctx - context object
 */
export let navigateToCrossReferencedObject = function( crossRefLinkElement, id, ctx ) {
    var revID = crossRefLinkElement && crossRefLinkElement.getAttribute( 'revid' );
    var occID = crossRefLinkElement && crossRefLinkElement.getAttribute( 'occid' );

    var editor = ctx.AWRequirementsEditor.editor;
    var widgetData = editor.model.document.getRoot();

    var objectDivElement;
    for ( var iinstance = 0; iinstance < widgetData.childCount; iinstance++ ) {
        var selectedElement = widgetData.getChild( iinstance );
        var idSelEle = selectedElement.getAttribute( 'id' );

        var reqElement = cdm.getObject( idSelEle );
        var reqRevisionUid;
        if ( reqElement && reqElement.props && reqElement.props.awb0UnderlyingObject ) {
            reqRevisionUid = reqElement.props.awb0UnderlyingObject.dbValues[0];
        }
        if ( occID === idSelEle || reqRevisionUid && revID === reqRevisionUid ) {
            objectDivElement = selectedElement;
            break;
        }
    }

    var openInNewTab = true;

    if ( objectDivElement ) {
        var viewElement = editor.editing.mapper.toViewElement( objectDivElement );
        var view = editor.editing.view;  //view.focus();
        var newselection = view.createSelection( viewElement, 0, { fake: true } );
        view.document.selection._setTo( newselection );
        view.scrollToTheSelection();

        var eventData = {
            objectsToSelect: [ { uid: occID } ]
        };
        eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventData );
        openInNewTab = false;
    }
    if ( openInNewTab ) {
        if ( localeService ) {
            localeService.getTextPromise( 'RequirementsCommandPanelsMessages' ).then(
                function( textBundle ) {
                    var documentationTitle = textBundle.documentationTitle;
                    var urlToNavigate = browserUtils.getBaseURL();
                    urlToNavigate = urlToNavigate + '#/com.siemens.splm.clientfx.tcui.xrt.showObject?uid=' + crossRefLinkElement.getAttribute( 'revid' ) + '&spageId=' + documentationTitle;
                    window.open( urlToNavigate, '_blank' );
                } );
        }
    }
};


/**
 * Service for ckEditorUtils.
 *
 * @member ckEditor5Utils
 */
export default exports = {
    setCKEditorContent,
    getCKEditorContent,
    checkCKEditorDirty,
    setCkeditorDirtyFlag,
    insertImage,
    insertOLE,
    setCkeditorChangeHandler,
    getCKEditorInstance,
    setCKEditorContentAsync,
    clearQualityHighlighting,
    getWidgetData,
    setCkeditorUndoHandler,
    isObjectVisibleInEditor,
    getPropertiesFromEditor,
    updateObjectProperties,
    scrollCKEditorToGivenObject,
    resetUndo,
    updateHtmlDivs,
    setCKEditorSafeTemplate,
    getRequirementContent,
    getRequirementHeader,
    updateCKEditorInstance,
    showReqQualityData,
    qualityRuleSelected,
    clearHighlighting,
    downloadReqQualityReport,
    getAllWidgets,
    getObjHtmlTemplate,
    getAllWidgetData,
    getSelectedReqDiv,
    setSelectedReqDivData,
    insertCrossReferenceLink,
    navigateToCrossReferencedObject,
    renderComment,
    highlightComments,
    removeMarkupSpans,
    setViewerContainer,
    recalculateMarkups,
    getWidePanelWidgetData,
    updateOriginalContentsMap,
    makeRequirementEditable,
    showPanelforComments,
    saveCommentEdit,
    endCommentEdit,
    initializationForComments,
    markupSelected,
    deleteMarkup,
    getStatusComments,
    stringifyMarkups
};

app.factory( 'ckEditor5Utils', () => exports );

