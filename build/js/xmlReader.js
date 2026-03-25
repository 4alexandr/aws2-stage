/* eslint-disable require-jsdoc */

const through = require( 'through2' );
const xml2js = require( 'xml2js' );

const logger = require( 'afx/build/js/logger' );

/**
 * Converts xml files to json in a gulp stream
 *
 * @param {Boolean} log - log?
 * @return {Stream} stream
 */
module.exports = function toXml( log ) {
    const localVars = {
        parseString: null,
        stream: null
    };

    function transform( file, ignore, cbTransform ) {
        localVars.parseString = new xml2js.Parser( { mergeAttrs: false } ).parseString;
        if( log ) {
            logger.info( 'Converting ' + file.relative + '...' );
        }
        file.path = file.path.replace( '.xml', '.json' );
        localVars.parseString( file.contents.toString(), ( err, result ) => {
            file.contents = Buffer.from( JSON.stringify( result, null, 2 ) );
            localVars.stream.push( file );
            cbTransform();
        } );
    }

    function flush( cbFlush ) {
        if( log ) {
            logger.success( 'Converted all templates to json' );
        }
        cbFlush();
    }

    localVars.stream = through.obj( transform, flush );
    return localVars.stream;
};
