// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
import eventBus from 'js/eventBus';

'use strict';

/**
 * @module js/mbmCnIndicatorService
 */

/**
 * This method adds the click action on the data
 *
 * @param {Object} data view model data  
 * 
 */
export const initilizeClickListner = function(data)
{
    data.cnIndicatorClickAction = function(cnObject,event)
    {
        const eventData={
            cnObject:cnObject,
            sourceEvent:event
        };
        eventBus.publish("mbm.cnIndicatorClickEvent",eventData);
    };
};

export default {
    initilizeClickListner
};