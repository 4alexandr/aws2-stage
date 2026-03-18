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
 * @module js/prm1ComparePLTableViewService
 */
import _ from 'lodash';
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import LocationNavigationService from 'js/locationNavigation.service';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import selectionService from 'js/selection.service';
import tcVmoService from 'js/tcViewModelObjectService';
import awColumnSvc from 'js/awColumnService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Method to return comma separated uids
 * @param {String} acc uids
 * @param {object} val object
 * @returns {String} returns comma separated uids
 */
function uidParamAccumulator( acc, val ) {
    if( !acc || acc.indexOf( val.uid ) === -1 ) {
        return ( _.isEmpty( acc ) ? '' : acc + ',' ) + val.uid;
    }
    return acc;
}

/**
 * Method to return # separated uids
 * @param {String} acc uids
 * @param {object} val object
 * @returns {String} returns # separated uids
 */
function uidAccumulator( acc, val ) {
    if( !acc || acc.indexOf( val.uid ) === -1 ) {
        return ( _.isEmpty( acc ) ? '' : acc + '#' ) + val.uid;
    }
    return acc;
}

/**
 * this method to get uids of all selected revision rules and reload the location
 *  @param {Object} data View model object
 *  @param {Object} ctx the application context
 */
export let addRevRuleToCompare = function addRevRuleToCompare( data, ctx ) {
    //get selected objects from revisonRule list
    var rv_uids = _.reduce( data.dataProviders.revisionRuleListProvider.getSelectedObjects(), uidParamAccumulator, ctx.state.params.rv_uids );
    LocationNavigationService.instance.go( '.', {
        rv_uids: rv_uids
    } );
    eventBus.publish( 'prm1RevisionRuleComparePLTable.reset', {} );
};

/**
 * this method to get uids of all selected VR's and studies
 *  @param {Object} data View model object
 *  @param {Object} ctx the application context
 */
export let addVRStudyToCompare = function addVRStudyToCompare( data, ctx ) {
    //get selected objects from VrStudy list
    var vrs_uids = _.reduce( data.dataProviders.VRandStudyProvider.getSelectedObjects(), uidAccumulator, ctx.state.params.vrs_uids );
    LocationNavigationService.instance.go( '.', {
        vrs_uids: vrs_uids
    } );
    eventBus.publish( 'prm1RevisionRuleComparePLTable.reset', {} );
};

/**
 *  Method returns the list of comparision objects
 *  @param {Object} data View Model object
 *  @param {Object} appctx the application context
 *  @returns {ObjectArray} returns the compare objects
 */
export let getComparisonDefs = function getComparisonDefs( data ) {
    var compareObjs = [];
    var compare_Uids;

    var state = appCtxService.getCtx( 'state' );
    var paramContext = appCtxService.getCtx( 'paramCompareViewContext' );
    //set latest title
    if( paramContext.currentRevRule ) {
        data.CurrentRevRuleTitle = paramContext.currentRevRule.uiValues[ 0 ];
    }
    //temp added variable; need to change uid separator in case of project param compare to # instead of comma
    var separator;
    if( paramContext.compareType === 'ProjectParamComparison' && state.params && state.params.rv_uids ) {
        compare_Uids = state.params.rv_uids;
        separator = ',';
    } else if( paramContext.compareType === 'ProductParamComparison' && state.params && state.params.vrs_uids ) {
        compare_Uids = state.params.vrs_uids;
        separator = '#';
    }
    if( compare_Uids ) {
        var compareUids = typeof compare_Uids === 'string' ? compare_Uids.split( separator ) : [];
        for( var i = 0; compareUids && i < compareUids.length; i++ ) {
            var vmo = viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( compareUids[ i ] ) );
            var title = '';
            if( vmo.props && vmo.props.object_name ) {
                title = vmo.props.object_name.uiValue;
            }
            var compareObj = {
                uid: vmo.uid,
                vmo: vmo,
                title: title
            };
            compareObjs.push( compareObj );
        }
    }
    data.comparisonDefs = compareObjs;
    return compareObjs;
};

/**
 *
 * @param {ObjectArray} serverRows list of VMOs
 * @returns {ObjectArray} returns the VMOs which having parent null
 */
function getAllVMOs( serverRows ) {
    // ujwala:introduce this method to find out actual no. rows to render in table
    var processRows = [];
    for( var i = 0; serverRows && i < serverRows.length; i++ ) {
        if( serverRows[ i ].props.att1Parent.dbValues[ 0 ] === '' ) {
            processRows.push( serverRows[ i ] );
        }
    }
    return processRows;
}

/**
 *
 * @param {ObjectArray} serverRows list of VMOs
 * @param {object} data VMO
 * @returns {ObjectsArray} structured data
 */
function makeTableRows( serverRows, data ) {
    // ujwala : modified the code as per SOA response
    var comparisonDefs = exports.getComparisonDefs( data );
    var rowVMOs = getAllVMOs( serverRows );
    return _.map( rowVMOs, function( row ) {
        var tableRow = row;
        tableRow.att1SourceElement = tcVmoService.createViewModelObjectFromLogicalObject( { modelObject: cdm.getObject( row.props.att1SourceElement.dbValues[ 0 ] ) } );

        var comparisonObjectsData = _.filter( serverRows, function( compRow ) {
            return compRow.props.att1Parent.dbValues[ 0 ] === row.uid;
        } );

        _.assign( tableRow, {
            attribute: cdm.isValidObjectUid( row.props.att1SourceAttribute.dbValues[ 0 ] ) ? viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( row.props.att1SourceAttribute.dbValues[ 0 ] ), 'EDIT' ) : undefined,
            isTableRowFileter: 'true',

            comparisons: _.reduce( comparisonDefs, function( acc, cmp ) {
                var cprAttr = _.filter( comparisonObjectsData, function( cpObj ) {
                    return cmp.uid === cpObj.props.att1SourceElement.dbValues[ 0 ];
                } );
                acc[ cmp.uid ] = {
                    attribute: cmp.uid && cprAttr.length > 0 ?
                        viewModelObjectService.constructViewModelObjectFromModelObject( cdm.getObject( cprAttr[ 0 ].props.att1SourceAttribute.dbValues[ 0 ] ) ) : undefined
                };
                return acc;
            }, {} )
        } );
        return tableRow;
    } );
}

/**
 *  Process the response to construct the latest table structure
 *  @param {object} data Response
 *  @returns {ObjectsArray} structured data
 */
export let makeTableRowLatestVMOs = function makeTableRowLatestVMOs( data ) {
    if( data.searchResultsJSON ) {
        data.searchResults = JSON.parse( data.searchResultsJSON );
        delete data.searchResultsJSON;
    }
    // Create view model objects
    data.searchResults = data.searchResults &&
        data.searchResults.objects ? data.searchResults.objects
        .map( function( vmo ) {
            return viewModelObjectService
                .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
        } ) : [];
    data.searchResults.latest = [];
    data.searchResults.comparison = [];
    for( var i = 0; data.searchResults && i < data.searchResults.length; i++ ) {
        if( data.searchResults[ i ].props.att1Parent.dbValues[ 0 ] === '' ) {
            data.searchResults.latest.push( data.searchResults[ i ] );
        } else {
            data.searchResults.comparison.push( data.searchResults[ i ] );
        }
    }
    return data.searchResults;
};

/**
 *  Process the response to construct the compare table structure
 *  @param {object} data Response
 *  @returns {ObjectsArray} structured data
 */
export let makeTableRowCompareVMOs = function makeTableRowCompareVMOs( data ) {
    if( data.searchResultsJSON ) {
        data.compareSearchResults = JSON.parse( data.searchResultsJSON );
        delete data.searchResultsJSON;
    }
    // Create view model objects
    data.compareSearchResults = data.compareSearchResults &&
        data.compareSearchResults.objects ? data.compareSearchResults.objects
        .map( function( vmo ) {
            return viewModelObjectService
                .createViewModelObject(  vmo.uid, 'EDIT', null, vmo );
        } ) : [];

    var rowVMOs = makeTableRows( data.compareSearchResults, data );
    data.compareSearchResults.comparison = [];
    _.forEach( rowVMOs, function( row ) {
        var response = _.values( row.comparisons );
        var counter = 1;
        _.forEach( response, function( compareObj ) {
            row.props[ 'att0Goal' + counter ] = compareObj.attribute ? compareObj.attribute.props.att0Goal : '';
            row.props[ 'att0Min' + counter ] = compareObj.attribute ? compareObj.attribute.props.att0Min : '';
            row.props[ 'att0Max' + counter ] = compareObj.attribute ? compareObj.attribute.props.att0Max : '';
            row.props[ 'fnd0RevisionId' + counter ] = compareObj.attribute ? compareObj.attribute.props.fnd0RevisionId : '';
            if( compareObj.attribute !== undefined ) {
                row.props[ 'att0Goal' + counter ].propertyName = 'att0Goal' + counter;
                row.props[ 'att0Min' + counter ].propertyName = 'att0Min' + counter;
                row.props[ 'att0Max' + counter ].propertyName = 'att0Max' + counter;
                row.props[ 'fnd0RevisionId' + counter ].propertyName = 'fnd0RevisionId' + counter;
            }
            counter++;
        } );
    } );

    data.compareSearchResults.comparison = rowVMOs;
    return data.compareSearchResults;
};
/**
 * use table cache or not
 * @param {object} ctx context object
 * @returns {boolean} true/false
 */
export let useTableCache = function( ctx ) {
    return ctx.paramCompareViewContext.initialTableLoaded ? ctx.paramCompareViewContext.initialTableLoaded : false;
};

/**
 * Method to load location on refresh , it check the previous location to reload
 * @param {object} ctx context
 */
export let goToPreviousIntView = function( ctx ) {
    var selectedObjects = ctx.mselected;
    var selectedParent = cdm.getObject( ctx.state.params.uid );
    var sel_uids;
    var pc_type;
    var l_title;
    var toState;

    if( ctx.parammgmtctx ) {
        selectedObjects = ctx.parammgmtctx.mselected;
    }

    toState = 'prm1RevisionRuleComparePL';
    //if Project compare selected
    if( cmm.isInstanceOf( 'Att0ParamProject', selectedParent.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedParent.modelType ) ) {
        sel_uids = _.reduce( selectedObjects, uidParamAccumulator, ctx.state.params.sel_uids );
        pc_type = 'ProjectParamComparison';
        appCtxService.updatePartialCtx( 'paramCompareViewContext.compareType', 'ProjectParamComparison' );

        //get current revision rule and variant applied to project
        var configurationContextObject = cdm.getObject( _.get( selectedParent, 'props.Att0HasConfigurationContext.dbValues[0]', undefined ) );
        if( configurationContextObject && configurationContextObject.props ) {
            appCtxService.updatePartialCtx( 'paramCompareViewContext.currentRevRule', configurationContextObject.props.revision_rule );
            appCtxService.updatePartialCtx( 'paramCompareViewContext.currentVariant', configurationContextObject.props.variant_rule );
            l_title = configurationContextObject.props.revision_rule.uiValues[ 0 ];
        }
    }
    //else Product compare selected
    else {
        sel_uids = _.reduce( selectedObjects, uidAccumulator, ctx.state.params.sel_uids );
        pc_type = 'ProductParamComparison';
        appCtxService.updatePartialCtx( 'paramCompareViewContext.compareType', 'ProductParamComparison' );

        //get current revision rule applied to product structure
        if( ctx.occmgmtContext && ctx.occmgmtContext.productContextInfo && ctx.occmgmtContext.productContextInfo.props ) {
            appCtxService.updatePartialCtx( 'paramCompareViewContext.currentRevRule', ctx.occmgmtContext.productContextInfo.props.awb0CurrentRevRule );
            l_title = ctx.occmgmtContext.productContextInfo.props.awb0CurrentRevRule.uiValues[ 0 ];
        }
    }
    if( ctx.paramCompareViewContext && ctx.paramCompareViewContext.previousView ) {
        toState = ctx.paramCompareViewContext.previousView;
    }

    LocationNavigationService.instance.go( toState, {
        uid: ctx.state.params.uid,
        sel_uids: sel_uids,
        pc_type: pc_type,
        l_title: l_title
    }, {
        inherit: false
    } );
};

/**
 * To initialize parameter context object.
 * @param {object} ctx context object
 */
export let initParamCompareContext = function( ctx ) {
    var compareType = ctx.state.params.pc_type;
    var latestTitle = {
        uiValues: [
            ctx.state.params.l_title
        ]
    };
    if( compareType === 'ProductParamComparison' ) {
        appCtxService.updatePartialCtx( 'paramCompareViewContext.compareType', 'ProductParamComparison' );
    } else {
        appCtxService.updatePartialCtx( 'paramCompareViewContext.compareType', 'ProjectParamComparison' );
    }
    appCtxService.updatePartialCtx( 'paramCompareViewContext.currentRevRule', latestTitle );
};

/**
 * to returns the resopnce
 * @param {object} mo  vmo
 * @return {objectArray} reponse
 */
export let getDPResponse = function( mo ) {
    var results = _.isArray( mo ) ? mo : [ mo ];
    return { results: results, totalFound: results.length };
};

/**
 * Method to get excluded Rev Rule uids
 * @param {object} data  view model object
 * @returns {String} excluded Rev Rule uids
 */
export let getExcludedRevRuleUids = function() {
    var excludedRevRuleUids;
    var compareContext = appCtxService.getCtx( 'paramCompareViewContext' );
    var state = appCtxService.getCtx( 'state' );
    if( compareContext.currentRevRule && compareContext.currentRevRule.dbValues.length > 0 ) {
        excludedRevRuleUids = compareContext.currentRevRule.dbValues[ 0 ];
    }
    if( state.params.rv_uids ) {
        excludedRevRuleUids = excludedRevRuleUids + ',' + state.params.rv_uids;
    }
    return excludedRevRuleUids;
};

/**
 * Method to get provider name as per type of comparison selected
 * @returns {String} provider name
 */
export let getProvider = function() {
    var compareContext = appCtxService.getCtx( 'paramCompareViewContext' );
    var providerName = null;
    //if Project compare selected
    if( compareContext.compareType === 'ProjectParamComparison' ) {
        providerName = 'Att1ParamCompareProvider';
    }
    //if Product compare selected
    else if( compareContext.compareType === 'ProductParamComparison' ) {
        providerName = 'Crt1CompVRStudyPrmProvider';
    }
    return providerName;
};

/**
 * Method to call SOA to clear the cache when location content get unloaded.
 */
export let clearParamCompareCache = function() {
    var providerName = exports.getProvider();
    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: '',
            operationType: ''
        },
        searchInput: {
            maxToLoad: 10000,
            maxToReturn: 10000,
            providerName: providerName,
            searchCriteria: {
                clearCache: 'true'
            },
            startIndex: 0
        }
    };
    soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            appCtxService.unRegisterCtx( 'paramCompareViewContext' );
            if( response.searchResultsJSON ) {
                response.searchResults = JSON.parse( response.searchResultsJSON );
                delete response.searchResultsJSON;
            }
        } );
};

/**
 * Corrects selection to be source Parameter instead of proxy object
 * @param {Objects} selectedObjects selected object list
 */
export let changeSelection = function( selectedObjects ) {
    // Clear the selected proxy objects
    var sourceSelections = [];
    for( var j = 0; j < selectedObjects.length; ++j ) {
        var objUid = selectedObjects[ j ].props.att1SourceAttribute.dbValue;
        var sourceObj = cdm.getObject( objUid );
        sourceSelections.push( sourceObj );
    }
    if( sourceSelections.length > 0 ) {
        selectionService.updateSelection( sourceSelections );
    }
};

/**
 * to append partial errors if there are more than one error
 * @param {String} messages
 * @param {String} msgObj
 */
var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 *  to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let processPartialErrors = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( response && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

export let setColumnConfigForCompareTable = function( data, dataProvider ) {
    var latestColumns = dataProvider.columnConfig.columns;
    var cols = dataProvider.cols;
    var compareColumns = [];
    var compareCols = [];
    var comparisonDefs = exports.getComparisonDefs( data );
    var counter = 1;
    for( var i = 0; i < comparisonDefs.length; i++ ) {
        var filteredColumns = JSON.parse( JSON.stringify( latestColumns ) );
        for( var j = 0; j < filteredColumns.length; j++ ) {
            var newColumn = filteredColumns[ j ];
            if( newColumn.displayName === 'Goal' ) {
                newColumn.propertyName = 'att0Goal' + counter;
                compareColumns.push( newColumn );
            } else if( newColumn.displayName === 'Min' ) {
                newColumn.propertyName = 'att0Min' + counter;
                compareColumns.push( newColumn );
            } else if( newColumn.displayName === 'Max' ) {
                newColumn.propertyName = 'att0Max' + counter;
                compareColumns.push( newColumn );
            } else if( newColumn.displayName === 'Revision ID' ) {
                newColumn.propertyName = 'fnd0RevisionId' + counter;
                compareColumns.push( newColumn );
            }
        }
        counter++;
    }
    dataProvider.columnConfig = {
        columns: compareColumns
    };
};

export default exports = {
    addRevRuleToCompare,
    addVRStudyToCompare,
    getComparisonDefs,
    makeTableRowLatestVMOs,
    makeTableRowCompareVMOs,
    useTableCache,
    goToPreviousIntView,
    initParamCompareContext,
    getDPResponse,
    getExcludedRevRuleUids,
    getProvider,
    clearParamCompareCache,
    changeSelection,
    processPartialErrors,
    setColumnConfigForCompareTable
};
app.factory( 'prm1ComparePLTableViewService', () => exports );
