// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/*
global
define
*/

/**
 * Helper class for graphical renderer for Schedule Manager
 *
 * @module propRenderTemplates/Saw1GraphicalRendererHelper
 * @requires app
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import smConstants from 'js/ScheduleManagerConstants';

var exports = {};

/*
 * @param { Object } vmo - ViewModelObject for which status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let renderStatusFlags = function( vmo, containerElem ) {
    if ( vmo.props.awp0Target ) {
        let uid = vmo.props.awp0Target.dbValues[0];
        let object = cdm.getObject( uid );
    if( object.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) >= 0 && vmo.props.fnd0status ) {
            let status = vmo.props.fnd0status.dbValue;
            let statusDispValue = vmo.props.fnd0status.uiValue;
        let childElement = getContainerElement( status, statusDispValue, smConstants.SCHEDULE_TASK_RENDERER_STATUS_ICON_MAP );
            containerElem.appendChild( childElement );
        }
    }else if( vmo.props.fnd0status ) {
        let childElement = document.createElement( 'div' );
        childElement.className = 'aw-splm-tableCellText';
        let statusDispValue = vmo.props.fnd0status.uiValues;
        childElement.innerHTML += statusDispValue;
        containerElem.appendChild( childElement );
    }
};

/*
 * @param { Object } vmo - ViewModelObject for which state is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let renderStateFlags = function( vmo, containerElem ) {
    if ( vmo.props.awp0Target ) {
    let uid = vmo.props.awp0Target.dbValues[ 0 ];
    let object = cdm.getObject( uid );
    if( object.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) >= 0 && vmo.props.fnd0state ) {
            let state = vmo.props.fnd0state.dbValue;
        let stateDispValue = vmo.props.fnd0state.uiValue;
        let childElement = getContainerElement( state, stateDispValue, smConstants.SCHEDULE_TASK_RENDERER_STATE_ICON_MAP );
            containerElem.appendChild( childElement );
        }
    } else if ( vmo.props.fnd0state ) {
        let childElement = document.createElement( 'div' );
        childElement.className = 'aw-splm-tableCellText';
        let stateDispValue = vmo.props.fnd0state.uiValues;
        childElement.innerHTML += stateDispValue;
        containerElem.appendChild( childElement );
    }
};

var getContainerElement = function( internalName, dispName, constantMap ) {
    let childElement = document.createElement( 'div' );
    if( constantMap[ internalName ] ) {
        let imageElement = document.createElement( 'img' );
        imageElement.className = 'aw-visual-indicator';
        let imagePath = app.getBaseUrlPath() + '/image/';
        imageElement.title = dispName;
        imagePath += constantMap[ internalName ];
        imageElement.src = imagePath;
        imageElement.alt = dispName;
        childElement.appendChild( imageElement );
    }
    childElement.className = 'aw-splm-tableCellText';
    childElement.innerHTML += dispName;
    return childElement;
};

export default exports = {
    renderStatusFlags,
    renderStateFlags
};
app.factory( 'Saw1GraphicalRendererHelper', () => exports );
