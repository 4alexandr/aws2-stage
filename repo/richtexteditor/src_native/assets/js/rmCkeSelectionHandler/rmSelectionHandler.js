// Copyright (c) 2020 Siemens

/* global
   CKEDITOR5
*/

/**
 * Plugin to Handle Click event and fire appropriate event
 */
import eventBus from 'js/eventBus';

const REQ_BODYTEXT_CLASS = 'aw-requirement-bodytext';
const REQ_PROPERTY_CLASS = 'aw-requirement-properties';
const REQ_HEADER_CLASS = 'aw-requirement-header';
const REQ_CROSS_REF_LINK = 'aw-requirement-crossRefLink';

export default class RMSelectionHandler extends CKEDITOR5.Plugin {
    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add( 'rmSelectionHandler', new RMSelectionHandler( editor ) );
        const viewDocument = editor.editing.view.document;

        editor.listenTo( viewDocument, 'click', ( evt, data ) => {
            var targetDomElement = data.domTarget;
            var reqElement = getRequirementElement( targetDomElement );
            if( reqElement ) {
                var eventData = {
                    targetElement: targetDomElement,
                    requirementElement : reqElement
                };
                if( reqElement.getAttribute && reqElement.getAttribute( 'paramid' ) ) {
                    eventBus.publish( 'ckeditor.clickedOnParameterLink', eventData );
                }else if( reqElement.getAttribute && reqElement.getAttribute( 'id' ) && reqElement.getAttribute( 'id' ).startsWith( 'liid' ) ) {
                    eventBus.publish( 'ckeditor.clickedOnTOCLink', eventData );
                }else if ( reqElement.classList.contains( REQ_CROSS_REF_LINK ) ) {
                    eventBus.publish( 'ckeditor.handleClickOnCrossReferenceLink', eventData );
                }else if( reqElement.classList.contains( REQ_PROPERTY_CLASS ) ) {
                    eventBus.publish( 'ckeditor.clickedInsideProperty', eventData );
                }else if( reqElement.classList.contains( REQ_HEADER_CLASS ) ) {
                    eventBus.publish( 'ckeditor.clickedInsideHeader', eventData );
                }else if( reqElement.classList.contains( REQ_BODYTEXT_CLASS ) ) {
                    eventBus.publish( 'ckeditor.clickedInsideBodyText', eventData );
                    eventBus.publish("requirementDocumentation.selectionChangedinCkEditor", { isSelected: true });
                }
            } else {
                eventBus.publish( 'ckeditor.clickedInsideNonRequirementElement', data.domTarget );
                eventBus.publish("requirementDocumentation.selectionChangedinCkEditor", { isSelected: false });
            }
        } );
    }
}

/**
 * Return the bodyText div if clicked inside bodyText div, else return null
 * 
 * @param {Object} element - dom element
 * @returns {Object} - bodyText dom element
 */
function getRequirementElement( element ) {
    if ( !element || element.classList.contains( 'requirement' ) || element.classList.contains( 'ck-content' ) ) {
        return; // Exit if reached to requirement or ckeditor container
    }
    if( element.getAttribute && element.getAttribute( 'id' ) && element.getAttribute( 'id' ).startsWith( 'liid' ) ) {
        return element; // IF table of content link
    }
    if( element.getAttribute && element.getAttribute( 'paramid' ) ) {
        return element; // If parameter link
    }
    if ( element.classList.contains( REQ_CROSS_REF_LINK ) ) {
        if(element.tagName === 'IMG'){
            //revid and occid is needed to open object in new tab and its present in paragraph element
            var crossRefParagraph = element.parentElement.parentElement;
            return crossRefParagraph;
        }else{
            return element; // If cross reference link
        }
       
    }
    if ( element.classList.contains( REQ_PROPERTY_CLASS ) || element.classList.contains( REQ_HEADER_CLASS )
         || element.classList.contains( REQ_BODYTEXT_CLASS ) ) {
        return element;
    }

    return getRequirementElement( element.parentNode );
}
