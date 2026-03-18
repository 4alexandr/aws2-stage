// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchFolderCommonService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/preferenceService';
import soaService from 'soa/kernel/soaService';
import AwStateService from 'js/awStateService';
import $state_ from 'js/awStateService';

var AWP0_SEARCH_FOLDER = 'Awp0SearchFolder';
var SEARCH_FOLDER = 'searchFolder';

var policyIOverride = {
    types: [ {
            name: AWP0_SEARCH_FOLDER,
            properties: [ {
                name: 'awp0SearchDefinition',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            }, {
                name: 'awp0SearchType'
            }, {
                name: 'awp0CanExecuteSearch'
            }, {
                name: 'awp0Rule'
            } ]
        },
        {
            name: 'ReportDefinition',
            properties: [ {
                name: 'rd_parameters'
            }, {
                name: 'rd_param_values'
            }, {
                name: 'rd_source'
            } ]
        }
    ]
};

/**
 * add folder
 * @function addActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderName - searchFolderName
 * @param {STRING} searchFolderDescription - searchFolderDescription
 */
export let addActiveFolder = function( parentFolderUID, searchFolderName, searchFolderDescription ) {
    var searchFoldersInputArr = [];
    var searchFolderInput = {};

    searchFolderInput.parentFolderUID = parentFolderUID;
    searchFolderInput.searchFolderUID = '';
    searchFolderInput.reportDefinitionUID = '';
    searchFolderInput.searchFolderAttributes = {
        searchFolderName: searchFolderName,
        searchFolderDescription: [ searchFolderDescription ? searchFolderDescription : '' ]
    };
    searchFolderInput.searchCriteria = [];
    searchFoldersInputArr.push( searchFolderInput );
    exports.addObjectToSearchFolderInt( searchFoldersInputArr, true );
};

/**
 * edit folder
 * @function editActiveFolder
 * @param {STRING} parentFolderUID - parent folder uid
 * @param {STRING} searchFolderUID - searchFolderUID
 * @param {STRING} reportDefinitionUID - reportDefinitionUID
 * @param {Object} searchCriteria - searchCriteria
 */
export let editActiveFolder = function( parentFolderUID, searchFolderUID, reportDefinitionUID, searchCriteria ) {
    var searchFoldersInputArr = [];
    var searchFolderInput = {};

    searchFolderInput.parentFolderUID = parentFolderUID;
    searchFolderInput.searchFolderUID = searchFolderUID;
    searchFolderInput.reportDefinitionUID = reportDefinitionUID;
    searchFolderInput.searchCriteria = searchCriteria;
    searchFoldersInputArr.push( searchFolderInput );
    exports.addObjectToSearchFolderInt( searchFoldersInputArr, false );
};

/**
 * Add active folder silently
 * @function addObjectToSearchFolderInt
 * @param {Object} searchFoldersInputArr - searchFoldersInputArr
 * @param {BOOLEAN} isAdd - true if add folder
 */
export let addObjectToSearchFolderInt = function( searchFoldersInputArr, isAdd ) {
    var createdd_uids;

    //Get Current Url states for s_udi and d_uid
    var currentSuid = AwStateService.instance.params.s_uid;
    var currentduids = AwStateService.instance.params.d_uids;
    //SOA
    soaService.post( 'Internal-Search-2020-12-SearchFolder', 'createOrEditSearchFolders', {
        input: searchFoldersInputArr
    }, policyIOverride ).then(
        function( response ) {
            if( isAdd ) {
                //Parse SOA Response for created uid
                var createdSearchFolderuid = response.searchFolders[ 0 ].searchFolder.uid;
                var createdSuid = createdSearchFolderuid + ',' + currentSuid;
                var searchfolder = { createdSearchFolderuid };

                //Get Home Folder uid from last suid
                var homeFolderUid = createdSuid.substr( createdSuid.length - 14 );

                appCtxService.updatePartialCtx( SEARCH_FOLDER, searchfolder );

                //Check if d_uids existed for parent object
                //If they did not set parent folder uid
                //If they did add parent folder uid to end of duids string
                if( currentduids === null ) {
                    createdd_uids = searchFoldersInputArr[ 0 ].parentFolderUID;
                } else {
                    createdd_uids = currentduids + '%5E' + searchFoldersInputArr[ 0 ].parentFolderUID;
                }

                //Go to new state
                $state_.instance.go( '.', {
                    d_uids: createdd_uids,
                    s_uid: createdSuid,
                    uid: homeFolderUid
                } );
            } else {
                eventBus.publish( 'primaryWorkarea.reset' );
                eventBus.publish( 'searchFolder.update' );
            }
        }
    );
};

const exports = {
    addActiveFolder,
    editActiveFolder,
    addObjectToSearchFolderInt
};

export default exports;

/**
 * @memberof NgServices
 * @member searchFolderCommonService
 */
app.factory( 'searchFolderCommonService', () => exports );
