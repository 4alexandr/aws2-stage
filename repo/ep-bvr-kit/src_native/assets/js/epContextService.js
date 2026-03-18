// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';

/**
 * @module js/epContextService
 */
'use strict';

const EP_PAGE_CONTEXT = 'epPageContext';
const PAGE_CONTEXT_CHANGED_EVENT = 'ep.pageContext.changed';
const PRODUCT_VARIANT_CHANGED_EVENT = 'ep.productVariant.changed';

const context = {
    pageContext: {},
    productVariant: undefined,
    productVariantType: {},
    effectivityDate: {},
    revisionRule: {},
    unitNumber: {}
};

export const setPageContext = function( contextKey, contextValue ) {
    context.pageContext[ contextKey ] = contextValue;
    appCtxService.updateCtx( EP_PAGE_CONTEXT, context.pageContext );
};

export const notifyContextChanged = function() {
    eventBus.publish( PAGE_CONTEXT_CHANGED_EVENT );
};

export const clearContext = function() {
    context.pageContext = {};
    appCtxService.unRegisterCtx( EP_PAGE_CONTEXT );
    eventBus.publish( PAGE_CONTEXT_CHANGED_EVENT, {
        pageContext: {}
    } );
};

export const setProductVariant = function( productVariant, productVariantType, supressEvent ) {
    if( context.productVariant !== productVariant || context.productVariantType !== productVariantType ) {
        context.productVariant = productVariant;
        context.productVariantType = productVariantType;
        if( !supressEvent ) {
            eventBus.publish( PRODUCT_VARIANT_CHANGED_EVENT, {
                selectedProductVariant: productVariant,
                selectedProductVariantType: productVariantType
            } );
        }
    }
};


export const setEffectivityDate = ( effectivityDate ) => { context.effectivityDate = effectivityDate; };
export const setRevisionRule = ( revisionRule ) => { context.revisionRule = revisionRule; };
export const setUnitNumber = ( unitNumber ) => { context.unitNumber = unitNumber; };
export const setEndItem = ( endItem ) => { context.endItem = endItem; };

export const getPageContext = () => context.pageContext;
export const getProductVariant = () => context.productVariant;
export const getProductVariantType = () => context.productVariantType;
export const getEffectivityDate = () => context.effectivityDate;
export const getRevisionRule = () => context.revisionRule;
export const getUnitNumber = () => context.unitNumber;
export const getEndItem = () => context.endItem;

export default {
    setPageContext,
    notifyContextChanged,
    clearContext,
    setProductVariant,
    setEffectivityDate,
    setRevisionRule,
    setUnitNumber,
    setEndItem,
    getPageContext,
    getProductVariant,
    getProductVariantType,
    getEffectivityDate,
    getRevisionRule,
    getUnitNumber,
    getEndItem
};
