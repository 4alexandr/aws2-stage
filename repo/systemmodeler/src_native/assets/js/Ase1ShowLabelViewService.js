//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/Ase1ShowLabelViewService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * create a string array of display names of label property
 * @param {Object} data view model data
 */
export let populateLabelList = function( data ) {
    var context = appCtxSvc.getCtx( 'interfacesLabelCtx' );
    var labelsMap = context.LabelProperties;
    var currentLabel = context.selectedLabelProperty;

    if( !labelsMap || labelsMap.length <= 0 ) {
        return;
    }
    var listModels = [];
    _.forEach( labelsMap, function( value, key ) {
        if( key === currentLabel ) {
            data.labelsList.dbValue = key;
            data.labelsList.dispValue = value;
        }

        var listModel = _.clone( data.listModel );

        listModel.propDisplayValue = value;
        listModel.propInternalValue = key;
        listModels.push( listModel );

    } );
    data.labelArray = listModels;
};

/**
 * Update the context for selected label property
 * @param {String} label selected label
 */
export let updateContextForLabel = function( label ) {
    var context = appCtxSvc.getCtx( 'interfacesLabelCtx' );
    if( context ) {
        context.selectedLabelProperty = label;
    }
    eventBus.publish( "Ase1InterfacesPage.clearPrimaryView" );
    eventBus.publish( "Ase1InterfacesPage.getInterfaces", {
        navigationMode: "UpdateLabelProperties",
        sortByLabel: label
    } );
};

/**
 * Return an Object of Ase1ShowLabelViewService
 *
 * @param {Object}  appCtxSvc App Context Service
 *
 * @return {Object} service exports
 */

export default exports = {
    populateLabelList,
    updateContextForLabel
};
app.factory( 'Ase1ShowLabelViewService', () => exports );
