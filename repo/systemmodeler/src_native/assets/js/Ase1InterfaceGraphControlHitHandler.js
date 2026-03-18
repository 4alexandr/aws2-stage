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
 * This implements the graph hitTest.
 *
 * @module js/Ase1InterfaceGraphControlHitHandler
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import graphUtils from 'js/graphUtils';
import graphConstants from 'js/graphConstants';

var exports = {};

/**
 * API to be called when the hit test on elements
 *
 * @param {Object} graphModel - the graph model object
 * @param {SheetElement[]} draggingGraphItems - array of the graph items been dragging
 *            respectively
 * @param {Point} mousePosition - the mouse location
 * @param {SheetElement[]} candidateItems - the candidate selection items
 * @return {HitTestHandle} - it includes isHandle application handles the candidate or not, candidateElements, and cancel select
 */
export let onHitTest = function( graphModel, candidateItems, mousePosition ) {
    var hitTestHandle = {
        "isHandled": false,
        "candidateElements": candidateItems,
        "cancel": false
    };

    if( graphModel.config.layout.layoutMode !== graphConstants.DFLayoutTypes.ColumnLayout ) {
        return hitTestHandle;
    }
    var length = candidateItems.length;
    var topHitTest = candidateItems[ length - 1 ];
    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    //hit test by shape
    if( topHitTest && topHitTest instanceof window.SDF.Models.Node ) {
        if( interfacesCtx.systemOfInterest.nodeObject.uid === topHitTest.modelObject.uid ) {
            var posX = topHitTest.getAnchorPositionX() + 100;
            var posY = topHitTest.getAnchorPositionY() + 100;
            var nodePos = {
                x: posX,
                y: posY
            };
            var graph = graphModel.graphControl.graph;
            var posOnView = graphUtils.pageToViewCoordinate( graph, mousePosition );
            var posOnSheet = graphUtils.viewToSheetCoordinate( graph, posOnView );
            var isHit = graphUtils.isPointInCircle( posOnSheet, nodePos, 100 );
            if( !isHit ) {
                hitTestHandle.candidateElements = [];
                hitTestHandle.isHandled = true;
                hitTestHandle.cancel = true;
            }
        }
    } else if( topHitTest instanceof window.SDF.Models.Annotation ) {
        var owner = topHitTest.getOwner();
        var inputMode = graphModel.graphControl.getInputMode();
        //non authoring mode, if label is the top candidate and own node is candidate also, the node as the only one candidate.
        if( owner instanceof window.SDF.Models.Node && !inputMode.editMode ) {
            if( length > 1 ) {
                var secondToLastItem = candidateItems[ length - 2 ];
                if( owner === secondToLastItem ) {
                    var candidateElements = [];
                    candidateElements.push( secondToLastItem );
                    hitTestHandle.candidateElements = candidateElements;
                    hitTestHandle.isHandled = true;
                }
            }
        }
    }

    return hitTestHandle;
};

/**
 * Define
 *
 * @member Ase1InterfaceGraphControlHitHandler
 */

export default exports = {
    onHitTest
};
app.factory( 'Ase1InterfaceGraphControlHitHandler', () => exports );
