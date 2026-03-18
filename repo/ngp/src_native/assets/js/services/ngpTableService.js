// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import ngpDataUtils from 'js/utils/ngpDataUtils';
import app from 'app';
import _ from 'lodash';
import localeService from 'js/localeService';

/**
 * NGP header service
 *
 * @module js/services/ngpTableService
 */
'use strict';

const MASTER_STATUS_COLUMN_NAME = 'MasterStatus';
const CLONE_STATUS_COLUMN_NAME = 'CloneStatus';

/**
 * @param {modelObject[]} rowObjects - an array of row objects
 * @param {object[]} sortCriteria - the sort criteria array
 * @return {modelObject[]} a sorted array of modelObjects
 */
export function sortTable( rowObjects, sortCriteria ) {
    let sortedRows = rowObjects;
    if( Array.isArray( rowObjects ) && rowObjects.length > 1 && Array.isArray( sortCriteria ) && sortCriteria.length > 0 ) {
        const { fieldName, sortDirection } = sortCriteria[ 0 ];
        sortedRows = ngpDataUtils.sortModelObjectsByProp( rowObjects, fieldName, sortDirection === 'ASC' );
    }
    return sortedRows;
}

/**
 * @param {object} dataProvider - the dataProvider object
 * @param {string} columnPropName - the column prop name
 */
export function setTreeNavigationColumn( dataProvider, columnPropName ) {
    const column = _.find( dataProvider.columnConfig.columns, ( column ) => column.propertyName === columnPropName );
    if( column ) {
        column.isTreeNavigation = true;
    }
}

/**
 * @param {object} dataProvider - the dataProvider object
 */
export function setCloneAndMasterColumnsSettings( dataProvider ) {
    let resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/NgpCloneMgmtMessages.json' );
    const [ col1, col2 ] = dataProvider.columnConfig.columns.filter( ( { name } ) => name === MASTER_STATUS_COLUMN_NAME ||  name === CLONE_STATUS_COLUMN_NAME );
    if( col1 ) {
        col1.enableColumnResizing = false;
        col1.displayName = col1.name === MASTER_STATUS_COLUMN_NAME ? resource.master : resource.clone;
    }
    if( col2 ) {
        col2.enableColumnResizing = false;
        col2.displayName = col2.name === MASTER_STATUS_COLUMN_NAME ? resource.master : resource.clone;
    }
}

let exports = {};
export default exports = {
    sortTable,
    setTreeNavigationColumn,
    setCloneAndMasterColumnsSettings
};
