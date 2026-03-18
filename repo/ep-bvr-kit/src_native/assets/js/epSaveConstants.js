// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/epSaveConstants
 */

'use strict';

export const constants = {

    // SAVE INPUT
    OBJECTS_TO_CREATE: 'ObjectsToCreate',
    OBJECTS_TO_DELETE: 'ObjectsToDelete',
    OBJECTS_TO_MODIFY: 'ObjectsToModify',
    OBJECTS_TO_CLONE: 'ObjectsToClone',
    OBJECT_TO_INSTANTIATE: 'ObjectToInstantiate',
    CREATE_WORKFLOW: 'CreateWorkflow',
    ACCOUNTABILITY_CHECK: 'AccountabilityCheck',
    SESSION: 'session',
    RELOAD: 'Reload',
    CREATE_REPORT: 'CreateReport',
    CREATE_ALTERNATIVE: 'CreateAlternative',
    TIME_UNITS: 'timeUnits',
    OBJECTS_TO_REVISE: 'ObjectsToRevise',
    REMOVED_FROM_RELATION: 'removedFromRelation',
    ADDED_TO_RELATION: 'addedToRelation',

    CREATE_DATASET_RELATION: 'create',
    DATASET_ID: 'datasetID',

    // EVENTS
    EVENT_PRIMITIVE_PROPERTIES: 'MODIFY_PRIMITIVE_PROPERTIES',
    EVENT_MODIFY_RELATIONS: 'MODIFY_RELATIONS',
    EVENT_MODIFY_PRIMITIVE_PROPERTIES: 'modifyPrimitiveProperties',
    REPORT_GENERATED: 'reportGenerated',
    DELETE: 'delete'
};

export default { constants };
