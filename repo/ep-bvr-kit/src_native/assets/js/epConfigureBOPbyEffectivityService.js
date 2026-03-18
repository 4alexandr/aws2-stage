// Copyright 2020 Siemens Product Lifecycle Management Software Inc.
/* eslint-disable max-lines */
/* eslint-disable complexity */
/*
global
*/

/**
 * Some API for planning service.
 *
 * @module js/epConfigureBOPbyEffectivityService
 */
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import _epLoadInputHelper from 'js/epLoadInputHelper';
import _epLoadService from 'js/epLoadService';
import popupSvc from 'js/popupService';

export function openConfigurePlan( viewModelData ) {
    let addLoadParams;
    if( appCtxSvc.ctx.preferences.EP_EffectivityMode[ 0 ] === 'UNIT' ) {
        addLoadParams = [ {
                tagName: 'effectivity',
                attributeName: 'unit',
                attributeValue: viewModelData.configurePlanUnit.dbValues[ 0 ]
            },
            {
                tagName: 'effectivity',
                attributeName: 'endItem',
                attributeValue: appCtxSvc.ctx.selectedEndItem.selectedObjects[ 0 ].uid
            },
            {
                tagName: 'revisionRule',
                attributeName: 'uid',
                attributeValue: viewModelData.revisionRuleListElement.dbValue
            }
        ];
    } else {
        const timestamToDateVal = new Date( viewModelData.configurePlanToDate.dbValue );
        const month = timestamToDateVal.getMonth() + 1;
        const formatedDate = timestamToDateVal.getFullYear() + '-' + month + '-' + timestamToDateVal.getDate();
        addLoadParams = [ {
                tagName: 'effectivity',
                attributeName: 'date',
                attributeValue: formatedDate
            },
            {
                tagName: 'revisionRule',
                attributeName: 'uid',
                attributeValue: viewModelData.revisionRuleListElement.dbValue
            }
        ];
    }
    const loadTypeInputs = _epLoadInputHelper.getLoadTypeInputs( 'Effectivity', appCtxSvc.ctx.ep.scopeObject.uid, '', '', addLoadParams );
    _epLoadService.loadObject( loadTypeInputs, true ).then(
        function( response ) {
            if( response.loadedObjectsMap.loadedObject[ 0 ].uid ) {
                const objectToLoad = {
                    uid: response.loadedObjectsMap.loadedObject[ 0 ].uid
                };

                eventBus.publish( 'configureEffectivity.openConfigurePlanInNewTab', objectToLoad );
            }
        } );
}

export function searchEndItem( viewModelData, conditionData ) {
    if( viewModelData.endItemSearchBox.dbValue && viewModelData.endItemSearchBox.dbValue.length > 0 ) {
        viewModelData.dataProviders.performSearchForEndItem.viewModelCollection.loadedVMObjects.length = 0;
        conditionData.showSearchingLabel = true;
        viewModelData.loadingLable.dbValue = viewModelData.i18n.loadingLable;
        eventBus.publish( 'searchEndItems.doSearch' );
    }
}

export function processSoaResponseForBOTypes( response ) {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].displayableBOTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ].boName;
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
}

export function getRevisonListFromRes( response ) {
    var revisionRuleListArray = [];
    let revRuleObj={};
    if(appCtxSvc.ctx.userSession.props.awp0RevRule)
    {
        let globalRevRule=appCtxSvc.ctx.userSession.props.awp0RevRule.displayValues[0];
        revRuleObj.propDisplayValue = globalRevRule;
        revRuleObj.dispValue=globalRevRule;
        revRuleObj.propInternalValue=appCtxSvc.ctx.userSession.props.awp0RevRule.value;
        revisionRuleListArray.push( revRuleObj );
    }
    for( var lovValRow in response.lovValues ) {
        if( response.lovValues.hasOwnProperty( lovValRow ) ) {
            var revRuleListObj = {};
            var targetProgram = response.lovValues[ lovValRow ].propDisplayValues.object_name[ 0 ];
            revRuleListObj.propDisplayValue = targetProgram;
            revRuleListObj.dispValue = targetProgram;
            revRuleListObj.propInternalValue = response.lovValues[ lovValRow ].uid;
            if(revRuleObj.propInternalValue !== revRuleListObj.propInternalValue)
            {
                revisionRuleListArray.push( revRuleListObj );
            }
        }
    }
    return revisionRuleListArray;
}

export function endItemChanged( selectedEndItem ) {
    if( selectedEndItem ) {
        appCtxSvc.registerCtx( 'selectedEndItem', selectedEndItem );
    }
}
export function updateSearchingStatus( viewModelData ) {
    if( viewModelData.endItemsTotalFound > 0 ) {
        viewModelData.getConditionStates().showSearchingLabel = false;
    } else {
        viewModelData.getConditionStates().showSearchingLabel = true;
        viewModelData.loadingLable.dbValue = viewModelData.i18n.noResultFound;
    }
}

export function displayPopup( parameters ) {
    const promise = popupSvc.show( parameters );
    return promise.then( function() {
        eventBus.publish( 'getInitialLoadData' );
    } );
}

let exports = {};
export default exports = {
    openConfigurePlan,
    updateSearchingStatus,
    endItemChanged,
    getRevisonListFromRes,
    processSoaResponseForBOTypes,
    searchEndItem,
    displayPopup
};
