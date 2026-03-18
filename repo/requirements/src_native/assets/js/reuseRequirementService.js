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
 * @module js/reuseRequirementService
 */
import eventBus from 'js/eventBus';
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dms from 'soa/dataManagementService';
import _ from 'lodash';

var exports = {};

/*
 * Get create input
 *
 * @param {Object} data - The panel's view model object
 */
export let getCreateInput = function( data ) {
    var inputObject = _getInputObject();
    var propertyNameValues = {
        object_name: [ data.name.dbValue ],
        object_desc: [ data.desc.dbValue ]
    };
    return [ {
        boName: inputObject.type,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: {}
    } ];
};
/*
 * Get operation type
 *
 * @param {Object} data - The panel's view model object
 */
export let getOperationType = function( data ) {
    //Register flag in context for reuse/ derive scenario
    appCtxService.registerCtx( 'isReuseDeriveInProgress', true );
    var operationType = '';
    if( data.reuseOptions.dbValue ) {
        operationType = 'CREATECOPY';
    } else {
        operationType = 'DERIVED';
    }
    return operationType;
};
/*
 * Get selected element
 *
 */
export let getSelectedElements = function() {
    var lastParent = _getInputObject();
    var selectedObj = {
        uid: lastParent.uid,
        type: lastParent.type
    };
    return [ selectedObj ];
};
var _getInputObject = function() {
    var selectObj = appCtxService.ctx.selected;
    var lastParent = selectObj;
    while( selectObj ) {
        var parentModelObject = null;
        if( selectObj.modelType && selectObj.modelType.typeHierarchyArray && ( selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 || selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0ParagraphElement' ) > -1 || selectObj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 ) ) {
            lastParent = selectObj;
        }
        if( selectObj && selectObj.props && selectObj.props.awb0Parent && selectObj.props.awb0Parent.dbValues[ 0 ] ) {
            var parentObjUID = selectObj.props.awb0Parent.dbValues[ 0 ];
            parentModelObject = cdm.getObject( parentObjUID );
        }
        selectObj = parentModelObject;
    }
    return lastParent;
};
/*
 * Set full text revisions in list.
 *@param {appCtx} ctx the application context
 * @param {Object} data - The panel's view model object
 */
export let setFullTextRevisions = function( ctx, data ) {
    if( ctx.panelContext ) {
        var cellObjects = [];
        var revToFullText = ctx.panelContext.revToFullText;
        var propertyValues = ctx.panelContext.objectPropValues;
        var fullTextRevisionsArray = revToFullText[ 1 ]; // Array of full text versions of revision
        var revisions = revToFullText[ 0 ]; // Revisions of requirement
        _.forEach( revisions, function( reqRevision ) {
            var revisionIndex = _.findIndex( propertyValues[ 0 ], { uid: reqRevision.uid } );
            var revisionIndexInRevisions = _.findIndex( revisions, { uid: reqRevision.uid } ); // Find index of revision
            var selFullTextRevs = fullTextRevisionsArray[ revisionIndexInRevisions ]; // Get that indexs fulltext versions
            _.forEach( selFullTextRevs, function( fullTextVersion ) {
                var index = _.findIndex( propertyValues[ 0 ], { uid: fullTextVersion.uid } ); // Full text version
                var propValues = propertyValues[ 1 ];
                var prop = propValues[ index ];
                var revisionProp = propValues[ revisionIndex ];
                var propertyDescriptorsMap = fullTextVersion.modelType.propertyDescriptorsMap;
                var revisionNumber = _.find( prop, { propName: propertyDescriptorsMap.revision_number.displayName } );
                var cellProp = _.find( revisionProp, { propName: propertyDescriptorsMap.awp0CellProperties.displayName } );
                var values = cellProp.propValues;
                var nameDisplayName = reqRevision.modelType.propertyDescriptorsMap.object_name.displayName;
                var idDisplayName = reqRevision.modelType.propertyDescriptorsMap.item_id.displayName;
                var revIdDisplauName = reqRevision.modelType.propertyDescriptorsMap.item_revision_id.displayName;
                var name = getPropertyValue( values[0], nameDisplayName, idDisplayName );
                var id = getPropertyValue( values[0], idDisplayName, revIdDisplauName );
                var revision = getPropertyValue( values[0], revIdDisplauName );

                var vmObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( reqRevision );
                vmObject.uid = fullTextVersion.uid;
                vmObject.fullTextUid = fullTextVersion.uid;
                vmObject.cellHeader1 = name;
                vmObject.cellHeader2 = id;
                vmObject.cellProperties = {
                    Revision: {
                        key: 'Revision',
                        value: revision
                    },
                    Version: {
                        key: 'Version',
                        value: revisionNumber.propValues[ 0 ]
                    }
                };
                vmObject.indicators = [];
                cellObjects.push( vmObject );
            } );
        } );
        data.revisions.dbValue = cellObjects;
        eventBus.publish( 'FullTextRequirement.refreshRevisionList' );
    }
};

/**
 *Method to get property value from given string
 @param {String} cellProps the string to parse
 @param {String} propName the propName to find
 @param {String} nextPropName the next prop name to stop parsing
 @returns {String} the property value
 */
function getPropertyValue( cellProps, propName, nextPropName ) {
    var propStartIndex = cellProps.indexOf( propName );
    var nextPropStartIndex = nextPropName ? cellProps.indexOf( nextPropName ) : cellProps.length;
    var prop = cellProps.substring( propStartIndex, nextPropStartIndex );
    if( prop ) {
        prop = prop.trim();
        prop = prop.substring( prop.indexOf( ':' ) + 1, nextPropStartIndex );
        if( prop.endsWith( ',' ) ) {
        prop = prop.substring( 0, prop.length - 1 );
        }
        return prop;
    }
    return '';
}

/*
 * Get fulltext version
 */
export let getVersion = function( data ) {
    var versionNo = 0;
    if( data.freezeRevision.dbValue ) {
        versionNo = _.parseInt( data.dataProviders.revisionData.selectedObjects[ 0 ].cellProperties.Version.value );
    }
    return versionNo;
};
/*
 * Get freeze operation type
 */
export let getFreezeOperationType = function( data ) {
    var operationType = '';
    if( data.freezeRevision.dbValue === true ) {
        operationType = 'FREEZE';
    } else {
        operationType = 'UNFREEZE';
    }
    return operationType;
};
/*
 * Get derived object name
 */
export let getDerivedObjectName = function( ctx, data ) {
    var lastParent = _getInputObject();
    var derivedName = lastParent.props.object_string.uiValues[ 0 ] + ' ' + data.i18n.derived;
    if( !data.reuseOptions.dbValue ) {
        data.name.dbValue = derivedName;
    } else {
        data.name.dbValue = ctx.captureName;
    }
};
/*
 * Get fulltext version id
 */
export let getDatasetId = function( data ) {
    if( data.freezeRevision.dbValue === true ) {
        var fulltextUid = data.dataProviders.revisionData.selectedObjects[ 0 ].fullTextUid;
        return cdm.getObject( fulltextUid );
    }
};

/**
 * Get Run in Background option value
 *
 * @param {Object} data - The panel's view model object
 * @return {Boolean} true if checkout supported
 */
export let getRunInBackgroundOptionValue = function( data ) {
    if( data.runInBackgroundReuse.dbValue ) {
        return true;
    }
    return false;
};

export default exports = {
    getCreateInput,
    getOperationType,
    getSelectedElements,
    setFullTextRevisions,
    getVersion,
    getFreezeOperationType,
    getDerivedObjectName,
    getDatasetId,
    getRunInBackgroundOptionValue
};
/*
 * reuseRequirementService service utility
 * @memberof NgServices
 * @member reuseRequirementService
 */
app.factory( 'reuseRequirementService', () => exports );
