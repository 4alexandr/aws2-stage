//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Sm1StockMaterialService
 */
import app from 'app';
import addObjectUtils from 'js/addObjectUtils';
import dmSvc from 'soa/dataManagementService';
import appCtxSvc from 'js/appCtxService';
import modelPropertySvc from 'js/modelPropertyService';
import commandsMapService from 'js/commandsMapService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/**
 * JS function to set type filter used for search
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} typeFilter - object type
 */
export let setTypefilterAndSearch = function( data, typefilter ) {
    if( data ) {
        data.typeFilter = typefilter;
        addObjectUtils.findSubBusinessObjectsAndInvokeSearch( data );
    }
};

/**
 * On Tab Selection change, reset showSearchFilter to false
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let handleTabSelectionChange = function( data ) {
    // Check if data is not null and selected tab is true then only set
    // the selected object to null always if user selected some object earlier before tab selection
    if( data && data.selectedTab.tabKey === 'search' ) {
        data.showSearchFilter = false;
    }
};

/**
 * This js function calls is to get the input data
 *
 * @param {Object} data from the Properties page
 * @param {Object} selectedObject object
 * @return input data
 */

var getInputData = function( data, selectedObject ) {
    var inputs = addObjectUtils.getCreateInput( data );
    _.forEach( data.inputParameters, function( inputParam ) {
        inputs[ 0 ].createData.propertyNameValues[ inputParam.propertyName ] = [ inputParam.dbValue.toString() ];
    } );

    inputs[ 0 ].createData.propertyNameValues.primary_object = [ appCtxSvc.ctx.selected.uid ];
    if( commandsMapService.isInstanceOf( 'ItemRevision', selectedObject.modelType ) ) {
        inputs[ 0 ].createData.propertyNameValues.secondary_object = [ selectedObject.props.items_tag.dbValues[ 0 ] ];
    } else {
        inputs[ 0 ].createData.propertyNameValues.secondary_object = [ selectedObject.uid ];
    }

    return inputs;
};

/**
 * This js function calls createRelations SOA and creates relation SM0MadeFrom
 *
 * @param {Object} data from the Properties page
 * @return{Object} success or failure
 */
export let attachStockMaterial = function( data, dataprovider ) {
    var inputs = getInputData( data, dataprovider );
    return dmSvc.createRelateAndSubmitObjects( inputs );
};

/**
 * This function displays the SM0MadeFrom info in the panel
 *
 * @param {Object} data - The view model data
 * @param {Object} provider - provider
 * @param {String} titleLabel - label to displayed
 */
export let displayMadeFromPanel = function( data, provider, titleLabel ) {
    if( data && provider ) {
        var selectedObject = _.get( provider, 'selectedObjects[0]' );
        if( !selectedObject || selectedObject === 'undefined' ) {
            return;
        }
        appCtxSvc.unRegisterCtx( 'selectedStdPartOrStockMaterial' );
        var destPanelId = 'Sm1MadeFrom';
        var activePanel = data.getSubPanel( data.activeView );
        if( activePanel ) {
            activePanel.contextChanged = true;
        }

        var context = {
            destPanelId: destPanelId,
            title: titleLabel,
            supportGoBack: true
        };
        appCtxSvc.registerCtx( 'selectedStdPartOrStockMaterial', selectedObject );
        context.recreatePanel = true;
        eventBus.publish( 'awPanel.navigate', context );
    }
};

/**
 * This returns the list of cut dimensions displayed in user interface.
 *
 * @param {response} response - SoA response
 * @return {ObjectArray} - the array of cut dimension attributes.
 */
export let getCutDimensionList = function( response ) {
    var diemensionList = [];
    if( response ) {
        _.forEach( response.cutDimensionsData, function( inputParam ) {
            _.forEach( inputParam.cutDimesionPropeties, function( madeFromRelProperty ) {
                var cutDimProperties = {};
                cutDimProperties.displayName = madeFromRelProperty.displayName;

                cutDimProperties.propName = madeFromRelProperty.propName;
                cutDimProperties.type = madeFromRelProperty.type;
                cutDimProperties.dbValue = madeFromRelProperty.initValue;
                cutDimProperties.dispValue = madeFromRelProperty.initValue;
                cutDimProperties.uiValue = madeFromRelProperty.initValue;
                cutDimProperties.isEditable = madeFromRelProperty.isEditable;
                cutDimProperties.isEnabled = madeFromRelProperty.isEnabled;
                cutDimProperties.isRequired = madeFromRelProperty.isRequired;
                var view1 = modelPropertySvc.createViewModelProperty( cutDimProperties );

                diemensionList.push( view1 );
            } );
        } );
    }

    return diemensionList;
};

/**
 * Sm1StockMaterialService factory
 *
 */

export default exports = {
    setTypefilterAndSearch,
    handleTabSelectionChange,
    attachStockMaterial,
    displayMadeFromPanel,
    getCutDimensionList
};

/**
 * Sm1StockMaterialService returned as moduleServiceNameToInject
 *
 */
app.factory( 'Sm1StockMaterialService', () => exports );

