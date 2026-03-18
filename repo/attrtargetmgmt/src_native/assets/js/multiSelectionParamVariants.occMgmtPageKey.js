// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the multiSelectionParamVariants occ mgmt page contribution.
 *
 * @module js/multiSelectionParamVariants.occMgmtPageKey
 */
import _ from 'lodash';
import 'soa/kernel/clientDataModel';
import 'js/conditionService';
import 'js/appCtxService';

'use strict';

var contribution = {
    label: {
        source: '/i18n/Att1AttrMappingMessages',
        key: 'Variants'
    },
    priority: 4,
    pageNameToken: 'Att1VariantsTab',
    condition: function( selection, $injector ) {
        if( selection.length > 0 ) {
            var conditionService = $injector.get( 'conditionService' );
            var appCtxService = $injector.get( 'appCtxService' );
            var cdm = $injector.get( 'soa_kernel_clientDataModel' );
            var conditionExpression = 'ctx.occmgmtContext.supportedFeatures.Awb0SupportsVariantConditionAuthoring';
            var isConfiguratorContextAttached = conditionService.evaluateCondition( {
                ctx: appCtxService.ctx,
                selected: selection
            }, conditionExpression );

            if( isConfiguratorContextAttached ) {
                if( 1 === selection.length && isVariantConfigurableSelected( appCtxService, selection ) ) {
                    //Putting applied variant rules info from 'occmgmtContext' to 'variantConditionContext' so that 'aw-cfg-variant-table.directive' will be
                    //independent of ACE and it will read variant rules info from this context
                    var currentAppliedVRs = appCtxService.ctx.occmgmtContext.productContextInfo.props.awb0CurrentVariantRules.dbValues;
                    var variantConditionContext = {};
                    if( currentAppliedVRs ) {
                        variantConditionContext = {
                            variantRules: currentAppliedVRs
                        };
                    }

                    // Register variant condition context
                    variantConditionContext.showVariantRules = false;
                    updateVariantConditionContext( appCtxService, variantConditionContext );
                    //Blocking Variants Tab for CD for AW4.0 .
                    return false;
                }
                //Now check if the selected object type is conditional element
                var typeToCheck = 'Awb0ConditionalElement';
                var matchingObjects = selection.filter( function( modelObject ) {
                    return  modelObject.modelType.typeHierarchyArray.indexOf( typeToCheck ) > -1;
                } );
                // TODO: Shashank to discuss with ACE team and remove 4G specific logic to control visibility
                // of Variants tab
                var invalidObjsSelected = false;
                var currentProductUid = appCtxService.ctx.occmgmtContext.productContextInfo.props.awb0Product.dbValues[ 0 ];
                if( currentProductUid ) {
                    var product = cdm.getObject( currentProductUid );
                    if( product &&
                        product.modelType &&
                        ( product.modelType.typeHierarchyArray.indexOf( 'Cpd0DesignSubsetElement' ) > -1 || product.modelType.typeHierarchyArray
                            .indexOf( 'Cpd0WorksetRevision' ) > -1 ) ) {
                        invalidObjsSelected = areInvalid4GObjectsSelected( cdm, selection );
                    }
                }
                if( selection.length === matchingObjects.length || invalidObjsSelected ) {
                    var variantConditionCntxt = {
                        showVariantRules: false
                    };
                    updateVariantConditionContext( appCtxService, variantConditionCntxt );
                    if( invalidObjsSelected ) {
                        return false;
                    }
                    return true;
                }
            }
            return false;
        }
        return false;
    }
};

/**
 * Checks if any 4G objects that don't support authoring variant conditions selected or object that have
 * different product context selected
 *
 */
function areInvalid4GObjectsSelected( cdm, selection ) {
    var invalidObjsSelected = false;
    var parentUids = [];

    for( var i = 0; i < selection.length; i++ ) {
        // check if selection is a subset
        if( selection[ i ].modelType.typeHierarchyArray.indexOf( 'Fgd0DesignSubsetElement' ) > -1 ) {
            invalidObjsSelected = true;
            break;
        }
        if( selection[ i ].props.awb0Parent ) {
            parentUids.push( selection[ i ].props.awb0Parent.dbValues[ 0 ] );
        }
    }
    // At least one of the selection is Subset so return
    if( invalidObjsSelected ) {
        return true;
    }

    parentUids = _.uniq( parentUids );
    if( parentUids.length > 1 ) {
        //When there are more than one parent objects for selections then
        // Check if parent of any selected element is a design subset element
        for( var j = 0; j < parentUids.length; j++ ) {
            var parent = cdm.getObject( parentUids[ j ] );
            if( parent && parent.modelType &&
                parent.modelType.typeHierarchyArray.indexOf( 'Fgd0DesignSubsetElement' ) > -1 ) {
                invalidObjsSelected = true;
                break;
            }
        }
    }
    return invalidObjsSelected;
}

/**
 * Checks if variant configurable object is selected
 */
function isVariantConfigurableSelected( appCtxService, selection ) {
    var productUid = appCtxService.ctx.occmgmtContext.productContextInfo.props.awb0Product.dbValues[ 0 ];
    if( selection[ 0 ].props.awb0UnderlyingObject !== undefined ) {
        var selectedUid = selection[ 0 ].props.awb0UnderlyingObject.dbValues[ 0 ];
        return productUid === selectedUid;
    }
    return false;
}

/**
 * Registers/Updates Variant condition context
 */
function updateVariantConditionContext( appCtxService, variantConditionContext ) {
    var context = appCtxService.getCtx( 'variantConditionContext' );
    //Update VariantConditionContext only if it is changed
    if( context && context.showVariantRules === variantConditionContext.showVariantRules &&
        context.variantRules === variantConditionContext.variantRules ) {
        return;
    }
    if( appCtxService.getCtx( 'variantConditionContext' ) ) {
        appCtxService.updateCtx( 'variantConditionContext', variantConditionContext );
    } else {
        appCtxService.registerCtx( 'variantConditionContext', variantConditionContext );
    }
}

/**
 *
 * @param {*} key
 * @param {*} deferred
 */
export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
