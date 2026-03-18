// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/Att1AddParameterGroupService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import addObjectUtils from 'js/addObjectUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

import 'soa/kernel/soaService';

var exports = {};

var _data = null;
var clearSelectedType1 = function() {
    if( _data ) {
        _data.creationType = null;
    }
};

export let initNavigateFunction = function( data ) {
    _data = data;
    data.clearSelectedType = clearSelectedType1;
};
export let navigateAndCreateInput = function( data ) {
    data.clearSelectedType = clearSelectedType1;

    if( !data.eventData && data.creationType ) {
        return;
    }
    if( data.eventData && data.eventData.selectedObjects ) {
        if( data.eventData.selectedObjects.length === 0 ) {
            if( data.dataProviders.awTypeSelector &&
                data.dataProviders.awTypeSelector.selectedObjects.length === 1 ) {
                data.creationType = data.dataProviders.awTypeSelector.selectedObjects[ 0 ];
            }
        } else {
            data.creationType = data.eventData.selectedObjects[ 0 ];
            if( data.creationType.props.type_name.uiValue !== 'undefined' ) {
                data.creationType.props.type_name.propertyDisplayName = data.creationType.props.type_name.uiValue;
            }
        }
    } else {
        data.creationType = null;
    }

    // clear the event data. This is needed to ensure updateDeclModel does not go in recursion
    data.eventData = null;
};

/**
 * this function is used to get the create Input parameters for parameter group creation
 *@argument {object} data parent id of group
  @returns  {Array} createInput createInput for soa call
 */
export let getCreateInput = function( data ) {
    logger.info( data );
    var createInput = addObjectUtils.getCreateInput( data );
    var parentObj = appCtxSvc.ctx.panelContext;
    var selectedObj = _.get( appCtxSvc, 'ctx.parammgmtctx.selected', undefined );
    if( parentObj && selectedObj && parentObj.uid === selectedObj.uid ) {
        //for case when we are in Parameter Project and we create Parameter Group without selecting anything
        createInput[ 0 ].createData.propertyNameValues.att0Parent = [ parentObj.uid ];
    } else {
        createInput[ 0 ].createData.propertyNameValues.att0Parent = [ selectedObj.uid ];
    }
    return createInput;
};
export let getCreatedObject = function( response ) {
    var createdModelObject = null;
    var createdObjects = addObjectUtils.getCreatedObjects( response );
    if( createdObjects && createdObjects.length > 0 ) {
        createdModelObject = createdObjects[ 0 ];
    }
    return createdModelObject;
};
export let handleGroupAddition = function( data ) {
    var relatedModifiedData = {
        createdObjects: data.eventData.createdObjects,
        isPinnedFlag: data.unpinnedToForm.dbValue,
        relatedModified: data.eventData.relatedModified
    };
    if( data.pinnedToForm.dbValue ) {
        eventBus.publish( 'complete', { source: 'toolAndInfoPanel' } );
    }
    eventBus.publish( 'paramProject.expandSelectedNode', relatedModifiedData );
};
/**
 * set the pin on the data
 *
 * @param {Object} data - the view model data
 */
export let setPin = function( data ) {
    data.pinnedToForm.dbValue = false;
    data.unpinnedToForm.dbValue = true;
    eventBus.publish( 'addParameterGroup.pinnedToForm', {
        pinnedToForm: true
    } );
};

/**
 * set unpin on the data
 *
 * @param {Object} data - the view model data
 */
export let setUnPin = function( data ) {
    data.pinnedToForm.dbValue = true;
    data.unpinnedToForm.dbValue = false;
    eventBus.publish( 'addParameterGroup.pinnedToForm', {
        pinnedToForm: false
    } );
};
/**
 * Reset the attribute definition and xrt
 *
 * @param {Object} data the view model data object
 */
export let clearSelectedType = function( data ) {
    data.clear = true;
};

export default exports = {
    initNavigateFunction,
    navigateAndCreateInput,
    getCreateInput,
    getCreatedObject,
    handleGroupAddition,
    setPin,
    setUnPin,
    clearSelectedType
};
app.factory( 'Att1AddParameterGroupService', () => exports );
