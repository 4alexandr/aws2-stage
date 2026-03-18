// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/pgp0GenerateState
 * @requires app
 */
import app from 'app';
import ppConstants from 'js/ProgramPlanningConstants';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * @param { Object } vmo - ViewModelObject for which release status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let pgpStateRendererFn = function( vmo, containerElem ) {

    let cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator';
    let imagePath = app.getBaseUrlPath() + '/image/';

    let object = null;
    let pageId = appCtxService.ctx.xrtPageContext.secondaryXrtPageID ? appCtxService.ctx.xrtPageContext.secondaryXrtPageID : appCtxService.ctx.xrtPageContext.primaryXrtPageID; 
    if ( pageId === 'tc_xrt_Timeline' ) {
        object = cdm.getObject( vmo.uid );
    } else {
        let uid = vmo.props.awp0Target.dbValues[ 0 ];
        object = cdm.getObject( uid );
    }
    //For Criteria object
    if( object.modelType.typeHierarchyArray.indexOf( "Prg0Criteria" ) >= 0 ) {
        let stateName = vmo.props.fnd0State.dbValue;
        let stateToolTip = vmo.props.fnd0State.uiValue;

        cellImg.title = stateToolTip;

        if( stateName === "In Process" ) {
            stateName = "InProcess";
        }

        if( ppConstants.CRITERIA_STATE[ stateName ] ) {
            imagePath += ppConstants.CRITERIA_STATE[ stateName ];

            cellImg.src = imagePath;
            containerElem.appendChild( cellImg );
        }

    }

    //For Event object
    if( object.modelType.typeHierarchyArray.indexOf( "Prg0Event" ) >= 0 ) {
        let stateName = vmo.props.prg0State.dbValue;
        let stateToolTip = vmo.props.prg0State.uiValue;

        cellImg.title = stateToolTip;

        if( stateName === "Not Started" ) {
            stateName = "NotStarted";
        }

        if( stateName === "In Progress" ) {
            stateName = "InProgress";
        }

        if( ppConstants.EVENT_STATE[ stateName ] ) {
            imagePath += ppConstants.EVENT_STATE[ stateName ];

            cellImg.src = imagePath;
            containerElem.appendChild( cellImg );
        }

    }

};

export default exports = {
    pgpStateRendererFn
};
app.factory( 'pgp0GenerateState', () => exports );
