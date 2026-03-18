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
 * Interfaces graph layout service
 *
 * @module js/Ase1IntefacesGraphLayoutService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import graphConstants from 'js/graphConstants';

var exports = {};

/**
 * Activate column layout
 *
 * @param {Array} edges Added edges
 */
export let activateColumnLayout = function( edges ) {

    var interfacesCtx = appCtxSvc.getCtx( "interfacesCtx" );
    var graphContext = appCtxSvc.getCtx( "graph" );
    var graphModel = graphContext.graphModel;
    if( !graphModel || !graphModel.graphControl || !graphModel.graphControl.layout ) {
        return;
    }
    var layout = graphModel.graphControl.layout;
    if( layout.type !== graphConstants.DFLayoutTypes.ColumnLayout ) {
        return;
    }

    //deactivate the column layout before next activation
    if( layout.isActive() ) {
        layout.deactivate();
    }

    //set layout options
    var columnDataArray = [];
    var columnDataList = [];
    var column1 = [];
    var column2 = [];
    var column3 = [];
    if( interfacesCtx.visibleExternalSystems && interfacesCtx.visibleExternalSystems.length > 0 ) {
        var maxCount = parseInt( interfacesCtx.visibleExternalSystems.length / 2 );

        if( interfacesCtx.visibleExternalSystems.length % 2 !== 0 ) {
            ++maxCount;
        }
        var counter = 1;
        _.forEach( interfacesCtx.visibleExternalSystems, function( system ) {
            var node = graphModel.nodeMap[ system.nodeObject.uid ];
            if( counter <= maxCount ) {
                column1.push( node );
            } else {
                column3.push( node );
            }
            ++counter;
        } );
    }

    if( interfacesCtx.internalSystems && interfacesCtx.internalSystems.length > 0 ) {
        _.forEach( interfacesCtx.internalSystems, function( system ) {
            var node = graphModel.nodeMap[ system.nodeObject.uid ];
            column2.push( node );
        } );
    } else {
        var node = graphModel.nodeMap[ interfacesCtx.systemOfInterest.nodeObject.uid ];
        column2.push( node );
    }

    columnDataList.push( column1 );
    columnDataList.push( column2 );
    columnDataList.push( column3 );

    if( columnDataList.length > 0 ) {
        _.forEach( columnDataList, function( columnData ) {
            var graphColumnData = {};
            graphColumnData.nodesInColumn = columnData;
            graphColumnData.nodeAlignmentInColumn = "center";
            graphColumnData.minNodeDistanceInColumn = 27;
            graphColumnData.minColumnDistance = 174;
            columnDataArray.push( graphColumnData );
        } );
    }

    //apply default column layout
    layout.setLayoutDirection( graphConstants.LayoutDirections.LeftToRight );
    layout.activate( columnDataArray, edges );
};

export default exports = {
    activateColumnLayout
};
app.factory( 'Ase1IntefacesGraphLayoutService', () => exports );
