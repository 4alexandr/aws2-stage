import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

export let createDoc = function( identifier, title ) {
    return soaSvc.post( 'Core-2008-06-DataManagement', 'createObjects', {
        input: [ {
            boName: 'EngineeringChange',
            propertyNameValues: {
                item_id: [ identifier ],
                object_name: [ title ],
                ec_type: [ 'ANC5_II' ]
            }
        } ]
    } );
};

export default exports = {
    createDoc
};

app.factory( 'createDocService', () => exports );
