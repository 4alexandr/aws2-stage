//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/**
 * APIs for epBreadcrumbsService
 * 
 * @module js/epBreadcrumbsService
 */

import _ from 'lodash';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import epLoadInputHelper from 'js/epLoadInputHelper';
import epLoadService from 'js/epLoadService';
import { constants as epBvrConstants } from 'js/epBvrConstants';
import mfeTypeUtils from 'js/utils/mfeTypeUtils';

/**
 * Build ep breadrumb
 * @param {Object} selectedObject selected objects
 * @returns {Promise} promise with breadcrumb structure
 */
export function buildEpBreadcrumb( selectedObject ) {
    if( !selectedObject ) {
        selectedObject = cdm.getObject( appCtxSvc.ctx.state.params.uid );
    }

    let breadcrumbProvider = {};
    breadcrumbProvider.crumbs = [];

    if( !selectedObject || _.isEmpty( selectedObject.props ) ) {
        return Promise.resolve( breadcrumbProvider );
    }
    breadcrumbProvider = buildCrumbs( selectedObject, breadcrumbProvider );
    return Promise.resolve( breadcrumbProvider );
}

const buildCrumbs = function( object, breadcrumbProvider ) {
    if( object.props && object.props[ epBvrConstants.BL_REV_OBJECT_NAME ] && breadcrumbProvider && appCtxSvc.ctx.ep.scopeObject ) {
        while( object && getParentUid( object ) !== undefined ) {
            const props = object.props;
            const crumb = {
                displayName: props[ epBvrConstants.BL_REV_OBJECT_NAME ].uiValues[ 0 ],
                selectedCrumb: object.uid === appCtxSvc.ctx.ep.scopeObject.uid,
                clicked: false,
                //We don't want to show chevron for Operations
                showArrow: !mfeTypeUtils.isOfTypes( object, [ epBvrConstants.MFG_BVR_OPERATION, epBvrConstants.MFG_PRODUCT_BOP ] ) ||
                    mfeTypeUtils.isOfType( object, epBvrConstants.MFG_PRODUCT_BOP ) && object.uid !== appCtxSvc.ctx.ep.scopeObject.uid,
                scopedUid: object.uid
            };
            breadcrumbProvider.crumbs.splice( 0, 0, crumb );
            object = cdm.getObject( getParentUid( object ) );
        }
    }
    return breadcrumbProvider;
};

/**
 * Load breadrumb data on chevron click event
 * @param {string} uid UID of the object for which breadcrumb data needs to be loaded
 * @returns {Object[]} array of objects Array of ViewModelObjects to be shown in list
 */
export function loadBreadcrumbData( uid ) {
    const loadTypeInputs = epLoadInputHelper.getLoadTypeInputs( 'Breadcrumbs', uid );
    return epLoadService.loadObject( loadTypeInputs, true ).then( function() {
        let modelObject = cdm.getObject( uid );
        let vmos = {};
        let subElements = [];
        if( mfeTypeUtils.isOfType( modelObject, epBvrConstants.MFG_PROCESS_STATION ) && modelObject.props && modelObject.props[ epBvrConstants.MFG_ALLOCATED_OPS ] &&
            modelObject.props[ epBvrConstants.MFG_ALLOCATED_OPS ].dbValues ) {
            subElements = modelObject.props[ epBvrConstants.MFG_ALLOCATED_OPS ].dbValues;
        } else if( modelObject.props && modelObject.props[ epBvrConstants.MFG_SUB_ELEMENTS ] && modelObject.props[ epBvrConstants.MFG_SUB_ELEMENTS ].dbValues ) {
            subElements = modelObject.props[ epBvrConstants.MFG_SUB_ELEMENTS ].dbValues;
        }

        for( let key in subElements ) {
            let subElement = subElements[ key ];
            vmos[ key ] = viewModelObjectSvc.createViewModelObject( subElement );
        }
        return Object.values( vmos );
    } );
}

const getParentUid = function( object ) {
    if( object.props && object.props[ epBvrConstants.BL_PARENT ] && !_.isEmpty( object.props[ epBvrConstants.BL_PARENT ].dbValues ) ) {
        return object.props[ epBvrConstants.BL_PARENT ].dbValues[ 0 ];
    }
};

let exports = {};
export default exports = {
    loadBreadcrumbData,
    buildEpBreadcrumb
};
