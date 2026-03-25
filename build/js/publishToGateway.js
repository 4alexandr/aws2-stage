#!/usr/bin/env node

const gulp = require( 'gulp' );
const zip = require( 'gulp-zip' );
const { basename, dirname, join } = require( 'path' );
const { get, put } = require( 'superagent' );
const { pathExists, readJson, remove, writeJson, readFile } = require( 'fs-extra' );

const logger = require( 'afx/build/js/logger' );
const { stream2Promise } = require( 'afx/build/js/util' );

if( require.main === module ) {
    ( async function() {
        const argv = require( 'yargs' )
            .usage( 'Usage: node $0 <folder path> <Gateway URL>' )
            .options( {
                siteDir: {
                    alias: 'path',
                    description: 'path to site directory',
                    default: process.env.DMS ? './out/war/dev' : './out/site',
                    normalize: true
                },
                url: {
                    description: 'Gateway URL'
                }
            } )
            .example( 'node $0', 'Publish local site to remote gateway' )
            .example( 'node $0 --siteDir out/war/xyz --url http://localhost:3000', 'Import files from local directory to a remote gateway' )
            .argv;

        const url = argv._[ 0 ] || argv.url || await _getURLFromTemProperties();

        if( !url ) {
            logger.warn( 'No Gateway URL provided to publish site' );
            return;
        }

        if( !await pathExists( argv.siteDir ) ) {
            logger.warn( `Site directory does not exists [${argv.siteDir}]` );
            return;
        }

        // The following is required to support working with self signed certificates (https)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

        const authtoken = await _getAuthToken( url );

        const uploads = [ {
            zipFile: join( dirname( argv.siteDir ), 'site.zip' ),
            zipFolder: argv.siteDir
        }, {
            zipFile: join( dirname( argv.siteDir ), 'darsi.zip' ),
            zipFolder: join( process.cwd(), 'out', 'darsi_repo' )
        } ];

        await Promise.all( uploads.map( async( { zipFile, zipFolder } ) => {
            await remove( zipFile );
            await _zipDirectory( zipFolder, zipFile );
            await _uploadFile( zipFile, url, authtoken );
        } ) );
    } )().catch( err => {
        logger.error( err );
        process.exit( 1 );
    } );
}

/**
 * Get the default URL from tem.properties file
 */
async function _getURLFromTemProperties() {
    const temPropertiesPath = './tem.properties';
    if( await pathExists( temPropertiesPath ) ) {
        const temFile = await readFile( temPropertiesPath, 'utf-8' );
        const temConfig = temFile.split( '\n' )
            .reduce( ( acc, line ) => {
                const [ key, value ] = line.split( '=' );
                acc[ key ] = value ? value.replace( '\r', '' ) : '';
                return acc;
            }, {} );
        return temConfig.gatewayURL;
    }
}

/**
 * @param {String} url - URL for gateway
 * @return {String} authtoken for publish
 */
async function _getAuthToken( url ) {
    const keyPath = join( process.cwd(), 'publish.json' );
    let key = {};
    if( await pathExists( keyPath ) ) {
        key = await readJson( keyPath );
    }
    const authtokenPrefix = '9e5b33cd-ad92-4530-a4c9-ba10dfa1e249';
    let authtoken = `${authtokenPrefix}::${key.key && key.key || ''}`;

    let failed = '';
    const getRes = await get( `${url}/publish` )
        .set( 'authtoken', authtoken )
        .catch( err => {
            if( err.status ) { failed += `${err.status} `; }
            if( err.message ) { failed += `${err.message} `; }
        } );
    if( failed ) {
        throw new Error( `No gateway available at [${url}] - ${failed}` );
    }

    if( getRes && getRes.text && !key.key ) {
        key.key = getRes.text;
        authtoken = `${authtokenPrefix}::${key.key}`;
    }
    await writeJson( keyPath, key );
    return authtoken;
}

/**
 * @param {String} dirPath - directory path
 * @param {String} zipFile - zip file
 */
async function _zipDirectory( dirPath, zipFile ) {
    const stopwatch = new logger.Stopwatch();
    logger.info( `>>> Creating ${zipFile}` );
    await stream2Promise( gulp.src( `${dirPath}/**`, { dot: true } )
        .pipe( zip( basename( zipFile ) ) )
        .pipe( gulp.dest( dirname( zipFile ) ) ) );
    logger.success( `>>> ${zipFile} created${stopwatch.end()}` );
}

/**
 * @param {File} file - path of zip file to upload
 * @param {url} gatewayURL - gateway url
 * @param {String} authtoken - authtoken
 */
async function _uploadFile( file, gatewayURL, authtoken ) {
    const stopwatch = new logger.Stopwatch();
    logger.info( `>>> Uploading to ${gatewayURL}...` );
    await put( `${gatewayURL}/publish` )
        .set( 'authtoken', authtoken )
        .type( 'multipart/form-data' )
        .query( {
            json: JSON.stringify( {
                relPath: basename( file ),
                isBinary: 'T',
                unzip: 'T'
            } )
        } )
        .attach( 'FMS_FORMPART_REPLACE_FILEDATA', file );
    logger.success( `>>> ${file} uploaded to ${gatewayURL}${stopwatch.end()}` );
}
