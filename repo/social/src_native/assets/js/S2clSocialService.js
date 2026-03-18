// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/S2clSocialService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import notifySvc from 'js/NotyModule';
import localeSvc from 'js/localeService';
import commandPanelService from 'js/commandPanel.service';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import searchCommonUtils from 'js/searchCommonUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _plainText = '';
var _richText = '';
var _rating = 5;

var _subscriptionFailedMsg = 'Subscription Failed';
var _oneStarRating = null;
var _twoStarRating = null;
var _threeStarRating = null;
var _fourStarRating = null;
var _fiveStarRating = null;
var _allStarRating = null;

var _isTextValid = false;

localeSvc.getTextPromise( 'SocialDeclarativeMessages', true ).then(
    function( localTextBundle ) {
        _subscriptionFailedMsg = localTextBundle.subscriptionFailed;
        _oneStarRating = localTextBundle.oneStarRating;
        _twoStarRating = localTextBundle.twoStarRating;
        _threeStarRating = localTextBundle.threeStarRating;
        _fourStarRating = localTextBundle.fourStarRating;
        _fiveStarRating = localTextBundle.fiveStarRating;
        _allStarRating = localTextBundle.allRatings;
    } );

/**
 * The rich text that was entered into editor
 *
 * @param {Object} text the rich text
 */
export let setRichText = function( text ) {
    _richText = text;
};

/**
 * The plain text that was entered into editor
 *
 * @param {Object} text the plain text
 */
export let setPlainText = function( text ) {
    _plainText = text;
};

/**
 * The rating selected
 *
 * @param {Object} integer rating value
 */
export let setRating = function( integer ) {
    _rating = integer;
};

/**
 * Returns rich text
 *
 * @return {Object} text string
 */
export let getRichText = function() {
    return _richText;
};

/**
 * Returns plain text
 *
 * @return {Object} text string
 */
export let getPlainText = function() {
    return _plainText;
};

/**
 * Returns rating
 *
 * @return {Object} integer
 */
export let getRating = function() {
    return _rating;
};

/**
 * Set flag indicating there is text. Trigger event to update visibility condition.
 *
 * @param {Object} true/false
 */
export let setIsTextValid = function( isValid ) {
    _isTextValid = isValid;

    eventBus.publish( 'isInputTextValidEvent', null );
};

/**
 * Returns whether text has been entered.
 *
 * @return {Object} true/false
 */
export let getIsTextValid = function() {
    return _isTextValid;
};

/**
 * Sets variable with whether text was entered. Called by action and value is used by condition to set visibility of
 * post button.
 */
export let isInputTextValid = function( data ) {
    data.isInputTextValid = _isTextValid;
};

/**
 * Validate whether creation of commentary was successful. Show message if there was an issue.
 *
 * @param {Object} type the type of commentary created
 * @param {Object} data contains message returned from SOA
 */
export let validateCreateComment = function( type, data ) {
    if( data.isSuccess ) {
        // Questions try to subscribe for answers
        if( data.message.indexOf( 'could not subscribe' ) !== -1 ) {
            // Show message that subscribe failed
            var titlName = '"' + appCtxSvc.ctx.Social.defaultName + '"';
            _subscriptionFailedMsg = _subscriptionFailedMsg.replace( '{0}', titlName );
            notifySvc.showInfo( _subscriptionFailedMsg );
        }
    } else {
        // display error message
        notifySvc.showInfo( data.message );
    }
};

/**
 * Get objects from UIDs
 *
 * @param {Object} selectedDataset the selected dataset object
 * @return {ObjectArray} updated objects
 */
export let getObjects = function( selectedDataset ) {
    var objs = [];

    if( selectedDataset ) {
        var obj = cdm.getObject( selectedDataset );

        if( obj ) {
            objs.push( obj );

            if( 's2clTargetObject' in obj.props && obj.props.s2clTargetObject !== null &&
                obj.props.s2clTargetObject.dbValues.length > 0 ) {
                var tmp = obj.props.s2clTargetObject;
                var obj2 = cdm.getObject( tmp.dbValues[ 0 ] );

                if( obj2 ) {
                    objs.push( obj2 );
                }
            }
        }
    }

    return objs;
};

/**
 * getTargetObject - returns the object the commentary is being created on
 */
export let getTargetObject = function( commandId, objects ) {
    var target = null;

    if( objects.length > 0 ) {
        target = cdm.getObject( objects[ 0 ].uid );

        // Ace returns an object which points to actual object
        if( typeof target.props.awb0UnderlyingObject !== 'undefined' ) {
            target = cdm.getObject( target.props.awb0UnderlyingObject.dbValues[ 0 ] );
        }

        // Answers target questions; otherwise comments, questions, and ratings target the item revision.
        // This means we can find the correct IR even if the wrong object is selected when creating
        // everything but answers.
        if( 'S2clSCAddAnswerNew' !== commandId ) {
            while( typeof target.props.s2clTargetObject !== 'undefined' &&
                target.props.s2clTargetObject.dbValues.length > 0 ) {
                target = cdm.getObject( target.props.s2clTargetObject.dbValues[ 0 ] );
            }
        }
        // if an answer is selected when creating an answer; its parent question can be found
        else if( 'S2clAnswer' === target.type ) {
            if( typeof target.props.s2clTargetObject !== 'undefined' &&
                target.props.s2clTargetObject.dbValues.length > 0 ) {
                target = cdm.getObject( target.props.s2clTargetObject.dbValues[ 0 ] );
            }
        }
    }

    return target;
};

/**
 * addCommentary
 *
 * @param {Object} commandId the command
 * @param {Object} objects the selected object
 */
export let addCommentary = function( commandId, objects ) {
    var type = 'S2clCommentary';

    var targetObject = exports.getTargetObject( commandId, objects );

    var defaultName = 'on ';

    var rating = 0;

    if( 'S2clSCAddQuestionNew' === commandId ) {
        type = 'S2clQuestion';
    } else if( 'S2clSCAddAnswerNew' === commandId ) {
        type = 'S2clAnswer';
    } else if( 'S2clSCAddRatingNew' === commandId ) {
        type = 'S2clScalarRating';
    }

    if( typeof targetObject.props.object_name !== 'undefined' && targetObject.props.object_name ) {
        defaultName += targetObject.props.object_name.dbValues[ 0 ];
    } else if( typeof targetObject.props.object_string !== 'undefined' && targetObject.props.object_string ) {
        defaultName += targetObject.props.object_string.dbValues[ 0 ];
    } else {
        defaultName = '';
    }

    if( objects.length > 0 && typeof objects[ 0 ].rating !== 'undefined' ) {
        rating = objects[ 0 ].rating;
    }

    var newContext = {
        commentType: type,
        ratingValue: rating,
        targetObjectUid: targetObject.uid,
        defaultName: defaultName
    };

    appCtxSvc.registerCtx( 'Social', newContext );

    commandPanelService.activateCommandPanel( commandId, 'aw_toolsAndInfo' );
};

/**
 * filterByAnswered - returns the object to filter questions with 1-200 answers
 *
 * @function filterByAnswered
 * @param {Object}filterMap - filterMap
 * @return {Object} Updated Filter Map
 */
export let filterByAnswered = function( filterMap ) {
    var activeFilterMap = {};
    if( typeof filterMap !== 'undefined' ) {
        activeFilterMap = updateFilterMap( filterMap );
    }

    if( typeof activeFilterMap['WorkspaceObject.s2clTotalAnsweredFmSy'] === 'undefined' ) {
        activeFilterMap['WorkspaceObject.s2clTotalAnsweredFmSy'] = [];
        for( var i = 1; i < 200; i++ ) {
            activeFilterMap[ 'WorkspaceObject.s2clTotalAnsweredFmSy' ].push( {
                searchFilterType: 'StringFilter',
                stringValue: String( i )
            } );
        }
    }

    return activeFilterMap;
};

/**
 * Update filter map
 *
 * @function updateFilterMap
 * @param {Object}filterMap - filterMap
 * @return {Object} Updated Filter Map
 */
export let updateFilterMap = function( filterMap ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = {};
    prop = cloneOfFilterMap ? cloneOfFilterMap : prop;

    var toggleColorContext = appCtxSvc.getCtx( 'filterColorToggleCtx' );
    if( toggleColorContext ) {
        appCtxSvc.updateCtx( 'filterColorToggleCtx', false );
    } else {
        appCtxSvc.registerCtx( 'filterColorToggleCtx', false );
    }

    return prop;
};

export let getTargetObjectUID = function() {
    var targetObjUID;
    var currentObj = appCtxSvc.ctx.locationContext.modelObject;

    if( !currentObj ) {
        currentObj = appCtxSvc.ctx.selected;
    }

    if( currentObj ) {
        if( currentObj.type === 'S2clQuestion' ) {
            targetObjUID = currentObj.props.s2clTargetObject.dbValues[ '0' ];
        } else if( currentObj.type === 'S2clAnswer' ) {
            //get its question and return its parent's uid.
            var questionUid = currentObj.props.s2clParentRootComment.dbValues[ 0 ];
            var questionObj = cdm.getObject( questionUid );

            if( questionObj && questionObj.props.s2clTargetObject ) {
                targetObjUID = questionObj.props.s2clTargetObject.dbValues[ '0' ];
            }
        }
    }

    return targetObjUID;
};

export let getThreadData = function( data ) {
    var reorderedList = [];
    var response = data.searchResults;

    var currentObj = appCtxSvc.ctx.locationContext.modelObject;

    if( !currentObj ) {
        currentObj = appCtxSvc.ctx.selected;
    }

    if( currentObj ) {
        var questionUid;
        if( currentObj.type === 'S2clQuestion' ) {
            questionUid = currentObj.uid;
        } else if( currentObj.type === 'S2clAnswer' ) {
            //get its question and return its parent's uid.
            questionUid = currentObj.props.s2clParentRootComment.dbValues[ 0 ];
        }

        if( typeof response !== 'undefined' ) {
            for( var i = 0; i < response.length; i++ ) {
                if( response[ i ].type === 'S2clQuestion' && response[ i ].uid === questionUid ) {
                    reorderedList.push( response[ i ] );
                    for( var j = i; j < response.length; j++ ) {
                        var question = response[ i ];
                        var answer = response[ j ];
                        if( answer.type === 'S2clAnswer' && typeof answer.props.s2clParentRootComment !== 'undefined' &&
                            answer.props.s2clParentRootComment.dbValues[ 0 ] === question.uid ) {
                            reorderedList.push( response[ j ] );
                        }
                    }
                }
            }
        }
    }

    return reorderedList;
};

/**
 * populateQuestionAnswerList
 *
 * @param {Object} targetUid the uid of the target object to build a cell list from
 */
export let populateQuestionAnswerList = function( targetUid ) {
    var searchResults = exports.getObjects( targetUid );

    if( typeof searchResults[ 1 ] !== 'undefined' ) {
        var temp = searchResults[ 0 ];
        searchResults[ 0 ] = searchResults[ 1 ];
        searchResults[ 1 ] = temp;
    }

    return searchResults;
};

export let updatFirstElementToShow = function( eventData ) {
    var vmos = eventData.viewModelObjects;
    if( vmos.length > 0 ) {
        _.set( vmos[ 0 ], 'isFirstInList', true );
        var usr = cdm.getObject( appCtxSvc.ctx.user.uid );

        // getProperies method in dms service calls SOA only if properties are not loaded.
        dms.getProperties( [ usr.uid ], [ 'user_name' ] ).then( function() {
            usr = cdm.getObject( appCtxSvc.ctx.user.uid );
            var user_name = usr.props.user_name.uiValues[ 0 ];
            for( var i = 0; i < vmos.length; i++ ) {
                if( vmos[ i ].props.s2clCommentaryRatingObjects.dbValue.length > 0 ) {
                    if( vmos[ i ].props.s2clCommentaryRatingObjects.uiValue.includes( user_name ) ) {
                        _.set( vmos[ i ], 'isHelpfulByThisUser', true );
                    }
                }
            }
        } );
    }
};

/**
 * reOrderQuestionAndAnswer
 *
 * @param {data} Question and Answer SearchResult to be Re-Ordered.
 */

export let reOrderQuestionAndAnswer = function( data ) {
    var reorderedList = [];
    var response = data.searchResults;

    if( typeof response !== 'undefined' ) {
        for( var i = 0; i < response.length; i++ ) {
            if( response[ i ].type === 'S2clQuestion' ) {
                reorderedList.push( response[ i ] );

                for( var j = i; j < response.length; j++ ) {
                    var question = response[ i ];
                    var answer = response[ j ];

                    if( answer.type === 'S2clAnswer' && typeof answer.props.s2clParentRootComment !== 'undefined' &&
                        answer.props.s2clParentRootComment.dbValues[ 0 ] === question.uid ) {
                        reorderedList.push( response[ j ] );
                    }
                }
            }
        }
    }

    return reorderedList;
};

/**
 * Gets Rating properties
 */

export let populateRatingProps = function( data ) {
    var summaryObject = appCtxSvc.ctx.xrtSummaryContextObject;
    if( summaryObject ) {
        var ratingProps = [ 's2clTotal5StarFromSummary', 's2clTotal4StarFromSummary', 's2clTotal3StarFromSummary', 's2clTotal2StarFromSummary',
            's2clTotal1StarFromSummary', 's2clTotalRatingsFromSummary'
        ];
        var ratingOverViewProps = [ 's2clUserRatingValue', 's2clAverageRatingFmSy' ];

        var summaryObjectUid = summaryObject.uid;
        //If it's ACE content tab, selected object is Awb0DesignElement hence we need to get Underlying object first
        if( summaryObject.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
            //awb0UnderlyingObject will always be there as its in ACE property policy
            summaryObjectUid = summaryObject.props.awb0UnderlyingObject.dbValues[ 0 ];
        }
        appCtxSvc.registerCtx( 'Social', { targetObjectUid: summaryObjectUid } );

        var propsToLoad = ratingProps;
        propsToLoad = propsToLoad.concat( ratingOverViewProps );
        // getProperies method in dms service calls SOA only if properties are not loaded.
        dms.getProperties( [ summaryObjectUid ], propsToLoad ).then( function() {
            var socialSummaryVMO = viewModelObjectSvc.constructViewModelObjectFromModelObject(
                cdm.getObject( summaryObjectUid ), 'Edit' );
            _populateRatingProps( data, ratingProps, socialSummaryVMO );
        } );
    }
};

var _populateRatingProps = function( data, ratingProps, summaryObject ) {
    var ratingViewModelProps = [];
    if( !data.ratingProps ) {
        _.forEach( ratingProps, function( ratingProp ) {
            var ratingVMProp = _.get( summaryObject.props, ratingProp );
            // THis should be clone else any event(e.g selection) will chnage its ui value
            ratingVMProp = _.clone( ratingVMProp );
            if( ratingVMProp ) {
                ratingVMProp.uiValue = ratingVMProp.propertyDisplayName + ': ' + ratingVMProp.uiValue;
                ratingViewModelProps.push( ratingVMProp );

                if( ratingProp === 's2clTotalRatingsFromSummary' ) {
                    _.set( data, 'totalRatingProp', ratingVMProp );
                }
            }
        } );
        _.set( data, 'ratingProps', ratingViewModelProps );
    }

    // Format and Update DB values averagerating
    var averageRatingVMProp = _.get( summaryObject.props, 's2clAverageRatingFmSy' );
    if( !averageRatingVMProp || averageRatingVMProp.dbValue === null ) {
        data.averageRating.uiValue = '0.0';
    } else {
        data.averageRating.uiValue = averageRatingVMProp.dbValue.toFixed( 1 );
        data.averageRatingValue = averageRatingVMProp.dbValue;
    }

    var userRatingVMProp = _.get( summaryObject.props, 's2clUserRatingValue' );
    if( !userRatingVMProp || userRatingVMProp.dbValue === null ) {
        data.yourRatingValue = '0.0';
    } else {
        data.yourRatingValue = userRatingVMProp.dbValue;
    }
};

//Updates Declarative ViewModel
export let updateSelectedRatingProp = function( data, path, ratingDisplayName ) {
    var ratingToFilter = ratingDisplayName.charAt( 0 );
    _.set( data, path, ratingToFilter );

    var ratingDisplayNames = [ _allStarRating, _oneStarRating, _twoStarRating, _threeStarRating, _fourStarRating, _fiveStarRating ];
    if( ratingDisplayNames[ ratingToFilter ] ) {
        data.selectedRating.propertyDisplayName = ratingDisplayNames[ ratingToFilter ];
    } else {
        data.selectedRating.propertyDisplayName = ratingDisplayNames[ 0 ];
    }
};

/**
 * getObjectUID - returns the object UID
 */
export let getObjectUID = function( object ) {
    var uid;

    if( object && object.uid ) {
        uid = object.uid;

        if( object.props && object.props.awb0UnderlyingObject ) {
            uid = object.props.awb0UnderlyingObject.value;
        }
    }

    return uid;
};

/**
 * Returns the actual searchFilterCategories.
 *
 * @function getActualSearchFilterCategories
 * @param {ViewModel} data data
 * @return {ObjectArray} actual searchFilterCategories
 */
export let getActualSearchFilterCategories = function( data ) {
    return data.searchFilterCategories;
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
    return defaultPageSize;
};

/**
 * reset chart settings for social questions sublocation.
 *
 */
export let resetForSocialQuestionsSublocation = function() {
    var chartProvider = appCtxSvc.getCtx( 'chartProvider' );
    if( chartProvider ) {
        appCtxSvc.updatePartialCtx( 'chartProvider', null );
    }
};

/**
 * S2clSocialService factory
 */

export default exports = {
    setRichText,
    setPlainText,
    setRating,
    getRichText,
    getPlainText,
    getRating,
    setIsTextValid,
    getIsTextValid,
    isInputTextValid,
    validateCreateComment,
    getObjects,
    getTargetObject,
    addCommentary,
    filterByAnswered,
    updateFilterMap,
    getTargetObjectUID,
    getThreadData,
    populateQuestionAnswerList,
    updatFirstElementToShow,
    reOrderQuestionAndAnswer,
    populateRatingProps,
    updateSelectedRatingProp,
    getObjectUID,
    getActualSearchFilterCategories,
    getDefaultPageSize,
    resetForSocialQuestionsSublocation
};
app.factory( 'S2clSocialService', () => exports );
