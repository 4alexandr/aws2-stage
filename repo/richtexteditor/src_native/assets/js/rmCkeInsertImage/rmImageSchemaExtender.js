
/* global
* CKEDITOR5
*/

export default class RMImageSchemaExtender extends CKEDITOR5.Plugin {
    static get requires() {
        return [];
    }
    init() {
        const editor = this.editor;
        const schema = editor.model.schema;
        schema.extend( 'image', {
            allowAttributes: [ 'imgId', 'imageuid' ]
        } );

        editor.conversion.for( 'downcast' ).add( modelToViewAttributeConverter( 'imgId', 'id' ) );
        editor.conversion.for( 'downcast' ).add( modelToViewAttributeConverter( 'imageuid', 'imageuid' ) );
        function modelToViewAttributeConverter( attributeKey, viewAttribute ) {
            return dispatcher => {
                dispatcher.on( 'attribute:' + attributeKey + ':image', converter );
            };

            function converter( evt, data, conversionApi ) {
                if ( !conversionApi.consumable.consume( data.item, evt.name ) ) {
                    return;
                }

                const viewWriter = conversionApi.writer;
                const figure = conversionApi.mapper.toViewElement( data.item );
                const img = getViewImgFromWidget( figure );
                viewWriter.setAttribute( viewAttribute, data.attributeNewValue || '', img );
            }
        }

        function getViewImgFromWidget( figureView ) {
            const figureChildren = [];

            for ( const figureChild of figureView.getChildren() ) {
                figureChildren.push( figureChild );

                if ( figureChild.is( 'element' ) ) {
                    figureChildren.push( ...figureChild.getChildren() );
                }
            }

            return figureChildren.find( viewChild => viewChild.is( 'element', 'img' ) );
        }

        editor.conversion.for( 'upcast' ).attributeToAttribute( {
            view: {
                name: 'img',
                key: 'id'
            },
            model: 'imgId'
        } );

        editor.conversion.for( 'upcast' ).attributeToAttribute( {
            view: {
                name: 'img',
                key: 'imageuid'
            },
            model: 'imageuid'
        } );
    }
}

