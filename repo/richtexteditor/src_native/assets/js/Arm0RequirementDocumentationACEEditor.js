/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/*global
 MathJax
 */
/**
 * Module for the Requirement Documentation Page
 *
 * @module js/Arm0RequirementDocumentationACEEditor
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import reqACEUtils from 'js/requirementsACEUtils';
import reqUtils from 'js/requirementsUtils';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import ckeditorOperations from 'js/ckeditorOperations';
import soaSvc from 'soa/kernel/soaService';
import addElementTypeHandler from 'js/addElementTypeHandler';
import appCtxSvc from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import dataSourceService from 'js/dataSourceService';
import leavePlaceService from 'js/leavePlace.service';
import notyService from 'js/NotyModule';
import localeService from 'js/localeService';
import _commandService from 'js/command.service';
import commandHandlerService from 'js/commandHandlerService';
import markupUtil from 'js/Arm0MarkupUtil';
import reqQualityDataService from 'js/Arm0RequirementQualityService';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import logger from 'js/logger';
import rmCkeditorService from 'js/Arm0CkeditorService';

var exports = {};

var _data = null;

var eventInsertImage = null;
var eventInsertOle = null;
var eventLoadContentAfterSave = null;

var _singleLeaveConfirmation = null;
var _saveTxt = null;
var _discardTxt = null;

var _requiremenDeletedEventListener = null;
var _registerRefreshDocOnMoveListener = null;

var _refreshOnTracelinkCreationListener = null;
var _refreshOnObjectCreationListener = null;
var _registerAddSelectionListener = null;
var _requiremenReplacedEventListener = null;

var _selectedTooltipObject = null;
var _selectedTracelinkedObject = null;
var _productContextChanged = null;
var _registerQualityDataHandler = null;

var _checkOutUids = [];
var updatedObjetsInput = null;
var isMarkupsAdded = false;
var isEquationsAvailable = false;
var updatedRequirementID = null;

/** SR UID Prefix */
var SR_UID_PREFIX = 'SR::N::';

var PAGE_SIZE = 3;
var DOCUMENTATION_EDIT_CONTEXT = 'DOCUMENTATION_ACE_EDIT_CONTEXT';

/**
 *To subscribe the event productContextChangedEvent so that Documnetation tab gets refreshed every time its revision is changed
 *
 */
export let configurationChanged = function( value ) {
    if ( value && Object.keys( value.aceActiveContext.context.configContext ).length > 0 ) {
        if ( !_productContextChanged ) {
            _productContextChanged = eventBus.subscribe( 'productContextChangedEvent', function() {
                _fireEventOnProductContextChanged();
            } );
        }
    }
};
/**
 * Documnetation page refresh
 */
var _fireEventOnProductContextChanged = function() {
    if ( _productContextChanged ) {
        eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
        eventBus.unsubscribe( _productContextChanged );
        _productContextChanged = null;
    }
};

/**
 *To reset undo of ckeditor
 */
export let resetUndoOfCkeditor = function() {
    if ( _data ) {
        var ckeId = _data.editorProps.id;
        if ( ckeId ) {
            ckeditorOperations.resetUndo( ckeId, appCtxSvc.ctx );
        }
    }
};

/**
 * Get file format type
 *
 * @param {Object} data - The view model data
 * @return {String} true if file format is TEXT, else false
 */
export let isTextDataset = function( fileFormat ) {
    var isText = false;
    if ( fileFormat ) {
        isText = fileFormat === 'TEXT';
    }
    return isText;
};

/**
 * Save to Server.
 *
 * @return {Promise} Promise that is resolved when save edit is complete
 */
export let createUpdateContents = function() {
    var deferred = AwPromiseService.instance.defer();

    if ( _checkCKEditorDirty( _data.editorProps.id ) ) {
        var createUpdateInput = exports.getCreateUpdateInput( _data );

        // if no updates in the editor
        if ( createUpdateInput && createUpdateInput.createInput && createUpdateInput.createInput.length === 0 &&
            createUpdateInput.setContentInput && createUpdateInput.setContentInput.length === 0 && createUpdateInput.markUpInput && createUpdateInput.markUpInput.length === 0 ) {
            appCtxSvc.registerCtx( 'requirementEditorContentChanged', false );
            // markupService.refreshMarkupPanel();
            deferred.resolve();
        } else {
            if ( createUpdateInput && createUpdateInput.createInput && createUpdateInput.createInput.length > 0 ) {
                _data.isResetPrimaryWorkAreaRequired = true;
                exports.resetUndoOfCkeditor();
            }

            if ( !createUpdateInput ) {
                var errorMsg = _data.i18n.invalidObjectName.replace( '{0}', appCtxSvc.ctx.occmgmtContext.topElement.props.object_string.uiValues[0] );
                messagingService.showError( errorMsg );
                deferred.reject( errorMsg );
            } else {
                var input = {
                    createUpdateInput: createUpdateInput
                };

                // Register event to handel load contents after save
                _registerLoadContentEvent();
                _checkOutUids.length = 0;
                var promise = soaSvc.post( 'Internal-AwReqMgmtSe-2019-06-SpecNavigation',
                    'createOrUpdateContents', input );

                promise.then( function( response ) {
                    deferred.resolve( response );
                    // Defect LCS-256062 - update occurrance objects if its header content changed
                    var updatedHeaderUids = appCtxSvc.getCtx( 'arm0ReqDocACEUpdatedHeaderOccUids' );
                    if ( updatedHeaderUids && updatedHeaderUids.length > 0 ) {
                        eventBus.publish( 'Arm0RequirementDocumentationACE.updateOccurrenceObjects' );
                    }
                    // If Access Quality Complaince is "On" then attach Pattern Assist Button and Correction Count
                    if( appCtxSvc.ctx.showRequirementQualityData ) {
                        if( response.ServiceData.created && response.ServiceData.created.length > 0 ) {
                            updatedRequirementID = response.ServiceData.created[response.ServiceData.created.length - 1];
                        }
                        attachPatternAssistButtonAndCorrectionCount();
                    }
                } )
                    .catch( function( error ) {
                        var errMsg = messagingService.getSOAErrorMessage( error );
                        if( _data && _data.i18n ) {
                             messagingService.showWarning( _data.i18n.readOnlyReqCanNotBeEdited + '\n' + errMsg );
                        }
                        deferred.reject( error );
                    } );
            }
        }
    } else {
        // markupService.refreshMarkupPanel();
        deferred.resolve();
    }
    return deferred.promise;
};


/**
 * Attach the Pattern Assist Button and Correction Count upon Save and Cancel Edits.
 */
var attachPatternAssistButtonAndCorrectionCount = function() {
    var selectedReqId;
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    if( ckEditor.newSelectedRequirement ) {
        selectedReqId = ckEditor.newSelectedRequirement ? updatedRequirementID : ckEditor.newSelectedRequirement._attrs.get( 'id' );
    } else {
        selectedReqId = ckEditor.selectedRequirement ? ckEditor.selectedRequirement._attrs.get( 'id' ) : '';
    }
    ckEditor.eventBus.publish( 'Arm0ShowQualityMetricData.toggleButtonClicked', { toggleState: false } );
    attachPatternAssistToggle( document.getElementById( selectedReqId ) );
};

var attachPatternAssistToggle = function( domElement ) {
    var requirementElement = getRequirementElement( domElement );
    if ( requirementElement ) {
        var reqId = requirementElement.getAttribute( 'revisionId' );
        var revElement = cdm.getObject( reqId );
        var isSpecification = revElement && revElement.modelType.typeHierarchyArray.indexOf( 'RequirementSpec Revision' ) >= 0;
        if( !isSpecification || !revElement ) {
            var requirementHeader = requirementElement.getElementsByClassName( 'aw-requirement-header' )[0];
            var toggleButton = requirementHeader.getElementsByClassName( 'aw-requirements-toggleButton1-switch' )[0];
            if ( toggleButton && toggleButton.style.visibility !== 'visible' ) {
                toggleButton.style.visibility = 'visible';
            }
            changeVisibilityOfNavigation( toggleButton );
        }
    }
};

function changeVisibilityOfNavigation( toggleButton ) {
    var h3Element = toggleButton.parentNode;
    if ( h3Element ) {
        var navigationElements = h3Element.getElementsByClassName( 'aw-ckeditor-header-element' );
        if ( navigationElements ) {
            for ( var i = 0; i < navigationElements.length; i++ ) {
                navigationElements[i].style.visibility = 'visible';
            }
        }
    }
}

/**
* @param {*} node - contains the target node clicked
* @returns {*} -
*/
function getRequirementElement( node ) {
    if ( !node ) {
        return null;
    }
    if ( node.classList.contains( 'requirement' ) ) {
        return node;
    }
    return getRequirementElement( node.parentNode );
}

/**
 * Register the event to reload content after content save, which is getting fired when clicked on save command.
 */
var _registerLoadContentEvent = function() {
    eventLoadContentAfterSave = eventBus.subscribe( 'requirementDocumentation.loadContentAfterSave', function() {
        // Unregister events
        var doingReload = true;
        exports.unloadContent( doingReload );
        // Event to load the contents
        eventBus.publish( 'requirementDocumentation.loadContentFromServer' );

        if ( _data.isResetPrimaryWorkAreaRequired ) {
            _data.isResetPrimaryWorkAreaRequired = false;
            eventBus.publish( 'acePwa.reset' );
        }
    }, 'Arm0RequirementDocumentationACEEditor' );
};

/**
 * process HTML BodyText before save.
 *
 * @param {String} content - content with title, properties, body text
 * @return {String} content with updated bodyText
 */
var _preProcessBeforeSave = function( content ) {
    content = reqUtils.correctEndingTagsInHtml( content );
    return content;
};

/**
 * process HTML BodyText.
 *
 * @param {Object} data - view model data
 * @param {String} bodyText - body text
 * @return {String} updated bodyText
 */
var _processBeforeEditing = function( data, bodyText ) {
    var htmlContents = reqACEUtils.correctCSSClassNames( bodyText );

    // Remove &#65279; (ZERO WIDTH NO-BREAK SPACE) character from contents.
    htmlContents = htmlContents.replace( /\&#65279;/g, '' ); //$NON-NLS-1$ //$NON-NLS-2$

    // Correcting tags not required on data to load in ckeditor

    htmlContents = htmlContents.replace( /\n\n/g, '<br />' );

    return htmlContents;
};

/**
 * @param {String} inputs IJsArray
 * @param {String} objectToProcess objectToProcess
 * @param {String} lsd last saved date
 * @param {String} bodyText bodyText
 * @param {String} contentType contentType
 * @return {String} IJsArray for input
 */
var _getSetRichContentInput = function( inputs, objectToProcess, lsd, bodyText, contentType ) {
    inputs.push( {
        objectToProcess: objectToProcess,
        bodyText: bodyText,
        lastSavedDate: lsd,
        contentType: contentType,
        isPessimisticLock: true
    } );

    return inputs;
};

/**
 * Input for save
 *
 * @param {Object} data - view model data
 * @return {String} IJSO for input
 */
export let getCreateUpdateInput = function( data ) {
    var setContentInputJSO = [];
    var createInputJSO = [];
    var input = [];
    var markUpInput = [];

    // Clear highlighting before saving contents
    ckeditorOperations.clearQualityHighlighting( data.editorProps.id, appCtxSvc.ctx );

    var reqmarkupCtx = markupUtil.updateMarkupContext();
    if ( reqmarkupCtx && reqmarkupCtx.reqMarkupsData ) {
        var markupText = ckeditorOperations.getMarkupTextInstance();
        if( markupText ) {
            if( appCtxSvc.ctx.Arm0Requirements.Editor === 'CKEDITOR_5' ) {
                markupText.recalcAllMarkupPositions();
                markupText.doPostProcessing();
            } else {
            markupText.removeAllMarkupSpans();
            }
        }
    }
    var widgetsToSave = ckeditorOperations.getWidgetData( data.editorProps.id, appCtxSvc.ctx, data );
    if ( !widgetsToSave ) {
        return null;
    }
    var setContentData = widgetsToSave.setContentInput;
    updatedObjetsInput = _.cloneDeep( widgetsToSave );
    var createInputData = widgetsToSave.createInput;
    if ( setContentData.length > 0 || createInputData.length > 0 ) {
        input = _getWidgetSaveData( widgetsToSave, data );
        createInputJSO = input.createInput;
        setContentInputJSO = input.setContentInput;
        markUpInput = _getCreateMarkupInput( data );
        if ( reqmarkupCtx && reqmarkupCtx.reqMarkupsData.length > 0 ) {
            isMarkupsAdded = true;
        }
    } else if ( setContentData.length === 0 && createInputData.length === 0 ) {
        markUpInput = _getCreateMarkupInput( data );
        isMarkupsAdded = true;
    }


    var prodCtxt = occMgmtStateHandler.getProductContextInfo();
    var requestPref = {};

    var baseURL = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();

    requestPref.base_url = baseURL;

    var occConfigInfo = reqACEUtils.prepareOccConfigInfo( prodCtxt, false );

    var inputContext = reqACEUtils.prepareInputContext( occConfigInfo, PAGE_SIZE, null, prodCtxt, requestPref );

    return {
        inputCtxt: inputContext,
        createInput: createInputJSO,
        setContentInput: setContentInputJSO,
        markUpInput: markUpInput,
        selectedElement: reqACEUtils.getTopSelectedObject( appCtxSvc.ctx )
    };
};

/**
 * Get Input for save
 *
 * @param{Object} widgetsToSave - widget to be save
 * @param {Object} data - view model data
 * @return {String} IJSO for input
 */
var _getWidgetSaveData = function( widgetsToSave, data ) {
    var setContentInputJSO = [];
    var setContentInput = widgetsToSave.setContentInput;
    var createInputJSO = widgetsToSave.createInput;

    if ( setContentInput !== null && setContentInput.length > 0 ) {
        for ( var i = 0; i < setContentInput.length; i++ ) {
            var updatedRequirement = setContentInput[i];
            var uid = updatedRequirement.uid;
            var contents = updatedRequirement.contents;
            var ele = document.createElement( 'div' );
            ele.innerHTML = contents;
            var eqEle = ele.getElementsByClassName( 'equation' );
            if ( eqEle && eqEle.length > 0 ) {
                isEquationsAvailable = true;
            }
            contents = _preProcessBeforeSave( contents );

            if ( uid !== null && _.includes( uid, SR_UID_PREFIX ) ) {
                var specSegmentContent = reqACEUtils._getSpecSegmentContentFromDivId( data.content, uid );
                if ( specSegmentContent !== null ) {
                    updatedObjetsInput.setContentInput[i].objectToProcess = specSegmentContent.specElemRevision;
                    setContentInputJSO = _getSetRichContentInput( setContentInputJSO,
                        specSegmentContent.specElemRevision, specSegmentContent.lastSavedDate, contents,
                        'REQ_HTML' );
                }
            }
        }
    }
    if ( createInputJSO === null ) {
        createInputJSO = [];
    }
    return {
        createInput: createInputJSO,
        setContentInput: setContentInputJSO
    };
};

export let updateLocallyOrRefreshDocTab = function() {
    if ( !isEquationsAvailable && !isMarkupsAdded && updatedObjetsInput && updatedObjetsInput.createInput && updatedObjetsInput.createInput.length === 0 ) {
        exports.resetUndoOfCkeditor();
        appCtxSvc.registerCtx( 'requirementEditorContentChanged', false );
        eventBus.publish( 'requirementDocumentation.getUpdatedObjectsHTMLTextContent' );
    } else {
        eventBus.publish( 'requirementDocumentation.loadContentAfterSave' );
    }
    isMarkupsAdded = false;
    isEquationsAvailable = false;
};

export let getObjectsToUpdate = function( data ) {
    var exportToAppObjs = [];
    if ( updatedObjetsInput.createInput.length === 0 ) {
        var updatedObjs = updatedObjetsInput.setContentInput;
        for ( var i = 0; i < updatedObjs.length; i++ ) {
            var obj = updatedObjs[i].objectToProcess;
            exportToAppObjs.push( obj );
        }
        data.updateInput = updatedObjetsInput.setContentInput;
    }
    return exportToAppObjs;
};

/**
 * get Export options.
 *
 * @param {Object} data - data
 * @return {Any} array of export options
 */
export let getExportOptions = function() {
    var options = [];
    var baseURL = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
    var requestPref = {
        option: 'base_url',
        optionvalue: baseURL
    };
    options.push( requestPref );

    return options;
};

/**
 * Cancel the check-out for requirements only if they are implicitly checked out
 *
 * @returns {Promise} promise of SOA or null if nothing to cancel
 */
export let cancelCheckOut = function() {
    if ( _data.preferences.REQ_enable_implicit_reserve[0] !== 'true' ) {
        return null;
    }

    var cancelCoInput = {
        objects: []
    };
    _.forEach( _checkOutUids, function( revUid ) {
        var reqRev = cdm.getObject( revUid );
        if ( reqRev ) {
            cancelCoInput.objects.push( reqRev );
        }
    } );

    _checkOutUids.length = 0; // empty the cached object UIDs
    if ( cancelCoInput.objects.length ) {
        // the cancel CO SOA is simply posted without any handling/sequencing for the return
        return soaSvc.post( 'Core-2006-03-Reservation', 'cancelCheckout', cancelCoInput ).then(
            function( results ) {
                _checkOutUids.length = 0;
                return results;
            } );
    }

    return null;
};
/**
 * Cancel all edits made in document
 */
export let cancelEdits = function() {
    exports.cancelCheckOut();
    // TO DO : Markup related code.

    var doingReload = true;
    exports.unloadContent( doingReload );

    exports.resetUndoOfCkeditor();
    // Event to load the saved contents
    eventBus.publish( 'requirementDocumentation.loadContentFromServer' );
};

/**
 * Get NextOccuraceData .
 *
 * @param {Object} data - view model data
 * @param {Object} ctx - ctx
 * @param {Object} inputCtxt -
 * @returns {Array} Next child occ data
 */
var _getNextOccuranceData = function( data, ctx, inputCtxt ) {
    var nextChildOccData = {};

    data.goForward = true;
    var prodCtxt = occMgmtStateHandler.getProductContextInfo();
    if ( prodCtxt ) {
        nextChildOccData = reqACEUtils.getCursorInfoForFirstFetch( prodCtxt, PAGE_SIZE, data.goForward, inputCtxt );
    }

    return nextChildOccData;
};

/**
 * Get Input data for getSpecificationSegment.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInput = function( data, ctx ) {
    var inputCtxt = reqACEUtils.getInputContext();
    return {
        inputCtxt: inputCtxt,
        inputObjects: [ reqACEUtils.getTopSelectedObject( ctx ) ],
        nextOccData: _getNextOccuranceData( data, ctx, inputCtxt ),
        options: [ 'FirstLevelOnly', 'EditMode' ]
    };
};

/**
 * Get Input data for getSpecificationSegment when object created through add panel.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationSegmentInputForCreatedObject = function( data, ctx, createdObject ) {
    var inputCtxt = reqACEUtils.getInputContext();
    return {
        inputCtxt: inputCtxt,
        inputObjects: [ createdObject ],
        nextOccData: _getNextOccuranceData( data, ctx, inputCtxt ),
        options: [ 'FirstLevelOnly', 'EditMode' ]
    };
};

/**
 * update data for fileData
 *
 * @param {Object} fileData - key string value the location of the file
 * @param {Object} data - the view model data object
 */
export let updateFormData = function( fileData, data ) {
    if ( fileData && fileData.value ) {
        var form = data.form;
        data.formData = new FormData( $( form )[0] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * Insert Image
 *
 * @param {Object} data - The panel's view model object
 */
export let insertImage = function( data ) {
    if ( data.fmsTicket ) {
        var imageURL = reqUtils.getFileURLFromTicket( data.fmsTicket );
        var uid = data.createdObject.uid;
        if ( imageURL !== null ) {
            ckeditorOperations.insertImage( data.editorProps.id, imageURL, uid );
        }
    }
};
/**
 * Insert OLE object
 *
 * @param {Object} data - The panel's view model object
 */
export let insertOLE = function( data ) {
    if ( data.fmsTicket ) {
        var oleURL = reqUtils.getFileURLFromTicket( data.fmsTicket );
        var eventData = data.eventMap.eventInsertOLEInCKEditor;
        if ( oleURL !== null && eventData ) {
            var fileName = eventData.file.name;
            var uid = data.createdObject.uid;

            var thumbnailURL = reqACEUtils.getTypeIconURL( data.createdObject.type );

            if ( !thumbnailURL ) {
                thumbnailURL = reqACEUtils.getTypeIconURL( 'Dataset' );
            }

            thumbnailURL = browserUtils.getBaseURL() + thumbnailURL;

            ckeditorOperations.insertOLE( data.editorProps.id, uid, thumbnailURL, fileName, data.createdObject.type );
        }
    }
};

/**
 * Prepare Input for OLE Insert Event
 *
 * @param {Object} data - The panel's view model object
 */
export let prepareInputforOLEInsert = function( data ) {
    if ( data.datasetTypesWithDefaultRelInfo ) {
        var dataset = data.datasetTypesWithDefaultRelInfo[0];
        var objDataset = cdm.getObject( dataset.datasetType.uid );
        var refInfoList = dataset.refInfos;

        var eventData = data.eventMap.eventInsertOLEInCKEditor;

        var fileName = eventData.file.name;
        var fileNameWithoutExt = fileName.replace( '.' + data.fileExtensions, '' );

        var datasetInfo = {
            clientId: fileNameWithoutExt,
            namedReferenceName: refInfoList[0].referenceName,
            fileName: fileName,
            name: fileNameWithoutExt,
            type: objDataset.props.object_string.uiValues[0]

        };
        data.datasetInfo = datasetInfo;
    }
};

/**
 * set OLE object to download
 *
 * @param {Object} data - The panel's view model object
 */
export let setOLEObjectToDownload = function( data ) {
    data.oleObjsToDownload = [];

    if ( data.response && data.response.modelObjects ) {
        var modelObj = reqACEUtils.getObjectOfType( data.response.modelObjects, 'ImanFile' );

        if ( modelObj !== null ) {
            data.oleObjsToDownload = [ modelObj ];
        }
    }
};

/**
 * register Selected Object In Context
 *
 */
export let registerSelectedObjectInCtx = function() {
    var selectedObject = null;
    selectedObject = appCtxSvc.ctx.selected;
    appCtxSvc.registerCtx( 'SelectedObject', selectedObject );
};

/**
 * Handle Referesh and reset Undo editor with delay so ACE has proper selection.
 */
var _handleRefreshAndResetEditor = function() {
    setTimeout( function() {
        exports.handleRefreshDocTab();
        exports.resetUndoOfCkeditor();
    }, 1000 );
};

/**
 * Handles moveoperation.complete event
 *
 * @param {Number} moveOpType - Move Operation type [1=up,2=down]
 */
export let handleMoveOperationComplete = function( moveOpType, eventData ) {
    // Handle move operation in pagination.
    if ( _isPaginationEnabled( _data ) > 0 ) {
        _data.handleMoveOperationInPagination = true;
        _data.movedObject = eventData.objectsToSelect ? eventData.objectsToSelect : appCtxSvc.ctx.selected;
    }
    _handleRefreshAndResetEditor();
};

/**
 * Handles post move operations
 */
export let handleRefreshDocTab = function() {
    if ( !appCtxSvc.ctx.requirementsRefreshDocTab ) {
        if ( editHandler && editHandler.leaveConfirmation ) {
            appCtxSvc.registerCtx( 'requirementsRefreshDocTab', true );
            editHandler.leaveConfirmation( undefined, true ); //doReload - true
        }
    }
};

/**
 * Check if ckeditor instance created before setting contents
 * @param {Object} data - view model data
 */
export let isCkeditorInstanceReady = function( data ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === data.editorProps.id && appCtxSvc.ctx.AWRequirementsEditor.ready ) {
        data.ckeditorReady = true;

        // If content is ready to set
        if ( data.contentReady ) {
            // If ckeditor is ready, set contents
            _preprocessContentsAndSetToEditor( data );

            // Reset the flag
            data.contentReady = false;
        }
    }
};

/**
 * Handle Markup update via Panel like delete and modify
 */
export let handleMarkupUpdate = function( eventData ) {
    if ( eventData.msg === 'delete' ) {
        _markEditorContentChanged();
    }
};

/**
 * Set CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @param {String} content - content to set in CK Editor
 */
var _setCKEditorContent = function( id, content ) {
    setTimeout( function() {
        appCtxSvc.registerCtx( 'requirementEditorContentChanged', false );
        ckeditorOperations.setCKEditorContentAsync( id, content, appCtxSvc.ctx ).then( function() {
            addElementTypeHandler.processTemplatesBeforeEditing( _data ); // get type details once data is set to editor
            if ( content !== '' ) {
                _scrollCKEditorToGivenObject( id, _data.selectedObjectUid );
            }
            _setContentChangeEventHandler( id );
            _setUndoEventHandler( id );
            // markup context set after loading the CK editor content
            eventBus.publish( 'requirementDocumentation.setMarkupContext' );
            if ( _data.selectedObjectUid !== appCtxSvc.ctx.selected.uid ) {
                var eventData = {
                    objectsToSelect: [ { uid: _data.selectedObjectUid } ]
                };
                eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventData );
            }
            // Set context if specification is derived
            var isDerivedSpec = isDerivedSpecificationOpened();
            appCtxSvc.registerCtx( 'isDerivedSpecOpened', isDerivedSpec );
            // If Access Quality Complaince is "On" then attach Pattern Assist Button and Correction Count
            // timeout added so that it is added after content load is finished
                if( appCtxSvc.ctx.showRequirementQualityData ) {
                    setTimeout( () => {
                        attachPatternAssistButtonAndCorrectionCount();
                    }, 200 );
                }
        } );
    }, 0 );
};

/**
 * Function to set context if opened specification is derived
 * @returns {Boolean} - true, if specification is derived
 */
var isDerivedSpecificationOpened = function() {
    var topLine = reqACEUtils.getTopSelectedObject( appCtxSvc.ctx );
    if ( topLine ) {
        var reqDiv = ckeditorOperations.getElementById( _data.editorProps.id, topLine.uid );
        if ( reqDiv ) {
            var bodyTextDiv = reqDiv.getElementsByClassName( 'aw-requirement-bodytext' )[0];
            return bodyTextDiv.getAttribute( 'isDerived' );
        }
    }
};

/**
 * Check out the requirement and retrieve the latest Contents if its updated
 *
 * @param {IModelObject} reqElement - requirement element to checkout
 * @return {Promise} the SOA promise
 */
var _checkoutRequirement = function( reqElement ) {
    var baseUrl = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
    var specContent = reqACEUtils._getSpecSegmentContentFromDivId( _data.content, reqElement.uid );
    var exportInput = {
        input: [ {
            templateName: '',
            applicationFormat: 'HTML',
            objectsToExport: [ specContent.specElemRevision ],
            targetObjectsToExport: [],
            exportOptions: [ {
                option: 'base_url',
                optionvalue: baseUrl
            },
            {
                option: 'ImplicitCheckoutLsd',
                optionvalue: specContent.lastSavedDate
            }
            ],
            recipeSourceObjects: [],
            recipeTargetObjects: [],
            attributesToExport: [],
            objectTemplateInputs: [],
            includeAttachments: false
        } ]
    };
    _checkOutUids.push( specContent.specElemRevision.uid );
    return soaSvc.post( 'Internal-AWS2-2017-06-RequirementsManagement',
        'exportToApplication3', exportInput );
};

/**
 * Check out the revision of its modified based on preference.
 * If the requirement is modified; update the ckeditor contents.
 * If checkout fails; mark the requirement as read-only.
 *
 * @param {Event} changeEvent change event by CKEditor
 */
var _implicitCheckout = function( changeEvent ) {
    if ( _data.preferences.REQ_enable_implicit_reserve[0] !== 'true' ) {
        return;
    }

    var req = ckeditorOperations.getSelectedReqDiv( _data.editorProps.id, changeEvent, appCtxSvc.ctx );
    if ( !req || !req.reqDiv ) {
        return;
    }

    var reqId = req.reqDiv.getAttribute( 'id' );
    if ( reqId.indexOf( 'RM::NEW::' ) >= 0 ) {
        return;
    }
    var awbElement = cdm.getObject( reqId );
    var reqRev = cdm.getObject( awbElement.props.awb0UnderlyingObject.dbValues[0] );
    if ( !reqRev || _.indexOf( _checkOutUids, reqRev.uid ) >= 0 ) {
        return;
    }

    _checkoutRequirement( awbElement ).then(
        function( result ) {
            var contents = '';
            if ( result.transientFileReadTickets && result.transientFileReadTickets.length ) {
                contents = _processBeforeEditing( _data, result.transientFileReadTickets[0] );
            }
            var input = {
                mode: 'set',
                contents: contents,
                data: _data
            };
            ckeditorOperations.setSelectedReqDivData( _data.editorProps.id, req.reqDiv, reqRev, req.widget, input, appCtxSvc.ctx );
        },
        function( error ) {
            _.pull( _checkOutUids, reqRev.uid );
            var checkedOutByUpd = _.get( reqRev, 'props.checked_out_user.uiValues[0]', null );
            var input = {
                mode: 'reset',
                checkedOutByUpd: checkedOutByUpd,
                data: _data
            };
            ckeditorOperations.setSelectedReqDivData( _data.editorProps.id, req.reqDiv, reqRev, req.widget, input, appCtxSvc.ctx );
            var errMsg = messagingService.getSOAErrorMessage( error );
            messagingService.showWarning( _data.i18n.readOnlyReqCanNotBeEdited + '\n' + errMsg );
        } );
};

/**
 * Set CKEditor Content change event handler
 *
 * @param {String} id - CKEditor ID
 */
var _setContentChangeEventHandler = function( id ) {
    ckeditorOperations.setCkeditorChangeHandler( id, _changeEventListener, appCtxSvc.ctx );
};

/**
 * Function to mark Requirement Editor Content Changed and enable Save button

 */
var _markEditorContentChanged = function() {
    if ( !appCtxSvc.ctx.requirementEditorContentChanged ) {
        appCtxSvc.updateCtx( 'requirementEditorContentChanged', true );
        editHandlerService.setActiveEditHandlerContext( DOCUMENTATION_EDIT_CONTEXT );
        _commandService.getCommand( 'Arm0SaveEdits' ).then( function( command ) {
            if ( command ) {
                commandHandlerService.setIsEnabled( command, true );
            }
        } );
    }
};

/**
 * Function to listen content change event of ckeditor.
 * @param {Event} changeEvent change event triggered by ckeditor
 */
var _changeEventListener = function( changeEvent ) {
    if ( appCtxSvc.ctx.propertiesUpdatedInDocumentation ) {
        appCtxSvc.unRegisterCtx( 'propertiesUpdatedInDocumentation' );
        return;
    }
    _implicitCheckout( changeEvent );
    _markEditorContentChanged();
    if ( !appCtxSvc.ctx.requirementEditorContentChanged ) {
        appCtxSvc.updateCtx( 'requirementEditorContentChanged', true );
        _commandService.getCommand( 'Arm0SaveEdits' ).then( function( command ) {
            if ( command ) {
                commandHandlerService.setIsEnabled( command, true );
            }
        } );
    }
    if ( appCtxSvc.ctx.requirementEditorCallUndo ) {
        markupUtil.attachCachedMarkupsToNode();
        // Sometime undo/redo will call the change event twice, So adding timeout to handle the second change event call if any
        setTimeout( function() {
            appCtxSvc.ctx.requirementEditorCallUndo = false;
        }, 100 );
    }

    var markupText = ckeditorOperations.getMarkupTextInstance();
    if( markupText && appCtxSvc.ctx.Arm0Requirements.Editor === 'CKEDITOR_4' ) {
        markupText.recalcAllMarkupPositions();
    }
};

/**
 * Check if pagination is enabled
 *
 * @param {Object} data viewModel object
 */
var _isPaginationEnabled = function( data ) {
    var page_size = 0;
    if ( data.preferences.AWC_req_viewer_page_size ) {
        page_size = parseInt( data.preferences.AWC_req_viewer_page_size[0] );
    }
    if ( page_size > 0 ) {
        return true;
    }
    return false;
};

/**
 * Set CKEditor Content change event handler
 *
 * @param {String} id - CKEditor ID
 */
var _setUndoEventHandler = function( id ) {
    ckeditorOperations.setCkeditorUndoHandler( id, function() {
        appCtxSvc.ctx.requirementEditorCallUndo = true;
    }, appCtxSvc.ctx );
};

/**
 * Scroll CKEditor Content to the given element.
 *
 * @param {String} id- CKEditor ID
 * @param {String} selectedObjectUid- CKEditor ID
 */

var _scrollCKEditorToGivenObject = function( id, selectedObjectUid ) {
    setTimeout( function() {
        ckeditorOperations.scrollCKEditorToGivenObject( id, selectedObjectUid, _isPaginationEnabled( _data ) );
    }, 300 );
};

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id- CKEditor ID
 * @return {Boolean} isDirty
 *
 */

var _checkCKEditorDirty = function( id ) {
    //return ckEditorUtils.checkCKEditorDirty( id ) && appCtxSvc.ctx.requirementEditorContentChanged;
    return appCtxSvc.ctx.requirementEditorContentChanged;
};

/**
 * Get the instance of ckeditor.
 *
 * @param {String} id CKEditor ID
 * @return {Object} editor
 *
 */
var _getCKEditorInstance = function( id ) {
    return ckeditorOperations.getCKEditorInstance( id, appCtxSvc.ctx );
};

/**
 * Sets the localization for the tooltip for checked out icon
 *
 * @param {Object} data viewModel object
 */
var _setTitleText = function( data ) {
    var cke = _getCKEditorInstance( data.editorProps.id );
    var typeObject = _.get( _data, 'content.specContents[0].specElemRevision.modelType', null );
    if ( !typeObject ) {
        return;
    }
    if ( cke ) {
        cke.checkedOutDateTitle = typeObject.propertyDescriptorsMap.checked_out_date.displayName;
        cke.checkedOutByTitle = typeObject.propertyDescriptorsMap.checked_out_user.displayName;
    }
};

/**
 * Allow scrolling after a delay so it will not send scroll event when we manually set scroll event
 * @param {Object} data - The panel's view model object
 */
var _allowScrolling = function( data ) {
    setTimeout( function() {
        data.isScrollAllowed = true;
    }, 300 );
};

/**
 * Refresh Paging related information/commands
 * @param {Object} data - The panel's view model object
 */
var _refreshPaginations = function( data ) {
    if ( _isPaginationEnabled( _data ) ) {
        // unregister Page up down context.
        data.arm0PageUpOrDownAction = false;
        _allowScrolling( data );

        var enableMoveUp = true;
        var enableMoveDown = true;
        if ( data.content.startReached ) {
            enableMoveUp = false;
        }
        if ( data.content.endReached ) {
            enableMoveDown = false;
        }
        _data.handleMoveOperationInPagination = false;
        // Enable ot disable page up or page down button.
        eventBus.publish( 'arm0EnablePageUpButton', { enable: enableMoveUp } );
        eventBus.publish( 'arm0EnablePageDownButton', { enable: enableMoveDown } );
    }
};

/**
 * Initialize Ckeditor
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context object
 */
export let initCkeditor = function( data ) {
    // initialise ckeditor utils based on browser
    if ( appCtxSvc.ctx.Arm0Requirements && appCtxSvc.ctx.Arm0Requirements.Editor ) {
        ckeditorOperations.init( appCtxSvc.ctx.Arm0Requirements.Editor );
        data.editorProps.id = reqUtils.generateCkeditorID();
        data.editorProps.preferences = data.preferences;
    }
    rmCkeditorService.isCkeditorLoaded().then(
        function() {
            data.editorProps.showCKEditor = true;
            eventBus.publish( 'requirement.initCKEditorEvent', {
                pageSize: data.preferences.AWC_req_viewer_page_size[0]
            } );
        } );
};

/**
 * Initialize HTML content after checking the ckeditor version
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context object
 */
export let verifyCkeAndInitContent = function( data, ctx ) {
    var ckeversion = appCtxSvc.getCtx( 'Arm0Requirements.Editor' );
    if ( ckeversion === 'CKEDITOR_4' ) {
        initContent( data, ctx );
    } else {
        loadEquationFonts( data, ctx );
    }
};

/**
 * Get Requirement top Element of Panel.
 *
 * @return {Object} HTML element
 */
var _getRMElement = function() {
    var element = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' );
    if ( !element || element.length <= 0 ) {
        return null;
    }
    return element;
};

/**
 * load the mathjax and fonts data
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context object
 */
var loadEquationFonts = function( data, ctx ) {
    var contentEle = _getRMElement();
    if ( contentEle ) {
        var mathJaxJSFilePath = app.getBaseUrlPath() + '/lib/mathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
        try {
            browserUtils.attachScriptToDocument( mathJaxJSFilePath, function() {
                MathJax.Hub.Queue( [ 'Typeset', MathJax.Hub, contentEle[0] ] );
                MathJax.Hub.Config( { showMathMenu: false } );
                initContent( data, ctx );
            } );
        } finally {
            var scriptElement = document.querySelector( `script[src="${mathJaxJSFilePath}"]` );
            if ( !scriptElement ) {
                initContent( data, ctx );
            }
        }
    }
};

/**
 * Initialize HTML content
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context object
 */
export let initContent = function( data, ctx ) {
    appCtxSvc.unRegisterCtx( 'requirementsRefreshDocTab' ); //Reset refresh tab event on init
    appCtxSvc.unRegisterCtx( 'isReuseDeriveInProgress' );
    appCtxSvc.registerCtx( 'isExportToPDFIsInProgress', false );
    if ( data.content ) {
        _data = data;
        _setTitleText( data );
        var htmlContent = data.content.htmlContents;

        if ( htmlContent && htmlContent.length > 0 ) {
            data.showCKEditor = true;

            if ( data.ckeditorReady ) {
                // If ckeditor is ready, set contents
                _preprocessContentsAndSetToEditor( data );
            } else {
                // If not, set flat to indicate that content is ready to set
                data.contentReady = true;
            }

            // Register edit handler
            _registerEditHandler( data );

            _registerInsertImageAndOLEHandlers( data );

            _registerObjectRemoveHandlers();

            _registerObjectReplacedHandlers();

            _registerRefreshDocOnMove();

            _registerEventToRefreshDocTabOnTracelinkCreation();

            _registerEventToRefreshDocTabOnObjectCreation( data.editorProps.id );

            _registerEventToHandleSelectionOnAdd( data, ctx );

            _registerEventToHandleQualityData( data );

            reqACEUtils.updateViewMode();

            _refreshPaginations( data );
        }
    }
    // Fire an event to register isACEDocumentationTabActive in cxt,
    // which is use to identify that Documentation tab is active in the ACE
    eventBus.publish( 'requirementDocumentation.DocTabLoaded' );
};

/**
 * Pre-process the contetns and set it to editor
 * @param {Object} data - view model object data
 */
var _preprocessContentsAndSetToEditor = function( data ) {
    var htmlContent = data.content.htmlContents;
    htmlContent = _processBeforeEditing( data, htmlContent[0] );

    var elementChild = document.createElement( 'div' );
    elementChild.innerHTML = htmlContent;

    // Check ole before adding marker img tags
    reqUtils.insertTypeIconToOleObjects( elementChild );

    reqACEUtils.updateMarkers( elementChild, data, true ); // true - checkForReadOnlyContents
    _data.selectedObjectUid = appCtxSvc.ctx.selected.uid;

    var startObj = cdm.getObject( data.content.cursor.startOcc.uid );
    if ( startObj && _isPaginationEnabled( data ) ) {
        _data.selectedObjectUid = data.content.cursor.startOcc.uid;
    }
    _setCKEditorContent( data.editorProps.id, elementChild.innerHTML );
};

var _registerObjectRemoveHandlers = function() {
    // Listen for when objects are deleted to the CDM
    if ( !_requiremenDeletedEventListener ) {
        _requiremenDeletedEventListener = eventBus.subscribe( 'cdm.deleted', function( eventData ) {
            // If deleted objects are in the Documentation tab contents, reload the page content.
            if ( eventData.deletedObjectUids && eventData.deletedObjectUids.length > 0 ) {
                if ( _isObjectPresentInContentData( _data, eventData.deletedObjectUids ) ) {
                    // TODO : refresh
                    _handleRefreshAndResetEditor();
                }
            }
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

var _registerObjectReplacedHandlers = function() {
    // Listen for when objects are Replaced to the CDM
    if ( !_requiremenReplacedEventListener ) {
        _requiremenReplacedEventListener = eventBus.subscribe( 'replaceElement.elementReplacedSuccessfully', function( eventData ) {
            // TODO : refresh
            eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Register an event to refresh documentation tab on move operation
 */
var _registerRefreshDocOnMove = function() {
    // Listen for completion of move operations to refresh documentation tab
    if ( !_registerRefreshDocOnMoveListener ) {
        _registerRefreshDocOnMoveListener = eventBus.subscribe( 'requirementDocumentation.refreshDocPageOnMove', function( eventData ) {
            exports.handleRefreshDocTab();
            exports.resetUndoOfCkeditor();
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Register an event to handle selection on adding element
 */
var _registerEventToHandleSelectionOnAdd = function( data, ctx ) {
    // Listen for completion of adding new element
    if ( !_registerAddSelectionListener ) {
        _registerAddSelectionListener = eventBus.subscribe( 'requirementDocumentation.newElementAddedSelectionChange', function() {
            if ( _selectionChangedInPrimaryWorkArea() ) {
                exports.selectionChanged( data, ctx );
            }
            exports.resetUndoOfCkeditor();
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Register an event to refresh documentation tab on tracelink creation
 */
var _registerEventToRefreshDocTabOnTracelinkCreation = function() {
    // Listen for when tracelink created and documentation tab needs refresh
    if ( !_refreshOnTracelinkCreationListener ) {
        _refreshOnTracelinkCreationListener = eventBus.subscribe( 'requirementDocumentation.updateDocumentationTabPostCTL', function( eventData ) {
            if ( eventData.serviceData.partialErrors && eventData.serviceData.partialErrors.length > 0 ) {
                exports.handleRefreshDocTab();
                exports.resetUndoOfCkeditor();
            } else {
                exports.updateDocumentationTabPostCTL( eventData.startItems, eventData.endItems, eventData.outputCreateRelation );
            }
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Register an event to handle Requirement Quality data.
 *
 * @param {Object} data - view model object
 */
var _registerEventToHandleQualityData = function( data ) {
    if ( !_registerQualityDataHandler ) {
        _registerQualityDataHandler = eventBus.subscribe( 'requirementDocumentation.showQualityData', function( eventData ) {
            var response = {
                editorId: data.editorProps.id,
                qualityData: eventData
            };
            // Set quality response data
            reqQualityDataService.setQualityDataResponse( response );

            if ( !appCtxSvc.ctx.showRequirementQualityData ) {
                // Subscribe an event to know when quality metric tables are visible
                var _registerEventQualityMetricTableVisible = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentLoaded', function() {
                    // Fire an event to resize editor once quality metric tables are visible
                    eventBus.publish( 'requirementsEditor.resizeEditor' );
                    eventBus.unsubscribe( _registerEventQualityMetricTableVisible );
                } );

                // Subscribe an event to know when quality metric tables are removed/hidden
                var _registerEventQualityMetricTableHidden = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentUnloaded', function() {
                    // Fire an event to resize editor once quality metric tables are hidden
                    eventBus.publish( 'requirementsEditor.resizeEditor' );
                    eventBus.unsubscribe( _registerEventQualityMetricTableHidden );
                } );

                appCtxSvc.registerCtx( 'showRequirementQualityData', true );
            } else {
                setTimeout( function() {
                    eventBus.publish( 'requirementDocumentation.refreshQualityMetricTable' );
                }, 500 );
            }
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Register an event to Refresh editor content on new object creation
 *
 * @param {String} ckeId - ckeditor id
 */
var _registerEventToRefreshDocTabOnObjectCreation = function( ckeId ) {
    // Listen for when object created using add panel and documentation tab needs refresh
    if ( !_refreshOnObjectCreationListener ) {
        _refreshOnObjectCreationListener = eventBus.subscribe( 'addElement.elementsAdded', function( eventData ) {
            if ( !appCtxSvc.ctx.requirementsRefreshDocTab ) {
                if ( eventData.objectsToSelect.length === 1 ) {
                    var createdObj = eventData.objectsToSelect[0];
                    var selectedObj = appCtxSvc.ctx.selected;
                    var parentObjUID = createdObj.props.awb0Parent.dbValues[0];
                    var addOption = 'SIBLING';
                    if ( appCtxSvc.ctx.selected.uid === parentObjUID ) {
                        addOption = 'CHILD';
                    }

                    // Reset ckeditor's undo state before adding newly created object in the ckeditor; to prevent undo for created object
                    ckeditorOperations.resetUndo( ckeId, appCtxSvc.ctx );

                    eventBus.publish( 'requirementDocumentation.loadContentDataForCreatedObject', {
                        CreatedObject: createdObj,
                        SelectedObject: {
                            uid: selectedObj.uid,
                            type: selectedObj.type
                        },
                        AddOption: addOption
                    } );
                } else {
                    // Refresh the Tab If more than one object copy pasted
                    // TODO - Will remove this when updated getSpecificationSegment is available
                    eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
                }
            }
        }, 'Arm0RequirementDocumentationACEEditor' );
    }
};

/**
 * Initialize HTML content
 *
 * @param {Object} data - The panel's view model object
 */
export let addCreatedContentToEditor = function( data ) {
    if ( data.createdContent ) {
        // Update spec content data for created objects
        _updateSpecContentForCreatedObjects( data );

        // Get HTML data for the created object
        var htmlContents = data.createdContent.htmlContents;
        var contentElement = document.createElement( 'div' );
        contentElement.innerHTML = htmlContents[0];
        var requirementDivElements = contentElement.getElementsByClassName( 'requirement' );
        var requirementAllDivs = document.createElement( 'div' );
        while ( requirementDivElements.length > 0 ) {
            var reqDivElement = requirementDivElements[0];
            requirementAllDivs.appendChild( reqDivElement );
        }
        reqACEUtils.updateMarkers( requirementAllDivs, data );
        var htmlContent = _processBeforeEditing( data, requirementAllDivs.innerHTML );

        var addOption = data.eventMap['requirementDocumentation.loadContentDataForCreatedObject'].AddOption;
        var selectedObj = data.eventMap['requirementDocumentation.loadContentDataForCreatedObject'].SelectedObject;

        var responseData = {
            htmlContent: htmlContent,
            selectedObject: selectedObj,
            addOption: addOption,
            callback: function( reqContent ) {
                ckeditorOperations.updateOriginalContentsMap( reqContent );
            }
        };
        // Event to add the newly created objects in the editor
        eventBus.publish( 'requirementDocumentation.newElementCreatedUsingAddPanel', responseData );
    }
};

/**
 * Append newly created spec contents data in the existing spec content data
 *
 * @param {Object} data - view model data
 */
var _updateSpecContentForCreatedObjects = function( data ) {
    if ( data.content && data.content.specContents && data.createdContent && data.createdContent.specContents ) {
        var createdSpecData = data.createdContent.specContents;

        for ( var index = 0; index < createdSpecData.length; index++ ) {
            var created = createdSpecData[index];
            var occurrenceUid = created.occurrence.uid;
            if ( !_isObjectPresentInContentData( data, [ occurrenceUid ] ) ) {
                data.content.specContents.push( created );
            }
        }
    }
};

/**
 * Update marker on model object update
 *
 * @param {Array} modifiedObjects - Array of modified objects
 */
export let refreshMarkersOnObjectModified = function( modifiedObjects ) {
    if ( _data ) {
        // TODO :: Needs to refactor
        if ( appCtxSvc.ctx.Arm0Requirements && appCtxSvc.ctx.Arm0Requirements.Editor === 'CKEDITOR_5' ) {
            var requirementElementsToBeUpdated = reqACEUtils.getRequirementElementsFromUids( modifiedObjects, true, _getCKEditorInstance( _data.editorProps.id ) );
            if ( requirementElementsToBeUpdated.length > 0 ) {
                for ( var i = 0; i < requirementElementsToBeUpdated.length; i++ ) {
                    var reqElement = requirementElementsToBeUpdated[i];
                    reqACEUtils.updateTracelinkMarkerEle( _data, reqElement, _getCKEditorInstance( _data.editorProps.id ) );
                }
            }
        } else {
            var requirementElementsToBeUpdated = reqACEUtils.getRequirementDivElementsFromUids( modifiedObjects, true, _getCKEditorInstance( _data.editorProps.id ) );
            if ( requirementElementsToBeUpdated.length > 0 ) {
                for ( var i = 0; i < requirementElementsToBeUpdated.length; i++ ) {
                    var reqElement = requirementElementsToBeUpdated[i];
                    reqACEUtils.updateTracelinkMarker( _data, reqElement );
                }
            }
        }
    }
};

/**
 * Register the insert image and insert ole handlers for ckeditor
 *
 * @param {Object} data - The panel's view model object
 */
var _registerInsertImageAndOLEHandlers = function( data ) {
    // Insert OLE Event
    if( eventInsertOle ) {
        eventBus.unsubscribe( eventInsertOle );
        eventInsertOle = null;
    }
    eventInsertOle = eventBus.subscribe( 'requirementDocumentation.InsertOLEInCKEditor', function(
        eventData ) {
        data.eventMap.eventInsertOLEInCKEditor = eventData;
        data.form = eventData.form;

        var fileName = eventData.file.name;
        data.fileExtensions = fileName.split( '.' ).pop();

        eventBus.publish( 'requirementDocumentation.getDatasetTypesWithDefaultRelation' );
    }, 'Arm0RequirementDocumentationACEEditor' );

    // Insert Image Event
    if( eventInsertImage ) {
        eventBus.unsubscribe( eventInsertImage );
        eventInsertImage = null;
    }
    eventInsertImage = eventBus.subscribe( 'requirementDocumentation.InsertImageInCKEditor', function(
        eventData ) {
        var fileName = 'fakepath\\' + eventData.file.name;

        if ( reqUtils.stringEndsWith( fileName.toUpperCase(), '.gif'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.png'.toUpperCase() ) ||
            reqUtils.stringEndsWith( fileName.toUpperCase(), '.jpg'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.jpeg'.toUpperCase() ) ||
                reqUtils.stringEndsWith( fileName.toUpperCase(), '.bmp'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.wmf'.toUpperCase() ) ) {
            data.form = eventData.form;

            var datasetInfo = {
                clientId: eventData.clientid,
                namedReferenceName: 'Image',
                fileName: fileName,
                name: eventData.clientid,
                type: 'Image'
            };

            data.datasetInfo = datasetInfo;

            eventBus.publish( 'requirementDocumentation.InsertObjInCKEditor' );
        } else {
            messagingService.reportNotyMessage( data, data._internal.messages,
                'notificationForImageErrorWrongFile' );
        }
    }, 'Arm0RequirementDocumentationACEEditor' );
};

/**
 * Initialize
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - The panel's view model object
 */
export let selectionChanged = function( data, ctx ) {
    setTimeout( function() {
        data.selectedObjectUid = ctx.selected.uid;
        _scrollCKEditorToGivenObject( data.editorProps.id, data.selectedObjectUid );
    }, 1000 );
};

var _selectionChangedInPrimaryWorkArea = function() {
    var newSelectionUid = appCtxSvc.ctx.selected;
    if ( appCtxSvc.ctx.occmgmtContext && appCtxSvc.ctx.occmgmtContext.currentState ) {
        newSelectionUid = appCtxSvc.ctx.occmgmtContext.currentState.c_uid;
    }
    if ( newSelectionUid && newSelectionUid === _data.selectedObjectUid ) {
        return false;
    }
    return true;
};

/**
 * Register the edit handler
 *
 * @param {Object} data - The panel's view model object
 */
var _registerEditHandler = function( data ) {
    var dataSource = dataSourceService.createNewDataSource( {
        declViewModel: data
    } );

    var startEditFunc = function() {
        var deferred = AwPromiseService.instance.defer();
        deferred.resolve( {} );
        return deferred.promise;
    };

    //create Edit Handler
    var editHandler = exports.createEditHandler( dataSource, startEditFunc );
    //registerEditHandler
    if ( editHandler ) {
        editHandlerService.setEditHandler( editHandler, DOCUMENTATION_EDIT_CONTEXT );
        editHandlerService.setActiveEditHandlerContext( DOCUMENTATION_EDIT_CONTEXT );
        editHandler.startEdit();

        if ( localeService ) {
            localeService.getTextPromise( 'TCUICommandPanelsMessages' ).then(
                function( textBundle ) {
                    _singleLeaveConfirmation = textBundle.navigationConfirmationSingle;
                    _saveTxt = textBundle.save;
                    _discardTxt = textBundle.discard;
                } );
        }
    }
};

/**
 * Call function to cleanup on content unload
 */
export let cleanupOnContentUnloaded = function() {
    appCtxSvc.unRegisterCtx( 'isACEDocumentationTabActive' );

    // call cancelEdits if still in editInProgress
    if ( appCtxSvc.ctx.editInProgress && editHandler && editHandler.cancelEdits && editHandler.getDataSource() ) {
        editHandler.cancelEdits();
    } else {
        appCtxSvc.updateCtx( 'editInProgress', false );
    }
};

/**
 * Remove the handlers and events on content unloading
 * @param {boolean} doingReload - true, in case of reloading the contents
 */
export let unloadContent = function( doingReload ) {
    editHandlerService.removeEditHandler( DOCUMENTATION_EDIT_CONTEXT );
    appCtxSvc.unRegisterCtx( 'requirementEditorContentChanged' );

    leavePlaceService.registerLeaveHandler( null );
    if ( eventInsertImage ) {
        eventBus.unsubscribe( eventInsertImage );
        eventInsertImage = null;
    }
    if ( eventInsertOle ) {
        eventBus.unsubscribe( eventInsertOle );
        eventInsertOle = null;
    }
    if ( eventLoadContentAfterSave ) {
        eventBus.unsubscribe( eventLoadContentAfterSave );
        eventLoadContentAfterSave = null;
    }
    if ( _requiremenDeletedEventListener ) {
        eventBus.unsubscribe( _requiremenDeletedEventListener );
        _requiremenDeletedEventListener = null;
    }
    if ( _refreshOnTracelinkCreationListener ) {
        eventBus.unsubscribe( _refreshOnTracelinkCreationListener );
        _refreshOnTracelinkCreationListener = null;
    }
    if ( _refreshOnObjectCreationListener ) {
        eventBus.unsubscribe( _refreshOnObjectCreationListener );
        _refreshOnObjectCreationListener = null;
    }
    if ( _registerRefreshDocOnMoveListener ) {
        eventBus.unsubscribe( _registerRefreshDocOnMoveListener );
        _registerRefreshDocOnMoveListener = null;
    }
    if ( _registerAddSelectionListener ) {
        eventBus.unsubscribe( _registerAddSelectionListener );
        _registerAddSelectionListener = null;
    }
    if ( _requiremenReplacedEventListener ) {
        eventBus.unsubscribe( _requiremenReplacedEventListener );
        _requiremenReplacedEventListener = null;
    }
    if ( _registerQualityDataHandler ) {
        eventBus.unsubscribe( _registerQualityDataHandler );
        _registerQualityDataHandler = null;
    }

    // unregister the ctx, in case of no reload
    if ( !doingReload ) {
        // Fire an event to unregister isACEDocumentationTabActive in cxt
        eventBus.publish( 'requirementDocumentation.DocTabUnloaded' );
    }
    appCtxSvc.unRegisterCtx( 'reqMarkupCtx' );
    appCtxSvc.unRegisterCtx( 'propertiesUpdatedInDocumentation' );
    appCtxSvc.unRegisterCtx( 'requirementEditorSetData' );
};

/**
 * Update documentation tab on tracelink creation if tracelinked ojects present on the documentation tab
 *
 * @param {Array} startItems - Array of modified objects from start bucket
 * @param {Array} endItems - Array of modified objects from end bucket
 * @param {Object} eventData - created tl object
 */
export let updateDocumentationTabPostCTL = function( startItems, endItems, eventData ) {
    var updatedObjects = [];
    var modelObjects = [];
    var objects = [];
    for ( var i = 0; i < startItems.length; i++ ) {
        updatedObjects.push( startItems[i].uid );
        objects.push( { uid: startItems[i].uid, type: '' } );
        var revObj = _getRevisionObject( startItems[i].uid );
        modelObjects.push( { uid: revObj.uid, type: '' } );
    }
    for ( var i = 0; i < endItems.length; i++ ) {
        updatedObjects.push( endItems[i].uid );
        objects.push( { uid: endItems[i].uid, type: '' } );
        var revObj = _getRevisionObject( endItems[i].uid );
        modelObjects.push( { uid: revObj.uid, type: '' } );
    }

    if ( _isObjectPresentInContentData( _data, updatedObjects, startItems, endItems, eventData ) ) {
        // Refresh
        soaSvc.postUnchecked( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: objects
        } ).then( function( response ) {
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: objects
            } );
            exports.refreshMarkersOnObjectModified( modelObjects );
            exports.resetUndoOfCkeditor();
        } );
    }
};

/**
 * This method is use to iterate the specSegmentArray and return true if any updated object present in the
 * available spec content.
 *
 * @param {Object} data - panels view model data
 * @param {Array} updatedObjectIds - uids of the updated objects
 * @return {Boolean} true, if updated object present on documentation tab
 */
var _isObjectPresentInContentData = function( data, updatedObjectIds, startItems, endItems, eventData ) {
    var flag = false;
    var tracelinkInfo = [];
    var startItemsuids = [];
    var endItemsuids = [];
    var reqElementMO = [];

    if ( startItems !== undefined && endItems !== undefined && eventData !== undefined && eventData.length > 0 ) {
        tracelinkInfo.definingLinksInfo = [];
        tracelinkInfo.complyingLinksInfo = [];
        for ( var i = 0; i < startItems.length; i++ ) {
            startItemsuids.push( startItems[i].uid );
            var definingobjects = {};
            reqElementMO = _getRevisionObject( startItems[i].uid );
            definingobjects.obj = reqElementMO;
            definingobjects.name = '';
            if ( reqElementMO.props.items_tag ) {
                definingobjects.name = reqElementMO.props.items_tag.uiValues[0];
            }
            definingobjects.id = eventData[i].tracelinkObject.uid;
            tracelinkInfo.definingLinksInfo.push( definingobjects );
        }
        for ( var i = 0; i < endItems.length; i++ ) {
            endItemsuids.push( endItems[i].uid );
            var complyingobjects = {};
            reqElementMO = _getRevisionObject( endItems[i].uid );
            complyingobjects.obj = reqElementMO;
            complyingobjects.name = '';
            if ( reqElementMO.props.items_tag ) {
                complyingobjects.name = reqElementMO.props.items_tag.uiValues[0];
            }
            complyingobjects.id = eventData[i].tracelinkObject.uid;
            tracelinkInfo.complyingLinksInfo.push( complyingobjects );
        }
    }
    var tracelinkIndex = 0;
    if ( data.content && data.content.specContents && data.content.specContents.length > 0 ) {
        var specContentData = data.content.specContents;
        for ( var index = 0; index < specContentData.length; index++ ) {
            var specSegmentContent = specContentData[index];
            var occurrenceUid = specSegmentContent.occurrence.uid;
            var revisionUid = specSegmentContent.specElemRevision.uid;
            if ( updatedObjectIds.indexOf( occurrenceUid ) >= 0 || updatedObjectIds.indexOf( revisionUid ) >= 0 ) {
                flag = true;
                if ( startItems && startItems.length > 0 && endItems && endItems.length > 0 && eventData && eventData.length > 0 ) {
                    if ( startItemsuids.indexOf( occurrenceUid ) >= 0 || startItemsuids.indexOf( revisionUid ) >= 0 ) {
                        if ( tracelinkInfo.complyingLinksInfo.length !== eventData.length ) {
                            tracelinkIndex = startItemsuids.indexOf( occurrenceUid ) >= 0 ? startItemsuids.indexOf( occurrenceUid ) : startItemsuids.indexOf( revisionUid );
                            var complyingLinksInfoCopy = [];
                            complyingLinksInfoCopy = JSON.parse( JSON.stringify( tracelinkInfo.complyingLinksInfo ) );
                            complyingLinksInfoCopy[0].id = eventData[tracelinkIndex].tracelinkObject.uid;
                            specSegmentContent.tracelinkInfo.complyingLinksInfo = specSegmentContent.tracelinkInfo.complyingLinksInfo.concat( complyingLinksInfoCopy );
                        } else {
                            specSegmentContent.tracelinkInfo.complyingLinksInfo = specSegmentContent.tracelinkInfo.complyingLinksInfo.concat( tracelinkInfo.complyingLinksInfo );
                        }
                        specSegmentContent.tracelinkInfo.numOfLinks += endItems.length;
                    }
                    if ( endItemsuids.indexOf( occurrenceUid ) >= 0 || endItemsuids.indexOf( revisionUid ) >= 0 ) {
                        if ( tracelinkInfo.definingLinksInfo.length !== eventData.length ) {
                            tracelinkIndex = endItemsuids.indexOf( occurrenceUid ) >= 0 ? endItemsuids.indexOf( occurrenceUid ) : endItemsuids.indexOf( revisionUid );
                            var definingLinksInfoCopy = [];
                            definingLinksInfoCopy = JSON.parse( JSON.stringify( tracelinkInfo.definingLinksInfo ) );
                            definingLinksInfoCopy[0].id = eventData[tracelinkIndex].tracelinkObject.uid;
                            specSegmentContent.tracelinkInfo.definingLinksInfo = specSegmentContent.tracelinkInfo.definingLinksInfo.concat( definingLinksInfoCopy );
                        } else {
                            specSegmentContent.tracelinkInfo.definingLinksInfo = specSegmentContent.tracelinkInfo.definingLinksInfo.concat( tracelinkInfo.definingLinksInfo );
                        }
                        specSegmentContent.tracelinkInfo.numOfLinks += startItems.length;
                    }
                }
            }
        }
    }
    return flag;
};

/**
 * Edit Handler
 */
var editHandler = {
    // Mark this handler as native -
    isNative: true,
    _editing: false
};

/* Start - Edit and Save Handlers */

/**
 *
 * @param {Object} dataSource    dataSource
 * @param {Object} startEditFunction startEdit function
 * @returns {Object} editHandler editHandler
 */
export let createEditHandler = function( dataSource, startEditFunction ) {
    editHandler.getEditHandlerContext = function() {
        return DOCUMENTATION_EDIT_CONTEXT;
    };
    var _startEditFunction = startEditFunction; // provided function refs for start/save.

    /**
     * @param {String} stateName - edit state name ('starting', 'saved', 'cancelling')
     */
    function _notifySaveStateChanged( stateName ) {
        if ( dataSource ) {
            switch ( stateName ) {
                case 'starting':
                    break;
                case 'saved':
                    dataSource.saveEditiableStates();
                    break;
                case 'canceling':
                    dataSource.resetEditiableStates();
                    break;
                default:
                    logger.error( 'Unexpected stateName value: ' + stateName );
            }

            editHandler._editing = stateName === 'starting';
            // Add to the appCtx about the editing state

            appCtxSvc.updateCtx( 'editInProgress', editHandler._editing );

            var context = {
                state: stateName
            };
            context.dataSource = dataSource.getSourceObject();
        }
        eventBus.publish( 'editHandlerStateChange', context );
    }

    /*Start editing*/
    editHandler.startEdit = function() {
        var defer = AwPromiseService.instance.defer();
        _startEditFunction().then( function( response ) {
            _notifySaveStateChanged( 'starting' );
            defer.resolve( response );
        }, function( err ) {
            defer.reject( err );
        } );

        // Remove leave handler if already registered
        leavePlaceService.registerLeaveHandler( null );

        //Register with leave place service
        leavePlaceService.registerLeaveHandler( {
            okToLeave: function( targetNavDetails ) {
                var stillInDocTab = targetNavDetails.targetSearch && targetNavDetails.targetSearch.spageId && targetNavDetails.targetSearch.spageId === _data.i18n.documentationTitle;
                if ( !stillInDocTab ) {
                    // Handle if leaving Documentation tab
                    return editHandler.leaveConfirmation( targetNavDetails );
                }
                var defer = AwPromiseService.instance.defer();
                defer.resolve();
                var self = this;
                setTimeout( function() {
                    // Re-Register the leave handler again
                    leavePlaceService.registerLeaveHandler( self );
                }, 100 );
                return defer.promise;
            }
        } );

        return defer.promise;
    };

    /**
     * Can we start editing?
     *
     * @return {Boolean} true if we can start editing
     */
    editHandler.canStartEdit = function() {
        return dataSource.canStartEdit();
    };

    /**
     * Is an edit in progress?
     *
     * @return {Boolean} true if we're editing
     */
    editHandler.editInProgress = function() {
        return false;
    };

    /**
     * @param {boolean} noPendingModifications  pending Notifications
     */
    editHandler.cancelEdits = function( noPendingModifications, doReload ) {
        exports.cancelCheckOut();
        leavePlaceService.registerLeaveHandler( null );
        _notifySaveStateChanged( 'canceling' );
        // Event to unregister the events & handlers
        exports.unloadContent( doReload );
        var activeCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
        if ( reqACEUtils.viewModeChanged() || doReload || _data.arm0PageUpOrDownAction ) {
            // TO DO : Markup related code.
            // Event to load the contents
            eventBus.publish( 'requirementDocumentation.loadContentFromServer' );
        } else {
            // TO DO : Markup related code.
        }
    };

    /*Save Edits*/
    editHandler.saveEdits = function( doReload ) {
        var deffer = AwPromiseService.instance.defer();
        var promise = exports.createUpdateContents();
        promise.then( function() {
            // Event to unregister the events & handlers
            exports.unloadContent( doReload );
            if ( reqACEUtils.viewModeChanged() || appCtxSvc.ctx.requirementsRefreshDocTab || doReload || _data.arm0PageUpOrDownAction ) {
                // Event to load the contents
                eventBus.publish( 'requirementDocumentation.loadContentFromServer' );
            } else {
                var activeCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
                if ( activeCommand && activeCommand.commandId === 'Arm0MarkupMain' ) { // If panel is already active
                    // Remove panel from this JS.
                    eventBus.publish( 'complete', { source: 'toolAndInfoPanel ' } );
                    appCtxSvc.registerCtx( 'activeToolsAndInfoCommand', undefined );
                }
            }
            if ( _data.isResetPrimaryWorkAreaRequired ) {
                _data.isResetPrimaryWorkAreaRequired = false;
                eventBus.publish( 'acePwa.reset' );
            }
            deffer.resolve();
        } )
            .catch( function( error ) {
                // Event to unregister the events & handlers
                exports.unloadContent();
                deffer.reject( error );
            } );
        return deffer.promise;
    };

    /*Check if diagram IS Dirty */
    editHandler.isDirty = function() {
        var deffer = AwPromiseService.instance.defer();
        deffer.resolve( _checkCKEditorDirty( _data.editorProps.id ) );
        return deffer.promise;
    };

    /**
     *
     * @param {String} label button label
     * @param {AsyncFUnction} callback callBack
     * @returns {Object} button Object
     */
    function createButton( label, callback ) {
        return {
            addClass: 'btn btn-notify',
            text: label,
            onClick: callback
        };
    }

    editHandler.getDataSource = function() {
        return dataSource;
    };

    editHandler.destroy = function() {
        dataSource = null;
    };

    //message Showing as Popup
    editHandler.displayNotificationMessage = function( doReload ) {
        //If a popup is already active just return existing promise
        if ( !editHandler._deferredPopup ) {
            editHandler._deferredPopup = AwPromiseService.instance.defer();
            var message = _singleLeaveConfirmation;
            message = _singleLeaveConfirmation.replace( '{0}', appCtxSvc.ctx.occmgmtContext.topElement.props.object_string.uiValues[0] );

            var buttonArray = [];
            buttonArray.push( createButton( _discardTxt, function( $noty ) {
                $noty.close();
                editHandler.cancelEdits( true, doReload );
                editHandler._deferredPopup.resolve();
                editHandler._deferredPopup = null;

                if ( appCtxSvc.ctx.requirementsRefreshDocTab ) {
                    appCtxSvc.unRegisterCtx( 'requirementsRefreshDocTab' );
                }
            } ) );

            buttonArray.push( createButton( _saveTxt, function( $noty ) {
                $noty.close();
                editHandler.saveEdits( doReload ).then( function() {
                    editHandler._deferredPopup.resolve();
                    editHandler._deferredPopup = null;
                    //incase of error
                }, function() {
                    editHandler._deferredPopup.resolve();
                    editHandler._deferredPopup = null;
                } );
            } ) );

            notyService.showWarning( message, buttonArray );
        }

        return editHandler._deferredPopup.promise;
    };

    /**
     *   This is editHandler leaveConfirmation in which call comes for editHandlerService
     *   if viewMode Has been Changed to any of the summary view to Non summary view then directly show the PopUp
     *
     *   @param {Object} callback callBack Function
     *   @returns {leaveConfirmation}  promise Object
     */
    editHandler.leaveConfirmation = function( callback, doReload ) {
        return leaveConfirmation( callback, doReload );
    };

    /**
     * This is the common code of leaveConfirmation
     *
     * @param {Object} callback callBack Function
     * @returns {deferred.promise}  promise Object
     */
    var leaveConfirmation = function( callback, doReload ) {
        var deferred = AwPromiseService.instance.defer();
        // Should not show notification if selected changed in primary workarea
        if ( !_selectionChangedInPrimaryWorkArea() && !reqACEUtils.viewModeChanged() || appCtxSvc.ctx.requirementsRefreshDocTab ) {
            if ( _checkCKEditorDirty( _data.editorProps.id ) ) {
                return editHandler.displayNotificationMessage( doReload ).then( function() {
                    if ( _.isFunction( callback ) ) {
                        callback();
                    }
                    deferred.resolve();
                } );
            } else if ( appCtxSvc.ctx.requirementsRefreshDocTab ) {
                eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
            }

            if ( dataSource && dataSource.hasxrtBasedViewModel() && editHandler.editInProgress() ) {
                _notifySaveStateChanged( 'saved' );
            }
        }
        if ( reqACEUtils.viewModeChanged() ) {
            setTimeout( function() {
                reqACEUtils.updateViewMode();
                _registerEditHandler( _data );
            }, 100 );
        }
        if ( _.isFunction( callback ) ) {
            callback();
        }
        deferred.resolve();
        return deferred.promise;
    };

    return editHandler;
};

/* End - Edit and Save Handlers */

/**
 * get Revision Object.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {Object} Revision Object
 */
var _getRevisionObject = function( uid ) {
    var sourceOcc = cdm.getObject( uid );
    if ( sourceOcc && sourceOcc.props && sourceOcc.props.awb0UnderlyingObject ) {
        return cdm.getObject( sourceOcc.props.awb0UnderlyingObject.dbValues[0] );
    }
    return sourceOcc;
};
/**
 * Remove deleted tracelinks from the tracelink info
 *
 * @param {String} typeName - type name
 * @param {String} typeHierarchy - type Hierarchy separated by comma
 */
var _deleteObjectFromTracelinkInfo = function( tracelinkInfo, uidToDelete ) {
    if ( tracelinkInfo ) {
        // Defining Links
        for ( var i = tracelinkInfo.definingLinksInfo.length - 1; i >= 0; i-- ) {
            var definingLinkInfo = tracelinkInfo.definingLinksInfo[i];
            if ( definingLinkInfo.obj.uid === uidToDelete ) {
                tracelinkInfo.definingLinksInfo.splice( i, 1 );
                tracelinkInfo.numOfLinks -= 1;
            }
        }

        // Complying Links
        for ( var i = tracelinkInfo.complyingLinksInfo.length - 1; i >= 0; i-- ) {
            var complyingLinkInfo = tracelinkInfo.complyingLinksInfo[i];
            if ( complyingLinkInfo.obj.uid === uidToDelete ) {
                tracelinkInfo.complyingLinksInfo.splice( i, 1 );
                tracelinkInfo.numOfLinks -= 1;
            }
        }
    }
};

/**
 * Return the selected tracelinked objects
 *
 * @return {Array} Array of model objects
 */
export let getTracelinkedObjects = function() {
    var modelObjects = [];
    if ( _selectedTracelinkedObject ) {
        modelObjects.push( { uid: _selectedTracelinkedObject.uid, type: '' } );
    }
    if ( _selectedTooltipObject ) {
        modelObjects.push( { uid: _selectedTooltipObject.uid, type: '' } );
    }

    return modelObjects;
};

/**
 * Delete tracelinked object from the tooltip data.
 */
export let deleteTracelinkFromTooltipInAce = function( data ) {
    var _selectedSpecContentInfo = null;
    var _specContentData = null;

    if ( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.uid ) {
        _selectedTooltipObject = appCtxSvc.ctx.selected;
    }

    if ( _selectedTooltipObject ) {
        _selectedTracelinkedObject = cdm.getObject( data.selectedCell.id );

        if ( _data.content.specContents ) {
            _specContentData = _data.content.specContents;
        }
        if ( _specContentData.length > 0 && _selectedTooltipObject ) {
            // Get specContent for selected element
            for ( var i = 0; i < _specContentData.length; i++ ) {
                var specContent = _specContentData[i];
                if ( specContent && specContent.occurrence && specContent.occurrence.uid === _selectedTooltipObject.uid ) {
                    _selectedSpecContentInfo = specContent;
                    break;
                }
            }
        }

        var objects = exports.getTracelinkedObjects();
        var sourceObj = cdm.getObject( _selectedTooltipObject.uid );
        var sourceObjRev = cdm.getObject( sourceObj.props.awb0UnderlyingObject.dbValues[0] );
        if ( sourceObjRev ) {
            objects.push( sourceObjRev );
        }
        soaSvc.postUnchecked( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: objects
        } ).then( function( response ) {
            var modelObjects = exports.getTracelinkedObjects();
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: modelObjects
            } );
            var tracelinkInfo = _selectedSpecContentInfo.tracelinkInfo;
            _deleteObjectFromTracelinkInfo( tracelinkInfo, _selectedTracelinkedObject.uid );
            var tracelinkInfoOfSelectedTracelinkedObject;
            // Get specContent for selected elementdt co
            for ( var i = 0; i < _specContentData.length; i++ ) {
                var specContent = _specContentData[i];
                var sourceRev = _getRevisionObject( specContent.occurrence.uid );
                if ( sourceRev && sourceRev.uid === _selectedTracelinkedObject.uid ) {
                    tracelinkInfoOfSelectedTracelinkedObject = specContent.tracelinkInfo;
                    break;
                }
            }
            var selectedTooltipObjectRev = _getRevisionObject( _selectedTooltipObject.uid );
            if ( selectedTooltipObjectRev && selectedTooltipObjectRev.uid ) {
                _deleteObjectFromTracelinkInfo( tracelinkInfoOfSelectedTracelinkedObject, selectedTooltipObjectRev.uid );
            }
            var modifiedObjects = exports.getTracelinkedObjects();
            var eventData = {};
            eventData.modifiedObjects = modifiedObjects;
            eventBus.publish( 'requirementDocumentation.refreshTracelinkMarkers', eventData );
        } );
    }
};

var _getCreateMarkupInput = function( data ) {
    return markupUtil.getCreateMarkupInput( data.content );
};

/**
 * Set markup context
 *
 * @param {Object} data - view model data
 */
export let setMarkupContext = function( data ) {
    markupUtil.setMarkupContext( data );
};

/**
 * Update markups
 */
export let updateMarkups = function() {
    // TO DO : Markup related code.
};
export let documentationTabRefresh = function() {
    eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
};

/**
 * update occurrence objects
 *
 * @param { Array } updatedHeaderOccUids - updated header occurence uids
 * @param { Object } data - view model data
 *
 */
export let updateOccurrenceObjects = function( updatedHeaderOccUids, data ) {
    var occurrenceObjectToUpdate = [];
    if ( updatedHeaderOccUids && updatedHeaderOccUids.length > 0 ) {
        for ( var i = 0; i < updatedHeaderOccUids.length; i++ ) {
            if ( data && data.content && data.content.specContents && data.content.specContents.length > 0 ) {
                for ( var j = 0; j < data.content.specContents.length; j++ ) {
                    if ( data.content.specContents[j].occurrence.uid === updatedHeaderOccUids[i] ) {
                        var objecInfo = {};
                        objecInfo.uid = data.content.specContents[j].occurrence.uid;
                        objecInfo.type = data.content.specContents[j].occurrence.type;
                        occurrenceObjectToUpdate.push( objecInfo );
                    }
                }
            }
        }
        var eventData = {
            occurrenceObjectToUpdate: occurrenceObjectToUpdate
        };
        appCtxSvc.unRegisterCtx( 'arm0ReqDocACEUpdatedHeaderOccUids' );
        eventBus.publish( 'Arm0RequirementDocumentationACE.refreshOccurenceObjects', eventData );
    }
};

/**
 * Set Scrolling direction.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @param {Object} source - Scrolling source VIEWER/CKEDITOR
 * @param {Object} goForward - if true scroll down else scroll up
 */
export let setScrollingDirection = function( data, ctx, source, goForward ) {
    if ( data.isScrollAllowed ) {
        data.goForward = goForward;
        data.isFetchRequired = false;

        if ( _checkCKEditorDirty( data.editorProps.id ) ) {
            if ( editHandler && editHandler.leaveConfirmation ) {
                data.arm0PageUpOrDownAction = true;
                editHandler.leaveConfirmation();
            }
        } else {
            data.isFetchRequired = true;
        }

        if ( data.isFetchRequired ) {
            data.arm0PageUpOrDownAction = true;
            eventBus.publish( 'requirementDocumentation.loadContentFromServer' );
        }
    }
};
export let confirmSaveEdits = function() {
    if ( _checkCKEditorDirty( _data.editorProps.id ) ) {
        editHandler.displayNotificationMessage( true );
    }
};

export default exports = {
    configurationChanged,
    confirmSaveEdits,
    resetUndoOfCkeditor,
    createUpdateContents,
    getCreateUpdateInput,
    cancelCheckOut,
    cancelEdits,
    getSpecificationSegmentInput,
    getSpecificationSegmentInputForCreatedObject,
    updateFormData,
    insertImage,
    insertOLE,
    prepareInputforOLEInsert,
    setOLEObjectToDownload,
    registerSelectedObjectInCtx,
    handleMoveOperationComplete,
    handleRefreshDocTab,
    isCkeditorInstanceReady,
    initCkeditor,
    verifyCkeAndInitContent,
    initContent,
    addCreatedContentToEditor,
    refreshMarkersOnObjectModified,
    selectionChanged,
    unloadContent,
    updateDocumentationTabPostCTL,
    createEditHandler,
    getTracelinkedObjects,
    deleteTracelinkFromTooltipInAce,
    setMarkupContext,
    updateMarkups,
    documentationTabRefresh,
    updateOccurrenceObjects,
    isTextDataset,
    cleanupOnContentUnloaded,
    updateLocallyOrRefreshDocTab,
    getObjectsToUpdate,
    getExportOptions,
    setScrollingDirection,
    handleMarkupUpdate
};
/**
 * This is Custom Preview for Requirement revision.
 *
 * @memberof NgServices
 * @member Arm0RequirementDocumentationACEEditor
 */
app.factory( 'Arm0RequirementDocumentationACEEditor', () => exports );
