// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Initialization service for Visuals list.
 *
 * @module js/epVisualsGalleryService
 */

import _ from 'lodash';
import epLoadService from 'js/epLoadService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import { constants as epLoadConstants } from 'js/epLoadConstants';

'use strict';

const JPEG_OBJECT_TYPE = 'JPEG';
const BITMAP_OBJECT_TYPE = 'Bitmap';
const SNAPSHOT_OBJECT_TYPE = 'SnapShotViewData';
const IMAGE_OBJECT_TYPE = 'Image';
const GIF_OBJECT_TYPE = 'GIF';

/**
 * Get the selected process/ operation datasets to display in visuals gallery
 *
 * @param {String} selectedObjId - selected process/ operation uid
 *
 * @returns {Object} Visuals list attached to obj and their total
 */
export function updateGalleryPanel( selectedObjId ) {
    let result = {
        datasetsToShow: [],
        totalFound: 0
    };

    if( selectedObjId ) {
        let loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( epLoadConstants.FILM_STRIP_PANEL, selectedObjId );
        return epLoadService.loadObject( loadTypeInputs, false ).then( function( output ) {
            const _datasetTypes = [ JPEG_OBJECT_TYPE, BITMAP_OBJECT_TYPE,
                                    IMAGE_OBJECT_TYPE, SNAPSHOT_OBJECT_TYPE,
                                    GIF_OBJECT_TYPE
            ];
            const modelObjs = output.ServiceData.modelObjects;
            const datasetsToShow = _.filter( modelObjs, obj => _.includes( _datasetTypes, obj.type ) );
            datasetsToShow.sort((set1, set2) => {
                const name1 = set1.props.object_string.dbValues[0].toLowerCase();
                const name2 = set2.props.object_string.dbValues[0].toLowerCase();
                if( name1 < name2 ) {
                    return -1;
                } else if( name1 === name2 ) {
                    return 0;
                } else {
                    return 1;
                }
            });
            const totalFound = datasetsToShow.length;

            result = {
                datasetsToShow,
                totalFound
            };

            return result;
        } );
    }

    return result;
}

let exports = {};
export default exports = {
    updateGalleryPanel
};
