// Copyright (c) 2020 Siemens
const path = require( 'path' );
const devServer = require( 'afx/build/js/devServer' );
const argv = require( 'yargs' )
    .usage( 'Usage: npm run $0 -- [options]' )
    .example( 'npm run $0', 'Starts devServer' )
    .example( 'npm run $0 -- --noReload', 'Starts devServer without automatic browser reload' )
    .example( 'npm run $0 -- --noLaunch ', 'Starts devServer without launching the browser on startup' )
    .example( 'npm run $0 -- --port 4000 ', 'Starts devServer on port 4000' )
    .options( {
        noReload: {
            description: 'option to turn off automatic browser reload',
            default: false,
            boolean: true
        },
        port: {
            description: 'the port to start devServer on',
            default: 3001,
            number: true
        },
        gatewayUrl: {
            description: 'the url where Gateway is running',
            default: 'http://tc12dev:3000/',
            normalize: true
        },
        noLaunch: {
            description: 'option to turn off browser launch on startup',
            default: false,
            boolean: true
        }
    } )
    .argv;

process.env.devServerRefreshCommand = 'gulp refresh';

const siteDir = path.resolve( __dirname, '../../out/site' );
const index = 'tc.html';
devServer( siteDir, argv.noReload, argv.port, argv.gatewayUrl, !argv.noLaunch, index );
