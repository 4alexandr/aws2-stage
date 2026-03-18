// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ctm1ContentMgmtCreateTopicTypeService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import contentMgmtSrv from 'js/Ctm1ContentMgmtService';

import localStrg from 'js/localStorage';

var exports = {};

var _savedLocal = null;

/**
 * This method is used for Add panels to find list of valid Topic Types that may be created under it.
 * Specificity this is used clear the ctx.ctm1 var so its ready to be populated anew.
 * @param {Object} ctx the ctx
 */
export let cleanupCtx = function( ctx ) {
    if( ctx.ctm1 ) {
        delete ctx.ctm1;
    }
};

/**
 * This method is used for Add panels to find list of valid Topic Types that may be created under it.
 * Specificity this is used when there are no reference topic types to set the data structure to be empty.
 * @param {Object} ctx the ctx
 */
export let zeroReferenceTopicTypeRelations = function( ctx ) {
    ctx.ctm1.referenceTopicTypeRelations = {
        DC_TopicType: [],
        DC_RefTopicType: [],
        other: []
    };
};

/**
 * This method is used by getTopicTypeLov and waits to resolve a promise until variables are filled.
 * It does have a limit on how long it will wait before resolving.
 * @param {Object} ctx the ctx
 * @param {Object} deferred the promise
 * @param {int} count of how many times it checked
 */
var checkIfExpandIsDone = function( ctx, deferred, count ) {
    if( ++count > 15 ) {
        deferred.resolve();
    } else if( ctx.activeToolsAndInfoCommand.commandId !== 'Awb0AddChildElementDeclarative' &&
        ctx.activeToolsAndInfoCommand.commandId !== 'Awb0AddSiblingElementDeclarative' &&
        ctx.ctm1 && ctx.ctm1.validTopicTypes ) {
        deferred.resolve();
    } else if( ctx.ctm1 && ctx.ctm1.referenceTopicTypeRelations ) {
        deferred.resolve();
    } else {
        setTimeout( function() {
            checkIfExpandIsDone( ctx, deferred, count );
        }, 500 );
    }
};

/**
 * This method is used for Add panels to find list of valid Topic Types that may be created under it.
 * Specificity this is used to populate the "Topic Type" drop down widget.
 * @param {Object} ctx the ctx
 * @returns {Array} the LOV return values
 */
export let getTopicTypeLov = function( ctx ) {
    var deferred = AwPromiseService.instance.defer();

    var promise = AwPromiseService.instance.when( deferred.promise ).then( function() {
        var lov = [];

        if( ctx.activeToolsAndInfoCommand.commandId !== 'Awb0AddChildElementDeclarative' &&
            ctx.activeToolsAndInfoCommand.commandId !== 'Awb0AddSiblingElementDeclarative' ) {
            return ctx.ctm1.validTopicTypes;
        }

        if( ctx.ctm1.parentTopicTypeRelations ) {
            // Search all direct relations and add matches to lov
            for( let x = 0; x < ctx.ctm1.parentTopicTypeRelations.DC_TopicType.length; ++x ) {
                let obj = ctx.ctm1.parentTopicTypeRelations.DC_TopicType[ x ];
                for( let y = 0; y < ctx.ctm1.validTopicTypes.length; ++y ) {
                    if( obj.uid === ctx.ctm1.validTopicTypes[ y ].propInternalValue ) {
                        lov.push( ctx.ctm1.validTopicTypes[ y ] );
                        break;
                    }
                }
            }
        }

        if( ctx.ctm1.referenceTopicTypeRelations ) {
            // Search all reference relations and add matches to lov
            for( let x = 0; x < ctx.ctm1.referenceTopicTypeRelations.DC_TopicType.length; ++x ) {
                let obj = ctx.ctm1.referenceTopicTypeRelations.DC_TopicType[ x ];
                for( let y = 0; y < ctx.ctm1.validTopicTypes.length; ++y ) {
                    if( obj.uid === ctx.ctm1.validTopicTypes[ y ].propInternalValue ) {
                        lov.push( ctx.ctm1.validTopicTypes[ y ] );
                        break;
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
    } );

    checkIfExpandIsDone( ctx, deferred, 0 );

    return promise;
};

/**
 * This method is used for Add panels to find list of valid Topic Types that may be created under it.
 * Specificity this sorts topic types based on whether its a reference or not.
 * @param {Object} response the SOA response from GRM expand
 * @returns {Object} the sorted topic types
 */
export let sortTopicTypeRelations = function( response ) {
    var DC_TopicType = [];
    var DC_RefTopicType = [];
    var other = [];

    if( response.output ) {
        for( var x = 0; x < response.output.length; ++x ) {
            for( var y = 0; y < response.output[ x ].relationshipData.length; ++y ) {
                for( var z = 0; z < response.output[ x ].relationshipData[ y ].relationshipObjects.length; ++z ) {
                    var obj = response.output[ x ].relationshipData[ y ].relationshipObjects[ z ];

                    if( obj.otherSideObject.modelType.typeHierarchyArray.indexOf( 'DC_RefTopicType' ) >= 0 ) {
                        if( obj.otherSideObject.props.referenceType.dbValues[ 0 ] === 'COMPOSABLE_TOPIC_REFERENCE' ) {
                            DC_RefTopicType.push( obj.otherSideObject );
                        } else {
                            other.push( obj.otherSideObject );
                        }
                    } else if( obj.otherSideObject.modelType.typeHierarchyArray.indexOf( 'DC_TopicType' ) >= 0 ) {
                        DC_TopicType.push( obj.otherSideObject );
                    } else {
                        other.push( obj.otherSideObject );
                    }
                }
            }
        }
    }

    var relationTypes = {
        DC_TopicType: Array.from( new Set( DC_TopicType ) ),
        DC_RefTopicType: Array.from( new Set( DC_RefTopicType ) ),
        other: Array.from( new Set( other ) )
    };

    return relationTypes;
};

/**
 * This method is used to filter out DC_RefTopicType types.
 * @param {Object} response the response of the soa
 * @returns {Array} the LOV return values
 */
export let filterReferenceTopicTypes = function( response ) {
    var lov = contentMgmtSrv.getLovFromQuery( response );

    var rArray = [];

    // Find all "DC_TopicType" type
    for( var z = 0; z < lov.length; ++z ) {
        if( lov[ z ].propInternalType !== 'DC_RefTopicType' ) {
            rArray.push( lov[ z ] );
        }
    }

    return rArray;
};

/**
 * Queries that use object_name need to be in the en_US local to work correctly.
 */
export let resetLocal = function() {
    var awSession = localStrg.get( 'awSession' );

    if( awSession ) {
        try {
            awSession = JSON.parse( awSession );
            if( awSession.locale && awSession.locale !== 'en_US' ) {
                _savedLocal = awSession.locale;
                awSession.locale = 'en_US';
                awSession = JSON.stringify( awSession );
                localStrg.publish( 'awSession', awSession );
            }
        } catch ( err ) {
            //
        }
    }
};

/**
 * Restore the local back to what it was originally
 */
export let restoreLocal = function() {
    var awSession = localStrg.get( 'awSession' );

    if( awSession && _savedLocal ) {
        try {
            awSession = JSON.parse( awSession );
            if( awSession.locale ) {
                awSession.locale = _savedLocal;
                awSession = JSON.stringify( awSession );
                localStrg.publish( 'awSession', awSession );
            }
        } catch ( err ) {
            //
        }
    }
};

/**
 * This method is used for Add panels to find list of valid Topic Types that may be created under it.
 * Specificity this returns the search input for query find topics based on parent topic type.
 * @param {Object} ctx the ctx
 * @param {Object} data the data
 * @returns {Object} the search input
 */
export let getParentTopicTypeSearchInput = function( ctx, data ) {
    var searchInput = {
        maxToLoad: 250,
        maxToReturn: 250,
        providerName: 'Awp0SavedQuerySearchProvider',
        searchCriteria: {
            queryName: '__ctm0_Topic_Type_Query',
            searchID: 'TOPIC_TYPE_QUERY',
            typeOfSearch: 'ADVANCED_SEARCH',
            utcOffset: '0',
            lastEndIndex: '0',
            object_name: 'none',
            startIndex: data.dataProviders.listProvider.startIndex
        },
        searchSortCriteria: [ {
            fieldName: 'object_name',
            sortDirection: 'ASC'
        } ]
    };

    var parentObject = null;

    if( ctx.activeToolsAndInfoCommand.commandId === 'Awb0AddChildElementDeclarative' ) {
        parentObject = cdm.getObject( ctx.selected.props.awb0UnderlyingObject.dbValues[ 0 ] );
    } else if( ctx.activeToolsAndInfoCommand.commandId === 'Awb0AddSiblingElementDeclarative' ) {
        parentObject = cdm.getObject( ctx.pselected.props.awb0UnderlyingObject.dbValues[ 0 ] );
    }

    if( parentObject ) {
        exports.resetLocal();
        var uiValue = parentObject.props.ctm0TopicTypeTagref.uiValues[ 0 ];
        if( uiValue === null || uiValue === '' ) {
            var topicType = cdm.getObject( parentObject.props.ctm0TopicTypeTagref.dbValues[ 0 ] );
            uiValue = topicType.props.object_name.uiValues[ 0 ];
        }
        searchInput.searchCriteria.object_name = uiValue;
    }

    return searchInput;
};

/**
 * Ctm1ContentMgmtCreateTopicTypeService factory
 */

export default exports = {
    cleanupCtx,
    zeroReferenceTopicTypeRelations,
    getTopicTypeLov,
    sortTopicTypeRelations,
    filterReferenceTopicTypes,
    resetLocal,
    restoreLocal,
    getParentTopicTypeSearchInput
};
app.factory( 'Ctm1ContentMgmtCreateTopicTypeService', () => exports );
