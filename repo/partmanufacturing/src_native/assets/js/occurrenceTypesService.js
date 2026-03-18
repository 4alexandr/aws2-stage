//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occurrenceTypesService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import editService from 'js/editHandlerService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

var exports = {};

/**
 * Loads occurrence types from server using SOA. Caches the occurrence types in Part Mfg context. 
 *
 * @param {Object} parentItemRev
 * @param {Object} sourceVMOs
 */
export let loadOccTypesInfo = function (parentItemRev, sourceVMOs) {
    var deferred = AwPromiseService.instance.defer();

    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var sourceElements = [];

    var itemTypeOccTypesMap = partMfgCtx.itemTypeOccTypesMap;
    var itemTypeDefOccTypeMap = partMfgCtx.itemTypeDefOccTypeMap;

    // Check if map contains all input source object types and create list accordingly

    _.forEach(sourceVMOs, function (sourceVMO) {

        var awb0UnderlyingType = sourceVMO.props.awb0UnderlyingObjectType.dbValues[0];

        var occTypeNames = itemTypeOccTypesMap[awb0UnderlyingType];

        var defOccType = itemTypeDefOccTypeMap[awb0UnderlyingType];

        if( !occTypeNames || occTypeNames.length === 0 || !defOccType) {
            sourceElements.push(cdm.getObject(sourceVMO.uid));
        }
    });

    // Call the SOA only if map is not already populated for all source objects

    if(sourceElements.length > 0) {
        var requestPref = {};
        requestPref.useMEDisplayOccurrenceTypePref = ['true'];
        var soaInput = {
            inputData: {
                parentObject: parentItemRev,
                sourceObjects: sourceElements,
                requestPref: requestPref
            }
        };
    
        return soaSvc.postUnchecked('Internal-ActiveWorkspaceBom-2020-12-OccurrenceManagement', 'getAllowedOccurrenceTypes', soaInput).then(function (response) {
    
            if (!_.isEmpty(response.occTypeInfo.srcObjectOccTypesMap)) {
    
                var srcObjectOccTypesMap = new Map();
                var srcObjectDefOccTypeMap = new Map();
                for (var indx = 0; indx < response.occTypeInfo.srcObjectOccTypesMap[0].length; indx++) {
                    var sourceUid = response.occTypeInfo.srcObjectOccTypesMap[0][indx].uid;
                    var occTypeNamesValue = response.occTypeInfo.srcObjectOccTypesMap[1][indx];
                    srcObjectOccTypesMap.set(sourceUid, occTypeNamesValue);
                }

                for (var indy = 0; indy < response.occTypeInfo.srcObjectDefaultOccTypeMap[0].length; indy++) {
                    var sourceUid = response.occTypeInfo.srcObjectDefaultOccTypeMap[0][indy].uid;
                    var defOccTypeName = response.occTypeInfo.srcObjectDefaultOccTypeMap[1][indy];
                    srcObjectDefOccTypeMap.set(sourceUid, defOccTypeName);
                }
    
                _.forEach(sourceElements, function (sourceElem) {
                    var awb0UnderlyingType = sourceElem.props.awb0UnderlyingObjectType.dbValues[0];
                    var occTypeNames = srcObjectOccTypesMap.get(sourceElem.uid);
                    var defOccType = srcObjectDefOccTypeMap.get(sourceElem.uid);
                    itemTypeOccTypesMap[awb0UnderlyingType] = occTypeNames;
                    itemTypeDefOccTypeMap[awb0UnderlyingType] = defOccType;
                });
                appCtxSvc.updatePartialCtx( "PartMfg.itemTypeOccTypesMap", itemTypeOccTypesMap );
                appCtxSvc.updatePartialCtx( "PartMfg.itemTypeDefOccTypeMap", itemTypeDefOccTypeMap );
            }
        }, function (error) {
            throw soaSvc.createError(error);
        });
    }
    deferred.resolve();
    return deferred.promise;
};

/**
 * Loads occurrence types in the dropdown of the table cell. 
 *
 * @param {Object} awb0OccTypeProp
 */
export let loadOccTypes = function( awb0OccTypeProp )
{
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );

    var selectedObj = cdm.getObject(awb0OccTypeProp.parentUid);

    var underlyingObjType = selectedObj.props.awb0UnderlyingObjectType.dbValues[0];

    var occTypeNames = partMfgCtx.itemTypeOccTypesMap[underlyingObjType];

    var lovEntries = [];
    if(occTypeNames)
    {
        for (var idx = 0; idx < occTypeNames.length; idx ++) 
        {
            var uid = "occtype"+idx;
            var lovEntry = {
                propInternalValue: occTypeNames[idx].internalName,
                propDisplayValue: occTypeNames[idx].displayName,
                sel: awb0OccTypeProp.uiValues[0] === occTypeNames[idx].displayName
            };
            lovEntries.push( lovEntry );
        }
    }
    var response = {
        "totalFound" : lovEntries.length,
        "searchResults" : lovEntries,
        "endIndex" : lovEntries.length-1
    };

    return response;
};

export let validateOccType = function( awb0OccTypeProp ) {
    // Do nothing
};

/**
 * Allows setting occurrence type from Summary Page within Part Manufacturing sub-location.
 *
 * @param {Object} context
 */
export let updateHandlerAndStartEdit = function( context ) {
    var parentItemRev = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    var editHandler = editService.getEditHandler( context );
    if( editHandler ) {
        var dataSource = editHandler.getDataSource();
        var viewModelObjectList = dataSource.getLoadedViewModelObjects();
        if( viewModelObjectList !== null ) {
            exports.loadOccTypesInfo( parentItemRev, viewModelObjectList).then(
                function( response ) {
                    exports.attachOccTypesLOV(parentItemRev, viewModelObjectList);
                } );
        }
        editHandler.startEdit();
    }
};

/**
 * Updates the viewmodel object from handlers' datasource to attach occurrence type LOV for Summary Page. 
 *
 * @param {Object} parentItemRev
 * @param {Object} sourceVMOs
 */
export let attachOccTypesLOV = function( parentItemRev, sourceVMOs  ) {
    var partMfgCtx = appCtxSvc.getCtx( 'PartMfg' );
    _.forEach( sourceVMOs, function( sourceVMO ) {
        var awb0UnderlyingType = sourceVMO.props.awb0UnderlyingObjectType.dbValues[0];
        var occTypeNames = partMfgCtx.itemTypeOccTypesMap[awb0UnderlyingType];
        var awb0OccTypeProp = sourceVMO.props.awb0OccType;
        awb0OccTypeProp.hasLov = true;
        awb0OccTypeProp.isSelectOnly = true;
        awb0OccTypeProp.isEditable = true; 
        awb0OccTypeProp.emptyLOVEntry = true;
    
        awb0OccTypeProp.lovApi = {};
        awb0OccTypeProp.lovApi.getInitialValues = function( filterStr, deferred ) {
            var lovEntries = [];
            for (var idx = 0; idx < occTypeNames.length; idx ++) {
                let lovEntry = {
                    propDisplayValue: occTypeNames[idx].displayName,
                    propInternalValue: occTypeNames[idx].internalName,
                    propDisplayDescription: '',
                    hasChildren: false,
                    children: {},
                    sel: awb0OccTypeProp.uiValues[ 0 ] === occTypeNames[idx].displayName,
                    disabled: false
                };
                lovEntries.push( lovEntry );
            }
            return deferred.resolve( lovEntries );
        };
    
        awb0OccTypeProp.lovApi.getNextValues = function( deferred ) {
            deferred.resolve( null );
        };
        awb0OccTypeProp.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
            // Either return a promise or don't return anything. In this case, we don't want to return anything
        };
    } );
};

/**
 * Occurrence Type service
 */
export default exports = {
    loadOccTypesInfo,
    loadOccTypes,
    validateOccType,
    updateHandlerAndStartEdit,
    attachOccTypesLOV
};
app.factory( 'occurrenceTypesService', () => exports );
