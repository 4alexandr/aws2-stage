// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/Arm0RequirementDocumentationUpdateDataService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import ckeditorOperations from 'js/ckeditorOperations';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
var exports = {};

/**
 * Function to handle model objects updated event when Documentation tab is opened
 *
 * @param {Object} modelObjects the model object
 * @param {Object} data the view model data
 */
export let modelOnObjectsChanged = function( modelObjects, data ) {
    var nodeToUpdate = [];
    if( modelObjects && modelObjects.length > 0 ) {
        _.forEach( modelObjects, function( modelObject ) {
            //We get updated object in "saveUserWorkingContextState2" which unecessary calls isObjectVisibleInEditor().
            //Added check to avoid execution of this function.
            if( modelObject.type !== 'Awb0AutoBookmark' ) {
            // check of Object is visible in Documentation tab
            if( ckeditorOperations.isObjectVisibleInEditor( data.editorProps.id, modelObject.uid, appCtxSvc.ctx ) ) {
                nodeToUpdate.push( modelObject );
            }
        }
        } );
    }

    if( nodeToUpdate.length > 0 ) {
        _updateObjectProperties( nodeToUpdate, data );
    }
};

/**
 * Update the object properties if it's changed
 * @param {Object} objectsToUpdate nodes
 * @param {Object} data data object
 */
var _updateObjectProperties = function( objectsToUpdate, data ) {
    for( var i = 0; i < objectsToUpdate.length; i++ ) {
        var modelObject = objectsToUpdate[i];
        if( modelObject.props.awb0UnderlyingObject ) {
            var props = ckeditorOperations.getPropertiesFromEditor( data.editorProps.id, modelObject.uid );
            var underlyingObject = modelObject.props.awb0UnderlyingObject.dbValues[ 0 ];
            var underlyingModelObject = cdm.getObject( underlyingObject );
            var properties = {};
            var isReloadRequired = false;
            for( var j = 0; j < props.length; j++ ) {
                var prop = props[j];
                if( prop && prop.name === 'revisionid' && underlyingObject !== prop.value ) {
                    isReloadRequired = true;
                    break;
                }
                if( underlyingModelObject && underlyingModelObject.props[ prop.name ] && !( _.isEmpty( underlyingModelObject.props[ prop.name ].dbValues[ 0 ] ) && _.isEmpty( prop.value ) ) &&
                    _trimContent( underlyingModelObject.props[ prop.name ].dbValues[ 0 ] ) !== _trimContent( prop.value ) ) {
                    properties[ prop.name ] = underlyingModelObject.props[ prop.name ].dbValues[ 0 ];
                }
            }
            if( isReloadRequired ) {
                eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
                break;
            }

            if( underlyingModelObject && underlyingModelObject.props.date_released && underlyingModelObject.props.date_released.dbValues.length > 0 ) {
                properties.date_released = underlyingModelObject.props.date_released.dbValues[ 0 ];
            }

            if( Object.keys( properties ).length > 0 ) {
                ckeditorOperations.updateObjectProperties( data.editorProps.id, modelObject.uid, properties, data );
            }
        }
    }
};

/**
 * @param {String} content  - string value
 * @returns {String} return contents after trim
 */
var _trimContent = function( content ) {
    if( content ) {
        return content.trim();
    }
    return content;
};

/**
 * Service for Arm0RequirementDocumentationUpdateDataService.
 *
 * @member Arm0RequirementDocumentationUpdateDataService
 */

export default exports = {
    modelOnObjectsChanged
};
app.factory( 'Arm0RequirementDocumentationUpdateDataService', () => exports );
