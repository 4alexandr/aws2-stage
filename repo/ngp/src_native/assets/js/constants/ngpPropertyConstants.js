// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Utility to check mfg_ngp object type
 *
 * @module js/constants/ngpPropertyConstants
 */
const ngpPropConstants = {
    MANUFACTURING_MODEL: 'mdl0model_object',
    FOUNDATION_ID: 'fnd0objectId',
    OBJECT_STRING: 'object_string',
    OBJECT_NAME: 'object_name',
    IS_MODIFIABLE: 'is_modifiable',
    CHECKED_OUT_USER: 'checked_out_user',
    IS_CHECKOUTABLE: 'fnd0IsCheckoutable',
    LAST_RELEASE_STATUS: 'last_release_status',
    CREATION_DATE: 'creation_date',

    PRODUCT_MODEL: 'Mpr0ProductModels',
    PRODUCT_EFFECTIVITY_FORMULA: 'mpr0EffectivityFormula',
    IS_CLASS_LIBRARY: 'mpr0isLibrary',
    ACTIVITY_SUB_PROCESSES: 'mpr0processElements',
    PROCESS_SUB_OPERATIONS: 'mpr0operations',
    BE_SUB_ACTIVITIES: 'Mpr0BuildElementActivities',
    BE_SUB_BES: 'Mpr0SubBuildElements',
    ACTIVE_MCN: 'mpc0activeMCN',
    ASSOCIATED_MCNS: 'mpc0associatedMCNs',
    ECNS_OF_MCN: 'CMImplements',
    PARENT_OF_OPERATION: 'mpr0processElement',
    PARENT_OF_PROCESS_OR_ME: 'mpr0activity',
    PARENT_OF_ACTIVITY_OR_BE: 'mpr0parentBuildElement',
    NUMBER_OF_ASSIGNED_PARTS: 'mpr0numberOfAssignedParts',
    NUMBER_OF_ASSIGNED_FEATURES: 'mpr0numOfAssignedFeatures',
    PREDECESSORS: 'mpr0predecessors',
    DISCONTINUED_PROCESSES: 'mpr0removedPEs',
    HAS_SUB_BUILD_ELEMENTS: 'mpr0hasSubBuildElements',
    HAS_ACTIVITIES: 'mpr0hasActivities',
    HAS_PROCESS_ELEMENTS: 'mpr0hasProcessElements',
    HAS_OPERATIONS: 'mpr0hasOperations'
};

export default ngpPropConstants;
