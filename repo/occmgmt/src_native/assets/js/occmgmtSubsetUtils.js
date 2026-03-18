// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtSubsetUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';

var exports = {};

/**
 * Get the product context for the given object
 * @param {Object} object Object whose UID needs to be figured out
 * @return {Object} Uid of the productContext corresponding to the selected object if it is available in the elementToPCIMap;
 *         the productContext from the URL otherwise
 */
export let getProductContextForProvidedObject = function( object ) {
    if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context ) {
        if( appCtxService.ctx.aceActiveContext.context.elementToPCIMap ) {
            var parentObject = object;

            do {
                if( appCtxService.ctx.aceActiveContext.context.elementToPCIMap[ parentObject.uid ] ) {
                    return appCtxService.ctx.aceActiveContext.context.elementToPCIMap[ parentObject.uid ];
                }

                var parentUid = exports.getParentUid( parentObject );
                parentObject = cdmService.getObject( parentUid );
            } while( parentObject );
        } else {
            return appCtxService.ctx.aceActiveContext.context.currentState.pci_uid;
        }
    }
    return null;
};

/** Returns the parent UID
 * @param {IModelObject} modelObject - model object
 * @return {Object} parent uid if found or null
 */
export let getParentUid = function( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;

        var uid;

        if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
            uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
        } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmService.isValidObjectUid( uid ) ) {
            return uid;
        }
    }

    return null;
};

/** Sets the ui value for replay date
 * @param {Object} data - view model data object
 */
export let setReplayDate = function( data ) {
    if( data && data.replayDate ) {
        var date = new Date( data.replayDate.dbValue );
        if( date && date.getTime() ) {
            data.replayDate.uiValue = dateTimeSvc.formatSessionDateTime( date );
        }
    }
};

export default exports = {
    getProductContextForProvidedObject,
    getParentUid,
    setReplayDate
};
/**
 * @memberof NgServices
 * @member occmgmtSubsetUtils
 */
app.factory( 'occmgmtSubsetUtils', () => exports );
