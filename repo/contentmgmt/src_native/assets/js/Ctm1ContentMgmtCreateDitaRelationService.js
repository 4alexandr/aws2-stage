// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ctm1ContentMgmtCreateDitaRelationService
 */
import app from 'app';
import localeSvc from 'js/localeService';

var exports = {};

var _localizedText = {};

export let updateReferenceTopicTypeList = function( response, ctx ) {
    var topicTypeList = [];

    // Clear the current dropdown
    if( ctx.referenceTopicType ) {
        ctx.referenceTopicType.dbValue = '';
        ctx.referenceTopicType.dbValues = [ '' ];
        ctx.referenceTopicType.uiValue = '';
        ctx.referenceTopicType.uiValues = [ '' ];
    }

    if( response.output ) {
        for( var x = 0; x < response.output.length; ++x ) {
            for( var y = 0; y < response.output[ x ].relationshipData.length; ++y ) {
                for( var z = 0; z < response.output[ x ].relationshipData[ y ].relationshipObjects.length; ++z ) {
                    var obj = response.output[ x ].relationshipData[ y ].relationshipObjects[ z ];

                    if( obj.otherSideObject.modelType.typeHierarchyArray.indexOf( 'DC_RefTopicType' ) >= 0 ) {
                        topicTypeList.push( {
                            propDisplayValue: obj.otherSideObject.props.object_name.uiValues[ 0 ],
                            propInternalValue: obj.otherSideObject.uid
                        } );
                    }
                }
            }
        }
    }

    ctx.referenceListValues = topicTypeList;

    return response;
};

/**
 * This method is used for Add panels to get the Relation Selection list for its data provider.
 * @returns {Array} the LOV return values
 */
export let getDitaRelationList = function() {
    var relationListValues = [ {
            propDisplayValue: _localizedText.composableReference,
            propInternalValue: 'DC_ComposableReferenceR'
        },
        {
            propDisplayValue: _localizedText.topicToTopicReference,
            propInternalValue: 'DC_TopicTopicR'
        }
    ];

    return relationListValues;
};

/**
 * This method is used for Add panels to get the reference topic type list for its data provider.
 * @param {Object} ctx the ctx
 * @param {Object} data the data
 * @returns {Array} the LOV return values
 */
export let getReferenceList = function( ctx, data ) {
    return ctx.ctm1.referenceTopicTypeList;
};

/**
 * This function moves the data fields from Data to Ctx since these variables are used in post processing
 * and cannot be apart of the create.
 * @param {Object} ctx the ctx
 * @param {Object} data the data
 */
export let moveDitaRelationDataToCtx = function( ctx, data ) {
    ctx.relationSelection = data.relationSelection;
    ctx.referenceTopicType = data.referenceTopicType;
    ctx.ctm0KeyName = data.ctm0KeyName;
    ctx.referenceListValues = [];

    delete data.relationSelection;
    delete data.referenceTopicType;
    delete data.ctm0KeyName;
};

/**
 * This method returns the input data for the SOA that saves properties back to the database.
 * @param {Object} data the view data
 * @param {Object} ctx the ctx
 * @returns {Object} the SOA inputs
 */
export let buildInputForDitaRelationWorkflow = function( data, ctx ) {
    var inputs = [];
    var modifiedProperties = [];

    var obj = {
        type: 'Ctm1Topic',
        uid: data.addElementResponse.selectedNewElementInfo.newElements[ 0 ].uid
    };

    var modifiedProperty = {
        propertyName: 'iav1OccType',
        dbValues: ctx.relationSelection.dbValues,
        uiValues: ctx.relationSelection.uiValues,
        intermediateObjectUids: [],
        isModifiable: true
    };

    modifiedProperties.push( modifiedProperty );
    var input = {
        obj: obj,
        viewModelProperties: modifiedProperties,
        isPessimisticLock: false,
        workflowData: {}
    };

    inputs.push( input );
    return inputs;
};

/**
 * This method is used for Add panels to find the valid relation and reference topic type.
 * @param {Object} ctx the ctx
 * @param {Object} topicType the topicType
 * @returns {Array} the LOV return values
 */
export let topicTypeSelectionChange = function( ctx, topicType ) {
    var lov = [];

    for( let x = 0; x < ctx.ctm1.referenceTopicTypeRelationsMap.length; ++x ) {
        let obj = ctx.ctm1.referenceTopicTypeRelationsMap[ x ];

        if( obj.inputObject.props.referenceType.dbValues[ 0 ] === 'COMPOSABLE_TOPIC_REFERENCE' ) {
            for( let y = 0; y < obj.relationshipData[ 0 ].relationshipObjects.length; ++y ) {
                let rObj = obj.relationshipData[ 0 ].relationshipObjects[ y ];

                if( topicType === rObj.otherSideObject.props.object_name.uiValues[ 0 ] ) {
                    var prop = {
                        propDisplayValue: obj.inputObject.props.object_name.uiValues[ 0 ],
                        propInternalValue: obj.inputObject.uid,
                        propInternalType: obj.inputObject.type
                    };

                    lov.push( prop );
                }
            }
        }
    }

    // Return unique lov
    return Array.from( new Set( lov ) ).sort( function( a, b ) {
        if( a.propDisplayValue < b.propDisplayValue ) {
            return -1;
        } else if( a.propDisplayValue > b.propDisplayValue ) {
            return 1;
        }
        return 0;
    } );
};

var loadConfiguration = function() {
    localeSvc.getTextPromise( 'ContentMgmtMessages', true ).then(
        function( localTextBundle ) {
            _localizedText = localTextBundle;
        } );
};

loadConfiguration();

/**
 * Ctm1ContentMgmtCreateTopicTypeService factory
 */

export default exports = {
    updateReferenceTopicTypeList,
    getDitaRelationList,
    getReferenceList,
    moveDitaRelationDataToCtx,
    buildInputForDitaRelationWorkflow,
    topicTypeSelectionChange
};
app.factory( 'Ctm1ContentMgmtCreateDitaRelationService', () => exports );
