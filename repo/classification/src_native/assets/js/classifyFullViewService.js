/* eslint-disable max-lines */
/* eslint-disable no-bitwise */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*
global
 define
 */

/**
 * This is a utility to format the response of the getAttributes2 classification SOA to be compatible with the generic
 * property widgets.
 *
 * @module js/classifyFullViewService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import soaService from 'soa/kernel/soaService';
import modelPropertyService from 'js/modelPropertyService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import TcServerVersion from 'js/TcServerVersion';
import iconSvc from 'js/iconService';
import highlighterSvc from 'js/highlighterService';
import classifySvc from 'js/classifyService';
import classifyTblSvc from 'js/classifyFullviewTableService';
import classifyUtils from 'js/classifyUtils';
import classifyLovSvc from 'js/classifyLOVService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import clsTreeSvc from 'js/classifyTreeService';
import clsFullViewModeSvc from 'js/classifyFullViewModeService';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import analyticsSvc from 'js/analyticsService';

import 'js/classifyLOVService';

import 'js/dateTimeService';
import 'js/classifyFullViewModeService';

var exports = {};
export let NON_COMPLEX_VMO_COUNT = 3;
export let COMPLEX = 5;
export let LOWEST_NON_COMPLEX_TYPE = 4;
export let COMPLEX_POSITION = 8;
export let ECLASSRELEASES = 'CST_supported_eclass_releases';
export let PRESENTATION = 'CLS_is_presentation_hierarchy_active';
//Convert values always gets called twice on starting an edit operation, thus the count needs to be kept to ensure it is only call
//at the right time.
var initialConvertCount = 0;
var suggestedClassSelected = false;
var serviceName = 'Internal-IcsAw-2019-12-Classification';
var operationName = 'findClassificationInfo3';


/**
 *  Use case : If user tries to paste the ico, which is deleted, following method would reset the view
 * @param {*} data The declarative view model
 * @param {*} ctx  Application context
 */
export let setNotifyMessage = function( data, ctx ) {
    if( appCtxSvc.getCtx( 'notifyMessage' ) === undefined || appCtxSvc.getCtx( 'notifyMessage' ) === false ) {
        appCtxSvc.updateCtx( 'notifyMessage', true );
        appCtxSvc.updateCtx( 'classifyEdit', true );
        exports.resetView( data );
    }
    return true;
};

export let confirmDelete1 = function( context ) {
    var commandContext = context;

    appCtxSvc.registerCtx( 'deletedIco', commandContext );
    return true;
};


/**
 * The pasteCommandHide hides the paste command if the copied context is deleted.
 * @param context Application context
 */
export let pasteCommandHide = function( context ) {
    var commandContext = context;
    if( appCtxSvc.getCtx( 'IcoUID' ) === commandContext.vmo.icoUid ) {
        appCtxSvc.unRegisterCtx( 'IcoReplica' );
    }
};

export let getCopyInput = function( context ) {
    var commandContext = context;
    var uid = commandContext.vmo.icoUid;
    appCtxSvc.registerCtx( 'IcoUID', uid );
    appCtxSvc.registerCtx( 'IcoReplica', commandContext );
    return true;
};

/**
 * Get classifiable Work space objects list
 *
 */

export let getClassifyNonClassify = function( response ) {
    var classifiableWSOList = [];
    if( response && response.wso2ClassifyMap ) {
        var wso2Classify = response.wso2ClassifyMap;
        if( wso2Classify[ 1 ][ 0 ] ) {
            classifiableWSOList.push( wso2Classify[ 0 ][ 0 ] );
        }
    }
    return classifiableWSOList;
};

/**
 *  Get object uid  to find classification information
 *  @param {Object} data - view model data
 *  @param {Object} ctx - Application context data
 *  @return {Object} uid -uid of workspace object
 */
export let getWorkspaceObjectUid = function( data, ctx ) {
    var uid = null;
    if( ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) {
        if( data && data.targetObjectForSelection[ 0 ] && data.targetObjectForSelection[ 0 ].props && data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject && data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject.dbValues[ '0' ] ) {
            uid = [
                { uid: data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject.dbValues[ '0' ] }
            ];
        }
    }else if( ctx && ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'BranchVersioningSubLocation' && data && data.targetObjectForSelection[ 0 ] && data.targetObjectForSelection[ 0 ].type === 'Bhv1VersionObjectNode' 
        && data.targetObjectForSelection[ 0 ].props && data.targetObjectForSelection[ 0 ].props.bhv1OwningObject && data.targetObjectForSelection[ 0 ].props.bhv1OwningObject.dbValues[ '0' ] ) {
        uid = [
            { uid: data.targetObjectForSelection[ 0 ].props.bhv1OwningObject.dbValues[ '0' ] }
        ];
    } else {
        uid = [ {
            uid: data.targetObjectForSelection[ 0 ].uid
        } ];
    }
    return uid;
};

/**
 * Gets the used up amount of the screen, in pixels, by other objects.
 *
 * @param {Object} conditions - different traits of what is present on teh screen
 * @param {Object} imageSection - whether or not this function is being used to size an image.
 * @return {Object-Array} the formatted properties array
 */
export let findContHeight = function( conditions, imageSection ) {
    var customClass;
    var labelAdj = conditions.label ? 40 : 0;
    var showObjAdj = conditions.showObject ? 20 : 0;
    var searchResultsAdj = conditions.searchResults ? 40 : 0;
    if ( conditions.suggClasses ) {
        if ( conditions.createOrEdit ) {
            var suggSelAdj = conditions.suggSelected ? 20 : 0;
            var suggSelExpAdj = conditions.suggSectionCollapse ? 20 : 240 + suggSelAdj;
            var baseSuggAdj = ( conditions.showObject || conditions.clsFS ? 140 : 200 ) + suggSelExpAdj;
            baseSuggAdj = conditions.suggSectionCollapse ? baseSuggAdj  : baseSuggAdj - suggSelAdj;
            if ( conditions.clsFS ) {
                // customClass = conditions.suggSelected ? baseSuggAdj - suggSelExpAdj : baseSuggAdj - 20;
                customClass = baseSuggAdj - 20;
                customClass += searchResultsAdj;
            } else {
                labelAdj = 40;
                customClass = baseSuggAdj + showObjAdj + labelAdj - searchResultsAdj;
            }
        } else {
            if ( conditions.clsFS ) {
                if ( conditions.viewOrEdit && imageSection ) {
                    customClass = 160 - showObjAdj + labelAdj;
                } else if ( conditions.createOrEdit ) {
                    labelAdj = 40;
                    customClass = 200 + showObjAdj + labelAdj;
                }
            } else {
                labelAdj = 40;
                customClass = 160 - showObjAdj + labelAdj - searchResultsAdj;
            }
        }
    } else {
        labelAdj = 40;
        if ( conditions.clsFS ) {
            var location = conditions.showClassification ? 80 : 40;
            if ( conditions.viewOrEdit && imageSection ) {
                customClass = location + showObjAdj + labelAdj;
            } else if ( conditions.createOrEdit ) {
                customClass = location + labelAdj;
            }
        } else {
            customClass = 160 - showObjAdj + labelAdj - searchResultsAdj;
        }
    }

    return customClass;
};

/**
 *  Get object uid  to find classification information
 *  @param {Object} data - view model data
 *  @param {Object} ctx - Application context data
 *  @return {Object} uid -uid of workspace object
 */
export let getWorkspaceObjectUidFromCtxSelected = function( data, ctx ) {
    var uid = null;
    if( ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) {
        if( ctx && ctx.selected && ctx.selected.props && ctx.selected.props.awb0UnderlyingObject && ctx.selected.props.awb0UnderlyingObject.dbValues[ '0' ] ) {
            uid = [
                { uid: ctx.selected.props.awb0UnderlyingObject.dbValues[ '0' ] }
            ];
        }
    }else if( ctx && ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'BranchVersioningSubLocation' && ctx.selected && ctx.selected.type === 'Bhv1VersionObjectNode'
         && ctx.selected.props && ctx.selected.props.bhv1OwningObject && ctx.selected.props.bhv1OwningObject.dbValues[ '0' ] ) {
        uid = [
            { uid: ctx.selected.props.bhv1OwningObject.dbValues[ '0' ] }
        ];
    } else {
        if ( !ctx.selected.uid && ctx.mselected[ 0 ].uid ) {
            ctx.selected = ctx.mselected[ 0 ];
        }
        uid = [ {
            uid: ctx.selected.uid
        } ];
    }
    return uid;
};

/**
 * Method determines whether selected WSO is classifiable or not by iterating through data.classifiableWSOList
 * @param {Object} selected  selected object
 * @param {Object} data the declarative viewmodel data
 * @param {Object} ctx  Application context
 */
export let toggleView = function( selected, data, ctx ) {
    ctx.clsTab = ctx.clsTab || {};
    ctx.clsTab.isClassify = false;
    data.isClassify = false;
    var object;

    //Setting view mode
    data.panelMode = -1;

    //Setting target object for selection
    classifySvc.setTargetObjectForSelection( selected, data );

    for( var i = 0; i < data.classifiableWSOList.length; i++ ) {
        if( ctx && ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' && ctx.selected && ctx.selected.props
            && ctx.selected.props.awb0UnderlyingObject && ctx.selected.props.awb0UnderlyingObject.dbValues[ '0' ] ) {
                object = clientDataModelSvc.getObject( ctx.selected.props.awb0UnderlyingObject.dbValues[ '0' ] );
        }
        if( ctx && ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'BranchVersioningSubLocation' && ctx.selected && ctx.selected.type === 'Bhv1VersionObjectNode'
             && ctx.selected.props && ctx.selected.props.bhv1OwningObject && ctx.selected.props.bhv1OwningObject.dbValues[ '0' ] ) {
                 object = clientDataModelSvc.getObject( ctx.selected.props.bhv1OwningObject.dbValues[ '0' ] );
        }
        if( object && data.classifiableWSOList[ i ].uid === object.uid || data.classifiableWSOList[ i ].uid === selected.uid ) {
            data.isClassify = true;
            ctx.clsTab.isClassify = data.isClassify;
            // Cleanup any standalone related variables.
            classifySvc.cleanupStandaloneData( data );
            data.supportedRelease = classifyUtils.checkIfSupportedTcVersion( TcServerVersion.majorVersion,
                TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

            //Set the target for classify operations
            classifySvc.setTargetObjectForSelection( selected, data );
            return;
        }
    }
};

/**
 * Fires the event to navigate to the 'Create' classification sub-panel
 *
 * @param {Object} data - The viewmodel's data object.
 */
export let setCreateMode = function( data ) {
    initialConvertCount = 1;
    if( data.isClassify === false ) {
        return;
    }
    appCtxSvc.updateCtx( 'pasteIsClicked', false );
    data.pasteIsClicked = false;
    data.suggestedSectionCollapse = false;
    appCtxSvc.ctx.clsTab.collapseSuggested = false;

    if( data.panelMode === 0 ) {
        // classifySvc.clearClassBreadCrumb( data );
        clsTreeSvc.clearClassBreadCrumb( data, appCtxSvc.ctx.clsTab );
        classifySvc.setViewMode( data );
    } else {
        exports.resetScope( data, appCtxSvc.ctx );
        clsTreeSvc.clearClassBreadCrumb( data, appCtxSvc.ctx.clsTab );
        // clear search results in case of previous search in edit or create
        classifySvc.clearSearchBox( data );
        exports.revealCreate( data );
        data.isNavigating = false;
        data.panelMode = 0;
    }
};

/**
 * Fires the event to navigate to the 'Create' classification sub-panel for standalone case
 * @param {Object} data the declarative viewmodel data
 *
 */
export let setCreateModeForStandalone = function( data ) {
    data.isNavigating = false;
    data.panelMode = 0;
    data.createForStandalone = true;
    // classifySvc.clearClassBreadCrumb( data );
    clsTreeSvc.clearClassBreadCrumb( data, appCtxSvc.ctx.clsTab );
    exports.revealCreate( data );
};

/**
 * Update cell tooltips
 * @param {ObjectArray} cellProps
 * @param {ObjectArray} propValues
 */
function updateCellProps( cellProps, propValues ) {
    if( propValues && typeof propValues === 'object' ) {
        _.forEach( cellProps, function( prop ) {
            if( prop.key === 'Date Modified' ) {
                var lastModifiedDate = classifySvc.getPropertyValue( propValues.properties, classifySvc.UNCT_MODIFY_DATE );
                if( lastModifiedDate ) {
                    lastModifiedDate = classifyUtils.convertClsDateToAWTileDateFormat( lastModifiedDate );
                }
                prop.value = lastModifiedDate.displayValue;
            }
            if( prop.key === 'Modified User' ) {
                var lastModifiedUser = classifySvc.getPropertyValue( propValues.properties, classifySvc.UNCT_MODIFY_USER );
                prop.value = lastModifiedUser;
            }
        } );
    }
}

/*
 * Generates the cells to be displayed in 'View' mode
 *
 * @param {Object} response - the SOA response
 */
export let generateCells = function( response ) {
    var cells = [];

    appCtxSvc.registerCtx( 'ICO_response', response );

    if( response && response.clsObjectDefs && !_.isEmpty( response ) ) {
        if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ] ) ) {
            if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] ) ) {
                if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject ) ) {
                    if( response.clsObjectDefs[ 1 ][ 0 ] && response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] && response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject ) {
                        if( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject.uid === 'AAAAAAAAAAAAAA' ) {
                            //Standalone ICO exists; pop up connect message

                            appCtxSvc.registerCtx( 'standaloneIco', response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] );
                            appCtxSvc.registerCtx( 'clsClassDescriptors', response.clsClassDescriptors );

                            appCtxSvc.registerCtx( 'standaloneExists', true );
                        }
                    }
                }
            }
        }

        var classDefResponse = response.clsClassDescriptors;

        _.forEach( response.clsObjectDefs[ 1 ][ 0 ].clsObjects, function( clsObj ) {
            var classId = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_CLASS_ID );
            // Also store parentIds to be used in case of edit class. We need to expand the hierarchy upto the classified class while reclassifying.
            var parentIds = [];
            var parents = classifySvc.getParentsPath( response.classParents[ classId ].parents, parentIds );
            var currentClassName = classifySvc.getPropertyValue( classDefResponse[ classId ].properties,
                classifySvc.UNCT_CLASS_NAME );

            var iconAvailable = false;
            var iconPosition = -1;
            var ticket = {};
            if( classDefResponse && classDefResponse[ classId ] &&
                classDefResponse[ classId ].documents ) {
                var documents = classDefResponse[ classId ].documents;
                var iconindex = 0;
                _.forEach( documents, function( document ) {
                    if( document.documentType === 'icon' ) {
                        iconPosition = iconindex;
                    }
                    iconindex++;
                } );
            }
            if( iconPosition !== -1 ) {
                ticket = classDefResponse[ classId ].documents[ iconPosition ].ticket;
            } else {
                // Get the class icon for the ICO's class.
                if( classDefResponse && classDefResponse[ classId ] &&
                    classDefResponse[ classId ].documents &&
                    classDefResponse[ classId ].documents[ 0 ] ) {
                    ticket = classDefResponse[ classId ].documents[ 0 ].ticket;
                }
            }

            if( ticket && classifyUtils.isSupportedImageType( ticket ) ) {
                iconAvailable = true;
            }

            if( iconAvailable === true ) {
                var imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
            } else {
                // If the class doesn't have an image, then display the 'default' icon.
                // Since we are not a real VMO, we can't use the type icon mechanism directly.
                var classifyIconName = 'typeClassificationElement48.svg';
                imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
            }

            var lastModifiedDate = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_MODIFY_DATE );
            if( lastModifiedDate ) {
                lastModifiedDate = classifyUtils.convertClsDateToAWTileDateFormat( lastModifiedDate );
            }

            var cell = {};
            cell.cellHeader1 = currentClassName;
            cell.cellInternalHeader1 = classId;

            parentIds.push( {
                id: classId,
                className: currentClassName
            } );
            cell.parentIds = parentIds;
            cell.typeIconFileUrl = [];

            if( imageIconUrl ) {
                // cell.typeIconFileUrl.push( imageIconUrl );
                cell.thumbnailURL = imageIconUrl;
                cell.hasThumbnail = true;
            }
            //add classname in path separately to make it bold on tooltip
            if( lastModifiedDate && parents ) {
                var props = [];
                var owningUser = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_OWNING_USER );
                if( owningUser ) {
                    props.push( {
                        key: 'Owning User',
                        value: owningUser
                    } );
                }
                var lastModifiedUser = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_MODIFY_USER );
                if( lastModifiedUser ) {
                    props.push( {
                        key: 'Modified User',
                        value: lastModifiedUser
                    } );
                }
                props.push( {
                    key: 'Date Modified',
                    value: lastModifiedDate.displayValue
                } );
                props.push( {
                    key: 'Path',
                    value: parents.join( ' > ' ) + ' > ',
                    value1: currentClassName
                } );
                cell.cellExtendedTooltipProps = props;
            }
            cell.cellExtendedProperties = classifySvc.parseClsProperties( clsObj.properties );
            cell.icoUid = clsObj.clsObject.uid;
            cell.documents = classDefResponse[ classId ].documents;
            cells.push( cell );
        } );
    }

    var ctx = appCtxSvc.getCtx( 'clsTabGlobal' );
    if ( !ctx ) {
        var ctx = {};
        ctx.classifyShowImages = true;
        ctx.classifyShowPropGroups = true;
        appCtxSvc.registerCtx( 'clsTabGlobal', ctx );
    }
    return cells;
};

/**
 * Parses the search string before sending to the server.
 *
 * @param {String} searchStr The search string to be parsed.
 *
 * @return {ObjectArray} An object to be used in the SOA request.
 */
export let parseSearchString = function( searchStr ) {
    // Use the common function from classifyService
    return classifySvc.parseSearchString( searchStr );
};

/**
 * Formats the search results for showing them in VNCs.
 *
 * @param {Object} data The search string to be parsed.
 * @param {Object} response  the response from the classification search SOA
 * @param {Object} ctx  Context object from application context
 */
export let formatSearchResultsForVNC = function( data, response, ctx ) {
    var searchResults = exports.formatSearchResults( response );
    // After getting the formatted search results also show the search results in flat VNC hierarchy.
    ctx.currentLevel = {
        children: searchResults
    };
    // This would change initialHierarchy to search VNCs(Useful in case of deselection activity)
    ctx.initialHierarchy = ctx.currentLevel;
    // Remove the cached event data
    if( data.eventData && data.eventData.response ) {
        delete data.eventData.response;
    }
};

/**
 * Private function
 * Appends name to SOA request
 * @param {*} temp vnc tile props
 * @param {*} props properties
 * @param {*} i index
 * @param {*} ctx context
 */
function appendNames( name, props ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    if ( ctx && ctx.releases && ctx.releases.selected  ) {
        var selected = 0;
        _.forEach( ctx.releases.selected, function( release ) {
            if ( release.selected === 'true' ) {
                selected++;
            }
        } );
        if ( selected !== 1 ) {
            var standard = classifySvc.getPropertyValue( props, 'SOURCE_STANDARD' );
            if ( standard && standard !== '' ) {
                var displayName = classifySvc.getReleaseDisplayName( ctx, standard );
                name += ' ( ' + displayName + ' )';
            }
        }
    }
    return name;
}

/**
 * converts the search results into viewmodel properties.
 *
 * @param {Object} response  the response from the classification search SOA
 *
 * @return {ObjectArray} the array of view model properties
 */
export let formatSearchResults = function( response ) {
    var searchResults = [];
    _.forEach( response.clsClassDescriptors,
        function( searchResult ) {
            var className = classifySvc.getPropertyValue( searchResult.properties, classifySvc.UNCT_CLASS_NAME );
            var classId = classifySvc.getPropertyValue( searchResult.properties, classifySvc.UNCT_CLASS_ID );
            var parents = classifySvc.getParentsPath( response.classParents[ classId ].parents );
            className = appendNames( className, searchResult.properties );
            // TBD - Check if getChildren or parseIndividualClassDescription can be used here
            //Icon Handling
            var iconAvailable = false;
            var iconPosition = -1;
            var documents = searchResult.documents;
            var iconindex = 0;
            _.forEach( documents, function( document ) {
                if( document.documentType === 'icon' ) {
                    iconPosition = iconindex;
                }
                iconindex++;
            } );
            var ticket = {};
            if( iconPosition !== -1 ) {
                ticket = searchResult.documents[ iconPosition ].ticket;
            } else {
                // Get the class icon for the ICO's class.
                if( searchResult.documents && searchResult.documents[ 0 ] ) {
                    ticket = searchResult.documents[ 0 ].ticket;
                }
            }
            if( ticket && classifyUtils.isSupportedImageType( ticket ) ) {
                iconAvailable = true;
            }
            var imageIconUrl;
            if( iconAvailable === true ) {
                imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
            } else {
                // If the class doesn't have an image, then display the 'default' icon.
                // Since we are not a real VMO, we can't use the type icon mechanism directly.
                var classifyIconName = 'typeClassificationElement48.svg';
                imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
            }

            parents.push( className );
            var tempParentsPath = parents.join( '/' );
            var vmProperty = uwPropertyService.createViewModelProperty( tempParentsPath, className, 'STRING', '',
                '' );
            vmProperty.classData = searchResult;
            vmProperty.classId = classId;
            vmProperty.id = classId;
            vmProperty.className = className;
            vmProperty.typeIconFileUrl = [];
            vmProperty.iconAvailable = iconAvailable;
            vmProperty.classDescription = classifySvc.getPropertyValue( searchResult.properties, classifySvc.UNCT_CLASS_DESCRIPTION );
            //Attach Image Ticket
            if( imageIconUrl ) {
                vmProperty.typeIconFileUrl.push( imageIconUrl );
            }
            searchResults.push( vmProperty );
        } );

    return searchResults;
};

export let resetPropertiesSection = function( data ) {
    // Clear properties related data
    data.attributesVisible = false;
    data.attr_anno = null;
    data.prop_anno = null;
    //set has blocks flag to false, used for Prop Group Tree
    data.hasBlocks = false;
    data.isFiltered = false;
};

export let resetImagesSection = function( data ) {
    // Clear images related data
    data.datasetFilesOutput = null;
    data.clsImgAvailable = false;
    data.totalNoOfImages = 0;
    data.viewerData = null;
    data.index = 0;
    data.viewDataArray = null;
    data.imageURLs = null;
};

/**
 * Resets information related to properties and images section
 *
 * @param {*} data {Object} the declarative viewmodel data
 */
export let resetPropertiesImagesSection = function( data ) {
    exports.resetPropertiesSection( data );
    exports.resetImagesSection( data );
};

export let clearAllProperties = function( data ) {
    try {
        data.clearProperties = true;
        classifySvc.clearAttributes( data );
    } finally {
        data.clearProperties = false;
    }
    filterProperties( data );
};

/**
 * Displays only the required attributes and hides the other attributes.
 * @param {*} data contains all the attributes that needs to be displayed
 */
export let showMandatoryProperties = function( data ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );

    ctx.displayOnlyMandatoryAttr = !ctx.displayOnlyMandatoryAttr;
    filterProperties( data );

    appCtxSvc.updateCtx( 'clsTab', ctx );
};


/*
 * Handles show/hide command
 */
export let clearAllProps = function() {
    eventBus.publish( 'classify.clearAllProps' );
};

/**
 * Displays only the mandatory properties.
 *
 *
 * @function mandatoryFields
 * @memberOf classifyFullViewModeService
 */
export let mandatoryFields = function() {
    eventBus.publish( 'classify.showMandatoryProps' );
};

/*
 * Expands all the attributes when the Expand==>Expand All
 * command is clicked
 *
 * @param {*} data {Object} the declarative viewmodel data
 */
export let expandAll = function( data ) {
    var nodes = data.filteredAttr_anno;
    if( nodes ) {
        expandcollapseAll( nodes, true );
    }else{
        expandcollapseAll( data, true );
    }
};


/*
 * Collapses all the attributes when the Expand==>Collapse All
 * command is clicked
 *
 * @param {*} data {Object} the declarative viewmodel data
 */
export let collapseAll = function( data ) {
    var nodes = data.filteredAttr_anno;
    if( nodes ) {
        expandcollapseAll( nodes, false );
    }else{
        expandcollapseAll( data, false );
    }
};

/*
 * Sets the node.propExpanded to true/false based on whether
 * the expand/collapse command is clicked
 *
 */
export let expandcollapseAll = function( nodes, value ) {
    if( nodes ) {
        if( Array.isArray( nodes ) ) {
            nodes.forEach( function( node ) {
                attributeBlockExpandCollapse( node, value );
            } );
        }else{
            attributeBlockExpandCollapse( nodes, value );
        }
    }
};

/*
 * Expands and collapses the child attributes of the block
 *
 * @param {*} nodes {Object} the existing classes block information
 * @param {*} value {Object} set it to true/false
 */
export let attributeBlockExpandCollapse = function( nodes, value ) {
    nodes.propExpanded = value;
    if( nodes.instances ) {
        expandcollapseAll( nodes.instances, value );
    }
    if( nodes.children ) {
        expandcollapseAll( nodes.children, value );
    }
};

/**
 *  Performs a event call to expandAll
 */
export let expandAllCmd = function() {
    eventBus.publish( 'classify.expandAllCmd' );
};


/**
 *  Performs a event call to collapseAll
 */
export let collapseAllCmd = function() {
    eventBus.publish( 'classify.collapseAllCmd' );
};


/*
 * gets the attribute data for rendering classification widgets & calls the attribute formatting method.
 *
 * @param {Object} data  the declarative viewmodel data
 * @@param assignVisible {Object} true to show Assign button, false otherwise
 */
export let getAttributes = function( data, assignVisible ) {
    var request;

    data.assignVisible = assignVisible;
    data.caption = data.assignVisible ? data.i18n.propertiesPreview : data.i18n.properties;
    // data.isFiltered = false;

    // If we already have attribute information, do not proceed to get information again
    if( !data.attr_anno ) {
        // it's been used for edit mode and view mode
        if( data.ico && data.ico.classID === data.selectedClass.id ) {
            request = {
                workspaceObjects: [ {
                    uid: data.ico.uid
                } ],
                searchCriterias: [],
                classificationDataOptions: classifySvc.loadStorageAttributes
            };
        } else if( data.pasteIsClicked === true ) {
            request = {
                workspaceObjects: [ {
                    uid: appCtxSvc.getCtx( 'IcoReplica.vmo.icoUid' )
                } ],
                searchCriterias: [],
                classificationDataOptions: classifySvc.loadStorageAttributes
            };
        } else  if( data.classifiableWSOList && data.classifiableWSOList.length > 0 ) {
            var searchCriteria = {};
            searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
            searchCriteria.searchString = data.selectedClass.id;
            searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;
            request = {
                workspaceObjects: [ {
                    uid: data.classifiableWSOList[0].uid
                } ],
                searchCriterias: [ searchCriteria ],
                classificationDataOptions: classifySvc.loadStorageAttributes + 8192
            };
        } else{
            data.caption = data.i18n.propertiesTitle;

            var searchCriteria = {};
            searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
            searchCriteria.searchString = data.selectedClass.id;
            searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;
            request = {
                workspaceObjects: [ ],
                searchCriterias: [ searchCriteria ],
                classificationDataOptions: classifySvc.loadStorageAttributes
            };
        }

        if( suggestedClassSelected === true ) {
            request.classificationDataOptions += classifySvc.loadClassSuggestionProperties;
        }

        soaService.post( serviceName, operationName, request ).then(
            function( response ) {
                // get property data if it is returned
                if( response.clsObjectDefs ) {
                    response.clsObjectDefs[ 1 ][ 0 ].clsObjects.forEach( function( clsObjInfo ) {
                        for( var p in clsObjInfo.properties ) {
                            if( clsObjInfo.properties[ p ].propertyId === classifySvc.UNCT_CLASS_ID ) {
                                data.clsObjInfo = clsObjInfo;
                                break;
                            }
                        }
                    }, data );
                }
                if( appCtxSvc.ctx.locationContext && appCtxSvc.ctx.locationContext['ActiveWorkspace:Location'] === 'com.siemens.splm.classificationManagerLocation' ) {
                    exports.formatDataAndResponseForAdmin( response, data );
                } else {
                    exports.formatDataAndResponse( response, data );
                }
            } );
    } else {
        // Change to edit mode

        // Publish event to let the handler know about current state being in Create/Edit mode
        // This event is necessary to correctly handle the behavior where closePanel is called after
        // refresh action happens on secondary work area (See ClassificationCommandHandler).
        eventBus.publish( 'classifyPanel.inCreateOrEditMode', {} );

        data.showAllProp = data.panelMode === 0 ? true : data.showAllProp;
        appCtxSvc.unRegisterCtx( 'classifyShowAll' );
        appCtxSvc.registerCtx( 'classifyShowAll', data.showAllProp );

        exports.getEditableAttributes( data, data.attr_anno );

        var ctx = appCtxSvc.getCtx( 'classifyEdit' );
        if( ctx ) {
            ctx.showSave = !data.editClass;
            appCtxSvc.updateCtx( 'classifyEdit', ctx );
        }

        var cardinalAttr = data.attr_anno ? classifyTblSvc.getCardinalBlock( data.attr_anno ) : null;
        if( cardinalAttr && !cardinalAttr.tableView ) {
            appCtxSvc.unRegisterCtx( 'classifyTableView' );
            data.searchResults = null;
        }
    }
};


/**
 *  Following method processes the findClassificationInfo2 SOA response and make initializations on view model
 * @param {*} response findClassificationInfo2 SOA response
 * @param {*} data Declarative view model
 */
export let formatDataAndResponseForAdmin = function( response, data ) {
    data.classDefinitionMapResponse = response.clsClassDescriptors;
    data.keyLOVDefinitionMapResponse = response.keyLOVDescriptors;
    data.blockDefinitionMapResponse = response.clsBlockDescriptors;
    data.unitMap = response.unitMap;

    data.showAllProp = data.panelMode === 0 ? true : data.showAllProp;
    appCtxSvc.unRegisterCtx( 'classifyShowAll' );
    appCtxSvc.registerCtx( 'classifyShowAll', data.showAllProp );
    if( data.classDefinitionMapResponse ) {
        exports.formatAttributesForAdmin( data );
    }
};

/**
 *  Following method processes the findClassificationInfo2 SOA response and make initializations on view model
 * @param {*} response findClassificationInfo2 SOA response
 * @param {*} data Declarative view model
 */
export let formatDataAndResponse = function( response, data ) {
    // Contains list of class IDs and ClassDef info
    data.classDefinitionMapResponse = response.clsClassDescriptors;
    // Contains attributeDefinitionMap and configuredKeyLOVDefinitionMap
    // List of KeyLOV ID, and KeyLOV definition ( KeyLOVDefinition2 )
    data.keyLOVDefinitionMapResponse = response.keyLOVDescriptors;
    data.blockDefinitionMapResponse = response.clsBlockDescriptors;
    data.unitMap = response.unitMap;
    if( data.classDefinitionMapResponse === undefined && data.keyLOVDefinitionMapResponse === undefined &&
        data.blockDefinitionMapResponse === undefined && response.clsObjectDefs === undefined ) {
        if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true && appCtxSvc.getCtx( 'pasteInProgress' ) === true ) {
            eventBus.publish( 'classifyPanel.deletePasteMessage', {} );
        }
    }
    if( response.clsObjectDefs ) {
        data.clsObjInfo = response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ];
        _.forEach( response.clsObjectDefs[ 1 ][ 0 ].clsObjects, function( clsObject ) {
            if( classifySvc.getPropertyValue( clsObject.properties, classifySvc.UNCT_CLASS_ID ) === data.selectedClass.id && clsObject.clsObject.uid === data.selectedClass.uid ) {
                data.clsObjInfo = clsObject;
            }
        } );
    } else {
        data.clsObjInfo = null;
    }

    // Will be using ctx.clsTab.parents instead of
    appCtxSvc.ctx.clsTab.parents = classifySvc.parseClassDescriptions( response, data.selectedClass.id );
    clsTreeSvc.updateClassBreadCrumb( data, appCtxSvc.ctx.clsTab );

    // Process image panel only if the image dataset is available
    data.expandImagesPanel = false;
    data.clsImgAvailable = false;

    if( data.pasteIsClicked === true ) {
        data.datasetFilesOutput = appCtxSvc.getCtx( 'IcoReplica.vmo.documents' );
    } else if( data.classDefinitionMapResponse && data.classDefinitionMapResponse[ data.selectedClass.id ].documents &&
        !data.classDefinitionMapResponse[ data.selectedClass.id ].documents.isEmpty ) {
        data.datasetFilesOutput = data.classDefinitionMapResponse[ data.selectedClass.id ].documents;
    }
    if( data.classDefinitionMapResponse && appCtxSvc.getCtx( 'pasteIsClicked' ) !== true ) {
        exports.formatImageAttachments( data );
    }

    // Publish event to let the handler know about current state being in Create/Edit mode
    // This event is necessary to correctly handle the behavior where closePanel is called after
    // refresh action happens on secondary work area (See ClassificationCommandHandler).
    eventBus.publish( 'classifyPanel.inCreateOrEditMode', {} );

    data.showAllProp = data.panelMode === 0 ? true : data.showAllProp;
    appCtxSvc.unRegisterCtx( 'classifyShowAll' );
    appCtxSvc.registerCtx( 'classifyShowAll', data.showAllProp );
    if( data.classDefinitionMapResponse ) {
        exports.formatAttributes( data );
    }

    var ctx = appCtxSvc.getCtx( 'classifyEdit' );
    if( ctx ) {
        ctx.showSave = !data.editClass;
        appCtxSvc.updateCtx( 'classifyEdit', ctx );
    }

    var cardinalAttr = data.attr_anno ? classifyTblSvc.getCardinalBlock( data.attr_anno ) : null;
    if( cardinalAttr && !cardinalAttr.tableView ) {
        //check if it was in table view. If so, continue
        var ctx1 = appCtxSvc.getCtx( 'classifyTableView' );
        if( ctx1 && ctx1.attribute.blockId === cardinalAttr.blockId ) {
            data.searchResults = null;
            ctx1.noReload = false;
            ctx1.attribute = cardinalAttr;
            ctx1.attribute.tableView = true;
            appCtxSvc.updateCtx( 'classifyTableView', ctx1 );
        } else {
            appCtxSvc.unRegisterCtx( 'classifyTableView' );
            data.searchResults = null;
        }
    }
    if( data.attr_anno && appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
        data.panelMode = 1;
        data.attributesVisible = false;
        data.clsImageAvailable = false;
        appCtxSvc.updateCtx( 'pasteIsClicked', false );
        exports.saveExit();
    }
};

/**
 * Sets the create mode variables necessary for navigating/showing CreateFullView hierarchy and breadcrumb
 *
 * @param {Object} data  the declarative viewmodel data
 */
export let setCreateModeVariables = function( data ) {
    // Since "step ensures no cell is selected" fires some events, these variables are reset.
    // Need to set them again
    // Hence setting the variables again
    appCtxSvc.ctx.clsTab.navigateToCreateMode = false;
    // data.initialHierarchy = data.children;
    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;
    data.attributesVisible = false;
    data.panelMode = 0;
    data.parents = [];
    appCtxSvc.ctx.clsTab.parents = [];
    data.selectedCell = null;
    data.selectedClass = null;
};
/**
 * Loads the hierarchy when the create panel is revealed
 *
 * @param {Object} data  the declarative viewmodel data
 */
export let revealCreate = function( data ) {
    if( data.panelMode && data.panelMode === 1 && data.createForStandalone !== true ) {
        return;
    }

    // If last/only classification is just deleted, we need to reset data.ico
    // Also, during standalone processing, if the user selected 'create new', the data.ico needs to be reset
    if( data.standaloneObjectExists !== true ||
        data.standaloneObjectExists === true && data.createForStandalone === true ) {
        // Reset properties and image section contents
        data.ico = null;
    }

    data.attr_anno = null;
    data.imageURLs = null;
    data.viewerData = null;
    data.clsImgAvailable = false;

    /* Problems and the workarounds:
    1. If selectedObjectsLength >= 1, "selectNone" after a while fires performSearch.selectionChangeEvent
       In turn processCellSelection gets called which sets the panelMode = -1 (View mode). Thus setCreateModeVariables needs to be called as we need to navigate to create mode
       If there is no ICO selected, selectionChangeEvent is not fired.
    2. There is an issue of simultaneously having ICO and tree selections in the SWA(Only one selection persists in SWA. This is a defined behavior from framework)
       This causes tree to abruptly go into view mode from editClass.(when tree sync happens, aw-xrt-2 removes the lastSelection which is currently selected ICO.
            Now, since the ICO is deselected, performSearch.selectionChangeEvent gets fired which makes the user to go from edit mode to view mode abruptly)
       Removed below workaround
            Workaround: If user is in create/edit mode and performSearch.selectionChangeEvent gets fired, it will show user a message regarding possible navigation to view mode.
       User can choose to navigate to view mode or stay in the current state.
       Now, in create mode according to #1, performSearch.selectionChangeEvent event gets fired.
       Thus to prevent the message from coming at the start of create mode set ctx.clsTab.noViewNavMsg if performSearch.selectionChangeEvent won't get fired.
       This variable is getting changed in view model before showing the navigation message.

       Instead added fix:
        Before entering in the edit class/create mode, any selected ICO is deselected. Thus not causing the issue #2
    */
    var dpSearch = data && data.dataProviders && data.dataProviders.performSearch ? data && data.dataProviders && data.dataProviders.performSearch : null;
    var noICOSelected = dpSearch && dpSearch.selectedObjects.length <= 0;
    if( data && data.dataProviders && data.dataProviders.performSearch ) {
        //Following step ensures no cell is selected.
        data.dataProviders.performSearch.selectNone();
    }
    if( data.standaloneObjectExists && !data.createForStandalone ) {
        data.hierarchyVisible = true;
        data.hierarchyExpanded = true;
    } else {
        if( noICOSelected ) {
            // Publish the event directly as performSearch.selectionChangeEvent won't get fired.
            eventBus.publish( 'classifyTab.setCreateModeVariables', data );
            delete data.localPropertyValues;
        } else {
            appCtxSvc.ctx.clsTab.navigateToCreateMode = true;
            if ( dpSearch ) {
                // Once tree is loaded, it should be expanded upto toBeExpandedClass with hierarchy parentIds
                if( typeof data.selectedCell === 'object' ) {
                    data.treeInTab = data.treeInTab || {};
                    data.treeInTab.performClassExpansion = {
                        toBeExpandedClass: {
                            id: data.selectedCell.cellInternalHeader1,
                            className: data.selectedCell.cellHeader1
                        },
                        parentIds: _.clone( data.selectedCell.parentIds )
                    };
                    // Set this variable so that tree service would not use past data available in dataProvider
                    data.initialTreeLoad = true;

                    var lastIndex = 0;
                    for( var index = 0; index < data.clsObjInfo.properties.length; index++ ) {
                        var prop = data.clsObjInfo.properties[index];
                        var temp = Number( prop.propertyId );
                        if( Number.isInteger( temp ) ) {
                            lastIndex = index;
                            break;
                        }
                    }


                    data.localPropertyValues = {
                        properties: data.clsObjInfo.properties.slice(
                            lastIndex, data.clsObjInfo.properties.length ),
                        blockDataMap: data.clsObjInfo.blockDataMap
                    };
                }
            }
        }
    }
};

/**
 * Code related to AI in classification
 * Loads the suggestedClasses into data.suggestedClasses. Their parents in data.suggestedClassesParents.
 * @param {Object} data  the declarative viewmodel data
 * @param {Object} treeInTab Values to be passed on from tree
 */
export let loadSuggestions = function( data, treeInTab) {
    if( typeof treeInTab === 'object' && typeof treeInTab.firstLevelResponse === 'object' ) {
        data.suggestedClasses = exports.getSuggestedClasses( treeInTab.firstLevelResponse, data );
        data.suggestedClassesParents = {};

        // For each suggested class, get it's hierarchy and save it in suggestedClassesParents and classInfo.path.
        data.suggestedClasses.forEach( function( classInfo ) {
            data.suggestedClassesParents[ classInfo.id ] = classifySvc.parseClassDescriptions( treeInTab.firstLevelResponse, classInfo.id );
            var parents = [];
            data.suggestedClassesParents[ classInfo.id ].forEach( function( parentItem ) {
                parents.push( parentItem.className );
            } );
            classInfo.classPath = parents.join( ' > ' );
        } );

        // Resetting for handling thumbnail navigation for suggested classes.
        data.suggestedRibbonIncr = 0;
        // Remove the cached first level response
        delete data.treeInTab.firstLevelResponse;
    }
};



/**
 * Suggestions collapsible panel is loaded, now expand it.
 * @param {Object} data  the declarative viewmodel data
 * @param {Object} ctx context where the classification table for the suggested panel section to be expanded is located.
 */
export let initSuggestionsPanel = function( data, ctx ) {
    if(data.suggestedClasses && data.suggestedClasses.length >= 1){
        data.suggestedSectionCollapse = false;
        if(ctx.clsTab){
            ctx.clsTab.collapseSuggested = false;
            appCtxSvc.updateCtx('clsTab', ctx.clsTab);
        }
    }
};

/**
 * Returns all the suggested classes.
 * @param {Object} response response from the findClassificationInfo SOA
 * @param {Object} data  the declarative viewmodel data
 * @returns {ObjectArray} The array of all suggested class objects
 */
export let getSuggestedClasses = function( response, data ) {
    var suggetedClasses = [];

    if( response && response.clsClassDescriptors ) {
        var existingClassifications = [];
        if( data.icoCells && data.icoCells.constructor === Array ) {
            existingClassifications = data.icoCells.map( function( item ) {
                return item.cellInternalHeader1;
            } );
        }
        _.forEach( response.clsClassDescriptors, function( child ) {
            var classObj = classifySvc.parseIndividualClassDescriptor( child, true );
            if( classObj.id !== 'ICM' && classObj.classProbability >= 1 && existingClassifications.indexOf( classObj.id ) === -1 ) {
                // It's a suggested class only if probability is available and this object is not already classified to this class.
                // While adding do the sorting on classProbability
                var index = suggetedClasses.length - 1;
                for( ; index >= 0; index-- ) {
                    if( suggetedClasses[ index ].classProbability < classObj.classProbability ) {
                        suggetedClasses[ index + 1 ] = suggetedClasses[ index ];
                    } else {
                        break;
                    }
                }
                suggetedClasses[ index + 1 ] = classObj;
            }
        } );
    }
    return suggetedClasses;
};

/**
 * Navigates in the hierarchy-navigation to a suggested class which user has clicked
 * Should show the property preview on navigation
 * @param {Object} data the declarative viewmodel data
 * @param {Object} selectedNode Class selected by user
 */
export let navigateToSuggestedClass = function( data, selectedNode ) {
    suggestedClassSelected = true;
    data.selectedClass = selectedNode;
    data.suggestedClassSelected = true;
    data.suggestedSectionCollapse = true;
    appCtxSvc.ctx.clsTab.collapseSuggested = data.suggestedClassSelected;
    appCtxSvc.ctx.clsTab.parents = _.clone( data.suggestedClassesParents[ data.selectedClass.id ] );
    /**
     * data.treeInTab.performClassExpansion is used to expand the tree upto the toBeExpandedClass using hierarchy given in parentIds
     */
    data.treeInTab = data.treeInTab || {};
    data.treeInTab.performClassExpansion = {
        toBeExpandedClass: data.selectedClass,
        parentIds: appCtxSvc.ctx.clsTab.parents
    };
    eventBus.publish( 'tabGetClassTableSummary.performClassExpansion' );
};

/**
 * Resets the hierarchy within the classification panel back to default
 *
 * @param {Object} data  the declarative viewmodel data
 */
export let resetHierarchy = function( data ) {
    //Reset properties and image section contents
    data.attr_anno = null;
    data.imageURLs = null;
    data.viewerData = null;
    data.clsImgAvailable = false;
    // data.selectedClass = null;

    //set has blocks flag to false, used for Prop Group Tree
    data.hasBlocks = false;
    data.isFiltered = false;

    // classifySvc.clearClassBreadCrumb( data );
    clsTreeSvc.clearClassBreadCrumb( data, appCtxSvc.ctx.clsTab );

    // Clear the searchBox
    classifySvc.clearSearchBox( data );
    // Remove the selection from the tree. This should handle all other things.
    data.dataProviders.tabGetClassTableSummary.selectionModel.selectNone();
    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;
    data.attributesVisible = false;
    data.parents = [];
    appCtxSvc.ctx.clsTab.parents = [];
    var ctx = appCtxSvc.getCtx( 'classifyEdit' );
    if( ctx ) {
        ctx.showSave = false;
        appCtxSvc.updateCtx( 'classifyEdit', ctx );
    }
    eventBus.publish( data.tableSummaryDataProviderName + '.dataProvider.reset' );
};

/* Handle paste clicked action
 *
 * @param {Object} data - view model data
 *
 */
export let pasteIsClicked = function( data ) {
    appCtxSvc.registerCtx( 'pasteIsClicked', true );
    appCtxSvc.registerCtx( 'pasteInProgress', true );
    data.pasteIsClicked = true;
    data.selectedClass = null;
    data.hierarchyExpanded = false;
    appCtxSvc.updateCtx( 'notifyMessage', false );
    exports.processPaste( data );
    return true;
};

/* Handle paste clicked action
 *
 * @param {Object} data - view model data
 *
 */
export let pasteClicked = function( data ) {
    eventBus.publish( 'classify.processPaste' );
};

/* Process paste action and sets selected class to pasted object
 *
 * @param {Object} data - view model data
 */
export let processPaste = function( data ) {
    appCtxSvc.unRegisterCtx( 'classifyTableView' );
    initialConvertCount = 1;
    data.attr_anno = null;
    data.isFiltered = false;
    data.imageURLs = null;
    data.viewerData = null;
    data.selectedCell = null;
    data.ico = null;
    data.selectedClass = {
        id: appCtxSvc.getCtx( 'IcoReplica.vmo.cellInternalHeader1' ),
        className: appCtxSvc.getCtx( 'IcoReplica.vmo.cellHeader1' )
    };
    var icoCells = data.icoCells;
    //find which cell is currently selected, and set selectedCell to it
    _.forEach( icoCells, function( icoCell ) {
        //data.selectedCell = icoCell.selected === true ? icoCell : data.selectedCell;
        if( icoCell.selected === true ) {
            icoCell.selected = false;
        }
    } );
    data.icoCells = icoCells;
    exports.getAttributes( data );
};

/* Process edit properties
 *
 * @param {Object} data - view model data
 *
 */
export let processEdit = function( data ) {
    var icoEdit = appCtxSvc.getCtx( 'classifyEdit.vmo' );
    //deselect current selection
    var icoCells = data.icoCells;
    var index1 = _.findIndex( icoCells, function( ico ) {
        return ico.cellInternalHeader1 === data.selectedClass.id;
    } );
    if( index1 !== -1 ) {
        icoCells[ index1 ].selected = false;
    }

    //select new selection
    var index2 = _.findIndex( icoCells, function( ico ) {
        return ico.cellInternalHeader1 === icoEdit.cellInternalHeader1;
    } );
    var selectedIco = icoCells[ index2 ];

    //different object selected
    icoCells[ index2 ].selected = true;
    data.icoCells = icoCells;

    data.selectedClass = {
        id: selectedIco.cellInternalHeader1,
        className: selectedIco.cellHeader1
    };
    data.ico = {
        uid: selectedIco.icoUid,
        classID: selectedIco.cellInternalHeader1
    };
    data.selectedCell = selectedIco;
    data.panelMode = 1;
    // TBD - Confirm if it works
    data.attr_anno = null;
    exports.getAttributes( data );
};

/*
 * Function to retrieve attributes from inputAnnoArray that are editable
 *
 * @param {Object} data  the declarative viewmodel data
 * @param {Array of Objects} annoArray  the input attribute annotation array
 */
export let getEditableAttributes = function( data, annoArray ) {
    _.forEach( annoArray, function( attribute ) {
        var isEditable = exports.isAttributeEditable( data, attribute.id );

        attribute.editable = isEditable;
        attribute.isEditable = isEditable;
        attribute.modifiable = isEditable;

        if( attribute.type === 'Block' ) {
            if( attribute.polymorphicTypeProperty ) {
                uwPropertyService.setIsEditable( attribute.polymorphicTypeProperty.vmos[ 0 ], isEditable );
                if( !attribute.polymorphicTypeProperty.vmos[ 0 ].uiValue ) {
                    attribute.polymorphicTypeProperty.vmos[ 0 ].uiValue = data.i18n.select;
                }
            }
            //If cardinal block
            if( attribute.cardinalController ) {
                exports.getEditableAttributes( data, attribute.children );
                _.forEach( attribute.instances, function( instance ) {
                    exports.getEditableAttributes( data, instance.children );
                    if( instance.polymorphicTypeProperty ) {
                        uwPropertyService.setIsEditable( instance.polymorphicTypeProperty.vmos[ 0 ], isEditable );
                        if( !instance.polymorphicTypeProperty.vmos[ 0 ].uiValue ) {
                            instance.polymorphicTypeProperty.vmos[ 0 ].uiValue = data.i18n.select;
                        }
                    }
                } );
            } else {
                exports.getEditableAttributes( data, attribute.children );
            }
        } else {
            var vmProp = attribute.vmos[ 0 ];
            uwPropertyService.setIsEditable( vmProp, isEditable );
            // Complex Properties
            if ( attribute.vmos.length > NON_COMPLEX_VMO_COUNT ) {
                setComplexEditable( attribute, isEditable );
            }
            if( vmProp.type === 'BOOLEAN' ) {
                vmProp.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
            }
        }
    } );
};

var setComplexEditable = function( attribute, isEditable ) {
    if ( attribute.unitSystem.formatDefinition.formatType >= COMPLEX ) {
        for ( var i = 0; i < attribute.vmos.length; i++ ) {
            if ( i > 2 ) {
                uwPropertyService.setIsEditable( attribute.vmos[ i ], isEditable );
            }
        }
    }
};

/*
 * Function to reset the current state of fullview back to View mode, using cell selection processing
 *
 * @param {Object} data  the declarative viewmodel data
 */
export let resetView = function( data ) {
    if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
        appCtxSvc.updateCtx( 'pasteIsClicked', false );
        data.attr_anno = null;
    }
    classifySvc.setCellProperty( data );
    exports.processCellSelection( data );
};

/**
 * toggles editMode for selected class
 *
 * @param {Object} data  the declarative viewmodel data
 * @param {Object} newCell true if a different cell is selected for edit
 */
export let editMode = function( data, newCell ) {
    initialConvertCount = 0;
    if( data.panelMode === 1 || data.panelMode === 0 ) {
        if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
            appCtxSvc.updateCtx( 'pasteIsClicked', false );
        }
        if( appCtxSvc.getCtx( 'notifyMessage' ) === true ) {
            appCtxSvc.updateCtx( 'notifyMessage', false );
        }
        exports.resetView( data );
    } else {
        if( data.pasteIsClicked === true ) {
            if( appCtxSvc.getCtx( 'notifyMessage' ) === true ) {
                appCtxSvc.updateCtx( 'notifyMessage', false );
            }
            exports.processPaste( data );
        } else {
            if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
                appCtxSvc.updateCtx( 'pasteIsClicked', false );
            }
            if( appCtxSvc.getCtx( 'notifyMessage' ) === true ) {
                appCtxSvc.updateCtx( 'notifyMessage', false );
            }
            if( newCell ) {
                //handle a different selection
                classifySvc.clearSearchBox( data );
                exports.processEdit( data );
            } else {
                // Only the attributes that are editable need to be displayed.
                if( data.dAttributeStruct && data.dAttributeStruct.length > 0 ) {
                    classifyLovSvc.getKeyLOVsForDependentAttributes( data.dAttributeStruct );
                }
                exports.getEditableAttributes( data, data.attr_anno );
            }
        }
        //used to check if a prompt is required when display a discard/save prompt for the user. This is to prevent duplicate messages from firing.
        data.isAlreadyPrompted = false;
        data.isNavigating = false;
        data.panelMode = 1;
        data.hierarchyExpanded = true;
        exports.filterProperties( data );
        //clear search results in case of previous search in edit or create
        classifySvc.clearSearchBox( data );
        exports.resetScope( data, appCtxSvc.ctx );
    }
};

/*
 * toggles editMode for selected class
 *
 * @param {Object} data  the declarative viewmodel data
 * @param {String} attributeId  the Id of the attribute to be checked if editable
 * @returns true if attribute is editable
 */
export let isAttributeEditable = function( data, attributeId ) {
    var isAttributeEditable = true;
    var attributesDefinitions = null;
    if( data.pasteIsClicked === true ) {
        var classId = appCtxSvc.getCtx( 'IcoReplica.vmo.cellInternalHeader1' );
        attributesDefinitions = data.classDefinitionMapResponse[ classId ].attributes;
    } else {
        attributesDefinitions = data.classDefinitionMapResponse[ data.selectedClass.id ].attributes;
    }
    var attrMatched = false;
    _.forEach( attributesDefinitions, function( attribute ) {
        if( !attrMatched && attribute.attributeId === attributeId ) {
            attrMatched = true;
            // If attribute is hidden, read-only, or reference attribute, then don't render it.
            if( ( attribute.options & classifySvc.ATTRIBUTE_HIDDEN ) !== 0 ||
                ( attribute.options & classifySvc.ATTRIBUTE_PROTECTED ) !== 0 ||
                ( attribute.options & classifySvc.ATTRIBUTE_REFERENCE ) !== 0 ||
                ( attribute.options & classifySvc.ATTRIBUTE_FIXED ) !== 0 ||
                ( attribute.options & classifySvc.ATTRIBUTE_FIXED2 ) !== 0 ) {
                isAttributeEditable = false;
            }
        }
    } );

    return isAttributeEditable;
};

/**
 * Formats the classification class Image attachments so that they can be displayed in the UI.
 *
 * @param {Object} data - The view-model data object
 */
export let formatImageAttachments = function( data ) {
    if( appCtxSvc.ctx &&  appCtxSvc.ctx.locationContext && appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.classificationManagerLocation' ) {
        data.datasetFilesOutput = appCtxSvc.ctx.clsAdmin.datasetFilesOutput;
    }
    var imageURLs = [];
    var totalNoOfImages = 0;
    var index = 0;
    var viewDataArray = [];
    var imageIndex = 0;
    if( data.datasetFilesOutput && data.datasetFilesOutput.length > 0 && data.datasetFilesOutput[ 0 ] ) {
        _.forEach( data.datasetFilesOutput, function( dsOutputArrElement ) {
            var hasMoreImage = false;
            if( data.datasetFilesOutput.length > 1 ) {
                hasMoreImage = true;
            }
            var ticket = dsOutputArrElement.ticket;
            var isSupportedImgtype = false;
            //  getting correct viewer for various format of supported images and pdf
            if( ticket && ticket.length > 28 ) {
                var n = ticket.lastIndexOf( '.' );
                var ticketExt = ticket.substring( n + 1 ).toUpperCase();
                if( [ 'GIF', 'JPG', 'JPEG', 'PNG', 'BMP' ].indexOf( ticketExt ) > -1 ) {
                    var viewer = 'Awp0ImageViewer';
                    isSupportedImgtype = true;
                } else if( ticketExt === 'PDF' ) {
                    viewer = 'Awp0PDFViewer';
                    isSupportedImgtype = true;
                }
            }
            if( isSupportedImgtype ) {
                totalNoOfImages++;
                var thumbnailUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
                imageURLs.push( thumbnailUrl );

                var viewerData = {
                    datasetData: {},
                    fileData: {
                        file: {
                            cellHeader1: fmsUtils.getFilenameFromTicket( ticket )
                        },
                        fileUrl: thumbnailUrl,
                        fmsTicket: ticket,
                        viewer: viewer
                    },
                    hasMoreDatasets: hasMoreImage,
                    imageIndex: imageIndex
                };
                viewDataArray.push( viewerData );
                imageIndex++;
                data.clsImgAvailable = true;
            }
        } );
    }
    data.totalNoOfImages = totalNoOfImages;
    //Set initial image to be selected in ribbon
    if( viewDataArray[ index ] ) {
        viewDataArray[ index ].selected = true;
    }
    data.ribbonIncr = 0;
    data.viewerData = viewDataArray[ index ];
    data.index = index;
    data.viewDataArray = viewDataArray;
    data.imageURLs = imageURLs;
};

/**
 * Sets the unit system state on the panel.
 *
 * @param {Object} data - The viewmodel data object
 */
export let setUnitSystem = function( data ) {
    var unitSystemEnabled;
    if( data.panelMode === 0 && !data.standaloneObjectExists || data.panelMode === 1 && data.editClassInProgress ) {
        var classUnitSystem;
        if( data.classDefinitionMapResponse ) {
            if( data.pasteIsClicked === true ) {
                classUnitSystem = classifySvc.getPropertyValue( data.classDefinitionMapResponse[ appCtxSvc
                    .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ) ].properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM );
            } else {
                classUnitSystem = classifySvc.getPropertyValue(
                    data.classDefinitionMapResponse[ data.selectedClass.id ].properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM );
            }
            data.unitSystem.dbValue = classUnitSystem === 'metric' || classUnitSystem === 'both';
            unitSystemEnabled = classUnitSystem === 'both';

            data.unitSystem.isEditable = unitSystemEnabled;
            data.unitSystem.isEnabled = unitSystemEnabled;
        }
    } else if( ( data.panelMode === -1 || data.standaloneObjectExists && !data.createForStandalone ) &&
        data.clsObjInfo || data.panelMode === 1 && data.pasteIsClicked === true ) {
        var icoUnitSystem = classifySvc.getPropertyValue( data.clsObjInfo.properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM );
        data.unitSystem.dbValue = icoUnitSystem === 'metric' || icoUnitSystem === 'UNSPECIFIED';
        if( data.classDefinitionMapResponse ) {
            if( data.pasteIsClicked === true ) {
                unitSystemEnabled = classifySvc.getPropertyValue( data.classDefinitionMapResponse[ appCtxSvc
                    .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ) ].properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM ) === 'both';
            } else {
                unitSystemEnabled = classifySvc.getPropertyValue(
                    data.classDefinitionMapResponse[ data.selectedClass.id ].properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM ) === 'both';
            }
        }
        data.unitSystem.isEditable = unitSystemEnabled;
        data.unitSystem.isEnabled = unitSystemEnabled;
    }
};

/*
 *   Check if each attribute in array is a block, and if it is flags it as such
 *
 *   @param {Array} inputArray property group array
 */
export let populatePropertyGroupTree = function( inputArray ) {
    if( inputArray ) {
        _.forEach( inputArray, function( attribute ) {
            if( attribute.type === 'Block' ) {
                //Check if attribute, and the attribute's children, has block children
                classifySvc.hasBlockChildren( attribute );
            }
        } );
    }
};


/**
 * Formats the classification attributes so they can be displayed in the ui.
 *
 * @param {Object} data - The viewmodel data object
 */
export let formatAttributesForAdmin = function( data ) {
    var attributesDefinitions = null;
    data.attributesVisible = true;
    exports.setUnitSystem( data );
    //Format the attributes for display
    if ( data.classDefinitionMapResponse ) {
        attributesDefinitions = data.classDefinitionMapResponse[data.selectedClass.id].attributes;
        data.classesProperties = data.classDefinitionMapResponse[data.selectedClass.id].properties;
        appCtxSvc.ctx.classesProperties = [];

        appCtxSvc.ctx.clsAdmin.isCSTNode = true;
        appCtxSvc.ctx.clsAdmin.isGroupNode = false;
        //Handling for ID
        _.forEach( classifySvc.UNCT_CLASS_ATTRIBUTES, function( key, index ) {
            var value = classifySvc.getPropertyValue(
                data.classesProperties, key );
                if( key === 'CLASS_OBJECT_TYPE' ) {
                    if( value === 'MASTER_NODE' ) {
                        appCtxSvc.ctx.clsAdmin.isCSTNode = false;
                    }
                    if( value === 'GROUP_NODE' ) {
                        appCtxSvc.ctx.clsAdmin.isGroupNode = true;
                    }
                }
            key = classifySvc.UNCT_CLASS_ATTRIBUTES_DISP[index];
            var vmoProp = uwPropertyService.createViewModelProperty( key, key, '', value.toString(), value.toString() );
            vmoProp.uiValue = value.toString();
            appCtxSvc.ctx.classesProperties.push( vmoProp );
        } );
    }
    data.attr_anno = [];
    data.prop_anno = [];
    var valuesMap = null;
    if( attributesDefinitions ) {
        classifySvc.formatAttributeArrayForAdmin( data, attributesDefinitions, valuesMap, data.attr_anno, '', false, false, null, null, data.clearProperties );
    }
    //handle any filter from preview
    exports.filterProperties( data, true );
    exports.populatePropertyGroupTree( data.attr_anno );

    var plainAttributes = [];
    for( var i = 0 ; i < data.attr_anno.length ; i++ )
    {
        if( data.attr_anno[i].type !== "Block" )
        {
            plainAttributes.push( data.attr_anno[i]);
        }
    }
    data.filteredAttributes = plainAttributes;
    data.filteredAttr_anno = plainAttributes;

    data.filteredPropGroups = data.attr_anno;
    appCtxSvc.ctx.classifyHasAnnotations = data.selectedClass.hasAnno;
    appCtxSvc.ctx.classifyHasPropGroups = data.hasBlocks;
};

/**
 * Formats the classification attributes so they can be displayed in the ui.
 *
 * @param {Object} data - The viewmodel data object
 */
export let formatAttributes = function( data ) {
    var ctxClsTab = appCtxSvc.getCtx( 'clsTab' );
    ctxClsTab.displayOnlyMandatoryAttr = undefined;
    appCtxSvc.updateCtx( 'clsTab', ctxClsTab );


    exports.setUnitSystem( data );


    //Set the visibility of panel sections;
    data.hierarchyVisible = true;
    data.attributesVisible = true;
    var attributesDefinitions = null;

    //Format the attributes for display
    if( data.classDefinitionMapResponse ) {
        if( data.pasteIsClicked === true ) {
            attributesDefinitions = data.classDefinitionMapResponse[ appCtxSvc
                .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ) ].attributes;
        } else {
            attributesDefinitions = data.classDefinitionMapResponse[ data.selectedClass.id ].attributes;
            data.classesProperties = data.classDefinitionMapResponse[ data.selectedClass.id ].properties;
            appCtxSvc.ctx.classesProperties = [];
            _.forEach( classifySvc.UNCT_CLASS_ATTRIBUTES, function( key ) {
                var value = classifySvc.getPropertyValue(
                    data.classesProperties, key );
                var vmoProp = uwPropertyService.createViewModelProperty( key, key, '', value.toString(), value.toString() );
                vmoProp.uiValue = value.toString();
                appCtxSvc.ctx.classesProperties.push( vmoProp );
            } );
        }
    }
    data.attr_anno = [];
    data.prop_anno = [];

    var valuesMap = null;
    if( data.pasteIsClicked === true ) {
        if( data.clsObjInfo ) {
            valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.clsObjInfo.properties, data.clsObjInfo.blockDataMap );
        }
    } else if( data.clsObjInfo && data.ico ) {
        valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.clsObjInfo.properties, data.clsObjInfo.blockDataMap );
    } else if( data.clsObjInfo && suggestedClassSelected === true ) {
        suggestedClassSelected = false;
        initialConvertCount = 1;
        valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.clsObjInfo.properties, data.clsObjInfo.blockDataMap );
    } else if( data.panelMode === 0 && typeof data.localPropertyValues === 'object' && !data.clearProperties ) {
        initialConvertCount = 1;
        valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.localPropertyValues.properties, data.localPropertyValues.blockDataMap );
    }

    if( data.panelMode === 1 && data.selectedCell ) {
        initialConvertCount = 1;
    }
    if( attributesDefinitions ) {
        classifySvc.formatAttributeArray( data, attributesDefinitions, valuesMap, data.attr_anno, '', false, false, null, null, data.clearProperties );
    }
    if( data.selectedCell ) {
        //update cell extended Props for selected class
        updateCellProps( data.selectedCell.cellExtendedTooltipProps, valuesMap );
    }
    //handle any filter from preview
    exports.filterProperties( data );
    exports.populatePropertyGroupTree( data.attr_anno );
    data.filteredPropGroups = data.attr_anno;

    if( data.pasteIsClicked === true ) {
        // we are setting it false so as not to cause any problems for the other sections of code.
        data.pasteIsClicked = false;
        // registering on the context for the purpose of save and cancel.But remember it is global. we need to take care.
        appCtxSvc.registerCtx( 'pasteIsClicked', true );
    }

    //Update context for command visibility
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    ctx.mandatoryFieldsExists = false;
    ctx.classifyShowMetric  = data.unitSystem.dbValue;
    ctx.classifyUnitsEnabled = data.unitSystem.isEnabled;

    if ( ctx.classifyShowAnnotations === undefined ) {
       ctx.classifyShowAnnotations = data.selectedClass.hasAnno;
    }
    ctx.classifyHasAnnotations = data.selectedClass.hasAnno;
    ctx.classifyHasPropGroups = data.hasBlocks;

    //mandatory command appears only when the class contains
    //required attributes.
    var numberOfAttributes = data.attr_anno.length;
    for( var i = 0; i < numberOfAttributes; i++ ) {
        if( data.attr_anno[i].vmos && data.attr_anno[i].vmos[0].isRequired !== undefined &&
                data.attr_anno[i].vmos[0].isRequired === true ) {
            ctx.mandatoryFieldsExists = true;
            break;
        }else if( data.attr_anno[i].suffix &&
                        data.attr_anno[i].suffix === '*' ) {
            ctx.mandatoryFieldsExists = true;
            break;
        }
    }
    ctx.classifyHasAnnotations = data.selectedClass.hasAnno;
    ctx.classifyHasPropGroups = data.hasBlocks;

    //mandatory command appears only when the class contains
    //required attributes.
    var numberOfAttributes = data.attr_anno.length;
    for( var i = 0; i < numberOfAttributes; i++ ) {
        if( data.attr_anno[i].vmos && data.attr_anno[i].vmos[0].isRequired !== undefined &&
                data.attr_anno[i].vmos[0].isRequired === true ) {
            ctx.mandatoryFieldsExists = true;
            break;
        }else if( data.attr_anno[i].suffix &&
                        data.attr_anno[i].suffix === '*' ) {
            ctx.mandatoryFieldsExists = true;
            break;
        }
    }

    ctx.classifyShowImageCmd = data.clsImgAvailable;
    appCtxSvc.updateCtx( 'clsTab', ctx );
};

/*
 * Calls the valuesMap function to create the block data map and return it.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @returns class blocks
 */
export let getClassBlocks = function( data ) {
    var valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, null, null, data.attr_anno );
    if( valuesMap ) {
        return valuesMap.blockProperties;
    }
};

export let getUnitsAndConvert = async function( data ) {
    if( data.attr_anno ) {
        var request = {
            valueConversionInputs: []
        };
        _.forEach( data.attr_anno, function( attribute ) {
            request.valueConversionInputs.push( exports.convertAttr( data, attribute ) );
        } );
        var realRequest = {
            valueConversionInputs: []
        };
        var indexes = [];
        for( var u = 0; u < request.valueConversionInputs.length; u++ ) {
            if( request.valueConversionInputs[ u ].inputUnit !== '' ) {
                indexes.push( u );
                realRequest.valueConversionInputs.push( request.valueConversionInputs[ u ] );
            }
        }
        if( realRequest && realRequest.valueConversionInputs ) {
            let response = await exports.convertValues2( realRequest );
            //.then( function( response ) {
            if( response && !response.partialErrors && response.convertedValues ) {
                var i = 0;
                _.forEach( indexes, function( item ) {
                    var attr = data.attr_anno[ item ];
                    var values = response.convertedValues[ i ].convertedValues[ 0 ];
                    i++;
                    if( values !== '' && values > 0 ) {
                        attr.vmos[ 0 ].dbValue = values;
                        attr.vmos[ 0 ].dbValues[ 0 ] = values;
                        attr.vmos[ 0 ].displayValue = values;
                        attr.vmos[ 0 ].valueUpdated = values;
                    }
                } );
                //return;
            }
            //} );
        }
    }
};

export let convertValues2 = async function( request ) {
    return await soaService.postUnchecked( 'Classification-2016-03-Classification', 'convertValues', request );
};

export let convertAttr = function( data, attribute ) {
    try {
        if( attribute.unitSystem.startValue ) { // && attribute.unitSystem.startValue !== attribute.unitSystem.unitName ) {
            var tempAttrId = attribute.id;
            var tempAttrPrefix = attribute.prefix;
            var isCstAttr = Boolean( tempAttrId.substring( 0, 4 ) === 'cst0' || tempAttrPrefix.substring( 0, 4 ) === 'cst0' );
            if( attribute.type !== 'Block' && !attribute.isCardinalControl ) {
                var vmo = attribute.vmos[ 0 ];
                var input = {
                    inputValues: [],
                    options: 0
                };
                if( vmo.dbValues ) {
                    if( _.isArray( vmo.dbValues[ 0 ] ) ) {
                        _.forEach( vmo.dbValues[ 0 ], function( value ) {
                            input.inputValues.push( value.toString() );
                        } );
                    } else {
                        input.inputValues.push( vmo.dbValues[ 0 ].toString() );
                    }
                    var unitSystem;
                    //By this point, unitSystem represents the new/desired unit system.
                    if( !data.unitSystem.dbValue ) {
                        unitSystem = vmo.nonMetricFormat;
                    } else {
                        unitSystem = vmo.metricFormat;
                    }
                    input.inputUnit = attribute.vmos[ 2 ].uiValue;
                    //Replace unitsystem and values with new values
                    attribute.attrDefn.updateViewPropForUnitSystem( data, attribute, unitSystem, isCstAttr );
                    input.outputFormat = unitSystem.formatDefinition;
                    input.outputUnit = attribute.unitSystem.startValue;
                } else {
                    input.inputValues = [];
                    input.inputValues.push( '' );
                    input.inputUnit = '';
                    //Replace unitsystem and values with new values
                    input.outputFormat = {
                        formatLength: 80,
                        formatModifier1: 0,
                        formatModifier2: 0,
                        formatType: 0
                    };
                    input.outputUnit = '';
                }
                return input;
            } else if( attribute.type === 'Block' ) {
                // Defect NoBlockHandling
                // We need to handle cardinal instances here as well, which will add more code
            }
        } else {
            var vmo = attribute.vmos[ 0 ];
            var input2 = {
                inputValues: [],
                options: 0
            };
            input2.inputValues = [];
            input2.inputValues.push( '' );
            input2.inputUnit = '';
            //Replace unitsystem and values with new values
            input2.outputFormat = {
                formatLength: 80,
                formatModifier1: 0,
                formatModifier2: 0,
                formatType: 0
            };
            input2.outputUnit = '';
            return input2;
        }
    } catch ( err ) {
        console.error( err );
    }
};

// exports.getHiddenConversionValues = function( data ) {
//     _.forEach( data.attr_anno, function( attr ) {
//         try {
//             if ( attr.vmos[0].displayValue ) {
//                 var converted = attr.vmos[0].displayValue[0];
//                 var display = attr.vmos[0].dbValue;

//                 if ( converted !== display ) {
//                     if ( attr.vmos[0].value && attr.vmos[0].value[0] !== display ) {
//                         var temp;
//                     } else {
//                         uwPropertyService.setValue( attr.vmos[0], converted );
//                         uwPropertyService.setValue( attr.vmos[1], converted );
//                         uwPropertyService.setValue( attr.vmos[2], converted );
//                     }
//                 }
//             }
//         } catch ( err ) {
//             console.error( err );
//         }
//     } );
//     return data.attr_anno;
// };

/*
 * Compiles the classification properties and their values to be sent in the classify operation.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @returns class properties
 */
export let getClassProperties = function( data ) {
    var properties = [];

    //Create ValuesMap, from data.attr_anno, then get the properties from it
    //data.attr_anno = exports.getHiddenConversionValues( data );
    var valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, null, null, data.attr_anno );
    if( valuesMap ) {
        properties = valuesMap.properties;

        var icoId = null;
        // Classification object id
        if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
            if( !data.pasteSaved ) {
                icoId = appCtxSvc.getCtx( 'IcoReplica.vmo.icoUid' ) ? appCtxSvc.getCtx( 'IcoReplica.vmo.icoUid' ) :
                    '';
            } else {
                icoId = data.ico.uid;
            }
        } else {
            icoId = data.ico ? data.ico.uid : '';
        }
        properties.push( {
            propertyId: classifySvc.UNCT_ICO_UID,
            propertyName: '',
            values: [ {
                internalValue: icoId,
                displayValue: icoId
            } ]
        } );

        // Classification class id
        if( appCtxSvc.getCtx( 'pasteIsClicked' ) === true ) {
            var values = [];
            var propertyValueObj = {
                internalValue: '',
                displayValue: ''
            };
            if( !data.pasteSaved ) {
                propertyValueObj.displayValue = appCtxSvc.getCtx( 'IcoReplica.vmo.cellInternalHeader1' );
                propertyValueObj.internalValue = appCtxSvc.getCtx( 'IcoReplica.vmo.cellInternalHeader1' );
                values.push( propertyValueObj );
            } else {
                propertyValueObj.displayValue = data.selectedClass.id;
                propertyValueObj.internalValue = data.selectedClass.id;
                values.push( propertyValueObj );
            }
            properties.push( {
                propertyId: classifySvc.UNCT_CLASS_ID,
                propertyName: '',
                values: values
            } );
        } else {
            properties.push( {
                propertyId: classifySvc.UNCT_CLASS_ID,
                propertyName: '',
                values: [ {
                    internalValue: data.selectedClass.id,
                    displayValue: data.selectedClass.id
                } ]
            } );
        }
        // ICO unit system
        var currentUnitSystem = data.unitSystem.dbValue ? '0' : '1';
        properties.push( {
            propertyId: classifySvc.UNCT_CLASS_UNIT_SYSTEM,
            propertyName: '',
            values: [ {
                internalValue: currentUnitSystem,
                displayValue: currentUnitSystem
            } ]
        } );

        // Push a special property to indicate the standalone needs to be connected.
        // Now, if the user has chosen to create a new classification( instead of connecting to existing),
        // then we don't not need to set this property.
        if( data.standaloneObjectExists && data.standaloneObjectExists === true && !data.createForStandalone ) {
            properties.push( {
                // Currently using this 'nowhere defined' value for ICS_CONNECT_STANDALONE property.
                // We need a better mechanism than this to send it to SOA though
                propertyId: classifySvc.ICS_CONNECT_STANDALONE,
                propertyName: '',
                values: [ {
                    internalValue: 'true',
                    displayValue: 'true'
                } ]
            } );
        }
        var ctx = appCtxSvc.getCtx( 'classifyTableView' );
        if( ctx && ctx.attribute && ctx.attribute.tableView ) {
            ctx.noReload = true;
            appCtxSvc.updateCtx( 'classifyTableView', ctx );
        }
        return properties;
    }
};


/**
 * Following method detects the node
 * @param {Object} selected THe selected object
 * @param {Object} data Declarative view model
 */
export let detectNode = function( selectedNode, data ) {
    appCtxSvc.ctx.clsAdmin.attributeProperties = [];
    data.attr_anno = null;
    data.origAttr_anno = null;
    data.imageURLs = null;
    data.viewerData = null;
    data.isAlreadyPrompted = false;
    data.attributesVisible = false;
    data.clsImgAvailable = false;
    // TBD - validate does it need this assignment after calling updateSelectedClassFromTree
    data.selectedClass = selectedNode;
    var clssId = null;
    //set has blocks flag to false, used for Prop Group Tree
    data.hasBlocks = false;
    data.isFiltered = false;
    data.assignVisible = true;
    data.propFilter = '';
    data.propGroupFilter = '';
    data.searchResults = null;

    if( selectedNode ) {
        if( selectedNode.type === 'StorageClass' ) {
            data.editClass = false;
            // Since convertValues is not to be called, set initialConvertCount to 1.
            initialConvertCount = 1;
            exports.getAttributes( data, false );
        }
    }
};


/**
 * detects if a selected node is storage node or hierarchy node and calls the corresponding methods
 *
 * @param {Object} selectedNode - selected node
 * @param {Object} data data in the viewModel
 */
export let detectNodeType = function( selectedNode, data ) {
    if( appCtxSvc.getCtx( 'classifyEditStart' ) === true ) {
        appCtxSvc.unRegisterCtx( 'classifyEditStart' );
        // When user navigates through the hierarchy in edit class screen, it would be in reset state of VNC actions
        appCtxSvc.ctx.clsTab.isVNCaction = appCtxSvc.ctx.clsTab.isChildVNC = false;
        appCtxSvc.ctx.currentLevel = {
            children: []
        };
        return;
    }
    data.attr_anno = null;
    data.origAttr_anno = null;
    data.imageURLs = null;
    data.viewerData = null;
    data.isAlreadyPrompted = false;
    data.attributesVisible = false;
    data.clsImgAvailable = false;
    // TBD - validate does it need this assignment after calling updateSelectedClassFromTree
    data.selectedClass = selectedNode;
    var clssId = null;
    //set has blocks flag to false, used for Prop Group Tree
    data.hasBlocks = false;
    data.isFiltered = false;
    data.assignVisible = true;
    data.propFilter = '';
    data.propGroupFilter = '';
    data.searchResults = null;

    var ctx = appCtxSvc.getCtx( 'classifyEdit' );
    if( ctx ) {
        ctx.showSave = false;
        appCtxSvc.updateCtx( 'classifyEdit', ctx );
    }
    appCtxSvc.unRegisterCtx( 'classifyTableView' );
    if( selectedNode ) {
        data.suggestedSectionCollapse = true;
        data.suggestedClassSelected = true;
        appCtxSvc.ctx.clsTab.collapseSuggested = data.suggestedClassSelected;
        if( selectedNode.type === 'StorageClass' ) {
            // Set currentLevel which is used to display VNC to empty array. Also reset VNC related variables
            appCtxSvc.ctx.clsTab.currentLevel = [];
            appCtxSvc.ctx.clsTab.isVNCaction = appCtxSvc.ctx.clsTab.isChildVNC = false;
            data.editClass = false;
            // Since convertValues is not to be called, set initialConvertCount to 1.
            initialConvertCount = 1;
            exports.getAttributes( data, false );
        } else if( selectedNode.childCount === 0 ) {
            // Set currentLevel which is used to display VNC to empty array. Also reset VNC related variables
            appCtxSvc.ctx.clsTab.currentLevel = [];
            appCtxSvc.ctx.clsTab.isVNCaction = appCtxSvc.ctx.clsTab.isChildVNC = false;
            // If not a StorageClass and it does not have children, then report error as nonStorageLeafLevel class.
            data.selectedClass.name = data.selectedClass.className;
            messagingService.reportNotyMessage( data, data._internal.messages, 'nonStorageClassMessage' );
        }
    }
};

/**
 * Determines whether values can be converted on current version of AW
 *
 * @param {Object} data - the viewmodel data object,
 */
export let convertValues = function( data ) {
    if( initialConvertCount === 0 ) {
        classifySvc.convertValues( data );
    } else {
        initialConvertCount--;
    }
};

/**
 * Method for detecting if a WSO is classified or not
 *
 * @param {Object}  selected the selected object.
 * @param {Object} data the declarative viewmodel data
 * @param {Object} ctx the declarative viewmodel data
 */
export let findClassificationObjects = function( selected, data, ctx ) {
    eventBus.publish( 'reset.EditClassFlag' );
    classifySvc.cleanupStandaloneData( data );
    data.supportedRelease = classifyUtils.checkIfSupportedTcVersion( TcServerVersion.majorVersion,
        TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

    //Set the target for classify operations
    classifySvc.setTargetObjectForSelection( selected, data );

    classifySvc.setViewMode( data );
    eventBus.publish( 'classifyPanel.loadCells' );
};
/**
 * Update the selected class with the currently selected class in tree
 * detectNodeType gets called with ctx.clsTab.selectedTreeNode. So may be there won't be any need for calling this function intermediately as data.selectedClass gets assigned as well
 * @param {Object} data the declarative viewmodel data
 * @param {Object} ctx the declarative viewmodel data
 */
export let updateSelectedClassFromTree = function( data, ctx ) {
    if( ctx.clsTab.selectedTreeNode !== null && ctx.clsTab.selectedTreeNode.displayName !== undefined ) {
        ctx.clsTab.selectedTreeNode.className = ctx.clsTab.selectedTreeNode.displayName;
    }
    data.selectedClass = ctx.clsTab.selectedTreeNode;
};

export let noAction = function( data ) {
    // no action right now. May be filled if required.
};

/**
 * Method to invoke loading of class attributes on cell selection change
 *
 * @param {ViewModelObject} data - The viewModelData
 */
export let processCellSelection = function( data ) {
    data.caption = data.i18n.properties;
    classifySvc.setViewMode( data );
    appCtxSvc.updateCtx( 'selected', data.targetObjectForSelection[ 0 ] );
    var arr = [];
    arr.push( data.targetObjectForSelection[0] );
    appCtxSvc.updateCtx( 'mselected', arr );
    data.attr_anno = null;
    data.imageURLs = null;
    data.viewerData = null;
    data.propFilter = '';
    data.editProp = false;
    data.editPropInProgress = false;
    data.nodeAttr = null;
    //Added this to both prevent convertValues from firing on cellSelection, and from it locking up when saving
    //initialConvertCount is -1 after performing save and exit, and classify
    if( data.initialConvertCountAfterClassify ) {
        initialConvertCount = 0;
        data.initialConvertCountAfterClassify = false;
    } else {
        initialConvertCount = initialConvertCount === -1 ? 0 : 1;
    }

    //Set Show All command to false
    data.showAllProp = false;
    appCtxSvc.registerCtx( 'classifyShowAll', data.showAllProp );
    appCtxSvc.unRegisterCtx( 'classifyShowAll' );
    appCtxSvc.unRegisterCtx( 'pasteInProgress' );
    var ctx = appCtxSvc.getCtx( 'classifyTableView' );
    if( ctx ) {
        if( ctx.targetObject.uid !== data.targetObjectForSelection[ 0 ].uid ||
            data.ico !== null && data.ico !== undefined && ctx.ico.uid !== data.ico.uid ) {
            appCtxSvc.unRegisterCtx( 'classifyTableView' );
            data.searchResults = null;
        }
    }
    var selectedObject;

    if( data.standaloneObjectExists && data.standaloneObjectExists === true ) {
        // If we are 'connecting' standalone, then we need to pass 'ICO' to the SOA(and not the selected WSO).
        selectedObject = data.clsObjTag;
    } else {
        selectedObject = data.targetObjectForSelection[ 0 ];
    }
    //get the classification cells
    var icoCells = data.icoCells;

    //find which cell is currently selected, and set selectedCell to it

    _.forEach( icoCells, function( icoCell ) {
        if( icoCell.selected ) {
            if( data.selectedCell && data.selectedCell.icoUid !== icoCell.icoUid ) {
                data.panelMode = -1;
                appCtxSvc.unRegisterCtx( 'classifyEdit' );
            }
            data.selectedCell = icoCell;
        }
    } );

    if( icoCells !== null && icoCells !== undefined ) {
        if( !data.standaloneObjectExists && icoCells.length === 0 ) {
            data.selectedCell = null;
            data.selectedClass = null;
        }
    }

    //If the currently selected cell is truely selected, continue
    if( data.selectedCell && data.selectedCell.selected ) {
        data.ico = {
            uid: data.selectedCell.icoUid,
            classID: data.selectedCell.cellInternalHeader1
        };

        data.selectedClass = {
            id: data.selectedCell.cellInternalHeader1,
            className: data.selectedCell.cellHeader1,
            uid: data.selectedCell.icoUid,
            hasUnits: false
        };

        data.hasBlocks = false;

        if( data.icoCells && data.icoCells.length > 0 && data.icoCells[ 0 ].icoUid === data.selectedCell.icoUid && data.cancelEditAction !== true ) {
            exports.formatDataAndResponse( appCtxSvc.getCtx( 'ICO_response' ), data );
        } else if( data.icoCells === null && data.cancelEditAction !== true ) {
            exports.formatDataAndResponse( appCtxSvc.getCtx( 'ICO_response' ), data );
        } else {
            exports.getAttributes( data );
        }
        appCtxSvc.unRegisterCtx( 'classifyCreate' );
        //If there are no selected icos
    } else {
        data.imageURLs = null;
        data.viewerData = null;
        data.clsImgAvailable = false;
        data.selectedCell = null;
        data.attr_anno = null;
        data.selectedClass = null;
        //set has blocks flag to false, used for Prop Group Tree
        data.hasBlocks = false;
        data.isFiltered = false;
        // classifySvc.clearClassBreadCrumb( data );
        clsTreeSvc.clearClassBreadCrumb( data, appCtxSvc.ctx.clsTab );
        appCtxSvc.registerCtx( 'classifyCreate', true );
    }
    if( data.cancelEditAction === true ) {
        data.cancelEditAction = false;
    }
};

/**
 * Method to setup required variables,and to display prompt, for standalone Classification
 *
 * @param {ViewModelObject} data - The viewModelData
 */
export let setupStandaloneDataAndPrompt = function( data ) {
    data.standaloneIco = appCtxSvc.getCtx( 'standaloneIco' );
    data.clsClassDescriptors = appCtxSvc.getCtx( 'clsClassDescriptors' );
    var classId = classifySvc.getPropertyValue( data.standaloneIco.properties, classifySvc.UNCT_CLASS_ID );

    //response.clsDefMap[classId].properties, UNCT_CLASS_NAME
    // The vars required in editMode
    data.selectedCell = {
        icoUid: data.standaloneIco.clsObject.uid,
        cellInternalHeader1: classId,
        cellHeader: classifySvc.getPropertyValue(
            data.clsClassDescriptors[ classId ].properties, classifySvc.UNCT_CLASS_NAME )
    };

    // The vars required in editMode method to distinguish between
    // 'regular' edit and 'standalone' edit
    data.clsObjTag = data.standaloneIco.clsObject;
    data.standaloneObjectExists = true;
    data.icoCells = null;
    data.isFiltered = false;
    data.ico = {
        uid: data.selectedCell.icoUid,
        classID: data.selectedCell.cellInternalHeader1
    };
    data.selectedClass = {
        id: data.selectedCell.cellInternalHeader1,
        className: data.selectedCell.cellHeader
    };
    /*
    With this code, we can make navigation to the standalone class. But this would get the view into properties preview mode.
    And the current behavior is that it is directly in the properties edit mode and not preview mode.
    May be achieved by a call to getAttributes. but would need to verify different scenarios and attribute-values in that case.
    var parentIds = [];
    classifySvc.getParentsPath( data.classParents[classId].parents, parentIds );
    parentIds.push( data.selectedClass );
    data.treeInTab = data.treeInTab || {};
    // Once tree is loaded, it should be expanded upto toBeExpandedClass with hierarchy parentIds
    data.treeInTab.performClassExpansion = {
        toBeExpandedClass: data.selectedClass,
        parentIds: _.clone( parentIds )
    };
    eventBus.publish( 'tabGetClassTableSummary.performClassExpansion' ); */
    exports.setCreateMode( data );
    exports.getAttributes( data );
    var context = {
        scope: {
            data: data
        }
    };
    eventBus.publish( 'classifyPanel.promptToHandleStandalone', context );
};

/**
 * Display previous image if there are multiple images
 *
 * @param {Object} data - the viewmodel data object
 */
export let onPrevChevronClick = function( data ) {
    eventBus.publish( 'classify.prevChevronClick' );
};

/**
 * Display Next image if there are multiple images
 *
 * @param {Object} data - the viewmodel data object
 */
export let onNextChevronClick = function( data ) {
    eventBus.publish( 'classify.nextChevronClick' );
};

/**
 * Display previous image if there are multiple images in circular way
 *
 * @param {Object} data - the viewmodel data object
 */
export let onCircularPrevChevronClick = function( data ) {
    data.suggestedRibbonIncr = Math.abs( ( data.suggestedRibbonIncr - 1 ) % data.suggestedClasses.length );
};

/**
 * Display Next image if there are multiple images in circular way
 *
 * @param {Object} data - the viewmodel data object
 */
export let onCircularNextChevronClick = function( data ) {
    data.suggestedRibbonIncr = Math.abs( ( data.suggestedRibbonIncr + 1 ) % data.suggestedClasses.length );
};

/**
 * Setting the viewer data to previous or next image details as per the user input
 *
 * @param {Object} data - the viewmodel data object
 */
export let showImage = function( data ) {
    var viewerData = {

        datasetData: {},
        fileData: {
            file: {
                cellHeader1: data.viewDataArray[ data.index ].fileData.file.cellHeader1

            },
            fileUrl: data.viewDataArray[ data.index ].fileData.fileUrl,
            fmsTicket: data.viewDataArray[ data.index ].fileData.fmsTicket,

            viewer: data.viewDataArray[ data.index ].fileData.viewer
        },
        hasMoreDatasets: true,
        imageIndex: data.viewDataArray[ data.index ].imageIndex
    };

    data.viewerData = viewerData;
};

/**
 * Sets all property groups, and their children, to be not selected.
 *
 * @param {ObjectArray} propertyGroupArray - property group array
 */
export let resetPropertyGroupSelection = function( propertyGroupArray ) {
    _.forEach( propertyGroupArray, function( propertyGroup ) {
        if( propertyGroup.type === 'Block' ) {
            propertyGroup.selected = false;
            if( propertyGroup.instances && propertyGroup.instances.length > 0 ) {
                exports.resetPropertyGroupSelection( propertyGroup.instances );
            } else if( propertyGroup.children && propertyGroup.children.length > 0 ) {
                exports.resetPropertyGroupSelection( propertyGroup.children );
            }
        }
    } );
};

/**
 * Sets is filtered to false, effectively causing the properties panel to note render the filtered attributes.
 * Also resets Property Group selection.
 *
 * @param {Object} data - the viewmodel data object
 */
export let resetAttributeFilter = function( data ) {
    data.isFiltered = false;
    exports.resetPropertyGroupSelection( data.attr_anno );
};

/*
 * Filters item that match the given term.
 *
 * @param {Object} item - item to be searched
 * @param {String} term - term to be searched
 * @param {boolean} filter - true/false to set visibility
 *
 * @returns item if term matches, null otherwise
 */
export let filterItems = function( item, term, filter ) {
    item.visible = !filter;
    var tmpTerm = term.toLowerCase();
    var name = item.name.toLowerCase();
    var index = name.indexOf( tmpTerm );
    if( index > -1 ) {
        item.visible = true;
        return item;
    }

    return null;
};

/**
 * Splits search terms
 *
 * @param {String} text - keyword text
 * @return {Array}Returns array of split keywords
 */
function getSearchTerms( text ) {
    var _text = text;
    if( _text.indexOf( '*' ) > -1 ) {
        _text = _text.replace( /[*]/gi, ' ' );
    }
    // split search text on space
    return _text.split( ' ' );
}

/**
 * Highlight Keywords
 *
 * @param {Object} data search terms to highlight
 */
export let highlightKeywords = function( data ) {
    //Commenting out the highlighter code because it is not being used to highlight the classes
    /*if( data.propFilter === undefined || data.propFilter === '' || data.propFilter.trim() === '*' ) {
        appCtxSvc.ctx.clsTab.highlighter = undefined;
    } else {
        var searchTerms = getSearchTerms( data.propFilter );
        highlighterSvc.highlightKeywords( searchTerms );
    }*/
};

/*
 * Adds an item to the set if not available
 * @param items set of items
 * @param item item to add
 */
export let addItems = function( items, item ) {
    //search if item already exists in array
    var itemindex = _.findIndex( items, {
        name: item.name
    } );

    if( itemindex >= 0 ) {
        items.splice( itemindex, 1 );
    }
    items.push( item );
};


/**
 *
 * @param {Object} data Declartive view model
 * @param {Object} eventData  eventData
 */
export let propertyFilter = function( data ) {
    appCtxSvc.ctx.attributeProperties = [];

    if( data.eventData  === null ) {
        data.isFiltered = false;
    } else {
        data.isFiltered = true;
        data.filteredAttributes = [];
        data.filteredAttributes.push( data.eventData );
        data.nodeAttr = data.filteredAttributes;
        //When selecting a node, expand it automatically
        data.nodeAttr[ 0 ].propExpanded = true;
        if( data.propFilter ) {
            exports.filterProperties( data, true );
        }
    }
};
/**
 * Filters cardinal block and its children that match the given term.
 *
 * @param {Object} block - item to be searched
 * @param {String} term - term to be searched
 * @param {boolean} propGroup - true if property group filter, false otherwise
 * @param {boolean} filter - true/false to set visibility
 * @param {integer} searchTermIndex - search term index
 * @param {Object} isAdmin - flag for admin location
 * @param {integer} found true if term found in block name
 * @returns {Object} block if term matches, null otherwise
 */
function filterCardinalBlock( block, term, propGroup, filter, searchTermIndex, found, isAdmin ) {
    exports.filterItems( block.cardinalController, term, filter );
    found = found || block.cardinalController.visible;

    if( _.isEmpty( block.instances ) && !isAdmin ) {
        return found ? block : null;
    }
    //filter instance children
    var newInstSet = [];
    if( !isAdmin ) {
        for( var i = 0; i < block.instances.length; i++ ) {
            var inst = block.instances[ i ];
            var found1 = exports.filterBlocks( inst, term, propGroup, filter, searchTermIndex );
            if( found1 ) {
                newInstSet.push( inst );
                block.visible = true;
            }
        }
    } else {
        //Special condition for admin
        _.forEach( block.children, function( item ) {
            item.visible = true;
        } );
    }

    return found || newInstSet.length > 0 ? block : null;
}

/*
 * Filters block and its children that match the given term.
 *
 * @param {Object} item - item to be searched
 * @param {String} term - term to be searched
 * @param {boolean} propGroup - true if property group filter, false otherwise
 * @param {boolean} filter - true/false to set visibility
 * @param {integer} searchTermIndex - search term index
 * @param {Object} isAdmin - Flag for admin location
 * @returns block if term matches, null otherwise
 */
export let filterBlocks = function( block, term, propGroup, filter, searchTermIndex, isAdmin ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    if( !filter ) {
        //make all children visible
        block.visible = true;
    }
    var tmpBlock = block;
    var found = exports.filterItems( tmpBlock, term, filter ) !== null;

    //check if cardinal block
    if( block.cardinalController && !isAdmin ) {
        return filterCardinalBlock( tmpBlock, term, propGroup, filter, searchTermIndex, found, isAdmin );
    } else if ( block.cardinalController && isAdmin ) {
        filterCardinalBlock( tmpBlock, term, propGroup, filter, searchTermIndex, found, isAdmin );
    }

    //check if polymorphic block
    var polyFound = false;

    if( block.polymorphicTypeProperty ) {
        exports.filterItems( block.polymorphicTypeProperty, term, filter );
        polyFound = block.visible || block.polymorphicTypeProperty.visible;
    }

    var childVisible = false;
    for( var ii = 0; ii < block.children.length; ii++ ) {
        var item = block.children[ ii ];
        if( item.type === 'Block' ) {
            //search children
            exports.filterBlocks( item, term, propGroup, filter, searchTermIndex, isAdmin );
            if( !childVisible ) {
                childVisible = item.visible;
            }
        } else if( !propGroup ) {
             if( found ) {
                item.visible = true;
            } else {
                //if an item found for previous term, ignore
                if( searchTermIndex > 0 && item.visible ) {
                    childVisible = item.visible;
                    continue;
                }
                exports.filterItems( item, term, filter );
                if( !childVisible ) {
                    childVisible = item.visible;
                }
            }

            //if term found in the title of the block, add properties by default
            if( ctx.displayOnlyMandatoryAttr !== undefined ) {
                if( item.vmos[0].isRequired === false && term === '' ) {
                    item.visible = !ctx.displayOnlyMandatoryAttr;
                }
            }
        }
    }
    if( childVisible || polyFound ) {
        tmpBlock.visible = true;
    }

    if( ctx.displayOnlyMandatoryAttr !== undefined ) {
        if( block.suffix !== '*'  ) {
            block.visible = !ctx.displayOnlyMandatoryAttr;
        }
    }

    return found || polyFound || childVisible && tmpBlock.children.length > 0 ? tmpBlock : null;
};

/*
 * Filters classes that match the term.
 *
 * @param {Object} items - list of item to be searched
 * @param {String} term - term to be searched
 * @param {boolean} propGroup - true if property group filter, false otherwise
 * @param {boolean} filter - true/false to set visibility
 * @param {integer} searchTermIndex - search term index
 * @param {Object} isAdmin - flag for classifciation admin
 * @returns list of items that matched the term
 */
export let filterByType = function( items, term, propGroup, filter, searchTermIndex, isAdmin ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    var tmpItem = null;
    var tmpItems = [];

    _.filter( items, function( item ) {
        if( item.type === 'Block' ) {
            //search children
            tmpItem = exports.filterBlocks( item, term, propGroup, filter, searchTermIndex, isAdmin );
        } else {
            tmpItem = searchTermIndex > 0 && item.visible ? item : exports.filterItems( item, term, filter );
            //this case handles if "Required Properties" button is selected
            if( tmpItem !== null && ctx.displayOnlyMandatoryAttr !== undefined ) {
                if( tmpItem.vmos[0].isRequired === false && term === '' ) {
                    tmpItem.visible = !ctx.displayOnlyMandatoryAttr;
                }else if( tmpItem.vmos[0].isRequired === false && term !== '' ) {
                    tmpItem.visible = !ctx.displayOnlyMandatoryAttr;
                }
            }
        }
        if( tmpItem ) {
            exports.addItems( tmpItems, tmpItem );
        }
    } );

    return tmpItems;
};

/*
 * Filters properties/groups that match the term.
 *
 * @param {Object} items - list of item to be searched
 * @param {String} text - term to be searched
 * @param {boolean} propGroup - true if property group filter, false otherwise
 * @param {Object} isAdmin - CHeck for classification admin
 * @returns list of items that matched the term
 */
export let filterProps = function( items, text, propGroup, isAdmin ) {
    if( text === undefined || !text || text.length === 0 || _.isEqual( text, '*' ) ) {
        text = text ? text : '';
        tmpItems = exports.filterByType( items, text, propGroup, false, null, isAdmin );
        return items;
    }
    var searchTerms = getSearchTerms( text );

    // search for single terms.
    var tmpItems;
    searchTerms.forEach( function( term, index ) {
        if( term && term.length ) {
            tmpItems = exports.filterByType( items, term, propGroup, true, index, isAdmin );
        }
    } );

    return tmpItems;
};

/*
 * Filters selected block to display in properties section
 *
 * @param {Object} data - view model data
 * @param {Object} block- block attribute
 *
 */
export let filterSelectedBlock = function( data, attr ) {
    var found = false;
    if( attr.type === 'Block' ) {
        if( _.isEqual( attr.name, data.nodeAttr[ 0 ].name ) ) {
            data.filteredAttributes = [ attr ];
            found = true;
        } else {
            for( var i = 0; i < attr.children.length; i++ ) {
                var item = attr.children[ i ];
                found = exports.filterSelectedBlock( data, item );
                if( found ) {
                    break;
                }
            }
        }
    }
    return found;
};

/**
 *
 * Filters properties that match the term.
 *
 * @param {Object} data - view model data
 * @param {Object} isAdmin
 * @returns list of items that matched the term
 */
export let filterProperties = function( data, isAdmin ) {
    data.filteredAttr_anno = exports.filterProps( data.attr_anno, data.propFilter, false, isAdmin );
    var ctx = appCtxSvc.getCtx( 'classifyTableView' );
    if( ctx && ctx.attribute && ctx.attribute.tableView && !ctx.attribute.noReload ) {
        classifyTblSvc.updateTableColumnData( data, ctx.attribute );
    }
    if( data.isFiltered ) {
        if( !_.isEmpty( data.propFilter ) ) {
            data.filteredAttr_anno = exports.filterProps( data.nodeAttr, data.propFilter, false, isAdmin );
            data.filteredAttributes = data.filteredAttr_anno;
        } else {
            if( !data.filteredAttributes ) {
                var found;
                for( var attr in data.filteredAttr_anno ) {
                    found = exports.filterSelectedBlock( data, attr );
                    if( found ) {
                        break;
                    }
                }
            }
        }
    }
};

/*
 * Filters property groups that match the term.
 *
 * @param {Object} data - view model data
 *
 * @returns list of items that matched the term
 */
export let filterPropGroups = function( data ) {
    if( !data.origAttr_anno ) {
        data.origAttr_anno = data.attr_anno;
    }
    if( appCtxSvc.ctx && appCtxSvc.ctx.locationContext &&
         appCtxSvc.ctx.locationContext &&
         appCtxSvc.ctx.locationContext['ActiveWorkspace:Location'] === 'com.siemens.splm.classificationManagerLocation')
         {
            data.filteredAttr_anno = exports.filterProps( data.origAttr_anno, data.propGroupFilter, true, true );
         }
         else
         {
            data.filteredAttr_anno = exports.filterProps( data.origAttr_anno, data.propGroupFilter, true );
         }

};

/*
 * Update cardinal blocks with new instances
 *
 * @param {Object} data - view model data
 * @param {Object} cardinalBlockAttr - cardinal block attribute
 *
 * @returns list of items that matched the term
 */
export let updateCardinalBlocks = function( data, cardinalBlockAttr ) {
    if( !data.origAttr_anno ) {
        data.origAttr_anno = data.attr_anno;
    } else {
        //find cardinal attr and update instances
        var index = _.findIndex( data.origAttr_anno, function( attr ) {
            return cardinalBlockAttr.name === attr.name;
        } );
        if( index > -1 ) {
            data.origAttr_anno[ index ].instances = cardinalBlockAttr.instances;
        }
    }
    if( cardinalBlockAttr.tableView ) {
        classifyTblSvc.updateInstanceData( data, cardinalBlockAttr );
        classifyTblSvc.updateTableData( data, cardinalBlockAttr );
    } else {
        //check if any other block is in table view and copy instance data
        var ctx = appCtxSvc.getCtx( 'classifyTableView' );
        if( ctx && ctx.attribute && ctx.attribute.tableView ) {
            classifyTblSvc.updateInstanceData( data, ctx.attribute );
        }
    }
    if( data.propGroupFilter ) {
        exports.filterPropGroups( data );
    }
    exports.filterProperties( data );
};

/**
 * Following method process cancel operation if ICO is in edit mode
 * @param {*} data Declarative view model
 */
export let processCancelEdit = function( data ) {
    // Check if One Step Full Screen command is active
    //LCS-343359 -- Issue 1
    var fullViewModeActive = appCtxSvc.getCtx( 'classifyFullscreen' );
    if( fullViewModeActive && data.showAllProp ) {
        eventBus.publish( 'classify.exitFullScreenMode' );
    }

    data.panelMode = -1;
    data.showAllProp = false;
    data.editClass = false;
    data.editClassInProgress = false;
    data.cancelEditAction = true;
    exports.resetEventMapForPropValidation( data );
    classifySvc.setCellProperty( data );
    exports.processCellSelection( data );
};

/**
 * This is to be called in cases where a navigation msg has been shown to user and now it is to be moved away from edit/create to view mode
 * @param {*} data Declarative view model
 */
export let processCancelEditBeforeReclassify = function( data ) {
    data.panelMode = -1;
    data.showAllProp = false;
    data.editClass = false;
    data.editClassInProgress = false;
    data.editProp = false;
    data.editPropInProgress = false;
    data.cancelEditAction = true;
};

/*
 * Cancels edit command
 * This is being used for cancellation of properties
 * @param {Object} context - context
 * @param {Object} data - view model data
 */
export let cancelEdits = function() {
    eventBus.publish( 'classify.cancelEdit' );
};

/*
 * Edit property values.
 *
 * @param {Object} data - view model data
 */
export let editPropertyValues = function( data ) {
    data.editProp = true;
    data.editPropInProgress = true;
    exports.editMode( data );
    var cardinalAttr = classifyTblSvc.getCardinalBlock( data.attr_anno );
    if( cardinalAttr && cardinalAttr.tableView ) {
        classifyTblSvc.updateTableData( data, cardinalAttr );
    }
};

/*
 * Edit property values.
 *
 * @param {Object} data - view model data
 *
 */
export let reClassify = function( data ) {
    appCtxSvc.ctx.clsTab.navigateToEditClass = false;
    appCtxSvc.registerCtx( 'classifyEdit', appCtxSvc.getCtx( 'forClassifyEdit' ) );
    appCtxSvc.registerCtx( 'classifyEditStart', appCtxSvc.getCtx( 'forClassifyEditStart' ) );
    appCtxSvc.unRegisterCtx( 'forClassifyEdit' );
    appCtxSvc.unRegisterCtx( 'forClassifyEditStart' );
    data.editClass = true;
    data.editClassInProgress = true;
    data.showAllProp = true;
    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;
    data.hasBlocks = false;
    data.panelMode = -1;
    var icoEdit = appCtxSvc.getCtx( 'classifyEdit.vmo' );
    var newCell = true;
    if( data.selectedClass ) {
        // check if it is a different selection
        newCell = !_.isEqual( data.selectedClass.id, icoEdit.cellInternalHeader1 );
    } else {
        data.selectedClass = {
            id: icoEdit.cellInternalHeader1,
            className: icoEdit.cellHeader1
        };
    }
    data.treeInTab = data.treeInTab || {};
    // Once tree is loaded, it should be expanded upto toBeExpandedClass with hierarchy parentIds
    data.treeInTab.performClassExpansion = {
        toBeExpandedClass: {
            id: icoEdit.cellInternalHeader1,
            className: icoEdit.cellHeader1
        },
        parentIds: _.clone( icoEdit.parentIds )
    };
    // Set this variable so that tree service would not use past data available in dataProvider
    data.initialTreeLoad = true;
    exports.editMode( data, newCell );
};

export let editClass = function( cmdContext ) {
    var context = {
        vmo: cmdContext.vmo,
        showSave: false
    };
    /**
     * This is a fix for different selections in SWA issue of table. By design, framework does not support different selections in SWA.
     * That means, if we have selected an ICO, and try to select any class of tree in reclassify scenario, previous selection is cleared off.
     * Fix: Before actually calling reClassify/editClass, perform ICO deselection. At the same time, maintain the class on which editClass has been called.
     */
    appCtxSvc.registerCtx( 'forClassifyEdit', context );
    appCtxSvc.registerCtx( 'forClassifyEditStart', true );
    // We cannot directly refer data.dataProviders as data here would refer to commandsViewViewModel. Thus fire an event to do that.
    eventBus.publish( 'classifyTab.deselectICOBeforeEditing' );
};

/**
 * If it is in edit class mode/create mode, cancel the edit mode before proceeding further.
 * @param {Object} data - View model object
 */
export let checkIfEditsToBeCancelled = function( data ) {
    if( data.editClassInProgress || data.editClass || data.panelMode === 0 ) {
        exports.processCancelEditBeforeReclassify( data );
    }
};

/**
 * Deselect the ICO(if any) before entering the editClass mode.
 * @param {Object} data - view model data
 */
export let deselectICOBeforeEditing = function( data ) {
    appCtxSvc.ctx.clsTab.navigateToEditClass = true;
    if( data && data.dataProviders && data.dataProviders.performSearch && data.dataProviders.performSearch.selectedObjects.length <= 0 ) {
        /**
         * If there is no selection then performSearch.selectionChangeEvent is not fired. Thus publish another event.
         */
        eventBus.publish( 'classifyTab.checkIfEditsToBeCancelled' );
    } else {
        // Deselect the ICO
        data.dataProviders.performSearch.selectNone();
    }
};

/*
 * Handles edit properties command
 *
 * @param {Object} context - context
 * @param {Object} data - view model data
 */
export let editProperties = function() {
    var context = {
        showSave: true,
        showSaveContinue: true
    };
    appCtxSvc.registerCtx( 'classifyEdit', context );
    eventBus.publish( 'classify.editProperties' );
};

/*
 * Handles save and continue command
 *
 */
export let save = function() {
    var eventData = {
        goToView: false
    };
    eventBus.publish( 'classifyPanel.propValidation', eventData );
};

/*
 * Handles save and exit command
 *
 */
export let saveExit = function() {
    if( appCtxSvc.getCtx( 'pasteInProgress' ) === true ) {
        initialConvertCount = 0;
    } else {
        initialConvertCount = -1;
    }
    var eventData = {
        goToView: false,
        saveAndExitOperation: true
    };
    eventBus.publish( 'classifyPanel.propValidation', eventData );
};

/*
 * Handles show/hide
 *
 * @param {Object} data - view model data
 */
export let showHideProperties = function( data ) {
    data.showAllProp = !data.showAllProp;
    appCtxSvc.unRegisterCtx( 'classifyShowAll' );
    appCtxSvc.registerCtx( 'classifyShowAll', data.showAllProp );
};

/*
 * Handles show/hide command
 */
export let showProperties = function() {
    eventBus.publish( 'classify.showHideProperties' );
};

/*
 * Handles show/hide Annotations
 *
 * @param {Object} data - view model data
 */
export let showHideAnnotations = function(  ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    ctx.classifyShowAnnotations  = !ctx.classifyShowAnnotations;
    appCtxSvc.updateCtx( 'clsTab', ctx );
};

/*
 * Handles show/hide command
 */
export let showAnnotations = function() {
    eventBus.publish( 'classify.showHideAnnotations' );
};

/*
 * Handles show/hide metricsection
 *
 * @param {Object} data - view model data
 */
export let showHideMetricSystem = function( data ) {
    if ( data.unitSystem.isEnabled && data.eventData.metric !== data.unitSystem.dbValue ) {
        data.unitSystem.dbValue = !data.unitSystem.dbValue;
        exports.convertValues( data );
        var ctx = appCtxSvc.getCtx( 'clsTab' );
        ctx.classifyShowMetric  = data.unitSystem.dbValue;
        appCtxSvc.updateCtx( 'clsTab', ctx );
    }
};

/*
 * Handles show/hide metric command
  * @param {boolean} metric - true if metric selected, false otherwise
 */
export let selectMetric = function( metric ) {
    initialConvertCount = 0;
    var ctx = {
        metric : metric
    };
    eventBus.publish( 'classify.showHideMetric', ctx );
};

/*
 * Handles show/hide images section
 *
 * @param {Object} data - view model data
 */
export let showHideImages = function( data ) {
    var ctx = appCtxSvc.getCtx( 'clsTabGlobal' );
    ctx.classifyShowImages  = !ctx.classifyShowImages;

    appCtxSvc.updateCtx( 'clsTabGlobal', ctx );
    var fullViewModeActive = appCtxSvc.getCtx( 'classifyFullscreen' );
    if ( fullViewModeActive ) {
        eventBus.publish( 'classify.pingRibbonSizeCheck' );
    }
};

/*
 * Handles show/hide images command
 */
export let showImages = function() {
    eventBus.publish( 'classify.showHideImages' );
};

/*
 * Handles show/hide images section
 *
 * @param {Object} data - view model data
 */
export let showHidePropGroups = function( data ) {
    var ctx = appCtxSvc.getCtx( 'clsTabGlobal' );
    ctx.classifyShowPropGroups  = !ctx.classifyShowPropGroups;

    appCtxSvc.updateCtx( 'clsTabGlobal', ctx );
};

/*
 * Handles show/hide images command
 */
export let showPropGroups = function() {
    eventBus.publish( 'classify.showHidePropGroups' );
};

/*
 * Handles show/hide images command
 */
export let showImagesMaximized = function( context ) {
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    ctx.classifyImageMaximize  = !ctx.classifyImageMaximize;
    appCtxSvc.updateCtx( 'clsTab', ctx );
};

/*
Reset the goToView once it's use is completed by saveEdits
*/
export let resetEventMapForPropValidation = function( data ) {
    if( data.eventMap && data.eventMap[ 'classifyPanel.propValidation' ] && data.eventMap[ 'classifyPanel.propValidation' ].goToView === false ) {
        delete data.eventMap[ 'classifyPanel.propValidation' ].goToView;
    }
};

/*
 * Handles toggle of table view/list view
 *
 * @param {Object} data - view model data
 */
export let toggleCardinalityView = function( data ) {
    var attribute = data.eventData.attribute;
    var cardinalAttr = classifyTblSvc.getCardinalBlock( attribute );
    if( cardinalAttr && cardinalAttr.visible ) {
        classifyTblSvc.updateInstanceData( data, attribute );
        attribute.tableView = !attribute.tableView;
        var prevAttr = null;
        var ctx = appCtxSvc.getCtx( 'classifyTableView' );
        if( ctx && ctx.attribute.blockId !== attribute.blockId ) {
            prevAttr = ctx.attribute;
            for( var idx in prevAttr.instances ) {
                var instance = prevAttr.instances[ idx ];
                //get values from table if appropriate
                classifyUtils.getAttributeValuesFromTable( data, prevAttr, instance );
            }
            prevAttr.tableView = false;
        }
        if( attribute.tableView ) {
            var context = {
                attribute: cardinalAttr,
                prevAttr: prevAttr,
                ico: data.ico ? data.ico : '',
                targetObject: data.targetObjectForSelection[ 0 ]
            };
            appCtxSvc.registerCtx( 'classifyTableView', context );
            if( data.propFilter ) {
                var context1 = {
                    attribute: cardinalAttr
                };
                eventBus.publish( 'classify.highlightKeywords', context1 );
            }
        }
    }
};

/*
 * Handles copy/paste table column command
 */
export let copyTableColumn = function( context, data ) {
    //TBD
};

/*
 * Handles show/hide command
 */
export let toggleTableView = function( context, data ) {
    var ctx = {
        attribute: context.attribute
    };
    eventBus.publish( 'classify.toggleTableView', ctx );
};

/**
 * Checks if value is required, is valid keyLOV or if in min-max range
 * @param {Object} data - view model data
 * @param {Object} node - current Block class
 * @param {Object} isRequiredAttrsArray - collection of mandatory attributes
 * @param {Boolean} isPoly - true if polymorphic node, false otherwise
 * @return {Object} returns flags to indicate validity
 */
// eslint-disable-next-line complexity
export let checkValidValue = function( data, node, isRequiredAttrsArray, isPoly ) {
    var isValidData = {};
    var validToSave = false;
    if( typeof node.vmos[ '0' ].dbValue !== 'undefined' ) {
        if( node.vmos[ '0' ].isRequired === true ) {
            isRequiredAttrsArray.push( node );

            if( node.vmos[ '0' ].dbValue !== null && node.vmos[ '0' ].dbValue.length !== 0 && node.vmos[ '0' ].dateApi.dateValue !== '' ) {
                validToSave = true;
            }
            if( isPoly && !node.vmos[ 0 ].dbValue ) {
                node.vmos[ 0 ].propertyRequiredText = 'Required';
                node.vmos[ 0 ].uiValue = '';
            }
        } else {
            if ( node.unitSystem && node.unitSystem.formatDefinition && node.unitSystem.formatDefinition.formatType >= COMPLEX ) {
                var complexValid = true;
                if ( node.vmos[0].error !== null && node.vmos[0].error.length > 0 ) {
                    complexValid = false;
                }
                if ( node.vmos[3].error !== null && node.vmos[3].error.length > 0 ) {
                    complexValid = false;
                }
                // Tolerance, Level, Position, Axis
                if (   node.unitSystem.formatDefinition.formatType > 5 ) {
                    if ( node.vmos[4].error !== null && node.vmos[4].error.length > 0 ) {
                        complexValid = false;
                    }
                    // Level
                    if (   node.unitSystem.formatDefinition.formatType === 7 ) {
                        if ( node.vmos[5].error !== null && node.vmos[5].error.length > 0 ) {
                            complexValid = false;
                        }
                    } else if (   node.unitSystem.formatDefinition.formatType === 9 ) {
                        // Axis
                        if ( node.vmos[6].error !== null && node.vmos[6].error.length > 0 ) {
                            complexValid = false;
                        }
                        if ( node.vmos[7].error !== null && node.vmos[7].error.length > 0 ) {
                            complexValid = false;
                        }
                    }
                }
                validToSave = complexValid;
            } else {
                validToSave = true;
            }
        }
        isValidData = classifySvc.isSingleKeyLOVvalid( node, data );
        if ( node.unitSystem && node.unitSystem.formatDefinition && node.unitSystem.formatDefinition.formatType >= COMPLEX ) {
            isValidData = exports.validateComplexFields( node, isValidData );
        }
        classifySvc.isAttributeValueInRange( node, isValidData );
        //check if cardinality is valid integer for cardinal blocks
        isValidData.isValidValue = true;
        if( node.isCardinalControl ) {
            var value = parseInt( node.vmos[ 0 ].dbValue );
            if( value < 0 ) {
                isValidData.isValidValue = false;
                isValidData.invalidAttr = node.name;
            }
        }
        validToSave = validToSave && classifySvc.checkValid( isValidData );
    }
    isValidData.isValidtoSave = validToSave;
    return isValidData;
};

/*
 * Checks complex data for errors and unfilled fields.
 * @param {Object} node - current Block class
 * @param {Object} isValidData - current valid data object
*/
// eslint-disable-next-line complexity
export let validateComplexFields = function( node, isValidData ) {
    var isValidtoSave = true;
    var isAllComplexFilled = true;
    if ( node.unitSystem.formatDefinition.formatType > LOWEST_NON_COMPLEX_TYPE && node.unitSystem.formatDefinition.formatType < COMPLEX_POSITION ) { // Tolerance, Range, Level
        var emptyCount = 0;
        for ( var vmo = 0; vmo < node.vmos.length; vmo++ ) { //check for empty fields
            if (  vmo !== 1 && vmo !== 2 && ( node.vmos[vmo].dbValue === '' || node.vmos[vmo].dbValue === null ) ) {
                emptyCount++;
            }
        }
        var skippedVMOCount = 2;
        if ( emptyCount > 0 && emptyCount + skippedVMOCount !== node.vmos.length ) {
            isValidData.isAllComplexFilled = false;
            isValidtoSave = false;
            isValidData.invalidComplexAttr = node.vmos[0].propertyName;
        } else {
            isAllComplexFilled = true;
        }
        if ( emptyCount + 2 === node.vmos.length ) {
            return isValidData;
        }
        if ( isValidtoSave ) { //Check Minimum is less than maximum
            if ( node.unitSystem.formatDefinition.formatType === 5 && parseFloat( node.vmos[0].dbValue ) > parseFloat( node.vmos[3].dbValue ) ) { // Range
                isValidtoSave = false;
                isValidData.isValidMinMax = false;
                isValidData.invalidComplexAttr = node.vmos[0].propertyName;
            } else if ( node.unitSystem.formatDefinition.formatType === 6 && parseFloat( node.vmos[3].dbValue ) > parseFloat( node.vmos[4].dbValue ) ) { // Tolerance
                isValidtoSave = false;
                isValidData.isValidMinMax = false;
                isValidData.invalidComplexAttr = node.vmos[0].propertyName;
            } else if ( node.unitSystem.formatDefinition.formatType === 7 && parseFloat( node.vmos[4].dbValue ) > parseFloat( node.vmos[5].dbValue ) ) { // Level
                isValidtoSave = false;
                isValidData.isValidMinMax = false;
                isValidData.invalidComplexAttr = node.vmos[0].propertyName;
            }
            // Check Tolerance/Nominal
            if ( isAllComplexFilled === true && node.unitSystem.formatDefinition.formatType === 6 ) { //Tolerance
                var nominal = parseFloat( node.vmos[0].dbValue );
                var minimum = parseFloat( node.vmos[3].dbValue );
                var maximum = parseFloat( node.vmos[4].dbValue );
                if ( nominal < minimum || nominal > maximum ) {
                    isValidData.isValidNominal = false;
                    isValidtoSave = false;
                    isValidData.invalidComplexAttr = node.vmos[0].propertyName;
                }
            } else if ( isAllComplexFilled === true && node.unitSystem.formatDefinition.formatType === 7 ) { //Level
                var nominal = parseFloat( node.vmos[0].dbValue );
                var typical = parseFloat( node.vmos[3].dbValue );
                var minimum = parseFloat( node.vmos[4].dbValue );
                var maximum = parseFloat( node.vmos[5].dbValue );
                if ( nominal < minimum || nominal > maximum || typical < minimum || typical > maximum ) {
                    isValidData.isValidNominal = false;
                    isValidtoSave = false;
                    isValidData.invalidComplexAttr = node.vmos[0].propertyName;
                }
            }
        }
    } else if ( node.unitSystem.formatDefinition.formatType > 7 ) { // Position, Axis
        // No field checking needed, empty fields save as zero.
        isValidtoSave = true;
    }
    return isValidData;
};

/*
 * Get mandatory Block type attributes data
 * @param {Object} node - current Block class
 * @param {Object} isRequiredAttrsArray - collection of mandatory attributes
 * @param {Object} data - view model data
 * @param {Boolean} isPoly - true if polymorphic node, false otherwise
 *
 */
export let validateProps = function( node, isRequiredAttrsArray, data, isPoly ) {
    var isValidData = {
        isValidtoSave:true
    };
    if( node.type !== 'Block' ) {
        return exports.checkValidValue( data, node, isRequiredAttrsArray, isPoly );
    }
    //If poly but not cardinal
    if( node.polymorphicTypeProperty && !node.cardinalController ) {
        isValidData = exports.validateProps( node.polymorphicTypeProperty, isRequiredAttrsArray, data, true );
        if( !isValidData.isValidtoSave ) {
            return isValidData;
        }
    }
    if( node.cardinalController ) {
        if( _.isEmpty( node.instances ) ) {
            isValidData = exports.checkValidValue( data, node.cardinalController, isRequiredAttrsArray, isPoly );
            return isValidData;
        }
        for( var i = 0; i < node.instances.length; i++ ) {
            var instance = node.instances[ i ];
            //if the instance is poly
            if( instance.polymorphicTypeProperty ) {
                isValidData = exports.validateProps( instance.polymorphicTypeProperty, isRequiredAttrsArray, data, true );
                if( !isValidData.isValidtoSave ) {
                    if( node.tableView ) {
                        classifyTblSvc.setPolyRequired( data, node, instance );
                    }
                    break;
                }
            }
            isValidData = exports.validateProps( instance, isRequiredAttrsArray, data );
            if( !isValidData.isValidtoSave ) {
                break;
            }
        }
        if( node.tableView ) {
            classifyTblSvc.refreshTable( data, node );
        }
    } else if( node.children ) {
        for( var ii = 0; ii < node.children.length; ii++ ) {
            isValidData = exports.validateProps( node.children[ ii ], isRequiredAttrsArray, data );
            if( !isValidData.isValidtoSave ) {
                break;
            }
        }
    }

    return isValidData;
};

/*
 * Sets the editability of the attribute to the editableFlag value, as well as all children attributes
 * @param {Object} attribute - formatted attribute
 * @param {Boolean} editableFlag - boolean flag for if the attributes should be editable (true) or not (false)
 *
 */
var setAttributeEditable = function( attribute, editableFlag ) {
    if( attribute.type === 'Block' ) {
        _.forEach( attribute.children, function( child ) {
            setAttributeEditable( child, editableFlag );
        } );
    } else {
        attribute.editable = editableFlag;
        if( attribute.vmos[ 0 ] ) {
            attribute.vmos[ 0 ].editable = editableFlag;
            attribute.vmos[ 0 ].isEditable = editableFlag;
        }
    }
};

/*
 * Check isRequired properties for class is filled then perform Save operation otherwise display error message
 * @param {Object} data - view model data
 */
/*
 * Check isRequired properties for class is filled then perform Save operation otherwise display error message
 * @param {Object} data - view model data
 */
export let onSaveButtonValidation = function( data ) {
    var isRequiredAttrsArray = [];
    var isValidData = {
        invalidAttr: '',
        invalidComplexAttr: '',
        isInRange: true,
        isValidValue: true,
        isValidtoSave: true,
        iskeyValid: true,
        isValidMinMax: true,
        isAllComplexFilled: true,
        isValidTolerance: true,
        isValidNominal: true
    };

    var invalidPropName = '';

    data.showAllProp = false;

    appCtxSvc.unRegisterCtx( 'classifyShowAll' );

    for( var i = 0; i < data.attr_anno.length; i++ ) {
        isValidData = exports.validateProps( data.attr_anno[ i ], isRequiredAttrsArray, data );
        if( !isValidData.isValidtoSave ) {
            break;
        }
        if( data.eventData && data.eventData.goToView ) {
            setAttributeEditable( data.attr_anno[ i ], false );
        }
    }
    if( isValidData.isValidtoSave ) {
        if( data.eventData && data.eventData.saveAndExitOperation === true && data.eventData.goToView === false ) {
            data.eventData.goToView = true;
        }
    }
    var property = {};
    property.sanCommandId = 'classify_save';
    property.sanCommandTitle = data.selectedClass.objectType;

    analyticsSvc.logCommands( property );

    return isValidData;
};

/**
 *  Get object uid and type for save operation
 *  @param {Object} data - view model data
 *  @param {Object} ctx - Application context data
 *  @return {Object} objectInfo -type and uid of workspace object
 */
export let getWorkspaceUidAndTypeForSaveOperation = function( data, ctx ) {
    var objectInfo = null;
    if( ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) {
        if( data && data.targetObjectForSelection[ 0 ] && data.targetObjectForSelection[ 0 ].props && data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject && data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject.dbValues[ '0' ] ) {
            var object = clientDataModelSvc.getObject( data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject.dbValues[ '0' ] );
            objectInfo = {
                uid: data.targetObjectForSelection[ 0 ].props.awb0UnderlyingObject.dbValues[ '0' ],
                type: object.type
            };
        }
    } else if( ctx && ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'BranchVersioningSubLocation' && data && data.targetObjectForSelection[ 0 ] && data.targetObjectForSelection[ 0 ].type === 'Bhv1VersionObjectNode' 
        && data.targetObjectForSelection[ 0 ].props && data.targetObjectForSelection[ 0 ].props.bhv1OwningObject && data.targetObjectForSelection[ 0 ].props.bhv1OwningObject.dbValues[ '0' ] ) {
        var bhv1Object = clientDataModelSvc.getObject( data.targetObjectForSelection[ 0 ].props.bhv1OwningObject.dbValues[ '0' ] );
        objectInfo = {
            uid: bhv1Object.uid,
            type: bhv1Object.type
        };
    } else {
        objectInfo = {
            //Assuming there is single WSO object is being selected
            uid: data.targetObjectForSelection[ 0 ].uid,
            type: data.targetObjectForSelection[ 0 ].type
        };
    }
    return objectInfo;
};

/*
 * Adds attributes based on polymorphic selection.
 *
 * @param {Object} data - view model data
 *
 * @returns list of items that matched the term
 */
export let selectLOV = function( data ) {
    classifySvc.selectLOV( data );
    var cardinalAttr = data.eventData.cardinalAttribute;
    if( cardinalAttr && cardinalAttr.tableView ) {
        classifyTblSvc.updateTableColumnData( data, cardinalAttr );
    }
    exports.filterProperties( data );
};

export let resetEditClassFlag = function( data ) {
    data.editClass = false;
    data.filteredAttr_anno = [];
};

export let setSuggestedSectionState = function( data ) {
    data.suggestedSectionCollapse = !data.suggestedSectionCollapse;
    appCtxSvc.ctx.clsTab.collapseSuggested = data.suggestedSectionCollapse;
};

/**
 * To get classified workspace object id
 * @param {response} response the declarative viewmodel data
 *
 */
export let getClassifiedWorkspaceObjectID = function( response ) {
    return classifySvc.getClassifiedWorkspaceObjectID( response );
};

/**
 * Deselect selected tree node
 * @param {*} data Declarative view model
 * @param {Object} ctx - application context
 */
export let deselectNode = function( data, ctx ) {
    if( ctx && ( ctx.clsTab.selectedTreeNode || ctx.clsTab.selectedNode ) ) {
        ctx.clsTab.selectedTreeNode = null;
        data.selectedClass = null;
        clsTreeSvc.clearClassBreadCrumb( data, ctx.clsTab );
        exports.resetScope( data, ctx );
    }
};

export let beginReset = function( data, ctx ) {
    ctx.clsTab = ctx.clsTab || {};
    ctx.clsTab.tableSummaryDataProviderName = 'tabGetClassTableSummary';
    data.tableSummaryDataProviderName = 'tabGetClassTableSummary';
};

/**
 * Following method resets the application context variables, this would get called whenever the tree needs to be resettted
 * e.g. click on available classes, new/edit classification
 * @param {*} data Declarative view model
 * @param {*} ctx Application context
 * @returns {bool} true
 */
export let resetScope = function( data, ctx ) {
    ctx.clsTab = ctx.clsTab || {};
    ctx.clsTab.tableSummaryDataProviderName = 'tabGetClassTableSummary';
    data.tableSummaryDataProviderName = 'tabGetClassTableSummary';
    // For VNC to work, reset these values.
    ctx.clsTab.isChildVNC = ctx.clsTab.isVNCaction = ctx.clsTab.selectedNode = ctx.clsTab.selectedTreeNode = ctx.clsTab.selectedClass = null;
    // Problematic one
    // Not to be done in copy-paste. To be done in sort/search
    // data.selectedClass = null;
    ctx.clsTab.panelIsClosed = false;
    ctx.clsTab.currentLevel = [];
    ctx.clsTab.workspaceObjectsForSOA = [ {
        type: data.targetObjectForSelection[ 0 ].type,
        uid: data.targetObjectForSelection[ 0 ].uid
    } ];
    ctx.clsTab.supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
        TcServerVersion.minorVersion, TcServerVersion.qrmNumber );
    ctx.clsTab.expansionCounter = 0;

    return true;
};

/**
 * This method is used to get the preference values used in classification tab.
 * @returns {Object} preference values
 */
export let getCLSPreferences = function( ctx ) {
    ctx.clsTab.preferences = getICSPreferenceValues( ctx.preferences.ICS_attribute_displayable_properties );
    ctx.clsTab.eReleases = getReleasePreferenceValues ( ctx.preferences.CST_supported_eclass_releases );
};

/**
 * This method is used to get the preference values for the ICS_attribute_displayable_properties preference.
 * @param {Object} prefValues the preference values
 * @returns {Object} output preference values
 */
export let getICSPreferenceValues = function( prefValues ) {
    var prefs = null;

    if ( prefValues && prefValues.length > 0 ) {
        var pref;
        prefs = [];
        _.forEach( prefValues, function( value ) {
            pref = {
                propDisplayValue: value,
                propDisplayDescription: '',
                propInternalValue: value
            };
            prefs.push( pref );
        } );
    }

    return prefs;
};

/**
 * This method is used to get the preference values for the CST_supported_eclass_releases preference.
 * @param {Object} prefValues the preference values
 * @returns {Object} output preference values
 */
export let getReleasePreferenceValues = function( prefValues ) {
    var prefs = [];
    var isClsActive = appCtxSvc.getCtx( 'preferences.CLS_is_presentation_hierarchy_active' );

    if( isClsActive && isClsActive.length > 0 && isClsActive[0] === 'true' ){
        if ( prefValues && prefValues.length > 0 ) {
            for( var idx = 0; idx < prefValues.length - 1; idx++ )  {
                var pref = {
                    internalName: prefValues[ idx ],
                    displayName: prefValues[ idx + 1 ]
                };
                idx += 1;
                prefs.push( pref );
            }
        }
    }
    return prefs;
};

export default exports = {
    attributeBlockExpandCollapse,
    setNotifyMessage,
    initSuggestionsPanel,
    confirmDelete1,
    pasteCommandHide,
    findContHeight,
    getCopyInput,
    getClassifyNonClassify,
    getCLSPreferences,
    getICSPreferenceValues,
    getWorkspaceObjectUid,
    getWorkspaceObjectUidFromCtxSelected,
    getReleasePreferenceValues,
    toggleView,
    setCreateMode,
    setCreateModeForStandalone,
    generateCells,
    parseSearchString,
    formatSearchResultsForVNC,
    formatSearchResults,
    resetPropertiesSection,
    resetImagesSection,
    resetPropertiesImagesSection,
    mandatoryFields,
    showMandatoryProperties,
    expandAll,
    collapseAll,
    expandAllCmd,
    collapseAllCmd,
    clearAllProperties,
    clearAllProps,
    getAttributes,
    formatDataAndResponse,
    setCreateModeVariables,
    revealCreate,
    loadSuggestions,
    getSuggestedClasses,
    navigateToSuggestedClass,
    resetHierarchy,
    pasteIsClicked,
    pasteClicked,
    processPaste,
    processEdit,
    getEditableAttributes,
    resetView,
    editMode,
    isAttributeEditable,
    formatImageAttachments,
    setUnitSystem,
    populatePropertyGroupTree,
    formatAttributes,
    getClassBlocks,
    getUnitsAndConvert,
    convertValues2,
    convertAttr,
    getClassProperties,
    detectNodeType,
    convertValues,
    findClassificationObjects,
    updateSelectedClassFromTree,
    noAction,
    processCellSelection,
    setupStandaloneDataAndPrompt,
    onPrevChevronClick,
    onNextChevronClick,
    onCircularPrevChevronClick,
    onCircularNextChevronClick,
    showImage,
    resetPropertyGroupSelection,
    resetAttributeFilter,
    filterItems,
    highlightKeywords,
    addItems,
    filterBlocks,
    filterByType,
    filterProps,
    filterSelectedBlock,
    filterProperties,
    filterPropGroups,
    updateCardinalBlocks,
    processCancelEdit,
    processCancelEditBeforeReclassify,
    cancelEdits,
    editPropertyValues,
    reClassify,
    editClass,
    checkIfEditsToBeCancelled,
    deselectICOBeforeEditing,
    editProperties,
    save,
    saveExit,
    showHideAnnotations,
    showAnnotations,
    showHideProperties,
    showProperties,
    showHideMetricSystem,
    selectMetric,
    showHideImages,
    showImages,
    showHidePropGroups,
    showPropGroups,
    showImagesMaximized,
    resetEventMapForPropValidation,
    toggleCardinalityView,
    copyTableColumn,
    toggleTableView,
    checkValidValue,
    validateProps,
    validateComplexFields,
    onSaveButtonValidation,
    setSuggestedSectionState,
    getWorkspaceUidAndTypeForSaveOperation,
    selectLOV,
    resetEditClassFlag,
    getClassifiedWorkspaceObjectID,
    deselectNode,
    beginReset,
    resetScope,
    formatDataAndResponseForAdmin,
    formatAttributesForAdmin,
    detectNode,
    propertyFilter
};
/**
 * Classification panel service utility
 *
 * @memberof NgServices
 * @member classifyFullViewService
 */
app.factory( 'classifyFullViewService', () => exports );


