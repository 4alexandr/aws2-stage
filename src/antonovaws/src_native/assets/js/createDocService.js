import * as app from 'app';
import awHttpService from 'js/awHttpService';

var exports = {};

export let createDoc = async function( identifier, title ) {
    const response = await awHttpService.instance.post(
        '{api_base_url}/todo-create-new-doc-endpoint/',
        {
            identifier: identifier,
            title: title
        }
    );
    return response.data;
};

export default exports = {
    createDoc
};

app.factory( 'createDocService', () => exports );
