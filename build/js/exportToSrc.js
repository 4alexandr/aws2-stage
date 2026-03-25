const { lstatSync } = require( 'fs' );
const { spawn } = require( 'afx/build/js/util' );
const darsiExport = require( 'afx/build/js/exportToSrc' );

const argv = require( 'yargs' )
    .demandCommand( 0 )
    .usage( 'Usage: darsi-export <AW URL>' )
    .example( 'node $0', 'Import changes from a server with Darsi enabled into dev unit' )
    .options( {
        moduleName: {
            description: 'module for all new source'
        }
    } )
    .argv;

const afxPath = `${process.env.ROOT}/node_modules/afx`;
const srcPaths = [ `${process.env.ROOT}/src`, `!${process.env.ROOT}/src/samples`, `${process.env.ROOT}/repo`, afxPath ];
const srcPathsToUpdate = [ `${process.env.ROOT}/src`, `!${process.env.ROOT}/src/samples` ];
let imagePath = '';

if( lstatSync( afxPath ).isSymbolicLink() ) {
    srcPathsToUpdate.push( afxPath );
    imagePath = `${afxPath}/src/image`;
}

const awUrl = argv._[ 0 ] || 'http://localhost:3000';
const url = `${awUrl}/darsi`;
const options = {
    srcPaths: srcPaths.join( ',' ),
    srcPathsToUpdate: srcPathsToUpdate.join( ',' ),
    url: url,
    moduleName: argv.moduleName,
    imagePath: imagePath,
    checkoutFunction: process.env.DMS ? function( filePath ) {
        return spawn( 'jt.cmd', [
            'co',
            filePath
        ], null, null, () => null );
    } : null
};

darsiExport( options );
