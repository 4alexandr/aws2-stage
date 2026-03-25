import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

export let createDoc = function( identifier, title ) {
    return soaSvc.post( 'Internal-Core-2011-06-ICT', 'invokeICTMethod', {
        className: 'ICCTEngineeringChange',
        methodName: 'create',
        args: [
            { val: 'EngineeringChange' },
            { val: 'TYPE::EngineeringChange::ImanRelation::ImanRelation' },
            { val: identifier },
            { val: '0' },
            { val: title },
            { val: 'ANC5_II' },
            { val: '', args: [ { val: 'true' }, { val: '' } ] }
        ]
    } );
};

export default exports = {
    createDoc
};

app.factory( 'createDocService', () => exports );
