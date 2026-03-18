// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

import eventBus from 'js/eventBus';
import _ from 'lodash';
import soaSvc from 'soa/kernel/soaService';
import viewModelObject from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import dataMgmtService from 'soa/dataManagementService';
import mbmRemoveSvc from 'js/mbmRemoveService';
import awPromiseSvc from 'js/awPromiseService';
import mbmPropagateSvc from 'js/mbmPropagateService';
/**
 * @module js/mbmChangeSummaryService
 */

 /**
  * number of level to in show in breadcrumb of sub tile
  */
const BREADCRUMB_LEVEL = 2;
const MISMATCHE_STATUSES = [ '2', '6', '58' ];
const MISSING_STATUSES = [ '1', '55' ];
const ALIGNED_STATUSES = [ '4', '5', '57' ];
const MISSING_WITH_SUBPARTS_STATUS = 83;
const UNASSIGNED_STATUSES = [ '3', '56' ];
const PART_NOT_ASSIGNED_MESSAGE_STATUS = [ '3', '51', '52', '53', '54', '56' ];
  /**
  * Add function to data
  * @param {Object} data data
  */
export let initializeContentClickListener = function( data ) {
    data.onClickChangeRecordContent = function( selectedObject, event ) {
        if ( event && data.activeButtonDimension ) {
            let  ofsetTop = data.activeButtonDimension.offsetTop;
            let offsetRight = data.activeButtonDimension.offsetLeft + data.activeButtonDimension.offsetWidth;
            let  ofsetBotton = data.activeButtonDimension.offsetTop + data.activeButtonDimension.offsetHeight;
            let offsetLeft = data.activeButtonDimension.offsetLeft;
            let clientX = event.originalEvent.clientX;
            let clientY = event.originalEvent.clientY;
            if ( clientX > offsetLeft && clientX < offsetRight && clientY > ofsetTop && clientY < ofsetBotton ) {
                return;
            }
        }
        let prevSelectedObject = data.selectedObject;
        if ( prevSelectedObject && prevSelectedObject.uid === selectedObject.uid ) {
            data.selectedObject = null;
        }else{
            data.selectedObject = selectedObject;
        }
        eventBus.publish( 'mbm.changeRecordSelectionChange', selectedObject );
    };
};

export let evaluatePropagateChanges = function( contextInfos ) {
    let evalObject = {
        propagationActive:true,
        objectsToPropagate:[]
    };
    _.forEach( contextInfos, function( contextInfo ) {
        if ( !evalObject.hasOverAssigned && contextInfo.compareStatus === '6' ) {
            evalObject.hasOverAssigned = true;
        }
        evalObject.objectsToPropagate.push( contextInfo.uid );
    } );

    return evalObject;
};

export let removeEvaluatedObject = function( data ) {
    delete data.evaluatedObj;
};

export let performPropagateChanges = function( objectsToPropagate ) {
    return mbmPropagateSvc.pushPropagateChanges( objectsToPropagate, false );
};

export let performRemoveChanges = function( contextInfos ) {
    let deferred = awPromiseSvc.instance.defer();
    let objectUids = contextInfos.map( function( contextInfo ) {
        return contextInfo.uid;
    } );

    if ( objectUids && objectUids.length > 0 ) {
        dataMgmtService.loadObjects( objectUids ).then( function() {
            let loadedObjs = cdm.getObjects( objectUids );
            if ( loadedObjs && loadedObjs.length > 0 ) {
                mbmRemoveSvc.removeElements( loadedObjs );
            }
        } );
    }
    deferred.resolve();
    return deferred.promise;
};

export let updateChangeRecordSelectionChange = function( data, eventData ) {
    if ( data.selectedObject && data.selectedObject.uid !== eventData.uid ) {
        data.selectedObject = null;
    }
};

export let updateChangeSummaryOnSave = function( changeSummary, eventData ) {
    let status = {
        equivalentElements:[]
    };

    let objectsToUpdate = eventData.source;
    if ( eventData.removedObjects ) {
        objectsToUpdate = _.union( objectsToUpdate, eventData.removedObjects );
    }
    status.equivalentElements = getEquivalentElementWithStatusFor( objectsToUpdate );

    if ( status.equivalentElements.length > 0 && changeSummary.subTilesInfo ) {
        updateSubTileInfo( changeSummary.subTilesInfo, status, false );
        updateMainTileStatus( changeSummary );
    }
};


/**
 *Load change summary information of given change notice revision item
 * @param {Object} changeNoticeRev change notice revidion item
 * @returns {promise} promise
 */
export let loadChangeSummaryData = function( changeNoticeRev ) {
    return soaSvc.postUnchecked( 'Internal-MultiBomManager-2020-05-MultiBOMChangeMgmt', 'getChangeSummary', getChangeSummarySoaInput( changeNoticeRev ) ).then( function( response ) {
        //check partial error if exists reject it
        if( response.ServiceData && response.ServiceData.partialErrors ) {
            throw soaSvc.createError( response.ServiceData );
        }else{
            return getProcessedChangeSummaryResponse( response, changeNoticeRev );
        }
    },
    function( error ) {
        throw soaSvc.createError( error );
    } );
};


/**
 * Update change record status of change summary tiles
 * @param {Array} changeSummaries array of changeSummaries
 * @param {Array} changeRecordsStatus array of changeRecordsStatus
 */
export let updateChangeRecordsStatus = function( changeSummaries, changeRecordsStatus ) {
    _.forEach( changeRecordsStatus, function( crStatus ) {
        let cr = crStatus.changeRecord;
        let status = crStatus.status;
        let changeSummary = getChangeSummaryInfoFor( changeSummaries, cr.childRev,  cr.occurrence );

        if ( changeSummary  ) {
            if ( !changeSummary.subTilesInfo ) {
                changeSummary.subTilesInfo = getSubTilesInfo( status, changeSummary.changeType );
            }else{
                //update tile info
                updateSubTileInfo( changeSummary.subTilesInfo, status, true );
            }
            updateMainTileStatus( changeSummary );
        }
    } );
};

/**
 * Get soa input for getChangeSummary
 * @param {Object} modelObject change notice item revision
 * @returns{Object} soa input object
 */
let getChangeSummarySoaInput = function( modelObject ) {
    return {
        changeNoticeRev:{
            uid: modelObject.uid,
            type: modelObject.type
        }
    };
};


/**
 * Get array of change summary information after processing response
 * @param {Object} response  object that to be processed
 * @param {Object} changeNoticeRev change notice revision
 * @returns {Object}  change summary information
 **/
let getProcessedChangeSummaryResponse = function( response, changeNoticeRev ) {
    let processedDataMap = {};
    let occLevelPropChangesMap = {}; // store parentId and array of  {childId, occProps}
    let changeNoticeInfo = getChangeNoticeInfo( changeNoticeRev );
    if ( response && response.output ) {
        _.forEach( response.output, function( changeInfo ) {
            let itemUid = changeInfo.itemRev.uid;
            let parentUid = changeInfo.parentItemRev.uid;
            let changeType = changeInfo.changeType;
            let propertyInfo = changeInfo.properyInfo;
            let occInfo = _.remove( propertyInfo, function( info ) {
                return info.propDisplayName  === 'occurrenceUid';
              } );

              let occUid = occInfo.length > 0 ? occInfo[0].currentUIValue : '';
            let key = getKey( itemUid, occUid );
            let changeSummaryInfo = processedDataMap[key];
            if ( !changeSummaryInfo ) {
                changeSummaryInfo = getChangeSummaryInfo( changeInfo.itemRev, changeInfo.parentItemRev, occUid );
                if ( changeSummaryInfo ) {
                    processedDataMap[key] = changeSummaryInfo;
                }else{
                    return true;
                }
            }
            if ( changeType === 'MBMBOM_Occurrence_Updated' ) {
                let occPropChangesInChild = occLevelPropChangesMap[parentUid];
                if ( !occPropChangesInChild ) {
                    occPropChangesInChild = [];
                    occLevelPropChangesMap[parentUid] = occPropChangesInChild;
                }
                let occLevelPropChange = getOccPropChangesInChild( changeInfo.itemRev, propertyInfo );
                occPropChangesInChild.push( occLevelPropChange );
                changeSummaryInfo.occPropChanges = changeInfo.properyInfo || null;
                if ( !changeSummaryInfo.changeType ) {
                    changeSummaryInfo.changeType = changeType;
                }
            }else{
                changeSummaryInfo.propertyInfo = propertyInfo;
                changeSummaryInfo.changeType = changeType;
            }
        } );

        // add all occ level prop change to parent
        _.forEach( processedDataMap, function( value ) {
            let uid = cdm.isValidObjectUid( value.vmo.uid ) ? value.vmo.uid : '';
            let parentUid = cdm.isValidObjectUid( value.parent.uid ) ? value.parent.uid : '';
            let occlevelProps = occLevelPropChangesMap[uid];
            if ( occlevelProps ) {
                value.occLevelPropChangesInChild = occlevelProps;
            }

            changeNoticeInfo.changeRecords.push( {
                childRev: uid,
                parentRev: parentUid,
                changeType:getIntChangetType( value.changeType ),
                occurrence:value.occurrenceUid
            } );
        } );
    }
    let changeSummaries =  Object.values( processedDataMap ) || [];

    return {
        changeSummaries: changeSummaries,
        changeNoticeInfo:changeNoticeInfo
    };
};

/**
 * Get int changeType for corresponding string change type
 * @param {String} changeType changeType
 * @return {Number} int value
 */
let getIntChangetType = function( changeType ) {
    if ( changeType === 'MBMBOM_Added' ) {
        return 0;
    }else if ( changeType === 'MBMBOM_Removed' ) {
        return 1;
    }else if ( changeType === 'MBMBOM_Updated' ) {
        return 2;
    }else if ( changeType === 'MBMBOM_Occurrence_Updated' ) {
        return 3;
    }
    return -1;
};
/**
 * get subtiles info of given change summary record
 *
 * @param {Object} cnRecordStatus indication status of changeSummery in ebom or mbom
 * @param {Object} changeType change type  tracked by change notice
 * @return {Object} object of subTilesInfo
 */
let getSubTilesInfo = function( cnRecordStatus, changeType ) {
    let subTilesInfo = null;
    if ( cnRecordStatus && cnRecordStatus.equivalentElements ) {
        let subTileContext = getSubTilesContext( cnRecordStatus.status, changeType );
        subTilesInfo = {
            contextInfo:[],
            context: subTileContext,
            changeType:changeType,
            hasMultipleIssue:false
        };
        let issuesFound = 0;
        _.forEach( cnRecordStatus.equivalentElements, function( equivalentElement, index ) {
            let values = equivalentElement.split( getDelimiterKey() );
            let breadCrumb = [];
            let equivUid = values[0];
            let compStatus = values[1];
            updateBreadCrumbInfo( breadCrumb, equivUid, BREADCRUMB_LEVEL );

            let info = {
                uid: values[0],
                compareStatus : compStatus,
                breadCrumb:breadCrumb,
                showSeparator:index < cnRecordStatus.equivalentElements.length,
                changeType: changeType,
                context: subTileContext,
                isAligned:false

            };

            if (  changeType === 'MBMBOM_Added' || changeType === 'MBMBOM_Updated' || changeType === 'MBMBOM_Occurrence_Updated' ) {
                if ( changeType === 'MBMBOM_Added' && UNASSIGNED_STATUSES.indexOf( compStatus ) > -1  || MISMATCHE_STATUSES.indexOf( compStatus ) > -1 ) {
                    info.isHandle = false;
                    subTilesInfo.contextInfo.push( info  );
                    issuesFound++;
                }else{
                    info.isHandle = true;
                    subTilesInfo.contextInfo.push( info  );
                    if ( ALIGNED_STATUSES.indexOf( compStatus ) > -1 ) {
                        info.isAligned = true;
                    }
                }
                updateSubTileStatus( info );
            } else if ( changeType === 'MBMBOM_Removed' ) {
                subTilesInfo.contextInfo.push( info  );
                info.isHandle = false;
                issuesFound++;
            }
            dataMgmtService.loadObjects( [ values[0] ] ).then( function() {
                let loadedObj = cdm.getObject( values[0] );
                if ( loadedObj ) {
                    if ( cnRecordStatus.status === MISSING_WITH_SUBPARTS_STATUS ) {
                        info.displayName = loadedObj.props.object_string.uiValues[0];
                    }
                    info.tooltipDisplayName = loadedObj.props.awb0Archetype.uiValues[0];
                }
            } );
        } );
        subTilesInfo.hasMultipleIssue = issuesFound > 1;
        //update showSeparator
        _.forEach( subTilesInfo.contextInfo, function( contextInfo, index ) {
            contextInfo.showSeparator = index < subTilesInfo.contextInfo.length - 1;
        } );
    }

    return subTilesInfo;
};

let updateMainTileStatus = function( chngeSummary ) {
    let isHandle = true;
    let showIndication = false;

    if ( chngeSummary.changeType === 'MBMBOM_Added' || chngeSummary.changeType === 'MBMBOM_Updated' || chngeSummary.changeType === 'MBMBOM_Occurrence_Updated' ) {
        if ( chngeSummary.subTilesInfo && chngeSummary.subTilesInfo.contextInfo ) {
            let notHandleContextInfo =  _.find( chngeSummary.subTilesInfo.contextInfo, function( contextInfo ) { return !contextInfo.isHandle; } );
            if ( notHandleContextInfo  ) {
                isHandle = false;
                showIndication = true;
            }else{
                isHandle = true;
                showIndication = false;
            }
        }else{
            isHandle = true;
            showIndication = false;
        }
    }else if ( chngeSummary.changeType === 'MBMBOM_Removed' ) {
        if ( chngeSummary.subTilesInfo && chngeSummary.subTilesInfo.contextInfo && chngeSummary.subTilesInfo.contextInfo.length > 0 ) {
            isHandle = false;
            showIndication = true;
        }else{
            isHandle = true;
            showIndication = false;
        }
    }
    chngeSummary.isHandle = isHandle;
    chngeSummary.showIndication = showIndication;
};
/**
 * update subtiles info of subTileInfo for given change record status
 *
 * @param {Object} subTileInfo subtile info  in ebom or mbom context
 * @param {Object} cnRecordStatus change record status
 * @param {boolean} isFreshUpdate if true  subtile of changeType remove  from subtileInfo will not delete else delete
 */
let updateSubTileInfo = function( subTileInfo, cnRecordStatus, isFreshUpdate ) {
    _.forEach( cnRecordStatus.equivalentElements, function( equivalentElement ) {
        let values = equivalentElement.split( getDelimiterKey() );
        if ( !isFreshUpdate && subTileInfo.changeType === 'MBMBOM_Removed' ) {
            _.remove( subTileInfo.contextInfo, function( contextInfo ) {
                return contextInfo.uid === values[0];
              } );
        }else{
            let info = _.find( subTileInfo.contextInfo, function( contextInfo ) {
                return contextInfo.uid === values[0];
            } );
            if ( info ) {
                info.isHandle = !( subTileInfo.changeType === 'MBMBOM_Added' && UNASSIGNED_STATUSES.indexOf( values[1] ) > -1 || MISMATCHE_STATUSES.indexOf( values[1] ) > -1 || MISSING_STATUSES.indexOf( values[1] ) > -1 );
                info.compareStatus = values[1];
                info.isAligned = ALIGNED_STATUSES.indexOf( values[1] ) > -1;
                updateSubTileStatus( info );
            }
        }
    } );

    if ( subTileInfo.changeType === 'MBMBOM_Removed' ) {
        subTileInfo.hasMultipleIssue = subTileInfo.contextInfo && subTileInfo.contextInfo.length > 1;
        if ( subTileInfo.contextInfo && subTileInfo.contextInfo.length === 0 ) {
             delete subTileInfo.contextInfo;
        }
    }else{
        let issueFound = _.filter( subTileInfo.contextInfo, function( contextInfo ) {
            return !contextInfo.isHandle && contextInfo.compareStatus !== '58';
        } );

        subTileInfo.hasMultipleIssue = issueFound.length > 1;
    }

    //update showSeparator
    _.forEach( subTileInfo.contextInfo, function( contextInfo, index ) {
        contextInfo.showSeparator = index < subTileInfo.contextInfo.length - 1;
    } );
};

let updateSubTileStatus = function( subTileInfo ) {
    if ( subTileInfo.isHandle && subTileInfo.isAligned ) {
        subTileInfo.subTileStatus = 'mbmPartAligned';
    }else if ( subTileInfo.changeType === 'MBMBOM_Added' && subTileInfo.isHandle && subTileInfo.compareStatus === '82' ) {
        subTileInfo.subTileStatus = 'mbmAssignedByAncestor';
    }else if ( subTileInfo.changeType === 'MBMBOM_Added' && !subTileInfo.isHandle && UNASSIGNED_STATUSES.indexOf( subTileInfo.compareStatus ) > -1 ) {
        subTileInfo.subTileStatus = 'mbmNotAssigned';
    }else if ( ( subTileInfo.changeType === 'MBMBOM_Updated' || subTileInfo.changeType === 'MBMBOM_Occurrence_Updated' ) && subTileInfo.isHandle ) {
        if ( PART_NOT_ASSIGNED_MESSAGE_STATUS.indexOf( subTileInfo.compareStatus ) > -1 ) {
            subTileInfo.subTileStatus = 'mbmPartNotAssigned';
        }else if( subTileInfo.compareStatus === '82' ) {
            subTileInfo.subTileStatus = 'mbmAssignedByAncestor';
        }
    }
};

/**
 *Get subtiles context for given status
 * @param {Object} status change notice resord status
 * @param {String} changeType change type any of MBMBOM_Added,MBMBOM_Updated, MBMBOM_Removed, MBMBOM_Occurrence_Updated
 * @return {String} subtiles context
 */
let getSubTilesContext = function( status, changeType ) {
    if ( changeType === 'MBMBOM_Added' ) {
        return 'eBomContext';
    }else if ( changeType === 'MBMBOM_Updated' || changeType === 'MBMBOM_Occurrence_Updated' ) {
        return 'eBomContext';
    }else if ( changeType === 'MBMBOM_Removed' ) {
        if ( status === MISSING_WITH_SUBPARTS_STATUS ) {
            return 'mBomContextSubParts';
        }
            return 'mBomContext';
    }

    return null;
};

/**
 *Update bread crumb info of object of given uid
 * @param {Array} breadCrumbs array of object
 * @param {String} uid uid of object
 * @param {*} level  number of parent level
 */
let updateBreadCrumbInfo = function( breadCrumbs, uid, level ) {
    dataMgmtService.loadObjects( [ uid ] ).then( function() {
        let loadedObj = cdm.getObject( uid );
        if ( loadedObj ) {
            breadCrumbs.push( {
                uid:uid,
                displayName:loadedObj.props.object_string.uiValues[0],
                showArrow: true
            } );
            let parentObj = loadedObj.props.awb0Parent;
            if ( parentObj && parentObj.dbValues[0] && breadCrumbs.length <= level  ) {
                updateBreadCrumbInfo( breadCrumbs, parentObj.dbValues[0], level );
            }else{
                //remove first element from breadcrumbs
                _.remove( breadCrumbs, function( obj, idx ) {
                    return idx === 0;
                } );
                _.reverse( breadCrumbs );
                // set showArrow false of last element of breadCrumb
                let crumb = breadCrumbs.length > 0 ? breadCrumbs[breadCrumbs.length - 1] : null;
                if ( crumb ) {
                    crumb.showArrow = false;
                }
            }
        }
    } );
};

/**
 *Get occurrence level property changes info
 * @param {Object} item revision item
 * @param {Object} propertyInfo occurrence level properties info
 * @returns {Object} object of occurrence level properies info
 */
let getOccPropChangesInChild = function( item, propertyInfo ) {
    return   {
        uid: item.uid,
        displayName: item.props.object_string.uiValues[0],
        propertyInfo: propertyInfo || null
    };
};

/**
 * Get changeNoticeInfo input property getAssignmentAndMismatchStatus  SOA
 * @param {Object} modelObject change notice
 * @return {Object} changeNoticeInfo
 */
let getChangeNoticeInfo = function( modelObject ) {
    return {
        changeNoticeRev:{
            uid: modelObject.uid,
            type: modelObject.type
        },
        changeRecords:[]
    };
};

let getEquivalentElementWithStatusFor = function( recods ) {
    let uidToStatus = [];
    _.forEach(  recods, function( record ) {
        let equivElement = record.hasOwnProperty( 'id' ) && record.hasOwnProperty( 'status' ) ? record.id + getDelimiterKey() + record.status : record;
        uidToStatus.push( equivElement );
    } );

    return uidToStatus;
};

/**
 * Get Change summary info
 * @param {Object} item item revision
 * @param {Object} parentItem  parent item revision
 * @param {String} occUid occurrenceUid of item
 * @returns {Object} change summary info
 */
let getChangeSummaryInfo = function( item, parentItem, occUid ) {
    let cnInfo = null;

    if ( cdm.isValidObjectUid( item.uid ) ) {
        let vmo = viewModelObject.createViewModelObject( item, 'EDIT', null, null ); //item info
        cnInfo = {
            vmo:vmo,
            parent:parentItem,
            occurrenceUid: occUid
        };
    }
   return cnInfo;
};

/**
 *Get change summary info from changeRecordsStatus for given itemRev,  occUid
 * @param {Array} changeSummaries array of change summary info
 * @param {*} itemRev item uid of change summary info
 * @param {*} occUid occurrence uid of of change summary info
 * @returns {Object}  change summary info
 */
let getChangeSummaryInfoFor = function( changeSummaries, itemRev, occUid ) {
    return _.find( changeSummaries, function( cs ) {
        return cs.vmo.uid === itemRev  && cs.occurrenceUid === occUid;
    } );
};

/**
 *Get key for given uid and parent uid
 * @param {String} uid uid of object
 * @param {String } occUid occurrence uid of object
 * @returns {String} key
 */
let getKey = function( uid, occUid ) {
    return uid + '_' + occUid;
};

/**
 *Get delimiter key
 @return {String} delimeter key
 */
let getDelimiterKey = function() {
    return '##';
};

export default  {
    initializeContentClickListener,
    loadChangeSummaryData,
    updateChangeRecordsStatus,
    updateChangeRecordSelectionChange,
    performPropagateChanges,
    performRemoveChanges,
    evaluatePropagateChanges,
    removeEvaluatedObject,
    updateChangeSummaryOnSave
};

