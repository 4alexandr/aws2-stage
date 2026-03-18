// Copyright (c) 2020 Siemens

/**
 * @module js/epCapture2DService
 */

import visWebInstanceProvider from 'js/visWebInstanceProvider';
import clientDataModel from 'soa/kernel/clientDataModel';
import saveInputWriterService from 'js/saveInputWriterService';
import epSaveService from 'js/epSaveService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import app from 'app';

'use strict';

const DATASET_ID = 'TestDatasetID';
const DATASET_TYPE = 'Dataset';

/**
 * Capture 2D snapshot
 *
 */
export function capture2DSnapshot( input, selectedObj ) {
    const resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/GraphicsMessages' );

    const snapshotManager = visWebInstanceProvider.getVisWebInstance( input ).Snapshot;
    snapshotManager.setSnapshotEnabled( true );
    snapshotManager.createSnapshotInPNG( imgAsDataURL => {
        let imageUrl = imgAsDataURL.split( ',' )[ 1 ];

        let selectedModelObj = null;
        if( selectedObj && selectedObj.length > 0 ) {
            selectedModelObj = clientDataModel.getObject( selectedObj[ 0 ].uid );
        }
        const objectUID = selectedObj[ 0 ].uid;

        const objectMap = {
            id: DATASET_ID,
            connectTo: objectUID,
            Type: DATASET_TYPE
        };

        const propsMap = {
            additionalPropMap: {
                base64_image_string: imageUrl
            }
        };

        const saveInputWriter = saveInputWriterService.get();
        saveInputWriter.addCreateObject( objectMap, propsMap );
        epSaveService.saveChanges( saveInputWriter, true, [ selectedModelObj ] ).then(
            function( result ) {
                if( !result.ServiceData.partialErrors ) {
                    let uiValue = null;

                    uiValue = selectedModelObj.props.object_string.uiValues[ 0 ];

                    messagingService.showInfo( resource.capture2DImagesSuccess.format( uiValue ) );
                }
            } );
    } );
}

const exports = {
    capture2DSnapshot
};

export default exports;
