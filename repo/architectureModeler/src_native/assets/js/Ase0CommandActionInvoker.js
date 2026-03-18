//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/Ase0CommandActionInvoker
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import diagramSaveService from 'js/Ase0ArchitectureDiagramSaveService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let invokeCommandAction = function( userAction, inputEventData ) {
    var eventData = {
        userAction: userAction
    };
    if( inputEventData ) {
        eventData = inputEventData;
    }
    switch ( userAction ) {
        // To do add case for user action if additional data needs to be passed in event
        case "ClearDiagram":
            if( diagramSaveService.isWorkingContextTypeDiagram() ) {
                diagramSaveService.setHasPendingChangeInDiagram( true );
            }
            eventBus.publish( "AMManageDiagramEvent", eventData );
            break;

        case "GetAllInterfaces":
        case "AssociateIDsToIOI":
            eventBus.publish( "AMManageDiagramEvent", eventData );
            break;
        case "fitDiagram":
            eventBus.publish( "AMGraphFitEvent", eventData );
            return;
        case "fitSelectedDiagram":
            eventBus.publish( "AMGraphFitSelectedEvent", eventData );
            break;
        case "selectedOnlyInDiagram":
            eventBus.publish( "AMGraphSelectedOnlyEvent", eventData );
            break;
        case "selectedOffInDiagram":
            eventBus.publish( "AMGraphSelectedOffEvent", eventData );
            break;
        case "deleteTraceLink":
            eventBus.publish( "architecture.RemoveTrackLinkEvent" );
            break;
        case "alignTop":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "TOP" } );
            break;
        case "alignBottom":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "BOTTOM" } );
            break;
        case "alignMiddle":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "MIDDLE" } );
            break;
        case "alignLeft":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "LEFT" } );
            break;
        case "alignRight":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "RIGHT" } );
            break;
        case "alignCenter":
            eventBus.publish( "archModeler.AlignmentEvent", { "userAction": "CENTER" } );
            break;
        case "reconnectConnection":
            eventBus.publish( "AMGraphEvent.reconnect" );
            break;
        default:
            eventBus.publish( userAction, eventData );
            break;
    }

};

export default exports = {
    invokeCommandAction
};
app.factory( 'Ase0CommandActionInvoker', () => exports );
