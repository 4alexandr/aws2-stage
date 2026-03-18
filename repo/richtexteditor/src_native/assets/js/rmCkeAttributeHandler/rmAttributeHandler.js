/**
 * function to allow attributes in <div> tag
 * @param {Object} editor - ckeditor instance
 */
export function ConvertDivAttributes( editor ) {
    editor.conversion.for( 'upcast' ).elementToElement( {
        view: 'div',
        model: ( viewElement, modelWriter ) => {
            return modelWriter.createElement( 'division', viewElement.getAttributes() );
        }
    } );

    editor.conversion.for( 'downcast' ).elementToElement( {
        model: 'division',
        view: 'div'
    } );
    editor.conversion.for( 'downcast' ).add( dispatcher => {
        dispatcher.on( 'attribute', ( evt, data, conversionApi ) => {
            if( data.item.name !== 'division' ) {
                return;
            }

            const viewWriter = conversionApi.writer;
            const viewDiv = conversionApi.mapper.toViewElement( data.item );

            if( data.attributeNewValue ) {
                viewWriter.setAttribute( data.attributeKey, data.attributeNewValue, viewDiv );
            } else {
                viewWriter.removeAttribute( data.attributeKey, viewDiv );
            }
        } );
    } );
}


/**
 * function to allow attributes in <div> tag
 * @param {Object} editor - ckeditor instance
 */
export function ConvertParaAttributes( editor ) {

    editor.model.schema.extend( '$block', { allowAttributes: '__style' } );
    editor.conversion.for( 'upcast' ).attributeToAttribute( {
        model: {
            name: 'paragraph',
            key: '__style'
        },
        view: {
            name: 'p',
            key: 'style',
            value: /[\s\S]+/
        }
    } );
    editor.conversion.for( 'downcast' ).add( dispatcher => {
        dispatcher.on( 'attribute:__style:paragraph', ( evt, data, conversionApi ) => {
            const viewElement = conversionApi.mapper.toViewElement( data.item );
            conversionApi.writer.setAttribute( 'style', data.attributeNewValue, viewElement );
        } );
    } );
}

