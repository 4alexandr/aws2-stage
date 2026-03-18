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
 * @module js/bbrowserTableDataService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import AwStateService from 'js/awStateService';
import awTableStateSvc from 'js/awTableStateService';
import appCtxService from 'js/appCtxService';
import assert from 'assert';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

var _defaultTOSsrc = null;
var _defaultTOStrg = null;

/**
 * Cached static default AwTableColumnInfo.
 */
var _treeTableColumnInfos = null;

/**
 * Place holder for where the index starts at for pagination
 */
var _startIndex = 0;

/**
 * Array of displayable columns in the aw-table
 */
var _bomAttributes = [ {
        propName: 'object_id',
        propDisplayName: 'ID',
        width: 265,
        isTreeNavigation: true
    },
    {
        propName: 'site',
        propDisplayName: 'STATUS',
        width: 70,
        isTreeNavigation: false
    },
    {
        propName: 'revision_id',
        propDisplayName: 'REV',
        width: 70,
        isTreeNavigation: false
    },
    {
        propName: 'object_name',
        propDisplayName: 'NAME',
        width: 162,
        isTreeNavigation: false
    },
    {
        propName: 'object_desc',
        propDisplayName: 'DESCRIPTION',
        width: 162,
        isTreeNavigation: false
    }
];

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos() {
    if( !_treeTableColumnInfos ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos();
    }

    return _treeTableColumnInfos;
}

/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos() {
    var columnInfos = [];

    var colNdx = 0;
    _.forEach( _bomAttributes, function( attrObj ) {
        var propName = attrObj.propName;
        var propDisplayName = attrObj.propDisplayName;
        var width = attrObj.width;
        var minWidth;

        if( colNdx === 0 ) {
            minWidth = 150;
        } else {
            minWidth = 70;
        }

        var columnInfo = awColumnSvc.createColumnInfo();
        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.isTreeNavigation = attrObj.isTreeNavigation;
        columnInfo.width = width;
        columnInfo.minWidth = minWidth;
        columnInfo.maxWidth = 800;

        if( attrObj.cellTemplate ) {
            columnInfo.cellTemplate = attrObj.cellTemplate;
        }

        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = 'String';
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = true;

        columnInfos.push( columnInfo );
        colNdx++;
    } );

    return columnInfos;
}

/**
 * @param {*} columnNumber - The index number of the column being created
 * @param {*} columnInfo - The column info including name and other attributes
 * @param {*} nodeId - The ID of the node object
 * @param {*} type - Type of object (Item, ItemRevision, etc.)
 * @param {*} child - Object that belongs to this node
 * 
 * @return {vmProp} view model properties for the object
 */
function _createViewModelProperty( columnNumber, columnInfo, nodeId, type, child ) {
    var dbValues;
    var uiValues;

    //Get the value of the property
    if( columnInfo.name === 'site' ) {
        dbValues = [ child[ columnInfo.name ] ];
        uiValues = [ child[ columnInfo.name ] ];
    } else {
        dbValues = [ child.props[ columnInfo.name ] ];
        uiValues = [ child.props[ columnInfo.name ] ];
    }

    //Create the property View Model
    var vmProp = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
        columnInfo.typeName, dbValues, uiValues );

    vmProp.propertyDescriptor = {
        displayName: columnInfo.displayName
    };

    if( columnInfo.isTableCommand || columnInfo.isTreeNavigation ) {
        vmProp.typeIconURL = iconSvc.getTypeIconURL( type );
    }

    return vmProp;
}

/**
 * 
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {*} propertyLoadInput - An object that contains the requests for what properties to load.
 */
function _loadProperties( deferred, propertyLoadInput ) {
    var allChildNodes = [];

    //Find all the properties then load them
    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            _populateColumns( propertyLoadRequest.columnInfos, true, childNode );

            allChildNodes.push( childNode );
        } );
    } );

    //Create a load result and attempt to load properties.
    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    var resolutionObj = {
        propertyLoadResult: propertyLoadResult
    };

    deferred.resolve( resolutionObj );
}

/**
 * 
 * @param {*} columnInfos - A List of columnInfo objects that contain information for all the columns
 * @param {*} isLoadAllEnabled - A boolean to check whether we should load all the column information
 * @param {*} vmNode - the current node that is getting loaded
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode ) {
    var child = vmNode._childObj;
    if( isLoadAllEnabled && child ) {
        if( !vmNode.props ) {
            vmNode.props = [];
        }

        //Load all the information into a new view model to the corresponding node property
        _.forEach( columnInfos, function( columnInfo, columnNdx ) {
            vmNode.props[ columnInfo.name ] = _createViewModelProperty( columnNdx, columnInfo, vmNode.id,
                vmNode.type, child );
        } );
    }
}

/**
 * A list of what should be exported.
 */
var exports = {};

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @param {*} data - DeclarativeViewModel that holds information about the page state
 * 
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();

    appCtxService.registerCtx( 'decoratorToggle', true );
    uwDataProvider.columnConfig = {
        columns: _getTreeTableColumnInfos()
    };

    deferred.resolve( {
        columnInfos: _getTreeTableColumnInfos()
    } );

    if( data ) {
        data.columnsloaded = true;
    }
};

/**
 * 
 * @param {*} data - data from the view model that controls UI elements.
 */
export let onClickLoadButton = function( data ) {
    _startIndex = 0;

    data.loading = true;
    data.notloading = false;

    data.loaded = true;
    data.notloaded = false;
    data.clickedLoad = true;
};

/**
 * Get a page of row data for a 'tree' table.
 * 
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * 
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 * 
 * @param {uwDataProvider} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * 
 * @param {String} srcUID - The UID of the briefcase that is being opened and viewed and in compare case the original briefcase
 * @param {String} trgUID - The UID of the target briefcase being compared
 * @param {String} SearchedUID - The UID of the briefcase that is being viewed for compare case to get color swabs.
 * @param {*} data - DeclarativeViewModel that holds information about the page state
 * @param {String} gridNameID - The name of the grid that is being loaded used to change the state of the top line to expanded
 * @param {String} src_map_uid - The UID of the transfer option set used to map the source briefcase
 * @param {String} tar_map_uid - The UID of the transfer option set used to map the target briefcase
 * 
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableDataPaging = function( treeLoadInput, uwDataProvider, srcUID, trgUID, SearchedUID, data, gridNameID, src_map_uid, tar_map_uid ) {
    /**
     * Check the validity of the parameters
     */

    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    //Create the root node if it is necessary
    if( treeLoadInput.startChildNdx > 0 && treeLoadInput.parentNode.levelNdx === -1 ) {
        treeLoadInput.parentNode.children = [];
        treeLoadInput.parentNode.totalChildCount = 0;

        treeLoadInput.rootNode = treeLoadInput.parentNode;
        treeLoadInput.startChildNdx = 0;
    }

    //Grab the start index from the data provider
    if( uwDataProvider ) {
        _startIndex = uwDataProvider.startIndex;
    }

    //Get the child nodes and recreate the tree structure.
    _buildTreeTableStructurePaging( treeLoadInput.parentNode, deferred, treeLoadInput, srcUID, trgUID, SearchedUID, data, gridNameID, src_map_uid, tar_map_uid );

    return deferred.promise;
};

export let getTransferOptionSets = function( briefcaseuid, data ) {
    var deferred = AwPromiseService.instance.defer();
    getPreferencTOS( 'TC_defaultTransferOptionSet_briefcase_src' );

    getPreferencTOS( 'TC_defaultTransferOptionSet_briefcase_trg' );

    var soaInput = _getTOSPanelInput();

    soaSvc.postUnchecked( 'GlobalMultiSite-2007-06-ImportExport', 'getAvailableTransferOptionSets', soaInput ).then(
        function( response ) {
            _handlePanelRevealResponse( response, data );
        },
        function( error ) {
            deferred.reject( error );
        } );
};

/**
 * @param {*} prefName - The name of the Briefcase Browser Preference that is to be retrieved for use of caching the selected Transfer Option Set
 *
 * @return {*} The response from the get prefence SOA
 */
function getPreferencTOS( prefName ) {
    return soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: [ prefName ],
        includePreferenceDescriptions: false
    }, {} ).then(
        function( result ) {
            if( prefName === 'TC_defaultTransferOptionSet_briefcase_src' ) {
                if( result !== null ) {
                    if( result.response !== null ) {
                        _defaultTOSsrc = result.response[ 0 ].values.values[ 0 ];
                    } else {
                        _defaultTOSsrc = '';
                        createTOSPreference( prefName );
                    }
                }
            } else {
                if( result !== null ) {
                    if( result.response !== null ) {
                        _defaultTOStrg = result.response[ 0 ].values.values[ 0 ];
                    } else {
                        _defaultTOStrg = '';
                        createTOSPreference( prefName );
                    }
                }
            }
        } );
}

/**
 * @param {*} prefenceName - The name of the Briefcase Browser Preference that is to be created for use of caching the selected Transfer Option Set
 */
function createTOSPreference( prefenceName ) {
    var preferenceInputSoa = {
        preferenceInput: [ {
            definition: {
                name: prefenceName,
                category: 'General',
                description: 'AW Internal Use For Setting Transfer Option Set Source',
                protectionScope: 'User',
                isEnvEnabled: true,
                type: 0,
                isArray: false
            },
            values: [ 'fakeVal' ]
        } ]
    };
    soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferencesDefinition', preferenceInputSoa );
}

/**
 * The input that is requires for the Transfer Option Set Panel
 * 
 * @return {*} - JSON information containing inputs for getAvailableTransferOptionSets
 **/
function _getTOSPanelInput() {
    return {
        inputs: {
            isPush: false,
            isExport: false
        }
    };
}

/**
 * @param {*} response - The response that comes from the call to the getAvailableTransferOptionSets
 * @param {*} data - The data class that the panel uses, updating the list boxes with values
 * 
 * @return {*} 
 **/
function _handlePanelRevealResponse( response, data ) {
    var listModels = [];
    var props = response.ServiceData;
    var listModel1 = {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        sel: false
    };
    listModels.push( listModel1 );
    // load the list values only if prop has values
    if( props ) {
        for( var idx = 0; idx < props.plain.length; idx++ ) {
            var listModel = {
                propDisplayValue: '',
                propInternalValue: '',
                propDisplayDescription: '',
                sel: false
            };
            listModel.propDisplayValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
            listModel.propInternalValue = props.plain[ idx ];
            if( _defaultTOSsrc !== null ) {
                if( _defaultTOSsrc === props.plain[ idx ] ) {
                    listModel.sel = true;
                    data.selectedMapping.dbValue = props.plain[ idx ];
                    data.selectedMapping.newValue = props.plain[ idx ];
                    data.selectedMapping.uiValue = props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ];
                    data.selectedMapping.displayValues = [ props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ] ];
                    data.selectedMapping.newDisplayValues = [ props.modelObjects[ props.plain[ idx ] ].props.object_name.uiValues[ 0 ] ];
                }
            }
            listModels.push( listModel );
        }
    }
    listModels.sort( function( a, b ) { return a.propDisplayValue > b.propDisplayValue ? 1 : b.propDisplayValue > a.propDisplayValue ? -1 : 0; } );
    data.mappingList = listModels;

    var listModelstrg = [];
    var listModel1trg = {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        sel: false
    };
    listModelstrg.push( listModel1trg );
    // load the list values only if prop has values
    if( data.selectedTarMapping ) {
        if( props ) {
            for( var idxTar = 0; idxTar < props.plain.length; idxTar++ ) {
                var listModeltrg = {
                    propDisplayValue: '',
                    propInternalValue: '',
                    propDisplayDescription: '',
                    sel: false
                };
                listModeltrg.propDisplayValue = props.modelObjects[ props.plain[ idxTar ] ].props.object_name.uiValues[ 0 ];
                listModeltrg.propInternalValue = props.plain[ idxTar ];
                if( _defaultTOStrg !== null ) {
                    if( _defaultTOStrg === props.plain[ idxTar ] ) {
                        listModeltrg.sel = true;
                        data.selectedTarMapping.dbValue = props.plain[ idxTar ];
                        data.selectedTarMapping.newValue = props.plain[ idxTar ];
                        data.selectedTarMapping.uiValue = props.modelObjects[ props.plain[ idxTar ] ].props.object_name.uiValues[ 0 ];
                        data.selectedTarMapping.displayValues = [ props.modelObjects[ props.plain[ idxTar ] ].props.object_name.uiValues[ 0 ] ];
                        data.selectedTarMapping.newDisplayValues = [ props.modelObjects[ props.plain[ idxTar ] ].props.object_name.uiValues[ 0 ] ];
                    }
                }
                listModelstrg.push( listModeltrg );
            }
        }
        listModelstrg.sort( function( a, b ) { return a.propDisplayValue > b.propDisplayValue ? 1 : b.propDisplayValue > a.propDisplayValue ? -1 : 0; } );
        data.mappingListTar = listModelstrg;
    }
    return listModels;
}

/* DISABLING THIS FOR NOW search is not a requirement yet but might be in the future.
exports.callSearchPanel = function(srcOrg, src, trg, uwDataProvider, inputType, searchString){
    
    var deferred = AwPromiseService.instance.defer();

    var srcInfo = srcOrg;
    if(srcInfo === undefined){
        srcInfo = src;
    }

    if(trg === undefined){
        trg = "";
    }

    var soaInput = _getSearchPanelInput(src, trg, uwDataProvider.startIndex, 40, inputType, searchString);

    soaSvc.postUnchecked( 'Internal-GlobalMultiSite-2018-11-Briefcase', 'getBriefcasePreviewData', soaInput ).then(
        function(  ) {
            //   ^ response
            return deferred.promise;
            //_handlePerformBriefcasePagingResponse( response, listLoadInput, deferred, data);
        }, function( error ) {
            deferred.reject( error );
        } );
};***/

/**
 * @param {*} source - The UID of the original briefcase
 * @param {*} target - The UID of the target briefcase
 * @param {*} startIndex - The index to determine which page to load information from
 * @param {*} pageSize - The number of objects that should be returned in a page.
 * @param {*} panelCompType - The type of comparison that we are using to search for (unchanged, changed, added, deleted)
 * @param {*} search - The value to search for, supporting ID first
 * 
 * @return {*} A json object to be sent to the SOA as inputs.
 */
/* DISABLING THIS FOR NOW search is not a requirement yet but might be in the future.
function _getSearchPanelInput(source, target, startIndex, pageSize, panelCompType, search ){
    return {
        "oldBriefcaseFMSTicket" : "",
        "oldBriefcaseUID": String(source),
        "newBriefcaseFMSTicket": "",
        "newBriefcaseUID": String(target),
        "optionNamesAndValues": [
            { "elementName" : "isThinClient", "elementValues" : ["true"] },
            { "elementName" : "startIndex" , "elementValues" : [String(startIndex)] },
            { "elementName" : "pageSize" , "elementValues" : [String(pageSize)] },
            { "elementName" : "comparepaneltype", "elementValues" : [String(panelCompType)] },
            { "elementName" : "searchvalue", "elementValues" : [String(search)] }
        ]
    };
} */

/**
 * Get a page of row data for a 'tree' table.
 * 
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 * 
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 * 
 * @param {String} srcUID - The UID of the original briefcase
 * @param {String} trgUID - The UID of the briefcase being compared to
 * @param {String} SearchedUID - The UID of the briefcase that is being opened and 
 * @param {String} src_map_uid - The UID of the transfer option set used to map the source briefcase
 * @param {String} tar_map_uid - The UID of the transfer option set used to map the target briefcase
 * 
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTablePage = function( treeLoadInput, srcUID, trgUID, SearchedUID, src_map_uid, tar_map_uid ) {
    /**
     * Check the validity of the parameters
     */
    if( trgUID === '' ) { trgUID = null; }
    if( tar_map_uid === '' ) { tar_map_uid = null; }
    if( SearchedUID === '' ) { SearchedUID = null; }
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    //Grab the start index from the tree input
    if( treeLoadInput ) {
        _startIndex = treeLoadInput.startChildNdx;
    }

    //Get the child nodes and recreate the tree structure.
    _buildTreeTableStructurePaging( treeLoadInput.parentNode, deferred, treeLoadInput, srcUID, trgUID, SearchedUID, '', '', src_map_uid, tar_map_uid );
    return deferred.promise;
};

/**
 * @param {ViewModelTreeNode} parentNode - A node that acts as 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {String} src - The UID of the original briefcase
 * @param {String} trg - The UID of the briefcase being compared to
 * @param {String} Searched - The UID of the briefcase that is being opened and viewed
 * @param {*} data - DeclarativeViewModel that holds information about the page state
 * @param {String} gridName - The name of the grid that is being loaded used to change the state of the top line to expanded
 * @param {String} src_map_uid - The UID of the transfer option set used to map the source briefcase
 * @param {String} tar_map_uid - The UID of the transfer option set used to map the target briefcase
 */
function _buildTreeTableStructurePaging( parentNode, deferred, treeLoadInput, src, trg, Searched, data, gridName, src_map_uid, tar_map_uid ) {
    //If the parent level isn't the root node then we need to create a fake parent for this root node.
    treeLoadInput.parentElement = parentNode.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : parentNode.id;
    treeLoadInput.displayMode = 'Tree';

    //Create the structure of attributes to be sent to the SOA
    var soaInput = _getPerformBriefcasePagingInput( src, trg, Searched, treeLoadInput.parentElement, _startIndex, treeLoadInput.pageSize, src_map_uid, tar_map_uid );

    //Call the SOA and handle the response.
    soaSvc.postUnchecked( 'Internal-GlobalMultiSite-2018-11-Briefcase', 'getBriefcasePreviewData', soaInput ).then(
        function( response ) {
            _handlePerformBriefcasePagingResponse( response, treeLoadInput, deferred, data, gridName );
        },
        function( error ) {
            deferred.reject( error );
        } );
}

/**
 * 
 * @param {*} source - The UID of the original briefcase
 * @param {*} target - The UID of the target briefcase
 * @param {*} SearchedBczUID - The UID of the briefcase that is being opened and viewed
 * @param {*} parentUID - The UID of the parent that is requesting information for its children
 * @param {*} startIndex - The index to determine which page to load information from
 * @param {*} pageSize - The number of objects that should be returned in a page.
 * @param {String} src_map_uid - The UID of the transfer option set used to map the source briefcase
 * @param {String} tar_map_uid - The UID of the transfer option set used to map the target briefcase
 * 
 * @return {*} A json object to be sent to the SOA as inputs.
 */
function _getPerformBriefcasePagingInput( source, target, SearchedBczUID, parentUID, startIndex, pageSize, src_map_uid, tar_map_uid ) {
    var parObjUID = parentUID;
    var loc_src_map_uid = src_map_uid;
    if( loc_src_map_uid === null ) {
        loc_src_map_uid = '';
    }

    var loc_tar_map_uid = tar_map_uid;
    if( loc_tar_map_uid === null ) {
        loc_tar_map_uid = '';
    }
    //If the parent node is the fake node option then we send nothing as the parent to the SOA
    //The SOA will then understand that this means that we want to get the root node object.
    if( parentUID === 'AAAAAAAAAAAAAA' ) {
        parObjUID = '';
    }
    if( SearchedBczUID && source && target ) {
        return {
            oldBriefcaseFMSTicket: '',
            oldBriefcaseUID: String( source ),
            newBriefcaseFMSTicket: '',
            newBriefcaseUID: String( target ),
            optionNamesAndValues: [
                { elementName: 'bczUID', elementValues: [ String( SearchedBczUID ) ] },
                { elementName: 'isThinClient', elementValues: [ 'true' ] },
                { elementName: 'parentId', elementValues: [ String( parObjUID ) ] },
                { elementName: 'startIndex', elementValues: [ String( startIndex ) ] },
                { elementName: 'pageSize', elementValues: [ String( pageSize ) ] },
                {
                    elementName: 'transferOptSetForMapping',
                    elementValues: [ String( source ) + ':' + String( loc_src_map_uid ) + '|' + String( target ) + ':' + String( loc_tar_map_uid ) ]
                }
            ]
        };
    }
    return {
        oldBriefcaseFMSTicket: '',
        oldBriefcaseUID: String( source ),
        newBriefcaseFMSTicket: '',
        newBriefcaseUID: '',
        optionNamesAndValues: [
            { elementName: 'isThinClient', elementValues: [ 'true' ] },
            { elementName: 'parentId', elementValues: [ String( parObjUID ) ] },
            { elementName: 'startIndex', elementValues: [ String( startIndex ) ] },
            { elementName: 'pageSize', elementValues: [ String( pageSize ) ] },
            {
                elementName: 'transferOptSetForMapping',
                elementValues: [ String( source ) + ':' + String( loc_src_map_uid ) ]
            }
        ]
    };
}

/**
 * @param {*} object - Any object (typically an array) to see if it has information in it.
 * 
 * @returns {boolean} A boolean on if the object has information
 */
function _isArrayPopulated( object ) {
    var isPopulated = false;
    if( object && object.length > 0 ) {
        isPopulated = true;
    }
    return isPopulated;
}

/**
 * 
 * @param {*} response - The response given back from the SOA call containing information
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {*} data - DeclarativeViewModel that holds information about the page state
 * @param {String} gridID - The name of the grid that is being loaded used to change the state of the top line to expanded
 * 
 */
function _handlePerformBriefcasePagingResponse( response, treeLoadInput, deferred, data, gridID ) {
    //An array of children objects
    if( data === '' ) {
        data = null;
    }
    if( gridID === '' ) {
        gridID = null;
    }
    if( data ) {
        data.loading = false;
    }

    if( response.ServiceData ) {
        if( response.ServiceData.partialErrors ) {
            //In compare mode 
            if( AwStateService.instance.params.src_uid && response.deltaBriefcasePreviewFMSTicket ) {
                if( AwStateService.instance.params.src_uid === response.deltaBriefcasePreviewFMSTicket ) {
                    deferred.reject( response.ServiceData.partialErrors[ 0 ].errorValues[
                        response.ServiceData.partialErrors[ 0 ].errorValues.length - 1 ].message );
                }
            }
            //One Viewer Mode
            if( AwStateService.instance.params.src_uid && !AwStateService.instance.params.trg_uid ) {
                deferred.reject( response.ServiceData.partialErrors[ 0 ].errorValues[
                    response.ServiceData.partialErrors[ 0 ].errorValues.length - 1 ].message );
            }
            //In preview mode
            if( !AwStateService.instance.params.src_uid ) {
                deferred.reject( response.ServiceData.partialErrors[ 0 ].errorValues[
                    response.ServiceData.partialErrors[ 0 ].errorValues.length - 1 ].message );
            }
        }
    }

    var proxyObjects = [];

    //The properties from the response
    var responseProps;

    //If there exists data in the ticket then we parse the JSON for objects.
    if( response.oldBriefcasePreviewDataFMSTicket ) {
        var searchResults = parsingUtils.parseJsonString( response.oldBriefcasePreviewDataFMSTicket );
        if( searchResults && _isArrayPopulated( searchResults.objects ) ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                proxyObjects.push( searchResults.objects[ x ] );
            }
        }
    }

    response.totalLoaded = proxyObjects.length;

    var endReached = true;
    if( response.oldBriefcasePreviewData.length >= 1 ) {
        if( response.oldBriefcasePreviewData[ 0 ].elementValues ) {
            responseProps = parsingUtils.parseJsonString( response.oldBriefcasePreviewData[ 0 ].elementValues[ 0 ] );
        }
    }
    //If the properties exist we check for the end reached to see if we need to load more pages.
    if( responseProps ) {
        endReached = responseProps.endReach;
    }

    treeLoadInput.parentNode.cursorObject = {
        startReached: true,
        endReached: endReached
    };

    //After getting all the information we process the children objects.
    var treeLoadResult = processProviderResponse( treeLoadInput, proxyObjects, true, endReached, data, gridID );

    deferred.resolve( {
        treeLoadResult: treeLoadResult
    } );
}

/**
 * 
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {*} objectResults - The objects that were returned by the SOA 
 * @param {*} startReached  - If the start of the set of the pages was reached (if false load the previous page)
 * @param {*} endReached  - If the end of the set of pages was reached (if false load the next page)
 * @param {*} data - DeclarativeViewModel that holds information about the page state
 * @param {String} gridIDName - The name of the grid that is being loaded used to change the state of the top line to expanded
 * 
 * @returns {treeLoadResult} The result of the tree being loaded.
 */
function processProviderResponse( treeLoadInput, objectResults, startReached, endReached, data, gridIDName ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    // Create the next level for the children objects.
    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];

    //Create nodes for each child 
    for( var childNdx = 0; childNdx < objectResults.length; childNdx++ ) {
        var object = objectResults[ childNdx ];
        var vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );

        if( vmNode ) {
            if( levelNdx === 0 ) {
                if( data ) {
                    awTableStateSvc.saveRowExpanded( data, gridIDName, vmNode );
                }
            }
            vmNodes.push( vmNode );
        }
    }

    //Build the tree after getting all the necessary nodes.
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached, endReached, null );
}

/**
 * 
 * @param {*} obj - The object which contains information about the row that should be created;
 * @param {*} childNdx - The child's index number relative to the parent object.
 * @param {*} levelNdx - At what level the next object should appear at (should always be one more than the parent)
 * 
 * @returns {vmNode} The vmnode that was created.
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx ) {
    //Get the attributes from the object that we need.
    var displayName = obj.displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var isLeaf = obj.is_leaf;
    var iconURL = null;
    if( !displayName ) {
        //If a display name isn't applicable we use the object_id
        displayName = obj.props.object_id;
        //If the object id isn't found we use the UID.
        if( !displayName ) {
            displayName = obj.uid;
        }
    }

    //Get the object image based on the object type.
    if( objType ) {
        iconURL = iconSvc.getTypeIconURL( objType );
    }
    var vmNode = awTableSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );
    //If a node is a leaf then it has no children. If it isn't a leaf then it has children.
    vmNode.isLeaf = isLeaf !== '0';
    vmNode._childObj = obj;
    if( obj.status ) {
        if( obj.status === '1' ) {
            //Blue -- item was added 
            vmNode.colorTitle = 'Unique';
            vmNode.cellDecoratorStyle = 'aw-border-chartColor2';
            vmNode.gridDecoratorStyle = 'aw-charts-chartColor2';
        }
        if( obj.status === '3' ) {
            //Yellow -- item was changed
            vmNode.colorTitle = 'Different';
            vmNode.cellDecoratorStyle = 'aw-charts-chartColor4';
            vmNode.gridDecoratorStyle = 'aw-charts-chartColor4';
        }
        if( obj.status === '2' ) {
            //Red -- item was deleted.
            vmNode.colorTitle = 'Unique';
            vmNode.cellDecoratorStyle = 'aw-border-chartColor6';
            vmNode.gridDecoratorStyle = 'aw-charts-chartColor6';
        }
    }

    //Populate the columns for the rows.
    _populateColumns( _treeTableColumnInfos, true, vmNode );

    return vmNode;
}

/**
 * Get a page of row data for a 'tree' table.
 * 
 * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
 *            function is invoked from. The object is usually the result of processing the 'inputData' property
 *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
 *            properties on this object is used (if defined).
 * 
 * @return {Promise} A Promise that will be resolved with a Properties object when the requested data is
 *         available.
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var propertyLoadInput;

    var delayTimeProperty = 0;

    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( awTableSvc.isPropertyLoadInput( arg ) ) {
            propertyLoadInput = arg;
        } else if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeProperty' ) {
            delayTimeProperty = arg.dbValue;
        }
    }

    var deferred = AwPromiseService.instance.defer();

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( delayTimeProperty > 0 ) {
        _.delay( _loadProperties, delayTimeProperty, deferred, propertyLoadInput );
    } else {
        _loadProperties( deferred, propertyLoadInput );
    }

    return deferred.promise;
};

export default exports = {
    loadTreeTableColumns,
    onClickLoadButton,
    loadTreeTableDataPaging,
    getTransferOptionSets,
    loadTreeTablePage,
    loadTreeTableProperties
};
/**
 * @memberof NgServices
 * @member bbrowserTableDataService
 */
app.factory( 'bbrowserTableDataService', () => exports );
