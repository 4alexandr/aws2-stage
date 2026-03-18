// Copyright (c) 2020 Siemens

/**
 * @module js/viewerSettingsPanelService
 */

import app from 'app';

var exports = {};

const updateVMO = ( data ) => {
    data.enableCulling.dbValue = data.configs[ data.enableCulling.uiValues[0] ];
};

const getUpdatesFromVMO = ( data ) => {
    const temp = {};
    if( data.configs[ data.enableCulling.uiValues[0] ] !== data.enableCulling.dbValue ) {
        temp[ data.enableCulling.uiValues[0] ] = data.enableCulling.dbValue;
    }
    data.configs = temp;
};

export default exports = {
    updateVMO,
    getUpdatesFromVMO
};
app.factory( 'viewerSettingsPanelService', () => exports );
