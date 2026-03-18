// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0ConversationService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import soa from 'soa/kernel/soaService';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import uwPropSvc from 'js/uwPropertyService';
import vmoSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import popUpSvc from 'js/popupService';
import createConvSvc from 'js/Ac0CreateCollabObjectService';
import dms from 'soa/dataManagementService';
import awIconSvc from 'js/awIconService';
import convUtils from 'js/Ac0ConversationUtils';
import policySvc from 'soa/kernel/propertyPolicyService';

var exports = {};

var Ac0ConvCtx = {};

var parentData = {};

var selectedConv = {};

/**
 * The rich text that was entered into editor
 *
 * @param {Object} vmData view model data
 */
export let universalConversationPanelReveal = function( vmData ) {
    vmData.activeView = 'Ac0UnivConvPanelSub';
};

export let changeConvType = function( vmData ) {
//nothing to do yet
};

/**
 * Method that navigates to Create Conversation Panel
 * @param {*} vmData ViewModelData
 */
export let navigateToCreateConv = function( vmData ) {
    vmData.activeView = 'Ac0CreateNewCollabObj';
    var navContext = {
        destPanelId: 'Ac0CreateNewCollabObj',
        title: vmData.i18n.newConversation,
        recreatePanel: true,
        isolateMode: false,
        supportGoBack: true
    };

    modifyCreateCtxFlagsForCollabObjs( true, false );

    eventBus.publish( 'awPanel.navigate', navContext );
};

/**
 * Method that navigates to Create Comment panel (When Advanced option is clicked on reply box)
 * @param {*} vmData ViewModel data
 * @param {*} convData Conversation data
 */
export let navigateToCreateComment = function( vmData, convData ) {
    vmData.activeView = 'Ac0CreateNewCollabObj';
    var navContext = {
        destPanelId: 'Ac0CreateNewCollabObj',
        title: vmData.i18n.newComment,
        recreatePanel: true,
        isolateMode: false,
        supportGoBack: true
    };

    modifyCreateCtxFlagsForCollabObjs( false, true );
    if( convData ) {
        var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
        convCtx.createCommentRootCommentObj = convData.rootCommentObj;
        convCtx.createCommentConvId = convData.uid;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    }
    eventBus.publish( 'awPanel.navigate', navContext );
};

/**
 * This method removes a chip from a chip array. Taken from chipShowCaseService.js
 * @param {*} chipArray array of chips from the chip dataprovider
 * @param {*} chipToRemove chip that needs to be removed
 */
export let removeChipObj = function( chipArray, chipToRemove ) {
    if( chipToRemove ) {
        _.pullAllBy( chipArray, [ { labelDisplayName: chipToRemove.labelDisplayName } ], 'labelDisplayName' );
        eventBus.publish( 'Ac0.validateParticipantSourceReadAccess' );
    }
};

/**
 * Method that handles selection change updates
 * @param {*} eventData event
 * @param {*} vmData view model data
 */
export let onObjectTabSelectionChange = function( eventData, vmData ) {
    //Update the context first
    convUtils.setSelectedObjectInContext( null );

    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.props &&
        appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
        var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
        dmSvc.getProperties( [ underlyingUid ], [ 'object_name' ] ).then( function( response ) {
            var underlyingObj = cdm.getObject( underlyingUid );
            var dbStringValue = underlyingObj.props.object_name.dbValues[0];
            var uiStringValue = underlyingObj.props.object_name.uiValues[0];
            convCtx.selected = underlyingObj;
            convCtx.selected.props.object_name.dbValue = dbStringValue;
            convCtx.selected.props.object_name.uiValue = uiStringValue;

            uwPropSvc.setValue( vmData.selectedObject, uiStringValue );
        } );
    } else {
        //Then update the passed in vm data
        vmData.selectedObject.dbValue = convCtx.selected.props.object_name.dbValue;
        vmData.selectedObject.uiValue = convCtx.selected.props.object_name.uiValue;
    }
};

/**
 * Method that modifies conversations before display.
 * @param {*} vmData view model data that contains conversation search results
 */
export let modifyConversations = function( vmData ) {
    var ctxDeletePrefVerdict = appCtxSvc.ctx.userSession.props.group_name.dbValue === appCtxSvc.ctx.preferences.Ac0DeleteDiscussionGroupRole[0].split( '/' )[0] && appCtxSvc.ctx.userSession.props.role_name.dbValue === appCtxSvc.ctx.preferences.Ac0DeleteDiscussionGroupRole[0].split( '/' )[1];
    for( var ii = 0; ii < vmData.searchResults.length; ii++ ) {
        vmData.searchResults[ii].chipData = {
            chipType: 'BUTTON',
            labelDisplayName: '',
            labelInternalName: '',
            objUid: ''
        };

        var plainText = vmData.searchResults[ii].props.plainText ? vmData.searchResults[ii].props.plainText.displayValues[0] : '';
        var richText = vmData.searchResults[ii].props.richText ? vmData.searchResults[ii].props.richText.displayValues[0] : '';
        prepareCommentCellViewModelObject( vmData.searchResults[ii], plainText, richText, ii, vmData );

        var replyLinkString = '';
        var replyNums = vmData.searchResults[ii].props.numReplies ? vmData.searchResults[ii].props.numReplies.dbValue : '0';
        if( replyNums === 1 ) {
            replyLinkString = replyNums + ' ' + vmData.i18n.reply;
        }else {
            replyLinkString = replyNums + ' ' + vmData.i18n.replies;
        }
        vmData.searchResults[ii].expandCommentsLink = uwPropSvc.createViewModelProperty( 'expandComments', replyLinkString, 'STRING', 'replies' );
        vmData.searchResults[ii].doExpandComments = function( dpItem ) {
            //teardown when comments are collapsed - make cursorStartIndx undefined
            if( dpItem.expandComments && dpItem.cursorStartIndx ) {
                dpItem.cursorStartIndx = dpItem.props.numReplies.dbValue;
            }
            dpItem.expandComments = !dpItem.expandComments;
        };
        vmData.searchResults[ii].collapseCommentsLink = uwPropSvc.createViewModelProperty( 'collapseComments', vmData.i18n.collapse, 'STRING', 'collapse' );

        vmData.searchResults[ii].followConvLink = uwPropSvc.createViewModelProperty( 'followConv', vmData.i18n.follow, 'STRING', 'follow' );
        vmData.searchResults[ii].doFollowConv = function( dpItem ) {
            //teardown when comments are collapsed - make cursorStartIndx undefined
            if( dpItem.showFollowConv ) { //if show follow is true, then we need to follow
                collabSubscribeToConversation( dpItem ).then( function( responseData ) {
                    dpItem.showFollowConv = !dpItem.showFollowConv;
                } );
            }else {
                collabUnSubscribeToConversation( dpItem ).then( function( responseData ) {
                    dpItem.showFollowConv = !dpItem.showFollowConv;
                } );
            }
        };
        vmData.searchResults[ii].unfollowConvLink = uwPropSvc.createViewModelProperty( 'unfollowConv', vmData.i18n.unfollow, 'STRING', 'unfollow' );
        vmData.searchResults[ii].showFollowConv = !vmData.searchResults[ii].props.isConvNotificationSubscribed.dbValue;
        vmData.searchResults[ii].showDeleteLink = ctxDeletePrefVerdict;
        vmData.searchResults[ii].deleteConvLink = uwPropSvc.createViewModelProperty( 'deleteConv', vmData.i18n.delete, 'STRING', 'delete' );
        vmData.searchResults[ii].doDeleteConv = function( dpItem ) {
            eventBus.publish( 'Ac0.initiateDeleteConversationEvent', dpItem );
        };
        vmData.searchResults[ii].deleteConvDesc = {
            extendedTooltipContent: vmData.i18n.deleteConvDesc
        };
        vmData.searchResults[ii].followConvDesc = {
            extendedTooltipContent: vmData.i18n.followConvDesc
        };

        vmData.searchResults[ii].rootCommentObj = createRootCommentVMO( vmData.searchResults[ii].props );
        vmData.searchResults[ii].showConvCellCmds = false;
        vmData.searchResults[ii].cursorStartIndx = parseInt( replyNums );
        vmData.searchResults[ii].cursorEndIndx = parseInt( replyNums );
    }
};

/**
 * Method that creates a VMO from the root comment properties
 * @param {*} convProps conversation properties
 * @returns {Object} ViewModelObject
 */
var createRootCommentVMO = function( convProps ) {
    var serverVMO = {
        props: {}
    };
    serverVMO.uid = convProps.rootCommentUID ? convProps.rootCommentUID.displayValues[0] : '';
    serverVMO.props[convProps.richText ? convProps.richText.propertyName : 'collabRichText'] = convProps.richText ? convProps.richText.displayValues[0] : '';
    serverVMO.props[convProps.plainText ? convProps.plainText.propertyName : 'collabPlainText'] = convProps.plainText ? convProps.plainText.displayValues[0] : '';
    return vmoSvc.constructViewModelObject( serverVMO );
};

/**
 * Method that modifies comments within a conversation tile before display.
 * @param {*} vmData view model data
 * @param {*} currentCommentCtx current comment context used to control reply box visibility
 */
export let modifyComments = function( vmData, currentCommentCtx ) {
    for( var ii = 0; ii < vmData.searchResults.length; ii++ ) {
        var plainText = vmData.searchResults[ii].props.plainText ? vmData.searchResults[ii].props.plainText.displayValues[0] : null;
        var richText = vmData.searchResults[ii].props.richText ? vmData.searchResults[ii].props.richText.displayValues[0] : null;
        prepareCommentCellViewModelObject( vmData.searchResults[ii], plainText, richText, null, vmData );
    }

    if( currentCommentCtx.cursorStartIndx === 0 ) {
        vmData.moreCommentsAvailable = false;
    }
    vmData.dataProviders.commentsDataProvider.cursorObject.endReached = true; //trick the dp to not page
    vmData.commentsDataProviderNotCalled = false;
};

/**
 * Method that invokes post comment action once reply button is clicked. Does some post processing to update dp on the fly
 * @param {*} convObj conversation object
 * @param {*} vmData view model data
 * @returns {*} Promise
 */

export let replyBoxAction = function( convObj, vmData ) {
    var deferred = AwPromiseService.instance.defer();
    //if reply button is clicked without any text, return
    if( _.isNull( vmData.replyPlaceHolder.dbValue ) ) {
        deferred.resolve( {} );
        return deferred.promise;
    }
    var policyDef = {
        types: [  {
            name: 'Ac0Comment',
            properties: [ {
                name: 'awp0CellProperties'
            }, {
                name: 'ac0CreateDate'
            }, {
                name: 'ac0DateModified'
            } ]
        } ]
    };
    var policyId = policySvc.register( policyDef );
    postComment( convObj, vmData.replyPlaceHolder.dbValue ).then( function( responseData ) {
        if( policyId ) {
            policySvc.unregister( policyId );
        }
        var vms = vmData.dataProviders.commentsDataProvider.getViewModelCollection().getLoadedViewModelObjects();
        var svmo = {
            props: {
                richText: '',
                plainText: '',
                modifiedDateTime: ''
            }
        };
        svmo.uid = 'temp888OBJ144';
        svmo.type = 'Ac0Comment';
        var newCommentObj = vmoSvc.constructViewModelObject( svmo );
        newCommentObj.props.plainText = {};
        newCommentObj.props.plainText.displayValues = [];
        newCommentObj.props.modifiedDateTime = {};
        newCommentObj.props.modifiedDateTime.displayValues = [];
        newCommentObj.props.modifiedDateTime.dbValues = '';
        newCommentObj.props.plainText.displayValues.push( vmData.replyPlaceHolder.dbValue );
        if( responseData && !_.isEmpty( responseData.modelObjects ) && responseData.plain && responseData.plain.length > 0 ) {
            newCommentObj.props.modifiedDateTime.displayValues.push( responseData.modelObjects[responseData.plain[0]].props.ac0DateModified.dbValues[0] );
            newCommentObj.props.modifiedDateTime.dbValues = responseData.modelObjects[responseData.plain[0]].props.ac0DateModified.dbValues[0];
        }
        prepareCommentCellViewModelObject( newCommentObj, vmData.replyPlaceHolder.dbValue, null, null, vmData );

        var currentUserObj = appCtxSvc.getCtx( 'user' );
        newCommentObj.props.userName = {
            displayValues: [ '' ]
        };
        newCommentObj.hasThumbnail = false;
        newCommentObj.thumbnailUrl = '';
        // newCommentObj.typeIconURL = currentUserObj.typeIconURL;

        if( currentUserObj.props && currentUserObj.props.user_name ) {
            newCommentObj.props.userName.displayValues[0] = currentUserObj.props.user_name.dbValue;
        }

        if( currentUserObj.thumbnailURL ) {
            newCommentObj.hasThumbnail = true;
            newCommentObj.thumbnailUrl = currentUserObj.thumbnailURL;
        }
        vms.push( newCommentObj );
        vmData.dataProviders.commentsDataProvider.update( vms );
        convObj.props.numReplies.dbValue++;
        if( convObj.expandCommentsLink && convObj.expandCommentsLink.propertyDisplayName ) {
            var currNumReply = parseInt( convObj.expandCommentsLink.propertyDisplayName.split( ' ' )[0] );
            //increment total number of replies
            currNumReply++;
            //reply or replies
            if( currNumReply === 1 ) {
                convObj.expandCommentsLink.propertyDisplayName = currNumReply + ' ' + vmData.i18n.reply;
            }else {
                convObj.expandCommentsLink.propertyDisplayName = currNumReply + ' ' + vmData.i18n.replies;
            }
        }
        uwPropSvc.setValue( vmData.replyPlaceHolder, '' );
        deferred.resolve( responseData );
    } );
    return deferred.promise;
};

export let loadMoreAction = function( vmData, convObj ) {
    if( !vmData.loadMoreComments ) {
        vmData.loadMoreComments = true;
    }
    vmData.hideMoreRepliesButton = true;

    //paging necessary
    var nextStartIndex = convObj.cursorStartIndx - vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad;
    //last page scenario - set endIndex to startIndex and startIndex to 0
    if( nextStartIndex <= 0 ) {
        convObj.cursorEndIndx = convObj.cursorStartIndx;
        convObj.cursorStartIndx = 0;
        return;
    }
    convObj.cursorStartIndx = nextStartIndex;
    convObj.cursorEndIndx = convObj.props.numReplies.dbValue;
};

export let initUniversalConvPanel = function( data ) {
    appCtxSvc.registerCtx( 'Ac0ConvCtx', Ac0ConvCtx );

    //set the selected obj (for Awb0Element it will be the underlying object) in Ac0ConvCtx
    convUtils.setSelectedObjectInContext( data );
};

//TODO - this method should be tied to the unMount lifecyclehook. Currently it is being called on navigateBack which is detrimental. Hence not being called now.

export let destroyUniversalConvPanel = function() {
    appCtxSvc.unRegisterCtx( 'Ac0ConvCtx' );
};

/**
 * Method that preps service input before posting a comment
 * @param {*} convObj conversation object
 * @param {*} richText rich text string
 * @returns {*} Promise
 */
export let postComment = function( convObj, richText ) {
    var deferred = AwPromiseService.instance.defer();
    var request = {};
    var soaInput = {};
     var soaMethod;

     var contextConvObj = {};
     var convObjForSoa = {};

     if( convObj ) {
         contextConvObj = convObj;
    }else {
        contextConvObj.rootCommentObj = appCtxSvc.getCtx( 'Ac0ConvCtx' ).createCommentRootCommentObj;
        contextConvObj.uid = appCtxSvc.getCtx( 'Ac0ConvCtx' ).createCommentConvId;
    }

    convObjForSoa = cdm.getObject( contextConvObj.uid );
    if( !convObjForSoa ) {
        var svmo = {
            props: {}
        };
        svmo.uid = contextConvObj.uid;
        svmo.type = 'Ac0Conversation';
        convObjForSoa = vmoSvc.constructViewModelObject( svmo );
    }

     request.richText = richText ? richText : createConvSvc.getRichText();
     request.rootComment = contextConvObj.rootCommentObj;
     request.comment = null;
     request.conversation = convObjForSoa;//TODO
     soaMethod = 'createOrUpdateComment';
     soaInput.request = [];
     soaInput.request[0] = request;

     callActiveCollabSoa( soaMethod, soaInput ).then( function( responseData ) {
        deferred.resolve( responseData );
     } );
     return deferred.promise;
};

/**
 * Method that preps service input before posting a conversation
 * @param {*} data input data
 * @returns {*} Promise
 */
export let postConversation = function( data ) {
   var deferred = AwPromiseService.instance.defer();
   var request = {};
   var soaInput = {};
    var soaMethod;

    request.sourceObjects = [];
    request.sourceObjects = exports.getSourceObjects( data );
    request.listOfPartipants = data.convType.dbValue === 'message' ? exports.getUserObjects( data ) : null;
    request.defaultCommentText = createConvSvc.getRichText();
    request.conversation = null;
    soaMethod = 'createOrUpdateConversation';
    soaInput.request = request;

    callActiveCollabSoa( soaMethod, soaInput ).then( function( responseData ) {
        modifyCreateCtxFlagsForCollabObjs( false, false );
        deferred.resolve( responseData );
    } );
    return deferred.promise;
};

/**
 * Utility method that will call a method inside the AC soa list with appropriate serviceInput
 * @param {*} method SOA method
 * @param {*} serviceInput service input for SOA
 * @returns {*} Promise
 */
var callActiveCollabSoa = function( method, serviceInput ) {
    var deferred = AwPromiseService.instance.defer();

    //var policyId = policySvc.register( policyDef );

    soa.postUnchecked( 'ActiveCollaboration-2020-12-ActiveCollaboration', method, serviceInput ).then(
        function( responseData ) {
            deferred.resolve( responseData );
        } );

    return deferred.promise;
};

/**
 * Method that switches flags in the context.
 * @param {*} conv Conversation
 * @param {*} comment Comment
 */
var modifyCreateCtxFlagsForCollabObjs = function( conv, comment ) {
    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    convCtx.createNewComment = comment;
    convCtx.createNewConversation = conv;
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * method to prepare comment cell. This mehtod dresses up the 'root comment' cell as well as other comments.
 * For root comment, all params are passed. For individual comments, index and vmData are optional.
 * @param {*} vmObject ViewModelObject
 * @param {*} plainText plain text comment
 * @param {*} richText rich text comment
 * @param {*} index optional - index of root comment in conversation search result. Necessary for unique id in view.
 * @param {*} vmData optional - ViewModelData where Conversation resides. Needed for i18n strings
 */
var prepareCommentCellViewModelObject = function( vmObject, plainText, richText, index, vmData ) {
    //prep chip data section

    vmObject.isSourceObjVisible = false;
    vmObject.isParticipantObjVisible = false;

    //for conversations-
    //display source obj chips only if
    //query returns sourceObjList and it is not an empty array and
    //if sourceObjList length is more than 1, then display
    //if sourceObjList length equals 1 and sourceObj returned isn't the selected context object, then display

    if( vmObject.props.sourceObjList && vmObject.props.sourceObjList.dbValues && vmObject.props.sourceObjList.dbValues.length > 0 ) {
        //setup isSourceObjVisible - > 1 || == 1 and not selected
        //setup chipData - > 1 || == 1 and not selected
        //setup chipData link - > 1 || == 1 and not selected
        //setup more srcObj link - > 1
        //setup more srcObj chips - > 1
        //setup more srcObj chips link
        vmObject.isSourceObjVisible = true;
        vmObject.srcObjIdRef = 'collabSrcObjs_' + index;
        vmObject.chipData.labelDisplayName = vmObject.props.sourceObjList.dbValues[0].cellHeader1;
        vmObject.chipData.labelInternalName = vmObject.props.sourceObjList.dbValues[0].cellHeader1;
        vmObject.chipData.objUid = vmObject.props.sourceObjList.dbValues[0].uid;

        if( vmObject.props.sourceObjList.dbValues.length > 1 ) {
            var moreSourceObjPopupLinkString = '+ ' + ( vmObject.props.sourceObjList.dbValues.length - 1 ).toString() + ' ' + vmData.i18n.more;
            vmObject.moreSourceObjPopupLink = uwPropSvc.createViewModelProperty( 'moreSourceObj', moreSourceObjPopupLinkString, 'STRING', 'more' );
            vmObject.clickSrcObjLink = function( dpItem ) {
                var moreSrcObjList = dpItem.props.sourceObjList.dbValues.slice( 1 );
                var moreSrcObjChipList = [];
                for( var ii = 0; ii < moreSrcObjList.length; ii++ ) {
                    var moreSrcObjChip = {
                        chipType: 'BUTTON',
                        labelDisplayName: moreSrcObjList[ii].cellHeader1,
                        labelInternalName: moreSrcObjList[ii].cellHeader1,
                        objUid: moreSrcObjList[ii].uid
                    };
                    moreSrcObjChipList.push( moreSrcObjChip );
                }
                var data = {
                    declView: 'Ac0MoreSourceObjPopup',
                    options: {
                        reference: dpItem.srcObjIdRef,
                        placement: 'top-start',
                        hasArrow: true,
                        whenParentScrolls: 'close'
                    },
                    subPanelContext: moreSrcObjChipList
                };
                popUpSvc.show( data );
            };
        }


        if( vmObject.props.sourceObjList.dbValues.length === 1 && vmObject.props.sourceObjList.dbValues[0].uid === convUtils.getObjectUID( appCtxSvc.getCtx( 'selected' ) ) ) {
            vmObject.isSourceObjVisible = false;
        }
    }

    if( vmObject.props.participantObjList && vmObject.props.participantObjList.dbValues && vmObject.props.participantObjList.dbValues.length > 0 && vmObject.props.participantObjList.dbValues[0] ) {
        var participantUids = [];
        vmObject.participantIdRef = 'collabParticipants_' + index;
        for( var ii = 0; ii < vmObject.props.participantObjList.dbValues.length; ii++ ) {
            participantUids.push( vmObject.props.participantObjList.dbValues[ii].uid );
        }
        if( participantUids.length > 0 ) {
            vmObject.props.participantUids = participantUids;
            vmObject.props.inflatedParticipantObjList = [];
            dms.loadObjects( participantUids ).then( function() {
                var totalNoOfVisibleParticipants = participantUids.length > 3 ? 3 : participantUids.length;
                for( var nn = 0; nn < totalNoOfVisibleParticipants; nn++ ) { //total no. of participants to be visible initially
                    var usrObj = cdm.getObject( participantUids[nn] );
                    usrObj.props.thumbnailUrl = awIconSvc.getThumbnailFileUrl( usrObj );
                    if( usrObj.props.object_string && usrObj.props.object_string.dbValues ) {
                        usrObj.props.participantNameTooltip = {
                            extendedTooltipContent: usrObj.props.object_string.dbValues[0].split( '(' )[0].trim()
                        };
                    }
                    vmObject.props.inflatedParticipantObjList.push( usrObj );
                }
                vmObject.isParticipantObjVisible = true;

                if( vmObject.props.participantUids.length > 3 ) {
                    var moreParticipantPopupLinkString = '+ ' + ( vmObject.props.participantUids.length - 3 ).toString() + ' ' + vmData.i18n.more;
                    vmObject.moreParticipantPopupLink = uwPropSvc.createViewModelProperty( 'moreParticipant', moreParticipantPopupLinkString, 'STRING', 'more' );
                    vmObject.clickParticipantLink = function( dpItem ) {
                        var moreParticipantList = [];
                        for( var mm = 3; mm < vmObject.props.participantUids.length; mm++ ) {
                            var moreUsrObj = cdm.getObject( participantUids[mm] );
                            moreUsrObj.props.thumbnailUrl = awIconSvc.getThumbnailFileUrl( moreUsrObj );
                            moreUsrObj.props.participantNameTooltip = {
                                extendedTooltipContent: moreUsrObj.props.object_string.dbValues[0].split( '(' )[0].trim()
                            };
                            moreUsrObj.props.displayValue = {
                                propertyDisplayName: moreUsrObj.props.object_string.dbValues[0].split( '(' )[0].trim(),
                                type: 'STRING'
                            };
                            moreParticipantList.push( moreUsrObj );
                        }

                        var data = {
                            declView: 'Ac0MoreParticipantPopup',
                            options: {
                                reference: dpItem.participantIdRef,
                                placement: 'top-start',
                                hasArrow: true,
                                whenParentScrolls: 'close'
                            },
                            subPanelContext: moreParticipantList
                        };
                        popUpSvc.show( data );
                    };
                }
            } );
        }
    }
    //prep plainText/richText comment setion
    vmObject.props.curtailedComment = plainText;
    vmObject.showMore = false;
    vmObject.showMoreLink = false;
    vmObject.showLessLink = false;

    //prep more/less link section
    if( richText && richText.length > 0 ) {
        vmObject.props.richTextObject = convUtils.processRichText( richText );
        vmObject.showMore = vmObject.props.richTextObject.showMore;
    }else {
        vmObject.props.plainTextObject = convUtils.processPlainText( plainText );
        vmObject.showMore = vmObject.props.plainTextObject.showMore;
    }

    vmObject.showMoreLink = vmObject.showMore;
    vmObject.expandComments = false;
    vmObject.moreLink = uwPropSvc.createViewModelProperty( 'moreLink', vmData.i18n.more, 'STRING', 'more' );
    vmObject.lessLink = uwPropSvc.createViewModelProperty( 'lessLink', vmData.i18n.less, 'STRING', 'less' );
    vmObject.doShowMore = function( dpItem ) {
        dpItem.showMore = false;
        dpItem.showMoreLink = false;
        dpItem.showLessLink = true;
    };
    vmObject.doShowLess = function( dpItem ) {
        dpItem.showMore = true;
        dpItem.showMoreLink = true;
        dpItem.showLessLink = false;
    };
    vmObject.hasThumbnail = false;
    if( vmObject.thumbnailUrl ) {
        vmObject.hasThumbnail = true;
    }

    if( vmObject.props.userName && vmObject.props.userName.displayValues[0] ) {
        vmObject.props.userName.displayValues[0] = vmObject.props.userName.displayValues[0].split( '(' )[0].trim();
    }

    if( vmObject.props.modifiedDateTime && vmObject.props.modifiedDateTime.dbValues !== null ) {
        var twentyFourHours = 24 * 60 * 60 * 1000;
        var timeInMs = Date.now();
        var conversationModifiedDateTime = new Date( vmObject.props.modifiedDateTime.dbValues ).getTime();
        if ( timeInMs - conversationModifiedDateTime  > twentyFourHours ) {
            vmObject.props.modifiedDateTime.displayValues[0] = vmObject.props.modifiedDateTime.displayValues[0].split( ' ' )[0];
        } else{
            vmObject.props.modifiedDateTime.displayValues[0] = new Date( vmObject.props.modifiedDateTime.dbValues ).toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
        }
    }
};

/**
 * Add given sub panel
 * @param {String} destPanelId Panel ID
 * @param {String} titleLabel Title
 */
export let addSubPanelPage = function( destPanelId, titleLabel ) {
    var context = {
        destPanelId: destPanelId,
        supportGoBack: true,
        title: titleLabel,
        recreatePanel: true,
        isolateMode: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Add source objects from Pallette/Search to dataProvider
 * @param {Object} data Data
 */
export let addSourceObjects = function( data ) {
    if ( data.sourceObjects ) {
        if ( !parentData.srcObjChips ) {
            parentData.srcObjChips = [];
        }

        for ( var i = 0; i < data.sourceObjects.length; i++ ) {
            var srcObject = {
                uiIconId: 'miscRemoveBreadcrumb',
                chipType: 'BUTTON',
                labelDisplayName: data.sourceObjects[i].props.object_name.dbValue,
                labelInternalName: data.sourceObjects[i].props.object_name.dbValue,
                theObject: data.sourceObjects[i]
            };

            var chipExisted = _.find( parentData.srcObjChips, function( chip ) {
                return chip.theObject.uid === data.sourceObjects[i].uid;
            } );

            if( !chipExisted ) {
                parentData.srcObjChips.push( srcObject );
            }
        }
    }
};

/**
 * set data to the parentData
 * @param {Object} data Data
 */
export let setParentData = function( data ) {
    // store create converation panel data to a variable.
    parentData = data;
};

/**
 * Return the source objects
 * @param {Object} data Data
 * @returns {Object} array of sourceObjects
 */
export let getSourceObjects = function( data ) {
    var sourceObjs = [];
    var sourceTags = data.srcObjChips ? data.srcObjChips : parentData.srcObjChips;
    if( sourceTags ) {
        for ( var i = 0; i < sourceTags.length; i++ ) {
            if( sourceTags[i].theObject ) {
                sourceObjs.push( sourceTags[i].theObject );
            }
        }
    }

    return sourceObjs;
};

export let getRandObjId = function() {
    var randObjId = '';
    randObjId += Math.floor( 10000 * Math.random() );
    return randObjId;
};

export let getParentData = function() {
    return parentData;
};

export let updateSelectedConversation = function() {
//TODO
};

/**
 * Add user objects to dataProvider
 * @param {Object} data Data
 */
export let addUserObjs = function( data ) {
    if ( data.dataProviders.userPerformSearch.selectedObjects ) {
        if ( !parentData.userChips ) {
            parentData.userChips = [];
        }

        for ( var i = 0; i < data.dataProviders.userPerformSearch.selectedObjects.length; i++ ) {
            var theUserObject = data.dataProviders.userPerformSearch.selectedObjects[i];

            var userObject = {
                uiIconId: 'miscRemoveBreadcrumb',
                chipType: 'BUTTON',
                labelDisplayName: theUserObject.props.user_name.uiValue,
                labelInternalName: theUserObject.props.user_name.uiValue,
                theObject: theUserObject
            };

            var chipExisted = _.find( parentData.userChips, function( chip ) {
                return chip.theObject.uid === theUserObject.uid;
            } );

            if( !chipExisted ) {
                parentData.userChips.push( userObject );
            }
        }
    }
};

/**
 * Return the source objects
 * @param {Object} data Data
 * @returns {Array} users
 */
export let getUserObjects = function( data ) {
    var userObjs = [];
    var userTags = data.userChips ? data.userChips : parentData.userChips;

    if( userTags ) {
        for ( var i = 0; i < userTags.length; i++ ) {
            if( userTags[i].theObject ) {
                userObjs.push( userTags[i].theObject );
            }
        }
    }

    return userObjs;
};

export let teardownUniversalConvPanel = function() {
    //empty out selected conversation
    selectedConv = {};
};

export let conversationSelectionChange = function( event, vmData ) {
    if( event.selectedObjects.length === 1 ) {
        if( !_.isEmpty( selectedConv ) ) {
            selectedConv.showConvCellCmds = false;
        }
        selectedConv = event.selectedObjects[0];
        selectedConv.showConvCellCmds = true;

        var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
        convCtx.currentSelectedConversation = selectedConv;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );

        eventBus.publish( 'Ac0Conversation.checkConvSubscriptionEvent' );
    }
    if( event.selectedObjects.length === 0 && !_.isEmpty( selectedConv ) ) {
        selectedConv.showConvCellCmds = false;
        var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
        convCtx.currentSelectedConversation = null;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    }
};

/**
 * Manage the subscription to objects or conversations.
 * @param {[ModelObject]} sourceObjects The list of source objects to follow
 * @param {[ModelObject]} conversations The list of conversations to follow
 * @param {Boolean} subscriptionFlag Follow or unfollow.
 * @returns {Promise} promise
 */
export let callCollabSubscribeSOA = function( sourceObjects, conversations, subscriptionFlag ) {
    var deferred = AwPromiseService.instance.defer();
    var soaInput = {};
    var soaMethod;

    soaInput.sourceObjects = sourceObjects;
    soaInput.subscriptionFlag = subscriptionFlag;
    soaInput.conversations = conversations;

    soaMethod = 'manageSubscriptions';

    callActiveCollabSoa( soaMethod, soaInput ).then( function( responseData ) {
        deferred.resolve( responseData );
        var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
        if( typeof responseData.deleted !== 'undefined' ) {
            if ( conversations.length > 0 ) {
                convCtx.ac0NumSubscriptionsForSelectedConv = 0;
            } else {
                convCtx.ac0NumSubscriptionsForSelectedObj = 0;
            }
        } else {
            if ( conversations.length > 0 ) {
                convCtx.ac0NumSubscriptionsForSelectedConv = 1;
            } else {
                convCtx.ac0NumSubscriptionsForSelectedObj = 1;
            }
        }
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    } );
    return deferred.promise;
};

/**
 * Subscribe to notifications for a source object
 * @param {*} object the object to follow
 * @returns {Promise} promise
 */
export let collabSubscribeToObj = function( object ) {
    var objUid = convUtils.getObjectUID( object );
    var objForSoa = cdm.getObject( objUid );
    return callCollabSubscribeSOA( [ objForSoa ], [], true );
};

/**
 * Unsubscribe to notifications for a source object
 * @param {*} object the object to follow
  * @returns {Promise} promise
 */
export let collabUnSubscribeToObj = function( object ) {
    var objUid = convUtils.getObjectUID( object );
    var objForSoa = cdm.getObject( objUid );
    return callCollabSubscribeSOA( [ objForSoa ], [], false );
};

/**
 * Subscribe to notifications for a conversation
 * @param {*} object the object to follow
  * @returns {Promise} promise
 */
export let collabSubscribeToConversation = function( object ) {
    var selectedObjUid = convUtils.getObjectUID( appCtxSvc.getCtx( 'selected' ) );
    var objForSoa = cdm.getObject( selectedObjUid );
    return callCollabSubscribeSOA( [ objForSoa ], [ object ], true );
};

/**
 * Unsubscribe to notifications for a conversation
 * @param {*} object the object to follow
  * @returns {Promise} promise
 */
export let collabUnSubscribeToConversation = function( object ) {
    var selectedObjUid = convUtils.getObjectUID( appCtxSvc.getCtx( 'selected' ) );
    var objForSoa = cdm.getObject( selectedObjUid );
    return callCollabSubscribeSOA( [ objForSoa ], [ object ], false );
};

export let setObjectDisplayData = function( data ) {
    convUtils.setObjectDisplayData( data );
};

/**
 * Ac0ConversationService factory
 */

export default exports = {
    universalConversationPanelReveal,
    changeConvType,
    navigateToCreateConv,
    removeChipObj,
    onObjectTabSelectionChange,
    modifyConversations,
    replyBoxAction,
    modifyComments,
    loadMoreAction,
    postConversation,
    postComment,
    initUniversalConvPanel,
    destroyUniversalConvPanel,
    addSubPanelPage,
    addSourceObjects,
    setParentData,
    getSourceObjects,
    navigateToCreateComment,
    getRandObjId,
    updateSelectedConversation,
    getParentData,
    addUserObjs,
    getUserObjects,
    teardownUniversalConvPanel,
    conversationSelectionChange,
    collabSubscribeToObj,
    collabUnSubscribeToObj,
    collabSubscribeToConversation,
    collabUnSubscribeToConversation,
    setObjectDisplayData
};
app.factory( 'Ac0ConversationService', () => exports );
