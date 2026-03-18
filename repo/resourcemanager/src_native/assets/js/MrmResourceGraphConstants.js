// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global
 define
 */
/**
 * This module defines MRM Resource graph constants
 *
 * @module js/MrmResourceGraphConstants
 */

'use strict';

var exports = {};

/**
 * The layout options supported by MRM Resource graph component, object format as: {key: GCLayoutDirection, value: GCCommandId}
 */
export let MRMResourceLayoutOptions = {    
    // GCLayoutDirection: GCCommandId
    TopToBottom: 'GcTopToBottomLayout',
    BottomToTop: 'GcBottomToTopLayout',
    RightToLeft: 'GcRightToLeftLayout',
    LeftToRight: 'GcLeftToRightLayout',    
    Incremental: 'GcIncrementalLayout',    
    Organic: 'GcOrganicLayout'
};

export let MRMResourceGraphConstants = {
    MRMLicenseKey: 'resource_manager_mrl'
};

export default exports = {
    MRMResourceLayoutOptions,
    MRMResourceGraphConstants
};