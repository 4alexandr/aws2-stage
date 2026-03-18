import app from 'app';

var exports = {};


/**
* Method to return model fragment of html content
*/
export function convertHtmlToModel( htmlContent, editor ) {
    const viewFragment = editor.data.processor.toView( htmlContent );
    return editor.data.toModel( viewFragment );
}

var getRequirementModelElement = function( modelElement ) {
    if ( !modelElement ) { return null; }

    if ( modelElement.name === 'requirement' ) { return modelElement; }

    return getRequirementModelElement( modelElement.parent );
};
// Get Model Element within tree of other model element
var getModelElement = function( editor, containerElement, nameModelEle ) {
    const range = editor.model.createRangeIn( containerElement );
    for ( const modelElement of range.getItems( { ignoreElementEnd: true } ) ) {
        if ( modelElement.name === nameModelEle  ) {
            return modelElement;
        }
    }
    return null;
};

var isTracelinkIconViewElement = function( viewElement ) {
    if ( viewElement && viewElement.name === 'img' ) {
        var parent = viewElement.parent;
        var grandParent = parent ? parent.parent : parent;

        if ( grandParent.name === 'tracelinkicon' || parent.name === 'tracelinkicon' ) {
            return true;
        }
    }
    return false;
};
var getRequirementViewElement = function( viewElement ) {
    if ( !viewElement ) { return null; }

    if ( viewElement.hasClass( 'requirement' ) ) { return viewElement; }

    return getRequirementViewElement( viewElement.parent );
};

var setType = function( writer, reqWidget, typeName ) {
    if ( reqWidget.objectTypesWithIcon ) {
        for ( var key in reqWidget.objectTypesWithIcon ) {
            var type = reqWidget.objectTypesWithIcon[key];
            if ( type.typeName
                .toLowerCase() === typeName
                    .toLowerCase() ) {
                writer.setAttribute( 'objecttype', typeName, reqWidget );
                writer.setAttribute( 'itemtype', typeName, reqWidget );
                break;
            }
        }
    } else {
        writer.setAttribute( 'objecttype', typeName, reqWidget );
        writer.setAttribute( 'itemtype', typeName, reqWidget );
    }
};

var setTypeIcon = function( writer, typeIconElement, objectTypesWithIcon, typeName, domIconElement ) {
    // Replace the place holder with 'Type' icon
    // var typeIconElement = this.element.$.getElementsByTagName( "typeIcon" );
    if ( typeIconElement ) {
        var typeObject = getTypeObject( objectTypesWithIcon, typeName );
        if ( !typeObject ) {
            return;
        }
        writer.setAttribute( 'src', typeObject.typeIconURL, typeIconElement );
        if ( domIconElement ) {
            domIconElement.src = typeObject.typeIconURL;
        }
    }
};

/**
 * Return the associated template for the given item type
 *
 * @param {String} itemType
 * @return {Object} template
 */
function getTemplateFromGlobalTemplateMap( editor, itemType ) {
    // Try to get the allowed types from the cached map
    if ( editor.config.objectTemplateGlobalMap ) {
        for ( var i = 0; i < editor.config.objectTemplateGlobalMap.length; i++ ) {
            var templateInfo = editor.config.objectTemplateGlobalMap[i];
            if ( templateInfo.realTypeName.toLowerCase() === itemType.toLowerCase() ) {
                return templateInfo.template;
            }
        }
    }
    return null;
}

/**
  * Replace the last widget with the new widget of different type.
  *
  * @param {widget} widget
  */
function changeWidgetTemplate( widget, editor, template ) {
    var modelFregment = convertHtmlToModel( template, editor );
    if ( !modelFregment || modelFregment.childCount < 1 ) { return; }

    const templateRequirement = modelFregment.getChild( 0 );

    if ( templateRequirement ) {
        var reqContentTemplate = getModelElement( editor, templateRequirement, 'requirementContent' );
        var reqContentCurrent = getModelElement( editor, widget, 'requirementContent' );
        var reqBodyTextCurrent = getModelElement( editor, reqContentCurrent, 'requirementBodyText' );

        editor.model.change( writer => {
            var reqBodyTextClone = reqBodyTextCurrent._clone( true );
            var posBodyText = null;

            var countChild = reqContentTemplate.childCount;
            for ( var ii = countChild - 1; ii >= 0; ii-- ) {
                var child = reqContentTemplate.getChild( ii );
                if ( child.name === 'requirementBodyText'  ) {
                    posBodyText = writer.createPositionBefore( child );
                    writer.remove( child );
                    break;
                }
            }

            if ( posBodyText ) {
                writer.insert( reqBodyTextClone, posBodyText );
            }

            var posReqContent = writer.createPositionBefore( reqContentCurrent );
            writer.remove( reqContentCurrent );
            writer.insert( reqContentTemplate, posReqContent );
        } );
    }
}
/**
 * Return the object type
 *
 * @param {objectTypesWithIcon} list of object types
 * @param {typeName} type internal name
 */
function getTypeObject( objectTypesWithIcon, typeName ) {
    for ( var key in objectTypesWithIcon ) {
        var value = objectTypesWithIcon[key];
        if ( value.typeName.toLowerCase() === typeName
            .toLowerCase() ) {
            return value;
        }
    }
    return null;
}


/** * Return the allowed child type info for the given parent item type *
   * @param {String} parentItemType
   * @return {Object} type information
*/
function getAllowedTypesFromGlobalTypeMap( editor, parentItemType ) {
    // Try to get the allowed types from the cached map
    if ( editor.config.objectTypeGlobalMap ) {
        for ( var i = 0; i < editor.config.objectTypeGlobalMap.length; i++ ) {
            var typeWithIconMap = editor.config.objectTypeGlobalMap[i];
            var type = typeWithIconMap.parentType;
            if ( type.toLowerCase() === parentItemType.toLowerCase() ) {
                return typeWithIconMap;
            }
        }
    }
    return null;
}
/**
 * Disables commands for read-only objects
 *
 * @param {modelElement} block model element
 *
 */
var disableCmdForReadOnlyObj = function( block, editor ) {
    var bodytextEle;
    var isEmptyAttr;
    var contentTypeAttrContent;
    var contentEditable;
    if ( block.name !== 'requirementBodyText' ) {
        bodytextEle = getBodytextElementFromChilds( block );
        if ( !bodytextEle ) {
            bodytextEle = getBodytextElementFromParent( block );
        }
    } else {
        bodytextEle = block;
    }
    if ( bodytextEle ) {
        isEmptyAttr = bodytextEle.getAttribute( 'isempty' );
        contentTypeAttrContent = bodytextEle.getAttribute( 'contenttype' );
        contentEditable = bodytextEle.getAttribute( 'contenteditable' );
    }
    if ( contentTypeAttrContent && contentTypeAttrContent === 'READONLY' || isEmptyAttr && isEmptyAttr === 'True' || contentEditable === 'false' ) {
        editor.commands._commands.forEach( ( command ) => {
            command.isEnabled = false;
        } );
        editor.commands._commands.get( 'insertRequirement' ).isEnabled = true;
    }else{
        var insertOLECmd = editor.commands._commands.get( 'rmInsertOLE' );
        if( insertOLECmd ) {
            insertOLECmd.isEnabled = true;
        }
    }
};
/**  Return bodyText model element from child elements *
   * @param {modelElement} block model element
   * @return {modelElement} bodyText model element
*/
function getBodytextElementFromChilds( block ) {
    var allNestedChilds = [];
    getAllRecurrsiveChilds( block, allNestedChilds );
    for ( const child of allNestedChilds ) {
        if ( child.name === 'requirementBodyText' ) { return child; }
    }
}
/**  Return bodyText model element from parent elements *
   * @param {modelElement} block model element
   * @return {modelElement} bodyText model element
*/
function getBodytextElementFromParent( block ) {
    if ( block.name === 'requirementBodyText'  ) { return block; } else if ( block.parent ) {
        getBodytextElementFromParent( block.parent );
    }
}
/**  Return array of child elements *
   * @param {object} viewItem model element
   * @return {array} child elements
*/
var getAllRecurrsiveChilds = function( viewItem, allChilds ) {
    for ( const child of viewItem.getChildren() ) {
        allChilds.push( child );
        if ( child.getChildren ) {
            getAllRecurrsiveChilds( child, allChilds );
        }
    }
};

export default exports = {
    setTypeIcon,
    setType,
    convertHtmlToModel,
    changeWidgetTemplate,
    getRequirementModelElement,
    getTemplateFromGlobalTemplateMap,
    getAllowedTypesFromGlobalTypeMap,
    getRequirementViewElement,
    isTracelinkIconViewElement,
    getModelElement,
    disableCmdForReadOnlyObj,
    getAllRecurrsiveChilds

};

app.factory( 'RequirementWidgetUtil', () => exports );
