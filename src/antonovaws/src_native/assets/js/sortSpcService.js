import * as app from 'app';

import * as oes from 'js/occmgmtStructureEditService';

var exports = {};

export let sortSpcMethod = function(data, ctx, test) {
    console.log('!!!sortSpcMethod', {data, ctx, app, test});

    debugger;
};

export default exports = {
    sortSpcMethod
};

app.factory( 'sortSpcService', () => exports );
