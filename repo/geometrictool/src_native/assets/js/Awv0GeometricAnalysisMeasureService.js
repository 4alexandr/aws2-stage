// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 * 
 * @module js/Awv0GeometricAnalysisMeasureService
 */
import * as app from 'app';
import viewerMeasureSvc from 'js/viewerMeasureService';
import _ from 'lodash';

var exports = {};

/**
 * part filter picked
 */
export let measurementPanelRevealed = function( treedata, localeTextBundle ) {
    viewerMeasureSvc.measurementPanelRevealed();
    var selectedMeasurementPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
    if( _.isUndefined( selectedMeasurementPickFilters ) || selectedMeasurementPickFilters.length === 0 ) {
        selectedMeasurementPickFilters = [ viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL,
            viewerMeasureSvc.PickFilters.PICK_SURFACE, viewerMeasureSvc.PickFilters.PICK_EDGE,
            viewerMeasureSvc.PickFilters.PICK_VERTEX, viewerMeasureSvc.PickFilters.PICK_POINT,
            viewerMeasureSvc.PickFilters.PICK_ARC_CENTER
        ];
        viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedMeasurementPickFilters );
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = true;

    } else {

        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = false;

        _.forEach( selectedMeasurementPickFilters, function( pickFilter ) {
            var pickFilterValue = viewerMeasureSvc.PickFilters[ pickFilter ];
            if( pickFilterValue !== null && !_.isUndefined( pickFilterValue ) ) {
                switch ( pickFilter ) {
                    case viewerMeasureSvc.PickFilters.PICK_PARTS:
                        treedata.partsNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL:
                        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_SURFACE:
                        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_EDGE:
                        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_VERTEX:
                        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_POINT:
                        treedata.pointNodeProp.dbValue[ 0 ].isChecked = true;
                        break;

                    case viewerMeasureSvc.PickFilters.PICK_ARC_CENTER:
                        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = true;
                        break;
                }
            }
        } );
    }

    var returnVal = exports.updateSelectedMeasurementPropertiesView( localeTextBundle );
    returnVal.treeData = treedata;

    return returnVal;
};

/**
 * part filter picked
 */
export let partsCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.partsNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = false;

        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_PARTS );

    } else {
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let featuresCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.featuresNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );

    } else {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = true;
        treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.edgeNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.vertexNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.pointNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = false;

        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_PARTS );
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let surfaceCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.surfaceNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
        if( !_.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL ) ) {
            selectedPickFilters.length = 0;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );

    } else {
        if( !treedata.edgeNodeProp.dbValue[ 0 ].isChecked && !treedata.vertexNodeProp.dbValue[ 0 ].isChecked &&
            !treedata.pointNodeProp.dbValue[ 0 ].isChecked && !treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked ) {
            treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
            treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
            treedata.surfaceNodeProp.dbValue[ 0 ].isChecked = true;

            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_SURFACE;
            } );
        }
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let edgeCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.edgeNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
        if( !_.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL ) ) {
            selectedPickFilters.length = 0;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );

    } else {
        if( !treedata.surfaceNodeProp.dbValue[ 0 ].isChecked && !treedata.vertexNodeProp.dbValue[ 0 ].isChecked &&
            !treedata.pointNodeProp.dbValue[ 0 ].isChecked && !treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked ) {
            treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
            treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
            treedata.edgeNodeProp.dbValue[ 0 ].isChecked = true;

            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_EDGE;
            } );
        }
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let vertexCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.vertexNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
        if( !_.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL ) ) {
            selectedPickFilters.length = 0;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
    } else {
        if( !treedata.surfaceNodeProp.dbValue[ 0 ].isChecked && !treedata.edgeNodeProp.dbValue[ 0 ].isChecked &&
            !treedata.pointNodeProp.dbValue[ 0 ].isChecked && !treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked ) {
            treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
            treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
            treedata.vertexNodeProp.dbValue[ 0 ].isChecked = true;

            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_VERTEX;
            } );
        }
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let pointCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.pointNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
        if( !_.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL ) ) {
            selectedPickFilters.length = 0;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
    } else {
        if( !treedata.surfaceNodeProp.dbValue[ 0 ].isChecked && !treedata.edgeNodeProp.dbValue[ 0 ].isChecked &&
            !treedata.vertexNodeProp.dbValue[ 0 ].isChecked && !treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked ) {
            treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
            treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
            treedata.pointNodeProp.dbValue[ 0 ].isChecked = true;

            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_POINT;
            } );
        }
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * part filter picked
 */
export let arcCenterCheckValueChanged = function( treedata ) {
    var selectedPickFilters = [];
    if( treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked ) {
        treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
        treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;

        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
        if( !_.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL ) ) {
            selectedPickFilters.length = 0;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
    } else {
        if( !treedata.surfaceNodeProp.dbValue[ 0 ].isChecked && !treedata.edgeNodeProp.dbValue[ 0 ].isChecked &&
            !treedata.vertexNodeProp.dbValue[ 0 ].isChecked && !treedata.pointNodeProp.dbValue[ 0 ].isChecked ) {
            treedata.partsNodeProp.dbValue[ 0 ].isChecked = false;
            treedata.featuresNodeProp.dbValue[ 0 ].isChecked = true;
            treedata.arcCenterNodeProp.dbValue[ 0 ].isChecked = true;

            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_FEATURES_ALL );
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters();
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_ARC_CENTER;
            } );
        }
    }

    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters );

    return {
        "treedata": treedata
    };
};

/**
 * Delete selected measurement
 */
export let deleteSelectedMeasurement = function() {
    viewerMeasureSvc.deleteSelectedMeasurement();
};

/**
 * Delete all measurements
 */
export let deleteAllMeasurement = function() {
    viewerMeasureSvc.deleteAllMeasurement();
};

/**
 * part filter picked
 */
export let updateSelectedMeasurementPropertiesView = function( localeTextBundle ) {
    var isSelectedMeasurementVisibleProp = {};
    var selectedMeasurementProp = {};
    selectedMeasurementProp.isArray = true;
    selectedMeasurementProp.dbValue = [];
    var localizedSelectedMeasurementData = viewerMeasureSvc
        .getSelectedMeasurementLocalizedText( localeTextBundle );

    if( localizedSelectedMeasurementData !== null ) {
        _.forOwn( localizedSelectedMeasurementData, function( value, key ) {
            var measureProp = {};
            measureProp.propertyDisplayName = key;
            measureProp.uiValue = value;
            measureProp.type = "STRING";
            measureProp.isArray = false;
            measureProp.isNull = false;
            selectedMeasurementProp.dbValue.push( measureProp );
        } );
    }

    var isSelectedMeasurementSectionVisible = viewerMeasureSvc.isSelectedMeasurementSectionVisible();
    if( isSelectedMeasurementSectionVisible === null || _.isUndefined( isSelectedMeasurementSectionVisible ) ) {
        isSelectedMeasurementVisibleProp.dbValue = false;
    } else {
        isSelectedMeasurementVisibleProp.dbValue = isSelectedMeasurementSectionVisible;
    }

    viewerMeasureSvc.setSelectedMeasurementProperties( selectedMeasurementProp.dbValue );

    return {
        "isSelectedMeasurementVisibleProp": isSelectedMeasurementVisibleProp,
        "selectedMeasurementProp": selectedMeasurementProp
    };
};

export default exports = {
    measurementPanelRevealed,
    partsCheckValueChanged,
    featuresCheckValueChanged,
    surfaceCheckValueChanged,
    edgeCheckValueChanged,
    vertexCheckValueChanged,
    pointCheckValueChanged,
    arcCenterCheckValueChanged,
    deleteSelectedMeasurement,
    deleteAllMeasurement,
    updateSelectedMeasurementPropertiesView
};
/**
 * @member Awv0GeometricAnalysisMeasureService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisMeasureService', () => exports );
