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
 * @module js/Awv0GeometricAnalysisSectionService
 */
import * as app from 'app';
import viewerSecondaryModelSvc from 'js/viewerSecondaryModel.service';
import soa_preferenceService from 'soa/preferenceService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};
var _sectionSelectionInProgress = false;
var _sectionCreationInProgress = false;
var _sectionIdToBeProcessedForSelection = null;
var _currentSectionSelectionId = null;
var _showCapsAndLines = null;

/**
 * Viewer section panel revealed
 *
 * @function geometricAnalysisSectionPanelRevealed
 */
export let geometricAnalysisSectionPanelRevealed = function() {
    if( _.isNull( _showCapsAndLines ) || _.isUndefined( _showCapsAndLines ) ) {
        soa_preferenceService.getStringValue( 'AWV0SectionCapsEdgesInitialState' ).then( function( prefValue ) {
            if( _.isNull( prefValue ) || _.isUndefined( prefValue ) || _.toUpper( prefValue ) === 'TRUE' ) {
                _showCapsAndLines = true;
            } else {
                _showCapsAndLines = false;
            }
            _setShowCapsAndEdges();
        } );
    } else {
        _setShowCapsAndEdges();
    }

    var promise = viewerSecondaryModelSvc.initializeSectionsFromContext( _getCurrentViewerCtxNamespace() );
    promise.then( function( currentSectionSelectionId ) {
        _currentSectionSelectionId = currentSectionSelectionId;
        _notifySectionListUpdated();
    } );
};

/**
 * Get all sections data
 */
export let getAllSectionsData = function( dataProvider, cutLineLabel, sectionToggle, sectionProps, sectionPanelData, clipStateProps, clipStateData ) {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );

    var sectionList = null;
    var sectionListLength = 0;
    if( currentViewerCtx.geoAnalysisSection && currentViewerCtx.geoAnalysisSection.sectionList ) {
        sectionList = currentViewerCtx.geoAnalysisSection.sectionList;
        sectionListLength = sectionList.length;
    }

    cutLineLabel.getCutLines = getCutLines;
    dataProvider.selectionModel.selectNone();
    for( var i = 0; i < sectionListLength; i++ ) {
        var sectionObj = sectionList[ i ];
        if( !sectionList[ i ].cutLineLabel ) {
            sectionList[ i ].cutLineLabel = _.cloneDeep( cutLineLabel );
        }
        if( sectionList[ i ].sectionPlaneIdsProp.length === 4 ) {
            var customSectionProps = _.cloneDeep( sectionProps );
            customSectionProps.dbValue[ 3 ] = {};
            customSectionProps.dbValue[ 3 ].propDisplayValue = sectionList[ i ].sectionPlaneNamesProp[ 3 ];
            customSectionProps.dbValue[ 3 ].propInternalValue = sectionList[ i ].sectionPlaneIdsProp[ 3 ].toString();
            customSectionProps.dbValue[ 3 ].iconName = sectionList[ i ].sectionPlaneIconsProp[ 3 ];
            sectionList[ i ].customSectionProps = _.cloneDeep( customSectionProps );
        } else {
            sectionList[ i ].sectionProps = _.cloneDeep( sectionProps );
        }

        if( !sectionList[ i ].clipStateProps ) {
            sectionList[ i ].clipStateProps = _.cloneDeep( clipStateProps );
        }
        sectionList[ i ].sectionToggle = _.cloneDeep( sectionToggle );
        sectionList[ i ].sectionToggle.dbValue = sectionList[ i ].isSectionVisible;

        sectionList[ i ].sectionPanelData = _.cloneDeep( sectionPanelData );
        sectionList[ i ].sectionPanelData.dispValue = sectionList[ i ].sectionPlaneLabel;
        sectionList[ i ].sectionPanelData.dbValue = ( sectionList[ i ].sectionPlaneSelectionIdProp ).toString();
        sectionList[ i ].sectionPanelData.iconName = sectionList[ i ].planeThumbnailIcon;
        sectionList[ i ].sectionPanelData.sectionId = sectionList[ i ].sectionId;

        sectionList[ i ].clipStateData = _.cloneDeep( clipStateData );
        sectionList[ i ].clipStateData.dispValue = sectionList[ i ].sectionClipStateList[ sectionList[ i ].sectionClipState ];
        sectionList[ i ].clipStateData.dbValue = ( sectionList[ i ].sectionClipState ).toString();
        sectionList[i].clipStateData.sectionId = sectionList[ i ].sectionId;

        if( sectionObj.selected ) {
            dataProvider.selectionModel.setSelection( sectionObj );
        }
    }
    return {
        allSectionsData: sectionList,
        totalFound: sectionListLength
    };
};

/**
 * Section value changed
 *
 * @param {String} sectionId section id
 * @param {Object} sliderData slider model object
 */
export let sliderValueChanged = function( sectionId, sliderData ) {
    viewerSecondaryModelSvc.setSectionOffsetValue( _getCurrentViewerCtxNamespace(), sectionId,
        sliderData.dbValue[ 0 ].sliderOption.value );
};

/**
 * Section value moving
 *
 * @param {String} sectionId section id
 * @param {Object} sliderData slider model object
 */
export let sliderValueMoving = function( sectionId, sliderData ) {
    var newValue = sliderData.dbValue[ 0 ].sliderOption.value;
    viewerSecondaryModelSvc.moveSection( _getCurrentViewerCtxNamespace(), sectionId, newValue );
};

/**
 * Create viewer section
 *
 * @param {String} planeId plane id to create section
 */
export let createViewerSection = function( planeId ) {
    if( !_currentSectionSelectionId ) {
        _createSection( _getCurrentViewerCtxNamespace(), planeId );
    } else {
        var deSelectSectionPromise = viewerSecondaryModelSvc.setSectionSelection( _getCurrentViewerCtxNamespace(),
            _currentSectionSelectionId, false );
        deSelectSectionPromise.then( function() {
            _createSection( _getCurrentViewerCtxNamespace(), planeId );
        } );
    }
};

/**
 * Modify viewer section
 *
 * @param {String} sectionId section id
 * @param {String} newNormal new normal
 */
export let modifySection = function( sectionId, newNormal ) {
    var promise = viewerSecondaryModelSvc.modifySection( _getCurrentViewerCtxNamespace(), sectionId, newNormal );
    promise.then( function() {
        _notifySectionListUpdated();
    } );
};

/**
 * Create viewer section
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} planeId plane id to create section
 */
var _createSection = function( viewerCtxNamespace, planeId ) {
    var promise = viewerSecondaryModelSvc.createViewerSection( viewerCtxNamespace, planeId );
    _sectionCreationInProgress = true;
    promise.then( function( currentSelectedSectionId ) {
        _currentSectionSelectionId = currentSelectedSectionId;
        _notifySectionListUpdated();
    } );
};

/**
 * Select viewer section
 *
 * @param {String} sectionId section id
 */
export let selectSection = function( sectionId ) {
    if( _sectionCreationInProgress ) {
        _sectionCreationInProgress = false;
        return;
    }

    if( _.isEqual( parseInt( sectionId ), parseInt( _currentSectionSelectionId ) ) ) {
        return;
    }
    if( !_sectionSelectionInProgress ) {
        _sectionSelectionInProgress = true;
        _sectionIdToBeProcessedForSelection = null;
        if( !_.isNull( _currentSectionSelectionId ) ) {
            var deSelectSectionPromise = viewerSecondaryModelSvc.setSectionSelection(
                _getCurrentViewerCtxNamespace(), _currentSectionSelectionId, false );
            deSelectSectionPromise.then( function() {
                var selectSectionPromise = viewerSecondaryModelSvc.setSectionSelection(
                    _getCurrentViewerCtxNamespace(), sectionId, true );
                selectSectionPromise.then( function() {
                    _currentSectionSelectionId = sectionId;
                    _sectionSelectionInProgress = false;
                    if( _.isNull( _sectionIdToBeProcessedForSelection ) ) {
                        _notifySectionListUpdated();
                    } else {
                        exports.selectSection( _sectionIdToBeProcessedForSelection );
                    }
                } );
            } );
        } else {
            var selectSectionPromise = viewerSecondaryModelSvc.setSectionSelection(
                _getCurrentViewerCtxNamespace(), sectionId, true );
            selectSectionPromise.then( function() {
                _currentSectionSelectionId = sectionId;
                _sectionSelectionInProgress = false;
                if( _.isNull( _sectionIdToBeProcessedForSelection ) ) {
                    _notifySectionListUpdated();
                } else {
                    exports.selectSection( _sectionIdToBeProcessedForSelection );
                }
            } );
        }
    } else {
        _sectionIdToBeProcessedForSelection = sectionId;
    }
};

/**
 * Delete all sections
 */
export let deleteAllSections = function() {
    var promise = viewerSecondaryModelSvc.deleteAllSections( _getCurrentViewerCtxNamespace() );
    promise.then( function() {
        _currentSectionSelectionId = null;
        _notifySectionListUpdated();
    } );
};

/**
 * Show delete confirmation
 *
 * @param {Object} data object
 */
export let deleteSelectedSection = function( vmo ) {
    var sectionJSO = appCtxSvc.getCtx( 'viewerSectionToBeDeleted' );
    var viewerSectionToBeDeleted = {};
    viewerSectionToBeDeleted.sectionId = vmo.sectionId;
    viewerSectionToBeDeleted.sectionText = vmo.offsetLabel.toString() + ' = ' + vmo.offsetValue.toString();

    if( appCtxSvc.getCtx( 'viewerSectionToBeDeleted' ) ) {
        appCtxSvc.registerCtx( 'viewerSectionToBeDeleted', viewerSectionToBeDeleted );
    } else {
        appCtxSvc.updateCtx( 'viewerSectionToBeDeleted', viewerSectionToBeDeleted );
    }
    eventBus.publish( 'geoanalysis.deleteSection', {} );
};

/**
 * Delete selected sections
 */
export let deleteSelectedSectionAction = function() {
    var sectionJSO = appCtxSvc.getCtx( 'viewerSectionToBeDeleted' );
    var promise = viewerSecondaryModelSvc.deleteSection( _getCurrentViewerCtxNamespace(), sectionJSO.sectionId );
    promise.then( function() {
        if( _.isEqual( parseInt( sectionJSO.sectionId ), parseInt( _currentSectionSelectionId ) ) ) {
            _currentSectionSelectionId = null;
        }
        appCtxSvc.unRegisterCtx( 'viewerSectionToBeDeleted' );
        _notifySectionListUpdated();
    } );
};

/**
 * Section offset editing started
 */
export let setSectionOffsetEditingStarted = function() {
    appCtxSvc.registerCtx( 'viewerSectionInEditMode', true );
};

/**
 * Section offset editing finished
 */
export let setSectionOffsetEditingFinished = function() {
    appCtxSvc.unRegisterCtx( 'viewerSectionInEditMode' );
};

/**
 * Delete selected sections
 */
export let clearDeleteSectionContext = function() {
    appCtxSvc.unRegisterCtx( 'viewerSectionToBeDeleted' );
};

/**
 * Show caps and cut lines changed
 *
 * @param {String} settingValue new value
 */
export let showCapsAndCutLinesChanged = function( settingValue ) {
    var promise = viewerSecondaryModelSvc.setShowCapsAndCutLines( _getCurrentViewerCtxNamespace(), settingValue );
    promise.then( function() {
        _showCapsAndLines = settingValue;
    } );
};

/**
 * Section offset value updated
 *
 * @param {String} sectionId section id
 * @param {String} newValue new value
 */
export let sectionOffsetUpdated = function( sectionId, newValue ) {
    viewerSecondaryModelSvc.setSectionOffsetValue( _getCurrentViewerCtxNamespace(), sectionId, newValue );
};

/**
 * Section visibility value updated
 *
 * @param {String} sectionId section id
 */
export let sectionVisibilityUpdated = function( sectionId ) {
    viewerSecondaryModelSvc.toggleSectionVisibility( _getCurrentViewerCtxNamespace(), sectionId );
};

/**
 * Set setShowCapsAndEdges preference
 *
 * @param {Object} Show caps and cut lines prop
 */
export let setShowCapsAndEdgesAction = function( showCapsProp, cutLinesProp ) {
    viewerSecondaryModelSvc.setCapping( _getCurrentViewerCtxNamespace(), _showCapsAndLines );
    viewerSecondaryModelSvc.setGlobalCutLines( _getCurrentViewerCtxNamespace(), _showCapsAndLines );
    if( _showCapsAndLines ) {
        showCapsProp.dbValue[ 0 ].isChecked = true;
        cutLinesProp.dbValue[ 0 ].isChecked = true;
    } else {
        showCapsProp.dbValue[ 0 ].isChecked = false;
        cutLinesProp.dbValue[ 0 ].isChecked = false;
    }
    return {
        showCapsProp: showCapsProp,
        cutLinesProp: cutLinesProp
    };
};

/**
 * Updated the clip state of a cross section
 *
 * @param {String} sectionId section id
 * @param {Object} clipState Clipset to be updated
 */
export let updateClipState = function( sectionId, clipState ) {
    var promise = viewerSecondaryModelSvc.updateClipState( _getCurrentViewerCtxNamespace(), sectionId, clipState );
    promise.then( function() {
        _notifySectionListUpdated();
    } );
};

/**
 * Sets whether capping for cross sections should be drawn
 *
 * @param {Object} data Object containing show caps value
 */
export let showCaps = function( data ) {
    viewerSecondaryModelSvc.setCapping( _getCurrentViewerCtxNamespace(), data.dbValue[ 0 ].isChecked );
};

/**
 * Sets whether cut lines for the new cross sections should be drawn
 *
 * @param {Object} data Object containing create cut lines value
 */
export let createCutLines = function( data ) {
    viewerSecondaryModelSvc.setGlobalCutLines( _getCurrentViewerCtxNamespace(), data.dbValue[ 0 ].isChecked );
};

/**
 * Sets whether the Cut Lines status of the cross section
 *
 * @param {Boolean} dbValue show cut lines boolean value
 * @param {String} sectionId Section id of the cross section
 */
export let showCutLinesPerSection = function( dbValue, sectionId ) {
    viewerSecondaryModelSvc.setCutLines( _getCurrentViewerCtxNamespace(), dbValue, sectionId );
};

/**
 * Set showCapsAndLines
 */
var _setShowCapsAndEdges = function() {
    eventBus.publish( 'geoanalysis.setShowCapsAndLines', {} );
};

/**
 * Notify measurement pick filter changed
 */
var _notifySectionListUpdated = function() {
    eventBus.publish( 'geoanalysis.sectionsListUpdated', {} );
};

/**
 * Get viewer context
 */
var _getCurrentViewerCtxNamespace = function() {
    return appCtxSvc.getCtx( 'viewer.activeViewerCommandCtx' );
};

/**
 * Gets the Cut Lines status of the cross section
 *
 * @param {Object} sectionId Section id of the cross section for which cut lines status is to be retrieved.
 */
var getCutLines = function( sectionId ) {
    return viewerSecondaryModelSvc.getCutLines( _getCurrentViewerCtxNamespace(), sectionId );
};

/**
 * Initialize viewer section service
 */
export let initializeViewerSectionService = function() {
    /**
     * Subscribe for section select event
     */
    eventBus.subscribe( 'geoanalysis.sectionSelected', function( eventData ) {
        exports.selectSection( eventData.sectionId );
    }, 'Awv0GeometricAnalysisSectionService' );

    /**
     * Subscribe for section offset update
     */
    eventBus.subscribe( 'geoanalysis.sectionOffsetUpdated', function( eventData ) {
        exports.sectionOffsetUpdated( eventData.sectionId, eventData.newValue );
    }, 'Awv0GeometricAnalysisSectionService' );

    /**
     * Subscribe for section visibility update
     */
    eventBus.subscribe( 'geoanalysis.sectionVisibilityUpdated', function( eventData ) {
        exports.sectionVisibilityUpdated( eventData.sectionId );
    }, 'Awv0GeometricAnalysisSectionService' );

    /**
     * Subscribe for section modify event
     */
    eventBus.subscribe( 'geoanalysis.modifySection', function( eventData ) {
        if( eventData.scope.prop.newValue ) {
            exports.modifySection( eventData.scope.prop.sectionId, eventData.scope.prop.newDisplayValues[ 0 ] );
        }
    }, 'Awv0GeometricAnalysisSectionService' );

    /**
     * Subscribe for section clip event
     */
    eventBus.subscribe( 'geoanalysis.sectionClipState', function( eventData ) {
        exports.updateClipState( eventData.scope.$parent.vmo.sectionId, parseInt( eventData.scope.prop.newValue ) );
    }, 'Awv0GeometricAnalysisSectionService' );
};

initializeViewerSectionService();

export default exports = {
    geometricAnalysisSectionPanelRevealed,
    getAllSectionsData,
    sliderValueChanged,
    sliderValueMoving,
    createViewerSection,
    modifySection,
    selectSection,
    deleteAllSections,
    deleteSelectedSection,
    deleteSelectedSectionAction,
    setSectionOffsetEditingStarted,
    setSectionOffsetEditingFinished,
    clearDeleteSectionContext,
    showCapsAndCutLinesChanged,
    sectionOffsetUpdated,
    sectionVisibilityUpdated,
    setShowCapsAndEdgesAction,
    updateClipState,
    showCaps,
    createCutLines,
    showCutLinesPerSection,
    initializeViewerSectionService
};
/**
 * @member Awv0GeometricAnalysisSectionService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisSectionService', () => exports );
