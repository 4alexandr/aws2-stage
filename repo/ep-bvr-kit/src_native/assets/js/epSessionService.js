// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import _ from 'lodash';
import epContextService from 'js/epContextService';
import appCtxSvc from 'js/appCtxService';
import awStateSvc from 'js/awStateService';

/**
 * @module js/epSessionService
 */
'use strict';

const DEFAULT_PV_VAL = 'ALL';
const SESSION_TAG = 'session';

let mcn = null;
let balancingScope = null;

export const setMCN = ( mcnObj ) => { mcn = mcnObj; };

export const setBalancingScope = ( object ) => { balancingScope = object; };

export const getSessionSection = function( isPerformCheck ) {
    const dataEntries = [];
    dataEntries.push( createPVEntry() );

    let closeOldWindows = appCtxSvc.getCtx( 'ep.closeOldWindows' );
    if( closeOldWindows ) {
        const epPageContext = epContextService.getPageContext();
        if( epPageContext ) {
            const state = awStateSvc.instance;
            const unloadWindowsUid = epPageContext.collaborationContext ? epPageContext.collaborationContext.uid : state.params.uid;
            if( unloadWindowsUid ) {
                dataEntries.push( createUnloadSessionWindowsEntry( unloadWindowsUid ) );
            }
        }
    }

    if( mcn ) {
        dataEntries.push( createMCNEntry() );
    }

    //for save we pass isPerformCheck to getSessionSection, for load - pass nothing
    if( typeof isPerformCheck !== 'undefined' && isPerformCheck !== null ) {
        dataEntries.push( createPerformCheckEntry( isPerformCheck ) );
    }

    if( balancingScope ) {
        dataEntries.push( createBalancingScopeEntry() );
    }

    return {
        sectionName: SESSION_TAG,
        dataEntries: dataEntries
    };
};

const createPVEntry = function() {
    let productVariantType = epContextService.getProductVariantType();
    const productVariant = epContextService.getProductVariant();

    if( productVariantType === null || _.isEmpty( productVariantType ) ) {
        productVariantType = DEFAULT_PV_VAL;
    }

    const entry = {
        entry: {
            productVariant: {
                nameToValuesMap: {
                    Type: [ String( productVariantType ).toUpperCase() ]
                }
            }
        }
    };

    if( productVariant && productVariant.uid ) {
        entry.entry.productVariant.nameToValuesMap.uid = [ productVariant.uid ];
    }

    return entry;
};

const createMCNEntry = function() {
    const rootL = epContextService.getPageContext().loadedObject ? epContextService.getPageContext().loadedObject.uid : '';

    return {
        entry: {
            appliedMCN: {
                nameToValuesMap: {
                    value: [ mcn ],
                    rootLine: [ rootL ]
                }
            }
        }
    };
};

const createBalancingScopeEntry = () => ( {
    entry: {
        balancingScope: {
            nameToValuesMap: {
                uid: [ balancingScope.uid ]
            }
        }
    }
} );

const createPerformCheckEntry = ( isPerformCheck ) => ( {
    entry: {
        PerformCheck: {
            nameToValuesMap: {
                value: [ isPerformCheck.toString() ]
            }
        }
    }
} );

const createUnloadSessionWindowsEntry = ( unloadCCUID ) => ( {
    entry: {
        UnloadSessionWindows: {
            nameToValuesMap: {
                uid: [ unloadCCUID ]
            }
        }
    }
} );

let exports;
export default exports = {
    setMCN,
    setBalancingScope,
    getSessionSection
};
