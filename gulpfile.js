/* eslint-env node, es6 */

const {
    cloneDeep,
    forEach,
    merge,
    mergeWith,
    isArray,
    union
} = require( 'lodash' );

const {
    existsSync,
    readFileSync,
    readdirSync
} = require( 'fs' );

const {
    remove
} = require( 'fs-extra' );

const {
    basename,
    dirname,
    join
} = require( 'path' );

const eslint = require( 'gulp-eslint' );
const gulp = require( 'gulp' );
const tap = require( 'gulp-tap' );
const xml2js = require( 'xml2js' );

// https://github.com/gulpjs/undertaker-forward-reference
const FwdRef = require( 'undertaker-forward-reference' );
gulp.registry( new FwdRef() );

const mergeCAS = require( 'afx/build/js/mergeCustomActionSchema' );
const site = require( 'afx/build/js/site' );
const staticCodeAnalysis = require( 'afx/build/js/staticCodeAnalysis' );

const {
    error,
    pathColor,
    pipeErrorHandler,
    Stopwatch,
    success,
    trace
} = require( 'afx/build/js/logger' );

const {
    normalizePath,
    shortenPath,
    spawn,
    stream2Promise,
    tapBlock
} = require( 'afx/build/js/util' );

/**
 * Build configuration
 */
const buildJson = require( './build.json' );
const buildDevJson = require( './build.dev.json' );

/**
 * Output folder
 */
const outDir = `${__dirname}/out`;

/**
 * Prefix to use when logging
 */
const MSG_PREFIX = '  gulpfile: ';

/**
 * The TEM configuration. Must be available immediately as it is used to determine which tasks are available.
 */
const temFile = readFileSync( './tem.properties', 'utf-8' );
const temConfig = temFile.split( '\n' )
    .reduce( ( acc, line ) => {
        const [ key, value ] = line.split( '=' );
        acc[ key ] = value ? value.replace( '\r', '' ) : '';
        return acc;
    }, {} );

/**
 * Shared promise containing the result of createCache
 */
let createCachePromise;

/**
 * Shared promise containing the result of createDevCache
 */
let createDevCachePromise;

/** ************************** Active Workspace Build Scripts ************************** **/

/**
 * Load kit / modules into a cache
 */
async function createCache() {
    const cache = {
        filePath2moduleJson: {},
        name2moduleJson: {},
        audit: {
            xsd: {}
        }
    };

    const kitJsons = [];

    const siteJson = {
        name: 'stage',
        kits: [],
        locale: temConfig.locale && temConfig.locale.split( ',' ) || [],
        siteDir: `${outDir}/site/`
    };

    // Add a module to the cache
    function addModule( file ) {
        const moduleJson = JSON.parse( file.contents );
        cache.name2moduleJson[ moduleJson.name ] = moduleJson;
        cache.filePath2moduleJson[ file.path ] = moduleJson;

        if( !moduleJson.type ) {
            moduleJson.type = [ 'native' ];
        }

        moduleJson.moduleDir = normalizePath( dirname( file.path ) );
        if( !moduleJson.dependencies ) {
            moduleJson.dependencies = [];
        }
        if( moduleJson.type.includes( 'native' ) ||
            moduleJson.type.includes( 'repo' ) ) {
            // eslint-disable-next-line no-prototype-builtins
            const hasSrcDir = moduleJson.hasOwnProperty( 'srcDir' );
            if( !hasSrcDir ) {
                if( moduleJson.nativeRoots ) {
                    // deprecated
                    moduleJson.srcDir = `${moduleJson.moduleDir}/${moduleJson.nativeRoots[ 0 ]}`;
                } else {
                    moduleJson.srcDir = `${moduleJson.moduleDir}/src`;
                }
            } else {
                moduleJson.srcDir = `${moduleJson.moduleDir}/${moduleJson.srcDir}`;
            }
        }
        moduleJson.srcZip = `${moduleJson.moduleDir}/${moduleJson.name}_native.zip`;

        if( moduleJson.type.includes( 'native' ) ) {
            // this is for custom action template schema defined in repo
            let customSchemaFilePath = `${moduleJson.srcDir}/assets/schema/declarativeCustomActionTemplateDefsSchema.json`;
            if( !existsSync( customSchemaFilePath ) ) {
                // this is for custom action template defined in src of kit
                customSchemaFilePath = `${moduleJson.srcDir}/schema/declarativeCustomActionTemplateDefsSchema.json`;
            }

            if( existsSync( customSchemaFilePath ) ) {
                const customSchemaFile = require( customSchemaFilePath );
                if( !cache.audit.customSchema ) {
                    cache.audit.customSchema = customSchemaFile;
                } else {
                    // merge the custom schemas
                    const customSchemaCache = cache.audit.customSchema;
                    const existingActionList = cloneDeep( customSchemaCache.definitions.actionDef.oneOf );
                    const newActionList = cloneDeep( customSchemaFile.definitions.actionDef.oneOf );

                    if( mergeCAS.isCustomActionTemplateMergeable( customSchemaFile, customSchemaCache ) ) {
                        merge( customSchemaCache, customSchemaFile );
                        customSchemaCache.definitions.actionDef.oneOf = union( newActionList, existingActionList );
                    } else {
                        error( 'Error :: Merge conflicts in custom action schema !!' );
                        throw new Error( 'Error :: Merge conflicts in custom action schema !!' );
                    }
                }
            }
        }

        forEach( readdirSync( moduleJson.moduleDir ), function( fileName ) {
            if( !/\.json$/.test( fileName ) || /^(kit|module)\.json$/.test( fileName ) ) {
                return true; // continue
            }
            const jsonFilePath = join( moduleJson.moduleDir, fileName );
            try {
                let data = readFileSync( jsonFilePath );
                if( data ) {
                    data = JSON.parse( data );
                    if( /^workspace.*\.json$/.test( fileName ) ) {
                        // eslint-disable-next-line no-prototype-builtins
                        if( !moduleJson.hasOwnProperty( 'workspace' ) ) {
                            moduleJson.workspace = {};
                        }
                        moduleJson.workspace[ data.workspaceId ] = data;
                    } else {
                        fileName = fileName.replace( /\.json$/i, '' );
                        moduleJson[ fileName ] = data;
                    }
                }
            } catch ( e ) {
                error( `Unable to parse: ${jsonFilePath}` );
                throw e;
            }
        } );
    }

    // Add a kit to the cache
    function addKit( file ) {
        const kitJson = JSON.parse( file.contents );
        kitJsons.push( kitJson );
        siteJson.kits.push( kitJson.name );
        if( kitJson.solutionDef ) {
            if( siteJson.solutionName ) {
                error( `Duplicate solutions found: ${siteJson.solutionName} & ${kitJson.name}`, MSG_PREFIX );
            }
            siteJson.solutionName = kitJson.name;
        }
        const kitJsonPath = dirname( file.path );
        forEach( readdirSync( kitJsonPath ), function( fileName ) {
            if( /^workspace.*\.json$/.test( fileName ) ) {
                const jsonFilePath = join( kitJsonPath, fileName );
                try {
                    let data = readFileSync( jsonFilePath );
                    if( data ) {
                        data = JSON.parse( data );
                        if( !kitJson.workspace ) {
                            kitJson.workspace = {};
                        }
                        if( kitJson.workspace[ data.workspaceId ] !== undefined ) {
                            mergeWith( kitJson.workspace[ data.workspaceId ], data, function customizer( objValue, srcValue ) {
                                if( isArray( objValue ) ) {
                                    forEach( srcValue, function( item ) {
                                        if( objValue.indexOf( item ) < 0 ) {
                                            objValue.push( item );
                                        }
                                    } );
                                    return objValue;
                                }
                            } );
                        }else{
                            kitJson.workspace[ data.workspaceId ] = data;
                        }
                    }
                } catch ( e ) {
                    error( `Unable to parse: ${jsonFilePath}` );
                    throw e;
                }
            }
        } );
    }

    createCachePromise = createCachePromise || stream2Promise( gulp.src( buildJson.srcPaths, { allowEmpty: true } )
        .pipe( tapBlock( function( file ) {
            const filePath = file.path;
            trace( pathColor( filePath ), MSG_PREFIX );
            if( /module\.json$/.test( filePath ) ) {
                addModule( file );
            } else if( /kit\.json$/.test( filePath ) ) {
                addKit( file );
            } else {
                trace( pathColor( filePath, MSG_PREFIX ) );
            }
        } ) ) ).then( () => {
        cache.sca = require( './conf/staticCodeAnalysis.json' );
        return {
            cache: cache,
            kitJsons: kitJsons,
            siteJson: siteJson
        };
    } );

    return createCachePromise;
}

/**
 * Load only src/ kits into a cache (for dev builds)
 */
async function createDevCache() {
    const cache = {
        filePath2moduleJson: {},
        name2moduleJson: {},
        audit: {
            xsd: {}
        }
    };

    const kitJsons = [];

    const siteJson = {
        name: 'stage',
        kits: [],
        locale: temConfig.locale && temConfig.locale.split( ',' ) || [],
        siteDir: `${outDir}/site/`
    };

    function addModule( file ) {
        const moduleJson = JSON.parse( file.contents );
        cache.name2moduleJson[ moduleJson.name ] = moduleJson;
        cache.filePath2moduleJson[ file.path ] = moduleJson;

        if( !moduleJson.type ) {
            moduleJson.type = [ 'native' ];
        }

        moduleJson.moduleDir = normalizePath( dirname( file.path ) );
        if( !moduleJson.dependencies ) {
            moduleJson.dependencies = [];
        }
        if( moduleJson.type.includes( 'native' ) || moduleJson.type.includes( 'repo' ) ) {
            // eslint-disable-next-line no-prototype-builtins
            const hasSrcDir = moduleJson.hasOwnProperty( 'srcDir' );
            if( !hasSrcDir ) {
                if( moduleJson.nativeRoots ) {
                    moduleJson.srcDir = `${moduleJson.moduleDir}/${moduleJson.nativeRoots[ 0 ]}`;
                } else {
                    moduleJson.srcDir = `${moduleJson.moduleDir}/src`;
                }
            } else {
                moduleJson.srcDir = `${moduleJson.moduleDir}/${moduleJson.srcDir}`;
            }
        }
        moduleJson.srcZip = `${moduleJson.moduleDir}/${moduleJson.name}_native.zip`;
    }

    function addKit( file ) {
        const kitJson = JSON.parse( file.contents );
        kitJsons.push( kitJson );
        siteJson.kits.push( kitJson.name );
    }

    createDevCachePromise = createDevCachePromise || stream2Promise( gulp.src( buildDevJson.srcPaths, { allowEmpty: true } )
        .pipe( tapBlock( function( file ) {
            const filePath = file.path;
            trace( pathColor( filePath ), MSG_PREFIX );
            if( /module\.json$/.test( filePath ) ) {
                addModule( file );
            } else if( /kit\.json$/.test( filePath ) ) {
                addKit( file );
            }
        } ) ) ).then( () => {
        cache.sca = require( './conf/staticCodeAnalysis.json' );
        return {
            cache: cache,
            kitJsons: kitJsons,
            siteJson: siteJson
        };
    } );

    return createDevCachePromise;
}

/**
 * Quick dev site build — only processes src/ kits, leaves repo/ kit files intact in out/site/
 */
async function buildDevSite() {
    process.env.DRAFT = 'true';
    const locals = await createDevCache();
    const siteJson = locals.siteJson;
    trace( JSON.stringify( siteJson, null, 2 ), MSG_PREFIX );
    await site( siteJson, locals.kitJsons, locals.cache.name2moduleJson, siteJson.siteDir, 'site', buildDevJson );
    return locals;
}

/**
 * Quick dev deployment — only rebuilds src/ kits
 */
async function buildDevDeployment() {
    const stopwatch = new Stopwatch();
    const locals = await buildDevSite();
    success( `Dev build ready @ ${shortenPath( pathColor( locals.siteJson.siteDir ) )}${stopwatch.end()}`, `  site/${locals.siteJson.name}: ` );
}

/**
 * Audit
 */
async function audit() {
    const locals = await createCache();
    const cache = locals.cache;
    let srcSCA = [];
    const srcESLint = [];
    const schemaPaths = buildJson.schemaPaths;

    forEach( cache.filePath2moduleJson, function( moduleJson ) {
        if( moduleJson.skipAudit ) {
            return; // skip
        }

        srcSCA = srcSCA.concat( [
            `${moduleJson.moduleDir}/commandsViewModel.json`,
            `${moduleJson.moduleDir}/states.json`,
            `${moduleJson.moduleDir}/workspace*.json`,
            `${moduleJson.moduleDir}/workinstrViewModel.json`,
            `${moduleJson.moduleDir}/actionTemplateDefs.json`,
            `${moduleJson.moduleDir}/nodeDefs.json`
        ] );

        if( moduleJson.srcDir ) {
            srcSCA = srcSCA.concat( [
                `${moduleJson.srcDir}/*.@(css|scss)`,
                `${moduleJson.srcDir}/**/*.@(html|js|json|xml)`
            ] );
            schemaPaths.push( `${moduleJson.srcDir}/schema/*.xsd` );
            srcESLint.push( `${moduleJson.srcDir}/**/*.js` );
        }
    } );

    const promises = [];

    promises.push( stream2Promise(
        // Pre-load the XSD require for schema validation of View.html
        gulp.src( schemaPaths, { allowEmpty: true } ).pipe( tap( file => {
            if( file.contents ) {
                const filename = basename( file.path, '.xsd' );
                const parser = new xml2js.Parser();
                parser.parseString( file.contents.toString(), ( err, results ) => {
                    if( err ) {
                        error( `Error parsing ${filename}\n${err}`, 'pre-audit: ' );
                    } else if( !results[ 'declUI:schema' ] || Object.keys( results ).length !== 1 ) {
                        error( `Invalid schema for ${file.path}`, 'pre-audit: ' );
                    } else {
                        cache.audit.xsd[ filename ] = results[ 'declUI:schema' ];
                    }
                } );
            }
        } ) )
    ).then( () => {
        if( srcSCA.length > 0 ) {
            return stream2Promise( gulp.src( srcSCA, { allowEmpty: true } )
                .pipe( staticCodeAnalysis( '', cache ) ) );
        }
    } ) );

    if( srcESLint.length > 0 ) {
        const gulpSrcESLint = gulp.src( srcESLint, { allowEmpty: true } )
            .pipe( eslint() )
            .pipe( eslint.formatEach() )
            .pipe( eslint.failOnError() )
            .pipe( tapBlock( () => {
                // Add the following to handle the scenario where no source is found & end event isn't emitted.
            } ) );
        promises.push( stream2Promise( gulpSrcESLint ) );
    }

    await Promise.all( promises );
}

/**
 * Active Workspace site build
 *
 * @param {Boolean} quick Whether to do quick build.
 * @return {Object} locals cache
 */
async function buildSite( quick ) {
    if( quick ) {
        // eslint-disable-next-line
        process.env.DRAFT = 'true';
    }
    const locals = await createCache();
    // processFiles
    const kitJsons = locals.kitJsons;
    const cache = locals.cache;
    kitJsons.forEach( function( kitJson ) {
        if( /^tc-aw-framework$/.test( kitJson.name ) ) {
            locals.baseKitJson = kitJson;
            locals.baseModuleJson = cache.name2moduleJson[ kitJson.name ];
        }
    } );
    const siteJson = locals.siteJson;

    trace( JSON.stringify( siteJson, null, 2 ), MSG_PREFIX );
    await site( siteJson, kitJsons, cache.name2moduleJson, siteJson.siteDir, 'site', buildJson );

    return locals;
}

/**
 * Active Workspace deployment
 */
async function buildDeployment() {
    const stopwatch = new Stopwatch();
    const locals = await buildSite();
    success( `Build ready @ ${shortenPath( pathColor( locals.siteJson.siteDir ) )}${stopwatch.end()}`, `  site/${locals.siteJson.name}: ` );
}

/**
 * Audit source code for all kits and modules
 */
gulp.task( 'audit', () => audit().catch( pipeErrorHandler ) );

/**
 * Clean any output
 */
gulp.task( 'clean', () => remove( 'out' ).catch( pipeErrorHandler ) );

/**
 * Build deployment for Active Workspace (and all components included)
 */
gulp.task( 'build', gulp.parallel( 'site_stage', 'audit' ) );

/**
 * Build Active Workspace
 *
 * If AFX / AW gulpfile is used instead this task should be automatically generated
 */
gulp.task( 'site_stage', buildDeployment );

/**
 * Quick build of Active Workspace.
 */
gulp.task( 'refresh', () => buildSite( true )
    .catch( pipeErrorHandler ) );

/**
 * Dev build — only rebuilds src/ kits, skips all 75 repo/ kits and webpack.
 * Requires a full build to have been run at least once so out/site/ exists.
 */
gulp.task( 'devRefresh', () => buildDevDeployment().catch( pipeErrorHandler ) );

/**
 * Generate a viewing tool with example SOA inputs and outputs
 */
gulp.task( 'genSoaApi', cb => {
    require( './build/js/genSoaApi' ).generate( () => {
        spawn( 'cmd', [ '/c', 'start', 'out/soa/api/index.html' ] )
            .then( cb )
            .catch( pipeErrorHandler );
    } );
} );

gulp.task( 'default', gulp.parallel( 'build' ) );
