// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides core angularJS services abstraction.
 *
 * @module js/awParseService
 */

import { parseExpression } from 'js/serviceUtils';
import AwInjectorService from 'js/awInjectorService';

/**
 * The API splits the expression and parse it.
 * @param {String} expression - The String expression to parse
 * @param {Array} names - The String Array of Parameters
 * @param {Array} vals - The Array of parameter values.
 * @returns {Object} parsed value
 */
const splitAndParse = ( expression, names, vals ) => {
    const expressions = parseExpression( expression );
    let finalExpresions = expressions.map( ( expr ) => {
        if( expr !== '(' && expr !== ')' && expr !== '!' &&
            expr !== '&' && expr !== '|' && expr !== '' ) {
            try {
                let func = new Function( ...names, `return ${expr};` );
                const response = func.apply( null, vals );
                return response === undefined ? false : response;
            } catch ( e ) {
                //Little Hack to make undefined case work
                if( expr.includes( '===' ) && expr.endsWith( 'undefined' ) || expr.includes( '!=' ) ) {
                    return true;
                }
                return false;
            }
        }
        return expr;
    } );
    let params = [ 'window', 'document', 'eval', 'setTimeout', 'setInterval', 'XMLHttpRequest', 'Function' ];
    let values = [ {}, {}, {}, {}, {}, {}, {} ];
    let keyCode = 65;
    let ind = 0;
    finalExpresions = finalExpresions.map( ( element ) => {
        if( element !== '&' && element !== '!' && element !== '(' && element !== ')' &&
            element !== '|' && element !== '' ) {
            const varName = String.fromCharCode( keyCode + ind );
            params.push( varName );
            values.push( element );
            ind++;
            return varName;
        }
        return element;
    } );
    const evalExpr = finalExpresions.join( '' ).trim();
    let finalFunc = new Function( ...params, `return ${evalExpr}` );
    return finalFunc.apply( null, values );
};
export default class AwParseService {
    static instance( expression ) {
        //Add caching mechanism for expressions.
        return function( evaluationCtx ) {
            const parseService = AwInjectorService.instance.get( '$parse' );
            if( parseService ) {
                return parseService( expression )( evaluationCtx );
            }
            if( !expression ) {
                return undefined;
            }
            let names = [ 'window', 'document', 'eval', 'setTimeout', 'setInterval', 'XMLHttpRequest', 'Function' ];
            let vals = [ {}, {}, {}, {}, {}, {}, {} ];
            if( evaluationCtx ) {
                names = names.concat( Object.keys( evaluationCtx ) );
                vals = vals.concat( Object.values( evaluationCtx ) );
            }
            try {
                let func = new Function( ...names, `return ${expression};` );
                const response = func.apply( null, vals );
                return response === undefined ? false : response;
            } catch ( e ) {
                //Split the expression and try to resolve
                return splitAndParse( expression, names, vals );
            }
        };
    }
}
