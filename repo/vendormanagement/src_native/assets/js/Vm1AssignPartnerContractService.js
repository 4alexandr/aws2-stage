// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Vm1AssignPartnerContractService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import awColumnSvc from 'js/awColumnService';
import _editHandlerService from 'js/editHandlerService';
import listBoxService from 'js/listBoxService';
import _lovService from 'js/lovService';
import msgSvc from 'js/messagingService';
import _t from 'js/splmTableNative';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import dmSvc from 'soa/dataManagementService';
import clientDataModel from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';

var exports = {};
var saveHandler = {};
/**
 * check security of group
 */
export let checkGroupSecurityOfUser = function() {
    var groupUid = appCtxSvc.ctx.userSession.props.group.dbValues[ 0 ];
    var uidsToLoad = [ groupUid ];
    // Get the ga property on group member
    dmSvc.getProperties( uidsToLoad, [ 'security' ] ).then( function() {
        var groupObject = clientDataModel.getObject( groupUid );
        var isGroupExternal = false;
        // Check if group  object is not null and security property is there
        if( groupObject && groupObject.props.security && groupObject.props.security.dbValues ) {
            isGroupExternal = groupObject.props.security.dbValues[ 0 ] === 'External';
        }
        appCtxSvc.registerCtx( 'vm1IsGroupExternal', isGroupExternal );
    } );
};

/**
 * Get approved vendors
 * @param {Object} data data
 */
export let getApprovedVendorsList = function( data ) {
    if( data.approvedVendorsInput ) {
        var results = [];
        var approvedVendors = [];
        results = data.approvedVendorsInput.objects;
        if( results.length > 0 ) {
            results.forEach( function( vendorObj ) {
                approvedVendors.push( vendorObj );
            } );
        }
        // eslint-disable-next-line sonarjs/no-duplicate-string
        data.approvedVendorsValues = listBoxService.createListModelObjects( approvedVendors, 'props.object_string' );
    }
};

/**
 * Get active partner contracts
 * @param {Object} data data
 */
export let getActivePartnerContracts = function( data ) {
    if( data.partnerContractsOfSelectedVendor ) {
        var results = [];
        var partnerContractsOfSelectedVendor = [];
        results = data.partnerContractsOfSelectedVendor.objects;
        if( results.length > 0 ) {
            results.forEach( function( vendorObj ) {
                partnerContractsOfSelectedVendor.push( vendorObj );
            } );
        }
        data.activePartnerContractValues = createListModelObjectsWithBlankSelection( partnerContractsOfSelectedVendor, 'props.object_string' );
    }
};

/**
 * Get Product List LOV
 * @param {Object} data Data
 */
export let getProductListLOV = function( data ) {
    if( data.viewModelRows ) {
        var results = data.viewModelRows;
        var productLOV = [];
        productLOV[ 0 ] = {};
        if( results.length > 0 ) {
            results.forEach( function( productObj ) {
                var Products = [];
                Products.push( productObj.modelObject );
                var LOV = listBoxService.createListModelObjects( Products, 'props.object_string' );
                var desc = '';
                var uid = null;
                if( productObj.viewModelProperties.length > 0 ) {
                    var logicalViewModelProperty = productObj.viewModelProperties[ 0 ];
                    desc = logicalViewModelProperty.propUIValue;
                    uid = logicalViewModelProperty.propDBValue;
                }
                LOV[ 0 ].propDisplayDescriptionValue = uid;
                LOV[ 0 ].propDisplayDescription = desc;
                productLOV = productLOV.concat( LOV );
            } );
        }
        appCtxSvc.registerCtx( 'productLOV', productLOV );
    }
};

/**
 * Add empty entry in the list of model object so that blank entry is seen in drop down
 *
 * @param {ObjectArray} objArray List of model objects to which blank entry needs to be added
 * @param {String} path The property which needs to be read from model object while displaying values in drop
 *            down.
 * @return {ObjectArray} The list of input model objects with blank entry in the beginning
 */
export let createListModelObjectsWithBlankSelection = function( objArray, path ) {
    var outObjectArray;
    if( objArray ) {
        objArray.splice( 0, 0, ' ' );
        outObjectArray = objArray;
    } else {
        outObjectArray = [ ' ' ];
    }
    return listBoxService.createListModelObjects( outObjectArray, path );
};

/**
 * Process Preferred Status Values.
 *
 * @param {Object} response The soa response
 * @param {Object} data Data
 */
export let processPreferredStatus = function( response, data ) {
    var statusInternalValues = [];
    var statusValues = [];
    var statusDescriptions = [];
    for( var i = 0; i < response.lovValues.length; i++ ) {
        statusInternalValues[ i ] = response.lovValues[ i ].propInternalValues.lov_values[ 0 ];
        statusValues[ i ] = response.lovValues[ i ].propDisplayValues.lov_values[ 0 ];
        statusDescriptions[ i ] = response.lovValues[ i ].propDisplayValues.lov_value_descriptions[ 0 ];
    }

    var statusLOV = listBoxService.createListModelObjectsFromStrings( statusValues );
    for( var j = 0; j < statusValues.length; j++ ) {
        statusLOV[ j ].propInternalValue = statusInternalValues[ j ];
        statusLOV[ j ].propDisplayDescriptionValue = statusDescriptions[ j ];
        statusLOV[ j ].propDisplayDescription = statusDescriptions[ j ];
    }
    data.preferredStatusValues = statusLOV;
};

/** Process columns for table
 * @param {Object} uwDataProvider data provider
 * @param {Array} columnInfos Column Infos
 * @returns {Array} column defs
 */
export let processColumns = function( uwDataProvider, columnInfos ) {
    var _columnDefs = [];
    _columnDefs = [];
    _.forEach( columnInfos, function( columnInfo ) {
        var newCol = awColumnSvc.createColumnInfo();
        newCol.displayName = columnInfo.propDisplayName;
        newCol.name = columnInfo.propInternalName;
        newCol.width = columnInfo.columnWidth;
        newCol.typeName = columnInfo.typeName;
        newCol.visible = columnInfo.isDisplayed;
        newCol.propertyName = columnInfo.propInternalName;
        newCol.hiddenFlag = !columnInfo.isDisplayed;
        newCol.enablePinning = true;
        if ( columnInfo.objectTypeName.includes( 'Date' ) || columnInfo.propInternalName.includes( 'date' ) ) {
            newCol.dataType = 'Date';
        }
        newCol.isFilteringEnabled = true;
        newCol.enableSorting = true;
        newCol.enableCellEdit = false;

        _columnDefs.push( newCol );
    } );
    uwDataProvider.columnConfig = {
        columns: _columnDefs
    };
    return _columnDefs;
};

/**
 * Get sort criteria input
 * @param {Object} inputSortCriteria input sort criteria
 * @returns{Object} input for sort SOA
 */
export let getSortCriteria = function( inputSortCriteria ) {
    var sortCriteria = [];
    if ( inputSortCriteria === undefined || inputSortCriteria.length === 0 ) { return sortCriteria; }
    var sortObj = {};
    sortObj.fieldName = inputSortCriteria[0].fieldName;
    if ( inputSortCriteria[0].sortDirection === 'ASC' ) {
        sortObj.isAscending = true;
    } else {
        sortObj.isAscending = false;
    }
    sortCriteria.push( sortObj );
    return sortCriteria;
};

/**
 * Get rows from response
 * @param {Object} response Response Object
 * @returns {Array} view model rows
 */
export let getRowsFromResponse = function( response ) {
    return response.viewModelRows;
};

/**
 * Mark all properties non-modifiable
 * @param {Object} displayRow Row of table
 * @param {Array} realProperties Real properties of object
 * @returns {Object}  changed display row
 */
let markPropsNonEditable = function( displayRow, realProperties ) {
    var propsArray = Object.values( displayRow.props );
    for ( var m = 0; m < propsArray.length; m++ ) {
        if ( realProperties.includes( propsArray[m].propertyName ) ) {
            var columnInTable = uwPropertySvc.createViewModelProperty(
                propsArray[m].propertyName, propsArray[m].propertyDisplayName,
                propsArray[m].type, propsArray[m].dbValue, propsArray[m].displayValues );
            uwPropertySvc.setIsPropertyModifiable( columnInTable, false );
            uwPropertySvc.setIsEditable( columnInTable, false );
            displayRow.props[columnInTable.propertyName] = columnInTable;
        }
    }
    return displayRow;
};

/**
 * Check if row needs to be included in the table
 * @param {Object} inputRow Row from table
 * @returns {boolean} true if row needs to be include or false
 */
let checkRowToInclude = function( inputRow ) {
        //collect all internal names of logical properties first
        var propInternalNames = [];
        for( var j = 0; j < inputRow.viewModelProperties.length; j++ ) {
            propInternalNames.push( inputRow.viewModelProperties[ j ].propInternalName );
        }
        var addRowInTable = true;

        //Show removed partner contracts only if red line mode is ON
    // eslint-disable-next-line sonarjs/no-collapsible-if
        if( propInternalNames.includes( 'vm1_isPCRemoved' ) ) {
            if( appCtxSvc.ctx.isRedLineMode === 'false' || appCtxSvc.ctx.isRedLineMode === undefined ) {
                addRowInTable = false;
            }
        }
    return addRowInTable;
};

/**
 * Get view model rows
 * @param {Object} response Soa response
 * @param {Object} dataProvider data Provider
 * @returns {Array} rows to display
 */
export let getViewModelRows = function( response, dataProvider ) {
    var displayedRows = [];
    let propBoParentMap = new Map();

    var realProperties = [];
    for ( var index = 0; index < dataProvider.columnConfig.columns.length; index++ ) {
        realProperties.push( dataProvider.columnConfig.columns[index].name );
    }

    _.forEach( response.viewModelRows, function( inputRow ) {
        var addRowInTable = checkRowToInclude( inputRow );
        if( addRowInTable ) {
            var displayRow = viewModelObjectSvc
                .constructViewModelObjectFromModelObject( inputRow.modelObject, 'Edit' );
                displayRow = markPropsNonEditable( displayRow, realProperties );
            for( var i = 0; i < inputRow.viewModelProperties.length; i++ ) {
                var logicalViewModelProperty = inputRow.viewModelProperties[ i ];
                var displayedLogicalProp = uwPropertySvc.createViewModelProperty(
                    logicalViewModelProperty.propInternalName, logicalViewModelProperty.propDisplayName,
                    logicalViewModelProperty.propDataType, logicalViewModelProperty.propDBValue, [ logicalViewModelProperty.propUIValue ], logicalViewModelProperty.propParentBo );

                    if( !logicalViewModelProperty.hasLOV ) {
                    uwPropertySvc.setIsPropertyModifiable( displayedLogicalProp, false );
                } else {
                    uwPropertySvc.setIsPropertyModifiable( displayedLogicalProp, true );
                }
                uwPropertySvc.setIsEditable( displayedLogicalProp, logicalViewModelProperty.isEditable );
                uwPropertySvc.setHasLov( displayedLogicalProp, logicalViewModelProperty.hasLOV );
                if( logicalViewModelProperty.propParentBO.type === 'Vm0PrtnrAssignmentRow' ) {
                    propBoParentMap.set( inputRow.modelObject.uid, logicalViewModelProperty.propParentBO );
                    displayedLogicalProp.parentUid = logicalViewModelProperty.propParentBO;
                }

                displayedLogicalProp.dbValues = [ logicalViewModelProperty.propDBValue ];
                if( logicalViewModelProperty.hasLOV ) {
                    if( logicalViewModelProperty.lovValueProvider !== undefined ) {
                        displayedLogicalProp.dataProvider = logicalViewModelProperty.lovValueProvider;
                    } else {
                        _lovService.initNativeCellLovApi( displayedLogicalProp, null, 'Edit', logicalViewModelProperty.propParentBO );
                        logicalViewModelProperty.propParentBO.getSaveableDirtyProps = function() {
                            return [];
                        };
                    }
                }

                displayRow.props[ logicalViewModelProperty.propInternalName ] = displayedLogicalProp;
            }
            appCtxSvc.registerCtx( 'Vm1PropParentBoUid', propBoParentMap );
            displayedRows.push( displayRow );
        }
    } );
    return displayedRows;
};

export let publishCellPropsJs = function( columnDefs ) {
    for( var index = 0; index < columnDefs.columnConfig.columns.length; index++ ) {
        var column = columnDefs.columnConfig.columns[ index ];
        column.cellTemplate = getOccmgmtNgClassTemplate();
        column.cellRenderers = [];
        column.cellRenderers.push( _rowMarkupRendererG );
    }
};

var _rowMarkupRendererG = {
    action: function( column, vmo, tableElem, rowElem ) {
        var cellContent = _t.Cell.createElement( column, vmo, tableElem, rowElem );
        if( vmo.props.vm1_isPCAdded ) {
            cellContent.classList.add( 'aw-grid-markup-added' );
            // Add markup class if value is added
            var cellText = cellContent.getElementsByClassName( 'aw-splm-tableCellText' )[ 0 ];
            if( cellText ) {
                cellText.classList.add( 'aw-jswidgets-change' );
            }
        }

        if( vmo.props.vm1_isPCRemoved ) {
            // Add markup class if value is removed
            cellContent.classList.add( 'aw-grid-markup-deleted' );
            var cellTextRemoved = cellContent.getElementsByClassName( 'aw-splm-tableCellText' )[ 0 ];
            if( cellTextRemoved ) {
                cellTextRemoved.classList.add( 'aw-jswidgets-oldText' );
            }
        }
        return cellContent;
    },
    // eslint-disable-next-line no-unused-vars
    condition: function( column, vmo, tableElem, rowElem ) {
        return true;
    },
    name: 'rowMarkupRenderer'
};

var getOccmgmtNgClassTemplate = function() {
    return ' ng-class={"aw-grid-markup-added":row.entity.isAdded,"aw-grid-markup-deleted":row.entity.isDeleted,"aw-occmgmtjs-stale":row.entity.isStale} ';
};

/**
 * Get Assign Partner Input
 * @param {Object} data data
 * @param {Object} ctx ctx
 * @returns {Object} Input for assign SOA
 */
export let getAssignPartnerInput = function( data, ctx ) {
    return {
        selectedObject: getSelectedObject( ctx ),
        preferredStatus: data.selectedPreferredStatus.dbValue,
        partnerContract: data.selectedPartnerContract.dbValue,
        configurationContext: getConfigurationOfSelectedObject( ctx )
    };
};

/**
 * Get ConfigurationContext Object
 * @param {Object} ctx ctx
 * @returns {Object} model object
 */
export let getConfigurationOfSelectedObject = function( ctx ) {
    var configObject = {};

    if( ctx.occmgmtContext !== undefined ) {
        var occMgmnt = ctx.occmgmtContext;
        if( occMgmnt.topElement.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) > -1 ||
            occMgmnt.topElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) > -1 ) {
            configObject = {
                uid: occMgmnt.topElement.uid,
                type: occMgmnt.topElement.type
            };
        }
    } else if( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) > -1 ||
        ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) > -1 ) {
        configObject = ctx.xrtSummaryContextObject;
    }
    return configObject;
};

/**
 * Get Assign Partner Input
 * @param {Object} data data
 * @param {Object} ctx ctx
 * @returns {Object} Input for assign SOA
 */
export let getRemoveInput = function() {
    var removePartnerContractInput2 = [];
    var pcSelections = appCtxSvc.ctx.partnerContractSelections;
    for( var i = 0; i < pcSelections.length; i++ ) {
        var selection = pcSelections[ i ];
        var configuration = {};
        if( selection.props.vm0StructureContextLogical ) {
            configuration = {
                uid: selection.props.vm0StructureContextLogical.dbValues[ 0 ],
                type: 'ItemRevision'
            };
        }
        var input = {
            selectedObject: appCtxSvc.ctx.xrtSummaryContextObject,
            partnerContract: pcSelections[ i ],

            configurationContext: configuration
        };
        removePartnerContractInput2.push( input );
    }
    return removePartnerContractInput2;
};

/**
 * Store selected partner contracts
 * @param {Object} data Data
 */
export let storePartnerContractSelections = function( data ) {
    appCtxSvc.updateCtx( 'partnerContractSelections', data.selectedObjects );
};

/**
 * Get selected object for assign partner SOA
 * @param {Object} ctx ctx
 * @returns {Object} model object
 */
export let getSelectedObject = function( ctx ) {
    var selectedObject = {};
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 ) {
        var underLyingObjectUid = ctx.selected.props.awb0UnderlyingObject.dbValues[ 0 ];
        selectedObject = clientDataModel.getObject( underLyingObjectUid );
    } else {
        selectedObject = ctx.selected;
    }
    return selectedObject;
};

export let getSelectedObjectUid = function( ctx ) {
    var object = getSelectedObject( ctx );
    return object.uid;
};

/**
 * This method will process the objects to return all the Partner Contract Objects
 * @param {Object} response response of getPartnerContractsOfSelectedObject SOA
 * @returns {ObjectArray}: array of Contract Objects
 */
export let getContractObjects = function( response ) {
    var vendorPart = appCtxSvc.ctx.xrtSummaryContextObject;
    var licenseList = getLicenseListPropValues( vendorPart );
    var displayedRows = [];

    for( var i = 0; i < response.viewModelRows.length; i++ ) {
        displayedRows.push( response.viewModelRows[ i ].modelObject );
    }

    return getFilteredPCRevs( licenseList, displayedRows );
};

/**
 * Get license list property values of object
 * @param {Object} selectedObject Selected Object
 * @returns {ObjectArray} Array of license ids
 */
export let getLicenseListPropValues = function( selectedObject ) {
    var licenseListArray = [];
    if( typeof selectedObject.props.license_list !== 'undefined' ) {
        for( var inx1 = 0; inx1 < selectedObject.props.license_list.dbValues.length; inx1++ ) {
            licenseListArray.push( selectedObject.props.license_list.dbValues[ inx1 ] );
        }
    } else {
        var uids = [ selectedObject.uid ];
        dmSvc.getProperties( uids, [ 'license_list' ] ).then( function() {
            for( var inx2 = 0; inx2 < selectedObject.props.license_list.dbValues.length; inx2++ ) {
                licenseListArray.push( selectedObject.props.license_list.dbValues[ inx2 ] );
            }
        } );
    }
    return licenseListArray;
};

/**
 * Return unassigned Partner Contract Revisions
 * @param {ObjectArray} licenseListArray License List array
 * @param {ObjectArray} partnerContracts Partner Contracts List
 * @returns {ObjectArray} filtered unassignedPartner Contracts
 */
export let getFilteredPCRevs = function( licenseListArray, partnerContracts ) {
    var unassignedPCRev = [];
    for( var j = 0; j < partnerContracts.length; j++ ) {
        var licenseFromPCRev = partnerContracts[ j ].props.license_list.dbValues[ 0 ];
        if( licenseListArray.indexOf( licenseFromPCRev ) === -1 ) {
            unassignedPCRev.push( partnerContracts[ j ] );
        }
    }
    return unassignedPCRev;
};

/**
 * This method will create Input for Attach License SOA
 * @param {Object} data to get selected partner contract
 * @param {Object} ctx to get selected Vendor Parts
 * @returns {Array} input to SOA attachOrDetachLicensesFromObjects
 */
export let attachOrDetachInput = function( data, ctx ) {
    var selectedObjects = [];
    if( data.dataProviders.VendorPartsToAssign ) {
        selectedObjects = data.dataProviders.VendorPartsToAssign.selectedObjects;
    } else {
        selectedObjects = ctx.mselected;
    }

    var attachOrDetachInput = [];
    var licenseObject = {};
    var size = selectedObjects.length;
    if( size > 0 ) {
        for( var i = 0; i < size; i++ ) {
            licenseObject = processObjectsInMultiSelectInput( selectedObjects[ i ], data, true );
            attachOrDetachInput.push( licenseObject );
        }
    }
    return attachOrDetachInput;
};

/**
 * This method will create Input for Attach License SOA
 * @param {Object} selectedObject Vendor Part Object
 * @param {Object} data to get License Objects
 * @param {Object} attachFlag to create input for attach case
 * @returns {Array} input array attachLicenseDetails or detachLicenseDetails based on attachFlag
 */
var processObjectsInMultiSelectInput = function( selectedObject, data, attachFlag ) {
    var licesnsesToAssign = [];
    var object = selectedObject;
    data.typeOption !== undefined ? selectedObject : '';

    if( data.dataProviders.getPartnerContracts ) {
        var selectedLicenses = data.dataProviders.getPartnerContracts.selectedObjects;
        for( var i = 0; i < selectedLicenses.length; i++ ) {
            licesnsesToAssign.push( selectedLicenses[ i ].props.license_list.prevDisplayValues[ 0 ] );
        }
    } else {
        licesnsesToAssign.push( appCtxSvc.ctx.mselected[ 0 ].props.license_list.uiValues[ 0 ] );
    }

    var contextInfo = {
        selectedTopLevelObject: object,
        variantRule: '',
        revisionRule: '',
        typeOption: data.typeOption,
        depth: ''
    };
    var licenseObject = {
        selectedLicenses: licesnsesToAssign,
        objects: [ object ],
        eadParagraph: ''
    };
    var eachObject = {
        contextInfo: contextInfo
    };
    if( attachFlag ) {
        eachObject.attachLicenseDetails = licenseObject;
    } else {
        eachObject.detachLicenseDetails = licenseObject;
    }

    return eachObject;
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 * @param {ObjectArray} messages Messages
 * @param {Object} msgObj Message Object
 */
var getMessageStringForErrors = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * This API is to process Partial Errors from SOA response
 * @param {Object} serviceData Service Data output of response
 * @returns {Object} Message object
 */
export let processPartialErrorsFromSOA = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( serviceData.partialErrors ) {
        getMessageStringForErrors( serviceData.partialErrors[ 0 ].errorValues, msgObj );
    }

    return msgObj.msg;
};

/**
 * This API is to process Cancel Edit
 * @param {Object} appCtxService Context service
 * @param {Object} editHandlerService edit handler service to process some methods
 *
 */
export let processCancelEdit = function() {
    var activeEditHandler = _editHandlerService.getActiveEditHandler();
    if( activeEditHandler ) {
        activeEditHandler.cancelEdits();
    }
};

export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveHandler.saveEdits = function( dataSource ) {
    var modifyPropVMo = null;
    if( dataSource ) {
        modifyPropVMo = dataSource.getAllModifiedPropertiesWithVMO();
    }
        var assignmentRowObjMap = appCtxSvc.ctx.Vm1PropParentBoUid;

        var infoData = [];
        if( modifyPropVMo !== null ) {
            for( var i = 0; i < modifyPropVMo.length; i++ ) {
                var inputRowObject = assignmentRowObjMap.get( modifyPropVMo[ i ].viewModelObject.uid );
                var inputUsagePref = modifyPropVMo[ i ].viewModelProps[ 0 ].dbValue;
                var inputPushObject = {
                    object: inputRowObject,
                    vecNameVal: [ {
                        name: 'vm0UsagePreference',
                        values: [ inputUsagePref ]
                    } ]
                };
                infoData.push( inputPushObject );
            }

            var serviceData =  soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', {
                info: infoData
            } );

            if( serviceData ) {
                serviceData.then( function() {
                    eventBus.publish( 'cdm.relatedModified', {
                        refreshLocationFlag: true,
                        relations: '',
                        relatedModified: [ appCtxSvc.ctx.xrtSummaryContextObject ]
                    } );
                } ).catch( function( error ) {
                    var errMessage = msgSvc.getSOAErrorMessage( error );
                    msgSvc.showError( errMessage );
                } );
            }
        }
};

/**
 * When there is changes are unsaved then it return true
 */
saveHandler.isDirty = function(  ) {
    return true;
};

export let savePreferredStatus = function( context ) {
    if( context ) {
        _editHandlerService.saveEdits();
    }
};

/**
 *  edit for Usage Preference
 * @param {Object} handler : current edit handler
 * @param {Object} viewModeContext: viewModelContext for splm table
 */
export let execute = function( handler, viewModeContext ) {
    // this is required to let save edit know which handler is active.
    if( !handler ) {
        handler = viewModeContext === 'TableView' || viewModeContext === 'TreeView' ? 'TABLE_CONTEXT_VM' :
            'NONE';
    }
    _editHandlerService.setActiveEditHandlerContext( handler );

    if( !_editHandlerService.isEditEnabled() ) {
        var editHandler = _editHandlerService.getEditHandler( handler );
        editHandler.startEdit();
    }
};

/**
 *  This method is to get the list of IP-License attached to the Partner Contract Revision.
 *  @param {Object} ctx -  context data
 *  @returns {Array} the array Of License Id properties.
 */
export let getLicenseIdsFromSelectedPartnerContract = function( ctx ) {
    var partnerContracts = [];
    partnerContracts = ctx.mselected;
    var userObjectArray = [];
    for( var index = 0; index < partnerContracts.length; index++ ) {
        var licenseId = partnerContracts[ index ].props.license_list.dbValues[ 0 ];
        var licObject = clientDataModel.getObject( licenseId );
        if( licObject !== null ) {
            if( licObject.props.object_name !== undefined ) {
                var licensePropertyValue = licObject.props.object_name.dbValues[ 0 ];
                userObjectArray.push( licensePropertyValue );
            } else {
                userObjectArray.push( partnerContracts[ index ].props.license_list.uiValues[ 0 ] );
            }
        }
    }
    return userObjectArray;
};

export let getRowsForAssignedProducts = function( response ) {
    var displayedRows = [];

    _.forEach( response.viewModelRows, function( inputRow ) {
        var displayRow = viewModelObjectSvc
            .constructViewModelObjectFromModelObject( inputRow.modelObject, 'Edit' );

        _.forEach( inputRow.viewModelProperties, function( logicalViewModelProperty ) {
            var displayedLogicalProp = uwPropertySvc.createViewModelProperty(
                logicalViewModelProperty.propInternalName, logicalViewModelProperty.propDisplayName,
                logicalViewModelProperty.propDataType, logicalViewModelProperty.propDBValue,
                [ logicalViewModelProperty.propUIValue ] );

            uwPropertySvc.setIsPropertyModifiable( displayedLogicalProp, true );
            uwPropertySvc.setIsEditable( displayedLogicalProp, logicalViewModelProperty.isEditable );

            displayRow.props[logicalViewModelProperty.propInternalName] = displayedLogicalProp;
        } );
        displayedRows.push( displayRow );
    } );
    return displayedRows;
};

export default exports = {
    checkGroupSecurityOfUser,
    getApprovedVendorsList,
    getActivePartnerContracts,
    createListModelObjectsWithBlankSelection,
    processPreferredStatus,
    processColumns,
    getViewModelRows,
    getAssignPartnerInput,
    publishCellPropsJs,
    getSelectedObject,
    getSelectedObjectUid,
    getConfigurationOfSelectedObject,
    getRemoveInput,
    storePartnerContractSelections,
    getContractObjects,
    getLicenseListPropValues,
    getFilteredPCRevs,
    attachOrDetachInput,
    processPartialErrorsFromSOA,
    getProductListLOV,
    savePreferredStatus,
    processCancelEdit,
    execute,
    getLicenseIdsFromSelectedPartnerContract,
    getRowsFromResponse,
    getSortCriteria,
    getRowsForAssignedProducts,
    getSaveHandler
};
/**
 * This factory creates service to listen to subscribe to the event.
 *
 * @memberof NgServices
 * @member Vm1AssignPartnerContractService
 */
app.factory( 'Vm1AssignPartnerContractService', () => exports );
