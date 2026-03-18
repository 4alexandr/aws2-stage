// Copyright (c) 2020 Siemens
/* global
   CKEDITOR5
*/

/**
 * Plugin to allow object selection in editor and Allow cross selection from Tree to Editor & Editor to Tree
 */
import eventBus from 'js/eventBus';

let eventToHandleSelectionChangeInPWA;
let postLoadSubscription;
let eventToHandleHeaderClick;
let eventToHandleObjContentClick;

export default class RMCrossSelection extends CKEDITOR5.Plugin {
    init() {
        const editor = this.editor;
        const conversion = this.editor.conversion;
        this._defineCrossRefImageConversion( conversion );

        postLoadSubscription = eventBus.subscribe( 'ckeditor.postLoadSubscription', function() {
            //Listen to mouse event to handle selection change in SWA
            subscribeEventToHandleHeaderClick( editor );

            //Subscribe to an event to handle selection change on click of header title
            subscribeEventToHandleHeaderTitleClick( editor );

            //Subscribe to an event to handle selection change on click of object content
            subscribeEventToHandleObjectContentClick( editor );

            //Subscribe to an event to handle selection change in PWA
            subscribeEventToHandleSelectionChangeInPWA( editor );

            // Add scroll event to handle popup close close issue for firefox
            addEventListenerOnScroll( editor );
       } );

       subscribeEventToHandleHeaderClick( editor );
    }

    destroy() {
        super.destroy();
        eventBus.unsubscribe( eventToHandleSelectionChangeInPWA );
        eventBus.unsubscribe( postLoadSubscription );
        eventBus.unsubscribe( eventToHandleHeaderClick );
        eventBus.unsubscribe( eventToHandleObjContentClick );
    }

    _defineCrossRefImageConversion( conversion ) {
        // cross reference image
        conversion.for( 'downcast' ).elementToElement( {
           model: 'crossRefimage',
           view: ( modelElement, viewWriter ) => renderForCrossRefImage( viewWriter, this.editor, modelElement ),
           converterPriority: 'high'

       } );
       conversion.for( 'upcast' ).elementToElement( {
           view: {
               name: 'img',
               attributes:{ crossrefimg:true }
           },
           model: ( viewElement, modelWriter ) => {
               return modelWriter.createElement( 'crossRefimage', viewElement.getAttributes() );
           },
           converterPriority: 'high'
       } );
   }
}

let selectedReqHeaderViewElement;
let scrollTop;
/**
 *
 * @param {*} viewWriter
 * @param {*} editor
 * @param {*} modelElement
 */
function renderForCrossRefImage( viewWriter, editor, modelElement ) {
    return viewWriter.createUIElement( 'img', modelElement.getAttributes(), function( domDocument, modelElement ) {
        return this.toDomElement( domDocument );
    } );
}
/**
* Method to add event listener on editor scroll
*/
function addEventListenerOnScroll( editor ) {
    let element = document.getElementsByClassName( 'ck-content' );
    if( element && element.length > 0 ) {
        element[0].onscroll = function( e ) {
            if ( navigator.userAgent.indexOf( 'Firefox' ) === -1 || scrollTop !== e.target.scrollTop ) {
                editor.eventBus.publish( 'showActionPopup.close' );
                scrollTop = e.target.scrollTop;
            }
        };
    }
}

/**
* Method to set the selected attribute value
*
* @param {*} editor - contains the editor instance
* @param {*} writer - contains the view writer instance
* @param {*} uid - contains the object uid
*/
export function setSelectedAttributeForView( editor, writer, uid, isAceSelection ) {
    if( selectedReqHeaderViewElement ) { // Unselect previous selection
        writer.setAttribute( 'selected', 'false', selectedReqHeaderViewElement );
    }
    let reqDomElement = document.getElementById( uid );
    let reqViewElement = editor.editing.view.domConverter.domToView( reqDomElement );
    if( reqViewElement && reqViewElement.parent ) {
        let headerDomEle = reqDomElement.getElementsByClassName( 'aw-requirement-header' )[0];
        let headerViewElement = editor.editing.view.domConverter.domToView( headerDomEle );
        writer.setAttribute( 'selected', 'true', headerViewElement );
        selectedReqHeaderViewElement = headerViewElement;

        var view = editor.editing.view;
        var newselection = view.createSelection( reqViewElement, 0, { fake: true } );
        editor.selectedRequirement = reqViewElement;
        view.document.selection._setTo( newselection );
        view.scrollToTheSelection();

        var domroot = editor.editing.view.getDomRoot();
        if( domroot ) {
            scrollTop = domroot.scrollTop;
        }

        var eventData =  {
            requirementElement:headerDomEle,
            isAceSelectionEvent :isAceSelection

         };

         var headerDivElement = eventData.requirementElement;
         var reqElement = headerDivElement && headerDivElement.parentElement;

         performCrossProbing( editor, reqElement, eventData );
    }
}

/**
 * Handles selection changes done in PWA
 *
 * @param {eventdata} eventdata - contains the uid of the selected object
 * @param{*} editor - contains the editor instance
 */
function handleSelectionChangeFromPWA( eventdata, editor ) {
    var uid = eventdata.objectUid;
    var position = editor.model.document.selection.getFirstPosition();

    editor.editing.view.change( writer => {
        setSelectedAttributeForView( editor, writer, uid, true );
    } );

    if( position ) {
        editor.model.change( writer => {
            writer.setSelection( null );
            writer.setSelection( position );
        } );
    }
}

/**
 * Method to subscribe event to handle selection change in PWA.
 *
 * @param{*} editor - contains the editor instance
 */
function subscribeEventToHandleSelectionChangeInPWA( editor ) {
    eventToHandleSelectionChangeInPWA = eventBus.subscribe( 'ckeditor.handleSelectionChange', function( eventData ) {
        handleSelectionChangeFromPWA( eventData, editor );
    } );
}
/**
 * Method to fire event to update element selection in PWA
 *
 * @param{*} idAceElement - contains the object uid
 */
export function updateAceSelectiononClickOfHeader( idAceElement ) {
    var eventData = {
        objectsToSelect: [ { uid: idAceElement } ]
    };
    eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventData );
}

/**
 * Method to subscribe event to handle selection change when click in header title
 * @param {Object} editor -
 */
function subscribeEventToHandleHeaderTitleClick( editor ) {
    eventToHandleHeaderClick = eventBus.subscribe( 'ckeditor.clickedInsideProperty', function( eventData ) {
        var headerTitleDivElement = eventData.requirementElement;
        var reqElement = headerTitleDivElement;

        while ( reqElement !== null && !reqElement.classList.contains( 'requirement' ) ) {
            reqElement = reqElement.parentElement;
        }
        performCrossProbing( editor, reqElement, eventData );
    } );
}

function subscribeEventToHandleObjectContentClick( editor ) {
    eventToHandleObjContentClick = eventBus.subscribe( 'ckeditor.clickedInsideBodyText', function( eventData ) {
        var reqElement = eventData.requirementElement;

        while ( reqElement !== null && !reqElement.classList.contains( 'requirement' ) ) {
            reqElement = reqElement.parentElement;
        }

        performCrossProbing( editor, reqElement, eventData );
    } );
}
/**
 * Method to perform cross probing
 * @param {Object} editor -
 * @param {Object} reqElement -
 * @param {Object} eventData -
 */
function performCrossProbing( editor, reqElement, eventData ) {
    var currentSelected = editor.selectedRequirement;
    var currentSelectedRevID = currentSelected ? currentSelected.getAttribute( 'revisionid' ) : '';
    let reqViewElement = editor.editing.view.domConverter.domToView( reqElement );

    var idAttr = reqElement.getAttribute( 'id' );
    var revidAttr = reqElement.getAttribute( 'revisionId' );
    if ( revidAttr !== currentSelectedRevID  || eventData.isAceSelectionEvent ) { // If non clicked on selected header
        if ( idAttr && idAttr.indexOf( 'RM::NEW::' ) !== 0 && idAttr.indexOf( 'header' ) !== 0 && idAttr.indexOf( 'footer' ) !== 0 ) {
            editor.newSelectedRequirement = undefined;
            editor.isNewrequirementSelected = false;
            editor.editing.view.change( writer => {
                updateAceSelectiononClickOfHeader( idAttr );
                editor.fire( 'updateQualityMatrix', reqViewElement, eventData.requirementElement, false );
            } );
        } else if ( idAttr && idAttr.indexOf( 'RM::NEW::' ) === 0 ) {
            var isIdMismatch = editor.newSelectedRequirement && editor.newSelectedRequirement.getAttribute( 'id' ) !== idAttr;
            if( isIdMismatch ||  !editor.isNewrequirementSelected ) {
                editor.fire( 'updateQualityMatrix', reqViewElement, eventData.requirementElement, true, eventData.targetElement );
            }
            editor.newSelectedRequirement = reqViewElement;
            editor.isNewrequirementSelected = true;
        }
    }
}

/**
 * Method to subscribe event to handle selection change when click on header
 * @param {Object} editor -
 */
function subscribeEventToHandleHeaderClick( editor ) {
    eventToHandleHeaderClick = eventBus.subscribe( 'ckeditor.clickedInsideHeader', function( eventData ) {
        var headerDivElement = eventData.requirementElement;
        var reqElement = headerDivElement && headerDivElement.parentElement;
        performCrossProbing( editor, reqElement, eventData );
    } );
}
