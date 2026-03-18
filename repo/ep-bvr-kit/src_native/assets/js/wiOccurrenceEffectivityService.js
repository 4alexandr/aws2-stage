// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Some API for occurrence Effectivity popup.
 *
 * @module js/wiOccurrenceEffectivityService
 */
import eventBus from 'js/eventBus';
import vMOService from 'js/viewModelObjectService';

'use strict';

export function searchEndItem( viewModelData, conditionData ) {
    if( viewModelData.endItemSearchBox.dbValue && viewModelData.endItemSearchBox.dbValue.length > 0 ) {
        viewModelData.dataProviders.performSearchForEndItem.viewModelCollection.loadedVMObjects.length = 0;
        conditionData.showSearchingLabel = true;
        viewModelData.loadingLable.dbValue = viewModelData.i18n.loadingLable;
        eventBus.publish( 'searchEndItems.doSearch' );
    }
}

export function processSoaResponseForBOTypes( response ) {

    const typeNames = [];
    response.output.forEach(output =>{    
            output.displayableBOTypeNames.forEach(dispTypeName=>{
                typeNames.push( {
                    searchFilterType: 'StringFilter',
                    stringValue: dispTypeName.boName
                } );
            });        
    } );   
    return typeNames;
}

export function updateSearchingStatus( viewModelData ) {
    if( viewModelData.endItemsTotalFound > 0 ) {
        viewModelData.getConditionStates().showSearchingLabel = false;
    } else {
        viewModelData.getConditionStates().showSearchingLabel = true;
        viewModelData.loadingLable.dbValue = viewModelData.i18n.noResultFound;
    }
}

export function fillInitialPopupData(dataProvider, units, effectivityObj){
    units.dbValue = effectivityObj.props.range_text.dbValues[0];
    const existingEndItem = vMOService.createViewModelObject( effectivityObj.props.end_item.dbValues[0] );
    dataProvider.viewModelCollection.loadedVMObjects = [existingEndItem];
    dataProvider.viewModelCollection.setTotalObjectsFound( 1 );
}

let exports = {};
export default exports = {
    updateSearchingStatus,
    processSoaResponseForBOTypes,
    searchEndItem,
    fillInitialPopupData
};
