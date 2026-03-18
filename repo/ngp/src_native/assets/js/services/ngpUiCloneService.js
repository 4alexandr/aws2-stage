// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import localeSvc from 'js/localeService';
import dataProviderFactory from 'js/dataProviderFactory';
import declDataProviderService from 'js/declDataProviderService';
const localizedMessages = localeSvc.getLoadedText( 'NgpCloneMgmtMessages' );

/**
 * NGP Ui Clone service
 *
 * @module js/services/ngpUiCloneService
 */
'use strict';

/**
 *
 * @param {number} numOfClonesWithDeletedMasters - number of clones with deleted masters
 * @return {string} the relevant localized label
 */
function getUpdateClonesWithDeletedMasterLabel( numOfClonesWithDeletedMasters ) {
    if( numOfClonesWithDeletedMasters === 1 ) {
        return localizedMessages.updateClonesDialogActionLabelSingle.format( numOfClonesWithDeletedMasters );
    }
    return localizedMessages.updateClonesDialogActionLabelPlural.format( numOfClonesWithDeletedMasters );
}

/**
 * create formated message acumulate number of failures
 * @param {object} assignmentMappingFailures - aray of rows per pes
 * @returns { string } - formated message with number of failures
 */
function prepareMessageForTitleNumOfFailures( assignmentMappingFailures ) {
    let sum = 0;
    assignmentMappingFailures.rowsPerPe.forEach( pe => {
        sum += pe.rows.length;
    } );

    return localizedMessages.assignmentsCouldNotBeCloned.format( sum );
}

/**
 * create dynamic grid id for modelView
 * @param {object}  assignmentFailures  - number of table to use for grid id
 * @returns {object} - grid id and and grid definition
 */
function createCloneAssignmentFailuresGridDefinition( assignmentFailures ) {
    const gridId = `assignmentFailures${assignmentFailures.tableNumber}`;
    const dataProviderId = `assignmentFailuresDataProvider${assignmentFailures.tableNumber}`;
    const columnProviderId = `assignmentFailuresColumnProvider${assignmentFailures.tableNumber}`;

    const gridDef = {};
    gridDef[ gridId ] = {
        dataProvider: dataProviderId,
        columnProvider: columnProviderId,
        addIconColumn: false,
        gridOptions: {
            enablePinning: true,
            enableSorting: false
        }
    };

    const dataProviderDef = {};
    const dataProviderDefJson = {
        dataProviderType: 'Static',
        response: assignmentFailures.rows,
        totalFound: assignmentFailures.rows.length

    };

    dataProviderDef[dataProviderId] = dataProviderFactory.createDataProvider( dataProviderDefJson,
        null, dataProviderId, declDataProviderService );
    const columnProviderDef = {};

    columnProviderDef[columnProviderId] = {
        frozenColumnIndex: 1,
        columns: [ {
                name: 'object',
                displayName: localizedMessages.object,
                minWidth: 250,
                enableColumnMenu: false
            },
            {
                name: 'purpose',
                displayName: localizedMessages.purpose,
                minWidth: 130,
                enableColumnMenu: false
            }, {
                name: 'assignedTo',
                displayName: localizedMessages.assignedTo,
                minWidth: 450,
                width: 550,
                enableColumnMenu: false
            }
        ]
    };


    return {
        id: gridId,
        gridDefinition: gridDef,
        dataProviderDefinition:dataProviderDef,
        columnProviderDefinition:columnProviderDef,
        dataProviderId:dataProviderId,
        columnProviderId:columnProviderId
    };
}

let exports;
export default exports = {
    getUpdateClonesWithDeletedMasterLabel,
    prepareMessageForTitleNumOfFailures,
    createCloneAssignmentFailuresGridDefinition
};
