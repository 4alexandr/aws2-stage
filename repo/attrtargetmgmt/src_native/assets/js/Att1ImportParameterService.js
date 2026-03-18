// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
  define
 */

/**
 * @module js/Att1ImportParameterService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertySvc from 'js/uwPropertyService';
import parammgmtUtlSvc from 'js/Att1ParameterMgmtUtilService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let setImportFileUploadInProgress = function( data, value ) {
    data.importFileUploadInProgress = value;
};
export let getApplicationFormat = function() {
    return 'Dataset';
};
export let getSelectedObject = function() {
    var selectedInParamContext = _.get( appCtxSvc, 'ctx.parammgmtctx.selected', undefined );
    if( !selectedInParamContext ) {
        selectedInParamContext = _.get( appCtxSvc, 'ctx.selected', undefined );
    }
    return selectedInParamContext;
};
export let getTemplateName = function(data) {
    var template = data.preferences.PLE_Parameter_Import_Excel_Template[0];
    var selectedObject = _.get( appCtxSvc, 'ctx.panelContext.importTarget', undefined );
    if( selectedObject && selectedObject.modelType ) {
        if( selectedObject.modelType.typeHierarchyArray.indexOf( 'Att0ParamDictionary' ) > -1 ) {
            template = data.preferences.PLE_Parameter_Definition_Import_Excel_Template[0];
        }
    }
    return template;
};
export let handleImport = function() {
    var selectedElement = _.get( appCtxSvc, 'ctx.selected', undefined );
    var contextElement = _.get( appCtxSvc, 'ctx.pselected', undefined );
    var locationContextObject = _.get( appCtxSvc, 'ctx.locationContext.modelObject', undefined );
    var primaryXrtPageID = _.get( appCtxSvc, 'ctx.xrtPageContext.primaryXrtPageID', undefined );
    var secondaryXrtPageID = _.get( appCtxSvc, 'ctx.xrtPageContext.secondaryXrtPageID', undefined );

    var isInVRContext = false;
    if((selectedElement && cmm.isInstanceOf( 'Crt0VldnContractRevision', selectedElement.modelType )) || (contextElement && cmm.isInstanceOf( 'Crt0VldnContractRevision', contextElement.modelType ))) {
        isInVRContext = true;
    }

    // when we are in Home folder
    if( ( cmm.isInstanceOf( 'Fnd0HomeFolder', locationContextObject.modelType ) || cmm.isInstanceOf( 'Folder', locationContextObject.modelType ) || cmm.isInstanceOf( 'ItemRevision', locationContextObject.modelType ) ) && selectedElement && selectedElement.modelType && !isInVRContext) {
        _handleForHomeAndFolderSublocation( selectedElement, contextElement, secondaryXrtPageID );
        // when we are in dictionary sublocation
    } else if( cmm.isInstanceOf( 'Att0ParamDictionary', locationContextObject.modelType ) ) {
        eventBus.publish( 'cdm.relatedModified', { relatedModified: [ locationContextObject ] } );
        //in case of ItemRevision // Product and Split Panel and Requirements
    } else if( secondaryXrtPageID === 'tc_xrt_AttributesForDCP' || secondaryXrtPageID === 'Ase0ArchitectureFeature' || secondaryXrtPageID === 'tc_xrt_Documentation' || secondaryXrtPageID ===
        'tc_xrt_SystemRequirements' ) {
        _handleForProductAndItemRevision( selectedElement, contextElement, secondaryXrtPageID );
        //inside param project/Group Sublocation
    } else if( _.get( appCtxSvc, 'ctx.parammgmtctx', undefined ) && !isInVRContext) {
        _handelForParamProjectSublocation( selectedElement );
    } else {
        //refresh for  VR/Study Context
        _handleVRImport( selectedElement, contextElement, primaryXrtPageID, secondaryXrtPageID );
    }
};
var _handleForHomeAndFolderSublocation = function( selectedElement, contextElement, secondaryXrtPageID ) {
    //project group selected
    if( cmm.isInstanceOf( 'Att0ParamProject', selectedElement.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedElement.modelType ) ||
        contextElement && cmm.isInstanceOf( 'Att0ParamProject', contextElement.modelType ) || contextElement && cmm.isInstanceOf( 'Att0ParamGroup', contextElement.modelType ) ) {
        eventBus.publish( 'refreshAtt1ShowParamProxyTable' );
    } else if( cmm.isInstanceOf( 'Att0ParamDictionary', selectedElement.modelType ) || contextElement && cmm.isInstanceOf( 'Att0ParamDictionary', contextElement.modelType ) ) {
        var impactedElement = cmm.isInstanceOf( 'Att0ParamDictionary', selectedElement.modelType ) ? selectedElement : contextElement;
        eventBus.publish( 'cdm.relatedModified', { relatedModified: [ impactedElement ] } );
        //in case of Item Revision
    } else if( secondaryXrtPageID === 'tc_xrt_AttributesForDCP' || cmm.isInstanceOf( 'ItemRevision', selectedElement.modelType ) ) {
        _handleForProductAndItemRevision( selectedElement, contextElement, secondaryXrtPageID );
    } else {
        //refresh for  AR/study Context
        _handleVRImport( selectedElement, contextElement, secondaryXrtPageID );
    }
};
var _handelForParamProjectSublocation = function( selectedElement ) {
    selectedElement = _.get( appCtxSvc, 'ctx.parammgmtctx.selected', undefined ); {
        if( selectedElement && selectedElement.modelType ) {
            if( cmm.isInstanceOf( 'Att0ParamProject', selectedElement.modelType ) || cmm.isInstanceOf( 'Att0ParamGroup', selectedElement.modelType ) ) {
                eventBus.publish( 'paramProject.expandSelectedNode', { source: 'importParameter', refreshParamTable: true } );
            } else if( cmm.isInstanceOf( 'Att0MeasurableAttribute', selectedElement.modelType ) ) {
                eventBus.publish( 'primaryWorkarea.reset' );
            }
        }
    }
};
var _handleForProductAndItemRevision = function( selectedElement, contextElement, secondaryXrtPageID ) {
    //from home and itemRevision selected
    if( selectedElement && selectedElement.modelType && selectedElement.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ||
        contextElement && contextElement.modelType && contextElement.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
        var impactedElement = selectedElement.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ? selectedElement : contextElement;
        eventBus.publish( 'cdm.relatedModified', { relatedModified: [ impactedElement ] } );
        //in case of Product
    } else if( secondaryXrtPageID === 'Ase0ArchitectureFeature' || secondaryXrtPageID === 'tc_xrt_Documentation' || secondaryXrtPageID === 'tc_xrt_SystemRequirements' ) {
        eventBus.publish( 'Att1ShowMappedAttribute.refreshTable' );
    } else if( secondaryXrtPageID === 'tc_xrt_AttributesForDCP' ) {
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
};
var _handleVRImport = function( selectedElement, contextElement, primaryXrtPageID, secondaryXrtPageID ) {
    if( secondaryXrtPageID === 'tc_xrt_Studies' || primaryXrtPageID === 'tc_xrt_Studies' || ( secondaryXrtPageID === 'tc_xrt_Requests' || primaryXrtPageID === 'tc_xrt_Requests' ) ) {
        eventBus.publish( 'Att1ShowStudyAttrsTable.refreshStudyTable' );
    } else if( cmm.isInstanceOf( 'Crt0VldnContractRevision', selectedElement.modelType ) || contextElement && cmm.isInstanceOf( 'Crt0VldnContractRevision', contextElement.modelType ) ) {
        eventBus.publish( 'Att1ShowAttrProxyTable.refreshTable' );
    }
};

export default exports = {
    setImportFileUploadInProgress,
    getApplicationFormat,
    getSelectedObject,
    getTemplateName,
    handleImport
};
app.factory( 'Att1ImportParameterService', () => exports );
