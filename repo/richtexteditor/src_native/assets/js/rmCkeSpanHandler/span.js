/* global
   CKEDITOR5
*/
import appCtxSvc from 'js/appCtxService';

export default class Span extends CKEDITOR5.Plugin {
    static get pluginName() {
        return 'Span';
    }
    init() {
        const editor = this.editor;
        const schema = editor.model.schema;

        schema.extend( '$text', { allowAttributes: [ 'spanAttribute', 'spanId', 'spanStyle'] } );

        editor.conversion.attributeToElement( {
            model: 'spanAttribute',
            view: 'span'
        } );

        editor.conversion.for( 'upcast' ).elementToAttribute( {
            view: {
                name: 'span',
                attributes: { id: true }
            },
            model: {
                key: 'spanId',
                value: viewElement => viewElement.getAttribute( 'id' )
            },
            converterPriority: 'normal'
        } );

        editor.conversion.for( 'downcast' ).attributeToElement( {
            model: 'spanId',
            view: ( modelAttributeValue, viewWriter ) => {
                var spanElement = viewWriter.createAttributeElement( 'span', {
                    id: `${modelAttributeValue}`
                } );



                return spanElement;
            },
            converterPriority: 'normal'
        } );

        editor.conversion.for( 'upcast' ).elementToAttribute( {
            view: {
                name: 'span',
                attributes: { style: true }
            },
            model: {
                key: 'spanStyle',
                value: viewElement => {
                    const styles = viewElement.getStyle();
                    // Filter out color and italic  style, to avoid duplicates as these styles are handled by editor plugins.
                    if( styles && styles[ 'font-family' ] ) {
                        // The reduce() method executes a reducer function (that you provide) on each element of the array, resulting in single output value.
                        return Object.keys( styles ).reduce( ( accumulator, key ) => {
                            return key !== 'font-family' ? accumulator + key + ':' + styles[ key ] + ';' : accumulator;
                        }, '' );
                    }
                    return viewElement.getAttribute( 'style' );
                }
            },
            converterPriority: 'low'
        } );

        // Add an downcast (model-to-view) converter for style attribute of a span.
        // This attribute should support all the styles not supported by native pluginss
        editor.conversion.for( 'downcast' ).attributeToElement( {
            model: 'spanStyle',
            view: ( modelAttributeValue, viewWriter ) => {
                return viewWriter.createAttributeElement( 'span', {
                    style: `${ modelAttributeValue }`
                } );
            },
            converterPriority: 'low'
        } );




    }
}
