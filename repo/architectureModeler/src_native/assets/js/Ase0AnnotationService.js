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
 * @module js/Ase0AnnotationService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphLegendSvc from 'js/graphLegendService';
import graphConstants from 'js/graphConstants';

var exports = {};

/*
 * method to process annotation details from manageDiagram2 SOA response and draw the annotations in graph
 */
export let processAnnotationData = function( activeLegendView, graphModel, diagramInfo ) {
    if( !diagramInfo.annotationCategories || !diagramInfo.annotationPositions ||
        !diagramInfo.annotationLabels || !diagramInfo.annotationLabelPositions ) {
        return;
    }
    if( ( diagramInfo.annotationCategories.length !== diagramInfo.annotationPositions.length ) ||
        ( diagramInfo.annotationPositions.length !== diagramInfo.annotationLabels.length ) ||
        ( diagramInfo.annotationLabels.length !== diagramInfo.annotationLabelPositions.length ) ||
        ( diagramInfo.annotationCategories.length !== diagramInfo.annotationLabels.length ) ||
        ( diagramInfo.annotationCategories.length !== diagramInfo.annotationLabelPositions.length ) ||
        ( diagramInfo.annotationPositions.length !== diagramInfo.annotationLabelPositions.length ) ) {
        return;
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    for( var idx = 0; idx < diagramInfo.annotationCategories.length; ++idx ) {
        var annotationStyle = graphLegendSvc.getStyleFromLegend( 'annotations', diagramInfo.annotationCategories[ idx ], activeLegendView );
        //Temporary fix for existing issue if user moves away from Architeture tab
        //and then comes back to the architecture page the annotation fill color is set to transparent
        //graphLegendSvc.getStyleFromLegend API should also return fillcolor
        if( !annotationStyle.fillColor ) {
            annotationStyle.fillColor = annotationStyle.color;
        }
        var annotationPosition = {};
        var annotationLabelPosition = {};
        var annotationLabelText = diagramInfo.annotationLabels[ idx ];
        var positions = diagramInfo.annotationPositions[ idx ].split( ":" );

        if( positions.length === 4 ) {
            annotationPosition.x = Number( positions[ 0 ] );
            annotationPosition.y = Number( positions[ 1 ] );
            annotationPosition.width = Number( positions[ 2 ] );
            annotationPosition.height = Number( positions[ 3 ] );
        }

        var annotation = graph.createBoundary( annotationPosition, annotationStyle );
        annotation.configuration = {
            labelStyle: {
                contentStyleClass: "aw-widgets-cellListCellTitle",
                backgroundStyleClass: "aw-graph-labelBackground",
                textAlignment: "MIDDLE",
                allowWrapping: "true"
            }
        };
        if( annotation ) {
            annotation.category = diagramInfo.annotationCategories[ idx ];
            positions = diagramInfo.annotationLabelPositions[ idx ].split( ":" );
            if( positions.length === 2 ) {
                graph.setLabel( annotation, annotationLabelText, annotation.configuration.labelStyle );
                annotationLabelPosition.x = Number( positions[ 0 ] );
                annotationLabelPosition.y = Number( positions[ 1 ] );

                var annotationLabel = annotation.getLabel();

                annotationLabel.setPosition( annotationLabelPosition );
            }
        }
    }
};

/**
 * Get display Properties for delete Annotations.
 *
 * @return {Object} selectedAnnotations
 */
export let populateDeleteAnnotationInformation = function() {
    var annotations = appCtxService.ctx.architectureCtx.diagram.selection.annotations;
    var label = "";
    if( annotations ) {
        if( annotations.length === 1 ) {
            var selectedAnnotation = annotations[ 0 ];
            label = selectedAnnotation.getLabel().getText();
        }
    }

    var outPutData = {
        selectedAnnotations: annotations,
        label: label
    };

    return outPutData;
};

export let deleteAnnotations = function( selectedAnnotations ) {
    if( selectedAnnotations && selectedAnnotations.length > 0 ) {
        var graphModel = appCtxService.ctx.graph.graphModel;
        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;
        graph.removeBoundaries( selectedAnnotations );
        // save Diagram
        _.set( appCtxService, 'ctx.architectureCtx.diagram.hasPendingChanges', true );
        eventBus.publish( "StartSaveAutoBookmarkEvent" );
    }
};

export default exports = {
    processAnnotationData,
    populateDeleteAnnotationInformation,
    deleteAnnotations
};
app.factory( 'Ase0AnnotationService', () => exports );
